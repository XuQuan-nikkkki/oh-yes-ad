/** 类型只提供初始值，工作项保存的显式选择优先。 */
export const getDefaultSubmissionEnabled = (type: string) =>
  type === "DESIGN" || type === "COPY";
