"use client";

import { useMemo } from "react";
import { Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PayableEntryDraft, PayableNodeDraft } from "./types";

type Props = {
  entries: PayableEntryDraft[];
  onProcess: (entry: PayableEntryDraft) => void;
};

export default function PayableTable({ entries, onProcess }: Props) {
  const nodeColumns = useMemo<ColumnsType<PayableNodeDraft>>(
    () => [
      { title: "付款阶段", dataIndex: "stageName", key: "stageName", width: 140 },
      {
        title: "付款节点",
        dataIndex: "paymentCondition",
        key: "paymentCondition",
        width: 220,
      },
      {
        title: "预付金额（含税）",
        dataIndex: "expectedAmountTaxIncluded",
        key: "expectedAmountTaxIncluded",
        width: 180,
        render: (value: number | null) =>
          value === null ? "-" : `¥${value.toLocaleString("zh-CN")}`,
      },
      { title: "预付日期", dataIndex: "expectedDate", key: "expectedDate", width: 140 },
      {
        title: "实付金额（含税）",
        dataIndex: "actualAmountTaxIncluded",
        key: "actualAmountTaxIncluded",
        width: 180,
        render: (value: number | null) =>
          value === null ? "-" : `¥${value.toLocaleString("zh-CN")}`,
      },
      { title: "实付日期", dataIndex: "actualDate", key: "actualDate", width: 140 },
      { title: "备注", dataIndex: "remark", key: "remark", width: 220 },
    ],
    [],
  );

  const columns = useMemo<ColumnsType<PayableEntryDraft>>(
    () => [
      {
        title: "签约公司",
        dataIndex: "contractCompany",
        key: "contractCompany",
        width: 140,
      },
      {
        title: "品牌名",
        dataIndex: "brandName",
        key: "brandName",
        width: 140,
      },
      {
        title: "服务内容",
        dataIndex: "serviceContent",
        key: "serviceContent",
        width: 220,
      },
      {
        title: "供应商",
        dataIndex: "supplierName",
        key: "supplierName",
        width: 160,
      },
      {
        title: "合同金额",
        dataIndex: "contractAmount",
        key: "contractAmount",
        width: 140,
        render: (value: number | null) =>
          value === null ? "-" : `¥${value.toLocaleString("zh-CN")}`,
      },
      {
        title: "操作",
        key: "action",
        width: 140,
        fixed: "right",
        render: (_value: unknown, record: PayableEntryDraft) => (
          <Button
            type="link"
            style={{ paddingInline: 0 }}
            onClick={() => onProcess(record)}
          >
            开始处理
          </Button>
        ),
      },
    ],
    [onProcess],
  );

  return (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={entries}
      size="small"
      scroll={{ x: "max-content" }}
      pagination={{ defaultPageSize: 20, showSizeChanger: true }}
      expandable={{
        rowExpandable: (record) =>
          Array.isArray(record.nodes) && record.nodes.length > 0,
        expandedRowRender: (record) => (
          <Table<PayableNodeDraft>
            rowKey="key"
            columns={nodeColumns}
            dataSource={record.nodes}
            pagination={false}
            size="small"
          />
        ),
      }}
    />
  );
}
