import { prisma } from "@/lib/prisma";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";

export const getNumericSystemSettings = async () => {
  const keys = Object.values(SYSTEM_SETTING_KEYS);
  const records = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [...keys],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  return {
    pricingLaborCostRateWarning: getSystemSettingNumberFromRecords(
      records,
      SYSTEM_SETTING_KEYS.pricingLaborCostRateWarning,
    ),
    pricingProjectCostBaselineRatio: getSystemSettingNumberFromRecords(
      records,
      SYSTEM_SETTING_KEYS.pricingProjectCostBaselineRatio,
    ),
    pricingMiddleOfficeAverageMonthlyCost: getSystemSettingNumberFromRecords(
      records,
      SYSTEM_SETTING_KEYS.pricingMiddleOfficeAverageMonthlyCost,
    ),
    pricingMiddleOfficeBaseDays: getSystemSettingNumberFromRecords(
      records,
      SYSTEM_SETTING_KEYS.pricingMiddleOfficeBaseDays,
    ),
    employeeDefaultWorkstationCost: getSystemSettingNumberFromRecords(
      records,
      SYSTEM_SETTING_KEYS.employeeDefaultWorkstationCost,
    ),
    employeeDefaultUtilityCost: getSystemSettingNumberFromRecords(
      records,
      SYSTEM_SETTING_KEYS.employeeDefaultUtilityCost,
    ),
    employeeMonthlyWorkdayBase: getSystemSettingNumberFromRecords(
      records,
      SYSTEM_SETTING_KEYS.employeeMonthlyWorkdayBase,
    ),
  };
};
