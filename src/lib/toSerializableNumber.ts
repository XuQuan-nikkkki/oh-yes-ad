export const toSerializableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value !== "object") return null;

  const candidate = value as {
    toNumber?: () => unknown;
    toString?: () => string;
  };
  if (typeof candidate.toNumber === "function") {
    const parsed = candidate.toNumber();
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof candidate.toString === "function") {
    const parsed = Number(candidate.toString().trim().replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
