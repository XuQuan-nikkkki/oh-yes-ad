// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DragSortTable, ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import TableActions from "./TableActions";
import AppLink from "@/components/AppLink";

type ClientContact = {
  id: string;
  name: string;
  order?: number;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  client?: {
    id: string;
    name: string;
  };
};

type ColumnKey =
  | "name"
  | "client"
  | "title"
  | "scope"
  | "preference"
  | "phone"
  | "email"
  | "wechat"
  | "address"
  | "actions";

type Props = {
  contacts: ClientContact[];
  loading?: boolean;
  onEdit?: (record: ClientContact) => void;
  onDelete: (id: string) => void;
  actionsDisabled?: boolean;
  actionDeleteText?: string;
  actionDeleteTitle?: string;
  columnKeys?: ColumnKey[];
  defaultVisibleColumnKeys?: ColumnKey[];
  pagination?: boolean;
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
  enableColumnSetting?: boolean;
  columnsStatePersistenceKey?: string;
  enableDragSort?: boolean;
  onDragSortEnd?: (
    beforeIndex: number,
    afterIndex: number,
    newDataSource: ClientContact[],
  ) => Promise<void> | void;
};

const ClientContactTable = ({
  contacts,
  loading,
  onEdit,
  onDelete,
  actionsDisabled = false,
  actionDeleteText = "删除",
  actionDeleteTitle = "确定删除该人员？",
  columnKeys = [
    "name",
    "client",
    "title",
    "scope",
    "preference",
    "phone",
    "email",
    "wechat",
    "address",
    "actions",
  ],
  defaultVisibleColumnKeys,
  pagination = true,
  headerTitle,
  toolbarActions = [],
  enableColumnSetting = false,
  columnsStatePersistenceKey,
  enableDragSort = false,
  onDragSortEnd,
}: Props) => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const currentForRender = useMemo(() => {
    if (!pagination) return 1;
    const totalPages = Math.max(1, Math.ceil(contacts.length / pageSize));
    return Math.min(current, totalPages);
  }, [pagination, contacts.length, current, pageSize]);

  const clientFilters = Array.from(
    new Map(
      contacts
        .filter((c) => c.client)
        .map((c) => [c.client!.id, c.client!.name]),
    ).entries(),
  ).map(([id, name]) => ({
    text: name,
    value: id,
  }));

  const allColumns: Record<ColumnKey, ProColumns<ClientContact>> = {
    name: {
      key: "name",
      title: "姓名",
      dataIndex: "name",
      filters: Array.from(new Set(contacts.map((c) => c.name))).map((name) => ({
        text: name,
        value: name,
      })),
      filterSearch: true,
      onFilter: (value, record) =>
        record.name.includes(String(value)),
      sorter: (a: ClientContact, b: ClientContact) =>
        a.name.localeCompare(b.name),
      render: (_dom, record) => (
        <AppLink href={`/client-contacts/${record.id}`}>{record.name}</AppLink>
      ),
    },
    client: {
      key: "client",
      title: "客户",
      dataIndex: ["client", "name"],
      filters: clientFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        record.client?.id === value,
      sorter: (a: ClientContact, b: ClientContact) =>
        (a.client?.name ?? "").localeCompare(b.client?.name ?? ""),
      render: (_: unknown, record: ClientContact) =>
        record.client ? (
          <AppLink
            href={`/clients/${record.client.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {record.client.name}
          </AppLink>
        ) : (
          "-"
        ),
    },
    title: {
      key: "title",
      title: "职位",
      dataIndex: "title",
      filters: Array.from(
        new Set(contacts.map((c) => c.title).filter((title) => Boolean(title))),
      ).map((title) => ({
        text: title as string,
        value: title as string,
      })),
      onFilter: (value, record) =>
        record.title === value,
      render: (_dom, record) => record.title ?? "-",
    },
    scope: {
      key: "scope",
      title: "职责范围",
      dataIndex: "scope",
      render: (_dom, record) => record.scope ?? "-",
    },
    preference: {
      key: "preference",
      title: "偏好",
      dataIndex: "preference",
      render: (_dom, record) => record.preference ?? "-",
    },
    phone: {
      key: "phone",
      title: "电话",
      dataIndex: "phone",
      render: (_dom, record) => record.phone ?? "-",
    },
    email: {
      key: "email",
      title: "邮箱",
      dataIndex: "email",
      render: (_dom, record) => record.email ?? "-",
    },
    wechat: {
      key: "wechat",
      title: "微信",
      dataIndex: "wechat",
      render: (_dom, record) => record.wechat ?? "-",
    },
    address: {
      key: "address",
      title: "地址",
      dataIndex: "address",
      render: (_dom, record) => record.address ?? "-",
    },
    actions: {
      key: "actions",
      title: "操作",
      hideInSetting: true,
      render: (_: unknown, record: ClientContact) => (
        <TableActions
          onEdit={onEdit ? () => onEdit(record) : undefined}
          onDelete={() => onDelete(record.id)}
          editDisabled={actionsDisabled}
          deleteDisabled={actionsDisabled}
          deleteTitle={actionDeleteTitle}
          deleteText={actionDeleteText}
        />
      ),
    },
  };

  const columns: ProColumns<ClientContact>[] = columnKeys.map(
    (key) => allColumns[key],
  );
  const allowColumnSetting = enableColumnSetting && !enableDragSort;
  const visibleColumnKeys = defaultVisibleColumnKeys ?? columnKeys;
  const columnsStateDefaultValue = Object.fromEntries(
    columnKeys.map((key) => [key, { show: visibleColumnKeys.includes(key) }]),
  );

  const commonProps = {
    rowKey: "id" as const,
    columns,
    loading,
    search: false as const,
    headerTitle,
    options: {
      reload: false,
      density: false,
      fullScreen: false,
      setting: allowColumnSetting
        ? {
            draggable: true,
          }
        : false,
    },
    columnsState: allowColumnSetting
      ? {
          defaultValue: columnsStateDefaultValue,
          persistenceKey: columnsStatePersistenceKey,
          persistenceType: "localStorage" as const,
        }
      : undefined,
    pagination: pagination
      ? {
          current: currentForRender,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (total: number) => `共 ${total} 条`,
          onChange: (nextPage: number, nextPageSize: number) => {
            setCurrent(nextPage);
            setPageSize(nextPageSize);
          },
        }
      : false,
    tableLayout: "auto" as const,
    scroll: { x: "max-content" as const },
    toolBarRender: () => toolbarActions,
  };

  if (enableDragSort && !pagination) {
    return (
      <DragSortTable<ClientContact>
        {...commonProps}
        dataSource={contacts}
        dragSortKey="name"
        onDragSortEnd={onDragSortEnd}
      />
    );
  }

  return (
    <ProTable<ClientContact>
      {...commonProps}
      dataSource={contacts}
    />
  );
};

export default ClientContactTable;
