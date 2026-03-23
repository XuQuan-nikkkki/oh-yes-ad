"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  Space,
  Descriptions,
  Button,
  Popconfirm,
  message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import DetailPageContainer from "@/components/DetailPageContainer";
import VendorFormModal from "@/components/VendorFormModal";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import {
  VendorBooleanValue,
  VendorLinkValue,
  VendorOptionValue,
  VendorTextValue,
} from "@/components/vendor/VendorContent";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import ProjectsTable, {
  Project as ProjectRow,
} from "@/components/ProjectsTable";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import { EMPTY_SELECT_OPTIONS } from "@/types/selectOption";
import type { Vendor } from "@/types/vendor";
import { useVendorsStore } from "@/stores/vendorsStore";

const VendorDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const cachedVendor = useVendorsStore((state) => state.byId[vendorId]);
  const upsertVendors = useVendorsStore((state) => state.upsertVendors);
  const removeVendorFromStore = useVendorsStore((state) => state.removeVendor);

  const [vendor, setVendor] = useState<Vendor | null>(
    (cachedVendor as Vendor | undefined) ?? null,
  );
  const [loading, setLoading] = useState(!cachedVendor);
  const bootstrappedVendorIdRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vendorProjects, setVendorProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageCrm } = useCrmPermission();
  const vendorTypeOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.vendorType"] ?? EMPTY_SELECT_OPTIONS,
  );
  const businessTypeOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.businessType"] ?? EMPTY_SELECT_OPTIONS,
  );
  const servicesOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.services"] ?? EMPTY_SELECT_OPTIONS,
  );
  const cooperationStatusOptions = useSelectOptionsStore(
    (state) =>
      state.optionsByField["vendor.cooperationStatus"] ?? EMPTY_SELECT_OPTIONS,
  );
  const ratingOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.rating"] ?? EMPTY_SELECT_OPTIONS,
  );

  const fetchVendor = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/vendors/${vendorId}`);
      const data = await res.json();
      setVendor(data);
      if (data?.id) {
        upsertVendors([data]);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [upsertVendors, vendorId]);

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
    if (bootstrappedVendorIdRef.current === vendorId) return;
    bootstrappedVendorIdRef.current = vendorId;

    if (cachedVendor) {
      setVendor(cachedVendor as Vendor);
      setLoading(false);
      void Promise.all([fetchVendor(false), fetchVendorProjects()]);
      return;
    }
    setVendor(null);
    void Promise.all([fetchVendor(true), fetchVendorProjects()]);
  }, [cachedVendor, vendorId, fetchVendor, fetchVendorProjects]);

  const displayVendor = vendor ?? ((cachedVendor as Vendor | undefined) ?? null);

  const renderQuickEditList = useCallback(
    (
      field: "vendor.businessType" | "vendor.services",
      items: { id: string; value: string; color?: string | null }[] | undefined,
      save: (
        currentId: string | null,
        nextOption: { id: string; value: string; color: string },
      ) => Promise<void>,
      emptyLabel: string,
      modalTitle: string,
      optionValueLabel: string,
      saveSuccessText: string,
    ) => {
      if (!displayVendor) return null;

      if (!items?.length) {
        return (
          <SelectOptionQuickEditTag
            field={field}
            option={null}
            fallbackText={emptyLabel}
            disabled={!canManageCrm}
            modalTitle={modalTitle}
            optionValueLabel={optionValueLabel}
            saveSuccessText={saveSuccessText}
            onSaveSelection={async (nextOption) => {
              await save(null, nextOption);
            }}
            onUpdated={async () => {
              await fetchVendor(false);
            }}
          />
        );
      }

      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {items.map((item) => (
            <SelectOptionQuickEditTag
              key={item.id}
              field={field}
              option={{ id: item.id, value: item.value, color: item.color ?? null }}
              disabled={!canManageCrm}
              modalTitle={modalTitle}
              optionValueLabel={optionValueLabel}
              saveSuccessText={saveSuccessText}
              onSaveSelection={async (nextOption) => {
                await save(item.id, nextOption);
              }}
              onUpdated={async () => {
                await fetchVendor(false);
              }}
            />
          ))}
        </div>
      );
    },
    [canManageCrm, displayVendor, fetchVendor],
  );

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
    removeVendorFromStore(vendorId);
    messageApi.success("删除成功");
    router.push("/vendors");
  };

  if (loading && !displayVendor) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card title="供应商详情" loading />
      </DetailPageContainer>
    );
  }

  if (!displayVendor) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card title="供应商详情">供应商不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <>
      {contextHolder}
      <DetailPageContainer>
        <Card
          title={
            displayVendor
              ? displayVendor.name +
                (displayVendor.fullName ? ` （全名：${displayVendor.fullName}）` : "")
              : "供应商详情"
          }
          extra={
            displayVendor ? (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setOpen(true)}
                  disabled={!canManageCrm}
                >
                  编辑
                </Button>
                <Popconfirm
                  title={`确定删除供应商「${displayVendor.name}」？`}
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
          {displayVendor ? (
            <Descriptions column={3} size="small">
              <Descriptions.Item label="供应商类型">
                <SelectOptionQuickEditTag
                  field="vendor.vendorType"
                  option={displayVendor.vendorTypeOption ?? null}
                  fallbackText="-"
                  disabled={!canManageCrm}
                  modalTitle="修改供应商类型"
                  optionValueLabel="供应商类型"
                  saveSuccessText="供应商类型已保存"
                  onSaveSelection={async (nextOption) => {
                    const res = await fetch(`/api/vendors/${displayVendor.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ vendorType: nextOption }),
                    });
                    if (!res.ok) {
                      throw new Error((await res.text()) || "更新失败");
                    }
                    const next = (await res.json()) as Vendor | null;
                    if (next?.id) {
                      setVendor(next);
                      upsertVendors([next]);
                    }
                  }}
                  onUpdated={async () => {
                    await fetchVendor(false);
                  }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="业务类型">
                {renderQuickEditList(
                  "vendor.businessType",
                  displayVendor.businessTypeOptions,
                  async (currentId, nextOption) => {
                    const nextIds = [
                      ...(displayVendor.businessTypeOptionIds ?? []).filter(
                        (id) => id !== currentId,
                      ),
                      nextOption.id,
                    ];
                    const res = await fetch(`/api/vendors/${displayVendor.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        businessTypeOptionIds: Array.from(new Set(nextIds)),
                      }),
                    });
                    if (!res.ok) {
                      throw new Error((await res.text()) || "更新失败");
                    }
                    const next = (await res.json()) as Vendor | null;
                    if (next?.id) {
                      setVendor(next);
                      upsertVendors([next]);
                    }
                  },
                  "-",
                  "修改业务类型",
                  "业务类型",
                  "业务类型已保存",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="服务范围">
                {renderQuickEditList(
                  "vendor.services",
                  displayVendor.serviceOptions,
                  async (currentId, nextOption) => {
                    const nextIds = [
                      ...(displayVendor.serviceOptionIds ?? []).filter(
                        (id) => id !== currentId,
                      ),
                      nextOption.id,
                    ];
                    const res = await fetch(`/api/vendors/${displayVendor.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        serviceOptionIds: Array.from(new Set(nextIds)),
                      }),
                    });
                    if (!res.ok) {
                      throw new Error((await res.text()) || "更新失败");
                    }
                    const next = (await res.json()) as Vendor | null;
                    if (next?.id) {
                      setVendor(next);
                      upsertVendors([next]);
                    }
                  },
                  "-",
                  "修改服务范围",
                  "服务范围",
                  "服务范围已保存",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="核心特色/擅长领域">
                <VendorTextValue value={displayVendor.strengths} />
              </Descriptions.Item>
              <Descriptions.Item label="公司简介">
                <VendorTextValue value={displayVendor.companyIntro} />
              </Descriptions.Item>
              <Descriptions.Item label="代表作品">
                <VendorLinkValue href={displayVendor.portfolioLink} />
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>

        <Card title="合作情况">
          {displayVendor ? (
            <Descriptions column={2} size="small">
              {displayVendor.lastCoopDate ? (
                <Descriptions.Item label="最近合作时间">
                  {displayVendor.lastCoopDate}
                </Descriptions.Item>
              ) : null}
              {displayVendor.cooperatedProjects ? (
                <Descriptions.Item label="往期合作项目">
                  {displayVendor.cooperatedProjects}
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="参考价区间">
                <VendorTextValue value={displayVendor.priceRange} preserveLineBreaks />
              </Descriptions.Item>
              <Descriptions.Item label="关键备注">
                <VendorTextValue value={displayVendor.notes} preserveLineBreaks />
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
        <Card title="合作评价">
          {displayVendor ? (
            <Descriptions column={3} size="small">
              <Descriptions.Item label="合作状态">
                <VendorOptionValue option={displayVendor.cooperationStatusOption} />
              </Descriptions.Item>
              <Descriptions.Item label="综合评级">
                <VendorOptionValue option={displayVendor.ratingOption} />
              </Descriptions.Item>
              <Descriptions.Item label="黑名单">
                <VendorBooleanValue value={displayVendor.isBlacklisted} />
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
        <Card title="联系方式">
          {displayVendor ? (
            <Descriptions column={3} size="small">
              <Descriptions.Item label="所在地">
                <VendorTextValue value={displayVendor.location} />
              </Descriptions.Item>
              <Descriptions.Item label="联系人">
                <VendorTextValue value={displayVendor.contactName} />
              </Descriptions.Item>
              <Descriptions.Item label="联系人微信">
                <VendorTextValue value={displayVendor.wechat} />
              </Descriptions.Item>
              <Descriptions.Item label="联系人电话">
                <VendorTextValue value={displayVendor.phone} />
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                <VendorTextValue value={displayVendor.email} />
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
        <Card styles={{ body: { padding: 2 } }}>
          {displayVendor ? (
            <ProjectsTable
              headerTitle={<h4 style={{ margin: 0 }}>合作项目</h4>}
              projects={vendorProjects}
              loading={projectsLoading}
              columnKeys={["name", "type", "status", "startDate", "endDate"]}
            />
          ) : null}
        </Card>
      </DetailPageContainer>

      <VendorFormModal
        open={open}
        onCancel={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          void Promise.all([fetchVendor(false), fetchVendorProjects()]);
        }}
        initialValues={displayVendor}
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
