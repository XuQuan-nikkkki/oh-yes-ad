"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Space,
  Descriptions,
  Button,
  Tag,
  Popconfirm,
  message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import VendorFormModal from "@/components/VendorFormModal";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import SelectOptionTag from "@/components/SelectOptionTag";
import ProjectsTable, {
  Project as ProjectRow,
} from "@/components/ProjectsTable";
import { useCrmPermission } from "@/hooks/useCrmPermission";

type Vendor = {
  id: string;
  name: string;
  fullName?: string | null;
  vendorTypeOptionId?: string | null;
  businessTypeOptionIds?: string[];
  businessTypeOptionId?: string | null;
  cooperationStatusOptionId?: string | null;
  ratingOptionId?: string | null;
  serviceOptionIds?: string[];
  vendorTypeOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  businessTypeOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  businessTypeOptions?: Array<{
    id: string;
    value: string;
    color?: string | null;
  }>;
  cooperationStatusOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  ratingOption?: { id: string; value: string; color?: string | null } | null;
  serviceOptions?: Array<{ id: string; value: string; color?: string | null }>;
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
  lastCoopDate?: string | null;
  cooperatedProjects?: string | null;
  milestones?: {
    id: string;
    name: string;
  }[];
};

const EMPTY_OPTIONS: {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt: string;
}[] = [];

const VendorDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vendorProjects, setVendorProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageCrm } = useCrmPermission();
  const vendorTypeOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.vendorType"] ?? EMPTY_OPTIONS,
  );
  const businessTypeOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.businessType"] ?? EMPTY_OPTIONS,
  );
  const servicesOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.services"] ?? EMPTY_OPTIONS,
  );
  const cooperationStatusOptions = useSelectOptionsStore(
    (state) =>
      state.optionsByField["vendor.cooperationStatus"] ?? EMPTY_OPTIONS,
  );
  const ratingOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.rating"] ?? EMPTY_OPTIONS,
  );

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

  const fetchVendorProjects = useCallback(async () => {
    if (!vendorId) return;
    setProjectsLoading(true);
    try {
      const res = await fetch(`/api/projects?vendorId=${vendorId}`);
      const data = await res.json();
      setVendorProjects(Array.isArray(data) ? data : []);
    } finally {
      setProjectsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;
    void Promise.all([fetchVendor(), fetchVendorProjects()]);
  }, [vendorId, fetchVendor, fetchVendorProjects]);

  const handleDelete = async () => {
    if (!vendorId) return;
    if (!canManageCrm) return;
    setDeleting(true);
    const res = await fetch("/api/vendors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: vendorId }),
    });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    messageApi.success("删除成功");
    router.push("/vendors");
  };

  return (
    <>
      {contextHolder}
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Card
          title={
            vendor
              ? vendor.name +
                (vendor.fullName ? ` （全名：${vendor.fullName}）` : "")
              : "供应商详情"
          }
          loading={loading}
          extra={
            vendor ? (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setOpen(true)}
                  disabled={!canManageCrm}
                >
                  编辑
                </Button>
                <Popconfirm
                  title={`确定删除供应商「${vendor.name}」？`}
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => void handleDelete()}
                  okButtonProps={{ danger: true, loading: deleting }}
                >
                  <Button danger loading={deleting} disabled={!canManageCrm}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ) : null
          }
        >
          {vendor ? (
            <Descriptions column={3} size="small">
              <Descriptions.Item label="供应商类型">
                {vendor.vendorTypeOption ? (
                  <SelectOptionTag option={vendor.vendorTypeOption} />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="业务类型">
                {vendor.businessTypeOptions &&
                vendor.businessTypeOptions.length > 0 ? (
                  <Space size={4} wrap>
                    {vendor.businessTypeOptions.map((item) => (
                      <SelectOptionTag key={item.id} option={item} />
                    ))}
                  </Space>
                ) : vendor.businessTypeOption ? (
                  <SelectOptionTag option={vendor.businessTypeOption} />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="服务范围">
                {vendor.serviceOptions && vendor.serviceOptions.length > 0 ? (
                  <Space size={4} wrap>
                    {vendor.serviceOptions.map((service) => (
                      <SelectOptionTag key={service.id} option={service} />
                    ))}
                  </Space>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="核心特色/擅长领域">
                {vendor.strengths || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="公司简介">
                {vendor.companyIntro || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="代表作品">
                {vendor.portfolioLink ? (
                  <a
                    href={vendor.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "underline", color: "gray" }}
                  >
                    {vendor.portfolioLink}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>

        <Card loading={loading} title="合作情况">
          {vendor ? (
            <Descriptions column={2} size="small">
              {vendor.lastCoopDate ? (
                <Descriptions.Item label="最近合作时间">
                  {vendor.lastCoopDate}
                </Descriptions.Item>
              ) : null}
              {vendor.cooperatedProjects ? (
                <Descriptions.Item label="往期合作项目">
                  {vendor.cooperatedProjects}
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="参考价区间">
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {vendor.priceRange || "-"}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="关键备注">
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {vendor.notes || "-"}
                </div>
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
        <Card loading={loading} title="合作评价">
          {vendor ? (
            <Descriptions column={3} size="small">
              <Descriptions.Item label="合作状态">
                {vendor.cooperationStatusOption ? (
                  <SelectOptionTag option={vendor.cooperationStatusOption} />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="综合评级">
                {vendor.ratingOption ? (
                  <SelectOptionTag option={vendor.ratingOption} />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="黑名单">
                {vendor.isBlacklisted ? (
                  <Tag color="red">是</Tag>
                ) : (
                  <Tag color="green">否</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
        <Card loading={loading} title="联系方式">
          {vendor ? (
            <Descriptions column={3} size="small">
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
          ) : null}
        </Card>
        <Card loading={loading} styles={{ body: { padding: 2 } }}>
          {vendor ? (
            <ProjectsTable
              headerTitle={<h4 style={{ margin: 0 }}>合作项目</h4>}
              projects={vendorProjects}
              loading={projectsLoading}
              columnKeys={["name", "type", "status", "startDate", "endDate"]}
            />
          ) : null}
        </Card>
      </Space>

      <VendorFormModal
        open={open}
        onCancel={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          void Promise.all([fetchVendor(), fetchVendorProjects()]);
        }}
        initialValues={vendor}
        vendorTypeOptions={vendorTypeOptions}
        businessTypeOptions={businessTypeOptions}
        servicesOptions={servicesOptions}
        cooperationStatusOptions={cooperationStatusOptions}
        ratingOptions={ratingOptions}
      />
    </>
  );
};

export default VendorDetailPage;
