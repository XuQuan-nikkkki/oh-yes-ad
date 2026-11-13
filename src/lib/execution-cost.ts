import { DEFAULT_COLOR } from "@/lib/constants";

export const EXECUTION_COST_FIELD = "projectCostEstimation.executionCostType";

// 旧项目中的同义费用类型仍为默认灰色；展示时沿用现有打车和物料类别的颜色。
const EXECUTION_COST_DISPLAY_COLORS: Record<string, string> = {
  交通费: "#2a8322",
  物料制作: "#8f158f",
};

export const resolveExecutionCostTagColor = (value?: string | null, color?: string | null) => {
  if (color && color.toLowerCase() !== DEFAULT_COLOR) return color;
  return EXECUTION_COST_DISPLAY_COLORS[value?.trim() ?? ""] ?? color ?? DEFAULT_COLOR;
};

export const EXECUTION_COST_TYPE_OPTIONS = [
  "外出打车",
  "加班打车",
  "物料费",
  "快递费",
  "招待费",
  "采风费",
  "其他",
] as const;
