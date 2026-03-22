"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { useFetch } from "@/hooks/useFetch";

type LegalEntity = {
  id: string;
  name: string;
  fullName?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    employees?: number;
    bankAccounts?: number;
  };
};

const columns: ColumnsType<LegalEntity> = [
  {
    title: "名称",
    dataIndex: "name",
    render: (value: string, record) => <AppLink href={`/legal-entities/${record.id}`}>{value}</AppLink>,
  },
  {
    title: "全称",
    dataIndex: "fullName",
    render: (value?: string | null) => value || "-",
  },
  {
    title: "税号",
    dataIndex: "taxNumber",
    render: (value?: string | null) => value || "-",
  },
  {
    title: "地址",
    dataIndex: "address",
    render: (value?: string | null) => value || "-",
  },
  {
    title: "成员数",
    dataIndex: "_count",
    render: (value?: { employees?: number }) => value?.employees ?? 0,
  },
  {
    title: "账户数",
    dataIndex: "_count",
    render: (value?: { bankAccounts?: number }) => value?.bankAccounts ?? 0,
  },
  {
    title: "状态",
    dataIndex: "isActive",
    render: (value: boolean) => (
      <Tag color={value ? "green" : "default"}>{value ? "启用" : "停用"}</Tag>
    ),
  },
  {
    title: "创建时间",
    dataIndex: "createdAt",
    render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
  },
];

const LegalEntitiesPage = () => {
  const { data, loading } = useFetch<LegalEntity>("/api/legal-entities");

  return (
    <ListPageContainer>
      <Table
        rowKey="id"
        tableLayout="auto"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 20 }}
        title={() => <ProTableHeaderTitle>公司主体</ProTableHeaderTitle>}
      />
    </ListPageContainer>
  );
};

export default LegalEntitiesPage;
