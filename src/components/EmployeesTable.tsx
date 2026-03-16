// @ts-nocheck
"use client";

import { useMemo } from "react";
import { Space, Tag } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";

export type Employee = {
  id: string;
  name: string;
  phone?: string | null;
  fullName?: string | null;
  roles?: {
    role: {
      id: string;
      code: "ADMIN" | "PROJECT_MANAGER" | "HR" | "FINANCE" | "STAFF";
      name: string;
    };
  }[];
  function?: string | null;
  functionOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  position?: string | null;
  positionOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  level?: string | null;
  departmentLevel1?: string | null;
  departmentLevel1Option?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  departmentLevel2?: string | null;
  departmentLevel2Option?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  employmentType?: string | null;
  employmentTypeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  entryDate?: string | null;
  leaveDate?: string | null;
  salary?: string | number | null;
  socialSecurity?: string | number | null;
  providentFund?: string | number | null;
  workstationCost?: string | number | null;
  utilityCost?: string | number | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  legalEntity?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
};

type RoleOption = {
  id: string;
  code: string;
  name: string;
};

export type EmployeeColumnKey =
  | "name"
  | "fullName"
  | "function"
  | "roles"
  | "legalEntity"
  | "departmentLevel1"
  | "departmentLevel2"
  | "position"
  | "level"
  | "employmentType"
  | "employmentStatus"
  | "entryDate"
  | "leaveDate"
  | "salary"
  | "socialSecurity"
  | "providentFund"
  | "workstationCost"
  | "utilityCost"
  | "bankAccountNumber"
  | "bankName"
  | "bankBranch"
  | "actions";

type Props = {
  employees: Employee[];
  roleOptions: RoleOption[];
  columnKeys: EmployeeColumnKey[];
  loading?: boolean;
  onEdit?: (employee: Employee) => void;
  onDelete?: (id: string) => void;
  actionDeleteText?: string;
  actionDeleteTitle?: string;
  onOptionUpdated?: () => void | Promise<void>;
  toolbarActions?: React.ReactNode[];
  columnsStatePersistenceKey?: string;
  headerTitle?: React.ReactNode;
  showColumnSetting?: boolean;
  compactHorizontalPadding?: boolean;
};

const EmployeesTable = ({
  employees,
  roleOptions,
  columnKeys,
  loading = false,
  onEdit,
  onDelete,
  actionDeleteText = "删除",
  actionDeleteTitle = "确定删除这个团队成员？",
  onOptionUpdated,
  toolbarActions = [],
  columnsStatePersistenceKey,
  headerTitle = <h3 style={{ margin: 0 }}>团队成员</h3>,
  showColumnSetting = true,
  compactHorizontalPadding = false,
}: Props) => {
  const functionFilters = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map((item) => item.function)
            .filter((item): item is string => Boolean(item)),
        ),
      ).map((item) => ({
        text: item,
        value: item,
      })),
    [employees],
  );

  const formatMoney = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const selectedColumns = useMemo<ProColumns<Employee>[]>(() => {
    const allColumns: Record<EmployeeColumnKey, ProColumns<Employee>> = {
      name: {
        key: "name",
        title: "姓名",
        dataIndex: "name",
        filters: employees.map((item) => ({ text: item.name, value: item.id })),
        filterSearch: true,
        onFilter: (value, record) => record.id === String(value),
        render: (_dom, record) => (
          <AppLink href={`/employees/${record.id}`}>{record.name}</AppLink>
        ),
      },
      fullName: {
        key: "fullName",
        title: "全名",
        dataIndex: "fullName",
        render: (_dom, record) => record.fullName ?? "-",
      },
      function: {
        key: "function",
        title: "职能",
        dataIndex: "function",
        filters: functionFilters,
        onFilter: (value, record) => record.function === value,
        render: (_dom, record) =>
          record.functionOption?.id ? (
            <SelectOptionTag
              option={record.functionOption}
              onUpdated={onOptionUpdated}
            />
          ) : record.function ? (
            record.function
          ) : (
            "-"
          ),
      },
      roles: {
        key: "roles",
        title: "角色",
        filters: roleOptions.map((item) => ({ text: item.name, value: item.code })),
        onFilter: (value, record) =>
          Boolean(record.roles?.some((item) => item.role.code === value)),
        render: (_dom, record) =>
          record.roles && record.roles.length > 0 ? (
            <Space size={4} wrap>
              {record.roles.map((item) => (
                <Tag color="blue" key={item.role.id}>
                  {item.role.name}
                </Tag>
              ))}
            </Space>
          ) : (
            "-"
          ),
      },
      legalEntity: {
        key: "legalEntity",
        title: "签约主体",
        render: (_dom, record) =>
          record.legalEntity ? (
            <AppLink href={`/legal-entities/${record.legalEntity.id}`}>
              {record.legalEntity.fullName || record.legalEntity.name}
            </AppLink>
          ) : (
            "-"
          ),
      },
      departmentLevel1: {
        key: "departmentLevel1",
        title: "一级部门",
        render: (_dom, record) =>
          record.departmentLevel1Option?.id ? (
            <SelectOptionTag
              option={record.departmentLevel1Option}
              onUpdated={onOptionUpdated}
            />
          ) : record.departmentLevel1 ? (
            record.departmentLevel1
          ) : (
            "-"
          ),
      },
      departmentLevel2: {
        key: "departmentLevel2",
        title: "二级部门",
        render: (_dom, record) =>
          record.departmentLevel2Option?.id ? (
            <SelectOptionTag
              option={record.departmentLevel2Option}
              onUpdated={onOptionUpdated}
            />
          ) : record.departmentLevel2 ? (
            record.departmentLevel2
          ) : (
            "-"
          ),
      },
      position: {
        key: "position",
        title: "职位",
        render: (_dom, record) =>
          record.positionOption?.id ? (
            <SelectOptionTag
              option={record.positionOption}
              onUpdated={onOptionUpdated}
            />
          ) : record.position ? (
            record.position
          ) : (
            "-"
          ),
      },
      level: {
        key: "level",
        title: "职级",
        dataIndex: "level",
        render: (_dom, record) => record.level ?? "-",
      },
      employmentType: {
        key: "employmentType",
        title: "用工性质",
        render: (_dom, record) =>
          record.employmentTypeOption?.id ? (
            <SelectOptionTag
              option={record.employmentTypeOption}
              onUpdated={onOptionUpdated}
            />
          ) : record.employmentType ? (
            record.employmentType
          ) : (
            "-"
          ),
      },
      employmentStatus: {
        key: "employmentStatus",
        title: "用工状态",
        dataIndex: "employmentStatus",
        filters: [
          { text: "在职", value: "在职" },
          { text: "离职", value: "离职" },
        ],
        onFilter: (value, record) => record.employmentStatus === value,
        render: (_dom, record) =>
          record.employmentStatusOption?.id ? (
            <SelectOptionTag
              option={record.employmentStatusOption}
              onUpdated={onOptionUpdated}
            />
          ) : record.employmentStatus ? (
            record.employmentStatus
          ) : (
            "-"
          ),
      },
      entryDate: {
        key: "entryDate",
        title: "入职日期",
        render: (_dom, record) =>
          record.entryDate ? dayjs(record.entryDate).format("YYYY-MM-DD") : "-",
      },
      leaveDate: {
        key: "leaveDate",
        title: "离职日期",
        render: (_dom, record) =>
          record.leaveDate ? dayjs(record.leaveDate).format("YYYY-MM-DD") : "-",
      },
      salary: {
        key: "salary",
        title: "薪资",
        render: (_dom, record) => formatMoney(record.salary),
      },
      socialSecurity: {
        key: "socialSecurity",
        title: "社保",
        render: (_dom, record) => formatMoney(record.socialSecurity),
      },
      providentFund: {
        key: "providentFund",
        title: "公积金",
        render: (_dom, record) => formatMoney(record.providentFund),
      },
      workstationCost: {
        key: "workstationCost",
        title: "工位费",
        render: (_dom, record) => formatMoney(record.workstationCost),
      },
      utilityCost: {
        key: "utilityCost",
        title: "水电",
        render: (_dom, record) => formatMoney(record.utilityCost),
      },
      bankAccountNumber: {
        key: "bankAccountNumber",
        title: "银行卡号",
        dataIndex: "bankAccountNumber",
        render: (_dom, record) => record.bankAccountNumber ?? "-",
      },
      bankName: {
        key: "bankName",
        title: "开户银行",
        dataIndex: "bankName",
        render: (_dom, record) => record.bankName ?? "-",
      },
      bankBranch: {
        key: "bankBranch",
        title: "开户支行",
        dataIndex: "bankBranch",
        render: (_dom, record) => record.bankBranch ?? "-",
      },
      actions: {
        key: "actions",
        title: "操作",
        hideInSetting: true,
        render: (_dom, record) => (
          <TableActions
            onEdit={onEdit ? () => onEdit(record) : undefined}
            onDelete={
              onDelete
                ? () => {
                    onDelete(record.id);
                  }
                : undefined
            }
            deleteTitle={actionDeleteTitle}
            deleteText={actionDeleteText}
          />
        ),
      },
    };

    return columnKeys.map((key) => allColumns[key]);
  }, [employees, functionFilters, roleOptions, onEdit, onDelete, columnKeys, onOptionUpdated, actionDeleteText, actionDeleteTitle]);

  const columnsStateDefaultValue = useMemo(
    () =>
      Object.fromEntries(
        selectedColumns.map((column) => [String(column.key), { show: true }]),
      ),
    [selectedColumns],
  );

  return (
    <ProTable<Employee>
      rowKey="id"
      columns={selectedColumns}
      dataSource={employees}
      loading={loading}
      search={false}
      headerTitle={headerTitle}
      options={{
        reload: false,
        density: false,
        fullScreen: false,
        setting: showColumnSetting
          ? {
              draggable: false,
            }
          : false,
      }}
      cardProps={
        compactHorizontalPadding
          ? {
              styles: {
                body: {
                  paddingInline: 0,
                  paddingBlock: 8,
                },
              },
              bodyStyle: { paddingInline: 0, paddingTop: 0 },
            }
          : undefined
      }
      columnsState={
        columnsStatePersistenceKey
          ? {
              defaultValue: columnsStateDefaultValue,
              persistenceKey: columnsStatePersistenceKey,
              persistenceType: "localStorage",
            }
          : undefined
      }
      pagination={{ pageSize: 10 }}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      toolBarRender={() => toolbarActions}
      locale={{ emptyText: "暂无团队成员" }}
    />
  );
};

export default EmployeesTable;
