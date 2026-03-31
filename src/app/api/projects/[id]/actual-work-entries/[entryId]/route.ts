import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import {
  canManageProjectResources,
  extractRoleCodes,
} from "@/lib/role-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

const findEntryInProject = async (projectId: string, entryId: string) => {
  return prisma.actualWorkEntry.findFirst({
    where: { id: entryId, projectId },
    select: { id: true, employeeId: true },
  });
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const authResult = await requireAuthenticatedEmployee();
  if (authResult.response) return authResult.response;
  const { id: projectId, entryId } = await context.params;
  if (!projectId || !entryId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await findEntryInProject(projectId, entryId);
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }
  const roleCodes = extractRoleCodes(authResult.employee);
  const canManageAnyActualWorkEntry = canManageProjectResources(roleCodes);
  if (
    !canManageAnyActualWorkEntry &&
    found.employeeId !== authResult.session.employeeId
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json();
  if (!body?.title || typeof body.title !== "string") {
    return new Response("Invalid title", { status: 400 });
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

  const employee = await prisma.employee.findUnique({
    where: { id: body.employeeId },
    select: { id: true },
  });

  if (!employee) {
    return new Response("Employee not found", { status: 400 });
  }
  if (
    !canManageAnyActualWorkEntry &&
    body.employeeId !== authResult.session.employeeId
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const entry = await prisma.actualWorkEntry.update({
    where: { id: entryId },
    data: {
      title: body.title,
      employeeId: body.employeeId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
  });

  return Response.json(entry);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const authResult = await requireAuthenticatedEmployee();
  if (authResult.response) return authResult.response;
  const { id: projectId, entryId } = await context.params;
  if (!projectId || !entryId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await findEntryInProject(projectId, entryId);
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }
  const roleCodes = extractRoleCodes(authResult.employee);
  const canManageAnyActualWorkEntry = canManageProjectResources(roleCodes);
  if (
    !canManageAnyActualWorkEntry &&
    found.employeeId !== authResult.session.employeeId
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  await prisma.actualWorkEntry.delete({
    where: { id: entryId },
  });

  return Response.json({ success: true });
}
