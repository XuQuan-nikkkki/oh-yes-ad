import { Space, Tag } from "antd";
import AppLink from "@/components/AppLink";
import EmployeeFunctionValue from "@/components/employee/EmployeeFunctionValue";
import type { EmployeeColumnContext, EmployeeColumnMap } from "./columnTypes";
import { getFunctionFilters, normalizeOption } from "./utils";

export const createBasicColumns = ({
  employees,
  roleOptions,
  onOptionUpdated,
}: EmployeeColumnContext): EmployeeColumnMap => {
  const functionFilters = getFunctionFilters(employees);

  return {
    name: {
      key: "name",
      title: "姓名",
      dataIndex: "name",
      filters: employees.map((item) => ({ text: item.name, value: item.id })),
      filterSearch: true,
      onFilter: (value, record) => record.id === String(value),
      render: (_dom, record) => (
        <AppLink href={`/employees/${record.id}`}>{record.name}</AppLink>
      ),
    },
    fullName: {
      key: "fullName",
      title: "全名",
      dataIndex: "fullName",
      render: (_dom, record) => record.fullName ?? "-",
    },
    phone: {
      key: "phone",
      title: "手机号",
      dataIndex: "phone",
      render: (_dom, record) => record.phone ?? "-",
    },
    function: {
      key: "function",
      title: "职能",
      dataIndex: "function",
      filters: functionFilters,
      onFilter: (value, record) => record.function === value,
      render: (_dom, record) => (
        <EmployeeFunctionValue
          employeeId={record.id}
          functionOption={normalizeOption(record.functionOption)}
          fallbackText={record.function ?? "-"}
          onUpdated={onOptionUpdated}
        />
      ),
    },
    roles: {
      key: "roles",
      title: "角色",
      filters: roleOptions.map((item) => ({
        text: item.name,
        value: item.code,
      })),
      onFilter: (value, record) =>
        Boolean(record.roles?.some((item) => item.role.code === value)),
      render: (_dom, record) =>
        record.roles && record.roles.length > 0 ? (
          <Space size={4} wrap>
            {record.roles.map((item) => (
              <Tag color="blue" key={item.role.id}>
                {item.role.name}
              </Tag>
            ))}
          </Space>
        ) : (
          "-"
        ),
    },
    legalEntity: {
      key: "legalEntity",
      title: "签约主体",
      render: (_dom, record) =>
        record.legalEntity ? (
          <AppLink href={`/legal-entities/${record.legalEntity.id}`}>
            {record.legalEntity.name}
          </AppLink>
        ) : (
          "-"
        ),
    },
  };
};
