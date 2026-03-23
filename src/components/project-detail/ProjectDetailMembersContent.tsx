"use client";

import { useMemo } from "react";
import { Col, Empty, Modal, Row, Select, Space, Tag } from "antd";
import { useProjectPermission } from "@/hooks/useProjectPermission";

type Member = {
  id: string;
  name: string;
  function?: string | null;
  employmentStatus?: string | null;
};

type EmployeeOptionGroup = {
  label: string;
  options: { label: string; value: string }[];
};

type Props = {
  projectId: string;
  members: Member[];
  employees: Member[];
  addingFunction: string | null;
  onSetAddingFunction: (value: string | null) => void;
  onMembersChanged: () => Promise<void> | void;
};

const ProjectDetailMembersContent = ({
  projectId,
  members,
  employees,
  addingFunction,
  onSetAddingFunction,
  onMembersChanged,
}: Props) => {
  const { canManageProject } = useProjectPermission();

  const groupedMembers = useMemo(() => {
    if (members.length === 0) return {};

    const groups: Record<string, Member[]> = {};
    const order = ["项目组", "设计组"];
    const sortMembers = (items: Member[]) =>
      [...items].sort((left, right) => {
        const leftResigned = left.employmentStatus === "离职";
        const rightResigned = right.employmentStatus === "离职";
        if (leftResigned !== rightResigned) {
          return leftResigned ? 1 : -1;
        }
        return left.name.localeCompare(right.name, "zh-CN");
      });

    members.forEach((member) => {
      const func = member.function || "其他";
      if (!groups[func]) {
        groups[func] = [];
      }
      groups[func].push(member);
    });

    const sorted: Record<string, Member[]> = {};
    order.forEach((key) => {
      if (groups[key]) {
        sorted[key] = sortMembers(groups[key]);
      }
    });
    Object.keys(groups).forEach((key) => {
      if (!order.includes(key)) {
        sorted[key] = sortMembers(groups[key]);
      }
    });
    return sorted;
  }, [members]);

  const employeeOptions = useMemo<EmployeeOptionGroup[]>(() => {
    const currentMemberIds = new Set(members.map((member) => member.id));
    const availableEmployees = employees.filter(
      (employee) =>
        employee.employmentStatus === "在职" && !currentMemberIds.has(employee.id),
    );
    const groups: Record<string, Member[]> = {};
    const order = ["项目组", "设计组"];

    availableEmployees.forEach((employee) => {
      const func = employee.function || "其他";
      if (!groups[func]) {
        groups[func] = [];
      }
      groups[func].push(employee);
    });

    const result: EmployeeOptionGroup[] = [];
    order.forEach((key) => {
      if (groups[key]) {
        result.push({
          label: key,
          options: groups[key].map((employee) => ({
            label: employee.name,
            value: employee.id,
          })),
        });
      }
    });
    Object.keys(groups).forEach((key) => {
      if (!order.includes(key)) {
        result.push({
          label: key,
          options: groups[key].map((employee) => ({
            label: employee.name,
            value: employee.id,
          })),
        });
      }
    });
    return result;
  }, [employees, members]);

  const addMemberControl = (
    <Space size={[8, 8]} wrap align="center">
      {addingFunction === "global" ? (
        <Select
          placeholder="选择成员"
          style={{ width: 200 }}
          options={employeeOptions}
          onSelect={async (value) => {
            if (!canManageProject) return;
            try {
              await fetch(`/api/projects/${projectId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(String(value)),
              });
              await onMembersChanged();
              onSetAddingFunction(null);
            } catch (error) {
              console.error("Failed to add member:", error);
            }
          }}
          onBlur={() => onSetAddingFunction(null)}
          open
        />
      ) : canManageProject ? (
        <Tag
          onClick={() => onSetAddingFunction("global")}
          style={{ cursor: "pointer", marginRight: 0 }}
        >
          + 添加成员
        </Tag>
      ) : null}
    </Space>
  );

  if (members.length === 0) {
    return (
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Empty description="暂无团队成员" />
        <div>{addMemberControl}</div>
      </Space>
    );
  }

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      <Row gutter={[16, 16]}>
        {Object.entries(groupedMembers).map(([func, groupMembers]) => (
          <Col key={func} xs={24} md={12}>
            <Space
              orientation="vertical"
              size={8}
              style={{ width: "100%", alignItems: "flex-start" }}
            >
              <span style={{ fontSize: "12px", color: "#999" }}>
                <strong>{func}：</strong>
              </span>
              <Space size={[8, 8]} wrap>
                {groupMembers.map((member) => (
                  <Tag
                    key={member.id}
                    style={{ marginRight: 0 }}
                    closable={canManageProject}
                    onClose={(e) => {
                      if (!canManageProject) return;
                      e.preventDefault();
                      Modal.confirm({
                        title: "确认移除",
                        content: `是否将 ${member.name} 从项目成员中移除？`,
                        okText: "确认",
                        cancelText: "取消",
                        onOk: async () => {
                          try {
                            await fetch(
                              `/api/projects/${projectId}/members/${member.id}`,
                              {
                                method: "DELETE",
                              },
                            );
                            await onMembersChanged();
                          } catch (error) {
                            console.error("Failed to remove member:", error);
                          }
                        },
                      });
                    }}
                  >
                    {member.name}
                    {member.employmentStatus === "离职" && " (离职)"}
                  </Tag>
                ))}
              </Space>
            </Space>
          </Col>
        ))}
      </Row>

      <div style={{ paddingTop: "8px", borderTop: "1px solid #f0f0f0" }}>
        {addMemberControl}
      </div>
    </Space>
  );
};

export default ProjectDetailMembersContent;
