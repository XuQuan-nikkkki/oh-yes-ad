import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});
export async function GET() {
  const clients = await prisma.client.findMany();
  return Response.json(clients);
}

export async function POST() {
  const client = await prisma.client.create({
    data: {
      name: "测试客户",
      industry: "酒类",
      remark: "这是一个测试客户",
    },
  });
  return Response.json(client);
}
