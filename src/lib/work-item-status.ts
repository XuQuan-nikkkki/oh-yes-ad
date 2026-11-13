type CompletionWorkItem = {
  submissionEnabled: boolean;
  sourceFilePolicy: string;
  submissions: Array<{
    isFinal: boolean;
    contentText: string | null;
    resources: Array<{ kind: string; url: string }>;
  }>;
};

export function getWorkItemStatusError(item: CompletionWorkItem, status: string): string | null {
  if (status !== "completed" || !item.submissionEnabled) return null;
  const hasContent = (submission: CompletionWorkItem["submissions"][number]) =>
    Boolean(submission.contentText?.trim()) ||
    submission.resources.some((resource) => resource.kind === "OUTPUT" && Boolean(resource.url.trim()));
  if (!item.submissions.some(hasContent)) return "尚未提交内容，请先提交内容后再设为已完成";
  const finalSubmission = item.submissions.find((submission) => submission.isFinal);
  if (!finalSubmission) return "尚未确定最终版，请先选择最终版后再设为已完成";
  if (!hasContent(finalSubmission)) return "最终版缺少提交内容，请补充后再设为已完成";
  if (item.sourceFilePolicy === "REQUIRED" && !finalSubmission.resources.some(
    (resource) => resource.kind === "SOURCE" && Boolean(resource.url.trim()),
  )) return "最终版尚未提交源文件链接，请补充后再设为已完成";
  return null;
}
