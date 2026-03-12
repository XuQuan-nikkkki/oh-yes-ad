"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Space, Table } from "antd";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

type Detail = {
  id: string;
  name: string;
  status?: string | null;
  dueDate?: string | null;
  project?: { id: string; name: string };
  owner?: { id: string; name: string } | null;
  projectTasks?: { id: string; name: string; status?: string | null; dueDate?: string | null }[];
};

export default function ProjectSegmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/project-segments/${id}`).then(async (res) => {
      if (!res.ok) return setData(null);
      setData(await res.json());
    });
  }, [id]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title="环节详情">
        {data && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="名称">{data.name}</Descriptions.Item>
            <Descriptions.Item label="所属项目">
              {data.project ? <AppLink href={`/projects/${data.project.id}`}>{data.project.name}</AppLink> : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="负责人">{data.owner?.name ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="状态">{data.status ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="截止日期">{data.dueDate ? dayjs(data.dueDate).format("YYYY-MM-DD") : "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="任务列表">
        <Table
          rowKey="id"
          dataSource={data?.projectTasks ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无任务" }}
          columns={[
            { title: "任务", dataIndex: "name", render: (v: string, r) => <AppLink href={`/project-tasks/${r.id}`}>{v}</AppLink> },
            { title: "状态", dataIndex: "status", render: (v: string | null) => v ?? "-" },
            { title: "截止日期", dataIndex: "dueDate", render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD") : "-") },
          ]}
        />
      </Card>
    </Space>
  );
}
