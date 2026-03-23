import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
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

type LegacyClientContactRow = {
  id: string;
  name: string;
  title: string | null;
  scope: string | null;
  preference: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  address: string | null;
  order: number | null;
  createdAt: Date;
  clientId: string;
  clientName: string;
};

// ================= GET =================
// /api/client-contacts
// /api/client-contacts?clientId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (clientId) {
    const links = await prisma.clientContactClient.findMany({
      where: { clientId },
      include: {
        contact: {
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
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    if (links.length === 0) {
      try {
        const legacyContacts = await prisma.$queryRaw<LegacyClientContactRow[]>`
          SELECT
            cc."id",
            cc."name",
            cc."title",
            cc."scope",
            cc."preference",
            cc."phone",
            cc."email",
            cc."wechat",
            cc."address",
            cc."order",
            cc."createdAt",
            cc."clientId",
            c."name" AS "clientName"
          FROM "ClientContact" cc
          INNER JOIN "Client" c ON c."id" = cc."clientId"
          WHERE cc."clientId" = ${clientId}
          ORDER BY cc."order" ASC NULLS LAST, cc."createdAt" ASC
        `;

        return Response.json(
          legacyContacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            title: contact.title,
            scope: contact.scope,
            preference: contact.preference,
            phone: contact.phone,
            email: contact.email,
            wechat: contact.wechat,
            address: contact.address,
            order: contact.order ?? undefined,
            clientIds: [contact.clientId],
            client: {
              id: contact.clientId,
              name: contact.clientName,
            },
            clients: [
              {
                id: contact.clientId,
                name: contact.clientName,
              },
            ],
          })),
        );
      } catch {
        return Response.json([]);
      }
    }

    return Response.json(
      links.map((link) => ({
        ...serializeClientContact(link.contact),
        order: link.order,
      })),
    );
  }

  const contacts = await prisma.clientContact.findMany({
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
    orderBy: [{ createdAt: "asc" }],
  });

  return Response.json(contacts.map((contact) => serializeClientContact(contact)));
}

// ================= POST =================
export async function POST(req: NextRequest) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const rawClientIds: unknown[] = Array.isArray(body.clientIds)
    ? body.clientIds
    : body.clientId
      ? [body.clientId]
      : [];
  const clientIds = rawClientIds.reduce<string[]>((result, item) => {
    if (typeof item !== "string") return result;
    const value = item.trim();
    if (value) result.push(value);
    return result;
  }, []);

  if (!body.name || typeof body.name !== "string") {
    return new Response("Missing name", { status: 400 });
  }
  if (clientIds.length === 0) {
    return new Response("Missing clientIds", { status: 400 });
  }

  const uniqueClientIds = Array.from(new Set(clientIds));

  const contact = await prisma.$transaction(async (tx) => {
    const orderByClientId = new Map<string, number>();
    for (const clientId of uniqueClientIds) {
      const minOrder = await tx.clientContactClient.aggregate({
        where: { clientId },
        _min: { order: true },
      });
      const currentMinOrder = minOrder._min?.order;
      orderByClientId.set(clientId, currentMinOrder == null ? 1000 : currentMinOrder - 1000);
    }

    const created = await tx.clientContact.create({
      data: {
        name: body.name,
        title: body.title,
        scope: body.scope,
        preference: body.preference,
        phone: body.phone,
        email: body.email,
        wechat: body.wechat,
        address: body.address,
        clientLinks: {
          create: uniqueClientIds.map((clientId) => ({
            client: {
              connect: { id: clientId },
            },
            order: orderByClientId.get(clientId) ?? 1000,
          })),
        },
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

    return created;
  });

  return Response.json(serializeClientContact(contact));
}
