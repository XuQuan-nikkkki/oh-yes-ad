"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, Popover, Table } from "antd";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import ActualWorkEntryForm, { ActualWorkEntryFormPayload } from "@/components/project-detail/ActualWorkEntryForm";

type Row = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string };
  project?: { id: string; name: string };
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; employmentStatus?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const fetchData = async () => {
    const [res1, res2, res3] = await Promise.all([
      fetch("/api/actual-work-entries"),
      fetch("/api/projects?type=%E5%86%85%E9%83%A8%E9%A1%B9%E7%9B%AE"),
      fetch("/api/employees"),
    ]);
    setRows(await res1.json());
    setProjects(await res2.json());
    setEmployees(await res3.json());
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  const getHours = (start: string, end: string) => Math.max(dayjs(end).diff(dayjs(start), "minute") / 60, 0);
  const groupHours = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const id = r.employee?.id;
      if (!id) return;
      const key = `${id}__${dayjs(r.startDate).format("YYYY-MM-DD")}`;
      map.set(key, (map.get(key) ?? 0) + getHours(r.startDate, r.endDate));
    });
    return map;
  }, [rows]);

  const calcWorkDay = (r: Row) => {
    const h = getHours(r.startDate, r.endDate);
    if (h === 0) return 0;
    const key = `${r.employee?.id ?? ""}__${dayjs(r.startDate).format("YYYY-MM-DD")}`;
    const total = groupHours.get(key) ?? h;
    if (total > 7.5) return Math.round((h / total) * 100) / 100;
    return Math.round((h / 7.5) * 10) / 10;
  };

  const fmtNum = (n: number) => Number(n.toFixed(2)).toString();
  const fmtRange = (start: string, end: string) => {
    const s = dayjs(start);
    const e = dayjs(end);
    if (s.isSame(e, "day")) return `${s.format("YYYY-MM-DD HH:mm")}-${e.format("HH:mm")}`;
    return `${s.format("YYYY-MM-DD HH:mm")}-${e.format("MM-DD HH:mm")}`;
  };

  const onDelete = async (id: string) => {
    await fetch(`/api/actual-work-entries/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (payload: ActualWorkEntryFormPayload) => {
    if (editing) {
      await fetch(`/api/actual-work-entries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/actual-work-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    setEditing(null);
    await fetchData();
  };

  return (
    <Card title="实际工时" extra={<Button type="primary" onClick={() => { setEditing(null); setOpen(true); }}>新增实际工时</Button>}>
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
        columns={[
          { title: "事件", dataIndex: "title", render: (v: string, r: Row) => <AppLink href={`/actual-work-entries/${r.id}`}>{v}</AppLink> },
          { title: "人员", dataIndex: ["employee", "name"], render: (v: string | null) => v ?? "-" },
          { title: "所属项目", render: (_: unknown, r: Row) => r.project ? <AppLink href={`/projects/${r.project.id}`}>{r.project.name}</AppLink> : "-" },
          { title: "时间", render: (_: unknown, r: Row) => fmtRange(r.startDate, r.endDate) },
          {
            title: "工时",
            render: (_: unknown, r: Row) => {
              const h = getHours(r.startDate, r.endDate);
              const total = groupHours.get(`${r.employee?.id ?? ""}__${dayjs(r.startDate).format("YYYY-MM-DD")}`) ?? h;
              const base = total > 7.5 ? total : 7.5;
              const d = Number(calcWorkDay(r).toFixed(2));
              const text = `记录时长 ${fmtNum(h)}h，当天总工时 ${fmtNum(base)}h，折合 ${fmtNum(d)}d`;
              return <Popover content={text}><span>{fmtNum(d)}d</span></Popover>;
            },
          },
          {
            title: "操作",
            render: (_: unknown, r: Row) => (
              <TableActions
                onEdit={() => { setEditing(r); setOpen(true); }}
                onDelete={() => onDelete(r.id)}
                deleteTitle={`确定删除实际工时「${r.title}」？`}
              />
            ),
          },
        ]}
      />

      <Modal title={editing ? "编辑实际工时" : "新增实际工时"} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <ActualWorkEntryForm
          projectOptions={projects}
          employees={employees}
          initialValues={editing ? {
            id: editing.id,
            projectId: editing.project?.id ?? "",
            title: editing.title,
            employeeId: editing.employee?.id ?? "",
            startDate: editing.startDate,
            endDate: editing.endDate,
          } : null}
          onSubmit={onSubmit}
        />
      </Modal>
    </Card>
  );
}
