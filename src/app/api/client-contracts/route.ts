import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const includeDetail = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  legalEntity: {
    select: {
      id: true,
      name: true,
      fullName: true,
    },
  },
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const serializeContract = (
  row: {
    contractAmount: unknown;
    taxAmount: unknown;
  } & Record<string, unknown>,
) => ({
  ...row,
  contractAmount:
    row.contractAmount === null || row.contractAmount === undefined
      ? null
      : Number(row.contractAmount),
  taxAmount:
    row.taxAmount === null || row.taxAmount === undefined
      ? null
      : Number(row.taxAmount),
});

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";

  const rows = await prisma.clientContract.findMany({
    where: projectId ? { projectId } : undefined,
    include: includeDetail,
    orderBy: [{ updatedAt: "desc" }],
  });

  return Response.json(
    rows.map((row) => serializeContract(row as Record<string, unknown> as never)),
  );
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const projectId = String(body.projectId ?? "").trim();
  const legalEntityId = String(body.legalEntityId ?? "").trim();
  if (!projectId || !legalEntityId) {
    return new Response("projectId and legalEntityId are required", { status: 400 });
  }

  const [project, legalEntity, existing] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        typeOption: {
          select: {
            value: true,
          },
        },
      },
    }),
    prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      select: { id: true },
    }),
    prisma.clientContract.findUnique({
      where: { projectId },
      select: { id: true },
    }),
  ]);

  if (!project) return new Response("Project not found", { status: 404 });
  if (!legalEntity) return new Response("Legal entity not found", { status: 404 });
  if (existing) {
    return new Response("Client contract already exists for this project", {
      status: 409,
    });
  }

  const contractAmount = toNullableNumber(body.contractAmount);
  const taxAmount = toNullableNumber(body.taxAmount);
  const isClientProject = project.typeOption?.value === "客户项目";
  if (isClientProject && (contractAmount === null || taxAmount === null)) {
    return new Response("contractAmount and taxAmount are required for client project", {
      status: 400,
    });
  }

  const created = await prisma.clientContract.create({
    data: {
      projectId,
      legalEntityId,
      contractAmount,
      taxAmount,
    },
    include: includeDetail,
  });

  return Response.json(
    serializeContract(created as Record<string, unknown> as never),
  );
}
