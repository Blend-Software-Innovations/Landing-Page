import { getPrisma } from "./prisma";

export async function recordAbandoned(data: {
  name?: string;
  email?: string;
  phone?: string;
  total?: number;
  items?: unknown;
  utm?: unknown;
}) {
  const prisma = getPrisma() as any;
  if (!data.phone && !data.email) return;
  const existing = await prisma.abandonedCheckout.findFirst({
    where: {
      status: "PENDING",
      OR: [
        data.phone ? { phone: data.phone } : undefined,
        data.email ? { email: data.email } : undefined
      ].filter(Boolean)
    },
    orderBy: { createdAt: "desc" }
  });
  if (existing) {
    return prisma.abandonedCheckout.update({
      where: { id: existing.id },
      data: {
        name: data.name || existing.name,
        email: data.email || existing.email,
        phone: data.phone || existing.phone,
        total: data.total || existing.total,
        items: data.items || existing.items,
        utm: data.utm || existing.utm,
        status: "PENDING"
      }
    });
  }
  return prisma.abandonedCheckout.create({
    data: {
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      total: data.total || null,
      items: data.items || null,
      utm: data.utm || null
    }
  });
}

export async function markRecovered(data: { phone?: string; email?: string }) {
  const prisma = getPrisma() as any;
  if (!data.phone && !data.email) return;
  return prisma.abandonedCheckout.updateMany({
    where: {
      status: "PENDING",
      OR: [
        data.phone ? { phone: data.phone } : undefined,
        data.email ? { email: data.email } : undefined
      ].filter(Boolean)
    },
    data: { status: "RECOVERED" }
  });
}

export async function listAbandoned(limit = 50) {
  const prisma = getPrisma() as any;
  return prisma.abandonedCheckout.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function updateAbandoned(id: string, data: { lastNotifiedAt?: Date; notifyCount?: number; status?: string }) {
  const prisma = getPrisma() as any;
  return prisma.abandonedCheckout.update({
    where: { id },
    data
  });
}
