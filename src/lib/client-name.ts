import { Prisma, type PrismaClient } from "@prisma/client";

export const normalizeClientName = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const findClientWithSameName = async (
  prisma: PrismaClient,
  name: string,
  excludeId?: string,
) => {
  const matches = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Client"
    WHERE lower(btrim(name)) = lower(${name})
    ${excludeId ? Prisma.sql`AND id <> ${excludeId}` : Prisma.empty}
    LIMIT 1
  `;
  return matches[0] ?? null;
};
