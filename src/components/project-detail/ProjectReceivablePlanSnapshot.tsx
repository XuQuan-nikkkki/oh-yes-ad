"use client";

import { Progress } from "antd";
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

export default function ProjectReceivablePlanSnapshot({
  contractAmount,
  taxAmount,
  expectedAmountTotal,
  actualAmountTotal,
  badDebtAmountTotal,
  badDebtWriteOffAmountTotal,
  badDebtRecoveryAmountTotal,
  collectionProgressPercent,
  legalEntityName,
  serviceContent,
  ownerName,
  hasVendorPayment,
  remark,
  remarkNeedsAttention = false,
}: ProjectReceivablePlanSnapshotProps) {
  const expectedAmount = toYuanNumber(expectedAmountTotal);
  const actualAmount = toYuanNumber(actualAmountTotal);
  const expectedContractDiff = expectedAmount - toYuanNumber(contractAmount);
  const receivableBalance = expectedAmount - actualAmount;
  const percent = Math.max(
    0,
    Math.min(
      100,
      collectionProgressPercent ??
        (expectedAmount > 0
          ? Math.round((actualAmount / expectedAmount) * 100)
          : 0),
    ),
  );

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
            value: expectedAmount,
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
            alignItems: "center",
            gap: 12,
            fontSize: 12,
            color: "rgba(0,0,0,0.65)",
            fontWeight: 600,
          }}
        >
          <span style={{ minWidth: 30 }}>{percent.toFixed(0)}%</span>
          <Progress
            percent={percent}
            showInfo={false}
            strokeColor={percent === 100 ? "#52c41a" : "#1677ff"}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <span
            style={{
              color: "rgba(0,0,0,0.45)",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            实收 {actualAmount.toLocaleString("zh-CN")} / 预收{" "}
            {expectedAmount.toLocaleString("zh-CN")} 元
          </span>
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
