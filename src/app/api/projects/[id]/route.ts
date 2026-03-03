import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function GET(req: Request) {
  const { pathname } = new URL(req.url);
  const id = pathname.split("/").pop();

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      owner: true,
      members: {
        select: {
          id: true,
          name: true,
          function: true,
          employmentStatus: true,
        },
      },
      milestones: {
        select: {
          id: true,
          name: true,
          dueDate: true,
        },
      },
      segments: {
        select: {
          id: true,
          name: true,
          dueDate: true,
          projectTasks: {
            select: {
              id: true,
              name: true,
              dueDate: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json({ ...project });
}
