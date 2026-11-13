import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee, requireProjectWritePermission } from "@/lib/api-permissions";
import { parseSubmissionResources } from "@/lib/work-item-submission-input";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const { id, submissionId } = await params;
  const body = await sanitizeRequestBody(req);
  const mode = body?.mode === "source" ? "source" : "content";
  const resources = parseSubmissionResources(body?.resources);
  if (!resources) return new Response("提交资源数据无效", { status: 400 });

  const submission = await prisma.workItemSubmission.findFirst({
    where: { id: submissionId, workItemId: id },
    select: {
      id: true,
      isFinal: true,
      workItem: { select: { type: true, sourceFilePolicy: true } },
    },
  });
  if (!submission) return new Response("提交记录不存在", { status: 404 });

  if (mode === "source") {
    if (!submission.isFinal) {
      return new Response("只能给最终版提交源文件", { status: 400 });
    }
    if (
      submission.workItem.sourceFilePolicy === "REQUIRED" &&
      resources.length === 0
    ) {
      return new Response("该工作项必须保留至少一个源文件", { status: 400 });
    }
  } else {
    const contentText =
      typeof body?.contentText === "string" ? body.contentText.trim() || null : null;
    if (submission.workItem.type === "DESIGN" && resources.length === 0) {
      return new Response("设计类工作项请至少保留一条设计链接", { status: 400 });
    }
    if (submission.workItem.type === "COPY" && !contentText) {
      return new Response("文案类工作项请填写文案正文", { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    if (mode === "content") {
      await tx.workItemSubmission.update({
        where: { id: submissionId },
        data: {
          versionTitle:
            typeof body?.versionTitle === "string"
              ? body.versionTitle.trim().slice(0, 255) || null
              : null,
          contentText:
            typeof body?.contentText === "string"
              ? body.contentText.trim() || null
              : null,
        },
      });
    }
    await tx.workItemSubmissionResource.deleteMany({
      where: { submissionId, kind: mode === "source" ? "SOURCE" : "OUTPUT" },
    });
    if (resources.length) {
      await tx.workItemSubmissionResource.createMany({
        data: resources.map((resource, index) => ({
          ...resource,
          submissionId,
          kind: mode === "source" ? "SOURCE" : "OUTPUT",
          sortOrder: index,
          uploadedById: auth.employee.id,
        })),
      });
    }
  });

  return Response.json({ id: submissionId });
}
