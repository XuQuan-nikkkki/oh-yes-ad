"use client";

import { Progress } from "antd";
import {
  AccountBookTwoTone,
  BankTwoTone,
  FileTextTwoTone,
  WalletTwoTone,
} from "@ant-design/icons";
import { ProCard, StatisticCard } from "@ant-design/pro-components";
import BooleanTag from "@/components/BooleanTag";
import RemarkText from "@/components/RemarkText";

export type ProjectReceivablePlanSnapshotProps = {
  contractAmount: number;
  taxAmount?: number | string | null;
  expectedAmountTotal: number;
  actualAmountTotal: number;
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

export default function ProjectReceivablePlanSnapshot({
  contractAmount,
  taxAmount,
  expectedAmountTotal,
  actualAmountTotal,
  legalEntityName,
  serviceContent,
  ownerName,
  hasVendorPayment,
  remark,
  remarkNeedsAttention = false,
}: ProjectReceivablePlanSnapshotProps) {
  const expectedAmount = toYuanNumber(expectedAmountTotal);
  const actualAmount = toYuanNumber(actualAmountTotal);
  const percent =
    expectedAmount > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((actualAmount / expectedAmount) * 100)),
        )
      : 0;

  return (
    <ProCard split="horizontal" bordered>
      <ProCard split="vertical">
        <StatisticCard
          style={{
            background: "var(--ant-colorFillAlter, #fafafa)",
          }}
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
            formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
          }}
        />
        <StatisticCard
          style={{ background: "var(--ant-colorFillAlter, #fafafa)" }}
          statistic={{
            title: "税费",
            icon: <BankTwoTone />,
            styles: {
              title: { fontSize: 13 },
              content: {
                fontSize: 18,
                fontWeight: 600,
              },
            },
            value:
              taxAmount === null || taxAmount === undefined
                ? "-"
                : toYuanNumber(taxAmount).toLocaleString("zh-CN"),
            suffix: "元",
          }}
        />
        <StatisticCard
          style={{ background: "var(--ant-colorFillAlter, #fafafa)" }}
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
            formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
          }}
        />
        <StatisticCard
          style={{ background: "var(--ant-colorFillAlter, #fafafa)" }}
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
            formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
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
