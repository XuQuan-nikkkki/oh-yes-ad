import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const ownerPublicSelect = {
  id: true,
  name: true,
  function: true,
  employmentStatus: true,
} as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing client ID", { status: 400 });
  }

  const projects = await prisma.project.findMany({
    where: { clientId: id },
    include: {
      client: true,
      owner: {
        select: ownerPublicSelect,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json(projects);
}
