import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      fullName: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      function: true,
      position: true,
      level: true,
      departmentLevel1: true,
      departmentLevel2: true,
      employmentType: true,
      employmentStatus: true,
      entryDate: true,
      leaveDate: true,
      ownedProjects: {
        select: { id: true, name: true, type: true, status: true },
        orderBy: { name: "asc" },
      },
      projects: {
        select: { id: true, name: true, type: true, status: true },
        orderBy: { name: "asc" },
      },
      leaveRecords: {
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "desc" },
      },
      actualWorkEntries: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!employee) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(employee);
}
