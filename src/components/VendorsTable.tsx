"use client";

import { useMemo } from "react";
import { Tag } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

export type Vendor = {
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
  businessTypeOptions?: Array<{
    id: string;
    value: string;
    color?: string | null;
  }>;
  businessTypeOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  cooperationStatusOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  ratingOption?: { id: string; value: string; color?: string | null } | null;
  serviceOptions?: Array<{ id: string; value: string; color?: string | null }>;
  isBlacklisted?: boolean;
  location?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  strengths?: string | null;
  companyIntro?: string | null;
  portfolioLink?: string | null;
  priceRange?: string | null;
  lastCoopDate?: string | null;
  cooperatedProjects?: string | null;
  notes?: string | null;
};

const EMPTY_OPTIONS: {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt: string;
}[] = [];

type Props = {
  vendors: Vendor[];
  loading?: boolean;
  current: number;
  pageSize: number;
  onPageChange: (nextPage: number, nextPageSize: number) => void;
  onEdit?: (vendor: Vendor) => void;
  onDelete: (id: string) => void;
  actionsDisabled?: boolean;
  actionDeleteText?: string;
  actionDeleteTitle?: string;
  columnKeys?: Array<
    | "name"
    | "vendorType"
    | "businessType"
    | "serviceRange"
    | "cooperationStatus"
    | "rating"
    | "isBlacklisted"
    | "strengths"
    | "companyIntro"
    | "portfolioLink"
    | "priceRange"
    | "notes"
    | "lastCoopDate"
    | "cooperatedProjects"
    | "actions"
  >;
  headerTitle?: React.ReactNode;
  toolbarActions?: React.ReactNode[];
  showColumnSetting?: boolean;
};

const VendorsTable = ({
  vendors,
  loading,
  current,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  actionsDisabled = false,
  actionDeleteText = "删除",
  actionDeleteTitle = "确定删除这个供应商？",
  columnKeys = [
    "name",
    "vendorType",
    "businessType",
    "serviceRange",
    "cooperationStatus",
    "rating",
    "isBlacklisted",
    "strengths",
    "companyIntro",
    "portfolioLink",
    "priceRange",
    "notes",
    "lastCoopDate",
    "cooperatedProjects",
    "actions",
  ],
  headerTitle = <h3 style={{ margin: 0 }}>供应商管理</h3>,
  toolbarActions = [],
  showColumnSetting = true,
}: Props) => {
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

  const vendorTypeFilters = useMemo(
    () =>
      vendorTypeOptions.map((item) => ({
        text: item.value,
        value: item.id,
      })),
    [vendorTypeOptions],
  );

  const businessTypeFilters = useMemo(
    () =>
      businessTypeOptions.map((item) => ({
        text: item.value,
        value: item.id,
      })),
    [businessTypeOptions],
  );

  const serviceFilters = useMemo(
    () =>
      servicesOptions.map((item) => ({
        text: item.value,
        value: item.id,
      })),
    [servicesOptions],
  );

  const cooperationStatusFilters = useMemo(
    () =>
      cooperationStatusOptions.map((item) => ({
        text: item.value,
        value: item.id,
      })),
    [cooperationStatusOptions],
  );

  const ratingFilters = useMemo(
    () =>
      ratingOptions.map((item) => ({
        text: item.value,
        value: item.id,
      })),
    [ratingOptions],
  );

  const columns = useMemo<ProColumns<Vendor>[]>(() => {
    const allColumns: Record<
      NonNullable<Props["columnKeys"]>[number],
      ProColumns<Vendor>
    > = {
      name: {
        key: "name",
        title: "名称",
        dataIndex: "name",
        filters: vendors.map((item) => ({
          text: item.name,
          value: item.id,
        })),
        filterSearch: true,
        onFilter: (value, record) => record.id === String(value),
        render: (_dom, record) => (
          <AppLink href={`/vendors/${record.id}`}>{record.name}</AppLink>
        ),
      },
      vendorType: {
        key: "vendorType",
        title: "供应商类型",
        dataIndex: "vendorTypeOptionId",
        filters: vendorTypeFilters,
        onFilter: (value, record) =>
          record.vendorTypeOptionId === String(value),
        render: (_dom, record) =>
          record.vendorTypeOption ? (
            <SelectOptionTag option={record.vendorTypeOption} />
          ) : (
            "-"
          ),
      },
      businessType: {
        key: "businessType",
        title: "业务类型",
        dataIndex: "businessTypeOptionIds",
        filters: businessTypeFilters,
        onFilter: (value, record) =>
          record.businessTypeOptionIds?.includes(String(value)) ?? false,
        render: (_dom, record) =>
          record.businessTypeOptions &&
          record.businessTypeOptions.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {record.businessTypeOptions.map((item) => (
                <SelectOptionTag key={item.id} option={item} />
              ))}
            </div>
          ) : record.businessTypeOption ? (
            <SelectOptionTag option={record.businessTypeOption} />
          ) : (
            "-"
          ),
      },
      serviceRange: {
        key: "serviceRange",
        title: "服务范围",
        dataIndex: "serviceOptionIds",
        filters: serviceFilters,
        onFilter: (value, record) =>
          record.serviceOptionIds?.includes(String(value)) ?? false,
        render: (_dom, record) =>
          record.serviceOptions && record.serviceOptions.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {record.serviceOptions.map((service) => (
                <SelectOptionTag key={service.id} option={service} />
              ))}
            </div>
          ) : (
            "-"
          ),
      },
      cooperationStatus: {
        key: "cooperationStatus",
        title: "合作状态",
        dataIndex: "cooperationStatusOptionId",
        filters: cooperationStatusFilters,
        onFilter: (value, record) =>
          record.cooperationStatusOptionId === String(value),
        render: (_dom, record) =>
          record.cooperationStatusOption ? (
            <SelectOptionTag option={record.cooperationStatusOption} />
          ) : (
            "-"
          ),
      },
      rating: {
        key: "rating",
        title: "综合评级",
        dataIndex: "ratingOptionId",
        filters: ratingFilters,
        onFilter: (value, record) => record.ratingOptionId === String(value),
        render: (_dom, record) =>
          record.ratingOption ? (
            <SelectOptionTag option={record.ratingOption} />
          ) : (
            "-"
          ),
      },
      isBlacklisted: {
        key: "isBlacklisted",
        title: "黑名单",
        dataIndex: "isBlacklisted",
        filters: [
          { text: "是", value: true },
          { text: "否", value: false },
        ],
        onFilter: (value, record) => record.isBlacklisted === (value === true),
        render: (_dom, record) =>
          record.isBlacklisted ? (
            <Tag color="red">是</Tag>
          ) : (
            <Tag color="green">否</Tag>
          ),
      },
      strengths: {
        key: "strengths",
        title: "核心特色/擅长领域",
        dataIndex: "strengths",
        render: (_dom, record) => record.strengths ?? "-",
      },
      companyIntro: {
        key: "companyIntro",
        title: "公司简介",
        dataIndex: "companyIntro",
        render: (_dom, record) => record.companyIntro ?? "-",
      },
      portfolioLink: {
        key: "portfolioLink",
        title: "代表作品",
        dataIndex: "portfolioLink",
        render: (_dom, record) =>
          record.portfolioLink ? (
            <a
              href={record.portfolioLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {record.portfolioLink}
            </a>
          ) : (
            "-"
          ),
      },
      priceRange: {
        key: "priceRange",
        title: "参考价区间",
        dataIndex: "priceRange",
        render: (_dom, record) => record.priceRange ?? "-",
      },
      notes: {
        key: "notes",
        title: "关键备注",
        dataIndex: "notes",
        render: (_dom, record) => record.notes ?? "-",
      },
      lastCoopDate: {
        key: "lastCoopDate",
        title: "最近合作时间",
        dataIndex: "lastCoopDate",
        render: (_dom, record) => record.lastCoopDate ?? "-",
      },
      cooperatedProjects: {
        key: "cooperatedProjects",
        title: "往期合作项目",
        dataIndex: "cooperatedProjects",
        render: (_dom, record) => record.cooperatedProjects ?? "-",
      },
      actions: {
        key: "actions",
        title: "操作",
        hideInSetting: true,
        render: (_dom, record) => (
          <TableActions
            onEdit={onEdit ? () => onEdit(record) : undefined}
            onDelete={() => onDelete(record.id)}
            editDisabled={actionsDisabled}
            deleteDisabled={actionsDisabled}
            deleteTitle={actionDeleteTitle}
            deleteText={actionDeleteText}
          />
        ),
      },
    };

    return columnKeys.map((key) => allColumns[key]);
  }, [
    vendors,
    vendorTypeFilters,
    businessTypeFilters,
    serviceFilters,
    cooperationStatusFilters,
    ratingFilters,
    onEdit,
    onDelete,
    actionDeleteText,
    actionDeleteTitle,
    actionsDisabled,
    columnKeys,
  ]);

  const tableOptions = useMemo(
    () => ({
      reload: false,
      density: false,
      fullScreen: false,
      setting: showColumnSetting
        ? {
            draggable: false,
          }
        : false,
    }),
    [showColumnSetting],
  );

  const columnsStateConfig = useMemo(
    () => ({
      defaultValue: {
        name: { show: true },
        fullName: { show: false },
        vendorType: { show: true },
        businessType: { show: true },
        serviceRange: { show: true },
        cooperationStatus: { show: false },
        rating: { show: false },
        isBlacklisted: { show: false },
        strengths: { show: false },
        companyIntro: { show: false },
        portfolioLink: { show: false },
        location: { show: false },
        contactName: { show: false },
        wechat: { show: false },
        phone: { show: false },
        email: { show: false },
        priceRange: { show: false },
        notes: { show: false },
        lastCoopDate: { show: false },
        cooperatedProjects: { show: false },
        actions: { show: true },
      },
      persistenceKey: "vendors-table-columns-state",
      persistenceType: "localStorage" as const,
    }),
    [],
  );

  return (
    <ProTable<Vendor>
      rowKey="id"
      columns={columns}
      dataSource={vendors}
      loading={loading}
      search={false}
      headerTitle={headerTitle}
      options={tableOptions}
      columnsState={columnsStateConfig}
      pagination={{
        current,
        pageSize,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
        showTotal: (total) => `共 ${total} 条`,
        onChange: onPageChange,
      }}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      toolBarRender={() => toolbarActions}
    />
  );
};

export default VendorsTable;
