import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

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

const toProjectTypeCode = (value?: string | null) => {
  if (!value) return null;
  if (value === "客户项目") return "CLIENT";
  if (value === "内部项目") return "INTERNAL";
  return value;
};

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
  projects: Array.isArray(vendor.projects)
    ? vendor.projects.map((project) => ({
        ...project,
        type: toProjectTypeCode(
          (
            project as { typeOption?: { value?: string | null } | null }
          ).typeOption?.value,
        ),
      }))
    : [],
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
  projects: {
    select: {
      id: true,
      name: true,
      typeOption: {
        select: {
          value: true,
        },
      },
    },
  },
  milestones: {
    select: {
      id: true,
      name: true,
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
  projects: {
    select: {
      id: true,
      name: true,
      typeOption: {
        select: {
          value: true,
        },
      },
    },
  },
  milestones: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const OPTION_FIELD = {
  vendorType: "vendor.vendorType",
  businessType: "vendor.businessType",
  services: "vendor.services",
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
      color: DEFAULT_COLOR,
    },
  });

  return option.id;
};

const resolveOptionPayload = (
  value: unknown,
): { id?: string | null; value?: string | null } => {
  if (value && typeof value === "object") {
    return {
      id:
        "id" in value && typeof value.id === "string"
          ? normalizeText(value.id)
          : null,
      value:
        "value" in value && typeof value.value === "string"
          ? normalizeText(value.value)
          : null,
    };
  }

  return {
    value: normalizeText(value),
  };
};

const resolveOptionIdsFromBody = async ({
  body,
  idsKey,
  singleKey,
  field,
}: {
  body: Record<string, unknown>;
  idsKey: string;
  singleKey: string;
  field: string;
}) => {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  if (has(idsKey)) {
    if (!Array.isArray(body[idsKey])) return [];
    return Array.from(
      new Set(
        body[idsKey]
          .map((item) => normalizeText(item))
          .filter((item): item is string => Boolean(item)),
      ),
    );
  }

  if (!has(singleKey)) return undefined;

  const { id, value } = resolveOptionPayload(body[singleKey]);
  const resolvedId = await ensureOptionId(field, id, value);
  return resolvedId ? [resolvedId] : [];
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    let vendor = null as VendorWithOptions | null;
    try {
      vendor = (await prisma.vendor.findUnique({
        where: { id },
        include: vendorIncludeWithBusinessTypes,
      })) as VendorWithOptions | null;
    } catch (error) {
      console.warn(
        "[vendors/:id] include businessTypes failed, fallback to legacy include:",
        error,
      );
      const legacyVendor = await prisma.vendor.findUnique({
        where: { id },
        include: vendorIncludeLegacy,
      });
      vendor = legacyVendor
        ? ({
            ...legacyVendor,
            businessTypes: [],
          } as VendorWithOptions)
        : null;
    }

    if (!vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404,
      });
    }

    return Response.json(toVendorResponse(vendor));
  } catch (error) {
    console.error("GET /api/vendors/[id] error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = (await sanitizeRequestBody(req)) as Record<string, unknown>;

    const found = await prisma.vendor.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404,
      });
    }

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const vendorTypeOptionId = has("vendorType")
      ? await ensureOptionId(
          OPTION_FIELD.vendorType,
          resolveOptionPayload(body.vendorType).id,
          resolveOptionPayload(body.vendorType).value,
        )
      : undefined;

    const [resolvedBusinessTypeOptionIds, resolvedServiceOptionIds] =
      await Promise.all([
        resolveOptionIdsFromBody({
          body,
          idsKey: "businessTypeOptionIds",
          singleKey: "businessType",
          field: OPTION_FIELD.businessType,
        }),
        resolveOptionIdsFromBody({
          body,
          idsKey: "serviceOptionIds",
          singleKey: "service",
          field: OPTION_FIELD.services,
        }),
      ]);

    let vendor = null as VendorWithOptions | null;
    try {
      vendor = (await prisma.vendor.update({
        where: { id },
        data: {
          ...(has("vendorType")
            ? { vendorTypeOptionId: vendorTypeOptionId ?? null }
            : {}),
          ...(resolvedBusinessTypeOptionIds
            ? {
                businessTypeOptionId: resolvedBusinessTypeOptionIds[0] ?? null,
                businessTypes: {
                  deleteMany: {},
                  create: resolvedBusinessTypeOptionIds.map((optionId) => ({
                    optionId,
                  })),
                },
              }
            : {}),
          ...(resolvedServiceOptionIds
            ? {
                services: {
                  deleteMany: {},
                  create: resolvedServiceOptionIds.map((optionId) => ({
                    optionId,
                  })),
                },
              }
            : {}),
        },
        include: vendorIncludeWithBusinessTypes,
      })) as VendorWithOptions | null;
    } catch (error) {
      console.warn(
        "[vendors/:id] patch include businessTypes failed, fallback to legacy include:",
        error,
      );
      const legacyVendor = await prisma.vendor.update({
        where: { id },
        data: {
          ...(has("vendorType")
            ? { vendorTypeOptionId: vendorTypeOptionId ?? null }
            : {}),
          ...(resolvedBusinessTypeOptionIds
            ? {
                businessTypeOptionId: resolvedBusinessTypeOptionIds[0] ?? null,
                businessTypes: {
                  deleteMany: {},
                  create: resolvedBusinessTypeOptionIds.map((optionId) => ({
                    optionId,
                  })),
                },
              }
            : {}),
          ...(resolvedServiceOptionIds
            ? {
                services: {
                  deleteMany: {},
                  create: resolvedServiceOptionIds.map((optionId) => ({
                    optionId,
                  })),
                },
              }
            : {}),
        },
        include: vendorIncludeLegacy,
      });
      vendor = {
        ...legacyVendor,
        businessTypes: [],
      } as VendorWithOptions;
    }

    if (!vendor) {
      return Response.json(
        { error: "Vendor update failed" },
        { status: 500 },
      );
    }

    return Response.json(toVendorResponse(vendor));
  } catch (error) {
    console.error("PATCH /api/vendors/[id] error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
