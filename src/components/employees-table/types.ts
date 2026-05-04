import type { ReactNode } from "react";

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
  functionOption?: EmployeeOption | null;
  position?: string | null;
  positionOption?: EmployeeOption | null;
  level?: string | null;
  departmentLevel1?: string | null;
  departmentLevel1Option?: EmployeeOption | null;
  departmentLevel2?: string | null;
  departmentLevel2Option?: EmployeeOption | null;
  employmentType?: string | null;
  employmentTypeOption?: EmployeeOption | null;
  employmentStatus?: string | null;
  employmentStatusOption?: EmployeeOption | null;
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

export type EmployeeOption = {
  id?: string;
  value?: string | null;
  color?: string | null;
};

export type RoleOption = {
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

export type EmployeesTableProps = {
  employees: Employee[];
  roleOptions: RoleOption[];
  columnKeys: EmployeeColumnKey[];
  viewMode?: "basic" | "position";
  loading?: boolean;
  onEdit?: (employee: Employee) => void;
  onDelete?: (id: string) => void;
  actionsDisabled?: boolean;
  actionDeleteText?: string;
  actionDeleteTitle?: string;
  onOptionUpdated?: () => void | Promise<void>;
  toolbarActions?: ReactNode[];
  columnsStatePersistenceKey?: string;
  headerTitle?: ReactNode;
  showColumnSetting?: boolean;
  compactHorizontalPadding?: boolean;
};
