"use client";

import { useMemo, useState } from "react";
import { Button, Empty, Input, Pagination, Popconfirm, Segmented, Select, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, InfoCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import {
  calculateActualWorkdays,
  DEFAULT_WORKDAY_HOURS,
  getActualWorkEntryHours,
  getActualWorkdayGroupKey,
} from "@/lib/actual-workdays";
import type { Project } from "@/types/projectDetail";
import styles from "./ProjectWorkspaceWork.module.css";

type Entry = NonNullable<Project["actualWorkEntries"]>[number];
type Member = NonNullable<Project["members"]>[number];
type CalculatedEntry = Entry & { hours: number; dailyHours: number; days: number };

type Props = {
  entries: Entry[];
  members: Member[];
  view: "records" | "analysis";
  onViewChange: (view: "records" | "analysis") => void;
  onCreate: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => Promise<void>;
  canManageEntry: (entry: Entry) => boolean;
};

const round2 = (value: number) => Number(value.toFixed(2));
const formatHours = (value: number) => value.toFixed(1);

export default function ProjectWorkspaceWork({
  entries,
  members,
  view,
  onViewChange,
  onCreate,
  onEdit,
  onDelete,
  canManageEntry,
}: Props) {
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const calculated = useMemo<CalculatedEntry[]>(() => {
    const dailyHours = new Map<string, number>();
    for (const entry of entries) {
      const key = getActualWorkdayGroupKey(entry.employee?.id ?? `unknown-${entry.id}`, entry.startDate);
      dailyHours.set(key, round2((dailyHours.get(key) ?? 0) + round2(getActualWorkEntryHours(entry.startDate, entry.endDate))));
    }
    return entries.map((entry) => {
      const hours = round2(getActualWorkEntryHours(entry.startDate, entry.endDate));
      const key = getActualWorkdayGroupKey(entry.employee?.id ?? `unknown-${entry.id}`, entry.startDate);
      const total = dailyHours.get(key) ?? hours;
      return { ...entry, hours, dailyHours: total, days: round2(calculateActualWorkdays(hours, total)) };
    }).sort((left, right) => dayjs(right.startDate).valueOf() - dayjs(left.startDate).valueOf());
  }, [entries]);

  const employeeOptions = useMemo(() => {
    const memberById = new Map(members.map((member) => [member.id, member]));
    const people = new Map<string, { name: string; group: string }>();
    calculated.forEach((entry) => {
      if (!entry.employee?.id) return;
      const group = entry.employee.functionOption?.value?.trim()
        || entry.employee.function?.trim()
        || memberById.get(entry.employee.id)?.function?.trim()
        || "其他";
      people.set(entry.employee.id, { name: entry.employee.name, group });
    });
    const groups = new Map<string, { value: string; label: string }[]>();
    for (const [value, { name, group }] of people) {
      groups.set(group, [...(groups.get(group) ?? []), { value, label: name }]);
    }
    const preferred = ["项目组", "设计组"];
    const rank = (group: string) => group === "其他" ? 3 : preferred.includes(group) ? preferred.indexOf(group) : 2;
    return [...groups].sort(([left], [right]) => rank(left) - rank(right) || left.localeCompare(right, "zh-CN"))
      .map(([label, options]) => ({ label, options: options.sort((left, right) => left.label.localeCompare(right.label, "zh-CN")) }));
  }, [calculated, members]);

  const filtered = useMemo(() => calculated.filter((entry) =>
    (!employeeId || entry.employee?.id === employeeId) &&
    entry.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  ), [calculated, employeeId, search]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const analysis = useMemo(() => {
    const memberById = new Map(members.map((member) => [member.id, member]));
    const byPerson = new Map<string, { id: string; name: string; hours: number; days: number; count: number; departed: boolean }>();
    calculated.forEach((entry) => {
      const id = entry.employee?.id ?? `unknown-${entry.id}`;
      const existing = byPerson.get(id);
      if (existing) {
        existing.hours = round2(existing.hours + entry.hours);
        existing.days = round2(existing.days + entry.days);
        existing.count++;
      } else {
        const status = memberById.get(id)?.employmentStatus ?? "";
        byPerson.set(id, {
          id,
          name: entry.employee?.name ?? "未分配成员",
          hours: entry.hours,
          days: entry.days,
          count: 1,
          departed: status.includes("离职") || status.toUpperCase().includes("LEFT"),
        });
      }
    });
    const people = [...byPerson.values()].sort((left, right) => right.hours - left.hours || left.name.localeCompare(right.name, "zh-CN"));
    return {
      people,
      totalHours: round2(people.reduce((total, person) => total + person.hours, 0)),
      totalDays: round2(people.reduce((total, person) => total + person.days, 0)),
    };
  }, [calculated, members]);

  const showPersonRecords = (id: string) => {
    setEmployeeId(id.startsWith("unknown-") ? undefined : id);
    setSearch("");
    setPage(1);
    onViewChange("records");
  };

  return <div className={styles.work}>
    <div className={styles.heading}>
      <h2>工时</h2>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>新增实际工时</Button>
    </div>
    <Segmented
      value={view}
      options={[{ label: "工时记录", value: "records" }, { label: "工时分析", value: "analysis" }]}
      onChange={(value) => onViewChange(value as "records" | "analysis")}
    />

    {view === "records" ? <div className={styles.records}>
      <div className={styles.filters}>
        <Input prefix={<SearchOutlined />} placeholder="搜索事件" value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }} allowClear />
        <Select aria-label="筛选人员" value={employeeId} placeholder="全部人员" allowClear showSearch optionFilterProp="label"
          options={employeeOptions} onChange={(value) => { setEmployeeId(value); setPage(1); }} />
      </div>
      <div className={styles.tableScroll}>
        <div className={`${styles.row} ${styles.tableHead}`}><span>事件</span><span>人员</span><span>日期与时间</span><span>工时</span><span>操作</span></div>
        {visible.map((entry) => <div className={styles.row} key={entry.id}>
          <AppLink className={styles.eventLink} href={`/actual-work-entries/${entry.id}`}>{entry.title}</AppLink>
          {entry.employee?.id ? <AppLink href={`/employees/${entry.employee.id}`}>{entry.employee.name}</AppLink> : <span>未分配成员</span>}
          <span className={styles.date}><strong>{dayjs(entry.startDate).format("YYYY-MM-DD")}</strong><small>{dayjs(entry.startDate).format("HH:mm")}–{dayjs(entry.endDate).format("HH:mm")}</small></span>
          <span className={styles.duration}><strong>{formatHours(entry.hours)} 小时</strong><small>{entry.days.toFixed(2)} 天
            <Tooltip title={<span>记录时长 {entry.hours.toFixed(2)}h，当天总工时 {entry.dailyHours.toFixed(2)}h。当天不超过 {DEFAULT_WORKDAY_HOURS}h 时按 {DEFAULT_WORKDAY_HOURS}h 折算；超过时按当天总工时分摊，折合 {entry.days.toFixed(2)} 天。</span>}>
              <button type="button" className={styles.info} aria-label={`查看「${entry.title}」的工时折算说明`}><InfoCircleOutlined /></button>
            </Tooltip>
          </small></span>
          <span className={styles.actions}>
            <Button type="link" size="small" icon={<EditOutlined />} disabled={!canManageEntry(entry)} onClick={() => onEdit(entry)}>编辑</Button>
            <Popconfirm title={`确定删除实际工时「${entry.title}」？`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => onDelete(entry)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={!canManageEntry(entry)}>删除</Button>
            </Popconfirm>
          </span>
        </div>)}
      </div>
      {filtered.length === 0 && <Empty className={styles.empty} description="没有匹配的工时记录" />}
      <div className={styles.footer}>
        <span>共 {filtered.length} 条记录</span>
        {filtered.length > 0 && <Pagination current={currentPage} total={filtered.length} pageSize={pageSize} showSizeChanger pageSizeOptions={[10, 20, 50]}
          onChange={(nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); }} />}
      </div>
    </div> : <>
      <div className={styles.summary}>
        <div><span>已记录工时</span><strong>{formatHours(analysis.totalHours)}<small> 小时</small></strong></div>
        <div><span>折算工作日</span><strong>{analysis.totalDays.toFixed(2)}<small> 天</small></strong></div>
        <div><span>记录人员</span><strong>{analysis.people.length}<small> 人</small></strong></div>
      </div>
      <div className={styles.analysis}>
        <div className={styles.analysisTitle}><h3>人员工时分布</h3><span>全部 {calculated.length} 条记录 · 按工时从高到低</span></div>
        <div className={`${styles.personRow} ${styles.tableHead}`}><span>人员</span><span>工时占比</span><span>工时</span><span>折算天数</span><span /></div>
        {analysis.people.map((person) => {
          const ratio = analysis.totalHours > 0 ? person.hours / analysis.totalHours * 100 : 0;
          return <div className={styles.personRow} key={person.id}>
            <span>{person.id.startsWith("unknown-") ? person.name : <AppLink href={`/employees/${person.id}`}>{person.name}</AppLink>}{person.departed && <small className={styles.departed}>离职</small>}</span>
            <span className={styles.ratio}><span className={styles.track}><i style={{ width: `${ratio}%` }} /></span><span>{ratio.toFixed(1)}%</span></span>
            <strong>{formatHours(person.hours)} h</strong><span>{person.days.toFixed(2)} d</span>
            <Button type="link" size="small" onClick={() => showPersonRecords(person.id)}>查看记录 →</Button>
          </div>;
        })}
        {analysis.people.length === 0 && <Empty className={styles.empty} description="暂无工时记录" />}
      </div>
    </>}
  </div>;
}
