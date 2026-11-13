import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import { canManageProjectResourcesByRoles } from "@/lib/role-permissions";
import { parseSubmissionResources } from "@/lib/work-item-submission-input";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

const getWorkItem = (id: string) => {
  return prisma.workItem.findUnique({
    where: { id },
    select: {
      id: true,
      assigneeId: true,
      type: true,
      submissionEnabled: true,
      submissions: {
        select: {
          id: true,
          versionNumber: true,
          isFinal: true,
          feedback: {
            select: { adjustmentItems: { select: { id: true } } },
          },
        },
        orderBy: { versionNumber: "desc" },
      },
    },
  });
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const { id } = await params;
  const body = await sanitizeRequestBody(req);
  const resources = parseSubmissionResources(body?.resources);
  const versionTitle =
    typeof body?.versionTitle === "string"
      ? body.versionTitle.trim().slice(0, 255) || null
      : null;
  const contentText =
    typeof body?.contentText === "string"
      ? body.contentText.trim() || null
      : null;
  const rawAdjustmentCheckIds: unknown[] = Array.isArray(
    body?.adjustmentCheckIds,
  )
    ? body.adjustmentCheckIds
    : [];
  const adjustmentCheckIds = Array.from(
    new Set(
      rawAdjustmentCheckIds.filter(
        (item: unknown): item is string => typeof item === "string",
      ),
    ),
  );

  if (!resources) return new Response("提交资源数据无效", { status: 400 });

  const workItem = await getWorkItem(id);
  if (!workItem) return new Response("工作项不存在", { status: 404 });
  if (workItem.assigneeId !== auth.employee.id && !canManageProjectResourcesByRoles(auth.employee)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!workItem.submissionEnabled) return new Response("该工作项无提交内容", { status: 400 });
  if (workItem.submissions.some((item) => item.isFinal)) {
    return new Response("已确定最终版，如需继续提交请先清空最终版", { status: 400 });
  }
  if (workItem.type === "DESIGN" && resources.length === 0) {
    return new Response("设计类工作项请至少添加一条设计链接", { status: 400 });
  }
  if (workItem.type === "COPY" && !contentText) {
    return new Response("文案类工作项请填写文案正文", { status: 400 });
  }

  const previous = workItem.submissions[0];
  const expectedChecks = previous?.feedback?.adjustmentItems.map((item) => item.id) ?? [];
  if (
    adjustmentCheckIds.length !== expectedChecks.length ||
    expectedChecks.some((item) => !adjustmentCheckIds.includes(item))
  ) {
    return new Response("请确认上一版的全部调整项", { status: 400 });
  }

  const versionNumber = (previous?.versionNumber ?? 0) + 1;
  try {
    const submission = await prisma.workItemSubmission.create({
      data: {
        workItemId: id,
        versionNumber,
        versionTitle,
        contentText,
        submittedById: auth.employee.id,
        resources: {
          create: resources.map((resource, index) => ({
            ...resource,
            kind: "OUTPUT",
            sortOrder: index,
            uploadedById: auth.employee.id,
          })),
        },
        adjustmentChecks: {
          create: adjustmentCheckIds.map((adjustmentItemId) => ({
            adjustmentItemId,
            checkedById: auth.employee.id,
          })),
        },
      },
      select: { id: true, versionNumber: true },
    });
    return Response.json(submission, { status: 201 });
  } catch {
    return new Response("版本号冲突，请刷新后重试", { status: 409 });
  }
}
