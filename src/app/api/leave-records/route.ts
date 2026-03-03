import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function GET() {
  const records = await prisma.leaveRecord.findMany({
    include: {
      employee: {
        select: { id: true, name: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return Response.json(records);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = await prisma.leaveRecord.create({
      data: {
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeId: body.employeeId,
      },
      include: {
        employee: {
          select: { id: true, name: true },
        },
      },
    });
    return Response.json(record);
  } catch (error) {
    console.error("POST /api/leave-records error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
