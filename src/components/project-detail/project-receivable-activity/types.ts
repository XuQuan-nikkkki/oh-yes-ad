export type ProjectReceivableActivityRow = {
  id: string;
  stageOptionId: string;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  sortOrder?: number;
  keyDeliverable: string;
  expectedAmountTaxIncluded?: number | null;
  expectedDate?: string | null;
  remark?: string | null;
  remarkNeedsAttention?: boolean;
  actualNodes?: Array<{
    id: string;
    actualAmountTaxIncluded?: number | null;
    actualDate?: string | null;
    invoiceDate?: string | null;
    createdAt?: string;
    remark?: string | null;
    remarkNeedsAttention?: boolean;
    createdByEmployee?: {
      id: string;
      name: string;
    } | null;
  }>;
  expectedDateHistories?: Array<{
    id: string;
    fromExpectedDate: string;
    toExpectedDate: string;
    reason?: string | null;
    remark?: string | null;
    changedAt?: string;
    changedByEmployee?: {
      id: string;
      name: string;
    } | null;
  }>;
  badDebtRecords?: Array<{
    id: string;
    actualNodeId?: string | null;
    type: "WRITE_OFF" | "RECOVERY";
    amountTaxIncluded?: number | string | null;
    occurredAt?: string | null;
    reason?: string | null;
    remark?: string | null;
    createdByEmployee?: {
      id: string;
      name: string;
    } | null;
    createdAt?: string;
  }>;
};

export type ActivityType =
  | "RECEIVABLE_NODE"
  | "INVOICE"
  | "COLLECTION"
  | "EXPECTED_DATE_CHANGE"
  | "BAD_DEBT_RECOVERY"
  | "BAD_DEBT_WRITE_OFF";

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
  collectionDateDelta?: {
    text: string;
    color: string;
  };
  expectedDateChangeDetail?: {
    fromDate: string;
    toDate: string;
    deltaText?: string;
    deltaColor?: string;
    reason?: string;
  };
  amountText: string;
  amountColor?: string;
  operatorName: string;
  operationAtText: string;
  operationAtValue: number;
  sourceRow: ProjectReceivableActivityRow;
  sourceActualNode?: NonNullable<ProjectReceivableActivityRow["actualNodes"]>[number];
  sourceHistory?: NonNullable<
    ProjectReceivableActivityRow["expectedDateHistories"]
  >[number];
  sourceBadDebtRecord?: NonNullable<
    ProjectReceivableActivityRow["badDebtRecords"]
  >[number];
};
