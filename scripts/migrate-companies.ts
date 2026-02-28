import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import { getRichTextValue, getTitleValue } from "../lib/notion/parser";
import { prisma, migrateDatabase } from "./migrate-notion";
import { LegalEntity } from "@prisma/client";

const syncLegalEntity = async (entity: PageObjectResponse) => {
  const { id } = entity;
  const name = getTitleValue(entity, "公司名称", true);
  const fullName = getRichTextValue(entity, "公司全称");
  const taxNumber = getRichTextValue(entity, "税号");
  const address = getRichTextValue(entity, "地址");

  const data: Omit<LegalEntity, "id" | "createdAt" | "updatedAt" | "remark"> = {
    notionPageId: id,
    name,
    fullName,
    taxNumber,
    address,
    isActive: true,
  };
  await prisma.legalEntity.create({
    data,
  });

  console.log("已同步客户:", name);
};

export const syncLegalEntities = async () => {
  console.log("开始同步公司主体...", process.env.NOTION_LEGAL_ENTITY_DB_ID);
  migrateDatabase(
    process.env.NOTION_LEGAL_ENTITY_DB_ID!,
    syncLegalEntity,
    "公司主体",
  );
  console.log("公司主体同步完成");
};
