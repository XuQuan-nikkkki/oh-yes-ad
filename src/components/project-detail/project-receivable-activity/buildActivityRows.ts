import dayjs from "dayjs";
import type {
  ActivityTableRow,
  ProjectReceivableActivityRow,
} from "@/components/project-detail/project-receivable-activity/types";

const getTimeValue = (value?: string | null) =>
  dayjs(value).isValid() ? dayjs(value).valueOf() : Number.NEGATIVE_INFINITY;

const formatDate = (value?: string | null) =>
  dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";

const normalizeDateTime = (value?: string | null) => {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return raw;
  }

  return raw;
};

const formatDateTime = (value?: string | null) =>
  dayjs(normalizeDateTime(value)).isValid()
    ? dayjs(normalizeDateTime(value)).format("YYYY-MM-DD HH:mm")
    : "";

const getDateTimeValue = (value?: string | null) =>
  dayjs(normalizeDateTime(value)).isValid()
    ? dayjs(normalizeDateTime(value)).valueOf()
    : Number.POSITIVE_INFINITY;

const getExpectedDateDelta = (
  fromExpectedDate: string,
  toExpectedDate: string,
) => {
  if (!dayjs(fromExpectedDate).isValid() || !dayjs(toExpectedDate).isValid()) {
    return {};
  }

  const diffDays = dayjs(toExpectedDate)
    .startOf("day")
    .diff(dayjs(fromExpectedDate).startOf("day"), "day");

  if (diffDays > 0) {
    return {
      deltaText: `延后${diffDays}天`,
      deltaColor: "#BE2E2C",
    };
  }

  if (diffDays < 0) {
    return {
      deltaText: `提前${Math.abs(diffDays)}天`,
      deltaColor: "#387E22",
    };
  }

  return {};
};

const formatMoney = (value?: number | string | null) => {
  const amount =
    typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getStageText = (row: ProjectReceivableActivityRow) =>
  row.stageOption?.value?.trim() || row.keyDeliverable?.trim() || "未命名节点";

const activityTypeSortOrder: Record<ActivityTableRow["eventType"], number> = {
  EXPECTED_DATE_CHANGE: 0,
  RECEIVABLE_NODE: 1,
  COLLECTION: 2,
  BAD_DEBT_RECOVERY: 3,
  BAD_DEBT_WRITE_OFF: 3,
};

export const buildActivityRows = (rows: ProjectReceivableActivityRow[]) => {
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
      eventType: "RECEIVABLE_NODE",
      detailText: remark ? `备注：${remark}` : "-",
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
      const remark = String(actualNode.remark ?? "").trim();

      result.push({
        id: `actual-${actualNode.id}`,
        eventAtText: formatDate(actualNode.actualDate),
        eventAtValue: getTimeValue(actualNode.actualDate),
        stageOptionId: row.stageOptionId,
        stageText,
        stageColor,
        eventType: "COLLECTION",
        detailText: remark ? `备注：${remark}` : "-",
        detailIsAlert: Boolean(actualNode.remarkNeedsAttention),
        amountText: `+${formatMoney(amount)}`,
        amountColor: "#1677ff",
        operatorName: actualNode.createdByEmployee?.name?.trim() || "",
        operationAtText: formatDateTime(actualNode.createdAt),
        operationAtValue: getDateTimeValue(actualNode.createdAt),
        sourceRow: row,
        sourceActualNode: actualNode,
      });
    });

    (row.expectedDateHistories ?? []).forEach((history) => {
      const reason = String(history.reason ?? "").trim();
      const fromDate = formatDate(history.fromExpectedDate);
      const toDate = formatDate(history.toExpectedDate);
      const { deltaText, deltaColor } = getExpectedDateDelta(
        history.fromExpectedDate,
        history.toExpectedDate,
      );

      result.push({
        id: `history-${history.id}`,
        eventAtText: toDate,
        eventAtValue: getTimeValue(history.toExpectedDate),
        stageOptionId: row.stageOptionId,
        stageText,
        stageColor,
        eventType: "EXPECTED_DATE_CHANGE",
        detailText: `${fromDate} → ${toDate}`,
        expectedDateChangeDetail: {
          fromDate,
          toDate,
          deltaText,
          deltaColor,
          reason: reason || undefined,
        },
        amountText: "-",
        operatorName: history.changedByEmployee?.name?.trim() || "",
        operationAtText: formatDateTime(history.changedAt),
        operationAtValue: getDateTimeValue(history.changedAt),
        sourceRow: row,
        sourceHistory: history,
      });
    });

    (row.badDebtRecords ?? []).forEach((record) => {
      const isRecovery = record.type === "RECOVERY";
      const reason = String(record.reason ?? "").trim();
      const remark = String(record.remark ?? "").trim();
      const amount = Number(record.amountTaxIncluded ?? 0);
      const detailParts: string[] = [];

      if (reason) {
        detailParts.push(`原因：${reason}`);
      }
      if (remark) {
        detailParts.push(`备注：${remark}`);
      }

      result.push({
        id: `bad-debt-${record.id}`,
        eventAtText: formatDate(record.occurredAt),
        eventAtValue: getTimeValue(record.occurredAt),
        stageOptionId: row.stageOptionId,
        stageText,
        stageColor,
        eventType: isRecovery ? "BAD_DEBT_RECOVERY" : "BAD_DEBT_WRITE_OFF",
        detailText: detailParts.length > 0 ? detailParts.join("\n") : "-",
        amountText: `${isRecovery ? "+" : "-"}${formatMoney(amount)}`,
        amountColor: isRecovery ? "#389e0d" : "#ff4d4f",
        operatorName: record.createdByEmployee?.name?.trim() || "",
        operationAtText: formatDateTime(record.createdAt),
        operationAtValue: getDateTimeValue(record.createdAt),
        sourceRow: row,
        sourceBadDebtRecord: record,
      });
    });
  });

  return result.sort((left, right) => {
    if (left.eventAtValue !== right.eventAtValue) {
      return left.eventAtValue - right.eventAtValue;
    }

    const leftTypeOrder = activityTypeSortOrder[left.eventType];
    const rightTypeOrder = activityTypeSortOrder[right.eventType];

    if (leftTypeOrder !== rightTypeOrder) {
      return leftTypeOrder - rightTypeOrder;
    }

    if (left.operationAtValue !== right.operationAtValue) {
      return left.operationAtValue - right.operationAtValue;
    }

    return left.id.localeCompare(right.id, "zh-CN");
  });
};
