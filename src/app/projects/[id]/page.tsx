"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Space,
  Descriptions,
  Button,
  Tag,
  Modal,
  Select,
  Empty,
  Radio,
  Table,
  Divider,
} from "antd";
import { EditOutlined, CloseOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import ProjectFormModal from "@/components/ProjectFormModal";
import Link from "next/link";
import dayjs from "dayjs";

type PeriodInfo = {
  period: string;
  naturalDays: number;
  workdays: number;
  display: string;
};

type WorkdayAdjustment = {
  id: string;
  name?: string | null;
  changeType: string;
  startDate: string;
  endDate: string;
};

type Project = {
  id: string;
  name: string;
  type: string;
  status?: string | null;
  stage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    name: string;
  } | null;
  members?: {
    id: string;
    name: string;
    function?: string | null;
    employmentStatus?: string | null;
  }[];
  milestones?: {
    id: string;
    name: string;
    date?: string | null;
  }[];
  segments?: {
    id: string;
    name: string;
    dueDate?: string | null;
    projectTasks?: {
      id: string;
      name: string;
      dueDate?: string | null;
      plannedWorkEntries?: {
        id: string;
        year: number;
        weekNumber: number;
        plannedDays: number;
      }[];
    }[];
  }[];
  actualWorkEntries?: {
    id: string;
    title: string;
    date: string;
    employee?: { id: string; name: string };
  }[];
  documents?: {
    id: string;
    name: string;
    type?: string | null;
    date?: string | null;
    isFinal: boolean;
    internalLink?: string | null;
  }[];
  periodInfo?: PeriodInfo;
};

type Client = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  name: string;
  employmentStatus?: string;
  function?: string | null;
};

const ProjectDetailPage = () => {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [addingFunction, setAddingFunction] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<
    "milestone" | "segment" | "task"
  >("milestone");
  const [workView, setWorkView] = useState<"planned" | "actual">("planned");

  const projectTypeMap: Record<string, string> = {
    CLIENT: "客户项目",
    INTERNAL: "内部项目",
  };

  // 计算时间段内的工作日数
  const calculateWorkdays = (
    startDate: Date,
    endDate: Date,
    adjustments: WorkdayAdjustment[],
  ): number => {
    let workdays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split("T")[0];

      // 查找是否有针对此日期的调整
      const adjustment = adjustments.find((adj) => {
        const adjStart = new Date(adj.startDate).toISOString().split("T")[0];
        const adjEnd = new Date(adj.endDate).toISOString().split("T")[0];
        return dateStr >= adjStart && dateStr <= adjEnd;
      });

      // 根据调整信息判断是否为工作日
      if (adjustment) {
        if (adjustment.changeType === "上班") {
          workdays++;
        }
        // 如果是"休假"或"调休"，不计入工作日
      } else {
        // 没有调整信息时，默认周一到周五为工作日
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workdays++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return workdays;
  };

  // 计算项目周期
  const calculatePeriodInfo = (
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    adjustments: WorkdayAdjustment[],
  ): PeriodInfo | undefined => {
    if (!startDate) return undefined;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const today = new Date();

    // 计算到目前为止的周期
    const effectiveEnd = endDate ? new Date(endDate) : today;
    const naturalDays =
      Math.floor(
        (effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const workdays = calculateWorkdays(start, effectiveEnd, adjustments);

    // 生成显示字符串
    const startStr = dayjs(start).format("YYYY/MM/DD");
    const endStr = endDate ? dayjs(end).format("YYYY/MM/DD") : "至今";
    const period = `${startStr} - ${endStr}`;

    // 添加自然日和工作日信息
    const display = `${period} (自然日: ${naturalDays}天 | 工作日: ${workdays}天)`;

    return {
      period,
      naturalDays,
      workdays,
      display,
    };
  };

  const fetchProject = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    setProject(data);
    setLoading(false);
  }, [projectId]);

  const fetchClients = async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data);
    } catch {
      console.log("Employees API not available yet");
    }
  };

  const fetchWorkdayAdjustments = async () => {
    try {
      const res = await fetch("/api/workday-adjustments");
      const data = await res.json();
      setWorkdayAdjustments(data);
    } catch (error) {
      console.error("Failed to fetch workday adjustments:", error);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await Promise.all([
        fetchProject(),
        fetchClients(),
        fetchEmployees(),
        fetchWorkdayAdjustments(),
      ]);
    })();
  }, [projectId, fetchProject]);

  const isInternalProject = project?.type === "INTERNAL";

  // 按职能分组成员
  const groupedMembers = useCallback(() => {
    if (!project?.members) return {};

    const groups: Record<string, typeof project.members> = {};
    const order = ["项目组", "设计组"];

    project.members.forEach((member) => {
      const func = member.function || "其他";
      if (!groups[func]) {
        groups[func] = [];
      }
      groups[func].push(member);
    });

    // 按顺序排列
    const sorted: Record<string, typeof project.members> = {};
    order.forEach((key) => {
      if (groups[key]) {
        sorted[key] = groups[key];
      }
    });

    Object.keys(groups).forEach((key) => {
      if (!order.includes(key)) {
        sorted[key] = groups[key];
      }
    });

    return sorted;
  }, [project]);

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Modal.confirm({
      title: "确认移除",
      content: `是否将 ${memberName} 从项目成员中移除？`,
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        try {
          await fetch(`/api/projects/${projectId}/members/${memberId}`, {
            method: "DELETE",
          });
          await fetchProject();
        } catch (error) {
          console.error("Failed to remove member:", error);
        }
      },
    });
  };

  const handleAddMember = async (employeeId: string, func: string) => {
    try {
      await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeId),
      });
      await fetchProject();
      setAddingFunction(null);
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  // 获取所有可用的在职员工（不区分职能）
  const getAllAvailableEmployees = () => {
    const currentMemberIds = new Set(project?.members?.map((m) => m.id) || []);
    return employees.filter(
      (e) => e.employmentStatus === "在职" && !currentMemberIds.has(e.id),
    );
  };

  // 生成按职能分组的 Select options
  const getGroupedEmployeeOptions = () => {
    const available = getAllAvailableEmployees();
    const groups: Record<string, typeof available> = {};
    const order = ["项目组", "设计组"];

    available.forEach((employee) => {
      const func = employee.function || "其他";
      if (!groups[func]) {
        groups[func] = [];
      }
      groups[func].push(employee);
    });

    const result: any[] = [];

    // 按顺序添加
    order.forEach((key) => {
      if (groups[key]) {
        result.push({
          label: key,
          options: groups[key].map((e) => ({
            label: e.name,
            value: e.id,
          })),
        });
      }
    });

    // 添加其他职能
    Object.keys(groups).forEach((key) => {
      if (!order.includes(key)) {
        result.push({
          label: key,
          options: groups[key].map((e) => ({
            label: e.name,
            value: e.id,
          })),
        });
      }
    });

    return result;
  };
  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      <Card
        title="项目信息"
        loading={loading}
        extra={
          <Button icon={<EditOutlined />} onClick={() => setOpen(true)}>
            编辑
          </Button>
        }
      >
        {project && (
          <>
            {/* 基础信息 */}
            <Descriptions
              title={
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  基础信息
                </span>
              }
              column={3}
              size="small"
              style={{ marginBottom: "24px" }}
            >
              <Descriptions.Item label="项目名称">
                {project.name}
              </Descriptions.Item>
              <Descriptions.Item label="项目类型">
                {projectTypeMap[project.type] || project.type}
              </Descriptions.Item>
              {!isInternalProject && project.client && (
                <Descriptions.Item label="所属客户">
                  <Link
                    href={`/clients/${project.client.id}`}
                    style={{ color: "#1677ff" }}
                  >
                    {project.client.name}
                  </Link>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 项目进度 */}
            {!isInternalProject && (
              <Descriptions
                title={
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    项目进度
                  </span>
                }
                column={3}
                size="small"
                style={{ marginBottom: "24px" }}
              >
                {project.status && (
                  <Descriptions.Item label="项目状态">
                    {project.status}
                  </Descriptions.Item>
                )}
                {project.stage && (
                  <Descriptions.Item label="项目阶段">
                    {project.stage}
                  </Descriptions.Item>
                )}
                {project.startDate && (
                  <Descriptions.Item label="开始时间">
                    {dayjs(project.startDate).format("YYYY-MM-DD")}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="结束时间">
                  {project.endDate
                    ? dayjs(project.endDate).format("YYYY-MM-DD")
                    : "-"}
                </Descriptions.Item>
                {project.startDate && (
                  <Descriptions.Item label="项目周期">
                    {calculatePeriodInfo(
                      project.startDate,
                      project.endDate,
                      workdayAdjustments,
                    )?.display}
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}

            {/* 项目负责人 */}
            <Descriptions
              title={
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  项目负责人
                </span>
              }
              column={3}
              size="small"
            >
              <Descriptions.Item label="负责人">
                {project.owner?.name ?? "-"}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      {/* 人员信息 - 按职能分组 */}
      <Card title="人员信息">
        {project?.members && project.members.length > 0 ? (
          <Space orientation="vertical" style={{ width: "100%" }} size="large">
            {Object.entries(groupedMembers()).map(([func, members]) => (
              <div key={func}>
                <Space size={[8, 8]} wrap align="center">
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#999",
                      minWidth: "60px",
                    }}
                  >
                    <strong>{func}：</strong>
                  </span>
                  {members.map((member) => (
                    <Tag
                      key={member.id}
                      style={{ marginRight: 0 }}
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleRemoveMember(member.id, member.name);
                      }}
                    >
                      {member.name}
                      {member.employmentStatus === "离职" && " (离职)"}
                    </Tag>
                  ))}
                </Space>
              </div>
            ))}
            {/* 添加成员 - 全局显示 */}
            <div style={{ paddingTop: "8px", borderTop: "1px solid #f0f0f0" }}>
              <Space size={[8, 8]} wrap align="center">
                {addingFunction === "global" ? (
                  <Select
                    placeholder="选择成员"
                    style={{ width: 200 }}
                    options={getGroupedEmployeeOptions()}
                    onSelect={(value) => {
                      handleAddMember(value, "");
                    }}
                    onBlur={() => setAddingFunction(null)}
                    autoFocus
                    open
                  />
                ) : (
                  <Tag
                    onClick={() => setAddingFunction("global")}
                    style={{ cursor: "pointer", marginRight: 0 }}
                  >
                    + 添加成员
                  </Tag>
                )}
              </Space>
            </div>
          </Space>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Empty description="暂无团队成员" />
            {/* 添加首个成员 */}
            <div>
              <Space size={[8, 8]} wrap align="center">
                {addingFunction === "global" ? (
                  <Select
                    placeholder="选择成员"
                    style={{ width: 200 }}
                    options={getGroupedEmployeeOptions()}
                    onSelect={(value) => {
                      handleAddMember(value, "");
                    }}
                    onBlur={() => setAddingFunction(null)}
                    autoFocus
                    open
                  />
                ) : (
                  <Tag
                    onClick={() => setAddingFunction("global")}
                    style={{ cursor: "pointer", marginRight: 0 }}
                  >
                    + 添加成员
                  </Tag>
                )}
              </Space>
            </div>
          </Space>
        )}
      </Card>

      {/* 项目安排 */}
      <Card
        title="项目安排"
        extra={
          <Radio.Group
            value={scheduleView}
            onChange={(e) => setScheduleView(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="milestone">项目里程碑</Radio.Button>
            <Radio.Button value="segment">项目环节</Radio.Button>
            <Radio.Button value="task">项目任务</Radio.Button>
          </Radio.Group>
        }
      >
        {scheduleView === "milestone" && (
          <Table
            rowKey="id"
            columns={[
              {
                title: "里程碑名称",
                dataIndex: "name",
                width: "60%",
                sorter: (a, b) => a.name.localeCompare(b.name),
              },
              {
                title: "截止日期",
                dataIndex: "date",
                sorter: (a, b) => (a.date || "").localeCompare(b.date || ""),
                render: (value: string | null) =>
                  value ? dayjs(value).format("YYYY-MM-DD") : "-",
              },
            ]}
            dataSource={project?.milestones ?? []}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "暂无里程碑" }}
          />
        )}
        {scheduleView === "segment" && (
          <Table
            rowKey="id"
            columns={[
              {
                title: "环节名称",
                dataIndex: "name",
                width: "60%",
                sorter: (a, b) => a.name.localeCompare(b.name),
              },
              {
                title: "截止日期",
                dataIndex: "dueDate",
                sorter: (a, b) =>
                  (a.dueDate || "").localeCompare(b.dueDate || ""),
                render: (value: string | null) =>
                  value ? dayjs(value).format("YYYY-MM-DD") : "-",
              },
            ]}
            dataSource={project?.segments ?? []}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "暂无环节" }}
          />
        )}
        {scheduleView === "task" && (
          <Table
            rowKey="id"
            columns={[
              {
                title: "任务名称",
                dataIndex: "name",
                width: "40%",
                sorter: (a, b) => a.name.localeCompare(b.name),
              },
              {
                title: "所属环节",
                dataIndex: "segmentName",
                width: "30%",
                sorter: (a, b) =>
                  (a.segmentName || "").localeCompare(b.segmentName || ""),
              },
              {
                title: "截止日期",
                dataIndex: "dueDate",
                sorter: (a, b) =>
                  (a.dueDate || "").localeCompare(b.dueDate || ""),
                render: (value: string | null) =>
                  value ? dayjs(value).format("YYYY-MM-DD") : "-",
              },
            ]}
            dataSource={
              project?.segments?.flatMap((s) =>
                (s.projectTasks ?? []).map((t) => ({
                  ...t,
                  segmentName: s.name,
                })),
              ) ?? []
            }
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "暂无任务" }}
          />
        )}
      </Card>

      {/* 项目工时 */}
      <Card
        title="项目工时"
        extra={
          <Radio.Group
            value={workView}
            onChange={(e) => setWorkView(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="planned">计划工时</Radio.Button>
            <Radio.Button value="actual">实际工时</Radio.Button>
          </Radio.Group>
        }
      >
        {workView === "planned" && (
          <Table
            rowKey="id"
            columns={[
              {
                title: "任务",
                dataIndex: "taskName",
                width: "30%",
                sorter: (a, b) =>
                  (a.taskName || "").localeCompare(b.taskName || ""),
              },
              {
                title: "所属环节",
                dataIndex: "segmentName",
                width: "20%",
                sorter: (a, b) =>
                  (a.segmentName || "").localeCompare(b.segmentName || ""),
              },
              {
                title: "年份",
                dataIndex: "year",
                width: 100,
                sorter: (a, b) => a.year - b.year,
              },
              {
                title: "周数",
                dataIndex: "weekNumber",
                width: 100,
                sorter: (a, b) => a.weekNumber - b.weekNumber,
              },
              {
                title: "计划天数",
                dataIndex: "plannedDays",
                sorter: (a, b) => a.plannedDays - b.plannedDays,
              },
            ]}
            dataSource={
              project?.segments?.flatMap((s) =>
                (s.projectTasks ?? []).flatMap((t) =>
                  (t.plannedWorkEntries ?? []).map((e) => ({
                    ...e,
                    taskName: t.name,
                    segmentName: s.name,
                  })),
                ),
              ) ?? []
            }
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "暂无计划工时" }}
          />
        )}
        {workView === "actual" && (
          <Table
            rowKey="id"
            columns={[
              {
                title: "标题",
                dataIndex: "title",
                width: "30%",
                sorter: (a, b) => (a.title || "").localeCompare(b.title || ""),
              },
              {
                title: "日期",
                dataIndex: "date",
                width: 120,
                sorter: (a, b) => (a.date || "").localeCompare(b.date || ""),
                render: (value: string | null) =>
                  value ? dayjs(value).format("YYYY-MM-DD") : "-",
              },
              {
                title: "人员",
                dataIndex: ["employee", "name"],
                sorter: (a, b) =>
                  (a.employee?.name || "").localeCompare(
                    b.employee?.name || "",
                  ),
              },
            ]}
            dataSource={project?.actualWorkEntries ?? []}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "暂无实际工时" }}
          />
        )}
      </Card>

      {/* 项目文档 */}
      <Card title="项目文档">
        <Table
          rowKey="id"
          columns={[
            {
              title: "名称",
              dataIndex: "name",
              width: "25%",
              sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            },
            {
              title: "类型",
              dataIndex: "type",
              width: "15%",
              sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
            },
            {
              title: "日期",
              dataIndex: "date",
              width: 120,
              sorter: (a, b) => (a.date || "").localeCompare(b.date || ""),
              render: (value: string | null) =>
                value ? dayjs(value).format("YYYY-MM-DD") : "-",
            },
            {
              title: "终稿",
              dataIndex: "isFinal",
              width: 80,
              render: (value: boolean) => (value ? "是" : "否"),
            },
            {
              title: "内部链接",
              dataIndex: "internalLink",
              ellipsis: true,
              render: (value: string | null) =>
                value ? (
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    {value}
                  </a>
                ) : (
                  "-"
                ),
            },
          ]}
          dataSource={project?.documents ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无项目文档" }}
        />
      </Card>

      <ProjectFormModal
        open={open}
        initialValues={project}
        onCancel={() => setOpen(false)}
        onSuccess={async () => {
          setOpen(false);
          await fetchProject();
        }}
        clients={clients}
        employees={employees}
      />
    </Space>
  );
};

export default ProjectDetailPage;
