"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Table, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import TableActions from "@/components/TableActions";
import BankAccountBalanceRecordModal from "@/components/BankAccountBalanceRecordModal";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import { formatDate } from "@/lib/date";

type LegalEntity = {
  id: string;
  name: string;
};

type BankAccountOption = {
  id: string;
  accountNumber: string;
  legalEntityId: string;
  legalEntity?: {
    id: string;
    name: string;
  } | null;
};

type BalanceRow = {
  id: string;
  balance: number | string;
  snapshotAt: string;
  remark?: string | null;
  bankAccount: {
    id: string;
    bankName: string;
    bankBranch: string;
    accountNumber: string;
    legalEntity: {
      id: string;
      name: string;
    };
  };
};

const CompanyAccountBalancesPage = () => {
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [legalEntityOptions, setLegalEntityOptions] = useState<LegalEntity[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<BankAccountOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    legalEntityId: string;
    bankAccountId: string;
    balance: number;
    snapshotAt: string;
    remark?: string | null;
  } | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageCrm } = useCrmPermission();

  const fetchBalanceRows = useCallback(async () => {
    setLoading(true);
    try {
      const [balancesRes, bankAccountsRes, legalEntitiesRes] = await Promise.all([
        fetch("/api/bank-account-balance-records", { cache: "no-store" }),
        fetch("/api/bank-accounts", { cache: "no-store" }),
        fetch("/api/legal-entities", { cache: "no-store" }),
      ]);
      if (!balancesRes.ok || !bankAccountsRes.ok || !legalEntitiesRes.ok) {
        throw new Error("获取账户余额失败");
      }
      const balancesData = (await balancesRes.json()) as BalanceRow[];
      const bankAccountsData = (await bankAccountsRes.json()) as BankAccountOption[];
      const legalEntitiesData = (await legalEntitiesRes.json()) as LegalEntity[];
      setRows(Array.isArray(balancesData) ? balancesData : []);
      setBankAccountOptions(Array.isArray(bankAccountsData) ? bankAccountsData : []);
      setLegalEntityOptions(Array.isArray(legalEntitiesData) ? legalEntitiesData : []);
    } catch (error) {
      console.error("获取账户余额失败", error);
      setRows([]);
      setBankAccountOptions([]);
      setLegalEntityOptions([]);
      messageApi.error("获取账户余额失败");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void fetchBalanceRows();
  }, [fetchBalanceRows]);

  const columns: ColumnsType<BalanceRow> = [
    {
      title: "公司主体",
      dataIndex: ["bankAccount", "legalEntity", "name"],
      render: (_value, record) => (
        <AppLink href={`/legal-entities/${record.bankAccount.legalEntity.id}`}>
          {record.bankAccount.legalEntity.name}
        </AppLink>
      ),
    },
    {
      title: "账户开户行",
      dataIndex: ["bankAccount", "bankName"],
    },
    {
      title: "银行卡号(后4位)",
      dataIndex: ["bankAccount", "accountNumber"],
      render: (value: string) => (value ? value.slice(-4) : "-"),
    },
    {
      title: "账户余额",
      dataIndex: "balance",
      render: (value: number | string) =>
        Number(value).toLocaleString("zh-CN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      title: "余额更新日期",
      dataIndex: "snapshotAt",
      render: (value: string) => formatDate(value),
    },
    {
      title: "备注",
      dataIndex: "remark",
      render: (value?: string | null) => value || "-",
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_value, record) => (
        <TableActions
          disabled={!canManageCrm}
          onEdit={() => {
            setEditingRecord({
              id: record.id,
              legalEntityId: record.bankAccount.legalEntity.id,
              bankAccountId: record.bankAccount.id,
              balance: Number(record.balance),
              snapshotAt: record.snapshotAt,
              remark: record.remark ?? null,
            });
            setModalOpen(true);
          }}
          onDelete={() => {
            void (async () => {
              const res = await fetch(`/api/bank-account-balance-records/${record.id}`, {
                method: "DELETE",
              });
              if (!res.ok) {
                messageApi.error("删除余额记录失败");
                return;
              }
              messageApi.success("删除余额记录成功");
              await fetchBalanceRows();
            })();
          }}
          deleteTitle="确定删除该余额记录？"
        />
      ),
    },
  ];

  const totalBalance = rows.reduce((sum, row) => {
    const value = Number(row.balance);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  return (
    <>
      {contextHolder}
      <Card
        title={<ProTableHeaderTitle>公司账户余额</ProTableHeaderTitle>}
        styles={{ body: { padding: "12px 24px" } }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManageCrm}
            onClick={() => {
              setEditingRecord(null);
              setModalOpen(true);
            }}
          >
            新增余额记录
          </Button>
        }
      >
        <Table
          rowKey="id"
          tableLayout="auto"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={{ pageSize: 20 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>合计</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <strong>
                  {totalBalance.toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={3} />
            </Table.Summary.Row>
          )}
        />
      </Card>

      <BankAccountBalanceRecordModal
        open={modalOpen}
        legalEntityOptions={legalEntityOptions.map((item) => ({
          id: item.id,
          name: item.name,
        }))}
        bankAccountOptions={bankAccountOptions}
        initialValues={editingRecord}
        lockLegalEntity={false}
        lockBankAccount={false}
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={async () => {
          setModalOpen(false);
          setEditingRecord(null);
          messageApi.success(editingRecord ? "余额记录已更新" : "余额记录已创建");
          await fetchBalanceRows();
        }}
      />
    </>
  );
};

export default CompanyAccountBalancesPage;
