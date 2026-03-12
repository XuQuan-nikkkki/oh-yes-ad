"use client";

import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Modal, Table } from "antd";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import PlannedWorkEntryForm, { PlannedWorkEntryFormPayload } from "@/components/project-detail/PlannedWorkEntryForm";

type Row = {
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
  task?: {
    id: string;
    name: string;
    owner?: { id: string; name: string } | null;
    segment?: { id: string; name: string; project?: { id: string; name: string } };
  };
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; name: string; projectId: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const fetchData = async () => {
    const [res1, res2, res3] = await Promise.all([
      fetch("/api/planned-work-entries"),
      fetch("/api/projects?type=%E5%86%85%E9%83%A8%E9%A1%B9%E7%9B%AE"),
      fetch("/api/project-tasks"),
    ]);
    const entries = await res1.json();
    const projectList = await res2.json();
    const taskList = await res3.json();
    setRows(entries);
    setProjects(projectList.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    setTasks(taskList.map((t: { id: string; name: string; segment?: { project?: { id: string } } }) => ({
      id: t.id,
      name: t.name,
      projectId: t.segment?.project?.id,
    })));
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  const onDelete = async (id: string) => {
    await fetch(`/api/planned-work-entries/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (payload: PlannedWorkEntryFormPayload) => {
    if (editing) {
      await fetch(`/api/planned-work-entries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/planned-work-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    setEditing(null);
    await fetchData();
  };

  const checkbox = (checked: boolean) => (
    <Checkbox checked={checked} onChange={() => {}} style={{ pointerEvents: "none" }} />
  );

  return (
    <Card title="计划工时" extra={<Button type="primary" onClick={() => { setEditing(null); setOpen(true); }}>新增计划工时</Button>}>
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
        columns={[
          { title: "任务", render: (_: unknown, r: Row) => r.task ? <AppLink href={`/planned-work-entries/${r.id}`}>{r.task.name}</AppLink> : "-" },
          { title: "任务责任人", render: (_: unknown, r: Row) => r.task?.owner?.name ?? "-" },
          { title: "所属项目", render: (_: unknown, r: Row) => r.task?.segment?.project?.name ?? "-" },
          { title: "年份", dataIndex: "year" },
          { title: "周数", dataIndex: "weekNumber" },
          { title: "计划天数", dataIndex: "plannedDays" },
          { title: "周一", render: (_: unknown, r: Row) => checkbox(r.monday) },
          { title: "周二", render: (_: unknown, r: Row) => checkbox(r.tuesday) },
          { title: "周三", render: (_: unknown, r: Row) => checkbox(r.wednesday) },
          { title: "周四", render: (_: unknown, r: Row) => checkbox(r.thursday) },
          { title: "周五", render: (_: unknown, r: Row) => checkbox(r.friday) },
          { title: "周六", render: (_: unknown, r: Row) => checkbox(r.saturday) },
          { title: "周天", render: (_: unknown, r: Row) => checkbox(r.sunday) },
          {
            title: "操作",
            render: (_: unknown, r: Row) => (
              <TableActions
                onEdit={() => { setEditing(r); setOpen(true); }}
                onDelete={() => onDelete(r.id)}
                deleteTitle="确定删除该条计划工时？"
              />
            ),
          },
        ]}
      />

      <Modal title={editing ? "编辑计划工时" : "新增计划工时"} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <PlannedWorkEntryForm
          projectOptions={projects}
          taskOptions={tasks}
          initialValues={editing ? {
            id: editing.id,
            taskId: editing.task?.id ?? "",
            year: editing.year,
            weekNumber: editing.weekNumber,
            plannedDays: editing.plannedDays,
            monday: editing.monday,
            tuesday: editing.tuesday,
            wednesday: editing.wednesday,
            thursday: editing.thursday,
            friday: editing.friday,
            saturday: editing.saturday,
            sunday: editing.sunday,
          } : null}
          onSubmit={onSubmit}
        />
      </Modal>
    </Card>
  );
}
