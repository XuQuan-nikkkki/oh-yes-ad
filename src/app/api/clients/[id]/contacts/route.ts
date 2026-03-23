import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
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

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing client ID", { status: 400 });
  }

  const links = await prisma.clientContactClient.findMany({
    where: { clientId: id },
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
        WHERE cc."clientId" = ${id}
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
      client: {
        id,
        name:
          link.contact.clientLinks.find((item) => item.clientId === id)?.client
            ?.name ?? link.contact.clientLinks[0]?.client?.name ?? "",
      },
    })),
  );
}
