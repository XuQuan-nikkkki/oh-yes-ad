import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_COLOR } from "@/lib/constants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const field = url.searchParams.get("field");

  const options = await prisma.selectOption.findMany({
    where: field ? { field } : undefined,
    orderBy: [
      {
        order: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  return Response.json(options);
}

export async function POST(req: Request) {
  const body = await sanitizeRequestBody(req);
  const field = String(body.field ?? "").trim();
  const value = String(body.value ?? "").trim();

  if (!field || !value) {
    return new Response("Missing field or value", { status: 400 });
  }

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value,
      },
    },
    create: {
      field,
      value,
      color: body.color ?? DEFAULT_COLOR,
      order: body.order ?? null,
    },
    update: {
      color: body.color ?? undefined,
      order: body.order ?? undefined,
    },
  });

  return Response.json(option);
}
