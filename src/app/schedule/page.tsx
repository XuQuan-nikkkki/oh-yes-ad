"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Empty, Segmented, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClockCircleOutlined } from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";

type ProjectListItem = {
  id: string;
  name: string;
};

type Participant = {
  id: string;
  name: string;
};

type ClientParticipant = {
  id: string;
  name: string;
  title?: string | null;
};

type PlannedWorkEntry = {
  id: string;
  year: number;
  weekNumber: number;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

type ProjectDetail = {
  id: string;
  name: string;
  milestones?: {
    id: string;
    name: string;
    type?: string | null;
    date?: string | null;
    internalParticipants?: Participant[];
    clientParticipants?: ClientParticipant[];
    vendorParticipants?: Participant[];
  }[];
  segments?: {
    id: string;
    name: string;
    status?: string | null;
    dueDate?: string | null;
    owner?: {
      id: string;
      name: string;
    } | null;
    projectTasks?: {
      id: string;
      name: string;
      status?: string | null;
      dueDate?: string | null;
      owner?: {
        id: string;
        name: string;
      } | null;
      plannedWorkEntries?: PlannedWorkEntry[];
    }[];
  }[];
};

type SegmentRow = {
  id: string;
  name: string;
  status?: string | null;
  ownerName: string;
  dueDate?: string | null;
};

type TaskRow = {
  id: string;
  segmentName: string;
  name: string;
  status?: string | null;
  ownerName: string;
  dueDate?: string | null;
};

type WorkRow = {
  id: string;
  taskName: string;
  ownerName: string;
  year: number;
  weekNumber: number;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format("YYYY/MM/DD") : "-";

const formatCountdown = (value?: string | null) => {
  if (!value) {
    return { text: "暂无日期", urgent: false };
  }
  const target = dayjs(value).startOf("day");
  const today = dayjs().startOf("day");
  const diffDays = target.diff(today, "day");
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[target.day()];

  if (diffDays < 0) {
    return {
      text: `${target.format("YYYY年MM月DD日")} ${weekday}，已超期 ${Math.abs(diffDays)} 天`,
      urgent: true,
    };
  }

  if (diffDays === 0) {
    return {
      text: `${target.format("YYYY年MM月DD日")} ${weekday}，今天`,
      urgent: true,
    };
  }

  return {
    text: `${target.format("YYYY年MM月DD日")} ${weekday}，还有 ${diffDays} 天`,
    urgent: diffDays <= 3,
  };
};

const renderPeople = (participants?: Participant[]) =>
  participants && participants.length > 0
    ? participants.map((person) => person.name).join("、")
    : "-";

const renderClientPeople = (participants?: ClientParticipant[]) =>
  participants && participants.length > 0
    ? participants
        .map((person) => (person.title ? `${person.name}(${person.title})` : person.name))
        .join("、")
    : "-";

export default function SchedulePage() {
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [allProjects, setAllProjects] = useState<ProjectListItem[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<string, ProjectDetail>>({});
  const [tableView, setTableView] = useState<"segments" | "tasks" | "work">("segments");

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        const data = (await response.json()) as ProjectListItem[];
        setAllProjects(Array.isArray(data) ? data : []);
      } finally {
        setLoadingProjects(false);
      }
    };

    void fetchProjects();
  }, []);

  const ningjiProjects = useMemo(
    () => allProjects.filter((project) => project.name.includes("柠季")),
    [allProjects],
  );

  useEffect(() => {
    const fetchNingjiDetails = async () => {
      if (ningjiProjects.length === 0) {
        setProjectDetails({});
        return;
      }

      setLoadingDetails(true);
      try {
        const results = await Promise.all(
          ningjiProjects.map(async (project) => {
            const response = await fetch(`/api/projects/${project.id}`, { cache: "no-store" });
            const detail = (await response.json()) as ProjectDetail;
            return [project.id, detail] as const;
          }),
        );

        setProjectDetails(Object.fromEntries(results));
      } finally {
        setLoadingDetails(false);
      }
    };

    void fetchNingjiDetails();
  }, [ningjiProjects]);

  const segmentColumns: ColumnsType<SegmentRow> = [
    {
      title: "环节名称",
      dataIndex: "name",
      width: "35%",
    },
    {
      title: "环节状态",
      dataIndex: "status",
      width: "20%",
      render: (value?: string | null) => value ?? "-",
    },
    {
      title: "环节负责人",
      dataIndex: "ownerName",
      width: "20%",
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: "25%",
      render: (value?: string | null) => formatDate(value),
    },
  ];

  const taskColumns: ColumnsType<TaskRow> = [
    {
      title: "所属环节",
      dataIndex: "segmentName",
      width: "26%",
    },
    {
      title: "任务名称",
      dataIndex: "name",
      width: "28%",
    },
    {
      title: "任务状态",
      dataIndex: "status",
      width: "14%",
      render: (value?: string | null) => value ?? "-",
    },
    {
      title: "任务负责人",
      dataIndex: "ownerName",
      width: "16%",
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: "16%",
      render: (value?: string | null) => formatDate(value),
    },
  ];

  const workColumns: ColumnsType<WorkRow> = [
    {
      title: "任务",
      dataIndex: "taskName",
      width: 240,
      fixed: "left",
    },
    {
      title: "任务责任人",
      dataIndex: "ownerName",
      width: 140,
      fixed: "left",
    },
    {
      title: "年份",
      dataIndex: "year",
      width: 100,
    },
    {
      title: "周数",
      dataIndex: "weekNumber",
      width: 90,
    },
    {
      title: "计划天数",
      dataIndex: "plannedDays",
      width: 110,
    },
    {
      title: "一",
      dataIndex: "monday",
      width: 70,
      align: "center",
      render: (value: boolean) => (value ? "✓" : "-"),
    },
    {
      title: "二",
      dataIndex: "tuesday",
      width: 70,
      align: "center",
      render: (value: boolean) => (value ? "✓" : "-"),
    },
    {
      title: "三",
      dataIndex: "wednesday",
      width: 70,
      align: "center",
      render: (value: boolean) => (value ? "✓" : "-"),
    },
    {
      title: "四",
      dataIndex: "thursday",
      width: 70,
      align: "center",
      render: (value: boolean) => (value ? "✓" : "-"),
    },
    {
      title: "五",
      dataIndex: "friday",
      width: 70,
      align: "center",
      render: (value: boolean) => (value ? "✓" : "-"),
    },
    {
      title: "六",
      dataIndex: "saturday",
      width: 70,
      align: "center",
      render: (value: boolean) => (value ? "✓" : "-"),
    },
    {
      title: "日",
      dataIndex: "sunday",
      width: 70,
      align: "center",
      render: (value: boolean) => (value ? "✓" : "-"),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space orientation="vertical" size={4} style={{ width: "100%" }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            项目排期
          </Typography.Title>
          <Typography.Text type="secondary">
            已加载全部项目 {allProjects.length} 个，当前示例展示名称包含“柠季”的项目。
          </Typography.Text>
        </Space>
      </Card>

      {loadingProjects ? (
        <Card>
          <Spin />
        </Card>
      ) : ningjiProjects.length === 0 ? (
        <Card>
          <Empty description="未找到名称包含“柠季”的项目" />
        </Card>
      ) : (
        ningjiProjects.map((project) => {
          const detail = projectDetails[project.id];

          const segmentRows: SegmentRow[] =
            detail?.segments?.map((segment) => ({
              id: segment.id,
              name: segment.name,
              status: segment.status,
              ownerName: segment.owner?.name ?? "-",
              dueDate: segment.dueDate,
            })) ?? [];

          const taskRows: TaskRow[] =
            detail?.segments?.flatMap((segment) =>
              (segment.projectTasks ?? []).map((task) => ({
                id: task.id,
                segmentName: segment.name,
                name: task.name,
                status: task.status,
                ownerName: task.owner?.name ?? "-",
                dueDate: task.dueDate,
              })),
            ) ?? [];

          const workRows: WorkRow[] =
            detail?.segments?.flatMap((segment) =>
              (segment.projectTasks ?? []).flatMap((task) =>
                (task.plannedWorkEntries ?? []).map((entry) => ({
                  id: entry.id,
                  taskName: task.name,
                  ownerName: task.owner?.name ?? "-",
                  year: entry.year,
                  weekNumber: entry.weekNumber,
                  plannedDays: entry.plannedDays,
                  monday: entry.monday,
                  tuesday: entry.tuesday,
                  wednesday: entry.wednesday,
                  thursday: entry.thursday,
                  friday: entry.friday,
                  saturday: entry.saturday,
                  sunday: entry.sunday,
                })),
              ),
            ) ?? [];

          return (
            <Card key={project.id} title={project.name} loading={loadingDetails && !detail}>
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  项目里程碑
                </Typography.Title>

                {!detail?.milestones ||
                detail.milestones.filter((milestone) => {
                  if (!milestone.date) return false;
                  return !dayjs(milestone.date).startOf("day").isBefore(dayjs().startOf("day"), "day");
                }).length === 0 ? (
                  <Empty description="暂无里程碑" />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {detail.milestones
                      .filter((milestone) => {
                        if (!milestone.date) return false;
                        return !dayjs(milestone.date).startOf("day").isBefore(dayjs().startOf("day"), "day");
                      })
                      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
                      .map((milestone) => {
                      const countdown = formatCountdown(milestone.date);
                      return (
                        <Link
                          key={milestone.id}
                          href={`/project-milestones/${milestone.id}`}
                          style={{ color: "inherit" }}
                        >
                          <Card hoverable size="small" style={{ borderRadius: 16 }}>
                            <Space
                              orientation="vertical"
                              size={12}
                              style={{ width: "100%", fontSize: 12 }}
                            >
                              <Space size={10} align="start">
                                <Typography.Text style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                                  {milestone.name}
                                </Typography.Text>
                              </Space>

                              <Tag color="blue" style={{ width: "fit-content", margin: 0, fontSize: 12 }}>
                                {milestone.type || "未分类"}
                              </Tag>

                              {milestone.clientParticipants && milestone.clientParticipants.length > 0 ? (
                                <div>
                                  <Tag
                                    color="red"
                                    style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                                  >
                                    客户人员
                                  </Tag>
                                  <Typography.Text style={{ display: "block", fontSize: 12 }}>
                                    {renderClientPeople(milestone.clientParticipants)}
                                  </Typography.Text>
                                </div>
                              ) : null}

                              {milestone.internalParticipants && milestone.internalParticipants.length > 0 ? (
                                <div>
                                  <Tag
                                    color="red"
                                    style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                                  >
                                    项目人员
                                  </Tag>
                                  <Typography.Text style={{ display: "block", fontSize: 12 }}>
                                    {renderPeople(milestone.internalParticipants)}
                                  </Typography.Text>
                                </div>
                              ) : null}

                              {milestone.vendorParticipants && milestone.vendorParticipants.length > 0 ? (
                                <div>
                                  <Tag
                                    color="red"
                                    style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                                  >
                                    供应商
                                  </Tag>
                                  <Typography.Text style={{ display: "block", fontSize: 12 }}>
                                    {renderPeople(milestone.vendorParticipants)}
                                  </Typography.Text>
                                </div>
                              ) : null}

                              <Tag
                                color={countdown.urgent ? "red" : "green"}
                                style={{
                                  width: "fit-content",
                                  margin: 0,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                                icon={<ClockCircleOutlined />}
                              >
                                {countdown.text}
                              </Tag>
                            </Space>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <Card
                  size="small"
                  title={
                    <Segmented
                      value={tableView}
                      onChange={(value) => setTableView(value as "segments" | "tasks" | "work")}
                      options={[
                        { label: "项目环节", value: "segments" },
                        { label: "项目任务", value: "tasks" },
                        { label: "项目工时", value: "work" },
                      ]}
                    />
                  }
                >
                  {tableView === "segments" ? (
                    <Table
                      rowKey="id"
                      columns={segmentColumns}
                      dataSource={segmentRows}
                      pagination={{ pageSize: 8 }}
                      locale={{ emptyText: "暂无项目环节" }}
                    />
                  ) : null}

                  {tableView === "tasks" ? (
                    <Table
                      rowKey="id"
                      columns={taskColumns}
                      dataSource={taskRows}
                      pagination={{ pageSize: 8 }}
                      locale={{ emptyText: "暂无项目任务" }}
                    />
                  ) : null}

                  {tableView === "work" ? (
                    <Table
                      rowKey="id"
                      columns={workColumns}
                      dataSource={workRows}
                      pagination={{ pageSize: 8 }}
                      locale={{ emptyText: "暂无项目工时" }}
                      scroll={{ x: "max-content" }}
                    />
                  ) : null}
                </Card>
              </Space>
            </Card>
          );
        })
      )}
    </Space>
  );
}
