"use client";

import { useEffect, useState } from "react";
import { Table, Card, Tag } from "antd";
import dayjs from "dayjs";

type WorkdayAdjustment = {
  id: string;
  name?: string | null;
  changeType: string;
  startDate: string;
  endDate: string;
};

const WorkdayAdjustmentsPage = () => {
  const [records, setRecords] = useState<WorkdayAdjustment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workday-adjustments");
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("获取工作日变动失败:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const changeTypeOptions = Array.from(
    new Set(records.map((r) => r.changeType).filter(Boolean))
  );

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      width: 160,
      ellipsis: true,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "变动类型",
      dataIndex: "changeType",
      width: 120,
      filters: changeTypeOptions.map((t) => ({ text: t, value: t })),
      onFilter: (value: string | number | boolean, record: WorkdayAdjustment) =>
        record.changeType === value,
      render: (value: string) => (
        <Tag style={{ borderRadius: 6, padding: "2px 10px", fontWeight: 500 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: "开始日期",
      dataIndex: "startDate",
      width: 120,
      sorter: (a: WorkdayAdjustment, b: WorkdayAdjustment) =>
        a.startDate.localeCompare(b.startDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
    {
      title: "结束日期",
      dataIndex: "endDate",
      width: 120,
      sorter: (a: WorkdayAdjustment, b: WorkdayAdjustment) =>
        a.endDate.localeCompare(b.endDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
  ];

  return (
    <Card title={<h3>工作日变动</h3>}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "暂无工作日变动" }}
      />
    </Card>
  );
};

export default WorkdayAdjustmentsPage;
