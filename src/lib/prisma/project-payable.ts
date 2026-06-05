import { Prisma } from "@prisma/client";
import {
  getPayableNodeSummary,
  getPayablePlanSummary,
  type PayableNodeLike,
  type PayablePlanLike,
} from "@/lib/prisma/project-payable-summary";

export const payableExtension = Prisma.defineExtension({
  name: "payableExtension",
  result: {
    projectPayableNode: {
      payableAmountTaxIncluded: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .payableAmountTaxIncluded;
        },
      },
      actualAmountTotal: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .actualAmountTotal;
        },
      },
      adjustmentReductionAmountTotal: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .adjustmentReductionAmountTotal;
        },
      },
      adjustmentIncreaseAmountTotal: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .adjustmentIncreaseAmountTotal;
        },
      },
      adjustmentReversalAmountTotal: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .adjustmentReversalAmountTotal;
        },
      },
      adjustmentAmountTotal: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .adjustmentAmountTotal;
        },
      },
      pendingAmount: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .pendingAmount;
        },
      },
      paymentProgressPercent: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .paymentProgressPercent;
        },
      },
      isPaymentAmountMatched: {
        needs: {},
        compute(node) {
          return getPayableNodeSummary(node as unknown as PayableNodeLike)
            .isPaymentAmountMatched;
        },
      },
    },
    projectPayablePlan: {
      expectedAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).expectedAmountTotal;
        },
      },
      payableAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).payableAmountTotal;
        },
      },
      actualExpectedAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).payableAmountTotal;
        },
      },
      actualAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).actualAmountTotal;
        },
      },
      adjustmentReductionAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).adjustmentReductionAmountTotal;
        },
      },
      adjustmentIncreaseAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).adjustmentIncreaseAmountTotal;
        },
      },
      adjustmentReversalAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).adjustmentReversalAmountTotal;
        },
      },
      adjustmentAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).adjustmentAmountTotal;
        },
      },
      pendingAmountTotal: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).pendingAmountTotal;
        },
      },
      paymentProgressPercent: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).paymentProgressPercent;
        },
      },
      isFullyPaid: {
        needs: {},
        compute(plan) {
          return getPayablePlanSummary(
            (plan as unknown as { nodes?: PayableNodeLike[] }).nodes,
          ).isFullyPaid;
        },
      },
    },
  },
});

export const enrichPayableNode = <T extends PayableNodeLike>(node: T) => ({
  ...node,
  ...getPayableNodeSummary(node),
});

export const enrichPayablePlan = <
  T extends PayablePlanLike & { nodes?: PayableNodeLike[] },
>(
  plan: T,
) => {
  const nodes = (plan.nodes ?? []).map((node) => enrichPayableNode(node));
  const summary = getPayablePlanSummary(nodes);

  return {
    ...plan,
    nodes,
    ...summary,
    actualExpectedAmountTotal: summary.payableAmountTotal,
  };
};
