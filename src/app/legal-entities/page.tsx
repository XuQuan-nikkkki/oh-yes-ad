"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import TableActions from "@/components/TableActions";
import LegalEntityFormModal from "@/components/LegalEntityFormModal";
import { useCrmPermission } from "@/hooks/useCrmPermission";

type LegalEntity = {
  id: string;
  name: string;
  fullName?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  isActive: boolean;
};

const LegalEntitiesPage = () => {
  const [rows, setRows] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LegalEntity | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageCrm } = useCrmPermission();

  const fetchLegalEntities = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/legal-entities", { cache: "no-store" });
      if (!res.ok) throw new Error("获取公司主体失败");
      const data = (await res.json()) as LegalEntity[];
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("获取公司主体失败", error);
      setRows([]);
      messageApi.error("获取公司主体失败");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void fetchLegalEntities();
  }, [fetchLegalEntities]);

  const handleDelete = useCallback(async (id: string) => {
    if (!canManageCrm) return;
    const res = await fetch(`/api/legal-entities/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      messageApi.error("删除公司主体失败");
      return;
    }
    messageApi.success("删除公司主体成功");
    await fetchLegalEntities(false);
  }, [canManageCrm, fetchLegalEntities, messageApi]);

  const columns: ColumnsType<LegalEntity> = [
    {
      title: "名称",
      dataIndex: "name",
      render: (value: string, record) => (
        <AppLink href={`/legal-entities/${record.id}`}>{value}</AppLink>
      ),
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
      title: "状态",
      dataIndex: "isActive",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "red"}>{value ? "启用" : "停用"}</Tag>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_value, record) => (
        <TableActions
          disabled={!canManageCrm}
          onEdit={() => {
            setEditingRecord(record);
            setModalOpen(true);
          }}
          onDelete={() => {
            void handleDelete(record.id);
          }}
          deleteTitle="确定删除该公司主体？"
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Card
        title={<ProTableHeaderTitle>公司主体</ProTableHeaderTitle>}
        styles={{ body: { padding: "12px 24px" } }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManageCrm}
            onClick={() => {
              setEditingRecord(null);
              setModalOpen(true);
            }}
          >
            新增公司主体
          </Button>
        }
      >
        <Table
          rowKey="id"
          tableLayout="auto"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <LegalEntityFormModal
        open={modalOpen}
        initialValues={editingRecord}
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={async () => {
          setModalOpen(false);
          setEditingRecord(null);
          messageApi.success(editingRecord ? "公司主体已更新" : "公司主体已创建");
          await fetchLegalEntities(false);
        }}
      />
    </>
  );
};

export default LegalEntitiesPage;
