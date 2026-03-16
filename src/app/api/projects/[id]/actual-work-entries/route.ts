import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
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

  const entry = await prisma.actualWorkEntry.create({
    data: {
      title: body.title,
      employeeId: body.employeeId,
      projectId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
  });

  return Response.json(entry);
}
