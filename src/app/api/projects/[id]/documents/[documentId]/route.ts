import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_COLOR } from "@/lib/constants";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

const parseSelectOptionInput = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return {
      value: normalized || null,
      color: null as string | null,
    };
  }
  if (value && typeof value === "object") {
    const candidateValue =
      "value" in value && typeof value.value === "string"
        ? value.value.trim()
        : "";
    const candidateColor =
      "color" in value && typeof value.color === "string"
        ? value.color.trim()
        : "";
    return {
      value: candidateValue || null,
      color: candidateColor || null,
    };
  }
  return {
    value: null as string | null,
    color: null as string | null,
  };
};

const upsertSelectOption = async (field: string, value: unknown) => {
  const parsed = parseSelectOptionInput(value);
  const normalized = parsed.value ?? "";
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
      color: parsed.color ?? DEFAULT_COLOR,
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
  return legacyType;
};

const findDocumentInProject = async (projectId: string, documentId: string) => {
  return prisma.projectDocument.findFirst({
    where: { id: documentId, projectId },
    select: { id: true },
  });
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permissionResponse = await requireProjectWritePermission();
  if (permissionResponse) return permissionResponse;

  const { id: projectId, documentId } = await context.params;
  if (!projectId || !documentId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await findDocumentInProject(projectId, documentId);
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  const body = await sanitizeRequestBody(req);
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid document name", { status: 400 });
  }

  const typeOptionId = await upsertSelectOption(
    "projectDocument.type",
    extractTypeOptionValue(body),
  );

  const doc = await prisma.projectDocument.update({
    where: { id: documentId },
    data: {
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

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const permissionResponse = await requireProjectWritePermission();
  if (permissionResponse) return permissionResponse;

  const { id: projectId, documentId } = await context.params;
  if (!projectId || !documentId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await findDocumentInProject(projectId, documentId);
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.projectDocument.delete({
    where: { id: documentId },
  });

  return Response.json({ success: true });
}
