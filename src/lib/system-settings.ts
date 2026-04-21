import type { SystemSettingRecord } from "@/stores/systemSettingsStore";

export const SYSTEM_SETTING_KEYS = {
  pricingLaborCostRateWarning: "pricing.laborCostRateWarning",
  pricingProjectCostBaselineRatio: "pricing.projectCostBaselineRatio",
  pricingMiddleOfficeAverageMonthlyCost:
    "pricing.middleOfficeAverageMonthlyCost",
  pricingMiddleOfficeBaseDays: "pricing.middleOfficeBaseDays",
  pricingProjectFundAmount: "pricing.projectFundAmount",
  employeeDefaultWorkstationCost: "employee.defaultWorkstationCost",
  employeeDefaultUtilityCost: "employee.defaultUtilityCost",
  employeeMonthlyWorkdayBase: "employee.monthlyWorkdayBase",
} as const;

export const DEFAULT_SYSTEM_SETTING_VALUES = {
  [SYSTEM_SETTING_KEYS.pricingLaborCostRateWarning]: 35,
  [SYSTEM_SETTING_KEYS.pricingProjectCostBaselineRatio]: 53,
  [SYSTEM_SETTING_KEYS.pricingMiddleOfficeAverageMonthlyCost]: 16367.76,
  [SYSTEM_SETTING_KEYS.pricingMiddleOfficeBaseDays]: 30,
  [SYSTEM_SETTING_KEYS.pricingProjectFundAmount]: 10000,
  [SYSTEM_SETTING_KEYS.employeeDefaultWorkstationCost]: 116.91,
  [SYSTEM_SETTING_KEYS.employeeDefaultUtilityCost]: 24.94,
  [SYSTEM_SETTING_KEYS.employeeMonthlyWorkdayBase]: 21.75,
} as const;

type NumericSettingKey =
  (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS];

const parseNumberValue = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const getSystemSettingNumberFromRecords = (
  records: Pick<SystemSettingRecord, "key" | "value">[],
  key: NumericSettingKey,
) => {
  const fallback = DEFAULT_SYSTEM_SETTING_VALUES[key];
  const matched = records.find((item) => item.key === key);
  return parseNumberValue(matched?.value, fallback);
};
