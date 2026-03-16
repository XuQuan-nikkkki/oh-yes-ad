import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const INTERNAL_PROJECT_TYPE_VALUES = ["内部项目", "INTERNAL"] as const;
const isInternalOnly = (projectType?: string | null) =>
  projectType === "internal";

const whereByScope = (id: string, internalOnly: boolean) =>
  internalOnly
    ? {
        id,
        project: {
          typeOption: {
            value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
          },
        },
      }
    : { id };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const internalOnly = isInternalOnly(req.nextUrl.searchParams.get("projectType"));
  const item = await prisma.actualWorkEntry.findFirst({
    where: whereByScope(id, internalOnly),
    include: {
      project: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(item);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const internalOnly =
    isInternalOnly(req.nextUrl.searchParams.get("projectType")) ||
    isInternalOnly(body?.projectType);

  const found = await prisma.actualWorkEntry.findFirst({
    where: whereByScope(id, internalOnly),
    select: { id: true },
  });
  if (!found) return new Response("Not Found", { status: 404 });

  if (body.endDate && body.startDate && new Date(body.endDate).getTime() < new Date(body.startDate).getTime()) {
    return new Response("End date must be after start date", { status: 400 });
  }

  if (body.projectId) {
    const project = await prisma.project.findFirst({
      where: internalOnly
        ? {
            id: body.projectId,
            typeOption: {
              value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
            },
          }
        : { id: body.projectId },
      select: { id: true },
    });
    if (!project) return new Response("Project not found", { status: 400 });
  }

  if (body.employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: body.employeeId }, select: { id: true } });
    if (!employee) return new Response("Employee not found", { status: 400 });
  }

  const item = await prisma.actualWorkEntry.update({
    where: { id },
    data: {
      title: body.title,
      projectId: body.projectId,
      employeeId: body.employeeId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    },
  });
  return Response.json(item);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const internalOnly = isInternalOnly(req.nextUrl.searchParams.get("projectType"));
  const found = await prisma.actualWorkEntry.findFirst({
    where: whereByScope(id, internalOnly),
    select: { id: true },
  });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.actualWorkEntry.delete({ where: { id } });
  return Response.json({ success: true });
}
