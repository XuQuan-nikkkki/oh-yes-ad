import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import { Client } from "@prisma/client";
import {
  getEmailValue,
  getPhoneValue,
  getRelationValue,
  getRichTextValue,
  getSelectValue,
  getTitleValue,
} from "../lib/notion/parser";
import { prisma, migrateDatabase } from "./migrate-notion";

const syncClient = async (client: PageObjectResponse) => {
  const { id } = client;
  const name = getTitleValue(client, "客户名称", true);
  const industry = getSelectValue(client, "行业", true);

  const data: Omit<Client, "id" | "createdAt" | "updatedAt"> = {
    notionPageId: id,
    name,
    industry,
    remark: "",
  };
  await prisma.client.create({
    data,
  });

  console.log("已同步客户:", name);
};

export const syncClients = async () => {
  console.log("开始同步客户...", process.env.NOTION_CLIENT_DB_ID);
  migrateDatabase(process.env.NOTION_CLIENT_DB_ID!, syncClient, "客户");
  console.log("客户同步完成");
};

const syncClientContact = async (contact: PageObjectResponse) => {
  const { id } = contact;
  const name = getTitleValue(contact, "姓名", true);
  const title = getRichTextValue(contact, "职务");
  const scope = getRichTextValue(contact, "负责范围");
  const preference = getRichTextValue(contact, "偏好");
  const address = getRichTextValue(contact, "地址");
  const wechat = getRichTextValue(contact, "微信号");
  const phone = getPhoneValue(contact, "手机号");
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

  const data = {
    notionPageId: id,
    name,
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
  await migrateDatabase(
    process.env.NOTION_CLIENT_CONTACT_DB_ID!,
    syncClientContact,
    "客户人员",
  );
};
