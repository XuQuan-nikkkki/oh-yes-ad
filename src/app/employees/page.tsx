"use client";

import { useEffect, useState } from "react";
import { Table, Card, Tag } from "antd";
import dayjs from "dayjs";

type Employee = {
  id: string;
  name: string;
  function?: string | null;
  position?: string | null;
  level?: string | null;
  departmentLevel1?: string | null;
  departmentLevel2?: string | null;
  employmentType?: string | null;
  employmentStatus?: string | null;
  entryDate?: string | null;
  leaveDate?: string | null;
};

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees?list=full");
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (!res.ok) throw new Error(typeof data === "object" && data?.error ? data.error : res.statusText);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("获取团队成员失败:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const functionOptions = Array.from(
    new Set(employees.map((e) => e.function).filter(Boolean) as string[])
  );
  const statusOptions = Array.from(
    new Set(employees.map((e) => e.employmentStatus).filter(Boolean) as string[])
  );

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      width: 120,
      sorter: (a: Employee, b: Employee) => a.name.localeCompare(b.name),
    },
    {
      title: "职能",
      dataIndex: "function",
      width: 120,
      filters: functionOptions.map((t) => ({ text: t, value: t })),
      onFilter: (value: string | number | boolean, record: Employee) =>
        record.function === value,
      render: (value: string | null) =>
        value ? (
          <Tag style={{ borderRadius: 6, padding: "2px 10px", fontWeight: 500 }}>
            {value}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "职位",
      dataIndex: "position",
      width: 120,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "一级部门",
      dataIndex: "departmentLevel1",
      width: 120,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "用工状态",
      dataIndex: "employmentStatus",
      width: 100,
      filters: statusOptions.map((t) => ({ text: t, value: t })),
      onFilter: (value: string | number | boolean, record: Employee) =>
        record.employmentStatus === value,
      render: (value: string | null) =>
        value ? (
          <Tag color={value === "在职" ? "green" : "default"}>
            {value}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "入职日期",
      dataIndex: "entryDate",
      width: 120,
      sorter: (a: Employee, b: Employee) =>
        (a.entryDate || "").localeCompare(b.entryDate || ""),
      render: (value: string | null) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
    },
  ];

  return (
    <Card title={<h3>团队成员</h3>}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={employees}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "暂无团队成员" }}
      />
    </Card>
  );
};

export default EmployeesPage;
