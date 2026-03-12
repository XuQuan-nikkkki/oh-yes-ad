import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

const findDocumentInProject = async (projectId: string, documentId: string) => {
  return prisma.projectDocument.findFirst({
    where: { id: documentId, projectId },
    select: { id: true },
  });
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id: projectId, documentId } = await context.params;
  if (!projectId || !documentId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await findDocumentInProject(projectId, documentId);
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid document name", { status: 400 });
  }

  const doc = await prisma.projectDocument.update({
    where: { id: documentId },
    data: {
      name: body.name,
      type: body.type ?? null,
      date: body.date ? new Date(body.date) : null,
      isFinal: Boolean(body.isFinal),
      internalLink: body.internalLink ?? null,
    },
  });

  return Response.json(doc);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
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
