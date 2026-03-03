import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list");

  const select = list === "full"
    ? {
        id: true,
        name: true,
        function: true,
        position: true,
        level: true,
        departmentLevel1: true,
        departmentLevel2: true,
        employmentType: true,
        employmentStatus: true,
        entryDate: true,
        leaveDate: true,
      }
    : {
        id: true,
        name: true,
        function: true,
        employmentStatus: true,
      };

  const employees = await prisma.employee.findMany({
    select,
    orderBy: { name: "asc" },
  });
  return Response.json(employees);
}
