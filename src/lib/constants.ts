/**
 * 常用颜色常量
 */

/** 默认灰色，用于未设定颜色的选项、标签等 */
export const DEFAULT_COLOR = "#8c8c8c";

/** 日期格式（不含时间） */
export const DATE_FORMAT = "YYYY-MM-DD";

/** 日期时间格式（含分钟） */
export const DATETIME_FORMAT = "YYYY-MM-DD HH:mm";

export const PROJECT_TASK_STATUS_FIELD = "projectTask.status";

export const DEFAULT_PROJECT_TASK_STATUS = "待推进";

export const PROJECT_TASK_STATUS_OPTIONS = [
  { value: "待推进", order: 1, color: "#d9d9d9" },
  { value: "进行中", order: 2, color: "#1677ff" },
  { value: "已完成", order: 3, color: "#52c41a" },
  { value: "暂停", order: 4, color: "#faad14" },
] as const;
