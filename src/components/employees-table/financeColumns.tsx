import { formatDate } from "@/lib/date";
import type { EmployeeColumnMap } from "./columnTypes";
import { formatMoney } from "./utils";

export const createFinanceColumns = (): EmployeeColumnMap => ({
  entryDate: {
    key: "entryDate",
    title: "入职日期",
    render: (_dom, record) => formatDate(record.entryDate),
  },
  leaveDate: {
    key: "leaveDate",
    title: "离职日期",
    render: (_dom, record) => formatDate(record.leaveDate),
  },
  salary: {
    key: "salary",
    title: "薪资",
    render: (_dom, record) => formatMoney(record.salary),
  },
  socialSecurity: {
    key: "socialSecurity",
    title: "社保",
    render: (_dom, record) => formatMoney(record.socialSecurity),
  },
  providentFund: {
    key: "providentFund",
    title: "公积金",
    render: (_dom, record) => formatMoney(record.providentFund),
  },
  workstationCost: {
    key: "workstationCost",
    title: "工位费",
    render: (_dom, record) => formatMoney(record.workstationCost),
  },
  utilityCost: {
    key: "utilityCost",
    title: "水电",
    render: (_dom, record) => formatMoney(record.utilityCost),
  },
  bankAccountNumber: {
    key: "bankAccountNumber",
    title: "银行卡号",
    dataIndex: "bankAccountNumber",
    render: (_dom, record) => record.bankAccountNumber ?? "-",
  },
  bankName: {
    key: "bankName",
    title: "开户银行",
    dataIndex: "bankName",
    render: (_dom, record) => record.bankName ?? "-",
  },
  bankBranch: {
    key: "bankBranch",
    title: "开户支行",
    dataIndex: "bankBranch",
    render: (_dom, record) => record.bankBranch ?? "-",
  },
});
