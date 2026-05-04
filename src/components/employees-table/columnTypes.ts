import type { ProColumns } from "@ant-design/pro-components";
import type { Employee, EmployeeColumnKey, RoleOption } from "./types";

export type EmployeeColumnMap = Partial<
  Record<EmployeeColumnKey, ProColumns<Employee>>
>;

export type EmployeeColumnContext = {
  employees: Employee[];
  roleOptions: RoleOption[];
  isPositionView: boolean;
  actionsDisabled: boolean;
  actionDeleteText: string;
  actionDeleteTitle: string;
  onEdit?: (employee: Employee) => void;
  onDelete?: (id: string) => void;
  onOptionUpdated?: () => void | Promise<void>;
};
