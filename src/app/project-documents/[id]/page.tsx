"use client";

import { useEffect, useState } from "react";
import { Card, Checkbox, Descriptions, Space, Tag } from "antd";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

type Detail = {
  id: string;
  name: string;
  type?: string | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
  project?: { id: string; name: string };
  milestones?: { id: string; name: string }[];
};

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/project-documents/${id}`).then(async (res) => {
      if (!res.ok) return setData(null);
      setData(await res.json());
    });
  }, [id]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title="资料详情">
        {data && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="名称">{data.name}</Descriptions.Item>
            <Descriptions.Item label="所属项目">{data.project ? <AppLink href={`/projects/${data.project.id}`}>{data.project.name}</AppLink> : "-"}</Descriptions.Item>
            <Descriptions.Item label="类型">{data.type ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="日期">{data.date ? dayjs(data.date).format("YYYY-MM-DD") : "-"}</Descriptions.Item>
            <Descriptions.Item label="是最终版"><Checkbox checked={data.isFinal} onChange={() => {}} style={{ pointerEvents: "none" }} /></Descriptions.Item>
            <Descriptions.Item label="内部链接">{data.internalLink ? <a href={data.internalLink} target="_blank" rel="noopener noreferrer">{data.internalLink}</a> : "-"}</Descriptions.Item>
            <Descriptions.Item label="关联里程碑" span={3}>{(data.milestones ?? []).map((m) => <Tag key={m.id}><AppLink href={`/project-milestones/${m.id}`}>{m.name}</AppLink></Tag>)}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </Space>
  );
}
