"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Space } from "antd";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

type Detail = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  project?: { id: string; name: string };
  employee?: { id: string; name: string };
};

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/actual-work-entries/${id}`).then(async (res) => {
      if (!res.ok) return setData(null);
      setData(await res.json());
    });
  }, [id]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card title="实际工时详情">
        {data && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="事件">{data.title}</Descriptions.Item>
            <Descriptions.Item label="所属项目">{data.project ? <AppLink href={`/projects/${data.project.id}`}>{data.project.name}</AppLink> : "-"}</Descriptions.Item>
            <Descriptions.Item label="人员">{data.employee?.name ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{dayjs(data.startDate).format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
            <Descriptions.Item label="结束时间">{dayjs(data.endDate).format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </Space>
  );
}
