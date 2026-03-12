"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, Card, Tag, Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import EmployeeFormModal from "@/components/EmployeeFormModal";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";

type Employee = {
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
};

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roleOptions, setRoleOptions] = useState<
    { id: string; code: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees?list=full");
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (!res.ok)
        throw new Error(
          typeof data === "object" && data?.error ? data.error : res.statusText,
        );
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("获取团队成员失败:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/roles");
      const data = await res.json();
      setRoleOptions(Array.isArray(data) ? data : []);
    })();
  }, []);

  const functionOptions = Array.from(
    new Set(employees.map((e) => e.function).filter(Boolean) as string[]),
  );

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setOpen(true);
  };

  const handleEdit = (record: Employee) => {
    setEditingEmployee(record);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("删除失败");
      message.success("删除成功");
      fetchEmployees();
    } catch (err) {
      console.error("删除团队成员失败:", err);
      message.error("删除失败");
    }
  };

  const handleModalCancel = () => {
    setOpen(false);
    setEditingEmployee(null);
  };

  const handleModalSuccess = () => {
    setOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      filters: employees.map((e) => ({ text: e.name, value: e.name })),
      onFilter: (value: string | number | boolean, record: Employee) =>
        record.name === value,
      render: (value: string, record: Employee) => (
        <AppLink href={`/employees/${record.id}`}>
          {value}
        </AppLink>
      ),
    },
    {
      title: "手机号",
      dataIndex: "phone",
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "全名",
      dataIndex: "fullName",
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "角色",
      filters: roleOptions.map((item) => ({ text: item.name, value: item.code })),
      onFilter: (value: string | number | boolean, record: Employee) =>
        Boolean(record.roles?.some((item) => item.role.code === value)),
      render: (_: unknown, record: Employee) =>
        record.roles && record.roles.length > 0 ? (
          <>
            {record.roles.map((item) => (
              <Tag color="blue" key={item.role.id}>
                {item.role.name}
              </Tag>
            ))}
          </>
        ) : (
          "-"
        ),
    },
    {
      title: "职能",
      dataIndex: "function",
      filters: functionOptions.map((t) => ({ text: t, value: t })),
      onFilter: (value: string | number | boolean, record: Employee) =>
        record.function === value,
      render: (value: string | null) =>
        value ? (
          <Tag
            style={{ borderRadius: 6, padding: "2px 10px", fontWeight: 500 }}
          >
            {value}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "用工状态",
      dataIndex: "employmentStatus",
      filters: [
        { text: "在职", value: "在职" },
        { text: "离职", value: "离职" },
      ],
      onFilter: (value: string | number | boolean, record: Employee) =>
        record.employmentStatus === value,
      render: (value: string | null) =>
        value ? (
          <Tag color={value === "在职" ? "green" : "default"}>{value}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "操作",
      render: (_: unknown, record: Employee) => (
        <TableActions
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle="确定删除这个团队成员？"
        />
      ),
    },
  ];

  return (
    <>
      <Card
        title={<h3>团队成员</h3>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddEmployee}
          >
            新增成员
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={employees}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无团队成员" }}
        />
      </Card>

      <EmployeeFormModal
        open={open}
        onCancel={handleModalCancel}
        onSuccess={handleModalSuccess}
        functionOptions={functionOptions}
        roleOptions={roleOptions}
        initialValues={editingEmployee}
      />
    </>
  );
};

export default EmployeesPage;
