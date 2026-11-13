import type { DefaultOptionType } from "antd/es/select";

type EmployeeLike = {
  id: string;
  name: string;
  function?: string | null;
  functionOption?: {
    value?: string | null;
  } | null;
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

export const buildFunctionGroupedEmployeeOptions = (
  employees: EmployeeLike[],
  options?: {
    excludedEmployeeIds?: Iterable<string>;
    preferredFunctionName?: string | null;
  },
) => {
  const excludedEmployeeIds = new Set(options?.excludedEmployeeIds ?? []);
  const groups = new Map<string, Array<{ label: string; value: string }>>();

  employees.forEach((employee) => {
    if (!isEmployeeActive(employee) || excludedEmployeeIds.has(employee.id)) return;
    const functionName =
      employee.functionOption?.value?.trim() ||
      employee.function?.trim() ||
      "未设置职能";
    const group = groups.get(functionName) ?? [];
    group.push({ label: employee.name, value: employee.id });
    groups.set(functionName, group);
  });

  const preferredFunctionName = options?.preferredFunctionName?.trim();
  return Array.from(groups.entries())
    .map(([label, groupOptions]) => ({
      label,
      options: groupOptions.sort(compareByLabel),
    }))
    .sort((left, right) => {
      if (preferredFunctionName) {
        if (left.label === preferredFunctionName) return -1;
        if (right.label === preferredFunctionName) return 1;
      }
      return left.label.localeCompare(right.label, "zh-CN");
    }) satisfies DefaultOptionType[];
};

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
