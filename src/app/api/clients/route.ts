import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { findClientWithSameName, normalizeClientName } from "@/lib/client-name";

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
  const name = normalizeClientName(body?.name);
  if (!name) return new Response("请输入客户名称", { status: 400 });
  if (await findClientWithSameName(prisma, name)) {
    return new Response("客户名称已存在", { status: 409 });
  }

  const client = await prisma.client.create({
    data: {
      name,
      industryOptionId: body.industryOptionId,
    },
    include: {
      industryOption: true,
    },
  });

  return Response.json(client);
}
