"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";

export type Client = {
  id: string;
  name: string;
  industryOptionId: string;
  industryOption?: {
    id: string;
    field: string;
    value: string;
    color?: string | null;
    order?: number | null;
  } | null;
};

type Props = {
  clients: Client[];
  loading?: boolean;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  actionsDisabled?: boolean;
  onIndustryOptionUpdated?: () => void | Promise<void>;
  columnKeys?: ColumnKey[];
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
};

export type ColumnKey = "name" | "industry" | "actions";

const ClientTable = ({
  clients,
  loading = false,
  onEdit,
  onDelete,
  actionsDisabled = false,
  onIndustryOptionUpdated,
  columnKeys = ["name", "industry", "actions"],
  headerTitle,
  toolbarActions = [],
}: Props) => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const industryOptions = Array.from(
    new Set(clients.map((c) => c.industryOption?.value).filter(Boolean)),
  ) as string[];

  const allColumns: Record<ColumnKey, ProColumns<Client>> = {
    name: {
      title: "名称",
      dataIndex: "name",
      filters: clients.map((c) => ({
        text: c.name,
        value: c.name,
      })),
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(String(value)),
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_dom, record) => (
        <AppLink href={`/clients/${record.id}`}>{record.name}</AppLink>
      ),
    },
    industry: {
      title: "行业",
      dataIndex: ["industryOption", "value"],
      filters: industryOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record) =>
        (record.industryOption?.value ?? "-") === value,
      sorter: (a, b) =>
        (a.industryOption?.value ?? "").localeCompare(
          b.industryOption?.value ?? "",
        ),
      render: (_dom, record) => (
        <SelectOptionQuickEditTag
          field="client.industry"
          option={record.industryOption}
          fallbackText="-"
          disabled={actionsDisabled}
          modalTitle="修改行业"
          optionValueLabel="行业名称"
          saveSuccessText="行业标签已更新"
          onUpdated={onIndustryOptionUpdated}
        />
      ),
    },
    actions: {
      title: "操作",
      hideInSetting: true,
      render: (_value, record) => (
        <TableActions
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record.id)}
          disabled={actionsDisabled}
          deleteTitle="确定删除这个客户？"
        />
      ),
    },
  };
  const columns: ProColumns<Client>[] = columnKeys.map((key) => allColumns[key]);

  return (
    <ProTable<Client>
      rowKey="id"
      columns={columns}
      dataSource={clients}
      loading={loading}
      search={false}
      headerTitle={headerTitle}
      options={{
        reload: false,
        density: false,
        fullScreen: false,
        setting: false,
      }}
      pagination={{
        current,
        pageSize,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
        showTotal: (total) => `共 ${total} 条`,
        onChange: (nextPage, nextPageSize) => {
          setCurrent(nextPage);
          setPageSize(nextPageSize);
        },
      }}
      tableLayout="auto"
      toolBarRender={() => toolbarActions}
    />
  );
};

export default ClientTable;
