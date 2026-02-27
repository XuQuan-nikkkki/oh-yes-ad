import { PageObjectResponse } from "@notionhq/client";

type PropertyType =
  | "title"
  | "select"
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
