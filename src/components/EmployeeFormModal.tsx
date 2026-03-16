// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  DatePicker,
  Divider,
  Space,
  Tag,
  ColorPicker,
} from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { ProForm, StepsForm } from "@ant-design/pro-components";
import dayjs from "dayjs";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

type Employee = {
  id?: string;
  name?: string;
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
  position?: string | null;
  level?: string | null;
  departmentLevel1?: string | null;
  departmentLevel2?: string | null;
  employmentType?: string | null;
  employmentStatus?: string | null;
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
};

type RoleOption = {
  id: string;
  code: "ADMIN" | "PROJECT_MANAGER" | "HR" | "FINANCE" | "STAFF";
  name: string;
};

type EmployeeViewMode = "basic" | "role" | "position";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  viewMode?: EmployeeViewMode;
  functionOptions?: string[];
  positionOptions?: string[];
  departmentLevel1Options?: string[];
  departmentLevel2Options?: string[];
  employmentTypeOptions?: string[];
  employmentStatusOptions?: string[];
  legalEntityOptions?: { id: string; name: string; fullName?: string | null }[];
  roleOptions?: RoleOption[];
  initialValues?: Employee | null;
  showPositionAdvancedSteps?: boolean;
};

type FormValues = {
  name?: string;
  phone?: string;
  fullName?: string;
  roleIds?: string[];
  function?: string;
  legalEntityId?: string;
  departmentLevel1?: string;
  departmentLevel2?: string;
  position?: string;
  level?: string;
  employmentType?: string;
  employmentStatus?: string;
  entryDate?: dayjs.Dayjs | null;
  leaveDate?: dayjs.Dayjs | null;
  salary?: string;
  socialSecurity?: string;
  providentFund?: string;
  workstationCost?: string;
  utilityCost?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  newFunctionName?: string;
  newFunctionColor?: string;
  newDepartmentLevel1Name?: string;
  newDepartmentLevel1Color?: string;
  newDepartmentLevel2Name?: string;
  newDepartmentLevel2Color?: string;
  newPositionName?: string;
  newPositionColor?: string;
  newEmploymentTypeName?: string;
  newEmploymentTypeColor?: string;
  newEmploymentStatusName?: string;
  newEmploymentStatusColor?: string;
};

type CreatableKey =
  | "function"
  | "departmentLevel1"
  | "departmentLevel2"
  | "position"
  | "employmentType"
  | "employmentStatus";

type CreatableConfig = {
  fieldName: keyof FormValues;
  optionField: string;
  newNameField: keyof FormValues;
  newColorField: keyof FormValues;
};

type ColorValueLike =
  | string
  | {
      toHexString?: () => string;
    }
  | null
  | undefined;

const CREATABLE_CONFIG_MAP: Record<CreatableKey, CreatableConfig> = {
  function: {
    fieldName: "function",
    optionField: "employee.function",
    newNameField: "newFunctionName",
    newColorField: "newFunctionColor",
  },
  departmentLevel1: {
    fieldName: "departmentLevel1",
    optionField: "employee.departmentLevel1",
    newNameField: "newDepartmentLevel1Name",
    newColorField: "newDepartmentLevel1Color",
  },
  departmentLevel2: {
    fieldName: "departmentLevel2",
    optionField: "employee.departmentLevel2",
    newNameField: "newDepartmentLevel2Name",
    newColorField: "newDepartmentLevel2Color",
  },
  position: {
    fieldName: "position",
    optionField: "employee.position",
    newNameField: "newPositionName",
    newColorField: "newPositionColor",
  },
  employmentType: {
    fieldName: "employmentType",
    optionField: "employee.employmentType",
    newNameField: "newEmploymentTypeName",
    newColorField: "newEmploymentTypeColor",
  },
  employmentStatus: {
    fieldName: "employmentStatus",
    optionField: "employee.employmentStatus",
    newNameField: "newEmploymentStatusName",
    newColorField: "newEmploymentStatusColor",
  },
};

const CREATABLE_KEYS: CreatableKey[] = [
  "function",
  "departmentLevel1",
  "departmentLevel2",
  "position",
  "employmentType",
  "employmentStatus",
];

const EmployeeFormModal = ({
  open,
  onCancel,
  onSuccess,
  viewMode = "basic",
  functionOptions = [],
  positionOptions = [],
  departmentLevel1Options = [],
  departmentLevel2Options = [],
  employmentTypeOptions = [],
  employmentStatusOptions = [],
  legalEntityOptions = [],
  roleOptions = [],
  initialValues,
  showPositionAdvancedSteps = true,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const isEdit = !!initialValues?.id;
  const selectedRoleIds = useMemo(
    () => initialValues?.roles?.map((item) => item.role.id) ?? [],
    [initialValues?.roles],
  );

  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);

  const [searchText, setSearchText] = useState<Record<CreatableKey, string>>({
    function: "",
    departmentLevel1: "",
    departmentLevel2: "",
    position: "",
    employmentType: "",
    employmentStatus: "",
  });

  const [showCreate, setShowCreate] = useState<Record<CreatableKey, boolean>>({
    function: false,
    departmentLevel1: false,
    departmentLevel2: false,
    position: false,
    employmentType: false,
    employmentStatus: false,
  });

  const optionValuesMap = useMemo(
    () => ({
      function: functionOptions,
      departmentLevel1: departmentLevel1Options,
      departmentLevel2: departmentLevel2Options,
      position: positionOptions,
      employmentType: employmentTypeOptions,
      employmentStatus: employmentStatusOptions,
    }),
    [
      functionOptions,
      departmentLevel1Options,
      departmentLevel2Options,
      positionOptions,
      employmentTypeOptions,
      employmentStatusOptions,
    ],
  );

  const getMergedOptions = (key: CreatableKey) => {
    const config = CREATABLE_CONFIG_MAP[key];
    const storeOptions = optionsByField[config.optionField] ?? [];
    const storeMapped = storeOptions.map((item) => ({
      value: item.value,
      color: item.color ?? "#d9d9d9",
    }));

    const storeSet = new Set(storeMapped.map((item) => item.value));
    const fallbackMapped = optionValuesMap[key]
      .filter((item): item is string => Boolean(item))
      .filter((item) => !storeSet.has(item))
      .map((item) => ({ value: item, color: "#d9d9d9" }));

    return [...storeMapped, ...fallbackMapped];
  };

  const createOptionOnSubmit = async (
    field: string,
    name?: string,
    color?: string,
  ) => {
    const value = String(name ?? "").trim();
    if (!value) return null;

    const response = await fetch("/api/select-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field,
        value,
        color: color || "#8c8c8c",
      }),
    });

    if (!response.ok) {
      throw new Error(`创建选项失败: ${value}`);
    }

    return response.json();
  };

  const baseValues = useMemo<FormValues>(
    () => ({
      name: initialValues?.name ?? "",
      phone: initialValues?.phone ?? "",
      fullName: initialValues?.fullName ?? "",
      roleIds: selectedRoleIds,
      function: initialValues?.function ?? undefined,
      legalEntityId: initialValues?.legalEntity?.id ?? undefined,
      departmentLevel1: initialValues?.departmentLevel1 ?? undefined,
      departmentLevel2: initialValues?.departmentLevel2 ?? undefined,
      position: initialValues?.position ?? undefined,
      level: initialValues?.level ?? undefined,
      employmentType: initialValues?.employmentType ?? undefined,
      employmentStatus: initialValues?.employmentStatus ?? "在职",
      entryDate: initialValues?.entryDate ? dayjs(initialValues.entryDate) : null,
      leaveDate: initialValues?.leaveDate ? dayjs(initialValues.leaveDate) : null,
      salary:
        initialValues?.salary === null || initialValues?.salary === undefined
          ? undefined
          : String(initialValues.salary),
      socialSecurity:
        initialValues?.socialSecurity === null || initialValues?.socialSecurity === undefined
          ? undefined
          : String(initialValues.socialSecurity),
      providentFund:
        initialValues?.providentFund === null || initialValues?.providentFund === undefined
          ? undefined
          : String(initialValues.providentFund),
      workstationCost:
        initialValues?.workstationCost === null || initialValues?.workstationCost === undefined
          ? undefined
          : String(initialValues.workstationCost),
      utilityCost:
        initialValues?.utilityCost === null || initialValues?.utilityCost === undefined
          ? undefined
          : String(initialValues.utilityCost),
      bankAccountNumber: initialValues?.bankAccountNumber ?? undefined,
      bankName: initialValues?.bankName ?? undefined,
      bankBranch: initialValues?.bankBranch ?? undefined,
    }),
    [initialValues, selectedRoleIds],
  );

  useEffect(() => {
    if (!open) return;
    void fetchAllOptions();
  }, [open, fetchAllOptions]);

  useEffect(() => {
    if (!open) return;
    const values = baseValues;
    if (!(isEdit && viewMode === "position")) {
      form.setFieldsValue(values);
    }
  }, [open, isEdit, viewMode, form, baseValues]);

  const toSingleValue = (value?: string | null) => value ?? null;

  const normalizeNumberText = (value?: string | null) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const resolveCreatableValues = async (values: FormValues) => {
    const nextValues = { ...values };
    let created = false;

    for (const key of CREATABLE_KEYS) {
      if (!showCreate[key]) continue;

      const config = CREATABLE_CONFIG_MAP[key];
      const name = String(values[config.newNameField] ?? "").trim();
      const rawColor = values[config.newColorField] as ColorValueLike;
      const color =
        typeof rawColor === "string"
          ? rawColor.trim() || "#8c8c8c"
          : rawColor?.toHexString?.() || "#8c8c8c";

      if (!name) continue;

      await createOptionOnSubmit(config.optionField, name, color);
      nextValues[config.fieldName] = name;
      created = true;
    }

    if (created) {
      await fetchAllOptions(true);
    }

    return nextValues;
  };

  const saveEmployee = async (payload: Record<string, unknown>) => {
    await fetch("/api/employees", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { id: initialValues?.id, ...payload } : payload),
    });
    form.resetFields();
    onSuccess();
  };

  const onNormalFinish = async (values: FormValues) => {
    const resolved = await resolveCreatableValues(values);

    if (!isEdit) {
      const payload = {
        name: resolved.name,
        phone: resolved.phone || null,
        fullName: resolved.fullName || null,
        roleIds: resolved.roleIds ?? [],
        function: toSingleValue(resolved.function),
        employmentStatus: toSingleValue(resolved.employmentStatus),
      };
      await saveEmployee(payload);
      return;
    }

    if (viewMode === "basic") {
      await saveEmployee({
        name: resolved.name,
        fullName: resolved.fullName || null,
        function: toSingleValue(resolved.function),
      });
      return;
    }

    if (viewMode === "role") {
      await saveEmployee({
        name: resolved.name,
        roleIds: resolved.roleIds ?? [],
      });
      return;
    }

    await saveEmployee({
      name: resolved.name,
      phone: resolved.phone || null,
      fullName: resolved.fullName || null,
      roleIds: resolved.roleIds ?? [],
      function: toSingleValue(resolved.function),
      employmentStatus: toSingleValue(resolved.employmentStatus),
    });
  };

  const onPositionFinish = async (values: FormValues) => {
    const resolved = await resolveCreatableValues(values);

    await saveEmployee({
      name: resolved.name,
      phone: resolved.phone || null,
      fullName: resolved.fullName || null,
      function: toSingleValue(resolved.function),
      legalEntityId: resolved.legalEntityId || null,
      departmentLevel1: toSingleValue(resolved.departmentLevel1),
      departmentLevel2: toSingleValue(resolved.departmentLevel2),
      position: toSingleValue(resolved.position),
      level: resolved.level || null,
      employmentType: toSingleValue(resolved.employmentType),
      employmentStatus: toSingleValue(resolved.employmentStatus),
      entryDate: resolved.entryDate ? resolved.entryDate.toISOString() : null,
      leaveDate: resolved.leaveDate ? resolved.leaveDate.toISOString() : null,
      salary: normalizeNumberText(resolved.salary),
      socialSecurity: normalizeNumberText(resolved.socialSecurity),
      providentFund: normalizeNumberText(resolved.providentFund),
      workstationCost: normalizeNumberText(resolved.workstationCost),
      utilityCost: normalizeNumberText(resolved.utilityCost),
      bankAccountNumber: resolved.bankAccountNumber || null,
      bankName: resolved.bankName || null,
      bankBranch: resolved.bankBranch || null,
    });
    return true;
  };

  const activateCreate = (key: CreatableKey, prefixedName?: string) => {
    const nextName = (prefixedName ?? searchText[key]).trim();
    const config = CREATABLE_CONFIG_MAP[key];

    setShowCreate((prev) => ({ ...prev, [key]: true }));
    form.setFieldValue(config.fieldName, undefined);

    form.setFieldValue(config.newColorField, "#8c8c8c");

    if (nextName) {
      form.setFieldValue(config.newNameField, nextName);
    }
  };

  const hideCreate = (key: CreatableKey) => {
    const config = CREATABLE_CONFIG_MAP[key];
    setShowCreate((prev) => ({ ...prev, [key]: false }));
    form.setFieldValue(config.newNameField, undefined);
    form.setFieldValue(config.newColorField, undefined);
  };

  const renderCreatableSelect = (
    key: CreatableKey,
    fieldName: keyof FormValues,
    placeholder: string,
  ) => {
    const options = getMergedOptions(key).map((item) => ({
      label: item.value,
      value: item.value,
      color: item.color ?? "#d9d9d9",
    }));
    const keyword = searchText[key].trim();
    const hasExactMatch = keyword
      ? options.some(
          (item) =>
            String(item.label).toLowerCase() === keyword.toLowerCase(),
        )
      : false;

    return (
      <Select
        allowClear
        options={options}
        showSearch={{
          onSearch: (value) => setSearchText((prev) => ({ ...prev, [key]: value })),
          filterOption: (input, option) =>
            String(option?.label ?? "")
              .toLowerCase()
              .includes(input.toLowerCase()),
        }}
        optionRender={(option) => {
          const data = option.data as DefaultOptionType & { color?: string };
          return (
            <Tag color={data.color ?? "#d9d9d9"} style={{ borderRadius: 6 }}>
              {String(data.label ?? "")}
            </Tag>
          );
        }}
        popupRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: "8px 0" }} />
            <div style={{ padding: "0 8px 8px" }}>
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() =>
                  activateCreate(
                    key,
                    !keyword || hasExactMatch ? undefined : keyword,
                  )
                }
              >
                {!keyword || hasExactMatch ? "新增" : `新增: ${keyword}`}
              </Button>
            </div>
          </>
        )}
        onChange={() => {
          setSearchText((prev) => ({ ...prev, [key]: "" }));
        }}
        placeholder={placeholder}
      />
    );
  };

  const renderCreateRow = (key: CreatableKey, label: string) => {
    if (!showCreate[key]) return null;

    const config = CREATABLE_CONFIG_MAP[key];

    return (
      <Space style={{ width: "100%", marginBottom: 16 }} align="start">
        <Form.Item
          label={`新增${label}`}
          name={config.newNameField}
          style={{ flex: 1, marginBottom: 0 }}
          rules={[{ required: true, message: `请输入${label}` }]}
        >
          <Input placeholder={`输入${label}（保存时创建）`} />
        </Form.Item>
        <Form.Item
          label="颜色"
          name={config.newColorField}
          initialValue="#8c8c8c"
          style={{ marginBottom: 0 }}
        >
          <ColorPicker
            value={form.getFieldValue(config.newColorField) || "#8c8c8c"}
            format="hex"
            disabledFormat
            showText
            onChangeComplete={(color) => {
              form.setFieldValue(config.newColorField, color.toHexString());
            }}
          />
        </Form.Item>
        <Form.Item label=" " style={{ marginBottom: 0 }}>
          <Button onClick={() => hideCreate(key)}>取消新增</Button>
        </Form.Item>
      </Space>
    );
  };

  const renderSimpleForm = () => (
    <Form form={form} layout="vertical" onFinish={onNormalFinish}>
      <Form.Item
        label="姓名"
        name="name"
        rules={[{ required: true, message: "请输入姓名" }]}
      >
        <Input placeholder="请输入姓名" />
      </Form.Item>

      {!isEdit ? (
        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ required: true, message: "请输入手机号" }]}
        >
          <Input placeholder="用于登录的手机号" />
        </Form.Item>
      ) : null}

      {(!isEdit || viewMode === "basic") && (
        <>
          <Form.Item label="全名" name="fullName">
            <Input placeholder="可选，完整姓名" />
          </Form.Item>

          <Form.Item label="职能" name="function">
            {renderCreatableSelect("function", "function", "选择或新增职能")}
          </Form.Item>
          {renderCreateRow("function", "职能")}
        </>
      )}

      {(!isEdit || viewMode === "role") && (
        <Form.Item
          label="角色"
          name="roleIds"
          rules={[{ required: true, message: "请至少选择一个角色" }]}
        >
          <Select
            mode="multiple"
            options={roleOptions.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
            placeholder="选择角色"
          />
        </Form.Item>
      )}

      {!isEdit ? (
        <>
          <Form.Item label="用工状态" name="employmentStatus">
            {renderCreatableSelect(
              "employmentStatus",
              "employmentStatus",
              "选择或新增用工状态",
            )}
          </Form.Item>
          {renderCreateRow("employmentStatus", "用工状态")}
        </>
      ) : null}

      <Row gutter={16}>
        <Col span={12}>
          <Button onClick={onCancel} block>
            取消
          </Button>
        </Col>
        <Col span={12}>
          <Button type="primary" onClick={() => form.submit()} block>
            保存
          </Button>
        </Col>
      </Row>
    </Form>
  );

  const renderPositionStepForm = () => (
    <StepsForm<FormValues>
      onFinish={onPositionFinish}
      submitter={{
        searchConfig: {
          next: "下一步",
          prev: "上一步",
          submit: "保存",
        },
      }}
      stepsProps={{ size: "small" }}
    >
      <StepsForm.StepForm title="基础信息" initialValues={baseValues}>
        <ProForm.Item
          label="名称"
          name="name"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input placeholder="请输入名称" />
        </ProForm.Item>
        <ProForm.Item label="全名" name="fullName">
          <Input placeholder="请输入全名" />
        </ProForm.Item>
        <ProForm.Item label="职能" name="function">
          {renderCreatableSelect("function", "function", "选择或新增职能")}
        </ProForm.Item>
        {renderCreateRow("function", "职能")}
        <ProForm.Item
          label="手机号"
          name="phone"
          rules={[{ required: true, message: "请输入手机号" }]}
        >
          <Input placeholder="用于登录的手机号" />
        </ProForm.Item>
      </StepsForm.StepForm>
      {showPositionAdvancedSteps ? (
        <>
          <StepsForm.StepForm title="组织信息" initialValues={baseValues}>
            <ProForm.Item label="签约主体" name="legalEntityId">
              <Select
                allowClear
                options={legalEntityOptions.map((item) => ({
                  label: item.fullName || item.name,
                  value: item.id,
                }))}
                placeholder="选择签约主体"
              />
            </ProForm.Item>
            <ProForm.Item label="一级部门(中心)" name="departmentLevel1">
              {renderCreatableSelect(
                "departmentLevel1",
                "departmentLevel1",
                "选择或新增一级部门(中心)",
              )}
            </ProForm.Item>
            {renderCreateRow("departmentLevel1", "一级部门(中心)")}
            <ProForm.Item label="二级部门(部门)" name="departmentLevel2">
              {renderCreatableSelect(
                "departmentLevel2",
                "departmentLevel2",
                "选择或新增二级部门(部门)",
              )}
            </ProForm.Item>
            {renderCreateRow("departmentLevel2", "二级部门(部门)")}
            <ProForm.Item label="职位" name="position">
              {renderCreatableSelect("position", "position", "选择或新增职位")}
            </ProForm.Item>
            {renderCreateRow("position", "职位")}
            <ProForm.Item label="职级" name="level">
              <Input placeholder="请输入职级" />
            </ProForm.Item>
          </StepsForm.StepForm>

          <StepsForm.StepForm title="在/离职信息" initialValues={baseValues}>
            <ProForm.Item label="用工性质" name="employmentType">
              {renderCreatableSelect(
                "employmentType",
                "employmentType",
                "选择或新增用工性质",
              )}
            </ProForm.Item>
            {renderCreateRow("employmentType", "用工性质")}
            <ProForm.Item label="用工状态" name="employmentStatus">
              {renderCreatableSelect(
                "employmentStatus",
                "employmentStatus",
                "选择或新增用工状态",
              )}
            </ProForm.Item>
            {renderCreateRow("employmentStatus", "用工状态")}
            <ProForm.Item label="入职日期" name="entryDate">
              <DatePicker style={{ width: "100%" }} />
            </ProForm.Item>
            <ProForm.Item label="离职日期" name="leaveDate">
              <DatePicker style={{ width: "100%" }} />
            </ProForm.Item>
          </StepsForm.StepForm>

          <StepsForm.StepForm title="薪酬信息" initialValues={baseValues}>
            <ProForm.Item label="薪资" name="salary">
              <Input placeholder="请输入薪资" />
            </ProForm.Item>
            <ProForm.Item label="社保" name="socialSecurity">
              <Input placeholder="请输入社保" />
            </ProForm.Item>
            <ProForm.Item label="公积金" name="providentFund">
              <Input placeholder="请输入公积金" />
            </ProForm.Item>
            <ProForm.Item label="工位费" name="workstationCost">
              <Input placeholder="请输入工位费" />
            </ProForm.Item>
            <ProForm.Item label="水电" name="utilityCost">
              <Input placeholder="请输入水电" />
            </ProForm.Item>
          </StepsForm.StepForm>

          <StepsForm.StepForm title="银行卡信息" initialValues={baseValues}>
            <ProForm.Item label="银行卡号" name="bankAccountNumber">
              <Input placeholder="请输入银行卡号" />
            </ProForm.Item>
            <ProForm.Item label="开户银行" name="bankName">
              <Input placeholder="请输入开户银行" />
            </ProForm.Item>
            <ProForm.Item label="开户支行" name="bankBranch">
              <Input placeholder="请输入开户支行" />
            </ProForm.Item>
          </StepsForm.StepForm>
        </>
      ) : null}
    </StepsForm>
  );

  return (
    <Modal
      title={isEdit ? "编辑成员" : "新增成员"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      centered
      width={isEdit && viewMode === "position" && showPositionAdvancedSteps ? 860 : 520}
    >
      {isEdit && viewMode === "position" ? renderPositionStepForm() : renderSimpleForm()}
    </Modal>
  );
};

export default EmployeeFormModal;
