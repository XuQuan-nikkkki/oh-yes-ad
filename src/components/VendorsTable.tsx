"use client";

import { useMemo } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import type { CSSProperties } from "react";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import {
  VendorBooleanValue,
  VendorLinkValue,
  VendorOptionListValue,
  VendorOptionValue,
  VendorTextValue,
} from "@/components/vendor/VendorContent";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { EMPTY_SELECT_OPTIONS } from "@/types/selectOption";
import type { Vendor } from "@/types/vendor";

export type { Vendor };

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
  cardBodyStyle?: CSSProperties;
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
  headerTitle = <ProTableHeaderTitle>供应商管理</ProTableHeaderTitle>,
  toolbarActions = [],
  showColumnSetting = true,
  cardBodyStyle,
}: Props) => {
  const { canManageCrm } = useCrmPermission();
  const resolvedActionsDisabled = actionsDisabled ?? !canManageCrm;
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
        render: (_dom, record) => (
          <VendorOptionValue option={record.vendorTypeOption} />
        ),
      },
      businessType: {
        key: "businessType",
        title: "业务类型",
        dataIndex: "businessTypeOptionIds",
        filters: businessTypeFilters,
        onFilter: (value, record) =>
          record.businessTypeOptionIds?.includes(String(value)) ?? false,
        render: (_dom, record) => (
          <VendorOptionListValue
            options={record.businessTypeOptions}
            fallbackOption={
              record.businessTypeOption
                ? {
                    id: record.businessTypeOption.id,
                    value: record.businessTypeOption.value,
                    color: record.businessTypeOption.color ?? null,
                  }
                : undefined
            }
          />
        ),
      },
      serviceRange: {
        key: "serviceRange",
        title: "服务范围",
        dataIndex: "serviceOptionIds",
        filters: serviceFilters,
        onFilter: (value, record) =>
          record.serviceOptionIds?.includes(String(value)) ?? false,
        render: (_dom, record) => (
          <VendorOptionListValue options={record.serviceOptions} />
        ),
      },
      cooperationStatus: {
        key: "cooperationStatus",
        title: "合作状态",
        dataIndex: "cooperationStatusOptionId",
        filters: cooperationStatusFilters,
        onFilter: (value, record) =>
          record.cooperationStatusOptionId === String(value),
        render: (_dom, record) => (
          <VendorOptionValue option={record.cooperationStatusOption} />
        ),
      },
      rating: {
        key: "rating",
        title: "综合评级",
        dataIndex: "ratingOptionId",
        filters: ratingFilters,
        onFilter: (value, record) => record.ratingOptionId === String(value),
        render: (_dom, record) => (
          <VendorOptionValue option={record.ratingOption} />
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
        render: (_dom, record) => (
          <VendorBooleanValue value={record.isBlacklisted} />
        ),
      },
      strengths: {
        key: "strengths",
        title: "核心特色/擅长领域",
        dataIndex: "strengths",
        render: (_dom, record) => <VendorTextValue value={record.strengths} />,
      },
      companyIntro: {
        key: "companyIntro",
        title: "公司简介",
        dataIndex: "companyIntro",
        render: (_dom, record) => (
          <VendorTextValue value={record.companyIntro} />
        ),
      },
      portfolioLink: {
        key: "portfolioLink",
        title: "代表作品",
        dataIndex: "portfolioLink",
        render: (_dom, record) => <VendorLinkValue href={record.portfolioLink} />,
      },
      priceRange: {
        key: "priceRange",
        title: "参考价区间",
        dataIndex: "priceRange",
        render: (_dom, record) => <VendorTextValue value={record.priceRange} />,
      },
      notes: {
        key: "notes",
        title: "关键备注",
        dataIndex: "notes",
        render: (_dom, record) => <VendorTextValue value={record.notes} />,
      },
      lastCoopDate: {
        key: "lastCoopDate",
        title: "最近合作时间",
        dataIndex: "lastCoopDate",
        render: (_dom, record) => (
          <VendorTextValue value={record.lastCoopDate} />
        ),
      },
      cooperatedProjects: {
        key: "cooperatedProjects",
        title: "往期合作项目",
        dataIndex: "cooperatedProjects",
        render: (_dom, record) => (
          <VendorTextValue value={record.cooperatedProjects} />
        ),
      },
      actions: {
        key: "actions",
        title: "操作",
        hideInSetting: true,
        render: (_dom, record) => (
          <TableActions
            onEdit={onEdit ? () => onEdit(record) : undefined}
            onDelete={() => onDelete(record.id)}
            disabled={resolvedActionsDisabled}
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
    resolvedActionsDisabled,
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
      cardProps={
        cardBodyStyle
          ? {
              bodyStyle: cardBodyStyle,
            }
          : undefined
      }
    />
  );
};

export default VendorsTable;
