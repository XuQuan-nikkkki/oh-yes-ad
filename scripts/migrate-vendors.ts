import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getCheckboxValue,
  getEmailValue,
  getMultiSelectValue,
  getPhoneValue,
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
  multi_select?: Array<{
    name: string;
    color?: string | null;
  }> | null;
};

type NotionMultiSelectProperty = {
  type?: string;
  multi_select?: Array<{
    name: string;
    color?: string | null;
  }> | null;
};

const upsertOption = async (
  field: string,
  value?: string | null,
  color?: string | null,
) => {
  if (!value) return null;

  return prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value,
      },
    },
    update: {
      color: normalizeNotionColor(color),
    },
    create: {
      field,
      value,
      color: normalizeNotionColor(color),
    },
  });
};

const syncVendor = async (vendor: PageObjectResponse) => {
  const { id } = vendor;

  const name = getTitleValue(vendor, "供应商名称", true);
  const fullName = getRichTextValue(vendor, "全称");

  const vendorType = getSelectValue(vendor, "供应商类型");
  const services = getMultiSelectValue(vendor, "服务范围") ?? [];

  const businessTypeProperty = vendor.properties["业务类型"] as
    | NotionSelectProperty
    | undefined;
  const businessTypes =
    businessTypeProperty?.type === "multi_select"
      ? (businessTypeProperty.multi_select ?? [])
          .map((item) => item?.name?.trim())
          .filter((item): item is string => Boolean(item))
      : (() => {
          const value = getSelectValue(vendor, "业务类型");
          return value ? [value] : [];
        })();

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

  const vendorTypeProperty = vendor.properties["供应商类型"] as
    | NotionSelectProperty
    | undefined;
  const cooperationStatusProperty = vendor.properties["合作状态"] as
    | NotionSelectProperty
    | undefined;
  const ratingProperty = vendor.properties["综合评级"] as
    | NotionSelectProperty
    | undefined;
  const servicesProperty = vendor.properties["服务范围"] as
    | NotionMultiSelectProperty
    | undefined;

  const serviceColors = new Map<string, string | null>();
  if (servicesProperty?.type === "multi_select" && servicesProperty.multi_select) {
    for (const item of servicesProperty.multi_select) {
      if (item?.name) {
        serviceColors.set(item.name, item.color ?? null);
      }
    }
  }

  const [
    vendorTypeOption,
    cooperationStatusOption,
    ratingOption,
  ] = await Promise.all([
    upsertOption(
      "vendor.vendorType",
      vendorType,
      vendorTypeProperty?.select?.color ?? null,
    ),
    upsertOption(
      "vendor.cooperationStatus",
      cooperationStatus,
      cooperationStatusProperty?.select?.color ?? null,
    ),
    upsertOption("vendor.rating", rating, ratingProperty?.select?.color ?? null),
  ]);

  const serviceOptions = await Promise.all(
    services.map((service) =>
      upsertOption("vendor.services", service, serviceColors.get(service) ?? null),
    ),
  );
  const serviceOptionIds = serviceOptions
    .map((option) => option?.id)
    .filter((id): id is string => Boolean(id));

  const businessTypeOptions = await Promise.all(
    businessTypes.map((businessType) =>
      upsertOption(
        "vendor.businessType",
        businessType,
        businessTypeProperty?.type === "select"
          ? businessTypeProperty.select?.color ?? null
          : (
              businessTypeProperty?.multi_select?.find(
                (item) => item.name === businessType,
              )?.color ?? null
            ),
      ),
    ),
  );
  const businessTypeOptionIds = businessTypeOptions
    .map((option) => option?.id)
    .filter((id): id is string => Boolean(id));

  await prisma.vendor.upsert({
    where: { notionPageId: id },
    update: {
      name,
      fullName,
      vendorTypeOptionId: vendorTypeOption?.id ?? null,
      businessTypeOptionId: businessTypeOptionIds[0] ?? null,
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
      cooperationStatusOptionId: cooperationStatusOption?.id ?? null,
      ratingOptionId: ratingOption?.id ?? null,
      lastCoopDate,
      cooperatedProjects,
      businessTypes: {
        deleteMany: {},
        create: businessTypeOptionIds.map((optionId) => ({
          optionId,
        })),
      },
      services: {
        deleteMany: {},
        create: serviceOptionIds.map((optionId) => ({
          optionId,
        })),
      },
    },
    create: {
      notionPageId: id,
      name,
      fullName,
      vendorTypeOptionId: vendorTypeOption?.id ?? null,
      businessTypeOptionId: businessTypeOptionIds[0] ?? null,
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
      cooperationStatusOptionId: cooperationStatusOption?.id ?? null,
      ratingOptionId: ratingOption?.id ?? null,
      lastCoopDate,
      cooperatedProjects,
      businessTypes: {
        create: businessTypeOptionIds.map((optionId) => ({
          optionId,
        })),
      },
      services: {
        create: serviceOptionIds.map((optionId) => ({
          optionId,
        })),
      },
    },
  });

  console.log("已同步供应商:", name);
};

export const syncVendors = async () => {
  console.log("开始同步供应商...", process.env.NOTION_VENDOR_DB_ID);
  await migrateDatabase(process.env.NOTION_VENDOR_DB_ID!, syncVendor, "供应商");
  console.log("供应商同步完成");
};
