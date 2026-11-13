"use client";

import { Button, Flex, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  WorkItemFormFields,
  getDefaultWorkItemReviewerId,
  type BriefEmployee,
  type WorkItemType,
} from "@/components/project-detail/BriefForm";
import type { ProjectBriefWorkItem } from "@/components/project-detail/ProjectBriefProgressContent";
import { useSubmitLock } from "@/hooks/useSubmitLock";

export type WorkItemEditPayload = {
  type: WorkItemType;
  sourceFilePolicy: "REQUIRED" | "OPTIONAL";
  title: string;
  description: string;
  reviewerId: string;
  assigneeId?: string;
  formatOptionIds: string[];
  categoryOrSceneOptionIds: string[];
  specification?: string;
  firstDraftAt?: string;
  revisionAt?: string;
  finalAt: string;
};

type FormValues = Omit<
  WorkItemEditPayload,
  "firstDraftAt" | "revisionAt" | "finalAt"
> & {
  firstDraftAt?: Dayjs;
  revisionAt?: Dayjs;
  finalAt: Dayjs;
};

export type WorkItemEditEmployee = BriefEmployee;

type Props = {
  workItem?: ProjectBriefWorkItem;
  employees?: WorkItemEditEmployee[];
  projectOwnerId?: string | null;
  onCancel: () => void;
  onSubmit: (payload: WorkItemEditPayload) => Promise<void> | void;
};

const WorkItemEditForm = ({
  workItem,
  employees = [],
  projectOwnerId,
  onCancel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const { submitting, runWithSubmitLock } = useSubmitLock();

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      initialValues={{
        type: (["DESIGN", "COPY", "PROJECT_MANAGEMENT", "NEW_MEDIA"] as const).includes(workItem?.type as WorkItemType)
          ? workItem?.type as WorkItemType
          : "DESIGN",
        title: workItem?.title ?? "",
        sourceFilePolicy: workItem?.sourceFilePolicy ?? (!workItem || workItem.type === "DESIGN" ? "REQUIRED" : "OPTIONAL"),
        description: workItem?.description ?? "",
        reviewerId:
          workItem?.reviewer?.id ??
          getDefaultWorkItemReviewerId(employees, (workItem?.type ?? "DESIGN") as WorkItemType, projectOwnerId),
        assigneeId: workItem?.assignee?.id,
        formatOptionIds: workItem?.formatOptions?.map(
          ({ option }) => option.id,
        ),
        categoryOrSceneOptionIds: workItem?.categoryOrSceneOptions?.map(
          ({ option }) => option.id,
        ),
        specification: workItem?.specification ?? undefined,
        firstDraftAt: workItem?.firstDraftAt
          ? dayjs(workItem.firstDraftAt)
          : undefined,
        revisionAt: workItem?.revisionAt
          ? dayjs(workItem.revisionAt)
          : undefined,
        finalAt: workItem?.finalAt ? dayjs(workItem.finalAt) : undefined,
      }}
      onFinish={(values) =>
        runWithSubmitLock(() =>
          onSubmit({
            ...values,
            title: values.title.trim(),
            description: values.description.trim(),
            specification: values.specification?.trim() || undefined,
            formatOptionIds: values.formatOptionIds ?? [],
            categoryOrSceneOptionIds: values.categoryOrSceneOptionIds ?? [],
            firstDraftAt: values.firstDraftAt?.format("YYYY-MM-DD"),
            revisionAt: values.revisionAt?.format("YYYY-MM-DD"),
            finalAt: values.finalAt.format("YYYY-MM-DD"),
          }),
        )
      }
    >
      <WorkItemFormFields employees={employees} projectOwnerId={projectOwnerId} />
      <Flex className="work-item-edit-form-actions" justify="flex-end" gap={8}>
        <Button onClick={onCancel}>取消</Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
          disabled={submitting}
        >
          {workItem ? "保存" : "添加"}
        </Button>
      </Flex>
    </Form>
  );
};

export default WorkItemEditForm;
