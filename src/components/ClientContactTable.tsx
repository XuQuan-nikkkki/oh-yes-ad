"use client";

import { Table } from "antd";
import Link from "next/link";
import TableActions from "./TableActions";

type ClientContact = {
  id: string;
  name: string;
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

type Props = {
  contacts: ClientContact[];
  loading?: boolean;
  onEdit: (record: ClientContact) => void;
  onDelete: (id: string) => void;
  showClientColumn?: boolean;
};

const ClientContactTable = ({
  contacts,
  loading,
  onEdit,
  onDelete,
  showClientColumn = false,
}: Props) => {
  // 客户筛选选项
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

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      width: 120,
      filters: Array.from(new Set(contacts.map((c) => c.name))).map((name) => ({
        text: name,
        value: name,
      })),
      filterSearch: true,
      onFilter: (value: any, record: ClientContact) =>
        record.name.includes(value),
      sorter: (a: ClientContact, b: ClientContact) =>
        a.name.localeCompare(b.name),
    },
    ...(showClientColumn
      ? [
          {
            title: "客户",
            dataIndex: ["client", "name"],
            width: 120,
            filters: clientFilters,
            onFilter: (value: any, record: ClientContact) =>
              record.client?.id === value,
            sorter: (a: ClientContact, b: ClientContact) =>
              (a.client?.name ?? "").localeCompare(b.client?.name ?? ""),
            render: (_: any, record: ClientContact) =>
              record.client ? (
                <Link
                  href={`/clients/${record.client.id}`}
                  style={{ color: "#1677ff" }}
                  onClick={e => e.stopPropagation()}
                >
                  {record.client.name}
                </Link>
              ) : (
                "-"
              ),
          },
        ]
      : []),
    {
      title: "职位",
      dataIndex: "title",
      width: 250,
      filters: Array.from(
        new Set(contacts.map((c) => c.title).filter(Boolean)),
      ).map((title) => ({
        text: title as string,
        value: title,
      })),
      onFilter: (value: any, record: ClientContact) => record.title === value,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "职责范围",
      dataIndex: "scope",
      width: 350,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "偏好",
      dataIndex: "preference",
      width: 100,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "电话",
      dataIndex: "phone",
      width: 130,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      width: 150,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "微信",
      dataIndex: "wechat",
      width: 120,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "地址",
      dataIndex: "address",
      width: 180,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "操作",
      width: 100,
      render: (_: any, record: ClientContact) => (
        <TableActions
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record.id)}
          deleteTitle="确定删除该人员？"
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={contacts}
      loading={loading}
      pagination={showClientColumn ? { pageSize: 10 } : false}
      scroll={{ x: 1200 }}
    />
  );
};

export default ClientContactTable;
