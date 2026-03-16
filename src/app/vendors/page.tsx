"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, message } from "antd";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import VendorFormModal from "@/components/VendorFormModal";
import VendorsTable, { Vendor } from "@/components/VendorsTable";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useCrmPermission } from "@/hooks/useCrmPermission";

const EMPTY_OPTIONS: {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt: string;
}[] = [];

const VendorsPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    (state) => state.optionsByField["vendor.cooperationStatus"] ?? EMPTY_OPTIONS,
  );
  const ratingOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.rating"] ?? EMPTY_OPTIONS,
  );

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/vendors");
    const data = await res.json();
    setVendors(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const loadVendors = async () => {
      await fetchVendors();
    };
    loadVendors();
  }, [fetchVendors]);

  const handleDelete = useCallback(async (id: string) => {
    if (!canManageCrm) return;
    await fetch("/api/vendors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchVendors();
  }, [canManageCrm, fetchVendors]);

  const handleDownloadCsv = useCallback(async () => {
    if (vendors.length === 0) {
      messageApi.warning("暂无可下载的供应商数据");
      return;
    }

    messageApi.loading({ content: "正在准备导出...", key: "vendors-export" });

    const parseProjectNamesFromText = (value?: string | null) => {
      if (!value) return [];
      return value
        .split(/\r?\n|,|，|;|；|、|\|/)
        .map((name) => name.trim())
        .filter(Boolean);
    };

    try {
      const vendorsWithProjectNames = await Promise.all(
        vendors.map(async (vendor) => {
          try {
            const res = await fetch(`/api/vendors/${vendor.id}`);
            if (!res.ok) {
              return {
                ...vendor,
                projectNames: parseProjectNamesFromText(vendor.cooperatedProjects),
              };
            }
            const detail = await res.json();
            const projectNames = Array.isArray(detail?.projects)
              ? detail.projects
                  .map((project: { name?: string | null }) =>
                    (project?.name ?? "").trim(),
                  )
                  .filter(Boolean)
              : parseProjectNamesFromText(vendor.cooperatedProjects);
            return { ...vendor, projectNames };
          } catch {
            return {
              ...vendor,
              projectNames: parseProjectNamesFromText(vendor.cooperatedProjects),
            };
          }
        }),
      );

      const columns = [
        { group: "基础信息", title: "名称", getValue: (v: Vendor) => v.name ?? "" },
        { group: "基础信息", title: "全称", getValue: (v: Vendor) => v.fullName ?? "" },
        {
          group: "公司信息",
          title: "供应商类型",
          getValue: (v: Vendor) => v.vendorTypeOption?.value ?? "",
        },
        {
          group: "公司信息",
          title: "业务类型",
          getValue: (v: Vendor) =>
            v.businessTypeOptions?.map((item) => item.value).join("|") ??
            v.businessTypeOption?.value ??
            "",
        },
        {
          group: "公司信息",
          title: "服务范围",
          getValue: (v: Vendor) =>
            v.serviceOptions?.map((item) => item.value).join("|") ?? "",
        },
        {
          group: "公司信息",
          title: "核心特色/擅长领域",
          getValue: (v: Vendor) => v.strengths ?? "",
        },
        {
          group: "公司信息",
          title: "公司简介",
          getValue: (v: Vendor) => v.companyIntro ?? "",
        },
        {
          group: "公司信息",
          title: "代表作品",
          getValue: (v: Vendor) => v.portfolioLink ?? "",
        },
        {
          group: "合作情况",
          title: "参考价区间",
          getValue: (v: Vendor) => v.priceRange ?? "",
        },
        {
          group: "合作情况",
          title: "关键备注",
          getValue: (v: Vendor) => v.notes ?? "",
        },
        {
          group: "合作情况",
          title: "最近合作时间",
          getValue: (v: Vendor) => v.lastCoopDate ?? "",
        },
        {
          group: "合作情况",
          title: "往期合作项目",
          getValue: (v: Vendor) => v.cooperatedProjects ?? "",
        },
        {
          group: "合作情况",
          title: "合作状态",
          getValue: (v: Vendor) => v.cooperationStatusOption?.value ?? "",
        },
        {
          group: "合作情况",
          title: "综合评级",
          getValue: (v: Vendor) => v.ratingOption?.value ?? "",
        },
        {
          group: "合作情况",
          title: "黑名单",
          getValue: (v: Vendor) => (v.isBlacklisted ? "是" : "否"),
        },
        {
          group: "联系方式",
          title: "所在地",
          getValue: (v: Vendor) => v.location ?? "",
        },
        {
          group: "联系方式",
          title: "联系人",
          getValue: (v: Vendor) => v.contactName ?? "",
        },
        {
          group: "联系方式",
          title: "联系人微信",
          getValue: (v: Vendor) => v.wechat ?? "",
        },
        {
          group: "联系方式",
          title: "联系人电话",
          getValue: (v: Vendor) => v.phone ?? "",
        },
        {
          group: "联系方式",
          title: "邮箱",
          getValue: (v: Vendor) => v.email ?? "",
        },
        {
          group: "合作项目",
          title: "合作过的项目",
          getValue: (v: Vendor & { projectNames?: string[] }) =>
            (v.projectNames ?? []).map((name) => `- ${name}`).join("\n"),
        },
      ] as const;

      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("供应商数据");

      const fieldHeaders = columns.map((column) => column.title);
      const groupStartIndexMap = new Map<string, number>();
      const groupEndIndexMap = new Map<string, number>();

      columns.forEach((column, index) => {
        const colIndex = index + 1;
        if (!groupStartIndexMap.has(column.group)) {
          groupStartIndexMap.set(column.group, colIndex);
        }
        groupEndIndexMap.set(column.group, colIndex);
      });

      groupStartIndexMap.forEach((start, group) => {
        const end = groupEndIndexMap.get(group) ?? start;
        worksheet.mergeCells(1, start, 1, end);
        worksheet.getCell(1, start).value = group;
      });

      fieldHeaders.forEach((title, index) => {
        worksheet.getCell(2, index + 1).value = title;
      });

      vendorsWithProjectNames.forEach((vendor) => {
        worksheet.addRow(columns.map((column) => column.getValue(vendor)));
      });

      const headerStyle = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FF0B6B3A" },
      };
      const headerFont = { color: { argb: "FFFFFFFF" }, bold: true };

      [1, 2].forEach((rowIndex) => {
        const row = worksheet.getRow(rowIndex);
        row.eachCell((cell) => {
          cell.fill = headerStyle;
          cell.font = headerFont;
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFD9D9D9" } },
            left: { style: "thin", color: { argb: "FFD9D9D9" } },
            bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
            right: { style: "thin", color: { argb: "FFD9D9D9" } },
          };
        });
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        row.eachCell((cell, colNumber) => {
          const isProjectColumn = colNumber === columns.length;
          cell.alignment = {
            vertical: "top",
            horizontal: "left",
            wrapText: isProjectColumn,
          };
        });
      });

      worksheet.columns = columns.map((column, index) => {
        const baseLength = Math.max(
          String(column.title).length,
          ...vendorsWithProjectNames.map((vendor) => {
            const value = String(column.getValue(vendor) ?? "");
            const longestLine = value
              .split("\n")
              .reduce((max, line) => Math.max(max, line.length), 0);
            return longestLine;
          }),
        );
        const width = Math.min(Math.max(baseLength + 2, 12), index === columns.length - 1 ? 40 : 30);
        return { width };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      link.href = url;
      link.download = `vendors-${yyyy}-${mm}-${dd}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      messageApi.success({ content: "供应商数据已开始下载", key: "vendors-export" });
    } catch {
      messageApi.error({ content: "导出失败，请稍后重试", key: "vendors-export" });
    }
  }, [vendors, messageApi]);

  return (
    <>
      {contextHolder}
      <Card styles={{ body: { padding: 12 } }}>
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
          actionsDisabled={!canManageCrm}
          toolbarActions={[
            <Button
              key="download-vendors-csv"
              icon={<DownloadOutlined />}
              disabled={!canManageCrm}
              onClick={handleDownloadCsv}
            >
              下载完整表格 
            </Button>,
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
            await fetchVendors();
          }}
          vendorTypeOptions={vendorTypeOptions}
          businessTypeOptions={businessTypeOptions}
          servicesOptions={servicesOptions}
          cooperationStatusOptions={cooperationStatusOptions}
          ratingOptions={ratingOptions}
        />
      </Card>
    </>
  );
};

export default VendorsPage;
