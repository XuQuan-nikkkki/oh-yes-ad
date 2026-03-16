import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function DELETE(req: Request) {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/");
  const projectId = parts[parts.indexOf("projects") + 1];
  const memberId = parts[parts.length - 1];

  if (!projectId || !memberId) {
    return new Response("Missing project ID or member ID", { status: 400 });
  }

  try {
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        members: {
          disconnect: { id: memberId },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            functionOption: {
              select: {
                value: true,
              },
            },
          },
        },
      },
    });
    return Response.json(
      updated.members.map((member) => ({
        id: member.id,
        name: member.name,
        function: member.functionOption?.value ?? null,
      })),
    );
  } catch (error) {
    console.error("Error removing member:", error);
    return new Response("Failed to remove member", { status: 500 });
  }
}
