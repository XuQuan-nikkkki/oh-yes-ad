export type RequestedExecutionCostItem = {
  value: string;
  requestedAmount: number | null;
};

export const parseRequestedExecutionCostItems = (
  raw: unknown,
  selectedValues: string[],
): RequestedExecutionCostItem[] | null => {
  // Older clients only submit the selected category names.
  if (raw === undefined) {
    return selectedValues.map((value) => ({ value, requestedAmount: null }));
  }
  if (!Array.isArray(raw)) return null;

  const amounts = new Map<string, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const record = item as { value?: unknown; requestedAmount?: unknown };
    const value = typeof record.value === "string" ? record.value.trim() : "";
    const amount = record.requestedAmount;
    if (
      !value ||
      amounts.has(value) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return null;
    }
    amounts.set(value, Math.round(amount * 100) / 100);
  }

  if (amounts.size !== selectedValues.length) return null;
  if (selectedValues.some((value) => !amounts.has(value))) return null;
  return selectedValues.map((value) => ({
    value,
    requestedAmount: amounts.get(value)!,
  }));
};
