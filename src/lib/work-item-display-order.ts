type BriefItems = { id: string; workItems?: Array<{ id: string; status: string }> };
const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, paused: 2 };

/** 只缓存 ID 顺序，展示内容始终读取最新数据。新工作项追加，已有项不因状态变化移动。 */
export function reconcileWorkItemDisplayOrder(
  previous: Record<string, string[]>,
  briefs: BriefItems[],
): Record<string, string[]> {
  const next = { ...previous };
  let changed = false;
  for (const brief of briefs) {
    const items = brief.workItems ?? [];
    const stored = previous[brief.id];
    const currentIds = new Set(items.map((item) => item.id));
    const storedIds = new Set(stored);
    const ids = stored?.length
      ? [...stored.filter((id) => currentIds.has(id)), ...items.filter((item) => !storedIds.has(item.id)).map((item) => item.id)]
      : [...items].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)).map((item) => item.id);
    if (!stored || ids.length !== stored.length || ids.some((id, index) => id !== stored[index])) {
      next[brief.id] = ids;
      changed = true;
    }
  }
  return changed ? next : previous;
}
