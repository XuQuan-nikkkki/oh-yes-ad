import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { getWorkItemStatusError } from "@/lib/work-item-status";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const body = await sanitizeRequestBody(req);
  if (typeof body?.status !== "string" || !["pending", "in_progress", "paused", "completed"].includes(body.status)) {
    return new Response("工作项状态无效", { status: 400 });
  }
  const { id } = await params;
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.workItem.findUnique({
        where: { id },
        select: {
          submissionEnabled: true,
          sourceFilePolicy: true,
          submissions: {
            select: {
              isFinal: true,
              contentText: true,
              resources: { select: { kind: true, url: true } },
            },
          },
        },
      });
      if (!item) return new Response("工作项不存在", { status: 404 });
      const error = getWorkItemStatusError(item, body.status);
      if (error) return new Response(error, { status: 409 });
      await tx.workItem.update({ where: { id }, data: { status: body.status } });
      return Response.json({ id, status: body.status });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return new Response("工作项内容已发生变化，请刷新后重试", { status: 409 });
    }
    throw error;
  }
}
