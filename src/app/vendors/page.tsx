"use client";

import { useEffect, useState } from "react";
import { Table, Button, Card, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import VendorFormModal from "@/components/VendorFormModal";
import TableActions from "@/components/TableActions";

type Vendor = {
  id: string;
  name: string;
  vendorType?: string | null;
  contactName?: string | null;
  notes?: string | null;
};

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const vendorTypeOptions = Array.from(
    new Set(vendors.map((v) => v.vendorType).filter(Boolean) as string[])
  );

  const fetchVendors = async () => {
    setLoading(true);
    const res = await fetch("/api/vendors");
    const data = await res.json();
    setVendors(data);
    setLoading(false);
  };

  useEffect(() => {
    const loadVendors = async () => {
      await fetchVendors();
    };
    loadVendors();
  }, []);

  const handleDelete = async (id: string) => {
    await fetch("/api/vendors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchVendors();
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      width: 160,
      ellipsis: true,
      filters: vendors.map((v) => ({
        text: v.name,
        value: v.name,
      })),
      filterSearch: true,
      onFilter: (value, record: Vendor) => record.name.includes(value as string),
      sorter: (a: Vendor, b: Vendor) => a.name.localeCompare(b.name),
      render: (value: string) => value,
    },
    {
      title: "类型",
      dataIndex: "vendorType",
      filters: vendorTypeOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record: Vendor) => record.vendorType === value,
      sorter: (a: Vendor, b: Vendor) =>
        (a.vendorType || "").localeCompare(b.vendorType || ""),
      render: (value: string | null) =>
        value ? (
          <Tag
            style={{
              borderRadius: 6,
              padding: "2px 10px",
              fontWeight: 500,
            }}
          >
            {value}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "联系人",
      dataIndex: "contactName",
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "备注",
      dataIndex: "notes",
      ellipsis: true,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "操作",
      width: 160,
      render: (_: unknown, record: Vendor) => (
        <TableActions
          onEdit={() => {
            setEditingVendor(record);
            setOpen(true);
          }}
          onDelete={() => handleDelete(record.id)}
          deleteTitle="确定删除这个供应商？"
        />
      ),
    },
  ];

  return (
    <Card
      title={<h3>供应商管理</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingVendor(null);
            setOpen(true);
          }}
        >
          新建供应商
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={vendors}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      <VendorFormModal
        open={open}
        initialValues={editingVendor}
        onCancel={() => {
          setOpen(false);
          setEditingVendor(null);
        }}
        onSuccess={async () => {
          setOpen(false);
          setEditingVendor(null);
          await fetchVendors();
        }}
        vendorTypeOptions={vendorTypeOptions}
      />
    </Card>
  );
};

export default VendorsPage;
