"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Empty, Popconfirm, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import ProjectReimbursementFormModal, {
  type ProjectReimbursementFormValues,
} from "@/components/project-detail/ProjectReimbursementFormModal";
import { formatDate } from "@/lib/date";

type EmployeeOption = {
  id: string;
  name: string;
};

type Props = {
  projectId: string;
  projectName: string;
  employees: EmployeeOption[];
  canManageProject?: boolean;
  open: boolean;
  onCancel: () => void;
};

type ReimbursementRow = {
  id: string;
  applicantEmployee?: {
    id: string;
    name: string;
  } | null;
  occurredAt: string;
  amount: number | string | null;
  categoryOption?: {
    id: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type CategoryOption = {
  id: string;
  value: string;
  color?: string | null;
};

const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const toAmountNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const ProjectReimbursementRecordsContent = ({
  projectId,
  projectName,
  employees,
  canManageProject = false,
  open,
  onCancel,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<ReimbursementRow[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [editingRecord, setEditingRecord] = useState<ReimbursementRow | null>(
    null,
  );

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/reimbursements`, {
        cache: "no-store",
      });
      const data = res.ok ? ((await res.json()) as ReimbursementRow[]) : [];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchCategoryOptions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/project-financial-structures?projectId=${projectId}`,
        { cache: "no-store" },
      );
      const data = res.ok
        ? ((await res.json()) as Array<{
            executionCostItems?: Array<{
              costTypeOption?: {
                id?: string;
                value?: string | null;
                color?: string | null;
              } | null;
            }>;
          }>)
        : [];

      const structure = Array.isArray(data) ? data[0] : null;
      const options = (structure?.executionCostItems ?? [])
        .map((item) => item.costTypeOption)
        .filter(
          (item): item is NonNullable<typeof item> =>
            Boolean(item?.id && item.value),
        )
        .map((item) => ({
          id: item.id!,
          value: item.value!,
          color: item.color ?? null,
        }));
      setCategoryOptions(options);
    } catch {
      setCategoryOptions([]);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchRows();
    void fetchCategoryOptions();
  }, [fetchCategoryOptions, fetchRows]);

  const handleCreate = useCallback(
    async (values: ProjectReimbursementFormValues) => {
      setSubmitting(true);
      try {
        const isEdit = Boolean(editingRecord?.id);
        const res = await fetch(
          isEdit
            ? `/api/projects/${projectId}/reimbursements/${editingRecord?.id}`
            : `/api/projects/${projectId}/reimbursements`,
          {
            method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
          },
        );
        if (!res.ok) {
          if (typeof app?.message?.error === "function") {
            app.message.error(isEdit ? "更新报销失败" : "新增报销失败");
          } else {
            void messageApi.error(isEdit ? "更新报销失败" : "新增报销失败");
          }
          return;
        }
        if (typeof app?.message?.success === "function") {
          app.message.success(isEdit ? "更新报销成功" : "新增报销成功");
        } else {
          void messageApi.success(isEdit ? "更新报销成功" : "新增报销成功");
        }
        setEditingRecord(null);
        onCancel();
        await fetchRows();
      } catch {
        if (typeof app?.message?.error === "function") {
          app.message.error(editingRecord ? "更新报销失败" : "新增报销失败");
        } else {
          void messageApi.error(editingRecord ? "更新报销失败" : "新增报销失败");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [app, editingRecord, fetchRows, messageApi, onCancel, projectId],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/reimbursements/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          if (typeof app?.message?.error === "function") {
            app.message.error("删除报销失败");
          } else {
            void messageApi.error("删除报销失败");
          }
          return;
        }
        if (typeof app?.message?.success === "function") {
          app.message.success("删除报销成功");
        } else {
          void messageApi.success("删除报销成功");
        }
        await fetchRows();
      } catch {
        if (typeof app?.message?.error === "function") {
          app.message.error("删除报销失败");
        } else {
          void messageApi.error("删除报销失败");
        }
      }
    },
    [app, fetchRows, messageApi, projectId],
  );

  const columns = useMemo<ColumnsType<ReimbursementRow>>(
    () => [
      {
        title: "申请人",
        dataIndex: "applicantEmployee",
        key: "applicantEmployee",
        render: (value: ReimbursementRow["applicantEmployee"]) =>
          value?.id ? <AppLink href={`/employees/${value.id}`}>{value.name}</AppLink> : "-",
      },
      {
        title: "费用发生日期",
        dataIndex: "occurredAt",
        key: "occurredAt",
        render: (value: string) => formatDate(value),
      },
      {
        title: "执行费用类别",
        dataIndex: "categoryOption",
        key: "categoryOption",
        render: (value: ReimbursementRow["categoryOption"]) =>
          value?.value ? <SelectOptionTag option={value} /> : "-",
      },
      {
        title: "金额",
        dataIndex: "amount",
        key: "amount",
        render: (value: ReimbursementRow["amount"]) =>
          `${formatAmount(toAmountNumber(value))} 元`,
      },
      {
        title: "操作",
        key: "actions",
        width: 140,
        render: (_value, record) =>
          canManageProject ? (
            <div style={{ display: "flex", gap: 12 }}>
              <a
                onClick={() => {
                  setEditingRecord(record);
                }}
              >
                编辑
              </a>
              <Popconfirm
                title="确定删除这条报销记录？"
                onConfirm={() => {
                  void handleDelete(record.id);
                }}
                okText="确定"
                cancelText="取消"
              >
                <a style={{ color: "#ff4d4f" }}>删除</a>
              </Popconfirm>
            </div>
          ) : (
            "-"
          ),
      },
    ],
    [canManageProject, handleDelete],
  );

  return (
    <>
      {contextHolder}
      <Table<ReimbursementRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无报销记录" /> }}
      />

      <ProjectReimbursementFormModal
        open={open || Boolean(editingRecord)}
        projectId={projectId}
        projectName={projectName}
        employees={employees}
        categoryOptions={categoryOptions}
        initialValues={
          editingRecord
            ? {
                applicantEmployeeId: editingRecord.applicantEmployee?.id,
                categoryOptionId: editingRecord.categoryOption?.id,
                amount: editingRecord.amount,
                occurredAt: editingRecord.occurredAt,
              }
            : null
        }
        submitting={submitting}
        onCancel={() => {
          setEditingRecord(null);
          onCancel();
        }}
        onSubmit={handleCreate}
      />
    </>
  );
};

export default ProjectReimbursementRecordsContent;
