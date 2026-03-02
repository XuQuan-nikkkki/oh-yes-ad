import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// ==================== GET ====================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const where: any = {};
  if (type) {
    // type is expected to be Chinese string like 客户项目 or 内部项目
    where.type = type;
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: true,
      owner: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json(projects);
}

// ==================== POST ====================
export async function POST(req: Request) {
  const body = await req.json();

  const project = await prisma.project.create({
    data: {
      name: body.name,
      type: body.type,
      status: body.status ?? null,
      stage: body.stage ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      clientId: body.clientId ?? null,
      ownerId: body.ownerId ?? null,
    },
    include: {
      client: true,
      owner: true,
    },
  });

  return Response.json(project);
}

// ==================== PUT ====================
export async function PUT(req: Request) {
  const body = await req.json();

  const project = await prisma.project.update({
    where: {
      id: body.id,
    },
    data: {
      name: body.name,
      type: body.type,
      status: body.status ?? null,
      stage: body.stage ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      clientId: body.clientId ?? null,
      ownerId: body.ownerId ?? null,
    },
    include: {
      client: true,
      owner: true,
    },
  });

  return Response.json(project);
}

// ==================== DELETE ====================
export async function DELETE(req: Request) {
  const body = await req.json();

  await prisma.project.delete({
    where: {
      id: body.id,
    },
  });

  return Response.json({ success: true });
}
