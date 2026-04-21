import { Prisma } from "@prisma/client";

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBudgetToNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const getOutsourceTotal = (strategy: unknown) => {
  const source = strategy as {
    outsourceItems?: Array<{ amount?: unknown }>;
  };
  const items = Array.isArray(source.outsourceItems) ? source.outsourceItems : [];
  return items.reduce((sum, item) => sum + toFiniteNumber(item.amount, 0), 0);
};

const computeBreakEven = (
  strategy: unknown,
  quotePrice: number | null,
  laborCost: number,
  middleOfficeCost: number,
) => {
  if (quotePrice === null || !Number.isFinite(quotePrice) || quotePrice <= 0) return null;
  const source = strategy as {
    agencyFeeRate?: unknown;
    rentCost?: unknown;
    executionCost?: unknown;
  };
  const agencyFeeRate = toFiniteNumber(source.agencyFeeRate, 0);
  const agencyFeeAmount = (quotePrice * agencyFeeRate) / 100;
  return (
    getOutsourceTotal(strategy) +
    laborCost +
    middleOfficeCost +
    agencyFeeAmount +
    toFiniteNumber(source.rentCost, 0) +
    toFiniteNumber(source.executionCost, 0)
  );
};

const computeQuoteSummary = (
  strategy: unknown,
  quotePrice: number | null,
  laborCost: number,
  middleOfficeCost: number,
) => {
  const totalCost = computeBreakEven(strategy, quotePrice, laborCost, middleOfficeCost);
  if (totalCost === null) return null;
  const quote = quotePrice ?? 0;
  const profit = quote - totalCost;
  const costRate = quote > 0 ? (totalCost / quote) * 100 : null;
  const profitRate = quote > 0 ? (profit / quote) * 100 : null;
  const laborCostRate = quote > 0 ? (laborCost / quote) * 100 : null;
  return {
    quote,
    totalCost,
    costRate,
    profit,
    profitRate,
    laborCostRate,
  };
};

export const pricingStrategyExtension = Prisma.defineExtension({
  name: "pricingStrategyExtension",
  result: {
    projectPricingStrategy: {
      plannedBreakEvenAtBottomLine: {
        needs: {
          bottomLinePrice: true,
          plannedLaborCost: true,
          plannedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          return computeBreakEven(
            strategy,
            toFiniteNumber(strategy.bottomLinePrice, 0),
            toFiniteNumber(strategy.plannedLaborCost, 0),
            toFiniteNumber(strategy.plannedMiddleOfficeCost, 0),
          );
        },
      },
      plannedBreakEvenAtTarget: {
        needs: {
          targetPrice: true,
          plannedLaborCost: true,
          plannedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          return computeBreakEven(
            strategy,
            toFiniteNumber(strategy.targetPrice, 0),
            toFiniteNumber(strategy.plannedLaborCost, 0),
            toFiniteNumber(strategy.plannedMiddleOfficeCost, 0),
          );
        },
      },
      suggestedBreakEvenAtTarget: {
        needs: {
          targetPrice: true,
          suggestedLaborCost: true,
          suggestedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          return computeBreakEven(
            strategy,
            toFiniteNumber(strategy.targetPrice, 0),
            toFiniteNumber(strategy.suggestedLaborCost, 0),
            toFiniteNumber(strategy.suggestedMiddleOfficeCost, 0),
          );
        },
      },
      plannedBreakEvenAtCustomerBudget: {
        needs: {
          plannedLaborCost: true,
          plannedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          const source = strategy as {
            costEstimation?: { clientBudget?: unknown } | null;
          };
          const customerBudget = parseBudgetToNumber(
            source.costEstimation?.clientBudget,
          );
          if (customerBudget === null || customerBudget <= 0) return null;
          return computeBreakEven(
            strategy,
            customerBudget,
            toFiniteNumber(strategy.plannedLaborCost, 0),
            toFiniteNumber(strategy.plannedMiddleOfficeCost, 0),
          );
        },
      },
      plannedSummaryAtBottomLine: {
        needs: {
          bottomLinePrice: true,
          plannedLaborCost: true,
          plannedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          return computeQuoteSummary(
            strategy,
            toFiniteNumber(strategy.bottomLinePrice, 0),
            toFiniteNumber(strategy.plannedLaborCost, 0),
            toFiniteNumber(strategy.plannedMiddleOfficeCost, 0),
          );
        },
      },
      plannedSummaryAtTarget: {
        needs: {
          targetPrice: true,
          plannedLaborCost: true,
          plannedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          return computeQuoteSummary(
            strategy,
            toFiniteNumber(strategy.targetPrice, 0),
            toFiniteNumber(strategy.plannedLaborCost, 0),
            toFiniteNumber(strategy.plannedMiddleOfficeCost, 0),
          );
        },
      },
      suggestedSummaryAtTarget: {
        needs: {
          targetPrice: true,
          suggestedLaborCost: true,
          suggestedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          return computeQuoteSummary(
            strategy,
            toFiniteNumber(strategy.targetPrice, 0),
            toFiniteNumber(strategy.suggestedLaborCost, 0),
            toFiniteNumber(strategy.suggestedMiddleOfficeCost, 0),
          );
        },
      },
      plannedSummaryAtCustomerBudget: {
        needs: {
          plannedLaborCost: true,
          plannedMiddleOfficeCost: true,
          agencyFeeRate: true,
          rentCost: true,
          executionCost: true,
        },
        compute(strategy) {
          const source = strategy as {
            costEstimation?: { clientBudget?: unknown } | null;
          };
          const customerBudget = parseBudgetToNumber(source.costEstimation?.clientBudget);
          if (customerBudget === null || customerBudget <= 0) return null;
          return computeQuoteSummary(
            strategy,
            customerBudget,
            toFiniteNumber(strategy.plannedLaborCost, 0),
            toFiniteNumber(strategy.plannedMiddleOfficeCost, 0),
          );
        },
      },
    },
  },
});
