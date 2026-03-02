"use client";

import { Table, Descriptions } from "antd";
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
};

type Props = {
  contacts: ClientContact[];
  loading?: boolean;
  onEdit: (record: ClientContact) => void;
  onDelete: (id: string) => void;
};

const ClientContactTable = ({ contacts, loading, onEdit, onDelete }: Props) => {
  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      width: 160,
      filters: Array.from(new Set(contacts.map((c) => c.name))).map((name) => ({
        text: name,
        value: name,
      })),
      filterSearch: true,
      onFilter: (value: string | number | boolean, record: ClientContact) =>
        record.name.includes(value as string),
    },
    {
      title: "职位",
      dataIndex: "title",
      width: 160,
      filters: Array.from(
        new Set(contacts.map((c) => c.title).filter(Boolean)),
      ).map((title) => ({
        text: title as string,
        value: title,
      })),
      filterSearch: true,
      onFilter: (value: string | number | boolean, record: ClientContact) =>
        record.title === value,
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
      width: 300,
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
      pagination={false}
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
