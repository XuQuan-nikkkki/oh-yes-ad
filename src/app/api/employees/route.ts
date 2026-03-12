import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const employeePublicSelect = {
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
} as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list");

  const select =
    list === "full"
      ? employeePublicSelect
      : {
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
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return new Response("Phone is required", { status: 400 });
  }

  const roleIds: string[] = Array.isArray(body.roleIds)
    ? [...new Set(body.roleIds.filter((id: unknown): id is string => typeof id === "string"))]
    : [];

  if (roleIds.length > 0) {
    const roleCount = await prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (roleCount !== roleIds.length) {
      return new Response("Invalid role IDs", { status: 400 });
    }
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        name: body.name,
        phone,
        fullName: body.fullName || null,
        password: body.password || undefined,
        function: body.function || null,
        employmentStatus: body.employmentStatus || null,
        roles: {
          create:
            roleIds.length > 0
              ? roleIds.map((roleId) => ({
                  role: { connect: { id: roleId } },
                }))
              : [
                  {
                    role: { connect: { code: "STAFF" } },
                  },
                ],
        },
      },
      select: employeePublicSelect,
    });

    return Response.json(employee);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return new Response("Phone already exists", { status: 400 });
    }
    throw error;
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return new Response("Phone is required", { status: 400 });
  }
  if (typeof body.password === "string" && body.password.trim()) {
    return new Response("Password cannot be changed from this interface", { status: 400 });
  }

  const roleIds: string[] = Array.isArray(body.roleIds)
    ? [...new Set(body.roleIds.filter((id: unknown): id is string => typeof id === "string"))]
    : [];

  if (roleIds.length > 0) {
    const roleCount = await prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (roleCount !== roleIds.length) {
      return new Response("Invalid role IDs", { status: 400 });
    }
  }

  try {
    const employee = await prisma.employee.update({
      where: { id: body.id },
      data: {
        name: body.name,
        phone,
        fullName: body.fullName || null,
        function: body.function || null,
        employmentStatus: body.employmentStatus || null,
        roles: {
          deleteMany: {},
          create:
            roleIds.length > 0
              ? roleIds.map((roleId) => ({
                  role: { connect: { id: roleId } },
                }))
              : [
                  {
                    role: { connect: { code: "STAFF" } },
                  },
                ],
        },
      },
      select: employeePublicSelect,
    });

    return Response.json(employee);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return new Response("Phone already exists", { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(req: Request) {
  const body = await req.json();

  await prisma.employee.delete({
    where: { id: body.id },
  });

  return Response.json({ success: true });
}
