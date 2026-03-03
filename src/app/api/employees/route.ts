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

export async function POST(req: Request) {
  const body = await req.json();

  const employee = await prisma.employee.create({
    data: {
      name: body.name,
      function: body.function || null,
      employmentStatus: body.employmentStatus || null,
    },
  });

  return Response.json(employee);
}

export async function PUT(req: Request) {
  const body = await req.json();

  const employee = await prisma.employee.update({
    where: { id: body.id },
    data: {
      name: body.name,
      function: body.function || null,
      employmentStatus: body.employmentStatus || null,
    },
  });

  return Response.json(employee);
}

export async function DELETE(req: Request) {
  const body = await req.json();

  await prisma.employee.delete({
    where: { id: body.id },
  });

  return Response.json({ success: true });
}
