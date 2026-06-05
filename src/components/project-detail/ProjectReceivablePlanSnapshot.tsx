"use client";

import {
  AccountBookTwoTone,
  FileTextTwoTone,
  MinusCircleTwoTone,
  WalletTwoTone,
} from "@ant-design/icons";
import { ProCard, StatisticCard } from "@ant-design/pro-components";
import { formatBadDebtSignedAmount } from "@/lib/format-bad-debt-amount";
import BooleanTag from "@/components/BooleanTag";
import RemarkText from "@/components/RemarkText";

export type ProjectReceivablePlanSnapshotProps = {
  contractAmount: number;
  taxAmount?: number | string | null;
  expectedAmountTotal: number;
  actualExpectedAmountTotal: number;
  actualAmountTotal: number;
  badDebtAmountTotal?: number | string | null;
  badDebtWriteOffAmountTotal?: number | string | null;
  badDebtRecoveryAmountTotal?: number | string | null;
  collectionProgressPercent?: number | null;
  legalEntityName?: string | null;
  serviceContent?: string | null;
  ownerName?: string | null;
  hasVendorPayment: boolean;
  remark?: string | null;
  remarkNeedsAttention?: boolean;
};

const toYuanNumber = (value: unknown) => {
  const num =
    typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
};

const statisticCardStyle = {
  background: "var(--ant-colorFillAlter, #fafafa)",
  height: "100%",
};

const badDebtTextColor = "#BE2E2C";
const progressPercentColumnWidth = 42;
const progressMetaTextStyle = {
  fontSize: 11,
  color: "rgba(0,0,0,0.45)",
  fontWeight: 500,
};

const formatPercentText = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export default function ProjectReceivablePlanSnapshot({
  contractAmount,
  taxAmount,
  expectedAmountTotal,
  actualExpectedAmountTotal,
  actualAmountTotal,
  badDebtAmountTotal,
  badDebtWriteOffAmountTotal,
  badDebtRecoveryAmountTotal,
  legalEntityName,
  serviceContent,
  ownerName,
  hasVendorPayment,
  remark,
  remarkNeedsAttention = false,
}: ProjectReceivablePlanSnapshotProps) {
  const expectedAmount = toYuanNumber(expectedAmountTotal);
  const actualExpectedAmount = toYuanNumber(actualExpectedAmountTotal);
  const actualAmount = toYuanNumber(actualAmountTotal);
  const badDebtAmount = toYuanNumber(badDebtAmountTotal);
  const expectedContractDiff =
    actualExpectedAmount - toYuanNumber(contractAmount);
  const receivableBalance = actualExpectedAmount - actualAmount;
  const actualPercent =
    expectedAmount > 0 ? (actualAmount / expectedAmount) * 100 : 0;
  const badDebtPercent =
    expectedAmount > 0 ? (badDebtAmount / expectedAmount) * 100 : 0;
  const receivableBalancePercent =
    expectedAmount > 0 ? (receivableBalance / expectedAmount) * 100 : 0;
  const actualBarPercent = Math.max(0, Math.min(100, actualPercent));
  const badDebtBarPercent = Math.max(
    0,
    Math.min(100 - actualBarPercent, badDebtPercent),
  );
  const combinedBarPercent = actualBarPercent + badDebtBarPercent;
  const completedAmount = actualAmount + badDebtAmount;
  const progressPercentTextColor =
    combinedBarPercent >= 100 ? "#52c41a" : "#1677ff";
  const actualBarColor =
    combinedBarPercent >= 100 && badDebtAmount <= 0 ? "#52c41a" : "#1677ff";
  const progressSummaryText = `${
    badDebtAmount > 0 ? "已收+已核销" : "已收"
  }：${completedAmount.toLocaleString("zh-CN")} / 预收：${actualExpectedAmount.toLocaleString(
    "zh-CN",
  )} 元`;

  return (
    <ProCard split="horizontal" bordered>
      <ProCard split="vertical">
        <StatisticCard
          style={statisticCardStyle}
          statistic={{
            title: "合同金额（含税）",
            icon: <FileTextTwoTone />,
            styles: {
              title: { fontSize: 13 },
              content: {
                fontSize: 18,
                fontWeight: 600,
              },
            },
            value: contractAmount,
            suffix: "元",
            description: (
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                税费：
                {taxAmount === null || taxAmount === undefined
                  ? "-"
                  : toYuanNumber(taxAmount).toLocaleString("zh-CN")}{" "}
                元
              </span>
            ),
            formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
          }}
        />
        <StatisticCard
          style={statisticCardStyle}
          statistic={{
            title: "预收金额合计",
            icon: <WalletTwoTone />,
            value: actualExpectedAmount,
            suffix: "元",
            styles: {
              title: { fontSize: 13 },
              content: {
                fontSize: 18,
                fontWeight: 600,
              },
            },
            description: (
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                {Math.round(expectedContractDiff * 100) === 0
                  ? "与合同金额一致"
                  : expectedContractDiff < 0
                    ? `较合同金额减少 ${Math.abs(expectedContractDiff).toLocaleString("zh-CN")} 元`
                    : `较合同金额增加 ${expectedContractDiff.toLocaleString("zh-CN")} 元`}
              </span>
            ),
            formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
          }}
        />
        <StatisticCard
          style={statisticCardStyle}
          statistic={{
            title: "实收金额总计",
            icon: <AccountBookTwoTone />,
            styles: {
              title: { fontSize: 13 },
              content: {
                fontSize: 18,
                fontWeight: 600,
              },
            },
            value: actualAmount,
            suffix: "元",
            description: (
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                待收余额：{receivableBalance.toLocaleString("zh-CN")} 元
              </span>
            ),
            formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
          }}
        />
        <StatisticCard
          style={statisticCardStyle}
          statistic={{
            title: "坏账总计",
            icon: <MinusCircleTwoTone twoToneColor="#ff4d4f" />,
            styles: {
              title: { fontSize: 13 },
              content: {
                fontSize: 18,
                fontWeight: 600,
                color: badDebtTextColor,
              },
            },
            value:
              badDebtAmountTotal === null || badDebtAmountTotal === undefined
                ? "-"
                : formatBadDebtSignedAmount("WRITE_OFF", badDebtAmountTotal),
            suffix:
              badDebtAmountTotal === null || badDebtAmountTotal === undefined
                ? undefined
                : "元",
            formatter: (value) =>
              String(value ?? "-"),
            description: (
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                核销{" "}
                <span>
                  {badDebtWriteOffAmountTotal === null ||
                  badDebtWriteOffAmountTotal === undefined
                    ? "-"
                    : formatBadDebtSignedAmount(
                        "WRITE_OFF",
                        badDebtWriteOffAmountTotal,
                      )}{" "}
                  元
                </span>{" "}
                · 收回{" "}
                <span>
                  {badDebtRecoveryAmountTotal === null ||
                  badDebtRecoveryAmountTotal === undefined
                    ? "-"
                    : formatBadDebtSignedAmount(
                        "RECOVERY",
                        badDebtRecoveryAmountTotal,
                      )}{" "}
                  元
                </span>
              </span>
            ),
          }}
        />
      </ProCard>
      <ProCard>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${progressPercentColumnWidth}px minmax(0, 1fr) auto`,
              alignItems: "center",
              gap: 12,
              fontSize: 12,
              color: "rgba(0,0,0,0.65)",
              fontWeight: 600,
            }}
            >
              <span
                style={{
                  minWidth: progressPercentColumnWidth,
                  color: progressPercentTextColor,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
              {formatPercentText(combinedBarPercent)}%
            </span>
            <div
              style={{
                position: "relative",
                flex: 1,
                height: 8,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${actualBarPercent}%`,
                  background: actualBarColor,
                  borderRadius:
                    badDebtBarPercent > 0 ? "999px 0 0 999px" : "999px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${actualBarPercent}%`,
                  width: `${badDebtBarPercent}%`,
                  background: badDebtTextColor,
                  borderRadius:
                    actualBarPercent > 0 ? "0 999px 999px 0" : "999px",
                }}
              />
            </div>
            <span
              style={{
                ...progressMetaTextStyle,
                whiteSpace: "nowrap",
              }}
            >
              {progressSummaryText}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${progressPercentColumnWidth}px minmax(0, 1fr) auto`,
              alignItems: "flex-start",
              gap: 12,
              width: "100%",
              ...progressMetaTextStyle,
            }}
          >
            <span />
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                width: "100%",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: actualBarColor,
                  }}
                />
                <span>
                  已收 {actualAmount.toLocaleString("zh-CN")} 元（{formatPercentText(actualPercent)}%）
                </span>
              </span>
              {badDebtAmount > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                    minWidth: 0,
                    justifyContent: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: badDebtTextColor,
                    }}
                  />
                  <span>
                    坏账 {formatBadDebtSignedAmount("WRITE_OFF", badDebtAmount)} 元（
                    {formatPercentText(badDebtPercent)}%）
                  </span>
                </span>
              ) : null}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flex: 1,
                  minWidth: 0,
                  justifyContent: "flex-end",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.25)",
                  }}
                />
                <span>
                  待收 {receivableBalance.toLocaleString("zh-CN")} 元（
                  {formatPercentText(receivableBalancePercent)}%）
                </span>
              </span>
            </div>
            <span
              style={{
                ...progressMetaTextStyle,
                whiteSpace: "nowrap",
                visibility: "hidden",
              }}
            >
              {progressSummaryText}
            </span>
          </div>
        </div>
      </ProCard>
      <ProCard split="vertical">
        <ProCard>
          <div
            style={{
              color: "rgba(0,0,0,0.45)",
              fontSize: 12,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            签约主体
          </div>
          <div style={{ wordBreak: "break-word" }}>
            <span>{legalEntityName || "-"}</span>
          </div>
        </ProCard>
        <ProCard>
          <div
            style={{
              color: "rgba(0,0,0,0.45)",
              fontSize: 12,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            服务内容
          </div>
          <div style={{ wordBreak: "break-word" }}>
            {serviceContent?.trim() ? serviceContent : "-"}
          </div>
        </ProCard>
        <ProCard colSpan={4}>
          <div
            style={{
              color: "rgba(0,0,0,0.45)",
              fontSize: 12,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            跟进人
          </div>
          <div style={{ wordBreak: "break-word" }}>
            <span>{ownerName || "-"}</span>
          </div>
        </ProCard>
        <ProCard colSpan={4}>
          <div
            style={{
              color: "rgba(0,0,0,0.45)",
              fontSize: 12,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            有供应商付款
          </div>
          <div style={{ wordBreak: "break-word" }}>
            <BooleanTag value={Boolean(hasVendorPayment)} />
          </div>
        </ProCard>
        <ProCard>
          <div>备注</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            <RemarkText
              remark={remark}
              remarkNeedsAttention={Boolean(remarkNeedsAttention)}
            />
          </div>
        </ProCard>
      </ProCard>
    </ProCard>
  );
}
