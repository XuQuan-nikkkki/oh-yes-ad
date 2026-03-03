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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = await prisma.workdayAdjustment.create({
      data: {
        name: body.name ?? null,
        changeType: body.changeType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
    });
    return Response.json(record);
  } catch (error) {
    console.error("POST /api/workday-adjustments error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
