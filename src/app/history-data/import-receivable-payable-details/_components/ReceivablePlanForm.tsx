"use client";

import { useEffect, useMemo } from "react";
import { Col, Form, Input, InputNumber, Row, Select, Switch } from "antd";
import type { FormInstance } from "antd/es/form";
import type { EmployeeListItem } from "@/stores/employeesStore";
import type { LegalEntityListItem } from "@/stores/legalEntitiesStore";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import type { ReceivableEntryDraft } from "./types";

export type PlanFormValues = {
  legalEntityId?: string;
  contractAmount?: number;
  taxAmount?: number;
  ownerEmployeeId?: string;
  hasVendorPayment?: boolean;
  serviceContent?: string;
  remark?: string;
  remarkNeedsAttention?: boolean;
};

type Props = {
  form: FormInstance<PlanFormValues>;
  entry: ReceivableEntryDraft;
  projectId: string;
  projectName: string;
  legalEntities: LegalEntityListItem[];
  legalEntitiesLoading: boolean;
  employees: EmployeeListItem[];
  preferredValues?: Partial<PlanFormValues>;
};

export default function ReceivablePlanForm({
  form,
  entry,
  projectId,
  projectName,
  legalEntities,
  legalEntitiesLoading,
  employees,
  preferredValues,
}: Props) {
  const legalEntityOptions = useMemo(
    () => legalEntities.map((le) => ({ label: le.name, value: le.id })),
    [legalEntities],
  );
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const projectTaxRate = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingProjectTaxRate,
      ),
    [systemSettings],
  );

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ label: e.name, value: e.id })),
    [employees],
  );
  const contractAmount = Form.useWatch("contractAmount", form);

  useEffect(() => {
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

  // Auto-match 签约主体: entry.contractCompany includes legalEntity.name or vice versa
  const matchedLegalEntityId = useMemo(() => {
    const company = entry.contractCompany.trim();
    if (!company || legalEntities.length === 0) return undefined;
    return legalEntities.find(
      (le) => company.includes(le.name) || le.name.includes(company),
    )?.id;
  }, [entry.contractCompany, legalEntities]);

  // Auto-match 跟进人: exact name match
  const matchedEmployeeId = useMemo(() => {
    const ownerName = entry.ownerName.trim();
    if (!ownerName || employees.length === 0) return undefined;
    return employees.find((e) => e.name === ownerName)?.id;
  }, [entry.ownerName, employees]);

  // Fill form values whenever entry or matched options resolve
  useEffect(() => {
    const defaultValues: PlanFormValues = {
      legalEntityId: matchedLegalEntityId,
      contractAmount: entry.contractAmountTaxIncluded ?? undefined,
      serviceContent: entry.serviceContent || undefined,
      ownerEmployeeId: matchedEmployeeId,
      hasVendorPayment: entry.hasVendorPayment ?? false,
      remark: entry.remark || undefined,
      remarkNeedsAttention: entry.remarkNeedsAttention,
    };
    form.setFieldsValue({
      ...defaultValues,
      ...preferredValues,
    });
  }, [form, entry, matchedLegalEntityId, matchedEmployeeId, preferredValues]);

  useEffect(() => {
    if (contractAmount === null || contractAmount === undefined) {
      form.setFieldValue("taxAmount", undefined);
      return;
    }
    const contract = Number(contractAmount);
    if (!Number.isFinite(contract) || contract < 0) {
      form.setFieldValue("taxAmount", undefined);
      return;
    }
    const denominator = 1 + projectTaxRate / 100;
    if (!Number.isFinite(denominator) || denominator <= 0) {
      form.setFieldValue("taxAmount", undefined);
      return;
    }
    const taxAmount = Number(((contract * (projectTaxRate / 100)) / denominator).toFixed(2));
    form.setFieldValue("taxAmount", taxAmount);
  }, [contractAmount, form, projectTaxRate]);

  return (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="项目">
            <Select
              disabled
              options={[
                { label: projectName || "未命名项目", value: projectId },
              ]}
              value={projectId}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="签约主体"
            name="legalEntityId"
            rules={[{ required: true, message: "请选择签约主体" }]}
          >
            <Select
              showSearch
              allowClear
              loading={legalEntitiesLoading}
              placeholder="请选择签约主体"
              options={legalEntityOptions}
              optionFilterProp="label"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="有供应商付款"
            name="hasVendorPayment"
            valuePropName="checked"
            layout="horizontal"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="合同金额（含税）"
            name="contractAmount"
            rules={[{ required: true, message: "请输入合同金额" }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: "100%" }}
              prefix="¥"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="税费金额"
            name="taxAmount"
            rules={[{ required: true, message: "请输入税费金额" }]}
            extra={`税费利用系数自动计算（当前系数：${projectTaxRate}%）`}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: "100%" }}
              prefix="¥"
              disabled
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="服务内容"
            name="serviceContent"
            rules={[{ required: true, message: "请输入服务内容" }]}
          >
            <Input placeholder="请输入服务内容" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="跟进人"
            name="ownerEmployeeId"
            rules={[{ required: true, message: "请选择跟进人" }]}
          >
            <Select
              showSearch
              placeholder="请选择跟进人"
              options={employeeOptions}
              optionFilterProp="label"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="备注" name="remark">
        <Input.TextArea rows={3} placeholder="请输入备注" />
      </Form.Item>

      <Form.Item
        label="备注标红"
        name="remarkNeedsAttention"
        valuePropName="checked"
        layout="horizontal"
      >
        <Switch checkedChildren="是" unCheckedChildren="否" />
      </Form.Item>
    </Form>
  );
}
