"use client";

import { Table, Descriptions } from "antd";
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
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "偏好",
      dataIndex: "preference",
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "操作",
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
      expandable={{
        expandRowByClick: true,
        expandedRowRender: (record: ClientContact) => (
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="电话">
              {record.phone ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {record.email ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="微信">
              {record.wechat ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="地址" span={3}>
              {record.address ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        ),
      }}
    />
  );
};

export default ClientContactTable;
