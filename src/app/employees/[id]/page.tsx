"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Space, Table, Tag } from "antd";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

type EmployeeDetail = {
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
  position?: string | null;
  level?: string | null;
  departmentLevel1?: string | null;
  departmentLevel2?: string | null;
  employmentType?: string | null;
  employmentStatus?: string | null;
  entryDate?: string | null;
  leaveDate?: string | null;
  ownedProjects?: {
    id: string;
    name: string;
    type?: string | null;
    status?: string | null;
  }[];
  projects?: {
    id: string;
    name: string;
    type?: string | null;
    status?: string | null;
  }[];
  leaveRecords?: {
    id: string;
    type: string;
    startDate: string;
    endDate: string;
  }[];
  actualWorkEntries?: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    project?: {
      id: string;
      name: string;
    } | null;
  }[];
};

const EmployeeDetailPage = () => {
  const params = useParams();
  const id = params.id as string;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/employees/${id}`);
        if (!res.ok) {
          setEmployee(null);
          return;
        }
        const data = await res.json();
        setEmployee(data);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title="成员详情" loading={loading}>
        {employee && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="姓名">{employee.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{employee.phone ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="全名">{employee.fullName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="角色">
              {employee.roles && employee.roles.length > 0 ? (
                <>
                  {employee.roles.map((item) => (
                    <Tag color="blue" key={item.role.id}>
                      {item.role.name}
                    </Tag>
                  ))}
                </>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="职能">{employee.function ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="岗位">{employee.position ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="级别">{employee.level ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="一级部门">
              {employee.departmentLevel1 ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="二级部门">
              {employee.departmentLevel2 ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="用工类型">
              {employee.employmentType ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="用工状态">
              {employee.employmentStatus ? (
                <Tag color={employee.employmentStatus === "在职" ? "green" : "default"}>
                  {employee.employmentStatus}
                </Tag>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="入职时间">
              {employee.entryDate ? dayjs(employee.entryDate).format("YYYY-MM-DD") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="离职时间">
              {employee.leaveDate ? dayjs(employee.leaveDate).format("YYYY-MM-DD") : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="负责项目">
        <Table
          rowKey="id"
          dataSource={employee?.ownedProjects ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无负责项目" }}
          columns={[
            {
              title: "项目名称",
              dataIndex: "name",
              render: (value: string, record) => (
                <AppLink href={`/projects/${record.id}`}>{value}</AppLink>
              ),
            },
            { title: "项目类型", dataIndex: "type", render: (v: string | null) => v ?? "-" },
            { title: "项目状态", dataIndex: "status", render: (v: string | null) => v ?? "-" },
          ]}
        />
      </Card>

      <Card title="参与项目">
        <Table
          rowKey="id"
          dataSource={employee?.projects ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无参与项目" }}
          columns={[
            {
              title: "项目名称",
              dataIndex: "name",
              render: (value: string, record) => (
                <AppLink href={`/projects/${record.id}`}>{value}</AppLink>
              ),
            },
            { title: "项目类型", dataIndex: "type", render: (v: string | null) => v ?? "-" },
            { title: "项目状态", dataIndex: "status", render: (v: string | null) => v ?? "-" },
          ]}
        />
      </Card>

      <Card title="请假记录">
        <Table
          rowKey="id"
          dataSource={employee?.leaveRecords ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无请假记录" }}
          columns={[
            { title: "类型", dataIndex: "type" },
            {
              title: "开始时间",
              dataIndex: "startDate",
              render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
            },
            {
              title: "结束时间",
              dataIndex: "endDate",
              render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
            },
          ]}
        />
      </Card>

      <Card title="实际工时记录">
        <Table
          rowKey="id"
          dataSource={employee?.actualWorkEntries ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无实际工时记录" }}
          columns={[
            { title: "事件", dataIndex: "title" },
            {
              title: "所属项目",
              dataIndex: ["project", "name"],
              render: (_value: string | undefined, record) =>
                record.project ? (
                  <AppLink href={`/projects/${record.project.id}`}>
                    {record.project.name}
                  </AppLink>
                ) : (
                  "-"
                ),
            },
            {
              title: "开始时间",
              dataIndex: "startDate",
              render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
            },
            {
              title: "结束时间",
              dataIndex: "endDate",
              render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default EmployeeDetailPage;
