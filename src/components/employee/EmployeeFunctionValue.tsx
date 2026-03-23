"use client";

import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type FunctionOption = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null | undefined;

type Props = {
  employeeId?: string;
  functionOption?: FunctionOption;
  fallbackText?: string;
  onUpdated?: () => Promise<void> | void;
};

const EmployeeFunctionValue = ({
  employeeId,
  functionOption,
  fallbackText = "-",
  onUpdated,
}: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canEdit =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("PROJECT_MANAGER") ||
    roleCodes.includes("HR");

  if (!employeeId && !functionOption?.value) return fallbackText;
  return (
    <SelectOptionQuickEditTag
      field="employee.function"
      option={
        functionOption?.value
          ? {
              id: functionOption.id ?? "",
              value: functionOption.value,
              color: functionOption.color ?? null,
            }
          : null
      }
      fallbackText={fallbackText}
      disabled={!employeeId || !canEdit}
      modalTitle="修改职能"
      modalDescription="勾选只会暂存职能切换。点击保存后会一并保存选项改动、排序和员工职能。"
      optionValueLabel="职能"
      saveSuccessText="员工职能已保存"
      onSaveSelection={
        employeeId
          ? async (nextOption) => {
              const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  function: nextOption,
                }),
              });
              if (!res.ok) {
                throw new Error((await res.text()) || "更新员工职能失败");
              }
            }
          : undefined
      }
      onUpdated={onUpdated}
    />
  );
};

export default EmployeeFunctionValue;
