"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import VendorFormModal from "@/components/VendorFormModal";
import VendorsTable, { Vendor } from "@/components/VendorsTable";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import ListPageContainer from "@/components/ListPageContainer";
import DownloadVendorsButton from "@/components/actions/DownloadVendorsButton";
import { EMPTY_SELECT_OPTIONS } from "@/types/selectOption";
import { useVendorsStore } from "@/stores/vendorsStore";

const VendorsPage = () => {
  const vendors = useVendorsStore((state) => state.vendors);
  const loading = useVendorsStore((state) => state.loading);
  const fetchVendors = useVendorsStore((state) => state.fetchVendors);
  const removeVendor = useVendorsStore((state) => state.removeVendor);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    (state) => state.optionsByField["vendor.cooperationStatus"] ?? EMPTY_SELECT_OPTIONS,
  );
  const ratingOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.rating"] ?? EMPTY_SELECT_OPTIONS,
  );

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  const handleDelete = useCallback(async (id: string) => {
    if (!canManageCrm) return;
    const res = await fetch("/api/vendors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    removeVendor(id);
  }, [canManageCrm, removeVendor]);

  const refreshVendor = useCallback(
    async (vendorId: string) => {
      const res = await fetch(`/api/vendors/${vendorId}`, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as Vendor | null;
      if (next?.id) {
        useVendorsStore.getState().upsertVendors([next]);
      }
    },
    [],
  );

  const renderQuickEditList = useCallback(
    (
      field: "vendor.businessType" | "vendor.services",
      items: { id: string; value: string; color?: string | null }[] | undefined,
      onSave: (currentId: string | null, nextOption: { id: string; value: string; color: string }) => Promise<void>,
      emptyLabel: string,
    ) => {
      if (!items?.length) {
        return (
          <SelectOptionQuickEditTag
            field={field}
            option={null}
            fallbackText={emptyLabel}
            disabled={!canManageCrm}
            modalTitle="修改选项"
            optionValueLabel="选项值"
            saveSuccessText="已保存"
            onSaveSelection={async (nextOption) => {
              await onSave(null, nextOption);
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
              modalTitle="修改选项"
              optionValueLabel="选项值"
              saveSuccessText="已保存"
              onSaveSelection={async (nextOption) => {
                await onSave(item.id, nextOption);
              }}
            />
          ))}
        </div>
      );
    },
    [canManageCrm],
  );

  return (
    <>
      <ListPageContainer>
        <VendorsTable
          vendors={vendors}
          loading={loading}
          current={current}
          pageSize={pageSize}
          onPageChange={(nextPage, nextPageSize) => {
            setCurrent(nextPage);
            setPageSize(nextPageSize);
          }}
          onEdit={(vendor) => {
            setEditingVendor(vendor);
            setOpen(true);
          }}
          onDelete={handleDelete}
          renderVendorTypeOption={(vendor) => (
            <SelectOptionQuickEditTag
              field="vendor.vendorType"
              option={vendor.vendorTypeOption ?? null}
              fallbackText="-"
              disabled={!canManageCrm}
              modalTitle="修改供应商类型"
              optionValueLabel="供应商类型"
              saveSuccessText="供应商类型已保存"
              onSaveSelection={async (nextOption) => {
                const res = await fetch(`/api/vendors/${vendor.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ vendorType: nextOption }),
                });
                if (!res.ok) throw new Error((await res.text()) || "更新失败");
                const next = (await res.json()) as Vendor | null;
                if (next?.id) useVendorsStore.getState().upsertVendors([next]);
              }}
              onUpdated={async () => {
                await refreshVendor(vendor.id);
              }}
            />
          )}
          renderBusinessTypeOptions={(vendor) =>
            renderQuickEditList(
              "vendor.businessType",
              vendor.businessTypeOptions,
              async (currentId, nextOption) => {
                const nextIds = [
                  ...(vendor.businessTypeOptionIds ?? []).filter((id) => id !== currentId),
                  nextOption.id,
                ];
                const res = await fetch(`/api/vendors/${vendor.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ businessTypeOptionIds: Array.from(new Set(nextIds)) }),
                });
                if (!res.ok) throw new Error((await res.text()) || "更新失败");
                const next = (await res.json()) as Vendor | null;
                if (next?.id) useVendorsStore.getState().upsertVendors([next]);
              },
              "-",
            )
          }
          renderServiceOptions={(vendor) =>
            renderQuickEditList(
              "vendor.services",
              vendor.serviceOptions,
              async (currentId, nextOption) => {
                const nextIds = [
                  ...(vendor.serviceOptionIds ?? []).filter((id) => id !== currentId),
                  nextOption.id,
                ];
                const res = await fetch(`/api/vendors/${vendor.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ serviceOptionIds: Array.from(new Set(nextIds)) }),
                });
                if (!res.ok) throw new Error((await res.text()) || "更新失败");
                const next = (await res.json()) as Vendor | null;
                if (next?.id) useVendorsStore.getState().upsertVendors([next]);
              },
              "-",
            )
          }
          toolbarActions={[
            <DownloadVendorsButton
              key="download-vendors-csv"
              disabled={!canManageCrm}
              vendors={vendors}
            />,
            <Button
              key="create-vendor"
              type="primary"
              icon={<PlusOutlined />}
              disabled={!canManageCrm}
              onClick={() => {
                setEditingVendor(null);
                setOpen(true);
              }}
            >
              新建供应商
            </Button>,
          ]}
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
            await fetchVendors(true);
          }}
          vendorTypeOptions={vendorTypeOptions}
          businessTypeOptions={businessTypeOptions}
          servicesOptions={servicesOptions}
          cooperationStatusOptions={cooperationStatusOptions}
          ratingOptions={ratingOptions}
        />
      </ListPageContainer>
    </>
  );
};

export default VendorsPage;
