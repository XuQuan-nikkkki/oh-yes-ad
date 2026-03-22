"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import VendorFormModal from "@/components/VendorFormModal";
import VendorsTable, { Vendor } from "@/components/VendorsTable";
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
