"use client";

import type { ComponentProps } from "react";
import { Modal } from "antd";
import BriefForm from "@/components/project-detail/BriefForm";

type Props = ComponentProps<typeof BriefForm> & {
  open: boolean;
  onCancel: () => void;
};

const BriefFormModal = ({ open, onCancel, ...formProps }: Props) => (
  <Modal
    title={formProps.initialBrief ? "编辑需求单" : "创建需求单"}
    className="brief-form-modal"
    open={open}
    onCancel={onCancel}
    maskClosable={false}
    keyboard={false}
    footer={null}
    destroyOnHidden
    width={1180}
    styles={{
      body: {
        maxHeight: "calc(80vh - 96px)",
        overflowY: "auto",
      },
    }}
  >
    <BriefForm {...formProps} />
  </Modal>
);

export default BriefFormModal;
