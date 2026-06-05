import type { DefaultOptionType } from "antd/es/select";

type EmployeeLike = {
  id: string;
  name?: string | null;
  function?: string | null;
  employmentStatus?: string | null;
};

type ProjectMemberLike = {
  id: string;
  name?: string | null;
  function?: string | null;
  employmentStatus?: string | null;
};

const isActiveEmployee = (employee: {
  employmentStatus?: string | null;
}) => (employee.employmentStatus ?? "").includes("在职");

const normalizeName = (value?: string | null) => value?.trim() ?? "";

const normalizeFunction = (value?: string | null) => value?.trim() || "未设置职能";

const sortByLabel = (
  left: { label: string },
  right: { label: string },
) => left.label.localeCompare(right.label, "zh-CN");

export const buildPlanOwnerOptions = ({
  allEmployees,
  projectMembers,
}: {
  allEmployees: EmployeeLike[];
  projectMembers: ProjectMemberLike[];
}): DefaultOptionType[] => {
  const projectMemberIds = new Set(
    projectMembers.filter(isActiveEmployee).map((member) => member.id),
  );

  const projectGroupOptions = projectMembers
    .filter(
      (member) =>
        isActiveEmployee(member) && Boolean(member.id && normalizeName(member.name)),
    )
    .map((member) => ({
      label: normalizeName(member.name),
      value: member.id,
    }))
    .sort(sortByLabel);

  const groupedEmployees = new Map<string, Array<{ label: string; value: string }>>();

  allEmployees.forEach((employee) => {
    const name = normalizeName(employee.name);
    if (!employee.id || !name || !isActiveEmployee(employee)) return;
    if (projectMemberIds.has(employee.id)) return;

    const functionLabel = normalizeFunction(employee.function);
    const group = groupedEmployees.get(functionLabel) ?? [];
    group.push({
      label: name,
      value: employee.id,
    });
    groupedEmployees.set(functionLabel, group);
  });

  const groupedOptions = Array.from(groupedEmployees.entries())
    .map(([label, options]) => ({
      label,
      options: options.sort(sortByLabel),
    }))
    .sort((left, right) =>
      String(left.label).localeCompare(String(right.label), "zh-CN"),
    );

  if (projectGroupOptions.length === 0) {
    return groupedOptions;
  }

  return [
    {
      label: "项目组",
      options: projectGroupOptions,
    },
    ...groupedOptions,
  ];
};
