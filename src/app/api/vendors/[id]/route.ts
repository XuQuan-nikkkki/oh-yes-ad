import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        milestones: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404,
      });
    }

    return Response.json(vendor);
  } catch (error) {
    console.error("GET /api/vendors/[id] error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
