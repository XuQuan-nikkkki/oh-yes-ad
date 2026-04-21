"use client";

import { useMemo } from "react";
import { Button, Table } from "antd";
import type { ReceivableEntryDraft, ReceivableNodeDraft } from "./types";

type Props = {
  entries: ReceivableEntryDraft[];
  onProcess: (entry: ReceivableEntryDraft) => void;
};

export default function ReceivableTable({ entries, onProcess }: Props) {
  const nodeColumns = useMemo(
    () => [
      { title: "收款阶段", dataIndex: "stageName", key: "stageName", width: 140 },
      {
        title: "收款关键交付物",
        dataIndex: "keyDeliverable",
        key: "keyDeliverable",
        width: 240,
      },
      {
        title: "预收金额（含税）",
        dataIndex: "expectedAmountTaxIncluded",
        key: "expectedAmountTaxIncluded",
        width: 180,
        render: (value: number | null) =>
          value === null ? "-" : `¥${value.toLocaleString("zh-CN")}`,
      },
      { title: "预收日期", dataIndex: "expectedDate", key: "expectedDate", width: 140 },
      {
        title: "实收金额（含税）",
        dataIndex: "actualAmountTaxIncluded",
        key: "actualAmountTaxIncluded",
        width: 180,
        render: (value: number | null) =>
          value === null ? "-" : `¥${value.toLocaleString("zh-CN")}`,
      },
      { title: "实收日期", dataIndex: "actualDate", key: "actualDate", width: 140 },
      { title: "备注", dataIndex: "remark", key: "remark", width: 220 },
    ],
    [],
  );

  const columns = useMemo(
    () => [
      {
        title: "签约公司",
        dataIndex: "contractCompany",
        key: "contractCompany",
        width: 160,
      },
      { title: "品牌名", dataIndex: "brandName", key: "brandName", width: 160 },
      {
        title: "服务内容",
        dataIndex: "serviceContent",
        key: "serviceContent",
        width: 220,
      },
      {
        title: "合同金额（含税）",
        dataIndex: "contractAmountTaxIncluded",
        key: "contractAmountTaxIncluded",
        width: 180,
        render: (value: number | null) =>
          value === null ? "-" : `¥${value.toLocaleString("zh-CN")}`,
      },
      {
        title: "操作",
        key: "action",
        width: 140,
        render: (_value: unknown, record: ReceivableEntryDraft) => (
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
          <Table<ReceivableNodeDraft>
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
