"use client";

import { Modal } from "antd";
import ClientForm, { ClientFormValues } from "@/components/ClientForm";

type Client = {
  id?: string;
  name?: string;
  industry?: string;
  remark?: string | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  industryOptions?: string[];
  initialValues?: Client | null;
};

const ClientFormModal = ({
  open,
  onCancel,
  onSuccess,
  industryOptions = [],
  initialValues,
}: Props) => {
  const isEdit = !!initialValues?.id;

  const handleSubmit = async (values: ClientFormValues) => {
    const payload = {
      ...values,
      industry: Array.isArray(values.industry) ? values.industry[0] : "",
    };

    await fetch(isEdit ? `/api/clients/${initialValues?.id}` : "/api/clients", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    onSuccess();
  };

  return (
    <Modal
      title={isEdit ? "编辑客户" : "新建客户"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <ClientForm
        initialValues={initialValues}
        industryOptions={industryOptions}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};

export default ClientFormModal;
