"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Empty,
  Segmented,
  Upload,
  message,
} from "antd";
import type { UploadProps } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PageAccessResult from "@/components/PageAccessResult";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import PayableTable from "./_components/PayableTable";
import ProcessingPayableDrawer from "./_components/ProcessingPayableDrawer";
import ReceivableTable from "./_components/ReceivableTable";
import ProcessingReceivableDrawer from "./_components/ProcessingReceivableDrawer";
import type { PayableEntryDraft, ReceivableEntryDraft } from "./_components/types";

type FlattenRow = {
  key: string;
  [key: string]: string;
};

type DetailMode = "receivable" | "payable";

type ImportedData = {
  headers: string[];
  rows: FlattenRow[];
  fileName: string;
};

const RECEIVABLE_REQUIRED_HEADERS = [
  "签约公司",
  "品牌名",
  "服务内容",
  "跟进人",
  "合同金额(含税)",
  "项目状态",
] as const;
const PAYABLE_REQUIRED_HEADERS = [
  "签约公司",
  "品牌名",
  "服务内容",
  "供应商签约全名",
  "供应商简称",
  "跟进人",
  "合同金额",
  "项目状态",
] as const;
const RECEIVABLE_REMARK_COL_INDEX = 14; // Excel 第14列（N列）= c13

const normalizeHeader = (value: string) =>
  value
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replace(/\s+/g, "")
    .trim();

const findHeaderIndex = (normalizedHeaders: string[], candidates: string[]) =>
  normalizedHeaders.findIndex((item) =>
    candidates.some((candidate) => item === normalizeHeader(candidate)),
  );

const parseMoneyNumber = (value: string) => {
  const normalized = String(value ?? "")
    .replaceAll("¥", "")
    .replaceAll(",", "")
    .replaceAll("，", "")
    .trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBooleanText = (value: string) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  if (["是", "y", "yes", "true", "1"].includes(normalized.toLowerCase())) {
    return true;
  }
  if (["否", "n", "no", "false", "0"].includes(normalized.toLowerCase())) {
    return false;
  }
  return null;
};

const normalizeGroupText = (value: string) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const columnNameToNumber = (value: string) => {
  return value
    .toUpperCase()
    .split("")
    .reduce((sum, char) => sum * 26 + (char.charCodeAt(0) - 64), 0);
};

const parseCellAddress = (address: string) => {
  const matched = address.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!matched) return null;
  return {
    row: Number(matched[2]),
    col: columnNameToNumber(matched[1]),
  };
};

const parseMergeRange = (rangeText: string) => {
  const parts = rangeText.split(":");
  if (parts.length !== 2) return null;
  const start = parseCellAddress(parts[0]);
  const end = parseCellAddress(parts[1]);
  if (!start || !end) return null;
  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col),
  };
};

const normalizeCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "是" : "否";
  if (value instanceof Date) return dayjs(value).format("YYYY/MM/DD");

  if (typeof value === "object") {
    const objectValue = value as {
      text?: string;
      richText?: Array<{ text?: string }>;
      result?: unknown;
      formula?: string;
      hyperlink?: string;
    };

    if (Array.isArray(objectValue.richText)) {
      return objectValue.richText.map((item) => item?.text ?? "").join("").trim();
    }

    if (typeof objectValue.text === "string") {
      return objectValue.text.trim();
    }

    if (objectValue.result !== undefined) {
      return normalizeCellValue(objectValue.result);
    }

    if (typeof objectValue.formula === "string") {
      return objectValue.formula.trim();
    }

    if (typeof objectValue.hyperlink === "string") {
      return objectValue.hyperlink.trim();
    }
  }

  return String(value).trim();
};

const getTopLeftCellMap = (worksheet: {
  model?: { merges?: string[] };
}) => {
  const map = new Map<string, { row: number; col: number }>();
  const merges = worksheet.model?.merges ?? [];
  merges.forEach((rangeText) => {
    const parsed = parseMergeRange(rangeText);
    if (!parsed) return;
    for (let row = parsed.startRow; row <= parsed.endRow; row += 1) {
      for (let col = parsed.startCol; col <= parsed.endCol; col += 1) {
        map.set(`${row}:${col}`, { row: parsed.startRow, col: parsed.startCol });
      }
    }
  });
  return map;
};

const getMergeRangesByTopLeft = (worksheet: {
  model?: { merges?: string[] };
}) => {
  const map = new Map<string, ReturnType<typeof parseMergeRange>>();
  const merges = worksheet.model?.merges ?? [];
  merges.forEach((rangeText) => {
    const parsed = parseMergeRange(rangeText);
    if (!parsed) return;
    map.set(`${parsed.startRow}:${parsed.startCol}`, parsed);
  });
  return map;
};

const getCellText = (
  worksheet: {
    getCell: (row: number, col: number) => { value: unknown };
  },
  topLeftCellMap: Map<string, { row: number; col: number }>,
  row: number,
  col: number,
) => {
  const topLeft = topLeftCellMap.get(`${row}:${col}`);
  const targetRow = topLeft?.row ?? row;
  const targetCol = topLeft?.col ?? col;
  return normalizeCellValue(worksheet.getCell(targetRow, targetCol).value);
};

export default function ImportReceivablePayableDetailsPage() {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const currentUser = useAuthStore((state) => state.currentUser);
  const authLoaded = useAuthStore((state) => state.loaded);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canViewPage =
    roleCodes.includes("ADMIN") || roleCodes.includes("PROJECT_MANAGER");

  const [mode, setMode] = useState<DetailMode>("receivable");
  const [importedByMode, setImportedByMode] = useState<
    Record<DetailMode, ImportedData>
  >({
    receivable: { headers: [], rows: [], fileName: "" },
    payable: { headers: [], rows: [], fileName: "" },
  });
  const [loading, setLoading] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [processingEntry, setProcessingEntry] = useState<ReceivableEntryDraft | null>(
    null,
  );
  const [payableProcessingOpen, setPayableProcessingOpen] = useState(false);
  const [payableProcessingEntry, setPayableProcessingEntry] =
    useState<PayableEntryDraft | null>(null);
  const [completedEntryKeysByMode, setCompletedEntryKeysByMode] = useState<
    Record<DetailMode, string[]>
  >({
    receivable: [],
    payable: [],
  });

  const currentImported = importedByMode[mode];
  const modeLabel = mode === "receivable" ? "收款明细" : "付款明细";

  useEffect(() => {
    if (!authLoaded) {
      void fetchMe();
    }
  }, [authLoaded, fetchMe]);

  const notifySuccess = useCallback(
    (text: string) => {
      if (typeof app?.message?.success === "function") {
        app.message.success(text);
      } else {
        void messageApi.success(text);
      }
    },
    [app, messageApi],
  );

  const notifyWarning = useCallback(
    (text: string) => {
      if (typeof app?.message?.warning === "function") {
        app.message.warning(text);
      } else {
        void messageApi.warning(text);
      }
    },
    [app, messageApi],
  );

  const notifyError = useCallback(
    (text: string) => {
      if (typeof app?.message?.error === "function") {
        app.message.error(text);
      } else {
        void messageApi.error(text);
      }
    },
    [app, messageApi],
  );

  const parseExcel = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          setImportedByMode((prev) => ({
            ...prev,
            [mode]: { headers: [], rows: [], fileName: "" },
          }));
          notifyWarning("未找到可读取的工作表");
          return;
        }

        const topLeftCellMap = getTopLeftCellMap(worksheet);
        const mergeRangesByTopLeft = getMergeRangesByTopLeft(worksheet);
        const rowCount = worksheet.rowCount;
        const columnCount = worksheet.columnCount;

        let headerRowIndex = mode === "payable" ? 2 : 1;
        const detectLimit = Math.min(rowCount, 20);
        const expectedReceivableHeaders = RECEIVABLE_REQUIRED_HEADERS.map((item) =>
          normalizeHeader(item),
        );
        const expectedPayableHeaders = PAYABLE_REQUIRED_HEADERS.map((item) =>
          normalizeHeader(item),
        );

        if (mode === "receivable") {
          for (let rowIndex = 1; rowIndex <= detectLimit; rowIndex += 1) {
            const actualPrefix = expectedReceivableHeaders.map((_, index) =>
              normalizeHeader(getCellText(worksheet, topLeftCellMap, rowIndex, index + 1)),
            );
            const matched = expectedReceivableHeaders.every(
              (item, index) => actualPrefix[index] === item,
            );
            if (matched) {
              headerRowIndex = rowIndex;
              break;
            }
          }
        }

        const rawHeaders = Array.from({ length: columnCount }).map((_, index) =>
          getCellText(worksheet, topLeftCellMap, headerRowIndex, index + 1),
        );
        const lastNonEmptyHeaderIndex = rawHeaders.reduce((last, item, index) => {
          return item ? index : last;
        }, -1);
        const effectiveColumnCount =
          lastNonEmptyHeaderIndex >= 0 ? lastNonEmptyHeaderIndex + 1 : columnCount;

        const normalizedHeaders = Array.from({ length: effectiveColumnCount }).map(
          (_, index) => {
            const headerText = (rawHeaders[index] ?? "").trim();
            return headerText || `列${index + 1}`;
          },
        );
        const normalizedHeaderKeys = normalizedHeaders.map((item) =>
          normalizeHeader(item),
        );

        if (mode === "receivable") {
          const actualPrefix = normalizedHeaderKeys.slice(
            0,
            expectedReceivableHeaders.length,
          );
          const matched = expectedReceivableHeaders.every(
            (item, index) => actualPrefix[index] === item,
          );
          if (!matched) {
            setImportedByMode((prev) => ({
              ...prev,
              [mode]: { headers: [], rows: [], fileName: "" },
            }));
            notifyError("上传的文件不符合收款明细的格式");
            return;
          }
        } else {
          if (rowCount < 2) {
            setImportedByMode((prev) => ({
              ...prev,
              [mode]: { headers: [], rows: [], fileName: "" },
            }));
            notifyError("上传的文件不符合付款明细的格式");
            return;
          }
          const actualPrefix = normalizedHeaderKeys.slice(
            0,
            expectedPayableHeaders.length,
          );
          const matched = expectedPayableHeaders.every(
            (item, index) => actualPrefix[index] === item,
          );
          if (!matched) {
            setImportedByMode((prev) => ({
              ...prev,
              [mode]: { headers: [], rows: [], fileName: "" },
            }));
            notifyError("上传的文件不符合付款明细的格式");
            return;
          }
        }

        const parsedRows: FlattenRow[] = [];
        for (let rowIndex = headerRowIndex + 1; rowIndex <= rowCount; rowIndex += 1) {
          const rowValues = Array.from({ length: effectiveColumnCount }).map(
            (_, index) => getCellText(worksheet, topLeftCellMap, rowIndex, index + 1),
          );
          if (rowValues.every((item) => !item)) continue;

          const record: FlattenRow = { key: String(parsedRows.length + 1) };
          rowValues.forEach((value, index) => {
            record[`c${index}`] = value;
          });
          if (mode === "receivable") {
            const topLeft = topLeftCellMap.get(
              `${rowIndex}:${RECEIVABLE_REMARK_COL_INDEX}`,
            );
            if (topLeft) {
              const mergeRange = mergeRangesByTopLeft.get(
                `${topLeft.row}:${topLeft.col}`,
              );
              if (mergeRange && mergeRange.endRow > mergeRange.startRow) {
                record.__remarkScope = "entry";
              } else {
                record.__remarkScope = "node";
              }
            } else {
              record.__remarkScope = "node";
            }
            // Detect red font on the remark cell (ARGB: AA RR GG BB)
            const remarkTargetRow = topLeft?.row ?? rowIndex;
            const remarkTargetCol = topLeft?.col ?? RECEIVABLE_REMARK_COL_INDEX;
            const remarkCell = worksheet.getCell(remarkTargetRow, remarkTargetCol);
            const argb = String(remarkCell.font?.color?.argb ?? "");
            const isRedFont =
              argb.length === 8 &&
              parseInt(argb.slice(2, 4), 16) >= 0xc0 &&
              parseInt(argb.slice(4, 6), 16) < 0x80 &&
              parseInt(argb.slice(6, 8), 16) < 0x80;
            record.__remarkIsRed = isRedFont ? "true" : "false";
          }
          parsedRows.push(record);
        }

        setImportedByMode((prev) => ({
          ...prev,
          [mode]: {
            headers: normalizedHeaders,
            rows: parsedRows,
            fileName: file.name,
          },
        }));
        setCompletedEntryKeysByMode((prev) => ({
          ...prev,
          [mode]: [],
        }));
        notifySuccess(
          `${mode === "receivable" ? "收款" : "付款"}明细已导入 ${
            parsedRows.length
          } 条，可继续手动处理`,
        );
      } catch (error) {
        console.error(error);
        setImportedByMode((prev) => ({
          ...prev,
          [mode]: { headers: [], rows: [], fileName: "" },
        }));
        notifyError("导入失败，请确认文件为可读取的 Excel（.xlsx）");
      } finally {
        setLoading(false);
      }
    },
    [mode, notifyError, notifySuccess, notifyWarning],
  );

  const uploadProps = useMemo<UploadProps>(
    () => ({
      accept: ".xlsx",
      maxCount: 1,
      showUploadList: false,
      disabled: loading,
      beforeUpload: (file) => {
        void parseExcel(file as File);
        return Upload.LIST_IGNORE;
      },
    }),
    [loading, parseExcel],
  );

  const receivableEntries = useMemo<ReceivableEntryDraft[]>(
    () => {
      if (mode !== "receivable") return [];
      const grouped = new Map<string, ReceivableEntryDraft>();
      const lastBase = {
        contractCompany: "",
        brandName: "",
        serviceContent: "",
        ownerName: "",
        contractAmountTaxIncluded: null as number | null,
        projectStatus: "",
        hasVendorPayment: null as boolean | null,
      };

      currentImported.rows.forEach((row) => {
        const contractCompanyRaw = String(row.c0 ?? "").trim();
        const brandNameRaw = String(row.c1 ?? "").trim();
        const serviceContentRaw = String(row.c2 ?? "").trim();
        const ownerNameRaw = String(row.c3 ?? "").trim();
        const contractAmountRaw = parseMoneyNumber(String(row.c4 ?? ""));
        const projectStatusRaw = String(row.c5 ?? "").trim();
        const hasVendorPaymentRaw = parseBooleanText(String(row.c12 ?? ""));
        const remarkRaw = String(row.c13 ?? "").trim();
        const remarkScope = String(row.__remarkScope ?? "").trim();
        const isRemarkRed = String(row.__remarkIsRed ?? "").trim() === "true";

        const contractCompany = contractCompanyRaw || lastBase.contractCompany;
        const brandName = brandNameRaw || lastBase.brandName;
        const serviceContent = serviceContentRaw || lastBase.serviceContent;
        const ownerName = ownerNameRaw || lastBase.ownerName;
        const contractAmountTaxIncluded =
          contractAmountRaw ?? lastBase.contractAmountTaxIncluded;
        const projectStatus = projectStatusRaw || lastBase.projectStatus;
        const hasVendorPayment =
          hasVendorPaymentRaw ?? lastBase.hasVendorPayment;
        const entryRemark = remarkScope === "entry" ? remarkRaw : "";
        const entryRemarkNeedsAttention = remarkScope === "entry" && isRemarkRed;

        lastBase.contractCompany = contractCompany;
        lastBase.brandName = brandName;
        lastBase.serviceContent = serviceContent;
        lastBase.ownerName = ownerName;
        lastBase.contractAmountTaxIncluded = contractAmountTaxIncluded;
        lastBase.projectStatus = projectStatus;
        lastBase.hasVendorPayment = hasVendorPayment;

        const groupKey = [
          normalizeGroupText(contractCompany),
          normalizeGroupText(brandName),
          normalizeGroupText(serviceContent),
          normalizeGroupText(ownerName),
          String(contractAmountTaxIncluded ?? ""),
          normalizeGroupText(projectStatus),
        ].join("||");

        const node = {
          key: `${groupKey}::${String(row.c6 ?? "").trim()}::${String(row.c7 ?? "").trim()}::${String(row.c9 ?? "").trim()}`,
          stageName: String(row.c6 ?? "").trim(),
          keyDeliverable: String(row.c7 ?? "").trim(),
          expectedAmountTaxIncluded: parseMoneyNumber(String(row.c8 ?? "")),
          expectedDate: String(row.c9 ?? "").trim(),
          actualAmountTaxIncluded: parseMoneyNumber(String(row.c10 ?? "")),
          actualDate: String(row.c11 ?? "").trim(),
          remark: remarkScope === "node" ? remarkRaw : "",
          remarkNeedsAttention: remarkScope === "node" && isRemarkRed,
        };
        const hasNodeData = Boolean(
          node.stageName ||
            node.keyDeliverable ||
            node.expectedAmountTaxIncluded !== null ||
            node.expectedDate ||
            node.actualAmountTaxIncluded !== null ||
            node.actualDate,
        );

        const existing = grouped.get(groupKey);
        if (existing) {
          if (existing.hasVendorPayment === null && hasVendorPayment !== null) {
            existing.hasVendorPayment = hasVendorPayment;
          }
          if (entryRemark && !existing.remark) {
            existing.remark = entryRemark;
            if (entryRemarkNeedsAttention) existing.remarkNeedsAttention = true;
          }
          if (hasNodeData && !existing.nodes.some((item) => item.key === node.key)) {
            existing.nodes.push(node);
          }
          return;
        }

        grouped.set(groupKey, {
          key: String(grouped.size + 1),
          contractCompany,
          brandName,
          serviceContent,
          ownerName,
          contractAmountTaxIncluded,
          projectStatus,
          hasVendorPayment,
          remark: entryRemark,
          remarkNeedsAttention: entryRemarkNeedsAttention,
          nodes: hasNodeData ? [node] : [],
        });
      });

      return Array.from(grouped.values());
    },
    [currentImported.rows, mode],
  );
  const visibleReceivableEntries = useMemo(
    () =>
      receivableEntries.filter(
        (entry) => !completedEntryKeysByMode.receivable.includes(entry.key),
      ),
    [completedEntryKeysByMode.receivable, receivableEntries],
  );

  const payableEntries = useMemo<PayableEntryDraft[]>(
    () => {
      if (mode !== "payable") return [];
      const grouped = new Map<string, PayableEntryDraft>();
      const normalizedPayableHeaders = currentImported.headers.map((item) =>
        normalizeHeader(item),
      );
      const hasCustomerCollectionColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "是否有客户收款",
        "有客户收款",
      ]);
      const stageNameColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "付款阶段",
      ]);
      const paymentConditionColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "付款条件",
        "付款节点",
      ]);
      const expectedAmountColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "预付金额(含税)",
      ]);
      const expectedDateColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "预付日期",
      ]);
      const actualAmountColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "实付金额(含税)",
      ]);
      const actualDateColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "实付日期",
      ]);
      const nodeRemarkColIndex = findHeaderIndex(normalizedPayableHeaders, [
        "备注",
        "节点备注",
      ]);
      const lastBase = {
        contractCompany: "",
        brandName: "",
        serviceContent: "",
        vendorFullName: "",
        vendorShortName: "",
        ownerName: "",
        contractAmount: null as number | null,
        projectStatus: "",
        hasCustomerCollection: null as boolean | null,
      };

      currentImported.rows.forEach((row) => {
        const contractCompanyRaw = String(row.c0 ?? "").trim();
        const brandNameRaw = String(row.c1 ?? "").trim();
        const serviceContentRaw = String(row.c2 ?? "").trim();
        const vendorFullNameRaw = String(row.c3 ?? "").trim();
        const vendorShortNameRaw = String(row.c4 ?? "").trim();
        const ownerNameRaw = String(row.c5 ?? "").trim();
        const contractAmountRaw = parseMoneyNumber(String(row.c6 ?? ""));
        const projectStatusRaw = String(row.c7 ?? "").trim();
        const hasCustomerCollectionRaw =
          hasCustomerCollectionColIndex >= 0
            ? parseBooleanText(String(row[`c${hasCustomerCollectionColIndex}`] ?? ""))
            : null;
        const stageName =
          stageNameColIndex >= 0
            ? String(row[`c${stageNameColIndex}`] ?? "").trim()
            : String(row.c8 ?? "").trim();
        const paymentCondition =
          paymentConditionColIndex >= 0
            ? String(row[`c${paymentConditionColIndex}`] ?? "").trim()
            : String(row.c9 ?? "").trim();
        const expectedAmountTaxIncluded =
          expectedAmountColIndex >= 0
            ? parseMoneyNumber(String(row[`c${expectedAmountColIndex}`] ?? ""))
            : parseMoneyNumber(String(row.c10 ?? ""));
        const expectedDate =
          expectedDateColIndex >= 0
            ? String(row[`c${expectedDateColIndex}`] ?? "").trim()
            : String(row.c11 ?? "").trim();
        const actualAmountTaxIncluded =
          actualAmountColIndex >= 0
            ? parseMoneyNumber(String(row[`c${actualAmountColIndex}`] ?? ""))
            : parseMoneyNumber(String(row.c12 ?? ""));
        const actualDate =
          actualDateColIndex >= 0
            ? String(row[`c${actualDateColIndex}`] ?? "").trim()
            : String(row.c13 ?? "").trim();
        const nodeRemark =
          nodeRemarkColIndex >= 0
            ? String(row[`c${nodeRemarkColIndex}`] ?? "").trim()
            : String(row.c14 ?? "").trim();

        const contractCompany = contractCompanyRaw || lastBase.contractCompany;
        const brandName = brandNameRaw || lastBase.brandName;
        const serviceContent = serviceContentRaw || lastBase.serviceContent;
        const vendorFullName = vendorFullNameRaw || lastBase.vendorFullName;
        const vendorShortName = vendorShortNameRaw || lastBase.vendorShortName;
        const ownerName = ownerNameRaw || lastBase.ownerName;
        const contractAmount = contractAmountRaw ?? lastBase.contractAmount;
        const projectStatus = projectStatusRaw || lastBase.projectStatus;
        const hasCustomerCollection =
          hasCustomerCollectionRaw ?? lastBase.hasCustomerCollection;

        lastBase.contractCompany = contractCompany;
        lastBase.brandName = brandName;
        lastBase.serviceContent = serviceContent;
        lastBase.vendorFullName = vendorFullName;
        lastBase.vendorShortName = vendorShortName;
        lastBase.ownerName = ownerName;
        lastBase.contractAmount = contractAmount;
        lastBase.projectStatus = projectStatus;
        lastBase.hasCustomerCollection = hasCustomerCollection;

        const groupKey = [
          normalizeGroupText(contractCompany),
          normalizeGroupText(brandName),
          normalizeGroupText(serviceContent),
          normalizeGroupText(vendorFullName),
          normalizeGroupText(vendorShortName),
          normalizeGroupText(ownerName),
          String(contractAmount ?? ""),
          normalizeGroupText(projectStatus),
        ].join("||");

        const node = {
          key: `${groupKey}::${stageName}::${paymentCondition}::${expectedDate}`,
          stageName,
          paymentCondition,
          expectedAmountTaxIncluded,
          expectedDate,
          actualAmountTaxIncluded,
          actualDate,
          remark: nodeRemark,
        };
        const hasNodeData = Boolean(
          node.stageName ||
            node.paymentCondition ||
            node.expectedAmountTaxIncluded !== null ||
            node.expectedDate ||
            node.actualAmountTaxIncluded !== null ||
            node.actualDate ||
            node.remark,
        );

        const existing = grouped.get(groupKey);
        if (existing) {
          if (
            existing.hasCustomerCollection === null &&
            hasCustomerCollection !== null
          ) {
            existing.hasCustomerCollection = hasCustomerCollection;
          }
          if (hasNodeData && !existing.nodes.some((item) => item.key === node.key)) {
            existing.nodes.push(node);
          }
          return;
        }

        grouped.set(groupKey, {
          key: String(grouped.size + 1),
          contractCompany,
          brandName,
          serviceContent,
          vendorFullName,
          vendorShortName,
          supplierName: vendorShortName || "-",
          ownerName,
          contractAmount,
          projectStatus,
          hasCustomerCollection,
          nodes: hasNodeData ? [node] : [],
        });
      });

      return Array.from(grouped.values());
    },
    [currentImported.headers, currentImported.rows, mode],
  );
  const visiblePayableEntries = useMemo(
    () =>
      payableEntries.filter(
        (entry) => !completedEntryKeysByMode.payable.includes(entry.key),
      ),
    [completedEntryKeysByMode.payable, payableEntries],
  );

  const handleProcess = useCallback((entry: ReceivableEntryDraft) => {
    setProcessingEntry(entry);
    setProcessingOpen(true);
  }, []);
  const handlePayableProcess = useCallback(
    (entry: PayableEntryDraft) => {
      setPayableProcessingEntry(entry);
      setPayableProcessingOpen(true);
    },
    [],
  );

  const handleDrawerClose = useCallback(() => {
    setProcessingOpen(false);
    setProcessingEntry(null);
  }, []);
  const handlePayableDrawerClose = useCallback(() => {
    setPayableProcessingOpen(false);
    setPayableProcessingEntry(null);
  }, []);
  const handleReceivableCompleted = useCallback((entryKey: string) => {
    setCompletedEntryKeysByMode((prev) => ({
      ...prev,
      receivable: prev.receivable.includes(entryKey)
        ? prev.receivable
        : [...prev.receivable, entryKey],
    }));
  }, []);
  const handlePayableCompleted = useCallback((entryKey: string) => {
    setCompletedEntryKeysByMode((prev) => ({
      ...prev,
      payable: prev.payable.includes(entryKey)
        ? prev.payable
        : [...prev.payable, entryKey],
    }));
  }, []);

  return (
    <div>
      {contextHolder}
      {!canViewPage ? (
        <PageAccessResult type="forbidden" />
      ) : (
        <Card
          title={
            <Segmented<DetailMode>
              value={mode}
              options={[
                { label: "收款明细", value: "receivable" },
                { label: "付款明细", value: "payable" },
              ]}
              onChange={(value) => setMode(value)}
            />
          }
          extra={
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>
                {mode === "receivable" ? "上传收款明细" : "上传付款明细"}
              </Button>
            </Upload>
          }
          loading={loading}
          styles={{ body: { paddingTop: 12 } }}
        >
          <div style={{ marginTop: 12 }}>
            {(mode === "receivable"
              ? visibleReceivableEntries.length > 0
              : visiblePayableEntries.length > 0) ? (
              mode === "receivable" ? (
                <ReceivableTable
                  entries={visibleReceivableEntries}
                  onProcess={handleProcess}
                />
              ) : (
                <PayableTable
                  entries={visiblePayableEntries}
                  onProcess={handlePayableProcess}
                />
              )
            ) : (
              <Empty description={`上传${modeLabel}后将在这里平铺展示明细数据`} />
            )}
          </div>
        </Card>
      )}
      <ProcessingReceivableDrawer
        open={processingOpen}
        entry={processingEntry}
        onClose={handleDrawerClose}
        onCompleted={handleReceivableCompleted}
      />
      <ProcessingPayableDrawer
        open={payableProcessingOpen}
        entry={payableProcessingEntry}
        onClose={handlePayableDrawerClose}
        onCompleted={handlePayableCompleted}
      />
    </div>
  );
}
