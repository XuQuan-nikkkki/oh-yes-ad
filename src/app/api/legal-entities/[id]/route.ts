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

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const legalEntity = await prisma.legalEntity.findUnique({
    where: { id },
    include: {
      bankAccounts: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          employees: true,
        },
      },
    },
  });

  if (!legalEntity) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(legalEntity);
}

