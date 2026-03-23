"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Descriptions, Empty } from "antd";
import AppLink from "@/components/AppLink";
import VendorContractModal from "@/components/project-detail/VendorContractModal";

type Props = {
  projectId: string;
  projectName: string;
  canManageProject: boolean;
};

type VendorContract = {
  id: string;
  projectId: string;
  vendorId: string;
  legalEntityId: string;
  serviceContent?: string | null;
  contractAmount?: number | string | null;
  vendor?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
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
    maximumFractionDigits: 0,
  })} 元`;
};

const VendorContractCard = ({
  projectId,
  projectName,
  canManageProject,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [contract, setContract] = useState<VendorContract | null>(null);

  const fetchContract = useCallback(async () => {
    if (!projectId) {
      setContract(null);
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({ projectId });
      const res = await fetch(`/api/vendor-contracts?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setContract(null);
        return;
      }
      const rows = (await res.json()) as VendorContract[];
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
    () => (contract ? "编辑供应商合同" : "新建供应商合同"),
    [contract],
  );

  return (
    <>
      <Card
        title="供应商合同"
        loading={loading}
        style={{ marginBottom: 16 }}
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
          <Descriptions column={4} size="small">
            <Descriptions.Item label="供应商">
              {contract.vendor?.id ? (
                <AppLink href={`/vendors/${contract.vendor.id}`}>
                  {contract.vendor.fullName || contract.vendor.name}
                </AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="签约主体">
              {contract.legalEntity?.id ? (
                <AppLink href={`/legal-entities/${contract.legalEntity.id}`}>
                  {contract.legalEntity.fullName || contract.legalEntity.name}
                </AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="服务内容">
              {contract.serviceContent?.trim() || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="合同金额(含税)">
              {formatAmountWithUnit(contract.contractAmount)}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="暂无供应商合同" />
        )}
      </Card>

      <VendorContractModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
        contract={contract}
        onSaved={fetchContract}
      />
    </>
  );
};

export default VendorContractCard;

