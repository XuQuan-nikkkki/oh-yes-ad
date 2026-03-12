"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Space, Table } from "antd";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

type Detail = {
  id: string;
  name: string;
  dueDate?: string | null;
  segment?: { id: string; name: string; project?: { id: string; name: string } };
  owner?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  plannedWorkEntries?: { id: string; year: number; weekNumber: number; plannedDays: number }[];
};

export default function ProjectTaskDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/project-tasks/${id}`).then(async (res) => {
      if (!res.ok) return setData(null);
      setData(await res.json());
    });
  }, [id]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title="任务详情">
        {data && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="任务名称">{data.name}</Descriptions.Item>
            <Descriptions.Item label="所属项目">
              {data.segment?.project ? (
                <AppLink href={`/projects/${data.segment.project.id}`}>{data.segment.project.name}</AppLink>
              ) : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="所属环节">
              {data.segment ? <AppLink href={`/project-segments/${data.segment.id}`}>{data.segment.name}</AppLink> : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="负责人">{data.owner?.name ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="创建者">{data.creator?.name ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="截止日期">{data.dueDate ? dayjs(data.dueDate).format("YYYY-MM-DD") : "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="计划工时记录">
        <Table
          rowKey="id"
          dataSource={data?.plannedWorkEntries ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无计划工时" }}
          columns={[
            { title: "年份", dataIndex: "year" },
            { title: "周数", dataIndex: "weekNumber" },
            { title: "计划天数", dataIndex: "plannedDays" },
          ]}
        />
      </Card>
    </Space>
  );
}
