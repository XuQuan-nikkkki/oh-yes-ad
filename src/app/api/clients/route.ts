import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// ==================== GET ====================
export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json(clients);
}

// ==================== POST ====================
export async function POST(req: Request) {
  const body = await req.json();

  const client = await prisma.client.create({
    data: {
      name: body.name,
      industry: body.industry,
      remark: body.remark ?? null,
    },
  });

  return Response.json(client);
}

// ==================== PUT ====================
export async function PUT(req: Request) {
  const body = await req.json();

  const client = await prisma.client.update({
    where: {
      id: body.id,
    },
    data: {
      name: body.name,
      industry: body.industry,
      remark: body.remark ?? null,
    },
  });

  return Response.json(client);
}

// ==================== DELETE ====================
export async function DELETE(req: Request) {
  const body = await req.json();

  await prisma.client.delete({
    where: {
      id: body.id,
    },
  });

  return Response.json({ success: true });
}