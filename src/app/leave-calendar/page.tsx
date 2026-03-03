"use client";

import { useEffect, useState } from "react";
import { Table, Card, Tag } from "antd";
import dayjs from "dayjs";

type LeaveRecord = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string };
};

const LeaveCalendarPage = () => {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    const res = await fetch("/api/leave-records");
    const data = await res.json();
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const typeOptions = Array.from(new Set(records.map((r) => r.type)));

  const columns = [
    {
      title: "请假类型",
      dataIndex: "type",
      width: 120,
      filters: typeOptions.map((t) => ({ text: t, value: t })),
      onFilter: (value: string | number | boolean, record: LeaveRecord) =>
        record.type === value,
      render: (value: string) => (
        <Tag style={{ borderRadius: 6, padding: "2px 10px", fontWeight: 500 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: "员工",
      dataIndex: ["employee", "name"],
      sorter: (a: LeaveRecord, b: LeaveRecord) =>
        (a.employee?.name || "").localeCompare(b.employee?.name || ""),
    },
    {
      title: "开始日期",
      dataIndex: "startDate",
      width: 120,
      sorter: (a: LeaveRecord, b: LeaveRecord) =>
        a.startDate.localeCompare(b.startDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
    {
      title: "结束日期",
      dataIndex: "endDate",
      width: 120,
      sorter: (a: LeaveRecord, b: LeaveRecord) =>
        a.endDate.localeCompare(b.endDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
  ];

  return (
    <Card title={<h3>请假日历</h3>}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "暂无请假记录" }}
      />
    </Card>
  );
};

export default LeaveCalendarPage;
