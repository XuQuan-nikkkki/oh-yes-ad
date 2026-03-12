import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const ownerPublicSelect = {
  id: true,
  name: true,
  function: true,
  employmentStatus: true,
} as const;

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
      owner: {
        select: ownerPublicSelect,
      },
      vendors: {
        select: {
          id: true,
          name: true,
        },
      },
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
          type: true,
          date: true,
          location: true,
          method: true,
          internalParticipants: {
            select: {
              id: true,
              name: true,
              function: true,
              employmentStatus: true,
            },
          },
          vendorParticipants: {
            select: {
              id: true,
              name: true,
              contactName: true,
            },
          },
          clientParticipants: {
            select: {
              id: true,
              name: true,
              title: true,
            },
          },
        },
        orderBy: { date: "asc" },
      },
      segments: {
        select: {
          id: true,
          name: true,
          status: true,
          dueDate: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          projectTasks: {
            select: {
              id: true,
              name: true,
              segmentId: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  employmentStatus: true,
                },
              },
              dueDate: true,
              plannedWorkEntries: {
                select: {
                  id: true,
                  year: true,
                  weekNumber: true,
                  plannedDays: true,
                  monday: true,
                  tuesday: true,
                  wednesday: true,
                  thursday: true,
                  friday: true,
                  saturday: true,
                  sunday: true,
                },
              },
            },
          },
        },
      },
      actualWorkEntries: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          employee: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startDate: "desc" },
      },
      documents: {
        select: {
          id: true,
          name: true,
          type: true,
          date: true,
          isFinal: true,
          internalLink: true,
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!project) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json({ ...project });
}
