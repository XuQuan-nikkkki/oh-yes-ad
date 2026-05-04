import EditableEmployeeOptionTag from "./EditableEmployeeOptionTag";
import type { EmployeeColumnContext, EmployeeColumnMap } from "./columnTypes";

export const createOptionColumns = ({
  onOptionUpdated,
}: EmployeeColumnContext): EmployeeColumnMap => ({
  departmentLevel1: {
    key: "departmentLevel1",
    title: "一级部门",
    render: (_dom, record) => (
      <EditableEmployeeOptionTag
        employeeId={record.id}
        field="employee.departmentLevel1"
        option={record.departmentLevel1Option}
        fallbackText={record.departmentLevel1 ?? "-"}
        label="一级部门"
        onUpdated={onOptionUpdated}
      />
    ),
  },
  departmentLevel2: {
    key: "departmentLevel2",
    title: "二级部门",
    render: (_dom, record) => (
      <EditableEmployeeOptionTag
        employeeId={record.id}
        field="employee.departmentLevel2"
        option={record.departmentLevel2Option}
        fallbackText={record.departmentLevel2 ?? "-"}
        label="二级部门"
        onUpdated={onOptionUpdated}
      />
    ),
  },
  position: {
    key: "position",
    title: "职位",
    render: (_dom, record) => (
      <EditableEmployeeOptionTag
        employeeId={record.id}
        field="employee.position"
        option={record.positionOption}
        fallbackText={record.position ?? "-"}
        label="职位"
        onUpdated={onOptionUpdated}
      />
    ),
  },
  level: {
    key: "level",
    title: "职级",
    dataIndex: "level",
    render: (_dom, record) => record.level ?? "-",
  },
  employmentType: {
    key: "employmentType",
    title: "用工性质",
    render: (_dom, record) => (
      <EditableEmployeeOptionTag
        employeeId={record.id}
        field="employee.employmentType"
        option={record.employmentTypeOption}
        fallbackText={record.employmentType ?? "-"}
        label="用工性质"
        onUpdated={onOptionUpdated}
      />
    ),
  },
  employmentStatus: {
    key: "employmentStatus",
    title: "用工状态",
    dataIndex: "employmentStatus",
    filters: [
      { text: "在职", value: "在职" },
      { text: "离职", value: "离职" },
    ],
    onFilter: (value, record) => record.employmentStatus === value,
    render: (_dom, record) => (
      <EditableEmployeeOptionTag
        employeeId={record.id}
        field="employee.employmentStatus"
        option={record.employmentStatusOption}
        fallbackText={record.employmentStatus ?? "-"}
        label="用工状态"
        onUpdated={onOptionUpdated}
      />
    ),
  },
});
