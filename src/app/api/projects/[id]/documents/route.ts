import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { DEFAULT_COLOR } from "@/lib/constants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

const upsertSelectOption = async (field: string, value: unknown) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value: normalized,
      },
    },
    create: {
      field,
      value: normalized,
      color: DEFAULT_COLOR,
    },
    update: {},
  });

  return option.id;
};

const extractTypeOptionValue = (body: Record<string, unknown>) => {
  const typeOption = body.typeOption;
  if (typeof typeOption === "string") return typeOption;
  if (typeOption && typeof typeOption === "object" && "value" in typeOption) {
    const value = (typeOption as { value?: unknown }).value;
    return typeof value === "string" ? value : "";
  }
  const legacyType = body.type;
  return typeof legacyType === "string" ? legacyType : "";
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid document name", { status: 400 });
  }

  const typeOptionId = await upsertSelectOption(
    "projectDocument.type",
    extractTypeOptionValue(body),
  );

  const doc = await prisma.projectDocument.create({
    data: {
      projectId,
      name: body.name,
      typeOptionId,
      date: body.date ? new Date(body.date) : null,
      isFinal: Boolean(body.isFinal),
      internalLink: body.internalLink ?? null,
    },
    include: {
      typeOption: { select: { id: true, value: true, color: true } },
    },
  });

  return Response.json(doc);
}
