"use client";

import type { ComponentProps, ReactNode } from "react";
import { Modal } from "antd";
import ProjectTaskForm from "@/components/project-detail/ProjectTaskForm";

type ProjectTaskFormProps = ComponentProps<typeof ProjectTaskForm>;

type Props = ProjectTaskFormProps & {
  open: boolean;
  onCancel: () => void;
  title?: ReactNode;
  confirmLoading?: boolean;
};

const ProjectTaskFormModal = ({
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
      destroyOnHidden
      width={860}
    >
      <ProjectTaskForm {...formProps} />
    </Modal>
  );
};

export default ProjectTaskFormModal;
