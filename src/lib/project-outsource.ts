export type ProjectOutsourceItemValue = {
  id?: string;
  type?: string | null;
  amount?: number | string | null;
};

export type NormalizedProjectOutsourceItem = {
  id: string | undefined;
  type: string;
  amount: number;
};

export const normalizeProjectOutsourceAmount = (
  value: ProjectOutsourceItemValue["amount"],
) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return null;
};

export const normalizeProjectOutsourceItems = (
  items?: ProjectOutsourceItemValue[] | null,
) =>
  (items ?? [])
    .map((item) => ({
      id: item.id,
      type: typeof item.type === "string" ? item.type.trim() : "",
      amount: normalizeProjectOutsourceAmount(item.amount),
    }))
    .filter(
      (item): item is NormalizedProjectOutsourceItem =>
        Boolean(item.type) && item.amount !== null,
    );

export const getProjectOutsourceTotal = (
  items?: ProjectOutsourceItemValue[] | null,
) =>
  normalizeProjectOutsourceItems(items).reduce(
    (sum, item) => sum + (item.amount ?? 0),
    0,
  );

export const formatProjectOutsourceItemsText = (
  items?: ProjectOutsourceItemValue[] | null,
) => {
  const normalized = normalizeProjectOutsourceItems(items);
  if (normalized.length === 0) return "-";
  return normalized
    .map((item) => `${item.type}：${item.amount} 元`)
    .join("\n");
};
