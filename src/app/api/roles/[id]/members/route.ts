import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const ensureStaffRole = async () => {
  return prisma.role.upsert({
    where: { code: "STAFF" },
    create: {
      code: "STAFF",
      name: "员工",
    },
    update: {},
    select: { id: true, code: true, name: true },
  });
};

export async function GET(_req: Request, context: RouteContext) {
  const { id: roleId } = await context.params;

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      code: true,
      name: true,
      employees: {
        select: {
          employee: {
            select: {
              id: true,
              name: true,
              fullName: true,
              phone: true,
              functionOption: {
                select: { id: true, value: true, color: true },
              },
            },
          },
        },
        orderBy: {
          employee: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!role) {
    return new Response("role not found", { status: 404 });
  }

  return Response.json({
    id: role.id,
    code: role.code,
    name: role.name,
    members: role.employees.map((item) => ({
      ...item.employee,
      function: item.employee.functionOption?.value ?? null,
    })),
  });
}

export async function POST(req: Request, context: RouteContext) {
  const { id: roleId } = await context.params;
  const body = await sanitizeRequestBody(req);
  const employeeId =
    typeof body.employeeId === "string" ? body.employeeId.trim() : "";
  if (!employeeId) {
    return new Response("employeeId is required", { status: 400 });
  }

  const [role, employee] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId }, select: { id: true } }),
    prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } }),
  ]);

  if (!role) return new Response("role not found", { status: 404 });
  if (!employee) return new Response("employee not found", { status: 404 });

  await prisma.employeeRole.upsert({
    where: {
      employeeId_roleId: {
        employeeId,
        roleId,
      },
    },
    create: {
      employeeId,
      roleId,
    },
    update: {},
  });

  return Response.json({ success: true });
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id: roleId } = await context.params;
  const body = await sanitizeRequestBody(req);
  const employeeId =
    typeof body.employeeId === "string" ? body.employeeId.trim() : "";
  if (!employeeId) {
    return new Response("employeeId is required", { status: 400 });
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, code: true },
  });
  if (!role) return new Response("role not found", { status: 404 });

  await prisma.employeeRole.deleteMany({
    where: {
      employeeId,
      roleId,
    },
  });

  const restRoleCount = await prisma.employeeRole.count({
    where: { employeeId },
  });

  if (restRoleCount === 0) {
    const staffRole = await ensureStaffRole();
    await prisma.employeeRole.upsert({
      where: {
        employeeId_roleId: {
          employeeId,
          roleId: staffRole.id,
        },
      },
      create: {
        employeeId,
        roleId: staffRole.id,
      },
      update: {},
    });
  }

  return Response.json({ success: true });
}

