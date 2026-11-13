"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, Empty, Input, Modal, Tag, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { Employee, Project } from "@/types/projectDetail";
import styles from "./ProjectWorkspaceMembers.module.css";

type Member = NonNullable<Project["members"]>[number];

type Props = {
  projectId: string;
  members: Member[];
  employees: Employee[];
  canManageProject: boolean;
  onMembersChanged: () => Promise<void> | void;
};

const preferredGroups = ["项目组", "设计组"];
const groupRank = (group: string) => {
  const index = preferredGroups.indexOf(group);
  return index < 0 ? preferredGroups.length : index;
};
const sortGroups = (left: string, right: string) =>
  groupRank(left) - groupRank(right) || left.localeCompare(right, "zh-CN");
const groupName = (person: { function?: string | null }) => person.function || "其他";

export default function ProjectWorkspaceMembers({
  projectId,
  members,
  employees,
  canManageProject,
  onMembersChanged,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [messageApi, messageContextHolder] = message.useMessage();

  const groupedMembers = useMemo(() => {
    const groups = new Map<string, Member[]>();
    members.forEach((member) => {
      const group = groupName(member);
      groups.set(group, [...(groups.get(group) ?? []), member]);
    });
    return [...groups.entries()].sort(([left], [right]) => sortGroups(left, right)).map(([group, people]) => ({
      group,
      people: people.sort((left, right) =>
        Number(left.employmentStatus === "离职") - Number(right.employmentStatus === "离职") ||
        left.name.localeCompare(right.name, "zh-CN"),
      ),
    }));
  }, [members]);

  const availableEmployees = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.id));
    return employees.filter((employee) =>
      employee.employmentStatus === "在职" && !memberIds.has(employee.id),
    );
  }, [employees, members]);

  const filteredEmployees = availableEmployees.filter((employee) =>
    `${employee.name} ${groupName(employee)}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const availableGroups = [...new Set(filteredEmployees.map(groupName))].sort(sortGroups);

  const closeAdd = () => {
    if (adding) return;
    setAddOpen(false);
    setSearch("");
    setSelectedIds([]);
  };

  const addMembers = async () => {
    if (!canManageProject || selectedIds.length === 0) return;
    setAdding(true);
    const results = await Promise.allSettled(selectedIds.map(async (memberId) => {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberId),
      });
      if (!response.ok) throw new Error(await response.text());
    }));
    const failed = results.filter((result) => result.status === "rejected").length;
    try {
      if (failed < results.length) await onMembersChanged();
      if (failed) messageApi.error(`${failed} 位成员添加失败，请重试`);
      else messageApi.success("成员已添加");
      if (!failed) {
        setAddOpen(false);
        setSearch("");
        setSelectedIds([]);
      } else {
        setSelectedIds((current) => current.filter((_, index) => results[index]?.status === "rejected"));
      }
    } finally {
      setAdding(false);
    }
  };

  const removeMember = (member: Member) => {
    if (!canManageProject) return;
    Modal.confirm({
      title: "移除项目成员",
      content: `确定将 ${member.name} 从该项目移除吗？`,
      okText: "移除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        const response = await fetch(`/api/projects/${projectId}/members/${member.id}`, { method: "DELETE" });
        if (!response.ok) {
          messageApi.error("移除成员失败，请重试");
          throw new Error(await response.text());
        }
        await onMembersChanged();
        messageApi.success("成员已移除");
      },
    });
  };

  return <>
    {messageContextHolder}
    <div className={styles.titleRow}>
      <h2>人员信息</h2>
      {canManageProject && <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加成员</Button>}
    </div>
    {groupedMembers.length ? <div className={styles.grid}>
      {[0, 1].map((column) => <div className={styles.column} key={column}>
        {groupedMembers.map(({ group, people }, index) => index % 2 === column ? <section className={styles.card} key={group} style={{ order: index }}>
          <div className={styles.cardHeader}><h3>{group}</h3><span>{people.length} 人</span></div>
          {people.map((member) => <div className={styles.memberRow} key={member.id}>
            <span className={styles.identity}>{member.name}{member.employmentStatus === "离职" && <Tag className={styles.resignedTag}>离职</Tag>}</span>
            {canManageProject && <button type="button" className={styles.remove} onClick={() => removeMember(member)} aria-label={`移除 ${member.name}`}>移除</button>}
          </div>)}
        </section> : null)}
      </div>)}
    </div> : <div className={styles.empty}><Empty description="暂无团队成员" /></div>}

    <Modal title="添加项目成员" open={addOpen} onCancel={closeAdd} onOk={addMembers}
      okText={selectedIds.length ? `添加 ${selectedIds.length} 位成员` : "添加成员"}
      okButtonProps={{ disabled: selectedIds.length === 0, loading: adding }}
      cancelButtonProps={{ disabled: adding }} closable={!adding} width={540}>
      <p className={styles.hint}>仅显示尚未加入项目的在职员工；添加后按其职能归组。</p>
      <Input prefix={<SearchOutlined />} placeholder="搜索姓名或职能" value={search} onChange={(event) => setSearch(event.target.value)} allowClear disabled={adding} />
      <div className={styles.pickerList}>
        {availableGroups.length ? availableGroups.map((group) => <section className={styles.pickerGroup} key={group}>
          <h4>{group}</h4><div>{filteredEmployees.filter((employee) => groupName(employee) === group).map((employee) => <Checkbox
            key={employee.id} checked={selectedIds.includes(employee.id)} disabled={adding}
            onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, employee.id] : current.filter((id) => id !== employee.id))}>
            {employee.name}
          </Checkbox>)}</div>
        </section>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={availableEmployees.length ? "没有匹配的员工" : "暂无可添加的在职员工"} />}
      </div>
    </Modal>
  </>;
}
