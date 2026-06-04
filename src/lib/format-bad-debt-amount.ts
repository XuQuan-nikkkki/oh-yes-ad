export type BadDebtDisplayType = "WRITE_OFF" | "RECOVERY";

const toAmountNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString().trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const getBadDebtSignedAmount = (
  type: BadDebtDisplayType,
  amount: unknown,
) => {
  const normalizedAmount = Math.abs(toAmountNumber(amount));
  if (normalizedAmount === 0) return 0;
  return type === "WRITE_OFF" ? -normalizedAmount : normalizedAmount;
};

export const formatBadDebtSignedAmount = (
  type: BadDebtDisplayType,
  amount: unknown,
) => getBadDebtSignedAmount(type, amount).toLocaleString("zh-CN");
