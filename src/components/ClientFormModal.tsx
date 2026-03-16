"use client";

import { Modal } from "antd";
import ClientForm, { ClientFormValues } from "@/components/ClientForm";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

type Client = {
  id?: string;
  name?: string;
  industryOptionId?: string;
  industryOption?: {
    id: string;
    value: string;
  } | null;
};

type SelectOption = {
  id: string;
  value: string;
  color?: string | null;
  order?: number | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  industryOptions?: SelectOption[];
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
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);

  const handleSubmit = async (values: ClientFormValues) => {
    let industryOptionId = values.industryOptionId;
    const newIndustryName = String(values.newIndustryName ?? "").trim();
    const newIndustryColor = values.newIndustryColor ?? "#8c8c8c";

    if (!industryOptionId && newIndustryName) {
      const response = await fetch("/api/select-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "client.industry",
          value: newIndustryName,
          color: newIndustryColor,
        }),
      });

      if (!response.ok) {
        throw new Error("创建行业选项失败");
      }

      const option = (await response.json()) as SelectOption;
      industryOptionId = option.id;
    }

    if (!industryOptionId) {
      throw new Error("请选择行业，或新增一个行业");
    }

    await fetch(isEdit ? `/api/clients/${initialValues?.id}` : "/api/clients", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        industryOptionId,
      }),
    });

    await fetchAllOptions(true);
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
