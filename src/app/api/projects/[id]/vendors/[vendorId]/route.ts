import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireCrmWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function DELETE(req: Request) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { pathname } = new URL(req.url);
  const parts = pathname.split("/");
  const projectId = parts[parts.indexOf("projects") + 1];
  const vendorId = parts[parts.length - 1];

  if (!projectId || !vendorId) {
    return new Response("Missing project ID or vendor ID", { status: 400 });
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        vendors: {
          disconnect: { id: vendorId },
        },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing vendor from project:", error);
    return new Response("Failed to remove vendor from project", { status: 500 });
  }
}
