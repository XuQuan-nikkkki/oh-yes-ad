"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Space, Descriptions, Button, Tag, Table, Popover } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import Link from "next/link";
import VendorFormModal from "@/components/VendorFormModal";

type Vendor = {
  id: string;
  name: string;
  fullName?: string | null;
  vendorType?: string | null;
  businessType?: string | null;
  services?: string[];
  location?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  strengths?: string | null;
  notes?: string | null;
  companyIntro?: string | null;
  portfolioLink?: string | null;
  priceRange?: string | null;
  isBlacklisted: boolean;
  cooperationStatus?: string | null;
  rating?: string | null;
  lastCoopDate?: string | null;
  cooperatedProjects?: string | null;
  projects?: {
    id: string;
    name: string;
    type: string;
  }[];
  milestones?: {
    id: string;
    name: string;
  }[];
};

type Project = {
  id: string;
  name: string;
  type: string;
};


const VendorDetailPage = () => {
  const params = useParams();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchVendor = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}`);
      const data = await res.json();
      setVendor(data);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  const fetchAllVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    }
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    fetchVendor();
    fetchAllVendors();
  }, [vendorId, fetchVendor, fetchAllVendors]);

  const vendorTypeOptions = Array.from(
    new Set(vendors.map((v) => v.vendorType).filter(Boolean) as string[])
  );
  const businessTypeOptions = Array.from(
    new Set(
      vendors.map((v) => (v as any).businessType).filter(Boolean) as string[]
    )
  );
  const servicesOptions = Array.from(
    new Set(
      vendors
        .flatMap((v) => (v as any).services || [])
        .filter(Boolean) as string[]
    )
  );
  const cooperationStatusOptions = Array.from(
    new Set(
      vendors.map((v) => (v as any).cooperationStatus).filter(Boolean) as string[]
    )
  );
  const ratingOptions = Array.from(
    new Set(vendors.map((v) => (v as any).rating).filter(Boolean) as string[])
  );

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      {vendor && (
        <>
          {/* 1. 基础信息 */}
          <Card
            title="基础信息"
            loading={loading}
            extra={
              <Button icon={<EditOutlined />} onClick={() => setOpen(true)}>
                编辑
              </Button>
            }
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="供应商名称">
                {vendor.name}
              </Descriptions.Item>
              <Descriptions.Item label="全称">
                {vendor.fullName || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 2. 公司情况 */}
          <Card title="公司情况">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="供应商类型">
                {vendor.vendorType ? <Tag>{vendor.vendorType}</Tag> : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="业务类型">
                {vendor.businessType ? <Tag>{vendor.businessType}</Tag> : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="服务范围">
                {vendor.services && vendor.services.length > 0
                  ? vendor.services.map((service) => (
                      <Tag key={service} style={{ marginRight: "4px" }}>
                        {service}
                      </Tag>
                    ))
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="核心特色/擅长领域">
                {vendor.strengths || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="公司简介" span={2}>
                {vendor.companyIntro || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="代表作品">
                {vendor.portfolioLink ? (
                  <a
                    href={vendor.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {vendor.portfolioLink}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 3. 联系方式 */}
          <Card title="联系方式">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="所在地">
                {vendor.location || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="联系人">
                {vendor.contactName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="联系人微信">
                {vendor.wechat || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="联系人电话">
                {vendor.phone || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {vendor.email || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 4. 合作情况 */}
          <Card title="合作情况">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="参考价区间">
                {vendor.priceRange || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="关键备注">
                {vendor.notes || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="最近合作时间">
                {vendor.lastCoopDate ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="往期合作项目">
                {vendor.cooperatedProjects || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 5. 合作评价 */}
          <Card title="合作评价">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="合作状态">
                {vendor.cooperationStatus ? (
                  <Tag>{vendor.cooperationStatus}</Tag>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="综合评级">
                {vendor.rating ? <Tag>{vendor.rating}</Tag> : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="黑名单">
                {vendor.isBlacklisted ? (
                  <Tag color="red">是</Tag>
                ) : (
                  <Tag color="green">否</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      )}

      {/* 编辑供应商Modal */}
      <VendorFormModal
        open={open}
        onCancel={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          fetchVendor();
        }}
        initialValues={vendor}
        vendorTypeOptions={vendorTypeOptions}
        businessTypeOptions={businessTypeOptions}
        servicesOptions={servicesOptions}
        cooperationStatusOptions={cooperationStatusOptions}
        ratingOptions={ratingOptions}
      />
    </Space>
  );
};

export default VendorDetailPage;
