import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { serializeClientContact } from "@/lib/client-contact";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const contact = await prisma.clientContact.findUnique({
    where: { id },
    include: {
      clientLinks: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!contact) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(serializeClientContact(contact));
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await req.json();
  const existing = await prisma.clientContact.findUnique({
    where: { id },
    include: {
      clientLinks: {
        select: {
          clientId: true,
          order: true,
        },
      },
    },
  });
  if (!existing) {
    return new Response("Not Found", { status: 404 });
  }
  const existingClientIds = existing.clientLinks.map((link) => link.clientId);
  const rawClientIds: unknown[] = Array.isArray(body.clientIds)
    ? body.clientIds
    : body.clientId
      ? [body.clientId]
      : existingClientIds;
  const clientIds = rawClientIds.reduce<string[]>((result, item) => {
    if (typeof item !== "string") return result;
    const value = item.trim();
    if (value) result.push(value);
    return result;
  }, []);

  if (clientIds.length === 0) {
    return new Response("Missing clientIds", { status: 400 });
  }

  const uniqueClientIds = Array.from(new Set(clientIds));

  const contact = await prisma.$transaction(async (tx) => {
    const toDelete = existingClientIds.filter((clientId) => !uniqueClientIds.includes(clientId));
    const toCreate = uniqueClientIds.filter((clientId) => !existingClientIds.includes(clientId));

    if (toDelete.length > 0) {
      await tx.clientContactClient.deleteMany({
        where: {
          contactId: id,
          clientId: { in: toDelete },
        },
      });
    }

    for (const clientId of toCreate) {
      const maxOrder = await tx.clientContactClient.aggregate({
        where: { clientId },
        _max: { order: true },
      });
      const currentMaxOrder = maxOrder._max?.order;
      await tx.clientContactClient.create({
        data: {
          clientId,
          contactId: id,
          order: (currentMaxOrder ?? 0) + 1000,
        },
      });
    }

    const updated = await tx.clientContact.update({
      where: { id },
      data: {
        name: body.name,
        title: body.title,
        scope: body.scope,
        preference: body.preference,
        phone: body.phone,
        email: body.email,
        wechat: body.wechat,
        address: body.address,
      },
      include: {
        clientLinks: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return updated;
  });

  return Response.json(serializeClientContact(contact));
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  await prisma.clientContact.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
