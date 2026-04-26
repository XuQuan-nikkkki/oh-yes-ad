"use client";

import { Progress } from "antd";
import {
  AccountBookTwoTone,
  BankTwoTone,
  CreditCardTwoTone,
  FileTextTwoTone,
  FlagTwoTone,
  WalletTwoTone,
} from "@ant-design/icons";
import { ProCard, StatisticCard } from "@ant-design/pro-components";
import BooleanTag from "@/components/BooleanTag";
import RemarkText from "@/components/RemarkText";

export type ProjectPayablePlanSnapshotProps = {
  vendorName?: string | null;
  contractAmount: number;
  expectedAmountTotal: number;
  actualAmountTotal: number;
  legalEntityName?: string | null;
  serviceContent?: string | null;
  ownerName?: string | null;
  hasCustomerCollection: boolean;
  remark?: string | null;
  remarkNeedsAttention?: boolean;
};

export default function ProjectPayablePlanSnapshot({
  vendorName,
  contractAmount,
  expectedAmountTotal,
  actualAmountTotal,
  legalEntityName,
  serviceContent,
  ownerName,
  hasCustomerCollection,
  remark,
  remarkNeedsAttention = false,
}: ProjectPayablePlanSnapshotProps) {
  const percent =
    expectedAmountTotal > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((actualAmountTotal / expectedAmountTotal) * 100),
          ),
        )
      : 0;

  return (
    <ProCard split="horizontal" bordered>
      <ProCard split="vertical">
        <StatisticCard
          style={{ background: "var(--ant-colorFillAlter, #fafafa)" }}
          statistic={{
            title: "供应商",
            value: String(vendorName || "-"),
            icon: <FlagTwoTone />,
            styles: {
              title: { fontSize: 13 },
              content: {
                fontSize: 18,
                fontWeight: 600,
              },
            },
          }}
        />
        <StatisticCard
          style={{ background: "var(--ant-colorFillAlter, #fafafa)" }}
          statistic={{
            title: "合同金额（含税）",
            icon: <FileTextTwoTone />,
            value: contractAmount,
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
            title: "预付金额总计",
            value: expectedAmountTotal,
            icon: <CreditCardTwoTone />,
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
            title: "实付金额总计",
            value: actualAmountTotal,
            icon: <AccountBookTwoTone />,
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
            strokeColor="#1677ff"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <span
            style={{
              color: "rgba(0,0,0,0.45)",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            实付 {Number(actualAmountTotal ?? 0).toLocaleString("zh-CN")} / 预付{" "}
            {Number(expectedAmountTotal ?? 0).toLocaleString("zh-CN")} 元
          </span>
        </div>
      </ProCard>
      <ProCard split="vertical" bordered>
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
            {legalEntityName || "-"}
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
          <div style={{ wordBreak: "break-word" }}>{ownerName || "-"}</div>
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
            有客户收款
          </div>
          <div style={{ wordBreak: "break-word" }}>
            <BooleanTag value={hasCustomerCollection} />
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
            备注
          </div>
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
