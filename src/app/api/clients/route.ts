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
    include: {
      industryOption: true,
    },
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
      industryOptionId: body.industryOptionId,
      remark: body.remark ?? null,
    },
    include: {
      industryOption: true,
    },
  });

  return Response.json(client);
}
