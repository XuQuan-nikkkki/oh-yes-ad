"use client";

import { Button, Flex, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  DeliverableFormFields,
  getDefaultDeliverableReviewerId,
  type BriefEmployee,
  type DeliverableType,
} from "@/components/project-detail/BriefForm";
import type { ProjectBriefDeliverable } from "@/components/project-detail/ProjectBriefProgressContent";
import { useSubmitLock } from "@/hooks/useSubmitLock";

export type DeliverableEditPayload = {
  type: DeliverableType;
  title: string;
  description: string;
  reviewerId: string;
  assigneeId?: string;
  formatOptionIds: string[];
  categoryOrSceneOptionIds: string[];
  specification?: string;
  firstDraftAt: string;
  revisionAt: string;
  finalAt: string;
};

type FormValues = Omit<
  DeliverableEditPayload,
  "firstDraftAt" | "revisionAt" | "finalAt"
> & {
  firstDraftAt: Dayjs;
  revisionAt: Dayjs;
  finalAt: Dayjs;
};

export type DeliverableEditEmployee = BriefEmployee;

type Props = {
  deliverable?: ProjectBriefDeliverable;
  employees?: DeliverableEditEmployee[];
  onCancel: () => void;
  onSubmit: (payload: DeliverableEditPayload) => Promise<void> | void;
};

const DeliverableEditForm = ({
  deliverable,
  employees = [],
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
        type: (["DESIGN", "COPY", "PROJECT_MANAGEMENT", "NEW_MEDIA"] as const).includes(deliverable?.type as DeliverableType)
          ? deliverable?.type as DeliverableType
          : "DESIGN",
        title: deliverable?.title ?? "",
        description: deliverable?.description ?? "",
        reviewerId:
          deliverable?.reviewer?.id ??
          getDefaultDeliverableReviewerId(employees, "DESIGN"),
        assigneeId: deliverable?.assignee?.id,
        formatOptionIds: deliverable?.formatOptions?.map(
          ({ option }) => option.id,
        ),
        categoryOrSceneOptionIds: deliverable?.categoryOrSceneOptions?.map(
          ({ option }) => option.id,
        ),
        specification: deliverable?.specification ?? undefined,
        firstDraftAt: deliverable?.firstDraftAt
          ? dayjs(deliverable.firstDraftAt)
          : undefined,
        revisionAt: deliverable?.revisionAt
          ? dayjs(deliverable.revisionAt)
          : undefined,
        finalAt: deliverable?.finalAt ? dayjs(deliverable.finalAt) : undefined,
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
            firstDraftAt: values.firstDraftAt.format("YYYY-MM-DD"),
            revisionAt: values.revisionAt.format("YYYY-MM-DD"),
            finalAt: values.finalAt.format("YYYY-MM-DD"),
          }),
        )
      }
    >
      <DeliverableFormFields employees={employees} />
      <Flex justify="flex-end" gap={8}>
        <Button onClick={onCancel}>取消</Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
          disabled={submitting}
        >
          {deliverable ? "保存" : "添加"}
        </Button>
      </Flex>
    </Form>
  );
};

export default DeliverableEditForm;
