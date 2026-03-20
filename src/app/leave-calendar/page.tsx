"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Modal,
  Form,
  Select,
  Radio,
  DatePicker,
  Checkbox,
  Calendar,
  ConfigProvider,
  Spin,
  Space,
  Tag,
  Tooltip,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import zhCN from "antd/locale/zh_CN";
import type { Dayjs } from "dayjs";
import { useEmployeesStore } from "@/stores/employeesStore";

dayjs.locale("zh-cn");

type LeaveRecord = {
  id: string;
  type: string;
  typeOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  startAt?: string;
  endAt?: string | null;
  datePrecision?: "DATE" | "DATETIME";
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string };
};

type Employee = {
  id: string;
  name: string;
  employmentStatus?: string | null;
};

const DEFAULT_LEAVE_TYPE_COLOR = "#1677ff";

const LeaveCalendarPage = () => {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
  const [enableTimeSelection, setEnableTimeSelection] = useState(false);
  const [enableRangeSelection, setEnableRangeSelection] = useState(false);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);

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
      const data = await fetchEmployeesFromStore();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("获取员工列表失败:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchEmployees();
  }, []);

  const resolveStart = (record: LeaveRecord) =>
    record.startAt ?? record.startDate;
  const resolveEnd = (record: LeaveRecord) =>
    record.endAt ?? record.endDate ?? record.startAt ?? record.startDate;
  const isRange = (record: LeaveRecord) =>
    Boolean(
      resolveStart(record) &&
      resolveEnd(record) &&
      dayjs(resolveStart(record)).valueOf() !==
        dayjs(resolveEnd(record)).valueOf(),
    );
  const getCalendarTimeSuffix = (record: LeaveRecord) => {
    if ((record.datePrecision ?? "DATE") !== "DATETIME") return "";
    if (!record.endAt) return "";
    const start = dayjs(resolveStart(record));
    const end = dayjs(resolveEnd(record));
    if (!start.isValid() || !end.isValid()) return "";
    if (start.valueOf() === end.valueOf()) return "";
    return ` ${start.format("HH:mm")}-${end.format("HH:mm")}`;
  };
  const formatRecordTimeText = (record: LeaveRecord) => {
    const startRaw = resolveStart(record);
    const endRaw = resolveEnd(record);
    const start = dayjs(startRaw);
    const end = dayjs(endRaw);
    if (!start.isValid() || !end.isValid()) return "-";

    if ((record.datePrecision ?? "DATE") === "DATETIME") {
      if (start.valueOf() === end.valueOf()) {
        return start.format("YYYY-MM-DD HH:mm");
      }
      if (start.isSame(end, "day")) {
        return `${start.format("YYYY-MM-DD HH:mm")} - ${end.format("HH:mm")}`;
      }
      return `${start.format("YYYY-MM-DD HH:mm")} - ${end.format(
        "YYYY-MM-DD HH:mm",
      )}`;
    }

    if (start.isSame(end, "day")) {
      return start.format("YYYY-MM-DD");
    }
    return `${start.format("YYYY-MM-DD")} - ${end.format("YYYY-MM-DD")}`;
  };

  const formatRecordDuration = (record: LeaveRecord) => {
    const startRaw = resolveStart(record);
    const endRaw = resolveEnd(record);
    const start = dayjs(startRaw);
    const end = dayjs(endRaw);
    if (!start.isValid() || !end.isValid()) return "-";

    if ((record.datePrecision ?? "DATE") === "DATE") {
      const days = end.startOf("day").diff(start.startOf("day"), "day") + 1;
      return days > 0 ? `${days}d` : "-";
    }

    const minutes = end.diff(start, "minute");
    if (minutes <= 0) return "-";
    const hours = minutes / 60;
    if (Number.isInteger(hours)) return `${hours}h`;
    return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
  };

  const getTagTooltip = (record: LeaveRecord) => (
    <div>
      <div>员工：{record.employee?.name ?? "未知员工"}</div>
      <div>类型：{record.typeOption?.value ?? record.type ?? "-"}</div>
      <div>时间：{formatRecordTimeText(record)}</div>
      <div>时长：{formatRecordDuration(record)}</div>
    </div>
  );

  const handleOpenModal = () => {
    form.resetFields();
    setEditingRecord(null);
    setEnableTimeSelection(false);
    setEnableRangeSelection(false);
    setModalOpen(true);
  };

  const handleEditRecord = (record: LeaveRecord) => {
    const start = dayjs(resolveStart(record));
    const end = dayjs(resolveEnd(record));
    const hasRange = isRange(record);
    const withTime = (record.datePrecision ?? "DATE") === "DATETIME";
    setEnableTimeSelection(withTime);
    setEnableRangeSelection(hasRange);
    setEditingRecord(record);
    form.setFieldsValue({
      employeeId: record.employee?.id,
      type: record.type,
      time: hasRange
        ? [
            withTime ? start : start.startOf("day"),
            withTime ? end : end.startOf("day"),
          ]
        : withTime
          ? start
          : start.startOf("day"),
      includeTime: withTime,
      isRange: hasRange,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingRecord(null);
    setEnableTimeSelection(false);
    setEnableRangeSelection(false);
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

  const handleSubmit = async (values: {
    employeeId: string;
    type: string;
    includeTime?: boolean;
    isRange?: boolean;
    time: Dayjs | [Dayjs, Dayjs];
  }) => {
    try {
      setSubmitting(true);
      const resolvedStart = Array.isArray(values.time)
        ? values.time[0]
        : values.time;
      const resolvedEnd =
        values.isRange && Array.isArray(values.time) ? values.time[1] : null;
      const normalizedStartDate = values.includeTime
        ? resolvedStart
        : resolvedStart.startOf("day");
      const normalizedEndDate =
        values.isRange && resolvedEnd
          ? values.includeTime
            ? resolvedEnd
            : resolvedEnd.startOf("day")
          : null;
      const payload = {
        employeeId: values.employeeId,
        type: values.type,
        startAt: values.includeTime
          ? normalizedStartDate.toISOString()
          : normalizedStartDate.format("YYYY-MM-DD"),
        endAt: normalizedEndDate
          ? values.includeTime
            ? normalizedEndDate.toISOString()
            : normalizedEndDate.format("YYYY-MM-DD")
          : null,
        datePrecision: values.includeTime ? "DATETIME" : "DATE",
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

  const typeFilterOptions = Array.from(
    new Set(
      records
        .map((record) => record.type)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({
    label: value,
    value,
  }));

  const filteredRecords =
    typeFilters.length > 0
      ? records.filter((record) => typeFilters.includes(record.type))
      : records;
  const employeeSelectOptions = useMemo(() => {
    const editingEmployeeId = editingRecord?.employee?.id;
    const nextEmployees = employees.filter(
      (employee) =>
        employee.employmentStatus !== "离职" || employee.id === editingEmployeeId,
    );

    if (
      editingEmployeeId &&
      editingRecord?.employee?.name &&
      !nextEmployees.some((employee) => employee.id === editingEmployeeId)
    ) {
      nextEmployees.unshift({
        id: editingEmployeeId,
        name: editingRecord.employee.name,
        employmentStatus: "离职",
      });
    }

    return nextEmployees.map((employee) => ({
      label: employee.name,
      value: employee.id,
    }));
  }, [editingRecord, employees]);

  const recordsByDate = filteredRecords.reduce<Record<string, LeaveRecord[]>>(
    (acc, record) => {
      let cursor = dayjs(resolveStart(record)).startOf("day");
      const end = dayjs(resolveEnd(record)).startOf("day");
      while (cursor.isBefore(end) || cursor.isSame(end)) {
        const key = cursor.format("YYYY-MM-DD");
        if (!acc[key]) acc[key] = [];
        acc[key].push(record);
        cursor = cursor.add(1, "day");
      }
      return acc;
    },
    {},
  );

  return (
    <Card
      title={<h3>请假日历</h3>}
      extra={
        <Space size={8}>
          <Select
            mode="multiple"
            allowClear
            placeholder="类型筛选"
            style={{ minWidth: 180 }}
            value={typeFilters}
            options={typeFilterOptions}
            onChange={(values) => setTypeFilters(values)}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
          >
            新增记录
          </Button>
        </Space>
      }
    >
      <ConfigProvider locale={zhCN}>
        <Spin spinning={loading}>
          <Calendar
            cellRender={(current) => {
              const items = recordsByDate[current.format("YYYY-MM-DD")] ?? [];
              if (items.length === 0) return null;
              return (
                <div style={{ marginTop: 6 }}>
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${current.format("YYYY-MM-DD")}`}
                      style={{ marginBottom: 4 }}
                    >
                      <span
                        style={{ cursor: "pointer", display: "block" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRecord(item);
                        }}
                      >
                        <span>
                          <Tooltip title={getTagTooltip(item)}>
                            <Tag
                              color={
                                item.typeOption?.color ??
                                (item.typeOption?.value
                                  ? DEFAULT_LEAVE_TYPE_COLOR
                                  : null) ??
                                DEFAULT_LEAVE_TYPE_COLOR
                              }
                              style={{ marginInlineEnd: 0, borderRadius: 6 }}
                            >
                              {item.employee?.name ?? "未知员工"} ·{` `}
                              {item.typeOption?.value ?? item.type}
                              {getCalendarTimeSuffix(item)}
                            </Tag>
                          </Tooltip>
                        </span>
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
        title={editingRecord ? "编辑请假记录" : "新增请假记录"}
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            {editingRecord ? (
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
            <OkBtn />
          </>
        )}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={(changedValues) => {
            if ("includeTime" in changedValues) {
              setEnableTimeSelection(Boolean(changedValues.includeTime));
            }
            if ("isRange" in changedValues) {
              const next = Boolean(changedValues.isRange);
              setEnableRangeSelection(next);
              form.setFieldValue("time", undefined);
            }
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="员工"
            name="employeeId"
            rules={[{ required: true, message: "请选择员工" }]}
          >
            <Select placeholder="选择员工" options={employeeSelectOptions} />
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

          <Space style={{ marginBottom: 12 }}>
            <Form.Item name="includeTime" valuePropName="checked" noStyle>
              <Checkbox>包含时间</Checkbox>
            </Form.Item>
            <Form.Item name="isRange" valuePropName="checked" noStyle>
              <Checkbox>时间段</Checkbox>
            </Form.Item>
          </Space>
          <Form.Item
            label="时间"
            name="time"
            rules={[{ required: true, message: "请选择时间" }]}
          >
            {enableRangeSelection ? (
              <DatePicker.RangePicker
                showTime={enableTimeSelection}
                format={enableTimeSelection ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD"}
                style={{ width: "100%" }}
                locale={zhCN.DatePicker}
              />
            ) : (
              <DatePicker
                showTime={enableTimeSelection}
                format={enableTimeSelection ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD"}
                style={{ width: "100%" }}
                locale={zhCN.DatePicker}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default LeaveCalendarPage;
