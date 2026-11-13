export type MinimumQuoteInput = {
  outsourceCost: number;
  laborCostSnapshots: number[];
  rentCostSnapshots: number[];
  executionCostAmounts: Array<number | null | undefined>;
  estimatedDuration: number;
  middleOfficeAverageMonthlyCost: number;
  middleOfficeBaseDays: number;
  agencyFeeRate: number;
  costBaselineRatio: number;
};

export type MinimumQuoteResult = {
  quote: number | null;
  unroundedQuote: number | null;
  agencyFee: number | null;
  baseCost: number | null;
  outsourceCost: number;
  laborCost: number;
  rentCost: number;
  middleOfficeCost: number | null;
  executionCost: number | null;
  totalCost: number | null;
};

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (amount: number) => amount / 100;
const QUOTE_STEP_CENTS = 1_000_000;

export const calculateMinimumQuote = ({
  outsourceCost,
  laborCostSnapshots,
  rentCostSnapshots,
  executionCostAmounts,
  estimatedDuration,
  middleOfficeAverageMonthlyCost,
  middleOfficeBaseDays,
  agencyFeeRate,
  costBaselineRatio,
}: MinimumQuoteInput): MinimumQuoteResult => {
  const outsourceCents = toCents(outsourceCost);
  const laborSnapshotCents = laborCostSnapshots.reduce(
    (sum, amount) => sum + toCents(amount),
    0,
  );
  const laborCents = Math.round(laborSnapshotCents * 1.1);
  const rentCents = rentCostSnapshots.reduce(
    (sum, amount) => sum + toCents(amount),
    0,
  );
  const middleOfficeCents =
    middleOfficeBaseDays > 0 && Number.isFinite(estimatedDuration)
      ? toCents(
          (middleOfficeAverageMonthlyCost / middleOfficeBaseDays) *
            estimatedDuration,
        )
      : null;
  const executionCents = executionCostAmounts.every(
    (amount): amount is number =>
      typeof amount === "number" && Number.isFinite(amount),
  )
    ? executionCostAmounts.reduce(
        (sum, amount) => sum + toCents(amount ?? 0),
        0,
      )
    : null;
  const baseCostCents =
    middleOfficeCents === null || executionCents === null
      ? null
      : outsourceCents + laborCents + rentCents + middleOfficeCents + executionCents;

  const baseResult = {
    quote: null,
    unroundedQuote: null,
    agencyFee: null,
    baseCost: baseCostCents === null ? null : fromCents(baseCostCents),
    outsourceCost: fromCents(outsourceCents),
    laborCost: fromCents(laborCents),
    rentCost: fromCents(rentCents),
    middleOfficeCost:
      middleOfficeCents === null ? null : fromCents(middleOfficeCents),
    executionCost:
      executionCents === null ? null : fromCents(executionCents),
    totalCost: null,
  };

  const availableCostRate = costBaselineRatio - agencyFeeRate;
  if (
    baseCostCents === null ||
    !Number.isFinite(availableCostRate) ||
    availableCostRate <= 0 ||
    agencyFeeRate < 0
  ) {
    return baseResult;
  }

  const rawQuoteCents = baseCostCents / (availableCostRate / 100);
  if (!Number.isFinite(rawQuoteCents)) return baseResult;

  // The fee depends on the quote, so solve for the quote before rounding it up.
  const quoteCents =
    Math.ceil(rawQuoteCents / QUOTE_STEP_CENTS - 1e-10) * QUOTE_STEP_CENTS;
  const agencyFeeCents = Math.round((quoteCents * agencyFeeRate) / 100);

  return {
    ...baseResult,
    quote: fromCents(quoteCents),
    unroundedQuote: fromCents(Math.round(rawQuoteCents)),
    agencyFee: fromCents(agencyFeeCents),
    totalCost: fromCents(baseCostCents + agencyFeeCents),
  };
};
