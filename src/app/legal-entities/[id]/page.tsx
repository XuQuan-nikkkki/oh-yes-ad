"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Descriptions, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useParams } from "next/navigation";

type BankAccount = {
  id: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  isActive: boolean;
  createdAt: string;
};

type LegalEntityDetail = {
  id: string;
  name: string;
  fullName?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    employees?: number;
  };
  bankAccounts?: BankAccount[];
};

const LegalEntityDetailPage = () => {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LegalEntityDetail | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/legal-entities/${id}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const result = await res.json();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title={data?.name || "公司主体详情"} loading={loading}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="名称">{data?.name ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="全称">{data?.fullName ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {data ? <Tag color={data.isActive ? "green" : "default"}>{data.isActive ? "启用" : "停用"}</Tag> : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="税号">{data?.taxNumber ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="地址">{data?.address ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="成员数">{data?._count?.employees ?? 0}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {data?.createdAt ? dayjs(data.createdAt).format("YYYY-MM-DD HH:mm") : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="银行账户" styles={{ body: { padding: 12 } }}>
        <Table
          rowKey="id"
          tableLayout="auto"
          loading={loading}
          dataSource={data?.bankAccounts ?? []}
          pagination={false}
          columns={[
            { title: "开户银行", dataIndex: "bankName" },
            { title: "开户支行", dataIndex: "bankBranch" },
            { title: "银行卡号", dataIndex: "accountNumber" },
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
          ]}
        />
      </Card>
    </Space>
  );
};

export default LegalEntityDetailPage;
