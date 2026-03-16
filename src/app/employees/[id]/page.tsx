// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Popconfirm, Space, Table, Tabs, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import EmployeeFormModal from "@/components/EmployeeFormModal";
import SelectOptionTag from "@/components/SelectOptionTag";
import ProjectsTable, { type Project } from "@/components/ProjectsTable";
import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";

type EmployeeDetail = {
  id: string;
  name: string;
  phone?: string | null;
  fullName?: string | null;
  roles?: {
    role: {
      id: string;
      code: "ADMIN" | "PROJECT_MANAGER" | "HR" | "FINANCE" | "STAFF";
      name: string;
    };
  }[];
  function?: string | null;
  functionOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  positionOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  position?: string | null;
  level?: string | null;
  departmentLevel1?: string | null;
  departmentLevel1Option?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  departmentLevel2?: string | null;
  departmentLevel2Option?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  employmentType?: string | null;
  employmentTypeOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  entryDate?: string | null;
  leaveDate?: string | null;
  salary?: string | number | null;
  socialSecurity?: string | number | null;
  providentFund?: string | number | null;
  workstationCost?: string | number | null;
  utilityCost?: string | number | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  legalEntity?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
  ownedProjects?: {
    id: string;
    name: string;
    type?: string | null;
    status?: string | null;
  }[];
  projects?: Project[];
  leaveRecords?: {
    id: string;
    type?: string | null;
    typeOption?: {
      id: string;
      value: string;
      color?: string | null;
    } | null;
    datePrecision?: "DATE" | "DATETIME" | null;
    startDate: string;
    endDate: string;
  }[];
  actualWorkEntries?: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    project?: {
      id: string;
      name: string;
    } | null;
  }[];
};

type WorkdayAdjustment = {
  id: string;
  changeType: string;
  startDate: string;
  endDate: string;
};

const EmployeeDetailPage = () => {
  const normalizeTagValue = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized || normalized === "-" || normalized === "—") return null;
    return normalized;
  };

  const normalizeEditableOption = (
    option?: { id: string; value: string; color?: string | null } | null,
  ) => {
    const normalizedValue = normalizeTagValue(option?.value);
    if (!option || !normalizedValue) return null;
    return { ...option, value: normalizedValue };
  };

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState("employee-info");
  const [actualWorkRefreshKey, setActualWorkRefreshKey] = useState(0);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustment[]
  >([]);
  const [roleOptions, setRoleOptions] = useState<
    { id: string; code: "ADMIN" | "PROJECT_MANAGER" | "HR" | "FINANCE" | "STAFF"; name: string }[]
  >([]);
  const [functionOptions, setFunctionOptions] = useState<string[]>([]);
  const [positionOptions, setPositionOptions] = useState<string[]>([]);
  const [departmentLevel1Options, setDepartmentLevel1Options] = useState<string[]>([]);
  const [departmentLevel2Options, setDepartmentLevel2Options] = useState<string[]>([]);
  const [employmentTypeOptions, setEmploymentTypeOptions] = useState<string[]>([]);
  const [employmentStatusOptions, setEmploymentStatusOptions] = useState<string[]>([]);
  const [legalEntityOptions, setLegalEntityOptions] = useState<
    { id: string; name: string; fullName?: string | null }[]
  >([]);
  const [roleCodes, setRoleCodes] = useState<string[]>([]);

  const fetchEmployee = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) {
        setEmployee(null);
        return;
      }
      const data = await res.json();
      setEmployee(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workday-adjustments");
        const data = await res.json();
        setWorkdayAdjustments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch workday adjustments:", error);
        setWorkdayAdjustments([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [rolesRes, employeesRes, legalEntitiesRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/employees?list=full"),
        fetch("/api/legal-entities"),
      ]);
      setRoleOptions(await rolesRes.json());
      const allEmployees = await employeesRes.json();
      const employeeList = Array.isArray(allEmployees) ? allEmployees : [];
      const getOptions = (field: string) =>
        Array.from(
          new Set(
            employeeList
              .map((item: Record<string, unknown>) => item[field] as string | null | undefined)
              .filter((item: string | null | undefined): item is string => Boolean(item)),
          ),
        );

      setFunctionOptions(getOptions("function"));
      setPositionOptions(getOptions("position"));
      setDepartmentLevel1Options(getOptions("departmentLevel1"));
      setDepartmentLevel2Options(getOptions("departmentLevel2"));
      setEmploymentTypeOptions(getOptions("employmentType"));
      setEmploymentStatusOptions(getOptions("employmentStatus"));

      const legalEntities = await legalEntitiesRes.json();
      setLegalEntityOptions(Array.isArray(legalEntities) ? legalEntities : []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          setRoleCodes([]);
          return;
        }
        const me = (await res.json()) as {
          roles?: Array<{
            role?: {
              code?: string | null;
            } | null;
          }> | null;
        };
        const codes = (me.roles ?? [])
          .map((item) => item?.role?.code)
          .filter((code): code is string => Boolean(code));
        setRoleCodes(codes);
      } catch {
        setRoleCodes([]);
      }
    })();
  }, []);

  const canViewHrFinanceInfo =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");

  useEffect(() => {
    if (canViewHrFinanceInfo) return;
    if (activeTabKey === "employee-info" || activeTabKey === "salary-info") {
      setActiveTabKey("catering-projects");
    }
  }, [activeTabKey, canViewHrFinanceInfo]);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch("/api/employees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(false);
    if (!res.ok) {
      message.error("删除失败");
      return;
    }
    message.success("删除成功");
    router.push("/employees");
  };

  const formatMoney = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const toNumber = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totalHumanCost =
    toNumber(employee?.salary) +
    toNumber(employee?.socialSecurity) +
    toNumber(employee?.providentFund) +
    toNumber(employee?.workstationCost) +
    toNumber(employee?.utilityCost);

  const formatLeaveTimeRange = (
    startDate?: string | null,
    endDate?: string | null,
    datePrecision?: "DATE" | "DATETIME" | null,
  ) => {
    if (!startDate || !endDate) return "-";
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (!start.isValid() || !end.isValid()) return "-";

    if (datePrecision === "DATE") {
      const startText = start.format("YYYY-MM-DD");
      const endText = end.format("YYYY-MM-DD");
      return startText === endText ? startText : `${startText} ~ ${endText}`;
    }

    const startText = start.format("YYYY-MM-DD HH:mm");
    const endText = end.format("YYYY-MM-DD HH:mm");
    return startText === endText ? startText : `${startText} ~ ${endText}`;
  };

  const formatLeaveDuration = (
    startDate?: string | null,
    endDate?: string | null,
    datePrecision?: "DATE" | "DATETIME" | null,
  ) => {
    if (!startDate || !endDate) return "-";
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (!start.isValid() || !end.isValid()) return "-";

    if (datePrecision === "DATE") {
      const days = end.startOf("day").diff(start.startOf("day"), "day") + 1;
      return days > 0 ? `${days}d` : "-";
    }

    const minutes = end.diff(start, "minute");
    if (minutes <= 0) return "-";
    const hours = minutes / 60;
    if (Number.isInteger(hours)) return `${hours}h`;
    return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card
        title={employee?.name || "成员详情"}
        loading={loading}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setOpen(true)}>
              编辑
            </Button>
            <Popconfirm
              title={`确定删除成员「${employee?.name ?? ""}」？`}
              okText="删除"
              cancelText="取消"
              onConfirm={() => void handleDelete()}
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button danger loading={deleting}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        {employee && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="全名">{employee.fullName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="职能">
              {normalizeEditableOption(employee.functionOption) ? (
                <SelectOptionTag option={normalizeEditableOption(employee.functionOption)} onUpdated={fetchEmployee} />
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">{employee.phone ?? "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card>
        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          items={[
            ...(canViewHrFinanceInfo
              ? [
                  {
                    key: "employee-info",
                    label: "岗位信息",
                    children: (
                      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                        <div>
                          <h4 style={{ margin: "0 0 12px 0" }}>组织信息</h4>
                          <Descriptions column={3} size="small">
                            <Descriptions.Item label="签约主体">
                              {employee?.legalEntity ? (
                                <AppLink href={`/legal-entities/${employee.legalEntity.id}`}>
                                  {employee.legalEntity.fullName || employee.legalEntity.name}
                                </AppLink>
                              ) : (
                                "-"
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="一级部门(中心)">
                              {normalizeEditableOption(employee?.departmentLevel1Option) ? (
                                <SelectOptionTag
                                  option={normalizeEditableOption(employee.departmentLevel1Option)}
                                  onUpdated={fetchEmployee}
                                />
                              ) : employee?.departmentLevel1 ? (
                                employee.departmentLevel1
                              ) : (
                                null
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="二级部门(部门)">
                              {normalizeEditableOption(employee?.departmentLevel2Option) ? (
                                <SelectOptionTag
                                  option={normalizeEditableOption(employee.departmentLevel2Option)}
                                  onUpdated={fetchEmployee}
                                />
                              ) : employee?.departmentLevel2 ? (
                                employee.departmentLevel2
                              ) : (
                                null
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="职位">
                              {normalizeEditableOption(employee?.positionOption) ? (
                                <SelectOptionTag option={normalizeEditableOption(employee.positionOption)} onUpdated={fetchEmployee} />
                              ) : employee?.position ? (
                                employee.position
                              ) : (
                                null
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="职级">{employee?.level ?? "-"}</Descriptions.Item>
                          </Descriptions>
                        </div>

                        <div>
                          <h4 style={{ margin: "0 0 12px 0" }}>在/离职信息</h4>
                          <Descriptions column={3} size="small">
                            <Descriptions.Item label="用工性质">
                              {normalizeEditableOption(employee?.employmentTypeOption) ? (
                                <SelectOptionTag option={normalizeEditableOption(employee.employmentTypeOption)} onUpdated={fetchEmployee} />
                              ) : (
                                null
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="用工状态">
                              {normalizeEditableOption(employee?.employmentStatusOption) ? (
                                <SelectOptionTag option={normalizeEditableOption(employee.employmentStatusOption)} onUpdated={fetchEmployee} />
                              ) : employee?.employmentStatus ? (
                                employee.employmentStatus
                              ) : (
                                null
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="入职日期">
                              {employee?.entryDate ? dayjs(employee.entryDate).format("YYYY-MM-DD") : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="离职日期">
                              {employee?.leaveDate ? dayjs(employee.leaveDate).format("YYYY-MM-DD") : "-"}
                            </Descriptions.Item>
                          </Descriptions>
                        </div>

                        <div>
                          <h4 style={{ margin: "0 0 12px 0" }}>系统角色</h4>
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="角色">
                              {employee?.roles?.length
                                ? employee.roles
                                    .map((item) => item.role?.name)
                                    .filter((value): value is string => Boolean(value))
                                    .join("、") || "-"
                                : "-"}
                            </Descriptions.Item>
                          </Descriptions>
                        </div>
                      </Space>
                    ),
                  },
                  {
                    key: "salary-info",
                    label: "薪酬信息",
                    children: (
                      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                        <div>
                          <h4 style={{ margin: "0 0 12px 0" }}>薪酬</h4>
                          <Descriptions column={3} size="small">
                            <Descriptions.Item label="薪资">{formatMoney(employee?.salary)}</Descriptions.Item>
                            <Descriptions.Item label="社保">{formatMoney(employee?.socialSecurity)}</Descriptions.Item>
                            <Descriptions.Item label="公积金">{formatMoney(employee?.providentFund)}</Descriptions.Item>
                            <Descriptions.Item label="工位费">{formatMoney(employee?.workstationCost)}</Descriptions.Item>
                            <Descriptions.Item label="水电">{formatMoney(employee?.utilityCost)}</Descriptions.Item>
                            <Descriptions.Item label="人力成本">
                              <strong>{formatMoney(totalHumanCost)}</strong>
                            </Descriptions.Item>
                          </Descriptions>
                        </div>

                        <div>
                          <h4 style={{ margin: "0 0 12px 0" }}>银行卡信息</h4>
                          <Descriptions column={3} size="small">
                            <Descriptions.Item label="银行卡号">
                              {employee?.bankAccountNumber ?? "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="开户银行">{employee?.bankName ?? "-"}</Descriptions.Item>
                            <Descriptions.Item label="开户支行">{employee?.bankBranch ?? "-"}</Descriptions.Item>
                          </Descriptions>
                        </div>
                      </Space>
                    ),
                  },
                ]
              : []),
            {
              key: "catering-projects",
              label: "参与项目",
              children: (
                <ProjectsTable
                  projects={employee?.projects ?? []}
                  workdayAdjustments={workdayAdjustments}
                  compactHorizontalPadding
                  columnKeys={["name", "type", "status", "stage", "period"]}
                  defaultVisibleColumnKeys={["name", "type", "status", "stage", "period"]}
                  onOptionUpdated={fetchEmployee}
                />
              ),
            },
            {
              key: "work-logs",
              label: "实际工时记录",
              children: (
                <ActualWorkEntriesTable
                  refreshKey={actualWorkRefreshKey}
                  compactHorizontalPadding
                  headerTitle={null}
                  showTableOptions={false}
                  employeeFilterOptions={
                    employee?.name
                      ? [{ label: employee.name, value: employee.name }]
                      : []
                  }
                  columnKeys={["title", "projectName", "startDate", "workDay"]}
                  requestData={async ({ current, pageSize, filters }) => {
                    const search = new URLSearchParams({
                      page: String(current),
                      pageSize: String(pageSize),
                      employeeId: id,
                    });
                    if (filters.title) search.set("title", filters.title);
                    if (filters.employeeName) {
                      search.set("employeeName", filters.employeeName);
                    }
                    if (filters.projectName) {
                      search.set("projectName", filters.projectName);
                    }
                    if (filters.startDate) search.set("startDate", filters.startDate);
                    if (filters.startDateFrom) {
                      search.set("startDateFrom", filters.startDateFrom);
                    }
                    if (filters.startDateTo) {
                      search.set("startDateTo", filters.startDateTo);
                    }

                    const res = await fetch(
                      `/api/actual-work-entries?${search.toString()}`,
                    );
                    if (!res.ok) {
                      return { data: [], total: 0 };
                    }
                    const data = await res.json();
                    const rows = Array.isArray(data?.data)
                      ? (data.data as ActualWorkEntryRow[])
                      : [];
                    return {
                      data: rows,
                      total:
                        typeof data?.total === "number" ? data.total : rows.length,
                    };
                  }}
                  onEdit={(row) => {
                    router.push(`/actual-work-entries/${row.id}`);
                  }}
                  onDelete={async (entryId, title) => {
                    const res = await fetch(`/api/actual-work-entries/${entryId}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) {
                      message.error("删除实际工时失败");
                      return;
                    }
                    message.success(`已删除实际工时「${title}」`);
                    setActualWorkRefreshKey((prev) => prev + 1);
                  }}
                />
              ),
            },
            {
              key: "leave-records",
              label: "请假记录",
              children: (
                <Table tableLayout="auto"
                  rowKey="id"
                  dataSource={employee?.leaveRecords ?? []}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: "暂无请假记录" }}
                  columns={[
                    {
                      title: "类型",
                      render: (_value: unknown, record) =>
                        record.typeOption ? (
                          <SelectOptionTag option={record.typeOption} onUpdated={fetchEmployee} />
                        ) : record.type ? (
                          record.type
                        ) : (
                          "-"
                        ),
                    },
                    {
                      title: "时间",
                      render: (_value: unknown, record) =>
                        formatLeaveTimeRange(record.startDate, record.endDate, record.datePrecision),
                    },
                    {
                      title: "时长",
                      render: (_value: unknown, record) =>
                        formatLeaveDuration(record.startDate, record.endDate, record.datePrecision),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <EmployeeFormModal
        open={open}
        onCancel={() => setOpen(false)}
        onSuccess={async () => {
          setOpen(false);
          await fetchEmployee();
          message.success("更新成功");
        }}
        viewMode="position"
        functionOptions={functionOptions}
        positionOptions={positionOptions}
        departmentLevel1Options={departmentLevel1Options}
        departmentLevel2Options={departmentLevel2Options}
        employmentTypeOptions={employmentTypeOptions}
        employmentStatusOptions={employmentStatusOptions}
        legalEntityOptions={legalEntityOptions}
        roleOptions={roleOptions}
        initialValues={employee}
        showPositionAdvancedSteps={canViewHrFinanceInfo}
      />
    </Space>
  );
};

export default EmployeeDetailPage;
