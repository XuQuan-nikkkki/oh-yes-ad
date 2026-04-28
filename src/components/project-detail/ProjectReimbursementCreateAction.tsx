"use client";

import { useCallback, useMemo, useState } from "react";
import { App, Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectReimbursementFormModal, {
  type ProjectReimbursementFormValues,
} from "@/components/project-detail/ProjectReimbursementFormModal";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type EmployeeOption = {
  id: string;
  name: string;
};

type CategoryOption = {
  id: string;
  value: string;
  color?: string | null;
};

type Props = {
  projectId: string;
  projectName: string;
  canManageProject?: boolean;
  employees?: EmployeeOption[];
  onCreated?: () => void;
  buttonType?: "default" | "primary";
};

const toEmployeeOptions = (data: unknown): EmployeeOption[] => {
  const members = (data as { members?: Array<{ id?: unknown; name?: unknown }> } | null)?.members;
  if (!Array.isArray(members)) return [];
  return members
    .map((item) => ({
      id: String(item?.id ?? ""),
      name: String(item?.name ?? ""),
    }))
    .filter((item) => item.id && item.name);
};

const ProjectReimbursementCreateAction = ({
  projectId,
  projectName,
  employees,
  onCreated,
  buttonType = "primary",
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [resolvedEmployees, setResolvedEmployees] = useState<EmployeeOption[]>(
    () => (employees ?? []).filter((item) => item?.id && item?.name),
  );
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canCreateReimbursement =
    roleCodes.includes("ADMIN") || roleCodes.includes("FINANCE");

  const mergedEmployees = useMemo(() => {
    if (resolvedEmployees.length > 0) return resolvedEmployees;
    return (employees ?? []).filter((item) => item?.id && item?.name);
  }, [employees, resolvedEmployees]);

  const notifyError = useCallback(
    (text: string) => {
      if (typeof app?.message?.error === "function") {
        app.message.error(text);
      } else {
        void messageApi.error(text);
      }
    },
    [app, messageApi],
  );

  const notifySuccess = useCallback(
    (text: string) => {
      if (typeof app?.message?.success === "function") {
        app.message.success(text);
      } else {
        void messageApi.success(text);
      }
    },
    [app, messageApi],
  );

  const ensureEmployeesLoaded = useCallback(async () => {
    if (mergedEmployees.length > 0) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const nextEmployees = toEmployeeOptions(data);
      if (nextEmployees.length > 0) {
        setResolvedEmployees(nextEmployees);
      }
    } catch {
      // ignore
    }
  }, [mergedEmployees.length, projectId]);

  const ensureCategoryOptionsLoaded = useCallback(async () => {
    if (categoryOptions.length > 0) return;
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
  }, [categoryOptions.length, projectId]);

  const openModal = useCallback(() => {
    if (!canCreateReimbursement) return;
    setOpen(true);
    void ensureEmployeesLoaded();
    void ensureCategoryOptionsLoaded();
  }, [canCreateReimbursement, ensureCategoryOptionsLoaded, ensureEmployeesLoaded]);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (values: ProjectReimbursementFormValues) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/reimbursements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const errorText = (await res.text()) || "新增报销失败";
          notifyError(errorText);
          return;
        }
        notifySuccess("新增报销成功");
        window.dispatchEvent(
          new CustomEvent("project-reimbursements-updated", {
            detail: { projectId },
          }),
        );
        closeModal();
        onCreated?.();
      } catch {
        notifyError("新增报销失败");
      } finally {
        setSubmitting(false);
      }
    },
    [closeModal, notifyError, notifySuccess, onCreated, projectId],
  );

  return (
    <>
      {contextHolder}
      <Button
        type={buttonType}
        icon={<PlusOutlined />}
        disabled={!canCreateReimbursement}
        onClick={openModal}
      >
        新增报销
      </Button>

      <ProjectReimbursementFormModal
        open={open}
        projectId={projectId}
        projectName={projectName}
        employees={mergedEmployees}
        categoryOptions={categoryOptions}
        submitting={submitting}
        initialValues={null}
        onCancel={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default ProjectReimbursementCreateAction;
