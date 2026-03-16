import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireCrmWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const OPTION_FIELD = {
  vendorType: "vendor.vendorType",
  businessType: "vendor.businessType",
  services: "vendor.services",
  cooperationStatus: "vendor.cooperationStatus",
  rating: "vendor.rating",
} as const;

type VendorOption = { id: string; value: string; color?: string | null };
type VendorServiceJoin = { optionId: string; option: VendorOption };
type VendorBusinessTypeJoin = { optionId: string; option: VendorOption };
type VendorWithOptions = {
  vendorTypeOption?: VendorOption | null;
  businessTypeOption?: VendorOption | null;
  businessTypes: VendorBusinessTypeJoin[];
  cooperationStatusOption?: VendorOption | null;
  ratingOption?: VendorOption | null;
  services: VendorServiceJoin[];
} & Record<string, unknown>;

const toVendorResponse = (vendor: VendorWithOptions) => ({
  ...vendor,
  vendorTypeOption: vendor.vendorTypeOption ?? null,
  businessTypeOptions: vendor.businessTypes.map((item) => item.option),
  businessTypeOptionIds: vendor.businessTypes.map((item) => item.optionId),
  businessTypeOption:
    vendor.businessTypes[0]?.option ?? vendor.businessTypeOption ?? null,
  businessTypeOptionId:
    vendor.businessTypes[0]?.optionId ??
    ((vendor as { businessTypeOptionId?: string | null }).businessTypeOptionId ??
      null),
  cooperationStatusOption: vendor.cooperationStatusOption ?? null,
  ratingOption: vendor.ratingOption ?? null,
  serviceOptions: vendor.services.map((item) => item.option),
  serviceOptionIds: vendor.services.map((item) => item.optionId),
});

const vendorIncludeWithBusinessTypes = {
  vendorTypeOption: true,
  businessTypeOption: true,
  businessTypes: {
    include: {
      option: true,
    },
  },
  cooperationStatusOption: true,
  ratingOption: true,
  services: {
    include: {
      option: true,
    },
  },
} as const;

const vendorIncludeLegacy = {
  vendorTypeOption: true,
  businessTypeOption: true,
  cooperationStatusOption: true,
  ratingOption: true,
  services: {
    include: {
      option: true,
    },
  },
} as const;

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next ? next : null;
};

const ensureOptionId = async (
  field: string,
  optionId?: string | null,
  optionValue?: string | null,
) => {
  if (optionId) return optionId;
  const value = normalizeText(optionValue);
  if (!value) return null;

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value,
      },
    },
    update: {},
    create: {
      field,
      value,
      color: "#d9d9d9",
    },
  });

  return option.id;
};

const resolveServiceOptionIds = async (body: Record<string, unknown>) => {
  const idsFromBody = Array.isArray(body.serviceOptionIds)
    ? body.serviceOptionIds
        .map((id) => normalizeText(id))
        .filter((id): id is string => Boolean(id))
    : [];

  const valuesFromBody = Array.isArray(body.services)
    ? body.services
        .map((value) => normalizeText(value))
        .filter((value): value is string => Boolean(value))
    : [];

  if (idsFromBody.length > 0) {
    return Array.from(new Set(idsFromBody));
  }

  const optionIds = await Promise.all(
    valuesFromBody.map((value) =>
      ensureOptionId(OPTION_FIELD.services, null, value),
    ),
  );

  return Array.from(new Set(optionIds.filter((id): id is string => Boolean(id))));
};

const resolveBusinessTypeOptionIds = async (body: Record<string, unknown>) => {
  const idsFromBody = Array.isArray(body.businessTypeOptionIds)
    ? body.businessTypeOptionIds
        .map((id) => normalizeText(id))
        .filter((id): id is string => Boolean(id))
    : [];

  const valuesFromBody = Array.isArray(body.businessTypes)
    ? body.businessTypes
        .map((value) => normalizeText(value))
        .filter((value): value is string => Boolean(value))
    : [];

  if (idsFromBody.length > 0) {
    return Array.from(new Set(idsFromBody));
  }

  const singleId = normalizeText(body.businessTypeOptionId);
  if (singleId) return [singleId];

  const singleValue = normalizeText(body.businessType);
  const values = singleValue ? [...valuesFromBody, singleValue] : valuesFromBody;
  if (values.length === 0) return [];

  const optionIds = await Promise.all(
    values.map((value) =>
      ensureOptionId(OPTION_FIELD.businessType, null, value),
    ),
  );

  return Array.from(new Set(optionIds.filter((id): id is string => Boolean(id))));
};

const buildVendorWriteData = async (body: Record<string, unknown>) => {
  const [
    vendorTypeOptionId,
    businessTypeOptionIds,
    cooperationStatusOptionId,
    ratingOptionId,
    serviceOptionIds,
  ] = await Promise.all([
    ensureOptionId(
      OPTION_FIELD.vendorType,
      normalizeText(body.vendorTypeOptionId),
      normalizeText(body.vendorType),
    ),
    resolveBusinessTypeOptionIds(body),
    ensureOptionId(
      OPTION_FIELD.cooperationStatus,
      normalizeText(body.cooperationStatusOptionId),
      normalizeText(body.cooperationStatus),
    ),
    ensureOptionId(
      OPTION_FIELD.rating,
      normalizeText(body.ratingOptionId),
      normalizeText(body.rating),
    ),
    resolveServiceOptionIds(body),
  ]);

  return {
    name: String(body.name ?? "").trim(),
    fullName: normalizeText(body.fullName),
    vendorTypeOptionId,
    businessTypeOptionIds,
    location: normalizeText(body.location),
    contactName: normalizeText(body.contactName),
    phone: normalizeText(body.phone),
    email: normalizeText(body.email),
    wechat: normalizeText(body.wechat),
    strengths: normalizeText(body.strengths),
    notes: normalizeText(body.notes),
    companyIntro: normalizeText(body.companyIntro),
    portfolioLink: normalizeText(body.portfolioLink),
    priceRange: normalizeText(body.priceRange),
    isBlacklisted: Boolean(body.isBlacklisted),
    cooperationStatusOptionId,
    ratingOptionId,
    lastCoopDate: normalizeText(body.lastCoopDate),
    cooperatedProjects: normalizeText(body.cooperatedProjects),
    serviceOptionIds,
  };
};

// ==================== GET ====================
export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      include: vendorIncludeWithBusinessTypes,
      orderBy: {
        createdAt: "desc",
      },
    });
    return Response.json(vendors.map(toVendorResponse));
  } catch (error) {
    console.warn(
      "[vendors] include businessTypes failed, fallback to legacy include:",
      error,
    );
    const vendors = await prisma.vendor.findMany({
      include: vendorIncludeLegacy,
      orderBy: {
        createdAt: "desc",
      },
    });
    return Response.json(
      vendors.map((vendor) =>
        toVendorResponse({
          ...vendor,
          businessTypes: [],
        } as VendorWithOptions),
      ),
    );
  }
}

// ==================== POST ====================
export async function POST(req: Request) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = (await sanitizeRequestBody(req)) as Record<string, unknown>;
  const data = await buildVendorWriteData(body);

  if (!data.name) {
    return new Response("Missing name", { status: 400 });
  }

  const vendor = await prisma.vendor.create({
    data: {
      name: data.name,
      fullName: data.fullName,
      vendorTypeOptionId: data.vendorTypeOptionId,
      businessTypeOptionId: data.businessTypeOptionIds[0] ?? null,
      location: data.location,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      wechat: data.wechat,
      strengths: data.strengths,
      notes: data.notes,
      companyIntro: data.companyIntro,
      portfolioLink: data.portfolioLink,
      priceRange: data.priceRange,
      isBlacklisted: data.isBlacklisted,
      cooperationStatusOptionId: data.cooperationStatusOptionId,
      ratingOptionId: data.ratingOptionId,
      lastCoopDate: data.lastCoopDate,
      cooperatedProjects: data.cooperatedProjects,
      businessTypes: {
        create: data.businessTypeOptionIds.map((optionId) => ({
          optionId,
        })),
      },
      services: {
        create: data.serviceOptionIds.map((optionId) => ({
          optionId,
        })),
      },
    },
    include: {
      vendorTypeOption: true,
      businessTypeOption: true,
      businessTypes: {
        include: {
          option: true,
        },
      },
      cooperationStatusOption: true,
      ratingOption: true,
      services: {
        include: {
          option: true,
        },
      },
    },
  });

  return Response.json(toVendorResponse(vendor));
}

// ==================== PUT ====================
export async function PUT(req: Request) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = (await sanitizeRequestBody(req)) as Record<string, unknown>;
  const data = await buildVendorWriteData(body);
  const vendorId = normalizeText(body.id);

  if (!vendorId) {
    return new Response("Missing id", { status: 400 });
  }
  if (!data.name) {
    return new Response("Missing name", { status: 400 });
  }

  const vendor = await prisma.vendor.update({
    where: {
      id: vendorId,
    },
    data: {
      name: data.name,
      fullName: data.fullName,
      vendorTypeOptionId: data.vendorTypeOptionId,
      businessTypeOptionId: data.businessTypeOptionIds[0] ?? null,
      location: data.location,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      wechat: data.wechat,
      strengths: data.strengths,
      notes: data.notes,
      companyIntro: data.companyIntro,
      portfolioLink: data.portfolioLink,
      priceRange: data.priceRange,
      isBlacklisted: data.isBlacklisted,
      cooperationStatusOptionId: data.cooperationStatusOptionId,
      ratingOptionId: data.ratingOptionId,
      lastCoopDate: data.lastCoopDate,
      cooperatedProjects: data.cooperatedProjects,
      businessTypes: {
        deleteMany: {},
        create: data.businessTypeOptionIds.map((optionId) => ({
          optionId,
        })),
      },
      services: {
        deleteMany: {},
        create: data.serviceOptionIds.map((optionId) => ({
          optionId,
        })),
      },
    },
    include: {
      vendorTypeOption: true,
      businessTypeOption: true,
      businessTypes: {
        include: {
          option: true,
        },
      },
      cooperationStatusOption: true,
      ratingOption: true,
      services: {
        include: {
          option: true,
        },
      },
    },
  });

  return Response.json(toVendorResponse(vendor));
}

// ==================== DELETE ====================
export async function DELETE(req: Request) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  await prisma.vendor.delete({
    where: {
      id: body.id,
    },
  });

  return Response.json({ success: true });
}
