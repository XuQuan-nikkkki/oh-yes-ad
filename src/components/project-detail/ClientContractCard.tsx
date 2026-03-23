"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Descriptions, Empty } from "antd";
import AppLink from "@/components/AppLink";
import ClientContractModal from "@/components/project-detail/ClientContractModal";

type Props = {
  projectId: string;
  projectName: string;
  projectType?: string | null;
  canManageProject: boolean;
};

type ClientContract = {
  id: string;
  projectId: string;
  legalEntityId: string;
  contractAmount?: number | string | null;
  taxAmount?: number | string | null;
  legalEntity?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
};

const toDisplayNumber = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const formatAmountWithUnit = (value?: number | string | null) => {
  const numberValue = toDisplayNumber(value);
  if (numberValue === null) return "-";
  return `${numberValue.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} 元`;
};

const ClientContractCard = ({
  projectId,
  projectName,
  projectType,
  canManageProject,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [contract, setContract] = useState<ClientContract | null>(null);

  const fetchContract = useCallback(async () => {
    if (!projectId) {
      setContract(null);
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({ projectId });
      const res = await fetch(`/api/client-contracts?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setContract(null);
        return;
      }
      const rows = (await res.json()) as ClientContract[];
      setContract(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
    } catch {
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchContract();
  }, [fetchContract]);

  const extraText = useMemo(
    () => (contract ? "编辑客户合同" : "新建客户合同"),
    [contract],
  );

  return (
    <>
      <Card
        title="客户合同"
        loading={loading}
        extra={
          <Button
            type="primary"
            disabled={!canManageProject}
            onClick={() => setModalOpen(true)}
          >
            {extraText}
          </Button>
        }
      >
        {contract ? (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="签约主体">
              {contract.legalEntity?.id ? (
                <AppLink href={`/legal-entities/${contract.legalEntity.id}`}>
                  {contract.legalEntity.fullName || contract.legalEntity.name}
                </AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="合同金额">
              {formatAmountWithUnit(contract.contractAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="税费金额">
              {formatAmountWithUnit(contract.taxAmount)}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="暂无客户合同" />
        )}
      </Card>

      <ClientContractModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
        isClientProject={projectType === "CLIENT"}
        contract={contract}
        onSaved={fetchContract}
      />
    </>
  );
};

export default ClientContractCard;
