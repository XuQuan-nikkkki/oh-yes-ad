import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectType = searchParams.get("projectType");

  const items = await prisma.actualWorkEntry.findMany({
    where: projectType === "all" ? undefined : { project: { type: "内部项目" } },
    include: {
      project: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.title || typeof body.title !== "string") {
    return new Response("Invalid title", { status: 400 });
  }
  if (!body?.projectId || typeof body.projectId !== "string") {
    return new Response("Invalid project ID", { status: 400 });
  }
  if (!body?.employeeId || typeof body.employeeId !== "string") {
    return new Response("Invalid employee ID", { status: 400 });
  }
  if (!body?.startDate || typeof body.startDate !== "string") {
    return new Response("Invalid start date", { status: 400 });
  }
  if (!body?.endDate || typeof body.endDate !== "string") {
    return new Response("Invalid end date", { status: 400 });
  }
  if (new Date(body.endDate).getTime() < new Date(body.startDate).getTime()) {
    return new Response("End date must be after start date", { status: 400 });
  }

  const allowAllProjects = body?.projectType === "all";
  const project = await prisma.project.findFirst({
    where: allowAllProjects ? { id: body.projectId } : { id: body.projectId, type: "内部项目" },
    select: { id: true },
  });
  if (!project) return new Response("Project not found", { status: 400 });

  const employee = await prisma.employee.findUnique({ where: { id: body.employeeId }, select: { id: true } });
  if (!employee) return new Response("Employee not found", { status: 400 });

  const item = await prisma.actualWorkEntry.create({
    data: {
      title: body.title,
      projectId: body.projectId,
      employeeId: body.employeeId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
  });
  return Response.json(item);
}
