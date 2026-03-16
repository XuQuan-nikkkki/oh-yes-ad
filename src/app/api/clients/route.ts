import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireCrmWritePermission } from "@/lib/api-permissions";

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
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const client = await prisma.client.create({
    data: {
      name: body.name,
      industryOptionId: body.industryOptionId,
    },
    include: {
      industryOption: true,
    },
  });

  return Response.json(client);
}
