import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getEmailValue,
  getPhoneValue,
  getRelationValue,
  getRichTextValue,
  getSelectValue,
  getTitleValue,
} from "./parser";
import { prisma, migrateDatabase } from "./migrate-notion";

const notionColorToHex: Record<string, string> = {
  default: "#d9d9d9",
  gray: "#8c8c8c",
  brown: "#8b5e3c",
  orange: "#fa8c16",
  yellow: "#faad14",
  green: "#52c41a",
  blue: "#1677ff",
  purple: "#722ed1",
  pink: "#eb2f96",
  red: "#ff4d4f",
};

const clientContactOrderCounter = new Map<string, number>();

const normalizeNotionColor = (color?: string | null) => {
  if (!color) return notionColorToHex.default;
  if (color.startsWith("#")) return color;
  return notionColorToHex[color] ?? notionColorToHex.default;
};

type NotionSelectProperty = {
  type?: string;
  select?: {
    color?: string | null;
  } | null;
};

const syncClient = async (client: PageObjectResponse) => {
  const { id } = client;
  const name = getTitleValue(client, "客户名称", true);
  const industry = getSelectValue(client, "行业", true);
  const industryProperty = client.properties["行业"] as
    | NotionSelectProperty
    | undefined;
  const industryColor =
    industryProperty?.type === "select"
      ? normalizeNotionColor(industryProperty.select?.color)
      : notionColorToHex.default;

  const industryOption = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field: "client.industry",
        value: industry,
      },
    },
    update: {
      color: industryColor,
    },
    create: {
      field: "client.industry",
      value: industry,
      color: industryColor,
    },
  });

  await prisma.client.upsert({
    where: {
      notionPageId: id,
    },
    create: {
      notionPageId: id,
      name,
      industryOptionId: industryOption.id,
    },
    update: {
      name,
      industryOptionId: industryOption.id,
    },
  });

  console.log("已同步客户:", name);
};

export const syncClients = async () => {
  console.log("开始同步客户...", process.env.NOTION_CLIENT_DB_ID);
  await migrateDatabase(process.env.NOTION_CLIENT_DB_ID!, syncClient, "客户");
  console.log("客户同步完成");
};

const syncClientContact = async (contact: PageObjectResponse) => {
  const { id } = contact;
  const name = getTitleValue(contact, "姓名", true);
  const title = getRichTextValue(contact, "职位");
  const scope = getRichTextValue(contact, "负责范围");
  const preference = getRichTextValue(contact, "偏好");
  const address = getRichTextValue(contact, "地址");
  const wechat = getRichTextValue(contact, "微信号");
  const phone = getPhoneValue(contact, "电话");
  const email = getEmailValue(contact, "邮箱");
  const clientRelation = getRelationValue(contact, "所属客户", true);

  const clientPageId = clientRelation[0].id;
  const client = await prisma.client.findUnique({
    where: {
      notionPageId: clientPageId,
    },
  });

  if (!client) {
    throw new Error(`未找到对应的客户，Page ID: ${clientPageId}`);
  }

  const nextOrderIndex = (clientContactOrderCounter.get(client.id) ?? 0) + 1;
  clientContactOrderCounter.set(client.id, nextOrderIndex);

  const data = {
    notionPageId: id,
    name,
    order: nextOrderIndex * 1000,
    title,
    scope,
    preference,
    address,
    wechat,
    phone,
    email,
    clientId: client.id,
  };

  await prisma.clientContact.create({
    data,
  });

  console.log("已同步客户人员:", name);
};

export const syncClientContacts = async () => {
  console.log("开始同步客户人员...", process.env.NOTION_CLIENT_CONTACT_DB_ID);
  clientContactOrderCounter.clear();
  await migrateDatabase(
    process.env.NOTION_CLIENT_CONTACT_DB_ID!,
    syncClientContact,
    "客户人员",
  );
};
