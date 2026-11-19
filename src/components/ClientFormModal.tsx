"use client";

import { Modal, message } from "antd";
import ClientForm, { ClientFormValues } from "@/components/ClientForm";
import { DEFAULT_COLOR } from "@/lib/constants";
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
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      let industryOptionId = values.industryOptionId;
      const newIndustryName = String(values.newIndustryName ?? "").trim();
      const newIndustryColor = values.newIndustryColor ?? DEFAULT_COLOR;

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

      const response = await fetch(isEdit ? `/api/clients/${initialValues?.id}` : "/api/clients", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          industryOptionId,
        }),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "保存客户失败");
      }

      await fetchAllOptions(true);
      onSuccess();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存客户失败");
    }
  };

  return (
    <>
      {contextHolder}
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
    </>
  );
};

export default ClientFormModal;
