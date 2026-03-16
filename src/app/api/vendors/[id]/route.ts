import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
