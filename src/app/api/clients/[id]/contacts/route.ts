import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
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
    return new Response("Missing client ID", { status: 400 });
  }

  const contacts = await prisma.clientContact.findMany({
    where: { clientId: id },
    include: {
      client: true,
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(contacts);
}
