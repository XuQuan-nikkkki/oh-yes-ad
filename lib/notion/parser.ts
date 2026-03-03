import { PageObjectResponse } from "@notionhq/client";

type PropertyType =
  | "title"
  | "select"
  | "status"
  | "rich_text"
  | "relation"
  | "multi_select"
  | "number"
  | "checkbox"
  | "url"
  | "email"
  | "phone_number"
  | "date";

const getTypedProperty = (
  response: PageObjectResponse,
  key: string,
  expectedType: PropertyType,
  required = false,
) => {
  const property = response.properties[key];

  if (!property) {
    if (required) {
      throw new Error(`字段 '${key}' 未获取到`);
    }
    return null;
  }

  if (property.type !== expectedType) {
    throw new Error(
      `字段 '${key}' 类型错误，应为 ${expectedType}，实际为 ${property.type}`,
    );
  }

  let value = null;
  switch (expectedType) {
    case "title":
      // @ts-expect-error title 是个数组
      value = property.title[0]?.text.content ?? null;
      break;
    case "select":
      // @ts-expect-error select是个对象
      value = property.select?.name ?? null;
      break;
    case "rich_text":
      // @ts-expect-error rich_text 是个数组
      value = property.rich_text[0]?.text?.content ?? null;
      break;
    case "phone_number":
      // @ts-expect-error property 是 phone_number 类型
      value = property.phone_number ?? null;
      break;
    case "email":
      // @ts-expect-error property 是 email 类型
      value = property.email ?? null;
      break;
    case "relation":
      // @ts-expect-error property 是数组类型
      value = property.relation;
      break;
    case "date":
      // @ts-expect-error property 是 date 类型
      value = property.date?.start ?? null;
      break;
    case "status":
      // @ts-expect-error property 是 status 类型
      value = property.status?.name ?? null;
      break;
    case "checkbox":
      // @ts-expect-error property 是 checkbox 类型
      value = property.checkbox;
      break;
    case "multi_select":
      // @ts-expect-error property 是 multi_select 类型
      value = property.multi_select?.map((option) => option.name) ?? [];
      break;
    case "number":
      // @ts-expect-error property 是 number 类型
      value = property.number ?? null;
      break;
    default:
      throw new Error(`不支持的属性类型: ${expectedType}`);
  }

  if (required && !value) {
    throw new Error(`字段 '${key}' 为空`);
  }

  return value;
};

export const getTitleValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "title", required);
};

export const getSelectValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "select", required);
};

export const getRichTextValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "rich_text", required);
};

export const getPhoneValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "phone_number", required);
};

export const getEmailValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "email", required);
};

export const getRelationValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
): { id: string }[] => {
  return getTypedProperty(response, key, "relation", required) as {
    id: string;
  }[];
};

export const getDateValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
): string | null => {
  return getTypedProperty(response, key, "date", required) as string | null;
};

/** 获取日期范围：支持单个 Date 属性带 start/end，或分别传入开始/结束字段名 */
export const getDateRangeValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
): { start: string | null; end: string | null } => {
  const property = response.properties[key];
  if (!property || property.type !== "date") {
    if (required) throw new Error(`字段 '${key}' 未获取到或类型错误`);
    return { start: null, end: null };
  }
  // @ts-expect-error date 类型有 start/end
  const start = property.date?.start ?? null;
  // @ts-expect-error date 类型有 end，无 end 时用 start（单日）
  const end = property.date?.end ?? property.date?.start ?? null;
  if (required && !start) throw new Error(`字段 '${key}' 为空`);
  return { start, end };
};

export const getStatusValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "status", required);
};

export const getCheckboxValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "checkbox", required);
};

export const getMultiSelectValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "multi_select", required) as string[];
};

export const getNumberValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  return getTypedProperty(response, key, "number", required) as number;
};

export const getStartDateValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  const range = getDateRangeValue(response, key, required);
  if (range.start) return range.start;
  // 如果没有单一日期范围属性，再尝试分别获取开始/结束日期
  return getDateValue(response, key, required);
}

export const getEndDateValue = (
  response: PageObjectResponse,
  key: string,
  required = false,
) => {
  const range = getDateRangeValue(response, key, required);
  if (range.end) return range.end;
  // 如果没有单一日期范围属性，再尝试分别获取开始/结束日期
  return getDateValue(response, key, required);
}