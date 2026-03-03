"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Select,
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

type LeaveRecord = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string };
};

type Employee = {
  id: string;
  name: string;
};

const LeaveCalendarPage = () => {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const leaveTypeOptions = ["调休", "年假", "病假"];

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave-records");
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("获取员工列表失败:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchEmployees();
  }, []);

  const handleOpenModal = () => {
    form.resetFields();
    setEditingRecord(null);
    setModalOpen(true);
  };

  const handleEditRecord = (record: LeaveRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      employeeId: record.employee?.id,
      type: record.type,
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)] as [
        Dayjs,
        Dayjs,
      ],
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingRecord(null);
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/leave-records/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }

      await fetchRecords();
    } catch (error) {
      console.error("删除请假记录失败:", error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const [startDate, endDate] = values.dateRange;
      const payload = {
        employeeId: values.employeeId,
        type: values.type,
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
      };

      if (editingRecord) {
        // 编辑模式
        const res = await fetch(`/api/leave-records/${editingRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("编辑失败");
        }
      } else {
        // 新增模式
        const res = await fetch("/api/leave-records", {
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
      console.error("保存请假记录失败:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const employeeOptions = records
    .map((r) => r.employee?.name)
    .filter(Boolean) as string[];
  const uniqueEmployeeOptions = Array.from(new Set(employeeOptions));

  const typeOptions = Array.from(new Set(records.map((r) => r.type)));

  const columns = [
    {
      title: "员工",
      dataIndex: ["employee", "name"],
      sorter: (a: LeaveRecord, b: LeaveRecord) =>
        (a.employee?.name || "").localeCompare(b.employee?.name || ""),
      filters: uniqueEmployeeOptions.map((name) => ({
        text: name,
        value: name,
      })),
      onFilter: (value: string | number | boolean, record: LeaveRecord) =>
        record.employee?.name === value,
    },
    {
      title: "请假类型",
      dataIndex: "type",
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
      title: "开始日期",
      dataIndex: "startDate",
      sorter: (a: LeaveRecord, b: LeaveRecord) =>
        a.startDate.localeCompare(b.startDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "结束日期",
      dataIndex: "endDate",
      sorter: (a: LeaveRecord, b: LeaveRecord) =>
        a.endDate.localeCompare(b.endDate),
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      width: 120,
      fixed: "right" as const,
      render: (_: any, record: LeaveRecord) => (
        <TableActions
          onEdit={() => handleEditRecord(record)}
          onDelete={() => handleDeleteRecord(record.id)}
          deleteTitle="确定删除这条请假记录？"
        />
      ),
    },
  ];

  return (
    <Card
      title={<h3>请假日历</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          新增记录
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "暂无请假记录" }}
      />

      <Modal
        title={editingRecord ? "编辑请假记录" : "新增请假记录"}
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
            label="员工"
            name="employeeId"
            rules={[{ required: true, message: "请选择员工" }]}
          >
            <Select placeholder="选择员工">
              {employees.map((employee) => (
                <Select.Option key={employee.id} value={employee.id}>
                  {employee.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="请假类型"
            name="type"
            rules={[{ required: true, message: "请选择请假类型" }]}
          >
            <Radio.Group optionType="button">
              {leaveTypeOptions.map((type) => (
                <Radio key={type} value={type}>
                  {type}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="日期范围"
            name="dateRange"
            rules={[{ required: true, message: "请选择日期范围" }]}
          >
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: "100%" }}
              locale={zhCN.DatePicker}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default LeaveCalendarPage;
