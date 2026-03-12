"use client";

import { useEffect, useState } from "react";
import { Table, Button, Card, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import VendorFormModal from "@/components/VendorFormModal";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";

type Vendor = {
  id: string;
  name: string;
  vendorType?: string | null;
  businessType?: string | null;
  services?: string[];
  cooperationStatus?: string | null;
  rating?: string | null;
  isBlacklisted?: boolean;
  contactName?: string | null;
  notes?: string | null;
};

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const vendorTypeOptions = Array.from(
    new Set(vendors.map((v) => v.vendorType).filter(Boolean) as string[])
  );
  const businessTypeOptions = Array.from(
    new Set(vendors.map((v) => (v as any).businessType).filter(Boolean) as string[])
  );
  const servicesOptions = Array.from(
    new Set(
      vendors
        .flatMap((v) => (v as any).services || [])
        .filter(Boolean) as string[]
    )
  );
  const cooperationStatusOptions = Array.from(
    new Set(vendors.map((v) => (v as any).cooperationStatus).filter(Boolean) as string[])
  );
  const ratingOptions = Array.from(
    new Set(vendors.map((v) => (v as any).rating).filter(Boolean) as string[])
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

  const handleTableChange = (newPagination: any) => {
    setCurrent(newPagination.current);
    setPageSize(newPagination.pageSize);
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      ellipsis: true,
      filters: vendors.map((v) => ({
        text: v.name,
        value: v.name,
      })),
      filterSearch: true,
      onFilter: (value, record: Vendor) => record.name.includes(value as string),
      render: (value: string, record: Vendor) => (
        <AppLink href={`/vendors/${record.id}`}>
          {value}
        </AppLink>
      ),
    },
    {
      title: "供应商类型",
      dataIndex: "vendorType",
      filters: vendorTypeOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record: Vendor) => record.vendorType === value,
      render: (value: string | null) =>
        value ? <Tag>{value}</Tag> : "-",
    },
    {
      title: "业务类型",
      dataIndex: "businessType",
      width: 120,
      filters: businessTypeOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record: any) => record.businessType === value,
      render: (value: string | null) =>
        value ? <Tag>{value}</Tag> : "-",
    },
    {
      title: "服务范围",
      dataIndex: "services",
      filters: servicesOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record: any) =>
        record.services && record.services.includes(value as string),
      render: (value: string[] | null) =>
        value && value.length > 0
          ? value.map((service) => <Tag key={service}>{service}</Tag>)
          : "-",
    },
    {
      title: "合作状态",
      dataIndex: "cooperationStatus",
      filters: cooperationStatusOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record: any) => record.cooperationStatus === value,
      render: (value: string | null) =>
        value ? <Tag>{value}</Tag> : "-",
    },
    {
      title: "综合评级",
      dataIndex: "rating",
      width: 200,
      filters: [
        { text: "S", value: "S" },
        { text: "A", value: "A" },
        { text: "B", value: "B" },
        { text: "C", value: "C" },
        { text: "未知", value: "未知" },
      ],
      onFilter: (value, record: any) => record.rating === value,
      render: (value: string | null) =>
        value ? <Tag color="orange">{value}</Tag> : "-",
    },
    {
      title: "黑名单",
      width: 100,
      dataIndex: "isBlacklisted",
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      onFilter: (value, record: any) => record.isBlacklisted === value,
      render: (value: boolean) =>
        value ? <Tag color="red">是</Tag> : <Tag color="green">否</Tag>,
    },
    {
      title: "操作",
      width: 200,
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
        pagination={{ current, pageSize, total: vendors.length }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
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
        businessTypeOptions={businessTypeOptions}
        servicesOptions={servicesOptions}
        cooperationStatusOptions={cooperationStatusOptions}
        ratingOptions={ratingOptions}
      />
    </Card>
  );
};

export default VendorsPage;
