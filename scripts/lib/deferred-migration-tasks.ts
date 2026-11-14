// 用户决定暂不迁移的六条无负责人旧任务；其他异常任务必须中止迁移。
export const DEFERRED_TASK_IDS = [
  "cffff9fc-f04c-4bcc-9410-f8348108d4e7",
  "974a4b41-470b-4b03-9e48-a2149c3c67fd",
  "980d7cf5-e2fb-472f-8985-27903fbb374a",
  "f685e4b9-3021-4fee-b1a3-cf442e0d5e27",
  "46480d25-0195-4cee-9eaa-30768c70d3e2",
  "089eba55-38bc-43c9-a53b-12f7aac87bfd",
] as const;
