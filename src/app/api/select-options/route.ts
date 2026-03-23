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
  const inputOrder =
    typeof body.order === "number" && Number.isFinite(body.order)
      ? Math.round(body.order)
      : null;

  if (!field || !value) {
    return new Response("Missing field or value", { status: 400 });
  }

  const option = await prisma.$transaction(async (tx) => {
    const existing = await tx.selectOption.findUnique({
      where: {
        field_value: {
          field,
          value,
        },
      },
    });

    if (existing) {
      return tx.selectOption.update({
        where: {
          field_value: {
            field,
            value,
          },
        },
        data: {
          color: body.color ?? undefined,
          order: inputOrder ?? undefined,
        },
      });
    }

    const maxOrderResult = await tx.selectOption.aggregate({
      where: { field },
      _max: { order: true },
    });
    const nextOrder = (maxOrderResult._max.order ?? 0) + 1;

    return tx.selectOption.create({
      data: {
        field,
        value,
        color: body.color ?? DEFAULT_COLOR,
        order: inputOrder ?? nextOrder,
      },
    });
  });

  return Response.json(option);
}
