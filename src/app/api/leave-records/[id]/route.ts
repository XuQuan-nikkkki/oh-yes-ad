import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const record = await prisma.leaveRecord.update({
      where: { id },
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
    console.error("PUT /api/leave-records/[id] error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.leaveRecord.delete({
      where: { id },
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/leave-records/[id] error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
