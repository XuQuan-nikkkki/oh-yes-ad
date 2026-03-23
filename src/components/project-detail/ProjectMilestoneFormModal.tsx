"use client";

import type { ComponentProps, ReactNode } from "react";
import { Modal } from "antd";
import ProjectMilestoneForm from "@/components/project-detail/ProjectMilestoneForm";

type ProjectMilestoneFormProps = ComponentProps<typeof ProjectMilestoneForm>;

type Props = ProjectMilestoneFormProps & {
  open: boolean;
  onCancel: () => void;
  title?: ReactNode;
  confirmLoading?: boolean;
};

const ProjectMilestoneFormModal = ({
  open,
  onCancel,
  title,
  confirmLoading,
  ...formProps
}: Props) => {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={null}
      confirmLoading={confirmLoading}
      width={960}
      destroyOnHidden
    >
      <ProjectMilestoneForm {...formProps} />
    </Modal>
  );
};

export default ProjectMilestoneFormModal;
