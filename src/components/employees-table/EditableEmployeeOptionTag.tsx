"use client";

import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import type { EmployeeOption } from "./types";
import { normalizeOption } from "./utils";

type EditableEmployeeField =
  | "employee.departmentLevel1"
  | "employee.departmentLevel2"
  | "employee.position"
  | "employee.employmentType"
  | "employee.employmentStatus";

type Props = {
  employeeId: string;
  field: EditableEmployeeField;
  option?: EmployeeOption | null;
  fallbackText?: string;
  label?: string;
  onUpdated?: () => void | Promise<void>;
};

type SelectedEmployeeOption = {
  id: string;
  value: string;
  color: string;
};

const EditableEmployeeOptionTag = ({
  employeeId,
  field,
  option,
  fallbackText = "-",
  label = "选项",
  onUpdated,
}: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canEdit =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("PROJECT_MANAGER") ||
    roleCodes.includes("HR");

  const handleSaveSelection = async (nextOption: SelectedEmployeeOption) => {
    const payloadKey = field.replace("employee.", "");
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [payloadKey]: nextOption }),
    });
    if (!res.ok) {
      throw new Error((await res.text()) || "更新失败");
    }
  };

  return (
    <SelectOptionQuickEditTag
      field={field}
      option={normalizeOption(option)}
      fallbackText={fallbackText}
      disabled={!canEdit}
      modalTitle={`修改${label}`}
      optionValueLabel={label}
      saveSuccessText={`${label}已保存`}
      onSaveSelection={handleSaveSelection}
      onUpdated={onUpdated}
    />
  );
};

export default EditableEmployeeOptionTag;
