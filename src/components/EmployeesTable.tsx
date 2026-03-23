"use client";

import { useCallback, useMemo } from "react";
import { Space, Tag } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import EmployeeFunctionValue from "@/components/employee/EmployeeFunctionValue";
import { formatDate } from "@/lib/date";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

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
  | "phone"
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
  actionsDisabled?: boolean;
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
  actionsDisabled = false,
  actionDeleteText = "删除",
  actionDeleteTitle = "确定删除这个团队成员？",
  onOptionUpdated,
  toolbarActions = [],
  columnsStatePersistenceKey,
  headerTitle = <ProTableHeaderTitle>团队成员</ProTableHeaderTitle>,
  showColumnSetting = true,
  compactHorizontalPadding = false,
}: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canEditEmployeeOptions =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("PROJECT_MANAGER") ||
    roleCodes.includes("HR");
  const effectiveColumnKeys = useMemo(
    () =>
      actionsDisabled || (!onEdit && !onDelete)
        ? columnKeys.filter((key) => key !== "actions")
        : columnKeys,
    [actionsDisabled, columnKeys, onDelete, onEdit],
  );

  const normalizeOption = (
    option?:
      | {
          id?: string;
          value?: string | null;
          color?: string | null;
        }
      | null,
  ) => {
    if (!option?.id || !option.value) return null;
    return {
      id: option.id,
      value: option.value,
      color: option.color ?? null,
    };
  };

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

  const renderEditableOption = useCallback((
    employeeId: string,
    field:
      | "employee.departmentLevel1"
      | "employee.departmentLevel2"
      | "employee.position"
      | "employee.employmentType"
      | "employee.employmentStatus",
    payloadKey:
      | "departmentLevel1"
      | "departmentLevel2"
      | "position"
      | "employmentType"
      | "employmentStatus",
    option:
      | {
          id?: string;
          value?: string | null;
          color?: string | null;
        }
      | null
      | undefined,
    fallbackText = "-",
    label = "选项",
  ) => {
    const normalizedOption = normalizeOption(option);

    return (
      <SelectOptionQuickEditTag
        field={field}
        option={normalizedOption ?? null}
        fallbackText={fallbackText}
        disabled={!canEditEmployeeOptions}
        modalTitle={`修改${label}`}
        optionValueLabel={label}
        saveSuccessText={`${label}已保存`}
        onSaveSelection={async (nextOption) => {
          const res = await fetch(`/api/employees/${employeeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [payloadKey]: nextOption }),
          });
          if (!res.ok) {
            throw new Error((await res.text()) || "更新失败");
          }
        }}
        onUpdated={onOptionUpdated}
      />
    );
  }, [canEditEmployeeOptions, onOptionUpdated]);

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
      phone: {
        key: "phone",
        title: "手机号",
        dataIndex: "phone",
        render: (_dom, record) => record.phone ?? "-",
      },
      function: {
        key: "function",
        title: "职能",
        dataIndex: "function",
        filters: functionFilters,
        onFilter: (value, record) => record.function === value,
        render: (_dom, record) =>
          (
            <EmployeeFunctionValue
              employeeId={record.id}
              functionOption={normalizeOption(record.functionOption)}
              fallbackText={record.function ?? "-"}
              onUpdated={onOptionUpdated}
            />
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
          renderEditableOption(
            record.id,
            "employee.departmentLevel1",
            "departmentLevel1",
            record.departmentLevel1Option,
            record.departmentLevel1 ?? "-",
            "一级部门",
          ),
      },
      departmentLevel2: {
        key: "departmentLevel2",
        title: "二级部门",
        render: (_dom, record) =>
          renderEditableOption(
            record.id,
            "employee.departmentLevel2",
            "departmentLevel2",
            record.departmentLevel2Option,
            record.departmentLevel2 ?? "-",
            "二级部门",
          ),
      },
      position: {
        key: "position",
        title: "职位",
        render: (_dom, record) =>
          renderEditableOption(
            record.id,
            "employee.position",
            "position",
            record.positionOption,
            record.position ?? "-",
            "职位",
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
          renderEditableOption(
            record.id,
            "employee.employmentType",
            "employmentType",
            record.employmentTypeOption,
            record.employmentType ?? "-",
            "用工性质",
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
          renderEditableOption(
            record.id,
            "employee.employmentStatus",
            "employmentStatus",
            record.employmentStatusOption,
            record.employmentStatus ?? "-",
            "用工状态",
          ),
      },
      entryDate: {
        key: "entryDate",
        title: "入职日期",
        render: (_dom, record) => formatDate(record.entryDate),
      },
      leaveDate: {
        key: "leaveDate",
        title: "离职日期",
        render: (_dom, record) => formatDate(record.leaveDate),
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
            disabled={actionsDisabled}
            deleteTitle={actionDeleteTitle}
            deleteText={actionDeleteText}
          />
        ),
      },
    };

    return effectiveColumnKeys.map((key) => allColumns[key]);
  }, [employees, functionFilters, roleOptions, onEdit, onDelete, effectiveColumnKeys, onOptionUpdated, actionDeleteText, actionDeleteTitle, renderEditableOption, actionsDisabled]);

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
              bodyStyle: { paddingInline: 0, paddingTop: 0, paddingBlock: 8 },
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
