import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import { extractRoleCodes } from "@/lib/role-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const INTERNAL_PROJECT_TYPE_VALUES = ["内部项目", "INTERNAL"] as const;
const isInternalOnly = (projectType?: string | null) =>
  projectType === "internal";

const toLocalDayStart = (value: string) => new Date(`${value}T00:00:00`);
const toLocalDayEnd = (value: string) => new Date(`${value}T23:59:59.999`);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectType = searchParams.get("projectType");
  const page = Number(searchParams.get("page"));
  const pageSize = Number(searchParams.get("pageSize"));
  const title = searchParams.get("title")?.trim() ?? "";
  const employeeId = searchParams.get("employeeId")?.trim() ?? "";
  const employeeName = searchParams.get("employeeName")?.trim() ?? "";
  const projectName = searchParams.get("projectName")?.trim() ?? "";
  const startDate = searchParams.get("startDate")?.trim() ?? "";
  const startDateFrom = searchParams.get("startDateFrom")?.trim() ?? "";
  const startDateTo = searchParams.get("startDateTo")?.trim() ?? "";
  const paged = Number.isFinite(page) && page > 0 && Number.isFinite(pageSize) && pageSize > 0;

  const where = {
    ...(isInternalOnly(projectType)
      ? {
          project: {
            typeOption: {
              value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
            },
          },
        }
      : {}),
    ...(title
      ? {
          title: {
            contains: title,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(employeeName
      ? {
          employee: {
            name: {
              contains: employeeName,
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
    ...(employeeId
      ? {
          employeeId,
        }
      : {}),
    ...(projectName
      ? {
          project: {
            ...(isInternalOnly(projectType)
              ? {
                  typeOption: {
                    value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
                  },
                }
              : {}),
            name: {
              contains: projectName,
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
    ...(startDateFrom || startDateTo
      ? {
          startDate: {
            ...(startDateFrom
              ? { gte: toLocalDayStart(startDateFrom) }
              : {}),
            ...(startDateTo
              ? { lte: toLocalDayEnd(startDateTo) }
              : {}),
          },
        }
      : startDate
        ? {
            startDate: {
              gte: toLocalDayStart(startDate),
              lte: toLocalDayEnd(startDate),
            },
          }
        : {}),
  };

  if (paged) {
    const [items, total] = await Promise.all([
      prisma.actualWorkEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { startDate: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.actualWorkEntry.count({ where }),
    ]);
    return Response.json({
      data: items,
      total,
      page,
      pageSize,
    });
  }

  const items = await prisma.actualWorkEntry.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { startDate: "desc" }],
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuthenticatedEmployee();
  if (authResult.response) return authResult.response;
  const body = await sanitizeRequestBody(req);
  const projectType = req.nextUrl.searchParams.get("projectType");
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
  const roleCodes = extractRoleCodes(authResult.employee);
  const isAdmin = roleCodes.includes("ADMIN");
  if (!isAdmin && body.employeeId !== authResult.session.employeeId) {
    return new Response("Forbidden", { status: 403 });
  }

  const project = await prisma.project.findFirst({
    where: isInternalOnly(projectType)
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
