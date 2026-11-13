import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireAuthenticatedEmployee, requireProjectWritePermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const { id } = await params;
  const body = await sanitizeRequestBody(req);
  const toAssigneeId = typeof body?.toAssigneeId === "string" ? body.toAssigneeId.trim() : "";
  const remarks = typeof body?.remarks === "string" ? body.remarks.trim() || null : null;
  if (!toAssigneeId) return new Response("请选择新执行人", { status: 400 });
  if (remarks && remarks.length > 500) return new Response("备注不能超过 500 个字", { status: 400 });

  const targetEmployee = await prisma.employee.findUnique({ where: { id: toAssigneeId }, select: { id: true } });
  if (!targetEmployee) return new Response("新执行人不存在", { status: 400 });

  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    select: { assigneeId: true, briefId: true, brief: { select: { status: true } } },
  });
  if (!deliverable) return new Response("交付物不存在", { status: 404 });
  if (deliverable.assigneeId === toAssigneeId) {
    return new Response("新执行人不能与当前执行人相同", { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.deliverable.update({ where: { id }, data: { assigneeId: toAssigneeId } });
    await tx.deliverableAssignmentChange.create({
      data: {
        deliverableId: id,
        fromAssigneeId: deliverable.assigneeId,
        toAssigneeId,
        changedById: auth.employee.id,
        remarks,
      },
    });

    if (!["paused", "completed"].includes(deliverable.brief.status)) {
      const siblings = await tx.deliverable.findMany({ where: { briefId: deliverable.briefId }, select: { assigneeId: true } });
      await tx.brief.update({
        where: { id: deliverable.briefId },
        data: { status: siblings.every((item) => Boolean(item.assigneeId)) ? "in_progress" : "waiting_assignment" },
      });
    }
  });

  return Response.json({ id });
}
