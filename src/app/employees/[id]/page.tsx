"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Tabs,
  Timeline,
  message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import EmployeeFormModal from "@/components/EmployeeFormModal";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import SelectOptionTag from "@/components/SelectOptionTag";
import EmployeeFunctionValue from "@/components/employee/EmployeeFunctionValue";
import ProjectsTable, { type Project } from "@/components/ProjectsTable";
import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import type { WorkdayAdjustment } from "@/types/workdayAdjustment";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";

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
  compensationHistories?: CompensationHistory[];
};

type CompensationHistory = {
  id: string;
  salary?: string | number | null;
  socialSecurity?: string | number | null;
  providentFund?: string | number | null;
  workstationCost?: string | number | null;
  utilityCost?: string | number | null;
  changeReason?: string | null;
  effectiveDate: string;
};

type CompensationChangeFormValues = {
  salary?: string;
  socialSecurity?: string;
  providentFund?: string;
  workstationCost?: string;
  utilityCost?: string;
  changeReason?: string;
  effectiveDate?: dayjs.Dayjs | null;
};

type CompensationField = {
  key: "salary" | "socialSecurity" | "providentFund" | "workstationCost" | "utilityCost";
  label: string;
};

type CostFieldName = "workstationCost" | "utilityCost";

const compensationFields: CompensationField[] = [
  { key: "salary", label: "薪资" },
  { key: "socialSecurity", label: "社保" },
  { key: "providentFund", label: "公积金" },
  { key: "workstationCost", label: "工位费" },
  { key: "utilityCost", label: "水电" },
];

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
  const [compensationForm] = Form.useForm<CompensationChangeFormValues>();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [compensationModalOpen, setCompensationModalOpen] = useState(false);
  const [compensationSubmitting, setCompensationSubmitting] = useState(false);
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
  const [messageApi, contextHolder] = message.useMessage();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const isAdmin = roleCodes.includes("ADMIN");
  const hideProjectAndWorkLogTabs =
    !isAdmin && (roleCodes.includes("HR") || roleCodes.includes("FINANCE"));
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const removeEmployeeFromStore = useEmployeesStore((state) => state.removeEmployee);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );
  const compensationWorkstationCost = Form.useWatch("workstationCost", compensationForm);
  const compensationUtilityCost = Form.useWatch("utilityCost", compensationForm);
  const defaultWorkstationCost = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeDefaultWorkstationCost,
      ),
    [systemSettings],
  );
  const defaultUtilityCost = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeDefaultUtilityCost,
      ),
    [systemSettings],
  );

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
        const data = await fetchAdjustmentsFromStore();
        setWorkdayAdjustments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch workday adjustments:", error);
        setWorkdayAdjustments([]);
      }
    })();
  }, [fetchAdjustmentsFromStore]);

  useEffect(() => {
    (async () => {
      const [rolesRes, employeesRes, legalEntitiesRes] = await Promise.all([
        fetch("/api/roles"),
        fetchEmployeesFromStore({ full: true }),
        fetch("/api/legal-entities"),
      ]);
      setRoleOptions(await rolesRes.json());
      const allEmployees = employeesRes;
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
  }, [fetchEmployeesFromStore]);

  const canViewHrFinanceInfo =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");
  const canEditEmployeeOptions =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("PROJECT_MANAGER") ||
    roleCodes.includes("HR");

  useEffect(() => {
    if (canViewHrFinanceInfo) return;
    if (activeTabKey === "employee-info" || activeTabKey === "salary-info") {
      setActiveTabKey("catering-projects");
    }
  }, [activeTabKey, canViewHrFinanceInfo]);

  useEffect(() => {
    if (!hideProjectAndWorkLogTabs) return;
    if (activeTabKey === "catering-projects" || activeTabKey === "work-logs") {
      setActiveTabKey(canViewHrFinanceInfo ? "employee-info" : "leave-records");
    }
  }, [activeTabKey, canViewHrFinanceInfo, hideProjectAndWorkLogTabs]);

  useEffect(() => {
    if (!compensationModalOpen) return;
    void fetchSystemSettings(true);
  }, [compensationModalOpen, fetchSystemSettings]);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch("/api/employees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    removeEmployeeFromStore(id);
    messageApi.success("删除成功");
    router.push("/employees");
  };

  const formatMoney = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "-";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return String(value);
    return parsed.toLocaleString("zh-CN", {
      maximumFractionDigits: 2,
    });
  };

  const toNumber = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toNumberText = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "";
    return String(value);
  };

  const normalizeNumberText = (value?: string | number | null) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const renderDefaultCostLabel = ({
    label,
    fieldName,
    currentValue,
    defaultValue,
  }: {
    label: string;
    fieldName: CostFieldName;
    currentValue?: string | number | null;
    defaultValue: number;
  }) => {
    const shouldShowButton = normalizeNumberText(currentValue) !== defaultValue;

    return (
      <Space size={8}>
        <span>{label}</span>
        {shouldShowButton ? (
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              compensationForm.setFieldValue(fieldName, String(defaultValue));
            }}
          >
            更新为默认值
          </Button>
        ) : null}
      </Space>
    );
  };

  const openCompensationModal = () => {
    compensationForm.setFieldsValue({
      salary: toNumberText(employee?.salary),
      socialSecurity: toNumberText(employee?.socialSecurity),
      providentFund: toNumberText(employee?.providentFund),
      workstationCost: toNumberText(employee?.workstationCost),
      utilityCost: toNumberText(employee?.utilityCost),
      changeReason: "",
      effectiveDate: dayjs(),
    });
    setCompensationModalOpen(true);
  };

  const handleCompensationSubmit = async () => {
    const values = await compensationForm.validateFields();
    setCompensationSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${id}/compensation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salary: normalizeNumberText(values.salary),
          socialSecurity: normalizeNumberText(values.socialSecurity),
          providentFund: normalizeNumberText(values.providentFund),
          workstationCost: normalizeNumberText(values.workstationCost),
          utilityCost: normalizeNumberText(values.utilityCost),
          changeReason: values.changeReason?.trim() || null,
          effectiveDate: values.effectiveDate
            ? values.effectiveDate.startOf("day").toISOString()
            : null,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "薪酬变动保存失败");
      }
      setCompensationModalOpen(false);
      compensationForm.resetFields();
      await fetchEmployee();
      messageApi.success("薪酬变动已保存");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "薪酬变动保存失败");
    } finally {
      setCompensationSubmitting(false);
    }
  };

  const totalHumanCost =
    toNumber(employee?.salary) +
    toNumber(employee?.socialSecurity) +
    toNumber(employee?.providentFund);
  const totalRentCost =
    toNumber(employee?.workstationCost) +
    toNumber(employee?.utilityCost);

  const formatDeltaValue = (value: number) =>
    Math.abs(value).toLocaleString("zh-CN", {
      maximumFractionDigits: 2,
    });

  const getCompensationTotal = (snapshot: CompensationHistory) =>
    toNumber(snapshot.salary) +
    toNumber(snapshot.socialSecurity) +
    toNumber(snapshot.providentFund) +
    toNumber(snapshot.workstationCost) +
    toNumber(snapshot.utilityCost);

  const renderDeltaTag = (
    current: string | number | null | undefined,
    previous: string | number | null | undefined,
  ) => {
    const currentValue = toNumber(current);
    const previousValue = toNumber(previous);
    const delta = currentValue - previousValue;
    if (Math.abs(delta) < 0.000001) return null;

    const isIncrease = delta > 0;
    return (
      <Tag
        color={isIncrease ? "success" : "error"}
        style={{ marginInlineStart: 8, fontWeight: 600 }}
      >
        {`${isIncrease ? "+" : "-"}${formatDeltaValue(delta)}`}
      </Tag>
    );
  };

  const hasCompensationHistoryValue = (history: CompensationHistory) =>
    [
      history.salary,
      history.socialSecurity,
      history.providentFund,
      history.workstationCost,
      history.utilityCost,
    ].some((value) => value !== null && value !== undefined && value !== "");

  const renderCompensationHistory = () => {
    const histories = [...(employee?.compensationHistories ?? [])]
      .filter(hasCompensationHistoryValue)
      .sort((a, b) => {
        const left = dayjs(a.effectiveDate).valueOf();
        const right = dayjs(b.effectiveDate).valueOf();
        return right - left;
      });

    if (histories.length === 0) {
      return <div style={{ color: "#999" }}>暂无薪资变动历史</div>;
    }

    return (
      <Timeline
        className="employee-compensation-timeline"
        items={histories.map((history, index) => {
          const previous = histories[index + 1];
          const currentTotal = getCompensationTotal(history);
          const previousTotal = previous ? getCompensationTotal(previous) : null;
          const totalDeltaTag = previous
            ? renderDeltaTag(currentTotal, previousTotal)
            : null;

          return {
            key: history.id,
            content: (
              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                <div style={{ fontWeight: 600 }}>
                  {dayjs(history.effectiveDate).format("YYYY-MM-DD")}
                </div>
                <div
                  style={{
                    background: "#f5f5f5",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 8,
                      color: "#595959",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                    >
                    <div>变动原因：{history.changeReason?.trim() || "-"}</div>
                    {totalDeltaTag ? (
                      <div style={{ whiteSpace: "nowrap" }}>
                        合计变动：{totalDeltaTag}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div style={{ color: "#8c8c8c", marginBottom: 4, fontSize: 12 }}>薪资</div>
                      <div>
                        {formatMoney(history.salary)}
                        {previous ? renderDeltaTag(history.salary, previous.salary) : null}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#8c8c8c", marginBottom: 4, fontSize: 12 }}>社保</div>
                      <div>
                        {formatMoney(history.socialSecurity)}
                        {previous
                          ? renderDeltaTag(history.socialSecurity, previous.socialSecurity)
                          : null}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#8c8c8c", marginBottom: 4, fontSize: 12 }}>公积金</div>
                      <div>
                        {formatMoney(history.providentFund)}
                        {previous
                          ? renderDeltaTag(history.providentFund, previous.providentFund)
                          : null}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#8c8c8c", marginBottom: 4 }}>工位费</div>
                      <div>
                        {formatMoney(history.workstationCost)}
                        {previous
                          ? renderDeltaTag(history.workstationCost, previous.workstationCost)
                          : null}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#8c8c8c", marginBottom: 4 }}>水电</div>
                      <div>
                        {formatMoney(history.utilityCost)}
                        {previous
                          ? renderDeltaTag(history.utilityCost, previous.utilityCost)
                          : null}
                      </div>
                    </div>
                  </div>
                </div>
              </Space>
            ),
          };
        })}
      />
    );
  };

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

  if (loading && !employee) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card loading />
      </DetailPageContainer>
    );
  }

  if (!employee) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card>成员不存在</Card>
      </DetailPageContainer>
    );
  }

  const departmentLevel1Option = normalizeEditableOption(
    employee.departmentLevel1Option,
  );
  const departmentLevel2Option = normalizeEditableOption(
    employee.departmentLevel2Option,
  );
  const positionOption = normalizeEditableOption(employee.positionOption);
  const employmentTypeOption = normalizeEditableOption(
    employee.employmentTypeOption,
  );
  const employmentStatusOption = normalizeEditableOption(
    employee.employmentStatusOption,
  );

  const renderEditableOption = (
    field:
      | "employee.departmentLevel1"
      | "employee.departmentLevel2"
      | "employee.position"
      | "employee.employmentType"
      | "employee.employmentStatus",
    payloadKey:
      | "departmentLevel1"
      | "departmentLevel2"
      | "position"
      | "employmentType"
      | "employmentStatus",
    option:
      | {
          id: string;
          value: string;
          color?: string | null;
        }
      | null,
    fallbackText: string,
    label: string,
  ) => (
    <SelectOptionQuickEditTag
      field={field}
      option={option}
      fallbackText={fallbackText}
      disabled={!canEditEmployeeOptions}
      modalTitle={`修改${label}`}
      optionValueLabel={label}
      saveSuccessText={`${label}已保存`}
      onSaveSelection={async (nextOption) => {
        const res = await fetch(`/api/employees/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [payloadKey]: nextOption }),
        });
        if (!res.ok) {
          throw new Error((await res.text()) || "更新失败");
        }
      }}
      onUpdated={fetchEmployee}
    />
  );

  const renderProjectQuickEditTag = (
    project: Project,
    field: "project.type" | "project.status" | "project.stage",
    payloadKey: "type" | "status" | "stage",
    option:
      | {
          id?: string;
          value?: string | null;
          color?: string | null;
        }
      | null
      | undefined,
    fallbackText: string,
    label: string,
  ) => (
    <SelectOptionQuickEditTag
      field={field}
      option={
        option?.id && option.value
          ? {
              id: option.id,
              value: option.value,
              color: option.color ?? null,
            }
          : null
      }
      fallbackText={fallbackText}
      disabled={!canEditEmployeeOptions}
      modalTitle={`修改${label}`}
      optionValueLabel={label}
      saveSuccessText={`${label}已保存`}
      onSaveSelection={async (nextOption) => {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [payloadKey]: nextOption.value }),
        });
        if (!res.ok) {
          throw new Error((await res.text()) || "更新失败");
        }
      }}
      onUpdated={fetchEmployee}
    />
  );

  const renderCompensationChangeField = (field: CompensationField) => {
    const nextLabel =
      field.key === "workstationCost"
        ? renderDefaultCostLabel({
            label: `新${field.label}`,
            fieldName: "workstationCost",
            currentValue: compensationWorkstationCost,
            defaultValue: defaultWorkstationCost,
          })
        : field.key === "utilityCost"
          ? renderDefaultCostLabel({
              label: `新${field.label}`,
              fieldName: "utilityCost",
              currentValue: compensationUtilityCost,
              defaultValue: defaultUtilityCost,
            })
          : `新${field.label}`;

    return (
      <Space align="start" size={12} style={{ display: "flex", width: "100%" }}>
        <Form.Item label={`原${field.label}`} style={{ flex: 1, marginBottom: 12 }}>
          <Input value={toNumberText(employee?.[field.key])} disabled />
        </Form.Item>
        <Form.Item
          label={nextLabel}
          name={field.key}
          style={{ flex: 1, marginBottom: 12 }}
        >
          <Input placeholder={`请输入新${field.label}`} />
        </Form.Item>
      </Space>
    );
  };

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={employee.name || "成员详情"}
        loading={loading}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setOpen(true)}>
              编辑
            </Button>
            <Popconfirm
              title={`确定删除成员「${employee.name ?? ""}」？`}
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
        <Descriptions column={3} size="small">
          <Descriptions.Item label="全名">{employee.fullName ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="职能">
            <EmployeeFunctionValue
              employeeId={employee.id}
              functionOption={normalizeEditableOption(employee.functionOption)}
              fallbackText={employee.function ?? "-"}
              onUpdated={fetchEmployee}
            />
          </Descriptions.Item>
          <Descriptions.Item label="手机号">{employee.phone ?? "-"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          tabBarExtraContent={
            activeTabKey === "salary-info" && canViewHrFinanceInfo ? (
              <Button type="primary" onClick={openCompensationModal}>
                薪酬变动
              </Button>
            ) : null
          }
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
                              {renderEditableOption(
                                "employee.departmentLevel1",
                                "departmentLevel1",
                                departmentLevel1Option,
                                employee.departmentLevel1 ?? "-",
                                "一级部门",
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="二级部门(部门)">
                              {renderEditableOption(
                                "employee.departmentLevel2",
                                "departmentLevel2",
                                departmentLevel2Option,
                                employee.departmentLevel2 ?? "-",
                                "二级部门",
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="职位">
                              {renderEditableOption(
                                "employee.position",
                                "position",
                                positionOption,
                                employee.position ?? "-",
                                "职位",
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="职级">{employee?.level ?? "-"}</Descriptions.Item>
                          </Descriptions>
                        </div>

                        <div>
                          <h4 style={{ margin: "0 0 12px 0" }}>在/离职信息</h4>
                          <Descriptions column={3} size="small">
                            <Descriptions.Item label="用工性质">
                              {renderEditableOption(
                                "employee.employmentType",
                                "employmentType",
                                employmentTypeOption,
                                employee.employmentType ?? "-",
                                "用工性质",
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="用工状态">
                              {renderEditableOption(
                                "employee.employmentStatus",
                                "employmentStatus",
                                employmentStatusOption,
                                employee.employmentStatus ?? "-",
                                "用工状态",
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
                        <div style={{ display: "flex", width: "100%" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: "0 0 12px 0" }}>薪酬</h4>
                            <Descriptions column={3} size="small">
                              <Descriptions.Item label="薪资">{formatMoney(employee?.salary)}</Descriptions.Item>
                              <Descriptions.Item label="社保">{formatMoney(employee?.socialSecurity)}</Descriptions.Item>
                              <Descriptions.Item label="公积金">{formatMoney(employee?.providentFund)}</Descriptions.Item>
                              <Descriptions.Item label="人力成本" span={3}>
                                <strong>{formatMoney(totalHumanCost)}</strong>
                              </Descriptions.Item>
                            </Descriptions>
                            <Descriptions
                              column={3}
                              size="small"
                              style={{ marginTop: 22 }}
                            >
                              <Descriptions.Item label="工位费">{formatMoney(employee?.workstationCost)}</Descriptions.Item>
                              <Descriptions.Item label="水电" span={2}>{formatMoney(employee?.utilityCost)}</Descriptions.Item>
                              <Descriptions.Item label="租金成本" span={3}>
                                <strong>{formatMoney(totalRentCost)}</strong>
                              </Descriptions.Item>
                            </Descriptions>
                          </div>

                          <Divider
                            orientation="vertical"
                            style={{ alignSelf: "stretch", height: "auto", margin: "0 24px" }}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: "0 0 12px 0" }}>银行卡信息</h4>
                            <Descriptions column={1} size="small">
                              <Descriptions.Item label="银行卡号">
                                {employee?.bankAccountNumber ?? "-"}
                              </Descriptions.Item>
                              <Descriptions.Item label="开户银行">{employee?.bankName ?? "-"}</Descriptions.Item>
                              <Descriptions.Item label="开户支行">{employee?.bankBranch ?? "-"}</Descriptions.Item>
                            </Descriptions>
                          </div>
                        </div>

                        <Divider style={{ margin: "4px 0 0" }} />

                        <div>
                          <h4 style={{ margin: "0 0 12px 0" }}>薪资变动历史</h4>
                          {renderCompensationHistory()}
                        </div>
                      </Space>
                    ),
                  },
                ]
              : []),
            ...(!hideProjectAndWorkLogTabs
              ? [
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
                        renderTypeOption={(project) =>
                          renderProjectQuickEditTag(
                            project,
                            "project.type",
                            "type",
                            project.typeOption,
                            project.type ?? "-",
                            "项目类型",
                          )
                        }
                        renderStatusOption={(project) =>
                          renderProjectQuickEditTag(
                            project,
                            "project.status",
                            "status",
                            project.statusOption,
                            project.status ?? "-",
                            "项目状态",
                          )
                        }
                        renderStageOption={(project) =>
                          renderProjectQuickEditTag(
                            project,
                            "project.stage",
                            "stage",
                            project.stageOption,
                            project.stage ?? "-",
                            "项目阶段",
                          )
                        }
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
                            messageApi.error("删除实际工时失败");
                            return;
                          }
                          messageApi.success(`已删除实际工时「${title}」`);
                          setActualWorkRefreshKey((prev) => prev + 1);
                        }}
                      />
                    ),
                  },
                ]
              : []),
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
          messageApi.success("更新成功");
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
      <Modal
        title="薪酬变动"
        open={compensationModalOpen}
        onCancel={() => setCompensationModalOpen(false)}
        onOk={() => void handleCompensationSubmit()}
        okText="确定"
        cancelText="取消"
        confirmLoading={compensationSubmitting}
        destroyOnHidden
        forceRender
        width={860}
      >
        <Form form={compensationForm} layout="vertical">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <Form.Item
                label="变动原因"
                name="changeReason"
                rules={[{ required: true, message: "请输入变动原因" }]}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="请输入变动原因" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="生效日期"
                name="effectiveDate"
                rules={[{ required: true, message: "请选择生效日期" }]}
                style={{ marginBottom: 0 }}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 8]}>
            {compensationFields.map((field) => (
              <Col xs={24} md={12} key={field.key}>
                {renderCompensationChangeField(field)}
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>
    </DetailPageContainer>
  );
};

export default EmployeeDetailPage;
