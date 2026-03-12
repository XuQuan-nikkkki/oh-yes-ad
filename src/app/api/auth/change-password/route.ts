import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function POST(req: Request) {
  const body = await req.json();
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!phone || !oldPassword || !newPassword) {
    return new Response("Phone, oldPassword and newPassword are required", { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { phone },
    select: { id: true, password: true },
  });

  if (!employee || employee.password !== oldPassword) {
    return new Response("Phone or old password is incorrect", { status: 401 });
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: { password: newPassword },
  });

  return Response.json({ success: true });
}
