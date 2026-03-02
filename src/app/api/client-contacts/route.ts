import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// ================= GET =================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return new Response("clientId required", { status: 400 });
  }

  const contacts = await prisma.clientContact.findMany({
    where: {
      clientId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json(contacts);
}

// ================= POST =================
export async function POST(req: Request) {
  const body = await req.json();

  const contact = await prisma.clientContact.create({
    data: {
      name: body.name,
      title: body.title ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      clientId: body.clientId,
    },
  });

  return Response.json(contact);
}