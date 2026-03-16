import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const toStringOrEmpty = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export async function GET() {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      _count: {
        select: {
          employees: true,
        },
      },
    },
    orderBy: { code: "asc" },
  });

  return Response.json(roles);
}

export async function POST(req: Request) {
  const body = await sanitizeRequestBody(req);
  const code = toStringOrEmpty(body.code).toUpperCase();
  const name = toStringOrEmpty(body.name);

  if (!code || !name) {
    return new Response("code and name are required", { status: 400 });
  }

  try {
    const created = await prisma.role.create({
      data: { code, name },
      select: {
        id: true,
        code: true,
        name: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });
    return Response.json(created);
  } catch {
    return new Response("role code already exists", { status: 409 });
  }
}

export async function PUT(req: Request) {
  const body = await sanitizeRequestBody(req);
  const id = toStringOrEmpty(body.id);
  const code = toStringOrEmpty(body.code).toUpperCase();
  const name = toStringOrEmpty(body.name);

  if (!id || !code || !name) {
    return new Response("id, code and name are required", { status: 400 });
  }

  try {
    const updated = await prisma.role.update({
      where: { id },
      data: { code, name },
      select: {
        id: true,
        code: true,
        name: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });
    return Response.json(updated);
  } catch {
    return new Response("update failed", { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const body = await sanitizeRequestBody(req);
  const id = toStringOrEmpty(body.id);
  if (!id) {
    return new Response("id is required", { status: 400 });
  }

  const usedCount = await prisma.employeeRole.count({
    where: { roleId: id },
  });
  if (usedCount > 0) {
    return new Response("role is in use and cannot be deleted", { status: 409 });
  }

  try {
    await prisma.role.delete({
      where: { id },
    });
    return Response.json({ ok: true });
  } catch {
    return new Response("delete failed", { status: 400 });
  }
}
