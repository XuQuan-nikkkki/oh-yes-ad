import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// ==================== GET ====================
export async function GET() {
  const vendors = await prisma.vendor.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json(vendors);
}

// ==================== POST ====================
export async function POST(req: Request) {
  const body = await req.json();

  const vendor = await prisma.vendor.create({
    data: {
      name: body.name,
      fullName: body.fullName ?? null,
      vendorType: body.vendorType ?? null,
      businessType: body.businessType ?? null,
      location: body.location ?? null,
      contactName: body.contactName ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      wechat: body.wechat ?? null,
      strengths: body.strengths ?? null,
      notes: body.notes ?? null,
      companyIntro: body.companyIntro ?? null,
      portfolioLink: body.portfolioLink ?? null,
      priceRange: body.priceRange ?? null,
      isBlacklisted: body.isBlacklisted ?? false,
      cooperationStatus: body.cooperationStatus ?? null,
      rating: body.rating ?? null,
      lastCoopDate: body.lastCoopDate ?? null,
      services: body.services ?? [],
    },
  });

  return Response.json(vendor);
}

// ==================== PUT ====================
export async function PUT(req: Request) {
  const body = await req.json();

  const vendor = await prisma.vendor.update({
    where: {
      id: body.id,
    },
    data: {
      name: body.name,
      fullName: body.fullName ?? null,
      vendorType: body.vendorType ?? null,
      businessType: body.businessType ?? null,
      location: body.location ?? null,
      contactName: body.contactName ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      wechat: body.wechat ?? null,
      strengths: body.strengths ?? null,
      notes: body.notes ?? null,
      companyIntro: body.companyIntro ?? null,
      portfolioLink: body.portfolioLink ?? null,
      priceRange: body.priceRange ?? null,
      isBlacklisted: body.isBlacklisted ?? false,
      cooperationStatus: body.cooperationStatus ?? null,
      rating: body.rating ?? null,
      lastCoopDate: body.lastCoopDate ?? null,
      services: body.services ?? [],
    },
  });

  return Response.json(vendor);
}

// ==================== DELETE ====================
export async function DELETE(req: Request) {
  const body = await req.json();

  await prisma.vendor.delete({
    where: {
      id: body.id,
    },
  });

  return Response.json({ success: true });
}
