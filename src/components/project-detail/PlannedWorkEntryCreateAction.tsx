"use client";

import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Modal, message } from "antd";
import PlannedWorkEntryForm, {
  type PlannedWorkEntryWorkItemContext,
} from "./PlannedWorkEntryForm";

type Props = {
  workItemContext: PlannedWorkEntryWorkItemContext;
  onSaved?: () => Promise<void> | void;
};

export default function PlannedWorkEntryCreateAction({ workItemContext, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <>
      {contextHolder}
      <Button variant="text" color="primary" icon={<PlusOutlined />}
        onClick={() => setOpen(true)}>
        新增计划工时
      </Button>
      <Modal title="新增计划工时" open={open} onCancel={() => setOpen(false)}
        footer={null} destroyOnHidden width={680}>
        <PlannedWorkEntryForm
          workItemContext={workItemContext}
          onSubmit={async (payload) => {
            const response = await fetch(`/api/work-items/${payload.workItemId}/planned-work-entries`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!response.ok) {
              throw new Error((await response.text()) || "保存计划工时失败");
            }
            messageApi.success("计划工时已添加");
            setOpen(false);
            await onSaved?.();
          }}
        />
      </Modal>
    </>
  );
}
