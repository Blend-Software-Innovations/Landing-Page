import { nanoid } from "nanoid";
import { getPrisma } from "./prisma";

const HOLD_TTL_MINUTES = 15;
const ORDER_HOLD_TTL_HOURS = 72;

export async function releaseExpiredHolds() {
  const prisma = getPrisma() as any;
  const now = new Date();
  const expired: any[] = await prisma.inventoryHold.findMany({
    where: { expiresAt: { lt: now } }
  });
  if (!expired.length) return 0;
  const variantIds = expired.map((item) => item.variantId);
  await prisma.$transaction(async (tx: any) => {
    for (const hold of expired) {
      await tx.variant.update({
        where: { id: hold.variantId },
        data: { stockQty: { increment: hold.quantity } }
      });
    }
    await tx.inventoryHold.deleteMany({ where: { id: { in: expired.map((item: any) => item.id) } } });
  });
  return expired.length;
}

export async function reserveInventory(variantId: string, quantity: number) {
  if (!variantId || quantity <= 0) return null;
  const prisma = getPrisma() as any;
  await releaseExpiredHolds();

  const reservationId = nanoid();
  const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

  const updated = await prisma.$transaction(async (tx: any) => {
    const result = await tx.variant.updateMany({
      where: { id: variantId, stockQty: { gte: quantity } },
      data: { stockQty: { decrement: quantity } }
    });
    if (result.count === 0) return null;
    await tx.inventoryHold.create({
      data: {
        id: reservationId,
        variantId,
        quantity,
        expiresAt
      }
    });
    return reservationId;
  });

  return updated;
}

export async function extendHoldForOrder(reservationId: string) {
  const prisma = getPrisma() as any;
  const expiresAt = new Date(Date.now() + ORDER_HOLD_TTL_HOURS * 60 * 60 * 1000);
  await prisma.inventoryHold.update({
    where: { id: reservationId },
    data: { expiresAt }
  });
}

export async function releaseInventory(reservationId: string) {
  const prisma = getPrisma() as any;
  const hold = await prisma.inventoryHold.findUnique({ where: { id: reservationId } });
  if (!hold) return false;
  await prisma.$transaction(async (tx: any) => {
    await tx.variant.update({
      where: { id: hold.variantId },
      data: { stockQty: { increment: hold.quantity } }
    });
    await tx.inventoryHold.delete({ where: { id: reservationId } });
  });
  return true;
}

export async function commitInventory(reservationId: string) {
  const prisma = getPrisma() as any;
  const hold = await prisma.inventoryHold.findUnique({ where: { id: reservationId } });
  if (!hold) return false;
  await prisma.inventoryHold.delete({ where: { id: reservationId } });
  return true;
}
