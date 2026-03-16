import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = (await req.json()) as {
    field?: string;
    value?: string;
    color?: string | null;
    order?: number | null;
  };

  const value = String(body.value ?? "").trim();
  if (!value) {
    return new Response("Missing value", { status: 400 });
  }

  try {
    const current = await prisma.selectOption.findUnique({
      where: { id },
      select: { field: true },
    });

    if (!current) {
      return new Response("Not Found", { status: 404 });
    }

    const nextField = String(body.field ?? current.field).trim();
    if (!nextField) {
      return new Response("Missing field", { status: 400 });
    }

    const duplicated = await prisma.selectOption.findFirst({
      where: {
        field: nextField,
        value,
        id: { not: id },
      },
      select: { id: true },
    });

    if (duplicated) {
      return new Response("该文案已存在，请使用其他文案", { status: 409 });
    }

    const option = await prisma.selectOption.update({
      where: { id },
      data: {
        field: nextField,
        value,
        color: body.color ?? null,
        order:
          typeof body.order === "number" && Number.isFinite(body.order)
            ? body.order
            : null,
      },
    });

    return Response.json(option);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return new Response("该文案已存在，请使用其他文案", { status: 409 });
    }

    return new Response("更新选项失败", { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  try {
    await prisma.selectOption.delete({
      where: { id },
    });
    return Response.json({ success: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response("删除选项失败", { status: 500 });
  }
}
