"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Space, Tag } from "antd";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

type Detail = {
  id: string;
  name: string;
  type?: string | null;
  date?: string | null;
  location?: string | null;
  method?: string | null;
  project?: { id: string; name: string };
  internalParticipants?: { id: string; name: string }[];
  vendorParticipants?: { id: string; name: string }[];
  clientParticipants?: { id: string; name: string }[];
  documents?: { id: string; name: string }[];
};

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/project-milestones/${id}`).then(async (res) => {
      if (!res.ok) return setData(null);
      setData(await res.json());
    });
  }, [id]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title="里程碑详情">
        {data && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="名称">{data.name}</Descriptions.Item>
            <Descriptions.Item label="所属项目">{data.project ? <AppLink href={`/projects/${data.project.id}`}>{data.project.name}</AppLink> : "-"}</Descriptions.Item>
            <Descriptions.Item label="类型">{data.type ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="日期">{data.date ? dayjs(data.date).format("YYYY-MM-DD") : "-"}</Descriptions.Item>
            <Descriptions.Item label="地点">{data.location ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="方式">{data.method ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="内部参与人员">{(data.internalParticipants ?? []).map((i) => <Tag key={i.id}>{i.name}</Tag>)}</Descriptions.Item>
            <Descriptions.Item label="供应商">{(data.vendorParticipants ?? []).map((i) => <Tag key={i.id}>{i.name}</Tag>)}</Descriptions.Item>
            <Descriptions.Item label="客户参与人员">{(data.clientParticipants ?? []).map((i) => <Tag key={i.id}>{i.name}</Tag>)}</Descriptions.Item>
            <Descriptions.Item label="关联资料" span={3}>{(data.documents ?? []).map((d) => <Tag key={d.id}><AppLink href={`/project-documents/${d.id}`}>{d.name}</AppLink></Tag>)}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </Space>
  );
}
