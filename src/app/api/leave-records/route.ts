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
