"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, message, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import EmployeeFormModal from "@/components/EmployeeFormModal";
import EmployeesTable, {
  Employee,
  EmployeeColumnKey,
} from "@/components/EmployeesTable";

type EmployeeViewMode = "basic" | "role" | "position";
type RoleCode = "ADMIN" | "PROJECT_MANAGER" | "HR" | "FINANCE" | "STAFF";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [legalEntityOptions, setLegalEntityOptions] = useState<
    { id: string; name: string; fullName?: string | null }[]
  >([]);
  const [roleOptions, setRoleOptions] = useState<
    { id: string; code: RoleCode; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<EmployeeViewMode>("basic");
  const [roleCodes, setRoleCodes] = useState<string[]>([]);

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
      const [rolesRes, legalEntitiesRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/legal-entities"),
      ]);
      const rolesData = await rolesRes.json();
      const legalEntitiesData = await legalEntitiesRes.json();
      setRoleOptions(Array.isArray(rolesData) ? rolesData : []);
      setLegalEntityOptions(
        Array.isArray(legalEntitiesData) ? legalEntitiesData : [],
      );
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          setRoleCodes([]);
          return;
        }
        const me = (await res.json()) as {
          roles?: Array<{
            role?: {
              code?: string | null;
            } | null;
          }> | null;
        };
        const codes = (me.roles ?? [])
          .map((item) => item?.role?.code)
          .filter((code): code is string => Boolean(code));
        setRoleCodes(codes);
      } catch {
        setRoleCodes([]);
      }
    })();
  }, []);

  const isAdmin = roleCodes.includes("ADMIN");
  const canUseRoleView = isAdmin;
  const canUsePositionView =
    isAdmin || roleCodes.includes("HR") || roleCodes.includes("FINANCE");

  useEffect(() => {
    if (viewMode === "role" && !canUseRoleView) {
      setViewMode("basic");
      return;
    }
    if (viewMode === "position" && !canUsePositionView) {
      setViewMode("basic");
    }
  }, [viewMode, canUseRoleView, canUsePositionView]);

  const functionOptions = Array.from(
    new Set(employees.map((e) => e.function).filter(Boolean) as string[]),
  );
  const positionOptions = Array.from(
    new Set(employees.map((e) => e.position).filter(Boolean) as string[]),
  );
  const departmentLevel1Options = Array.from(
    new Set(
      employees.map((e) => e.departmentLevel1).filter(Boolean) as string[],
    ),
  );
  const departmentLevel2Options = Array.from(
    new Set(
      employees.map((e) => e.departmentLevel2).filter(Boolean) as string[],
    ),
  );
  const employmentTypeOptions = Array.from(
    new Set(employees.map((e) => e.employmentType).filter(Boolean) as string[]),
  );
  const employmentStatusOptions = Array.from(
    new Set(
      employees.map((e) => e.employmentStatus).filter(Boolean) as string[],
    ),
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

  const columnKeysByMode: Record<EmployeeViewMode, EmployeeColumnKey[]> = {
    basic: ["name", "fullName", "function", "employmentStatus", "actions"],
    role: ["name", "roles", "actions"],
    position: [
      "name",
      "fullName",
      "function",
      "legalEntity",
      "departmentLevel1",
      "departmentLevel2",
      "position",
      "level",
      "employmentType",
      "employmentStatus",
      "entryDate",
      "leaveDate",
      "salary",
      "socialSecurity",
      "providentFund",
      "workstationCost",
      "utilityCost",
      "bankAccountNumber",
      "bankName",
      "bankBranch",
      "actions",
    ],
  };

  return (
    <>
      <Card styles={{ body: { padding: 12 } }}>
        <EmployeesTable
          employees={employees}
          roleOptions={roleOptions}
          columnKeys={columnKeysByMode[viewMode]}
          columnsStatePersistenceKey={`employees-table-columns-state-${viewMode}`}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOptionUpdated={fetchEmployees}
          toolbarActions={[
            <Select
              key="employees-view-mode"
              value={viewMode}
              style={{ minWidth: 140 }}
              options={[
                { label: "基础信息", value: "basic" },
                { label: "角色信息", value: "role", disabled: !canUseRoleView },
                {
                  label: "岗位信息",
                  value: "position",
                  disabled: !canUsePositionView,
                },
              ]}
              onChange={(value: EmployeeViewMode) => setViewMode(value)}
            />,
            <Button
              key="create-employee"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddEmployee}
            >
              新增成员
            </Button>,
          ]}
        />
      </Card>

      <EmployeeFormModal
        open={open}
        onCancel={handleModalCancel}
        onSuccess={handleModalSuccess}
        viewMode={viewMode}
        functionOptions={functionOptions}
        positionOptions={positionOptions}
        departmentLevel1Options={departmentLevel1Options}
        departmentLevel2Options={departmentLevel2Options}
        employmentTypeOptions={employmentTypeOptions}
        employmentStatusOptions={employmentStatusOptions}
        legalEntityOptions={legalEntityOptions}
        roleOptions={roleOptions}
        initialValues={editingEmployee}
      />
    </>
  );
};

export default EmployeesPage;
