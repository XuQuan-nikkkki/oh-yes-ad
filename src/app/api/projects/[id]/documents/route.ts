import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid document name", { status: 400 });
  }

  const doc = await prisma.projectDocument.create({
    data: {
      projectId,
      name: body.name,
      type: body.type ?? null,
      date: body.date ? new Date(body.date) : null,
      isFinal: Boolean(body.isFinal),
      internalLink: body.internalLink ?? null,
    },
  });

  return Response.json(doc);
}
