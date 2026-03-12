import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function GET() {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = decodeAuthSession(raw);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      id: true,
      name: true,
      fullName: true,
      phone: true,
      roles: {
        select: {
          role: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  });

  if (!employee) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json(employee);
}
