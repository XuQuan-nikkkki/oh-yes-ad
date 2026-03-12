"use client";

import { useEffect, useState } from "react";
import { Card, Checkbox, Descriptions, Space } from "antd";
import { useParams } from "next/navigation";
import AppLink from "@/components/AppLink";

type Detail = {
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
    segment?: { id: string; name: string; project?: { id: string; name: string } };
  };
};

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/planned-work-entries/${id}`).then(async (res) => {
      if (!res.ok) return setData(null);
      setData(await res.json());
    });
  }, [id]);

  const cb = (checked: boolean) => <Checkbox checked={checked} onChange={() => {}} style={{ pointerEvents: "none" }} />;

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title="计划工时详情">
        {data && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="所属项目">{data.task?.segment?.project ? <AppLink href={`/projects/${data.task.segment.project.id}`}>{data.task.segment.project.name}</AppLink> : "-"}</Descriptions.Item>
            <Descriptions.Item label="所属环节">{data.task?.segment ? <AppLink href={`/project-segments/${data.task.segment.id}`}>{data.task.segment.name}</AppLink> : "-"}</Descriptions.Item>
            <Descriptions.Item label="所属任务">{data.task ? <AppLink href={`/project-tasks/${data.task.id}`}>{data.task.name}</AppLink> : "-"}</Descriptions.Item>
            <Descriptions.Item label="年份">{data.year}</Descriptions.Item>
            <Descriptions.Item label="周数">{data.weekNumber}</Descriptions.Item>
            <Descriptions.Item label="计划天数">{data.plannedDays}</Descriptions.Item>
            <Descriptions.Item label="周一">{cb(data.monday)}</Descriptions.Item>
            <Descriptions.Item label="周二">{cb(data.tuesday)}</Descriptions.Item>
            <Descriptions.Item label="周三">{cb(data.wednesday)}</Descriptions.Item>
            <Descriptions.Item label="周四">{cb(data.thursday)}</Descriptions.Item>
            <Descriptions.Item label="周五">{cb(data.friday)}</Descriptions.Item>
            <Descriptions.Item label="周六">{cb(data.saturday)}</Descriptions.Item>
            <Descriptions.Item label="周天">{cb(data.sunday)}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </Space>
  );
}
