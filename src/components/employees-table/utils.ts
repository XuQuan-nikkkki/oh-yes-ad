import type { Employee, EmployeeColumnKey, EmployeeOption } from "./types";

export const positionViewColumnWidths: Partial<Record<EmployeeColumnKey, number>> = {
  name: 120,
  fullName: 160,
  phone: 140,
  function: 140,
  legalEntity: 180,
  departmentLevel1: 140,
  departmentLevel2: 140,
  position: 120,
  level: 100,
  employmentType: 120,
  employmentStatus: 120,
  entryDate: 130,
  leaveDate: 130,
  salary: 120,
  socialSecurity: 120,
  providentFund: 120,
  workstationCost: 120,
  utilityCost: 120,
  bankAccountNumber: 180,
  bankName: 160,
  bankBranch: 160,
  actions: 132,
};

export const normalizeOption = (option?: EmployeeOption | null) => {
  if (!option?.id || !option.value) return null;
  return {
    id: option.id,
    value: option.value,
    color: option.color ?? null,
  };
};

export const formatMoney = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

export const getFunctionFilters = (employees: Employee[]) =>
  Array.from(
    new Set(
      employees
        .map((item) => item.function)
        .filter((item): item is string => Boolean(item)),
    ),
  ).map((item) => ({
    text: item,
    value: item,
  }));
