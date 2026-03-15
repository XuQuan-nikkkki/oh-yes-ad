import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

export async function GET() {
  const options = await prisma.selectOption.findMany({
    orderBy: [{ field: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  const optionsByField = options.reduce<Record<string, typeof options>>((acc, option) => {
    if (!acc[option.field]) {
      acc[option.field] = [];
    }
    acc[option.field].push(option);
    return acc;
  }, {});

  return Response.json({
    options,
    optionsByField,
  });
}
