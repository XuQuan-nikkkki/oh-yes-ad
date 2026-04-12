"use client";

import { useMemo } from "react";
import { Card, Empty, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DEFAULT_COLOR } from "@/lib/constants";

type EmployeeListItem = {
  id: string;
  name: string;
  function?: string | null;
  functionOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
};

type WeeklyPlannedEntry = {
  id: string;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  task?: {
    id: string;
    name: string;
    owner?: {
      id: string;
      name: string;
    } | null;
    segment?: {
      id: string;
      name: string;
      project?: {
        id: string;
        name: string;
        client?: {
          id: string;
          name: string;
        } | null;
      } | null;
    } | null;
  } | null;
};

type WeeklyTaskItem = {
  clientName: string;
  taskName: string;
};

type WeeklyProjectSummary = {
  projectId: string | null;
  projectName: string;
  days: number;
  tasks: Array<{
    taskId: string | null;
    taskName: string;
    days: number;
  }>;
};

type WeeklyEmployeeRow = {
  key: string;
  name: string;
  hasSchedule: boolean;
  totalDays: number;
  functionLabel: string;
  functionOption: EmployeeListItem["functionOption"];
  projectSummaries: WeeklyProjectSummary[];
  dailyMap: Record<
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday",
    WeeklyTaskItem[]
  >;
};

type WeeklyMetricRow = {
  key:
    | "function"
    | "totalDays"
    | "distribution"
    | "projectTaskDistribution"
    | "dailyTasks";
  metricLabel: string;
};

type Props = {
  loading: boolean;
  employees: EmployeeListItem[];
  entries: WeeklyPlannedEntry[];
  emptyDescription: string;
  noScheduleText: string;
  stateWrapStyle: {
    width: string;
    minWidth: number;
    maxWidth: string;
  };
  stateCardBodyStyle: {
    width: string;
    minHeight: number;
    display: "flex";
    alignItems: "center";
    justifyContent: "center";
  };
};

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  monday: "周一",
  tuesday: "周二",
  wednesday: "周三",
  thursday: "周四",
  friday: "周五",
  saturday: "周六",
  sunday: "周日",
};

const WEEKEND_DAY_KEYS = new Set<(typeof DAY_KEYS)[number]>([
  "saturday",
  "sunday",
]);

const ASCII_INITIAL_RE = /^[A-Za-z0-9]/;
const EN_NAME_COLLATOR = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
const ZH_NAME_COLLATOR = new Intl.Collator("zh-CN-u-co-pinyin", {
  numeric: true,
  sensitivity: "base",
});

const FUNCTION_GROUP_PRIORITY: Record<string, number> = {
  设计组: 1,
  品牌组: 2,
  项目组: 3,
};

const CONDITIONAL_VISIBLE_EMPLOYEES = new Set([
  "Johnny",
  "张弛",
  "小花",
  "Icy",
  "Dona",
]);

const toDisplayDays = (value: number) =>
  `${Number(value.toFixed(2)).toString().replace(/\.0$/, "")}天`;

const compareDisplayNames = (left?: string | null, right?: string | null) => {
  const leftName = left?.trim() ?? "";
  const rightName = right?.trim() ?? "";
  const leftPriority = ASCII_INITIAL_RE.test(leftName) ? 0 : 1;
  const rightPriority = ASCII_INITIAL_RE.test(rightName) ? 0 : 1;

  if (leftPriority !== rightPriority) return leftPriority - rightPriority;

  if (leftPriority === 0) {
    return EN_NAME_COLLATOR.compare(leftName, rightName);
  }

  return ZH_NAME_COLLATOR.compare(leftName, rightName);
};

const WeeklyTasksPanel = ({
  loading,
  employees,
  entries,
  emptyDescription,
  noScheduleText,
  stateWrapStyle,
  stateCardBodyStyle,
}: Props) => {
  const activeEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.employmentStatus !== "离职" &&
          employee.employmentStatusOption?.value !== "离职",
      ),
    [employees],
  );

  const weeklyEntriesByEmployee = useMemo(() => {
    const map = new Map<string, WeeklyPlannedEntry[]>();
    for (const entry of entries) {
      const ownerId = entry.task?.owner?.id;
      if (!ownerId) continue;
      const list = map.get(ownerId) ?? [];
      list.push(entry);
      map.set(ownerId, list);
    }
    return map;
  }, [entries]);

  const weeklyRows = useMemo(() => {
    const rows = activeEmployees
      .map((employee) => {
        const employeeEntries = weeklyEntriesByEmployee.get(employee.id) ?? [];
        const totalDays = employeeEntries.reduce(
          (sum, entry) => sum + (entry.plannedDays ?? 0),
          0,
        );
        const dailyMap: Record<(typeof DAY_KEYS)[number], WeeklyTaskItem[]> = {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };
        const projectMap = new Map<string, WeeklyProjectSummary>();

        for (const entry of employeeEntries) {
          const clientName =
            entry.task?.segment?.project?.client?.name ?? "内部项目";
          const taskName = entry.task?.name ?? "未命名任务";
          const projectId =
            entry.task?.segment?.project?.id ?? "unknown-project";
          const projectName =
            entry.task?.segment?.project?.name ?? "未命名项目";
          const days = entry.plannedDays ?? 0;

          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              projectId: entry.task?.segment?.project?.id ?? null,
              projectName,
              days: 0,
              tasks: [],
            });
          }

          const projectSummary = projectMap.get(projectId)!;
          projectSummary.days += days;
          const taskId = entry.task?.id ?? null;
          const existingTask = projectSummary.tasks.find(
            (task) => task.taskId === taskId,
          );

          if (existingTask) {
            existingTask.days += days;
          } else {
            projectSummary.tasks.push({
              taskId,
              taskName,
              days,
            });
          }

          for (const dayKey of DAY_KEYS) {
            if (entry[dayKey]) {
              dailyMap[dayKey].push({ clientName, taskName });
            }
          }
        }

        const hasSchedule =
          totalDays > 0 ||
          DAY_KEYS.some((dayKey) => dailyMap[dayKey].length > 0);
        const functionLabel =
          employee.functionOption?.value?.trim() ||
          employee.function?.trim() ||
          "未设置职能";
        const projectSummaries = Array.from(projectMap.values()).sort(
          (left, right) => right.days - left.days,
        );

        return {
          key: employee.id,
          name: employee.name,
          hasSchedule,
          totalDays,
          functionLabel,
          functionOption: employee.functionOption ?? null,
          projectSummaries,
          dailyMap,
        } as WeeklyEmployeeRow;
      })
      .filter((row) => {
        const shouldHideWhenNoSchedule =
          CONDITIONAL_VISIBLE_EMPLOYEES.has(row.name) ||
          row.name.includes("外协");
        if (!shouldHideWhenNoSchedule) {
          return true;
        }
        return row.hasSchedule;
      });

    return rows.sort((left, right) => {
      const leftPriority = FUNCTION_GROUP_PRIORITY[left.functionLabel] ?? 999;
      const rightPriority = FUNCTION_GROUP_PRIORITY[right.functionLabel] ?? 999;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      const functionCompare = left.functionLabel.localeCompare(
        right.functionLabel,
        "zh-CN",
      );
      if (functionCompare !== 0) return functionCompare;

      if (left.hasSchedule !== right.hasSchedule) {
        return left.hasSchedule ? -1 : 1;
      }

      return compareDisplayNames(left.name, right.name);
    });
  }, [activeEmployees, weeklyEntriesByEmployee]);

  const weeklyMetricRows: WeeklyMetricRow[] = [
    { key: "function", metricLabel: "职能" },
    { key: "totalDays", metricLabel: "总工时" },
    { key: "distribution", metricLabel: "工时分布" },
    { key: "projectTaskDistribution", metricLabel: "项目 & 任务分布" },
    { key: "dailyTasks", metricLabel: "每日任务情况" },
  ];

  const renderWeeklyEmployeeMetric = (
    employeeRow: WeeklyEmployeeRow,
    metricKey: WeeklyMetricRow["key"],
  ) => {
    if (metricKey === "function") {
      return (
        <Tag color={employeeRow.functionOption?.color ?? "default"}>
          {employeeRow.functionOption?.value ?? employeeRow.functionLabel}
        </Tag>
      );
    }

    if (metricKey === "totalDays") {
      return employeeRow.hasSchedule ? (
        <Typography.Text style={{ fontSize: 12 }}>
          {toDisplayDays(employeeRow.totalDays)}
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          -
        </Typography.Text>
      );
    }

    if (metricKey === "distribution") {
      return employeeRow.hasSchedule ? (
        <Space wrap size={[4, 4]}>
          {DAY_KEYS.map((dayKey) => {
            const hasTasks = employeeRow.dailyMap[dayKey].length > 0;
            if (WEEKEND_DAY_KEYS.has(dayKey) && !hasTasks) {
              return null;
            }
            return (
              <Tag
                key={`${employeeRow.key}-${dayKey}`}
                color={hasTasks ? "green" : undefined}
                style={{
                  marginInlineEnd: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: "14px",
                  padding: "0 4px",
                  ...(hasTasks
                    ? {}
                    : {
                        color: DEFAULT_COLOR,
                        background: "#f5f5f5",
                        borderColor: "#f0f0f0",
                      }),
                }}
              >
                {DAY_LABELS[dayKey]}
              </Tag>
            );
          })}
        </Space>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          -
        </Typography.Text>
      );
    }

    if (metricKey === "projectTaskDistribution") {
      return employeeRow.hasSchedule ? (
        employeeRow.projectSummaries.length === 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            未安排任务
          </Typography.Text>
        ) : (
          <Space orientation="vertical" size={2} style={{ width: "100%" }}>
            {employeeRow.projectSummaries.map((projectSummary) => (
              <div key={`${employeeRow.key}-${projectSummary.projectName}`}>
                <Space wrap size={[6, 6]}>
                  <Tag
                    color="brown"
                    style={{
                      marginInlineEnd: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: "14px",
                      padding: "0 6px",
                    }}
                  >
                    {projectSummary.projectName}
                  </Tag>
                  <Tag
                    color="processing"
                    style={{
                      marginInlineEnd: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: "14px",
                      padding: "0 4px",
                    }}
                  >
                    {toDisplayDays(projectSummary.days)}
                  </Tag>
                </Space>
                <div style={{ marginTop: 1, lineHeight: "14px" }}>
                  {projectSummary.tasks.map((task) => (
                    <div key={task.taskId}>
                      <Typography.Text
                        style={{
                          fontSize: 12,
                          paddingLeft: 10,
                          fontWeight: 500,
                        }}
                      >
                        - {task.taskName}{" "}
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            fontSize: 10,
                            lineHeight: "14px",
                            padding: "0 4px",
                            fontWeight: 600,
                          }}
                          color="gold"
                        >
                          {toDisplayDays(task.days)}
                        </Tag>
                      </Typography.Text>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Space>
        )
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          -
        </Typography.Text>
      );
    }

    return employeeRow.hasSchedule ? (
      <div>
        {DAY_KEYS.filter((dayKey) => {
          const tasks = employeeRow.dailyMap[dayKey];
          return !(WEEKEND_DAY_KEYS.has(dayKey) && tasks.length === 0);
        }).map((dayKey) => {
          const tasks = employeeRow.dailyMap[dayKey];
          return (
            <div key={`${employeeRow.key}-daily-${dayKey}`}>
              <Tag
                color={tasks.length ? "green" : "default"}
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {DAY_LABELS[dayKey]}
              </Tag>
              {tasks.length === 0 ? (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    - 未安排任务
                  </Typography.Text>
                </div>
              ) : (
                tasks.map((item, index) => (
                  <div
                    key={`${employeeRow.key}-${dayKey}-${item.clientName}-${item.taskName}-${index}`}
                    style={{ lineHeight: "14px" }}
                  >
                    <Typography.Text style={{ fontSize: 12 }}>
                      - [{item.clientName}] {item.taskName}
                    </Typography.Text>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <Typography.Text
        type="secondary"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {noScheduleText}
      </Typography.Text>
    );
  };

  const weeklyColumns: ColumnsType<WeeklyMetricRow> = [
    {
      title: "维度",
      dataIndex: "metricLabel",
      fixed: "left",
      width: 120,
      render: (value: string) => (
        <Typography.Text strong style={{ fontSize: 12 }}>
          {value}
        </Typography.Text>
      ),
    },
    ...weeklyRows.map((employeeRow) => ({
      title: employeeRow.name,
      dataIndex: employeeRow.key,
      key: employeeRow.key,
      width: 260,
      render: (_value: unknown, metricRow: WeeklyMetricRow) =>
        renderWeeklyEmployeeMetric(employeeRow, metricRow.key),
    })),
  ];

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      {loading ? (
        <div style={stateWrapStyle}>
          <Card style={stateWrapStyle} styles={{ body: stateCardBodyStyle }}>
            <Spin />
          </Card>
        </div>
      ) : weeklyRows.length === 0 ? (
        <div style={stateWrapStyle}>
          <Card style={stateWrapStyle} styles={{ body: stateCardBodyStyle }}>
            <Empty description={emptyDescription} />
          </Card>
        </div>
      ) : (
        <Table
          rowKey="key"
          columns={weeklyColumns}
          dataSource={weeklyMetricRows}
          pagination={false}
          tableLayout="auto"
          scroll={{ x: "max-content" }}
        />
      )}
    </Space>
  );
};

export default WeeklyTasksPanel;
