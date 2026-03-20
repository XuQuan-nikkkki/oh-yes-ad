"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Input, message, Modal, Tabs, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import TableActions from "@/components/TableActions";
import EmployeesTable, { Employee } from "@/components/EmployeesTable";
import { useEmployeesStore } from "@/stores/employeesStore";

type RoleRecord = {
  id: string;
  code: string;
  name: string;
  _count?: {
    employees?: number;
  };
};

type RoleFormValues = {
  code: string;
  name: string;
};

type RoleMember = {
  id: string;
  name: string;
  roleIds: string[];
};

type MemberRoleFormValues = {
  roleIds?: string[];
};

const RolesPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState("roles");

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [roleForm] = Form.useForm<RoleFormValues>();

  const [memberRoleModalOpen, setMemberRoleModalOpen] = useState(false);
  const [memberRoleSubmitting, setMemberRoleSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState<RoleMember | null>(null);
  const [memberRoleForm] = Form.useForm<MemberRoleFormValues>();
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);

  const isEditRole = Boolean(editingRole?.id);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles", { cache: "no-store" });
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("获取角色失败:", error);
      messageApi.error("获取角色失败");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  const fetchEmployees = useCallback(async (force = false) => {
    try {
      const data = await fetchEmployeesFromStore({ full: true, force });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("获取成员失败:", error);
      setEmployees([]);
    }
  }, [fetchEmployeesFromStore]);

  const refreshAll = useCallback(
    async (forceEmployees = false) => {
      await Promise.all([fetchRoles(), fetchEmployees(forceEmployees)]);
    },
    [fetchRoles, fetchEmployees],
  );

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!roles.length) return;
    if (activeTabKey === "roles" || activeTabKey === "no-role") return;
    const exists = roles.some((item) => item.id === activeTabKey);
    if (!exists) {
      setActiveTabKey("roles");
    }
  }, [roles, activeTabKey]);

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (record: RoleRecord) => {
    setEditingRole(record);
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setEditingRole(null);
  };

  useEffect(() => {
    if (!roleModalOpen) return;
    if (editingRole) {
      roleForm.setFieldsValue({
        code: editingRole.code,
        name: editingRole.name,
      });
      return;
    }
    roleForm.resetFields();
  }, [roleModalOpen, editingRole, roleForm]);

  const submitRoleForm = async () => {
    try {
      const values = await roleForm.validateFields();
      setRoleSubmitting(true);

      const res = await fetch("/api/roles", {
        method: isEditRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditRole
            ? {
                id: editingRole?.id,
                ...values,
              }
            : values,
        ),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "保存失败");
      }

      messageApi.success(isEditRole ? "角色已更新" : "角色已新增");
      closeRoleModal();
      await refreshAll(true);
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      }
    } finally {
      setRoleSubmitting(false);
    }
  };

  const deleteRole = async (id: string) => {
    try {
      const res = await fetch("/api/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除失败");
      }
      messageApi.success("角色已删除");
      await refreshAll(true);
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      }
    }
  };

  const toRoleMember = useCallback((employee: Employee): RoleMember => {
    const roleIds = Array.isArray(employee.roles)
      ? employee.roles
          .map((item) => item.role?.id)
          .filter((id): id is string => Boolean(id))
      : [];
    return {
      id: employee.id,
      name: employee.name,
      roleIds,
    };
  }, []);

  const noRoleMembers = useMemo(
    () =>
      employees.filter(
        (employee) => !employee.roles || employee.roles.length === 0,
      ),
    [employees],
  );

  const roleMembersByRoleId = useMemo(() => {
    const map: Record<string, Employee[]> = {};
    for (const role of roles) {
      map[role.id] = employees
        .filter((employee) =>
          Array.isArray(employee.roles)
            ? employee.roles.some((item) => item.role?.id === role.id)
            : false,
        )
        .map((employee) => employee);
    }
    return map;
  }, [roles, employees]);

  const openEditMemberRolesModal = (record: Employee) => {
    setEditingMember(toRoleMember(record));
    setMemberRoleModalOpen(true);
  };

  const closeEditMemberRolesModal = () => {
    setMemberRoleModalOpen(false);
    setEditingMember(null);
  };

  useEffect(() => {
    if (!memberRoleModalOpen) return;
    memberRoleForm.setFieldsValue({
      roleIds: editingMember?.roleIds ?? [],
    });
  }, [memberRoleModalOpen, editingMember, memberRoleForm]);

  const submitMemberRoleForm = async () => {
    if (!editingMember) return;
    try {
      const values = await memberRoleForm.validateFields();
      setMemberRoleSubmitting(true);
      const roleIds = Array.isArray(values.roleIds)
        ? values.roleIds.filter((id): id is string => typeof id === "string")
        : [];

      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMember.id,
          roleIds,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "修改角色失败");
      }
      messageApi.success("成员角色已更新");
      closeEditMemberRolesModal();
      await refreshAll(true);
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      }
    } finally {
      setMemberRoleSubmitting(false);
    }
  };

  const roleColumns: ProColumns<RoleRecord>[] = [
    {
      key: "name",
      title: "角色名称",
      dataIndex: "name",
    },
    {
      key: "code",
      title: "角色编码",
      dataIndex: "code",
    },
    {
      key: "memberCount",
      title: "成员数",
      render: (_dom, record) => record._count?.employees ?? 0,
    },
    {
      key: "actions",
      title: "操作",
      hideInSetting: true,
      render: (_dom, record) => (
        <TableActions
          onEdit={() => openEditRoleModal(record)}
          onDelete={() => deleteRole(record.id)}
          deleteTitle="确定删除这个角色？"
        />
      ),
    },
  ];

  const roleOptionsForTable = useMemo(
    () =>
      roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
      })),
    [roles],
  );

  const tabItems = [
    {
      key: "roles",
      label: "角色管理",
      children: (
        <ProTable<RoleRecord>
          rowKey="id"
          columns={roleColumns}
          dataSource={roles}
          loading={loading}
          search={false}
          headerTitle={false}
          options={{
            reload: false,
            density: false,
            fullScreen: false,
            setting: false,
          }}
          pagination={{ pageSize: 20 }}
          tableLayout="auto"
          scroll={{ x: "max-content" }}
          toolBarRender={false}
          locale={{ emptyText: "暂无角色" }}
        />
      ),
    },
    ...roles.map((role) => ({
      key: role.id,
      label: `${role.name} (${(roleMembersByRoleId[role.id] ?? []).length})`,
      children: (
        <EmployeesTable
          employees={roleMembersByRoleId[role.id] ?? []}
          roleOptions={roleOptionsForTable}
          columnKeys={[
            "name",
            "fullName",
            "function",
            "employmentStatus",
            "actions",
          ]}
          loading={loading}
          onEdit={openEditMemberRolesModal}
          onDelete={undefined}
          onOptionUpdated={fetchEmployees}
          headerTitle={false}
          columnsStatePersistenceKey={`roles-members-${role.id}`}
          showColumnSetting={false}
          compactHorizontalPadding
        />
      ),
    })),
    {
      key: "no-role",
      label: `无角色 (${noRoleMembers.length})`,
      children: (
        <EmployeesTable
          employees={noRoleMembers}
          roleOptions={roleOptionsForTable}
          columnKeys={[
            "name",
            "fullName",
            "function",
            "employmentStatus",
            "actions",
          ]}
          loading={loading}
          onEdit={openEditMemberRolesModal}
          onDelete={undefined}
          onOptionUpdated={fetchEmployees}
          headerTitle={false}
          columnsStatePersistenceKey="roles-members-no-role"
          showColumnSetting={false}
          compactHorizontalPadding
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Card styles={{ body: { padding: 12, margin: 12 } }}>
        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          items={tabItems}
          tabBarExtraContent={
            activeTabKey === "roles" ? (
              <Button
                key="create-role"
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateRoleModal}
              >
                新增角色
              </Button>
            ) : null
          }
        />
      </Card>

      <Modal
        title={isEditRole ? "编辑角色" : "新增角色"}
        open={roleModalOpen}
        onCancel={closeRoleModal}
        onOk={submitRoleForm}
        okText="保存"
        cancelText="取消"
        confirmLoading={roleSubmitting}
        destroyOnHidden
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: "请输入角色名称" }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            label="角色编码"
            name="code"
            rules={[
              { required: true, message: "请输入角色编码" },
              {
                pattern: /^[A-Za-z0-9_]+$/,
                message: "仅支持字母、数字和下划线",
              },
            ]}
          >
            <Input placeholder="例如 STAFF、HR_MANAGER" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="修改成员角色"
        open={memberRoleModalOpen}
        onCancel={closeEditMemberRolesModal}
        onOk={submitMemberRoleForm}
        okText="保存"
        cancelText="取消"
        confirmLoading={memberRoleSubmitting}
        destroyOnHidden
      >
        <Form form={memberRoleForm} layout="vertical">
          <Form.Item label="姓名">
            <Input value={editingMember?.name ?? ""} disabled />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleIds"
            tooltip="可多选；清空后系统会自动回落到默认 STAFF 角色"
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="请选择角色"
              options={roles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default RolesPage;
