"use client";

import type { ComponentProps, ReactNode } from "react";
import { Modal } from "antd";
import ProjectSegmentForm from "@/components/project-detail/ProjectSegmentForm";

type ProjectSegmentFormProps = ComponentProps<typeof ProjectSegmentForm>;

type Props = ProjectSegmentFormProps & {
  open: boolean;
  onCancel: () => void;
  title?: ReactNode;
  confirmLoading?: boolean;
};

const ProjectSegmentFormModal = ({
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
      <ProjectSegmentForm {...formProps} />
    </Modal>
  );
};

export default ProjectSegmentFormModal;
