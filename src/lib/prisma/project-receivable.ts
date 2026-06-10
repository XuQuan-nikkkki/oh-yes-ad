import { Prisma } from "@prisma/client";

type ReceivableActualNodeLike = {
  actualAmountTaxIncluded?: unknown;
  actualDate?: unknown;
};

type ReceivableBadDebtRecordLike = {
  type?: unknown;
  amountTaxIncluded?: unknown;
};

type ReceivableNodeLike = {
  expectedAmountTaxIncluded?: unknown;
  actualNodes?: ReceivableActualNodeLike[];
  badDebtRecords?: ReceivableBadDebtRecordLike[];
};

type ReceivablePlanLike = {
  nodes?: ReceivableNodeLike[];
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

const hasActualDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return false;
  const date = value instanceof Date ? value : new Date(String(value));
  return !Number.isNaN(date.valueOf());
};

const sumActualAmount = (actualNodes?: ReceivableActualNodeLike[]) =>
  (actualNodes ?? []).reduce(
    (sum, item) =>
      hasActualDate(item.actualDate)
        ? sum + toAmountNumber(item.actualAmountTaxIncluded)
        : sum,
    0,
  );

const sumBadDebtAmounts = (badDebtRecords?: ReceivableBadDebtRecordLike[]) =>
  (badDebtRecords ?? []).reduce(
    (summary, record) => {
      const amount = toAmountNumber(record.amountTaxIncluded);
      if (record.type === "RECOVERY") {
        return {
          writeOffAmountTotal: summary.writeOffAmountTotal,
          recoveryAmountTotal: summary.recoveryAmountTotal + amount,
        };
      }
      return {
        writeOffAmountTotal: summary.writeOffAmountTotal + amount,
        recoveryAmountTotal: summary.recoveryAmountTotal,
      };
    },
    { writeOffAmountTotal: 0, recoveryAmountTotal: 0 },
  );

const getProgressPercent = (actualAmountTotal: number, expectedAmountTotal: number) => {
  if (expectedAmountTotal <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((actualAmountTotal / expectedAmountTotal) * 100)),
  );
};

export const getReceivableNodeSummary = (node: ReceivableNodeLike) => {
  const expectedAmountTotal = toAmountNumber(node.expectedAmountTaxIncluded);
  const actualAmountTotal = sumActualAmount(node.actualNodes);
  const { writeOffAmountTotal, recoveryAmountTotal } = sumBadDebtAmounts(
    node.badDebtRecords,
  );
  const receivableAmountTaxIncluded =
    expectedAmountTotal - writeOffAmountTotal + recoveryAmountTotal;
  const badDebtAmountTotal = writeOffAmountTotal - recoveryAmountTotal;
  const pendingAmount = Math.max(
    0,
    receivableAmountTaxIncluded - actualAmountTotal,
  );

  return {
    expectedAmountTotal,
    receivableAmountTaxIncluded,
    actualAmountTotal,
    writeOffAmountTotal,
    recoveryAmountTotal,
    badDebtAmountTotal,
    pendingAmount,
    collectionProgressPercent: getProgressPercent(
      actualAmountTotal,
      receivableAmountTaxIncluded,
    ),
    isCollectionAmountMatched:
      receivableAmountTaxIncluded > 0 &&
      toCentAmount(actualAmountTotal) >=
        toCentAmount(receivableAmountTaxIncluded),
  };
};

export const getReceivablePlanSummary = (nodes?: ReceivableNodeLike[]) => {
  const summary = (nodes ?? []).reduce(
    (result, node) => {
      const nodeSummary = getReceivableNodeSummary(node);
      return {
        expectedAmountTotal:
          result.expectedAmountTotal + nodeSummary.expectedAmountTotal,
        receivableAmountTotal:
          result.receivableAmountTotal + nodeSummary.receivableAmountTaxIncluded,
        actualAmountTotal: result.actualAmountTotal + nodeSummary.actualAmountTotal,
        badDebtWriteOffAmountTotal:
          result.badDebtWriteOffAmountTotal + nodeSummary.writeOffAmountTotal,
        badDebtRecoveryAmountTotal:
          result.badDebtRecoveryAmountTotal + nodeSummary.recoveryAmountTotal,
      };
    },
    {
      expectedAmountTotal: 0,
      receivableAmountTotal: 0,
      actualAmountTotal: 0,
      badDebtWriteOffAmountTotal: 0,
      badDebtRecoveryAmountTotal: 0,
    },
  );

  const badDebtAmountTotal =
    summary.badDebtWriteOffAmountTotal - summary.badDebtRecoveryAmountTotal;

  return {
    ...summary,
    badDebtAmountTotal,
    pendingAmountTotal: Math.max(
      0,
      summary.receivableAmountTotal - summary.actualAmountTotal,
    ),
    collectionProgressPercent: getProgressPercent(
      summary.actualAmountTotal,
      summary.receivableAmountTotal,
    ),
    isFullyCollected:
      summary.receivableAmountTotal > 0 &&
      summary.actualAmountTotal >= summary.receivableAmountTotal,
  };
};

export const receivableExtension = Prisma.defineExtension({
  name: "receivableExtension",
  result: {
    projectReceivableNode: {
      receivableAmountTaxIncluded: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .receivableAmountTaxIncluded;
        },
      },
      actualAmountTotal: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .actualAmountTotal;
        },
      },
      badDebtWriteOffAmountTotal: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .writeOffAmountTotal;
        },
      },
      badDebtRecoveryAmountTotal: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .recoveryAmountTotal;
        },
      },
      badDebtAmountTotal: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .badDebtAmountTotal;
        },
      },
      actualBadDebtAmount: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .badDebtAmountTotal;
        },
      },
      pendingAmount: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .pendingAmount;
        },
      },
      collectionProgressPercent: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .collectionProgressPercent;
        },
      },
      isCollectionAmountMatched: {
        needs: {},
        compute(node) {
          return getReceivableNodeSummary(node as unknown as ReceivableNodeLike)
            .isCollectionAmountMatched;
        },
      },
    },
    projectReceivablePlan: {
      expectedAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).expectedAmountTotal;
        },
      },
      receivableAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).receivableAmountTotal;
        },
      },
      actualExpectedAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).receivableAmountTotal;
        },
      },
      actualAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).actualAmountTotal;
        },
      },
      badDebtWriteOffAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).badDebtWriteOffAmountTotal;
        },
      },
      badDebtRecoveryAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).badDebtRecoveryAmountTotal;
        },
      },
      badDebtAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).badDebtAmountTotal;
        },
      },
      actualBadDebtAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).badDebtAmountTotal;
        },
      },
      pendingAmountTotal: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).pendingAmountTotal;
        },
      },
      collectionProgressPercent: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).collectionProgressPercent;
        },
      },
      isFullyCollected: {
        needs: {},
        compute(plan) {
          return getReceivablePlanSummary(
            (plan as unknown as { nodes?: ReceivableNodeLike[] }).nodes,
          ).isFullyCollected;
        },
      },
    },
  },
});

export const enrichReceivableNode = <T extends ReceivableNodeLike>(node: T) => ({
  ...node,
  ...getReceivableNodeSummary(node),
  actualBadDebtAmount: getReceivableNodeSummary(node).badDebtAmountTotal,
  badDebtWriteOffAmountTotal: getReceivableNodeSummary(node).writeOffAmountTotal,
  badDebtRecoveryAmountTotal: getReceivableNodeSummary(node).recoveryAmountTotal,
});

export const enrichReceivablePlan = <
  T extends ReceivablePlanLike & { nodes?: ReceivableNodeLike[] },
>(
  plan: T,
) => {
  const nodes = (plan.nodes ?? []).map((node) => enrichReceivableNode(node));
  const summary = getReceivablePlanSummary(nodes);

  return {
    ...plan,
    nodes,
    ...summary,
    actualExpectedAmountTotal: summary.receivableAmountTotal,
    actualBadDebtAmountTotal: summary.badDebtAmountTotal,
  };
};
