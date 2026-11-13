"use client";

import { Modal } from "antd";
import DeliverableEditForm, {
  type DeliverableEditEmployee,
  type DeliverableEditPayload,
} from "@/components/project-detail/DeliverableEditForm";
import type { ProjectBriefDeliverable } from "@/components/project-detail/ProjectBriefProgressContent";

type Props = {
  open: boolean;
  deliverable?: ProjectBriefDeliverable;
  employees?: DeliverableEditEmployee[];
  onCancel: () => void;
  onSubmit: (payload: DeliverableEditPayload) => Promise<void> | void;
};

const DeliverableEditModal = ({ open, ...formProps }: Props) => (
  <Modal
    title={formProps.deliverable ? "编辑交付物" : "添加交付物"}
    open={open}
    onCancel={formProps.onCancel}
    footer={null}
    destroyOnHidden
    mask={{ closable: false }}
    width={880}
  >
    <DeliverableEditForm {...formProps} />
  </Modal>
);

export default DeliverableEditModal;
