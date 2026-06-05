export type PayableActualNodeLike = {
  actualAmountTaxIncluded?: unknown;
};

export type PayableAdjustmentRecordLike = {
  type?: unknown;
  amountTaxIncluded?: unknown;
};

export type PayableNodeLike = {
  expectedAmountTaxIncluded?: unknown;
  actualNodes?: PayableActualNodeLike[];
  adjustmentRecords?: PayableAdjustmentRecordLike[];
};

export type PayablePlanLike = {
  nodes?: PayableNodeLike[];
};

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

const toCentAmount = (value: number) => Math.round(value * 100);

const sumActualAmount = (actualNodes?: PayableActualNodeLike[]) =>
  (actualNodes ?? []).reduce(
    (sum, item) => sum + toAmountNumber(item.actualAmountTaxIncluded),
    0,
  );

const getSignedAdjustmentAmount = (record: PayableAdjustmentRecordLike) => {
  const amount = toAmountNumber(record.amountTaxIncluded);
  if (record.type === "REDUCTION") return -amount;
  if (record.type === "INCREASE") return amount;
  if (record.type === "REDUCTION_REVERSAL") return amount;
  return 0;
};

const sumAdjustmentAmounts = (
  adjustmentRecords?: PayableAdjustmentRecordLike[],
) =>
  (adjustmentRecords ?? []).reduce(
    (summary, record) => {
      const amount = toAmountNumber(record.amountTaxIncluded);
      const signedAmount = getSignedAdjustmentAmount(record);
      if (record.type === "INCREASE") {
        return {
          reductionAmountTotal: summary.reductionAmountTotal,
          increaseAmountTotal: summary.increaseAmountTotal + amount,
          reversalAmountTotal: summary.reversalAmountTotal,
          signedAmountTotal: summary.signedAmountTotal + signedAmount,
        };
      }
      if (record.type === "REDUCTION_REVERSAL") {
        return {
          reductionAmountTotal: summary.reductionAmountTotal,
          increaseAmountTotal: summary.increaseAmountTotal,
          reversalAmountTotal: summary.reversalAmountTotal + amount,
          signedAmountTotal: summary.signedAmountTotal + signedAmount,
        };
      }
      return {
        reductionAmountTotal: summary.reductionAmountTotal + amount,
        increaseAmountTotal: summary.increaseAmountTotal,
        reversalAmountTotal: summary.reversalAmountTotal,
        signedAmountTotal: summary.signedAmountTotal + signedAmount,
      };
    },
    {
      reductionAmountTotal: 0,
      increaseAmountTotal: 0,
      reversalAmountTotal: 0,
      signedAmountTotal: 0,
    },
  );

const getProgressPercent = (actualAmountTotal: number, payableAmount: number) => {
  if (payableAmount <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((actualAmountTotal / payableAmount) * 100)),
  );
};

export const getPayableNodeSummary = (node: PayableNodeLike) => {
  const expectedAmountTotal = toAmountNumber(node.expectedAmountTaxIncluded);
  const actualAmountTotal = sumActualAmount(node.actualNodes);
  const {
    reductionAmountTotal,
    increaseAmountTotal,
    reversalAmountTotal,
    signedAmountTotal,
  } = sumAdjustmentAmounts(node.adjustmentRecords);
  const payableAmountTaxIncluded = expectedAmountTotal + signedAmountTotal;
  const adjustmentAmountTotal = signedAmountTotal;
  const pendingAmount = Math.max(
    0,
    payableAmountTaxIncluded - actualAmountTotal,
  );

  return {
    expectedAmountTotal,
    payableAmountTaxIncluded,
    actualAmountTotal,
    adjustmentReductionAmountTotal: reductionAmountTotal,
    adjustmentIncreaseAmountTotal: increaseAmountTotal,
    adjustmentReversalAmountTotal: reversalAmountTotal,
    adjustmentAmountTotal,
    pendingAmount,
    paymentProgressPercent: getProgressPercent(
      actualAmountTotal,
      payableAmountTaxIncluded,
    ),
    isPaymentAmountMatched:
      payableAmountTaxIncluded > 0 &&
      toCentAmount(actualAmountTotal) === toCentAmount(payableAmountTaxIncluded),
  };
};

export const getPayablePlanSummary = (nodes?: PayableNodeLike[]) => {
  const summary = (nodes ?? []).reduce(
    (result, node) => {
      const nodeSummary = getPayableNodeSummary(node);
      return {
        expectedAmountTotal:
          result.expectedAmountTotal + nodeSummary.expectedAmountTotal,
        payableAmountTotal:
          result.payableAmountTotal + nodeSummary.payableAmountTaxIncluded,
        actualAmountTotal: result.actualAmountTotal + nodeSummary.actualAmountTotal,
        adjustmentReductionAmountTotal:
          result.adjustmentReductionAmountTotal +
          nodeSummary.adjustmentReductionAmountTotal,
        adjustmentIncreaseAmountTotal:
          result.adjustmentIncreaseAmountTotal +
          nodeSummary.adjustmentIncreaseAmountTotal,
        adjustmentReversalAmountTotal:
          result.adjustmentReversalAmountTotal +
          nodeSummary.adjustmentReversalAmountTotal,
      };
    },
    {
      expectedAmountTotal: 0,
      payableAmountTotal: 0,
      actualAmountTotal: 0,
      adjustmentReductionAmountTotal: 0,
      adjustmentIncreaseAmountTotal: 0,
      adjustmentReversalAmountTotal: 0,
    },
  );
  const adjustmentAmountTotal =
    -summary.adjustmentReductionAmountTotal +
    summary.adjustmentIncreaseAmountTotal +
    summary.adjustmentReversalAmountTotal;

  return {
    ...summary,
    adjustmentAmountTotal,
    pendingAmountTotal: Math.max(
      0,
      summary.payableAmountTotal - summary.actualAmountTotal,
    ),
    paymentProgressPercent: getProgressPercent(
      summary.actualAmountTotal,
      summary.payableAmountTotal,
    ),
    isFullyPaid:
      summary.payableAmountTotal > 0 &&
      summary.actualAmountTotal >= summary.payableAmountTotal,
  };
};
