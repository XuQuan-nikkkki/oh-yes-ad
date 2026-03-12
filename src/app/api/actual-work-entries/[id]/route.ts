import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const whereByScope = (id: string, allowAllProjects: boolean) =>
  allowAllProjects ? { id } : { id, project: { type: "内部项目" } };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const allowAllProjects = req.nextUrl.searchParams.get("projectType") === "all";
  const item = await prisma.actualWorkEntry.findFirst({
    where: whereByScope(id, allowAllProjects),
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
  const allowAllProjects =
    req.nextUrl.searchParams.get("projectType") === "all" || body?.projectType === "all";

  const found = await prisma.actualWorkEntry.findFirst({
    where: whereByScope(id, allowAllProjects),
    select: { id: true },
  });
  if (!found) return new Response("Not Found", { status: 404 });

  if (body.endDate && body.startDate && new Date(body.endDate).getTime() < new Date(body.startDate).getTime()) {
    return new Response("End date must be after start date", { status: 400 });
  }

  if (body.projectId) {
    const project = await prisma.project.findFirst({
      where: allowAllProjects ? { id: body.projectId } : { id: body.projectId, type: "内部项目" },
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
  const allowAllProjects = req.nextUrl.searchParams.get("projectType") === "all";
  const found = await prisma.actualWorkEntry.findFirst({
    where: whereByScope(id, allowAllProjects),
    select: { id: true },
  });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.actualWorkEntry.delete({ where: { id } });
  return Response.json({ success: true });
}
