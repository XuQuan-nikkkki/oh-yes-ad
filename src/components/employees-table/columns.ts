import type { ProColumns } from "@ant-design/pro-components";
import { createActionColumn } from "./actionColumn";
import { createBasicColumns } from "./basicColumns";
import type { EmployeeColumnContext, EmployeeColumnMap } from "./columnTypes";
import { createFinanceColumns } from "./financeColumns";
import { createOptionColumns } from "./optionColumns";
import type { Employee, EmployeeColumnKey, RoleOption } from "./types";
import { positionViewColumnWidths } from "./utils";

type BuildEmployeeColumnsParams = EmployeeColumnContext & {
  columnKeys: EmployeeColumnKey[];
};

const withPositionWidths = (columns: ProColumns<Employee>[]) =>
  columns.map((column) => {
    const key = String(column.key) as EmployeeColumnKey;
    if (column.width || !positionViewColumnWidths[key]) return column;
    return {
      ...column,
      width: positionViewColumnWidths[key],
    };
  });

const createColumnMap = (
  context: EmployeeColumnContext,
): Record<EmployeeColumnKey, ProColumns<Employee>> => ({
  ...createBasicColumns(context),
  ...createOptionColumns(context),
  ...createFinanceColumns(),
  ...createActionColumn(context),
}) as Record<EmployeeColumnKey, ProColumns<Employee>>;

export const buildEmployeeColumns = ({
  columnKeys,
  ...context
}: BuildEmployeeColumnsParams): ProColumns<Employee>[] => {
  const allColumns = createColumnMap(context);
  const selectedColumns = columnKeys.map((key) => allColumns[key]);
  if (!context.isPositionView) return selectedColumns;
  return withPositionWidths(selectedColumns);
};

export type { Employee, EmployeeColumnKey, EmployeeColumnMap, RoleOption };
