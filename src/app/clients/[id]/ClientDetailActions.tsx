"use client";

import { useState } from "react";
import { message } from "antd";
import { useRouter } from "next/navigation";
import TableActions from "@/components/TableActions";
import { useCrmPermission } from "@/hooks/useCrmPermission";

type Props = {
  clientId: string;
  clientName?: string;
  onEdit: () => void;
};

const ClientDetailActions = ({ clientId, clientName, onEdit }: Props) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageCrm } = useCrmPermission();

  const handleDeleteClient = async () => {
    if (!clientId) return;
    if (!canManageCrm) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }

      messageApi.success("删除成功");
      router.push("/clients");
    } catch (error) {
      console.error("删除客户失败:", error);
      messageApi.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <TableActions
        onEdit={onEdit}
        onDelete={handleDeleteClient}
        disabled={!canManageCrm}
        deleteLoading={deleting}
        deleteTitle={`确定删除客户「${clientName ?? ""}」？`}
      />
    </>
  );
};

export default ClientDetailActions;
