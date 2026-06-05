import dayjs from "dayjs";
import type {
  ActivityTableRow,
  ProjectPayableActivityRow,
} from "@/components/project-detail/project-payable-activity/types";

const getTimeValue = (value?: string | null) =>
  dayjs(value).isValid() ? dayjs(value).valueOf() : Number.NEGATIVE_INFINITY;

const formatDate = (value?: string | null) =>
  dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";

const formatDateTime = (value?: string | null) =>
  dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm") : "";

const getDateTimeValue = (value?: string | null) =>
  dayjs(value).isValid() ? dayjs(value).valueOf() : Number.POSITIVE_INFINITY;

const formatMoney = (value?: number | string | null) => {
  const amount =
    typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getStageText = (row: ProjectPayableActivityRow) =>
  row.stageOption?.value?.trim() || row.paymentCondition?.trim() || "未命名节点";

const activityTypeSortOrder: Record<ActivityTableRow["eventType"], number> = {
  PAYABLE_NODE: 0,
  PAYMENT: 1,
  ADJUSTMENT: 2,
};

const getAdjustmentMeta = (
  type: "REDUCTION" | "INCREASE" | "REDUCTION_REVERSAL",
) => {
  if (type === "REDUCTION") {
    return { label: "应付减免", prefix: "-", color: "#BE2E2C" };
  }
  if (type === "INCREASE") {
    return { label: "应付增加", prefix: "+", color: "#387E22" };
  }
  return { label: "应付冲回", prefix: "+", color: "#387E22" };
};

export const buildActivityRows = (rows: ProjectPayableActivityRow[]) => {
  const result: ActivityTableRow[] = [];

  rows.forEach((row) => {
    const stageText = getStageText(row);
    const stageColor = row.stageOption?.color ?? null;
    const expectedAmount = Number(row.expectedAmountTaxIncluded ?? 0);
    const remark = String(row.remark ?? "").trim();

    result.push({
      id: `node-${row.id}`,
      eventAtText: formatDate(row.expectedDate),
      eventAtValue: getTimeValue(row.expectedDate),
      stageOptionId: row.stageOptionId,
      stageText,
      stageColor,
      eventType: "PAYABLE_NODE",
      detailText: remark ? `条件：${row.paymentCondition}\n备注：${remark}` : `条件：${row.paymentCondition}`,
      detailIsAlert: Boolean(row.remarkNeedsAttention),
      amountText: formatMoney(expectedAmount),
      amountColor: "#722ed1",
      operatorName: "",
      operationAtText: "",
      operationAtValue: Number.POSITIVE_INFINITY,
      sourceRow: row,
    });

    (row.actualNodes ?? []).forEach((actualNode) => {
      const amount = Number(actualNode.actualAmountTaxIncluded ?? 0);
      const actualRemark = String(actualNode.remark ?? "").trim();

      result.push({
        id: `actual-${actualNode.id}`,
        eventAtText: formatDate(actualNode.actualDate),
        eventAtValue: getTimeValue(actualNode.actualDate),
        stageOptionId: row.stageOptionId,
        stageText,
        stageColor,
        eventType: "PAYMENT",
        detailText: actualRemark ? `备注：${actualRemark}` : "-",
        detailIsAlert: Boolean(actualNode.remarkNeedsAttention),
        amountText: `+${formatMoney(amount)}`,
        amountColor: "#1677ff",
        operatorName: "",
        operationAtText: formatDateTime(actualNode.createdAt),
        operationAtValue: getDateTimeValue(actualNode.createdAt),
        sourceRow: row,
        sourceActualNode: actualNode,
      });
    });

    (row.adjustmentRecords ?? []).forEach((record) => {
      const meta = getAdjustmentMeta(record.type);
      const amount = Number(record.amountTaxIncluded ?? 0);
      const detailParts = [meta.label];
      const reason = String(record.reason ?? "").trim();
      const adjRemark = String(record.remark ?? "").trim();

      if (reason) detailParts.push(`原因：${reason}`);
      if (adjRemark) detailParts.push(`备注：${adjRemark}`);

      result.push({
        id: `adjustment-${record.id}`,
        eventAtText: formatDate(record.occurredAt),
        eventAtValue: getTimeValue(record.occurredAt),
        stageOptionId: row.stageOptionId,
        stageText,
        stageColor,
        eventType: "ADJUSTMENT",
        detailText: detailParts.join("\n"),
        amountText: `${meta.prefix}${formatMoney(amount)}`,
        amountColor: meta.color,
        operatorName: record.createdByEmployee?.name?.trim() || "",
        operationAtText: formatDateTime(record.createdAt),
        operationAtValue: getDateTimeValue(record.createdAt),
        sourceRow: row,
        sourceAdjustmentRecord: record,
      });
    });
  });

  return result.sort((left, right) => {
    if (left.eventAtValue !== right.eventAtValue) {
      return left.eventAtValue - right.eventAtValue;
    }
    if (activityTypeSortOrder[left.eventType] !== activityTypeSortOrder[right.eventType]) {
      return activityTypeSortOrder[left.eventType] - activityTypeSortOrder[right.eventType];
    }
    if (left.operationAtValue !== right.operationAtValue) {
      return left.operationAtValue - right.operationAtValue;
    }
    return left.id.localeCompare(right.id, "zh-CN");
  });
};
