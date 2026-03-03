import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const records = await prisma.workdayAdjustment.findMany({
      orderBy: { startDate: "desc" },
    });
    return Response.json(records);
  } catch (error) {
    console.error("GET /api/workday-adjustments error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
