import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee, requireProjectWritePermission } from "@/lib/api-permissions";
import { parseFeedbackInput } from "@/lib/work-item-submission-input";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const { id, submissionId } = await params;
  const body = await sanitizeRequestBody(req);
  const input = parseFeedbackInput(body?.feedback);
  if (!input) {
    return new Response("请填写反馈说明、添加图片或添加至少一个调整项", {
      status: 400,
    });
  }

  const submission = await prisma.workItemSubmission.findFirst({
    where: { id: submissionId, workItemId: id },
    select: {
      id: true,
      feedback: {
        select: {
          id: true,
          adjustmentItems: {
            select: {
              id: true,
              _count: { select: { checks: true } },
            },
          },
        },
      },
    },
  });
  if (!submission) return new Response("提交记录不存在", { status: 404 });

  const existingIds = new Set(
    submission.feedback?.adjustmentItems.map((item) => item.id) ?? [],
  );
  const retainedIds = new Set(
    input.adjustmentItems
      .map((item) => item.id)
      .filter((item): item is string => Boolean(item && existingIds.has(item))),
  );
  const checkedRemoval = submission.feedback?.adjustmentItems.find(
    (item) => !retainedIds.has(item.id) && item._count.checks > 0,
  );
  if (checkedRemoval) {
    return new Response("已被后续版本确认的调整项不能删除", { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    const feedback = submission.feedback
      ? await tx.workItemFeedback.update({
          where: { id: submission.feedback.id },
          data: {
            content: input.content,
            recordedById: auth.employee.id,
            recordedAt: new Date(),
          },
          select: { id: true },
        })
      : await tx.workItemFeedback.create({
          data: {
            submissionId,
            content: input.content,
            recordedById: auth.employee.id,
          },
          select: { id: true },
        });

    await tx.workItemFeedbackImage.deleteMany({
      where: { feedbackId: feedback.id },
    });
    if (input.images.length) {
      await tx.workItemFeedbackImage.createMany({
        data: input.images.map((image, index) => ({
          feedbackId: feedback.id,
          url: image.url,
          name: image.name,
          sortOrder: index,
        })),
      });
    }

    await tx.workItemAdjustmentItem.deleteMany({
      where: {
        feedbackId: feedback.id,
        ...(retainedIds.size ? { id: { notIn: [...retainedIds] } } : {}),
      },
    });

    for (const [index, item] of input.adjustmentItems.entries()) {
      const itemId = item.id && existingIds.has(item.id) ? item.id : null;
      const savedItem = itemId
        ? await tx.workItemAdjustmentItem.update({
            where: { id: itemId },
            data: { title: item.title, content: item.content, sortOrder: index },
            select: { id: true },
          })
        : await tx.workItemAdjustmentItem.create({
            data: {
              feedbackId: feedback.id,
              title: item.title,
              content: item.content,
              sortOrder: index,
            },
            select: { id: true },
          });

      await tx.workItemAdjustmentItemImage.deleteMany({
        where: { adjustmentItemId: savedItem.id },
      });
      if (item.images.length) {
        await tx.workItemAdjustmentItemImage.createMany({
          data: item.images.map((image, imageIndex) => ({
            adjustmentItemId: savedItem.id,
            url: image.url,
            name: image.name,
            sortOrder: imageIndex,
          })),
        });
      }
    }
  });

  return Response.json({ id: submissionId });
}
