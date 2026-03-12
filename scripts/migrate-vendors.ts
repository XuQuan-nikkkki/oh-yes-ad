import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getCheckboxValue,
  getDateValue,
  getEmailValue,
  getMultiSelectValue,
  getPhoneValue,
  getRichTextValue,
  getSelectValue,
  getTitleValue,
} from "./parser";
import { prisma, migrateDatabase } from "./migrate-notion";

const syncVendor = async (vendor: PageObjectResponse) => {
  const { id } = vendor;

  const name = getTitleValue(vendor, "供应商名称", true);
  const fullName = getRichTextValue(vendor, "全称");

  const vendorType = getSelectValue(vendor, "供应商类型");
  const businessType = getSelectValue(vendor, "业务类型");
  const services = getMultiSelectValue(vendor, "服务范围") ?? [];

  const location = getRichTextValue(vendor, "所在地");

  const contactName = getRichTextValue(vendor, "联系人");
  const phone = getPhoneValue(vendor, "联系电话");
  const email = getEmailValue(vendor, "邮箱");
  const wechat = getRichTextValue(vendor, "联系人微信");

  const strengths = getRichTextValue(vendor, "核心特色/擅长领域");
  const notes = getRichTextValue(vendor, "关键备注");
  const portfolioLink = getRichTextValue(vendor, "代表作品(链接)");
  const priceRange = getRichTextValue(vendor, "参考价区间");

  const isBlacklisted = getCheckboxValue(vendor, "黑名单") ?? false;

  const cooperationStatus = getSelectValue(vendor, "合作状态");
  const rating = getSelectValue(vendor, "综合评级");
  const lastCoopDate = getRichTextValue(vendor, "最近合作时间");
  const cooperatedProjects = getRichTextValue(vendor, "往期合作项目");

  await prisma.vendor.upsert({
    where: { notionPageId: id },
    update: {
      name,
      fullName,
      vendorType,
      businessType,
      services,
      location,
      contactName,
      phone,
      email,
      wechat,
      strengths,
      notes,
      portfolioLink,
      priceRange,
      isBlacklisted,
      cooperationStatus,
      rating,
      lastCoopDate,
      cooperatedProjects
    },
    create: {
      notionPageId: id,
      name,
      fullName,
      vendorType,
      businessType,
      services,
      location,
      contactName,
      phone,
      email,
      wechat,
      strengths,
      notes,
      portfolioLink,
      priceRange,
      isBlacklisted,
      cooperationStatus,
      rating,
      lastCoopDate,
    },
  });

  console.log("已同步供应商:", name);
};

export const syncVendors = async () => {
  console.log("开始同步供应商...", process.env.NOTION_VENDOR_DB_ID);
  await migrateDatabase(process.env.NOTION_VENDOR_DB_ID!, syncVendor, "供应商");
  console.log("供应商同步完成");
};
