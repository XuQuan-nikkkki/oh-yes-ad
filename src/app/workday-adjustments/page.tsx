"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Radio,
  DatePicker,
  Calendar,
  ConfigProvider,
  Spin,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import zhCN from "antd/locale/zh_CN";
import type { Dayjs } from "dayjs";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import type { WorkdayAdjustment } from "@/types/workdayAdjustment";
import { canManageWorkdayAdjustments } from "@/lib/role-permissions";

dayjs.locale("zh-cn");

const WorkdayAdjustmentsPage = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canManage = canManageWorkdayAdjustments(roleCodes);
  const [records, setRecords] = useState<WorkdayAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkdayAdjustment | null>(
    null
  );
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdjustmentsFromStore();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("获取工作日变动失败:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAdjustmentsFromStore]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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

      await fetchAdjustmentsFromStore({ force: true });
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

  const handleSubmit = async (values: {
    name: string;
    changeType: "上班" | "休息";
    dateRange: [Dayjs, Dayjs];
  }) => {
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

      await fetchAdjustmentsFromStore({ force: true });
      await fetchRecords();
      handleCloseModal();
    } catch (error) {
      console.error("保存工作日变动失败:", error);
    } finally {
      setSubmitting(false);
    }
  };
  const recordsByDate = records.reduce<Record<string, WorkdayAdjustment[]>>(
    (acc, record) => {
      let cursor = dayjs(record.startDate).startOf("day");
      const end = dayjs(record.endDate).startOf("day");
      while (cursor.isBefore(end) || cursor.isSame(end)) {
        const key = cursor.format("YYYY-MM-DD");
        if (!acc[key]) acc[key] = [];
        acc[key].push(record);
        cursor = cursor.add(1, "day");
      }
      return acc;
    },
    {}
  );

  const getTypeColor = (changeType: string) =>
    changeType === "上班" ? "#52c41a" : "#ff4d4f";

  return (
    <Card
      title={<h3>工作日变动</h3>}
      extra={
        canManage ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
          >
            添加
          </Button>
        ) : null
      }
    >
      <ConfigProvider locale={zhCN}>
        <Spin spinning={loading}>
          <Calendar
            cellRender={(current) => {
              const dateKey = current.format("YYYY-MM-DD");
              const items = recordsByDate[dateKey] ?? [];
              if (items.length === 0) return null;
              return (
                <div style={{ marginTop: 6 }}>
                  {items.map((item) => (
                    <div key={`${dateKey}-${item.id}`} style={{ marginBottom: 4 }}>
                      <span
                        style={{
                          cursor: canManage ? "pointer" : "default",
                          display: "block",
                        }}
                        onClick={(e) => {
                          if (!canManage) return;
                          e.stopPropagation();
                          handleEditRecord(item);
                        }}
                      >
                        <Tag color={getTypeColor(item.changeType)}>
                          {`${item.name || "未命名"} · ${item.changeType}`}
                        </Tag>
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </Spin>
      </ConfigProvider>

      <Modal
        title={editingRecord ? "编辑工作日变动" : "添加工作日变动"}
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        afterClose={() => {
          setEditingRecord(null);
        }}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            {canManage && editingRecord ? (
              <Button
                danger
                onClick={async () => {
                  if (!editingRecord) return;
                  await handleDeleteRecord(editingRecord.id);
                  handleCloseModal();
                }}
              >
                删除
              </Button>
            ) : null}
            <CancelBtn />
            {canManage ? <OkBtn /> : null}
          </>
        )}
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
