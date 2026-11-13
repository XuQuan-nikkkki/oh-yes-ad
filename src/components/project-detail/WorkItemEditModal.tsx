"use client";

import { Modal } from "antd";
import WorkItemEditForm, {
  type WorkItemEditEmployee,
  type WorkItemEditPayload,
} from "@/components/project-detail/WorkItemEditForm";
import type { ProjectBriefWorkItem } from "@/components/project-detail/ProjectBriefProgressContent";

type Props = {
  open: boolean;
  workItem?: ProjectBriefWorkItem;
  employees?: WorkItemEditEmployee[];
  projectOwnerId?: string | null;
  onCancel: () => void;
  onSubmit: (payload: WorkItemEditPayload) => Promise<void> | void;
};

const WorkItemEditModal = ({ open, ...formProps }: Props) => (
  <Modal
    title={formProps.workItem ? "编辑工作项" : "添加工作项"}
    open={open}
    onCancel={formProps.onCancel}
    footer={null}
    destroyOnHidden
    mask={{ closable: false }}
    width={1040}
    className="work-item-edit-modal"
    style={{ top: 24, paddingBottom: 24 }}
  >
    <WorkItemEditForm {...formProps} />
  </Modal>
);

export default WorkItemEditModal;
