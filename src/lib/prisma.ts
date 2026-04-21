import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { estimationExtension } from "@/lib/prisma/project-cost-estimation";
import { initiationExtension } from "@/lib/prisma/project-initiation";
import { pricingStrategyExtension } from "@/lib/prisma/project-pricing-strategy";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({ adapter })
    .$extends(estimationExtension)
    .$extends(initiationExtension)
    .$extends(pricingStrategyExtension);
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = global as unknown as {
  prisma?: ExtendedPrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
