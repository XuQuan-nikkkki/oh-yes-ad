import { Prisma } from "@prisma/client";

const parseBudgetToNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const estimationExtension = Prisma.defineExtension({
  name: "estimationExtension",
  result: {
    projectCostEstimation: {
      hasOtherExecutionCostType: {
        needs: {},
        compute(estimation) {
          const source = estimation as unknown as {
            executionCostTypes?: Array<{ value?: unknown }>;
          };
          const types = Array.isArray(source.executionCostTypes)
            ? source.executionCostTypes
            : [];
          return types.some(
            (item) =>
              typeof item?.value === "string" && item.value.trim() === "其他",
          );
        },
      },
      estimatedAgencyFee: {
        needs: { agencyFeeRate: true, clientBudget: true },
        compute(estimation) {
          const rate = Number(estimation.agencyFeeRate ?? 0);
          const budget = parseBudgetToNumber(estimation.clientBudget);
          if (!Number.isFinite(rate) || budget === null) return null;
          if (rate <= 0 || budget <= 0) return null;
          return (rate / 100) * budget;
        },
      },
      outsourceInfo: {
        needs: {},
        compute(estimation) {
          const source = estimation as unknown as {
            outsourceItems?: Array<{ type?: unknown; amount?: unknown }>;
          };
          const items = Array.isArray(source.outsourceItems)
            ? source.outsourceItems
            : [];
          if (items.length === 0) return null;
          return items
            .map((item) => {
              const type =
                typeof item.type === "string" && item.type.trim()
                  ? item.type.trim()
                  : "-";
              const amount =
                typeof item.amount === "number" && Number.isFinite(item.amount)
                  ? item.amount
                  : Number(item.amount ?? 0);
              const normalizedAmount = Number.isFinite(amount) ? amount : 0;
              return `${type}:${normalizedAmount}`;
            })
            .join(" + ");
        },
      },
    },
  },
});
