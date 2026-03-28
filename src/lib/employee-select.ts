import type { DefaultOptionType } from "antd/es/select";

type EmployeeLike = {
  id: string;
  name: string;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    value?: string | null;
  } | null;
};

type PreservedEmployeeLike = {
  id?: string | null;
  name?: string | null;
};

const compareByLabel = (
  left: { label: string },
  right: { label: string },
) => left.label.localeCompare(right.label, "zh-CN");

export const isEmployeeActive = (employee: EmployeeLike) =>
  employee.employmentStatus !== "离职" &&
  employee.employmentStatusOption?.value !== "离职";

export const buildEmployeeLabelMap = (
  employees: EmployeeLike[],
  preservedEmployees: PreservedEmployeeLike[] = [],
) => {
  const map = new Map<string, string>();
  employees.forEach((employee) => {
    map.set(employee.id, employee.name);
  });
  preservedEmployees.forEach((employee) => {
    if (employee.id && employee.name) {
      map.set(employee.id, employee.name);
    }
  });
  return map;
};

export const buildFlatEmployeeOptions = (employees: EmployeeLike[]) =>
  employees
    .filter(isEmployeeActive)
    .map((employee) => ({
      label: employee.name,
      value: employee.id,
    }))
    .sort(compareByLabel);

export const buildGroupedEmployeeOptions = (
  employees: EmployeeLike[],
  projectMemberIds: Iterable<string>,
) => {
  const projectMemberIdSet = new Set(projectMemberIds);
  const activeEmployees = employees.filter(isEmployeeActive);

  const projectInsideOptions = activeEmployees
    .filter((employee) => projectMemberIdSet.has(employee.id))
    .map((employee) => ({
      label: employee.name,
      value: employee.id,
    }))
    .sort(compareByLabel);

  const projectOutsideOptions = activeEmployees
    .filter((employee) => !projectMemberIdSet.has(employee.id))
    .map((employee) => ({
      label: employee.name,
      value: employee.id,
    }))
    .sort(compareByLabel);

  return [
    {
      label: "项目内",
      options: projectInsideOptions,
    },
    {
      label: "项目外",
      options: projectOutsideOptions,
    },
  ].filter((group) => group.options.length > 0) satisfies DefaultOptionType[];
};

export const renderEmployeeSelectedLabel =
  (labelMap: Map<string, string>) =>
  ({ value }: { value?: string | number }) => {
    if (value == null) return "";
    return labelMap.get(String(value)) ?? String(value);
  };
