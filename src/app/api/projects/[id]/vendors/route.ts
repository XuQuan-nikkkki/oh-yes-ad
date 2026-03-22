import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireCrmWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function POST(req: Request) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = (await sanitizeRequestBody(req)) as { vendorId?: unknown };
  const vendorId =
    typeof body.vendorId === "string" ? body.vendorId.trim() : "";

  const { pathname } = new URL(req.url);
  const parts = pathname.split("/");
  const projectId = parts[parts.indexOf("projects") + 1];

  if (!projectId || !vendorId) {
    return new Response("Missing project ID or vendor ID", { status: 400 });
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        vendors: {
          connect: { id: vendorId },
        },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error adding vendor to project:", error);
    return new Response("Failed to add vendor to project", { status: 500 });
  }
}
