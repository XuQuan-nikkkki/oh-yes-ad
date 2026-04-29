"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Space, Table, Tag, message } from "antd";
import { PlusOutlined, WalletOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import DetailPageContainer from "@/components/DetailPageContainer";
import TableActions from "@/components/TableActions";
import LegalEntityFormModal from "@/components/LegalEntityFormModal";
import BankAccountFormModal from "@/components/BankAccountFormModal";
import BankAccountBalanceRecordModal from "@/components/BankAccountBalanceRecordModal";
import { useCrmPermission } from "@/hooks/useCrmPermission";

type BankAccount = {
  id: string;
  legalEntityId?: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  isActive: boolean;
  balanceRecords?: Array<{
    balance: number | string;
    snapshotAt: string;
  }>;
};

type LegalEntityDetail = {
  id: string;
  name: string;
  fullName?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  isActive: boolean;
  bankAccounts?: BankAccount[];
};

const LegalEntityDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LegalEntityDetail | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bankAccountModalOpen, setBankAccountModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [balanceRecordModalOpen, setBalanceRecordModalOpen] = useState(false);
  const [currentBankAccount, setCurrentBankAccount] = useState<BankAccount | null>(null);
  const [deletingBankAccountId, setDeletingBankAccountId] = useState<string | null>(null);
  const { canManageCrm } = useCrmPermission();

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/legal-entities/${id}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const result = await res.json();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <>
      {contextHolder}
      <DetailPageContainer>
        <Card
          title={data?.name || "公司主体详情"}
          loading={loading}
          extra={
            data?.id ? (
              <TableActions
                onEdit={() => setEditOpen(true)}
                onDelete={async () => {
                  if (!canManageCrm || !data?.id) return;
                  try {
                    setDeleting(true);
                    const res = await fetch(`/api/legal-entities/${data.id}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) {
                      throw new Error("删除失败");
                    }
                    messageApi.success("删除公司主体成功");
                    router.push("/legal-entities");
                  } catch (error) {
                    console.error("删除公司主体失败:", error);
                    messageApi.error("删除公司主体失败");
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={!canManageCrm}
                deleteLoading={deleting}
                deleteTitle={`确定删除公司主体「${data.name}」？`}
                disableTextVairant
              />
            ) : null
          }
        >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="名称">{data?.name ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="全称">{data?.fullName ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="税号">{data?.taxNumber ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="地址">{data?.address ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {data ? <Tag color={data.isActive ? "green" : "red"}>{data.isActive ? "启用" : "停用"}</Tag> : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="银行账户"
        styles={{ body: { padding: 12 } }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManageCrm || !data?.id}
            onClick={() => {
              setEditingBankAccount(null);
              setBankAccountModalOpen(true);
            }}
          >
            新增银行账户
          </Button>
        }
      >
        <Table
          rowKey="id"
          tableLayout="auto"
          loading={loading}
          dataSource={data?.bankAccounts ?? []}
          pagination={false}
          columns={[
            { title: "开户银行", dataIndex: "bankName" },
            { title: "开户支行", dataIndex: "bankBranch" },
            { title: "银行卡号", dataIndex: "accountNumber" },
            {
              title: "当前金额",
              key: "currentBalance",
              render: (_value: unknown, record: BankAccount) => {
                const latest = record.balanceRecords?.[0];
                if (!latest) return "-";
                const amount = Number(latest.balance);
                if (!Number.isFinite(amount)) return "-";
                return `¥${amount.toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              },
            },
            {
              title: "状态",
              dataIndex: "isActive",
              render: (value: boolean) => (
                <Tag color={value ? "green" : "red"}>{value ? "启用" : "停用"}</Tag>
              ),
            },
            {
              title: "操作",
              key: "actions",
              width: 240,
              render: (_value: unknown, record: BankAccount) => (
                <Space size={4} wrap={false}>
                  <Button
                    type="link"
                    icon={<WalletOutlined />}
                    disabled={!canManageCrm}
                    onClick={() => {
                      setCurrentBankAccount(record);
                      setBalanceRecordModalOpen(true);
                    }}
                    style={{ paddingInline: 4 }}
                  >
                    记录金额
                  </Button>
                  <TableActions
                    disabled={!canManageCrm}
                    onEdit={() => {
                      setEditingBankAccount(record);
                      setBankAccountModalOpen(true);
                    }}
                    onDelete={() => {
                      void (async () => {
                        try {
                          setDeletingBankAccountId(record.id);
                          const res = await fetch(`/api/bank-accounts/${record.id}`, {
                            method: "DELETE",
                          });
                          if (!res.ok) {
                            throw new Error("删除失败");
                          }
                          messageApi.success("银行账户删除成功");
                          await fetchData();
                        } catch (error) {
                          console.error("删除银行账户失败:", error);
                          messageApi.error("删除银行账户失败");
                        } finally {
                          setDeletingBankAccountId(null);
                        }
                      })();
                    }}
                    deleteLoading={deletingBankAccountId === record.id}
                    deleteTitle={`确定删除银行卡号「${record.accountNumber}」？`}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
      </DetailPageContainer>

      <LegalEntityFormModal
        open={editOpen}
        initialValues={data}
        onCancel={() => setEditOpen(false)}
        onSuccess={async () => {
          setEditOpen(false);
          messageApi.success("公司主体已更新");
          await fetchData();
        }}
      />

      <BankAccountFormModal
        open={bankAccountModalOpen}
        legalEntityId={data?.id ?? ""}
        legalEntityName={data?.name ?? ""}
        initialValues={editingBankAccount}
        onCancel={() => {
          setBankAccountModalOpen(false);
          setEditingBankAccount(null);
        }}
        onSuccess={async () => {
          setBankAccountModalOpen(false);
          setEditingBankAccount(null);
          messageApi.success(editingBankAccount ? "银行账户已更新" : "银行账户已创建");
          await fetchData();
        }}
      />

      <BankAccountBalanceRecordModal
        open={balanceRecordModalOpen}
        legalEntityId={data?.id ?? ""}
        legalEntityName={data?.name ?? ""}
        bankAccount={
          currentBankAccount
            ? { id: currentBankAccount.id, accountNumber: currentBankAccount.accountNumber }
            : null
        }
        onCancel={() => {
          setBalanceRecordModalOpen(false);
          setCurrentBankAccount(null);
        }}
        onSuccess={async () => {
          setBalanceRecordModalOpen(false);
          setCurrentBankAccount(null);
          messageApi.success("金额记录已创建");
          await fetchData();
        }}
      />
    </>
  );
};

export default LegalEntityDetailPage;
