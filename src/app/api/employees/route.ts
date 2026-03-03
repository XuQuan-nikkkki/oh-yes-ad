import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// 只暴露基本的员工列表用于下拉选择
export async function GET() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      function: true,
      employmentStatus: true,
    },
    orderBy: { name: "asc" },
  });
  return Response.json(employees);
}
