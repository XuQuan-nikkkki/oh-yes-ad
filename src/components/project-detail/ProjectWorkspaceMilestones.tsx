"use client";

import { useMemo, useState } from "react";
import { Empty, Tag } from "antd";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import { formatDateRange } from "@/lib/date";
import type { Project } from "@/types/projectDetail";
import styles from "./ProjectWorkspaceMilestones.module.css";

type Milestone = NonNullable<Project["milestones"]>[number];
type DateState = "past" | "today" | "future" | "undated";

const dateValue = (milestone: Milestone) => {
  const value = milestone.startAt ?? milestone.date;
  const parsed = value ? dayjs(value) : null;
  return parsed?.isValid() ? parsed.valueOf() : null;
};

const dateState = (milestone: Milestone): DateState => {
  const value = milestone.endAt ?? milestone.startAt ?? milestone.date;
  const date = value ? dayjs(value) : null;
  if (!date?.isValid()) return "undated";
  if (date.isBefore(dayjs(), "day")) return "past";
  if (date.isAfter(dayjs(), "day")) return "future";
  return "today";
};

const statusText: Record<Exclude<DateState, "past">, string> = {
  today: "今天",
  future: "待进行",
  undated: "未排期",
};
const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const clientNames = (milestone: Milestone) =>
  milestone.clientParticipants?.map((person) =>
    person.title ? `${person.name}（${person.title}）` : person.name,
  ).join("、") ?? "";

type Props = { milestones: NonNullable<Project["milestones"]> };

export default function ProjectWorkspaceMilestones({ milestones }: Props) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const sortedMilestones = useMemo(() => [...milestones].sort((left, right) => {
    const leftDate = dateValue(left);
    const rightDate = dateValue(right);
    if (leftDate === null) return rightDate === null ? 0 : 1;
    if (rightDate === null) return -1;
    return rightDate - leftDate;
  }), [milestones]);

  return <>
    <h2 className={styles.heading}>里程碑</h2>
    {sortedMilestones.length === 0 ? <div className={styles.empty}><Empty description="暂无里程碑" /></div> :
      <ol className={styles.timeline}>
        {sortedMilestones.map((milestone) => {
          const state = dateState(milestone);
          const start = milestone.startAt ?? milestone.date;
          const dateText = formatDateRange({
            start,
            end: milestone.endAt,
            withTime: milestone.datePrecision === "DATETIME",
            emptyText: "日期待定",
          });
          const startDay = start ? dayjs(start) : null;
          const weekday = startDay?.isValid() ? weekdays[startDay.day()] : null;
          const internal = milestone.internalParticipants?.map((person) => person.name).join("、") ?? "";
          const vendors = milestone.vendorParticipants?.map((person) => person.name).join("、") ?? "";
          const clients = clientNames(milestone);
          const detail = milestone.detail?.trim() ?? "";
          const expanded = expandedIds.includes(milestone.id);
          const method = milestone.methodOption?.value ?? milestone.method;

          return <li key={milestone.id} className={`${styles.item} ${styles[state]}`}>
            <time className={styles.date} dateTime={start ?? undefined}>
              <span>{dateText}</span>{weekday && <small>{weekday}</small>}
            </time>
            <span className={styles.node} aria-hidden="true" />
            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <h3><AppLink href={`/project-milestones/${milestone.id}`} style={{ textDecoration: "none", fontWeight: 600 }}>{milestone.name}</AppLink></h3>
                <div className={styles.labels}>
                  {milestone.typeOption?.value
                    ? <SelectOptionTag field="projectMilestone.type" option={{
                        id: milestone.typeOption.id ?? "",
                        value: milestone.typeOption.value,
                        color: milestone.typeOption.color,
                      }} disabled />
                    : <Tag>{milestone.type || "未分类"}</Tag>}
                  {state !== "past" && <span className={styles.status}>{statusText[state]}</span>}
                </div>
              </div>
              {(clients || internal || vendors) ? <div className={styles.people}>
                {clients && <div><span>客户人员</span><strong>{clients}</strong></div>}
                {internal && <div><span>项目人员</span><strong>{internal}</strong></div>}
                {vendors && <div><span>供应商</span><strong>{vendors}</strong></div>}
              </div> : <p className={styles.noPeople}>参与人尚未记录</p>}
              {detail && <div className={styles.detail}>
                <span>详情</span>
                <p className={detail.length > 90 && !expanded ? styles.clamped : ""}>{detail}</p>
                {detail.length > 90 && <button type="button" onClick={() => setExpandedIds((current) =>
                  expanded ? current.filter((id) => id !== milestone.id) : [...current, milestone.id]
                )}>{expanded ? "收起" : "展开"}</button>}
              </div>}
              {(method || milestone.location) && <div className={styles.auxiliary}>
                {method && <span>方式：{method}</span>}
                {milestone.location && <span>地点：{milestone.location}</span>}
              </div>}
            </article>
          </li>;
        })}
      </ol>}
  </>;
}
