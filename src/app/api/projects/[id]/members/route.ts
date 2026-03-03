import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function POST(req: Request) {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/");
  const projectId = parts[parts.indexOf("projects") + 1];
  const body = await req.json();
  const memberId = body;

  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  if (!memberId || typeof memberId !== "string") {
    return new Response("Invalid member ID", { status: 400 });
  }

  try {
    // 先检查成员是否已在项目中
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        members: {
          where: { id: memberId },
          select: { id: true },
        },
      },
    });

    if (existing?.members.length) {
      return new Response("Member already in project", { status: 409 });
    }

    // 添加成员
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        members: {
          connect: { id: memberId },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            function: true,
          },
        },
      },
    });

    return Response.json(updated.members);
  } catch (error) {
    console.error("Error adding member:", error);
    return new Response("Failed to add member", { status: 500 });
  }
}
