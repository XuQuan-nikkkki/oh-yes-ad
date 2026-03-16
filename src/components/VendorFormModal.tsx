// @ts-nocheck
"use client";

import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Input,
  Select,
  Button,
  Divider,
  Space,
  ColorPicker,
  Tag,
} from "antd";
import type { DefaultOptionType } from "antd/es/select";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import {
  ProForm,
  ProFormCheckbox,
  ProFormInstance,
  ProFormText,
  ProFormTextArea,
  StepsForm,
} from "@ant-design/pro-components";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

type Vendor = {
  id?: string;
  name?: string;
  fullName?: string | null;
  vendorTypeOptionId?: string | null;
  businessTypeOptionIds?: string[];
  businessTypeOptionId?: string | null;
  serviceOptionIds?: string[];
  location?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  strengths?: string | null;
  notes?: string | null;
  companyIntro?: string | null;
  portfolioLink?: string | null;
  priceRange?: string | null;
  isBlacklisted?: boolean;
  cooperationStatusOptionId?: string | null;
  ratingOptionId?: string | null;
  lastCoopDate?: string | null;
  cooperatedProjects?: string | null;
};

type SelectOption = {
  id: string;
  value: string;
  color?: string | null;
};

type VendorFormValues = {
  name?: string;
  fullName?: string;
  vendorTypeOptionId?: string;
  businessTypeOptionIds?: string[];
  businessTypeOptionId?: string;
  serviceOptionIds?: string[];
  location?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  wechat?: string;
  strengths?: string;
  notes?: string;
  companyIntro?: string;
  portfolioLink?: string;
  priceRange?: string;
  isBlacklisted?: boolean;
  cooperationStatusOptionId?: string;
  ratingOptionId?: string;
  lastCoopDate?: string;
  cooperatedProjects?: string;
  newVendorTypeName?: string;
  newVendorTypeColor?: string;
  newBusinessTypeName?: string;
  newBusinessTypeColor?: string;
  newServiceName?: string;
  newServiceColor?: string;
  newCooperationStatusName?: string;
  newCooperationStatusColor?: string;
  newRatingName?: string;
  newRatingColor?: string;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  vendorTypeOptions?: SelectOption[];
  businessTypeOptions?: SelectOption[];
  servicesOptions?: SelectOption[];
  cooperationStatusOptions?: SelectOption[];
  ratingOptions?: SelectOption[];
  initialValues?: Vendor | null;
};

type CreateKey =
  | "vendorType"
  | "businessType"
  | "services"
  | "cooperationStatus"
  | "rating";

type CreateFieldConfig = {
  nameField: keyof VendorFormValues;
  colorField: keyof VendorFormValues;
  optionField: string;
};

const CREATE_FIELD_MAP: Record<CreateKey, CreateFieldConfig> = {
  vendorType: {
    nameField: "newVendorTypeName",
    colorField: "newVendorTypeColor",
    optionField: "vendor.vendorType",
  },
  businessType: {
    nameField: "newBusinessTypeName",
    colorField: "newBusinessTypeColor",
    optionField: "vendor.businessType",
  },
  services: {
    nameField: "newServiceName",
    colorField: "newServiceColor",
    optionField: "vendor.services",
  },
  cooperationStatus: {
    nameField: "newCooperationStatusName",
    colorField: "newCooperationStatusColor",
    optionField: "vendor.cooperationStatus",
  },
  rating: {
    nameField: "newRatingName",
    colorField: "newRatingColor",
    optionField: "vendor.rating",
  },
};

const FIELD_NAME_MAP: Record<
  CreateKey,
  "vendorTypeOptionId" | "businessTypeOptionIds" | "serviceOptionIds" | "cooperationStatusOptionId" | "ratingOptionId"
> = {
  vendorType: "vendorTypeOptionId",
  businessType: "businessTypeOptionIds",
  services: "serviceOptionIds",
  cooperationStatus: "cooperationStatusOptionId",
  rating: "ratingOptionId",
};

const VendorFormModal = ({
  open,
  onCancel,
  onSuccess,
  vendorTypeOptions = [],
  businessTypeOptions = [],
  servicesOptions = [],
  cooperationStatusOptions = [],
  ratingOptions = [],
  initialValues,
}: Props) => {
  const isEdit = !!initialValues?.id;
  const formRef = useRef<ProFormInstance<VendorFormValues>>();
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);

  const [searchText, setSearchText] = useState<Record<CreateKey, string>>({
    vendorType: "",
    businessType: "",
    services: "",
    cooperationStatus: "",
    rating: "",
  });
  const [showCreate, setShowCreate] = useState<Record<CreateKey, boolean>>({
    vendorType: false,
    businessType: false,
    services: false,
    cooperationStatus: false,
    rating: false,
  });
  const [createColors, setCreateColors] = useState<Record<CreateKey, string>>({
    vendorType: "#8c8c8c",
    businessType: "#8c8c8c",
    services: "#8c8c8c",
    cooperationStatus: "#8c8c8c",
    rating: "#8c8c8c",
  });

  const resetUiState = () => {
    setShowCreate({
      vendorType: false,
      businessType: false,
      services: false,
      cooperationStatus: false,
      rating: false,
    });
    setSearchText({
      vendorType: "",
      businessType: "",
      services: "",
      cooperationStatus: "",
      rating: "",
    });
    setCreateColors({
      vendorType: "#8c8c8c",
      businessType: "#8c8c8c",
      services: "#8c8c8c",
      cooperationStatus: "#8c8c8c",
      rating: "#8c8c8c",
    });
  };

  const hydrateFormValues = () => {
    resetUiState();

    const formValues: VendorFormValues = {
      name: initialValues?.name ?? undefined,
      fullName: initialValues?.fullName ?? undefined,
      vendorTypeOptionId: initialValues?.vendorTypeOptionId ?? undefined,
      businessTypeOptionIds:
        initialValues?.businessTypeOptionIds?.length
          ? initialValues.businessTypeOptionIds
          : initialValues?.businessTypeOptionId
            ? [initialValues.businessTypeOptionId]
            : [],
      serviceOptionIds: initialValues?.serviceOptionIds ?? [],
      location: initialValues?.location ?? undefined,
      contactName: initialValues?.contactName ?? undefined,
      phone: initialValues?.phone ?? undefined,
      email: initialValues?.email ?? undefined,
      wechat: initialValues?.wechat ?? undefined,
      strengths: initialValues?.strengths ?? undefined,
      notes: initialValues?.notes ?? undefined,
      companyIntro: initialValues?.companyIntro ?? undefined,
      portfolioLink: initialValues?.portfolioLink ?? undefined,
      priceRange: initialValues?.priceRange ?? undefined,
      isBlacklisted: initialValues?.isBlacklisted ?? false,
      cooperationStatusOptionId:
        initialValues?.cooperationStatusOptionId ?? undefined,
      ratingOptionId: initialValues?.ratingOptionId ?? undefined,
      lastCoopDate: initialValues?.lastCoopDate ?? undefined,
      cooperatedProjects: initialValues?.cooperatedProjects ?? undefined,
    };

    formRef.current?.resetFields();
    formRef.current?.setFieldsValue(formValues);
  };

  const step1InitialValues: VendorFormValues = {
    name: initialValues?.name ?? undefined,
    fullName: initialValues?.fullName ?? undefined,
  };

  const step2InitialValues: VendorFormValues = {
    vendorTypeOptionId: initialValues?.vendorTypeOptionId ?? undefined,
    businessTypeOptionIds:
      initialValues?.businessTypeOptionIds?.length
        ? initialValues.businessTypeOptionIds
        : initialValues?.businessTypeOptionId
          ? [initialValues.businessTypeOptionId]
          : [],
    serviceOptionIds: initialValues?.serviceOptionIds ?? [],
    strengths: initialValues?.strengths ?? undefined,
    companyIntro: initialValues?.companyIntro ?? undefined,
    portfolioLink: initialValues?.portfolioLink ?? undefined,
  };

  const step3InitialValues: VendorFormValues = {
    location: initialValues?.location ?? undefined,
    contactName: initialValues?.contactName ?? undefined,
    wechat: initialValues?.wechat ?? undefined,
    phone: initialValues?.phone ?? undefined,
    email: initialValues?.email ?? undefined,
  };

  const step4InitialValues: VendorFormValues = {
    priceRange: initialValues?.priceRange ?? undefined,
    notes: initialValues?.notes ?? undefined,
    lastCoopDate: initialValues?.lastCoopDate ?? undefined,
    cooperatedProjects: initialValues?.cooperatedProjects ?? undefined,
  };

  const step5InitialValues: VendorFormValues = {
    cooperationStatusOptionId:
      initialValues?.cooperationStatusOptionId ?? undefined,
    ratingOptionId: initialValues?.ratingOptionId ?? undefined,
    isBlacklisted: initialValues?.isBlacklisted ?? false,
  };

  const optionMaps = useMemo(
    () => ({
      vendorType: vendorTypeOptions,
      businessType: businessTypeOptions,
      services: servicesOptions,
      cooperationStatus: cooperationStatusOptions,
      rating: ratingOptions,
    }),
    [
      vendorTypeOptions,
      businessTypeOptions,
      servicesOptions,
      cooperationStatusOptions,
      ratingOptions,
    ],
  );

  const toSelectOptions = (items: SelectOption[]) =>
    items.map((item) => ({
      label: item.value,
      value: item.id,
      color: item.color ?? "#d9d9d9",
    }));

  const getOptionById = (options: SelectOption[], id: string | number) =>
    options.find((item) => item.id === String(id));

  const hasExactMatch = (key: CreateKey) => {
    const keyword = searchText[key].trim().toLowerCase();
    if (!keyword) return false;
    return optionMaps[key].some(
      (item) => item.value.trim().toLowerCase() === keyword,
    );
  };

  const activateCreate = (key: CreateKey, prefixedName?: string) => {
    const nextName = (prefixedName ?? searchText[key]).trim();
    const config = CREATE_FIELD_MAP[key];

    setShowCreate((prev) => ({ ...prev, [key]: true }));

    formRef.current?.setFieldValue(FIELD_NAME_MAP[key], undefined);
    formRef.current?.setFieldValue(config.colorField, "#8c8c8c");
    if (nextName) {
      formRef.current?.setFieldValue(config.nameField, nextName);
    }
  };

  const hideCreate = (key: CreateKey) => {
    const config = CREATE_FIELD_MAP[key];

    setShowCreate((prev) => ({ ...prev, [key]: false }));
    formRef.current?.setFieldValue(config.nameField, undefined);
    formRef.current?.setFieldValue(config.colorField, undefined);
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

    const option = (await response.json()) as { id: string };
    return option.id;
  };

  const onFinish = async (values: VendorFormValues) => {
    let vendorTypeOptionId = values.vendorTypeOptionId;
    const businessTypeOptionIds = Array.isArray(values.businessTypeOptionIds)
      ? [...values.businessTypeOptionIds]
      : [];
    let cooperationStatusOptionId = values.cooperationStatusOptionId;
    let ratingOptionId = values.ratingOptionId;
    const serviceOptionIds = Array.isArray(values.serviceOptionIds)
      ? [...values.serviceOptionIds]
      : [];

    if (!vendorTypeOptionId && values.newVendorTypeName?.trim()) {
      vendorTypeOptionId =
        (await createOptionOnSubmit(
          "vendor.vendorType",
          values.newVendorTypeName,
          values.newVendorTypeColor,
        )) ?? undefined;
    }

    if (values.newBusinessTypeName?.trim()) {
      const newBusinessTypeId = await createOptionOnSubmit(
        "vendor.businessType",
        values.newBusinessTypeName,
        values.newBusinessTypeColor,
      );
      if (newBusinessTypeId) {
        businessTypeOptionIds.push(newBusinessTypeId);
      }
    }

    if (!cooperationStatusOptionId && values.newCooperationStatusName?.trim()) {
      cooperationStatusOptionId =
        (await createOptionOnSubmit(
          "vendor.cooperationStatus",
          values.newCooperationStatusName,
          values.newCooperationStatusColor,
        )) ?? undefined;
    }

    if (!ratingOptionId && values.newRatingName?.trim()) {
      ratingOptionId =
        (await createOptionOnSubmit(
          "vendor.rating",
          values.newRatingName,
          values.newRatingColor,
        )) ?? undefined;
    }

    if (values.newServiceName?.trim()) {
      const newServiceId = await createOptionOnSubmit(
        "vendor.services",
        values.newServiceName,
        values.newServiceColor,
      );
      if (newServiceId) {
        serviceOptionIds.push(newServiceId);
      }
    }

    const payload = {
      ...values,
      vendorTypeOptionId: vendorTypeOptionId ?? null,
      businessTypeOptionIds: Array.from(new Set(businessTypeOptionIds)),
      businessTypeOptionId: null,
      cooperationStatusOptionId: cooperationStatusOptionId ?? null,
      ratingOptionId: ratingOptionId ?? null,
      serviceOptionIds: Array.from(new Set(serviceOptionIds)),
    };

    await fetch("/api/vendors", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { id: initialValues?.id, ...payload } : payload,
      ),
    });

    await fetchAllOptions(true);
    onSuccess();
    return true;
  };

  const renderOptionField = (
    key: CreateKey,
    label: string,
    fieldName:
      | "vendorTypeOptionId"
      | "businessTypeOptionIds"
      | "serviceOptionIds"
      | "cooperationStatusOptionId"
      | "ratingOptionId",
    options: SelectOption[],
    multiple = false,
    placeholder = "请选择",
  ) => {
    if (showCreate[key]) {
      const config = CREATE_FIELD_MAP[key];

      return (
        <div style={{ marginBottom: 24 }}>
          <Space style={{ width: "100%" }} align="start">
            <ProForm.Item
              label={label}
              name={config.nameField}
              style={{ flex: 1, marginBottom: 0 }}
              rules={[{ required: true, message: `请输入${label}` }]}
            >
              <Input placeholder={`输入${label}（保存时创建）`} />
            </ProForm.Item>
            <ProForm.Item
              label="颜色"
              name={config.colorField}
              initialValue="#8c8c8c"
              style={{ marginBottom: 0 }}
            >
              <ColorPicker
                value={createColors[key]}
                format="hex"
                disabledFormat
                showText
                onChangeComplete={(color) => {
                  const hex = color.toHexString();
                  setCreateColors((prev) => ({ ...prev, [key]: hex }));
                  formRef.current?.setFieldValue(config.colorField, hex);
                }}
              />
            </ProForm.Item>
            <ProForm.Item label=" " style={{ marginBottom: 0 }}>
              <Button onClick={() => hideCreate(key)}>取消新增</Button>
            </ProForm.Item>
          </Space>
        </div>
      );
    }

    return (
      <ProForm.Item label={label} name={fieldName}>
        <Select
          mode={multiple ? "multiple" : undefined}
          options={toSelectOptions(options)}
          showSearch={{
            onSearch: (val) => setSearchText((prev) => ({ ...prev, [key]: val })),
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
          popupRender={(menu) => {
            const keyword = searchText[key].trim();
            const matched = hasExactMatch(key);

            return (
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
                        !keyword || matched ? undefined : keyword,
                      )
                    }
                  >
                    {!keyword || matched ? "新增" : `新增: ${keyword}`}
                  </Button>
                </div>
              </>
            );
          }}
          placeholder={placeholder}
          allowClear
          tagRender={
            multiple
              ? (props: CustomTagProps) => {
                  const option = getOptionById(options, props.value);
                  const color = option?.color ?? "#d9d9d9";
                  return (
                    <Tag
                      color={color}
                      closable={props.closable}
                      onClose={props.onClose}
                      style={{ marginInlineEnd: 4, borderRadius: 6 }}
                    >
                      {option?.value ?? props.label}
                    </Tag>
                  );
                }
              : undefined
          }
        />
      </ProForm.Item>
    );
  };

  return (
    <Modal
      title={isEdit ? "编辑供应商" : "新建供应商"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (visible) {
          hydrateFormValues();
        }
      }}
      width="80%"
      styles={{
        body: {
          maxHeight: "80vh",
          overflow: "auto",
        },
      }}
    >
      <StepsForm<VendorFormValues>
        formRef={formRef}
        onFinish={onFinish}
        submitter={{
          searchConfig: {
            next: "下一步",
            prev: "上一步",
            submit: "保存",
          },
        }}
        stepsProps={{
          size: "small",
        }}
      >
        <StepsForm.StepForm<VendorFormValues>
          title="基础信息"
          initialValues={step1InitialValues}
        >
          <ProFormText
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入名称" }]}
          />
          <ProFormText name="fullName" label="全称" />
        </StepsForm.StepForm>

        <StepsForm.StepForm<VendorFormValues>
          title="公司情况"
          initialValues={step2InitialValues}
        >
          {renderOptionField(
            "vendorType",
            "供应商类型",
            "vendorTypeOptionId",
            vendorTypeOptions,
            false,
            "选择供应商类型",
          )}
          {renderOptionField(
            "businessType",
            "业务类型",
            "businessTypeOptionIds",
            businessTypeOptions,
            true,
            "选择业务类型（可多选）",
          )}
          {renderOptionField(
            "services",
            "服务范围",
            "serviceOptionIds",
            servicesOptions,
            true,
            "选择服务范围（可多选）",
          )}
          <ProFormTextArea name="strengths" label="核心特色/擅长领域" fieldProps={{ rows: 2 }} />
          <ProFormText
            name="companyIntro"
            label="公司简介链接"
            fieldProps={{ type: "url", placeholder: "https://" }}
          />
          <ProFormText name="portfolioLink" label="代表作品链接" fieldProps={{ type: "url", placeholder: "https://" }} />
        </StepsForm.StepForm>

        <StepsForm.StepForm<VendorFormValues>
          title="联系方式"
          initialValues={step3InitialValues}
        >
          <ProFormText name="location" label="所在地" />
          <ProFormText name="contactName" label="联系人" />
          <ProFormText name="wechat" label="联系人微信" />
          <ProFormText name="phone" label="电话" />
          <ProFormText name="email" label="邮箱" fieldProps={{ type: "email" }} />
        </StepsForm.StepForm>

        <StepsForm.StepForm<VendorFormValues>
          title="合作情况"
          initialValues={step4InitialValues}
        >
          <ProFormTextArea name="priceRange" label="参考价区间" fieldProps={{ rows: 5 }} />
          <ProFormTextArea name="notes" label="关键备注" fieldProps={{ rows: 2 }} />
          <ProFormText name="lastCoopDate" label="最近合作时间" />
          <ProFormTextArea name="cooperatedProjects" label="往期合作项目" fieldProps={{ rows: 2 }} />
        </StepsForm.StepForm>

        <StepsForm.StepForm<VendorFormValues>
          title="合作评价"
          initialValues={step5InitialValues}
        >
          {renderOptionField(
            "cooperationStatus",
            "合作状态",
            "cooperationStatusOptionId",
            cooperationStatusOptions,
            false,
            "选择合作状态",
          )}
          {renderOptionField(
            "rating",
            "综合评级",
            "ratingOptionId",
            ratingOptions,
            false,
            "选择评级",
          )}
          <ProFormCheckbox name="isBlacklisted">是否在黑名单中</ProFormCheckbox>
        </StepsForm.StepForm>
      </StepsForm>
    </Modal>
  );
};

export default VendorFormModal;
