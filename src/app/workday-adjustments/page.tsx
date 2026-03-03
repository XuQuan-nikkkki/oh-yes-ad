"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Radio,
  DatePicker,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import zhCN from "antd/locale/zh_CN";
import TableActions from "@/components/TableActions";
import type { Dayjs } from "dayjs";

dayjs.locale("zh-cn");

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkdayAdjustment | null>(
    null
  );
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

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

  const handleOpenModal = () => {
    form.resetFields();
    setEditingRecord(null);
    setModalOpen(true);
  };

  const handleEditRecord = (record: WorkdayAdjustment) => {
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.name,
      changeType: record.changeType,
      dateRange: [
        dayjs(record.startDate),
        dayjs(record.endDate),
      ] as [Dayjs, Dayjs],
    });
    setModalOpen(true);
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/workday-adjustments/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }

      await fetchRecords();
    } catch (error) {
      console.error("删除工作日变动失败:", error);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingRecord(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const [startDate, endDate] = values.dateRange;
      const payload = {
        name: values.name || null,
        changeType: values.changeType,
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
      };

      if (editingRecord) {
        // 编辑模式
        const res = await fetch(
          `/api/workday-adjustments/${editingRecord.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          throw new Error("编辑失败");
        }
      } else {
        // 创建模式
        const res = await fetch("/api/workday-adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("添加失败");
        }
      }

      await fetchRecords();
      handleCloseModal();
    } catch (error) {
      console.error("保存工作日变动失败:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const changeTypeOptions = Array.from(
    new Set(records.map((r) => r.changeType).filter(Boolean))
  );

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      width: 140,
      ellipsis: true,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "变动类型",
      dataIndex: "changeType",
      width: 140,
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
      sorter: (a: WorkdayAdjustment, b: WorkdayAdjustment) =>
        a.startDate.localeCompare(b.startDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
    {
      title: "结束日期",
      dataIndex: "endDate",
      sorter: (a: WorkdayAdjustment, b: WorkdayAdjustment) =>
        a.endDate.localeCompare(b.endDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
    {
      title: "操作",
      fixed: "right" as const,
      render: (_: any, record: WorkdayAdjustment) => (
        <TableActions
          onEdit={() => handleEditRecord(record)}
          onDelete={() => handleDeleteRecord(record.id)}
          deleteTitle="确定删除这个工作日变动？"
        />
      ),
    },
  ];

  return (
    <Card
      title={<h3>工作日变动</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          添加
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "暂无工作日变动" }}
      />

      <Modal
        title={editingRecord ? "编辑工作日变动" : "添加工作日变动"}
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input placeholder="例如：春节调休" />
          </Form.Item>

          <Form.Item
            label="变动类型"
            name="changeType"
            rules={[{ required: true, message: "请选择变动类型" }]}
          >
            <Radio.Group optionType="button">
              <Radio value="上班">上班</Radio>
              <Radio value="休息">休息</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="日期范围"
            name="dateRange"
            rules={[{ required: true, message: "请选择日期范围" }]}
          >
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              locale={zhCN.DatePicker}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default WorkdayAdjustmentsPage;
