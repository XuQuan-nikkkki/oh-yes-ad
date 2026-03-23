"use client";

import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { PROJECT_TASK_STATUS_FIELD } from "@/lib/constants";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type Props = {
  projectId: string;
  taskId: string;
  option?: NullableSelectOptionValue;
  disabled?: boolean;
  onUpdated?: () => Promise<void> | void;
};

const ProjectTaskStatusQuickEditTag = ({
  projectId,
  taskId,
  option,
  disabled = false,
  onUpdated,
}: Props) => (
  <SelectOptionQuickEditTag
    field={PROJECT_TASK_STATUS_FIELD}
    option={option}
    disabled={disabled}
    modalTitle="修改任务状态"
    modalDescription="勾选只会暂存状态切换。点击保存后会一并保存选项改动、排序和任务状态。"
    emptyText="暂无状态选项"
    saveSuccessText="状态已保存"
    optionValueLabel="状态值"
    onSaveSelection={async (selectedOption) => {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: {
            value: selectedOption.value,
            color: selectedOption.color,
          },
        }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "更新任务状态失败");
      }
    }}
    onUpdated={onUpdated}
  />
);

export default ProjectTaskStatusQuickEditTag;
