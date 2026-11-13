import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await params;
  const body = await sanitizeRequestBody(req);
  const submissionId =
    typeof body?.submissionId === "string" && body.submissionId
      ? body.submissionId
      : null;

  const workItem = await prisma.workItem.findUnique({
    where: { id },
    select: { id: true, submissionEnabled: true },
  });
  if (!workItem) return new Response("工作项不存在", { status: 404 });
  if (!workItem.submissionEnabled) return new Response("该工作项无提交内容", { status: 400 });

  if (submissionId) {
    const target = await prisma.workItemSubmission.findFirst({
      where: { id: submissionId, workItemId: id },
      select: { id: true },
    });
    if (!target) return new Response("提交记录不存在", { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.workItemSubmission.updateMany({
      where: { workItemId: id, isFinal: true },
      data: { isFinal: false },
    });
    if (submissionId) {
      await tx.workItemSubmission.update({
        where: { id: submissionId },
        data: { isFinal: true },
      });
    }
  });

  return Response.json({ submissionId });
}
