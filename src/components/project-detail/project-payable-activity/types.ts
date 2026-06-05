"use client";

export type ProjectPayableActivityRow = {
  id: string;
  stageOptionId: string;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  paymentCondition: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: Array<{
    id: string;
    actualAmountTaxIncluded?: number | null;
    actualDate?: string | null;
    remark?: string | null;
    remarkNeedsAttention?: boolean;
    createdAt?: string | null;
  }>;
  adjustmentRecords?: Array<{
    id: string;
    type: "REDUCTION" | "INCREASE" | "REDUCTION_REVERSAL";
    amountTaxIncluded?: number | null;
    occurredAt?: string | null;
    reason?: string | null;
    remark?: string | null;
    createdAt?: string | null;
    createdByEmployee?: {
      id: string;
      name: string;
    } | null;
  }>;
};

export type ActivityType = "PAYABLE_NODE" | "PAYMENT" | "ADJUSTMENT";

export type ActivityTableRow = {
  id: string;
  eventAtText: string;
  eventAtValue: number;
  stageOptionId: string;
  stageText: string;
  stageColor?: string | null;
  eventType: ActivityType;
  detailText: string;
  detailIsAlert?: boolean;
  amountText: string;
  amountColor: string;
  operatorName: string;
  operationAtText: string;
  operationAtValue: number;
  sourceRow: ProjectPayableActivityRow;
  sourceActualNode?: ProjectPayableActivityRow["actualNodes"] extends Array<infer T>
    ? T
    : never;
  sourceAdjustmentRecord?: ProjectPayableActivityRow["adjustmentRecords"] extends Array<infer T>
    ? T
    : never;
};
