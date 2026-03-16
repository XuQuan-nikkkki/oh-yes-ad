import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const ownerPublicSelect = {
  id: true,
  name: true,
  functionOption: {
    select: {
      value: true,
    },
  },
  employmentStatusOption: {
    select: {
      value: true,
    },
  },
} as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const toProjectTypeCode = (value?: string | null) => {
  if (!value) return null;
  if (value === "客户项目") return "CLIENT";
  if (value === "内部项目") return "INTERNAL";
  return value;
};

type SelectOptionValue = { value?: string | null } | null | undefined;
type ProjectOwnerPayload = {
  functionOption?: SelectOptionValue;
  employmentStatusOption?: SelectOptionValue;
} & Record<string, unknown>;
type ProjectPayload = {
  typeOption?: SelectOptionValue;
  statusOption?: SelectOptionValue;
  stageOption?: SelectOptionValue;
  owner?: ProjectOwnerPayload | null;
} & Record<string, unknown>;

const serializeProject = (project: ProjectPayload) => ({
  ...project,
  type: toProjectTypeCode(project.typeOption?.value),
  status: project.statusOption?.value ?? null,
  stage: project.stageOption?.value ?? null,
  owner: project.owner
    ? {
        ...project.owner,
        function: project.owner.functionOption?.value ?? null,
        employmentStatus: project.owner.employmentStatusOption?.value ?? null,
      }
    : null,
});

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing client ID", { status: 400 });
  }

  const projects = await prisma.project.findMany({
    where: { clientId: id },
    include: {
      client: true,
      typeOption: true,
      statusOption: true,
      stageOption: true,
      owner: {
        select: ownerPublicSelect,
      },
    },
    orderBy: [
      {
        startDate: {
          sort: "desc",
          nulls: "last",
        },
      },
      { createdAt: "desc" },
    ],
  });

  return Response.json(projects.map(serializeProject));
}
