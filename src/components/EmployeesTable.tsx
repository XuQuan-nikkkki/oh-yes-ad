"use client";

import { useMemo } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { buildEmployeeColumns } from "./employees-table/columns";
import type {
  Employee,
  EmployeeColumnKey,
  EmployeesTableProps,
  RoleOption,
} from "./employees-table/types";

export type { Employee, EmployeeColumnKey, RoleOption };

const EmployeesTable = ({
  employees,
  roleOptions,
  columnKeys,
  viewMode = "basic",
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
}: EmployeesTableProps) => {
  const effectiveColumnKeys = useMemo(
    () =>
      actionsDisabled || (!onEdit && !onDelete)
        ? columnKeys.filter((key) => key !== "actions")
        : columnKeys,
    [actionsDisabled, columnKeys, onDelete, onEdit],
  );
  const isPositionView = viewMode === "position";

  const selectedColumns = useMemo<ProColumns<Employee>[]>(
    () =>
      buildEmployeeColumns({
        employees,
        roleOptions,
        columnKeys: effectiveColumnKeys,
        isPositionView,
        actionsDisabled,
        actionDeleteText,
        actionDeleteTitle,
        onEdit,
        onDelete,
        onOptionUpdated,
      }),
    [
      employees,
      roleOptions,
      effectiveColumnKeys,
      isPositionView,
      actionsDisabled,
      actionDeleteText,
      actionDeleteTitle,
      onEdit,
      onDelete,
      onOptionUpdated,
    ],
  );

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
      pagination={false}
      tableLayout={isPositionView ? "fixed" : "auto"}
      scroll={{ x: "max-content" }}
      toolBarRender={() => toolbarActions}
      locale={{ emptyText: "暂无团队成员" }}
    />
  );
};

export default EmployeesTable;
