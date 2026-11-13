export function getBriefStatusError(workItems: Array<{ status: string }>, status: string): string | null {
  if (status !== "completed") return null;
  const remaining = workItems.filter((item) => item.status !== "completed").length;
  return remaining ? `还有 ${remaining} 个工作项未完成，请先完成全部工作项` : null;
}
