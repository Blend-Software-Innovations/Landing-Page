import fs from "fs";
import path from "path";
import { getPrisma } from "./prisma";
import { extendHoldForOrder, releaseInventory } from "./inventory";
import { notifyNewOrder, notifyOrderStatusChange, writeOrderAudit } from "./notifications";

export type OrderPayload = {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  deliveryArea?: string;
  deliverySlot?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string;
  idempotencyKey?: string;
  manualStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  manualProofUrl?: string;
  manualSubmittedAt?: string;
  manualReviewedAt?: string;
  manualReviewNote?: string;
  shippingPartner?: string;
  paymentProvider?: string;
  paymentLink?: string;
  deviceFingerprint?: string;
  fraudFlags?: string[];
  fraudScore?: number;
  paidAmount?: number;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  productId?: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  reservationId?: string;
  status?: OrderStatus;
  reservationIds?: string[];
  items?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  actor?: string;
  role?: string;
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED"
  | "RETURNED";

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PACKED", "CANCELED"],
  PACKED: ["SHIPPED", "CANCELED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELED: [],
  RETURNED: []
};

function isTransitionAllowed(current: OrderStatus, next: OrderStatus) {
  return STATUS_TRANSITIONS[current]?.includes(next);
}

export async function createOrder(payload: OrderPayload) {
  const prisma = getPrisma() as any;
  const allReservationIds = [
    ...(payload.reservationIds || []),
    ...(payload.reservationId ? [payload.reservationId] : [])
  ].filter(Boolean);
  for (const id of allReservationIds) {
    try {
      await extendHoldForOrder(id);
    } catch {
      // Hold might already be committed or missing; ignore.
    }
  }
  const items = payload.items?.length
    ? payload.items
    : [
        {
          productId: payload.productId || "",
          variantId: payload.variantId || null,
          quantity: payload.quantity,
          unitPrice: payload.unitPrice,
          lineTotal: payload.total
        }
      ];
  const order = await prisma.order.create({
    data: {
      status: payload.status || "PENDING",
      customerName: payload.customerName,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      area: payload.area || null,
      deliveryArea: payload.deliveryArea || null,
      deliverySlot: payload.deliverySlot || null,
      total: payload.total,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentStatus,
      transactionId: payload.transactionId || null,
      idempotencyKey: payload.idempotencyKey || null,
      manualStatus: payload.manualStatus || null,
      manualProofUrl: payload.manualProofUrl || null,
      manualSubmittedAt: payload.manualSubmittedAt ? new Date(payload.manualSubmittedAt) : null,
      manualReviewedAt: payload.manualReviewedAt ? new Date(payload.manualReviewedAt) : null,
      manualReviewNote: payload.manualReviewNote || null,
      shippingPartner: payload.shippingPartner || null,
      paymentProvider: payload.paymentProvider || null,
      paymentLink: payload.paymentLink || null,
      deviceFingerprint: payload.deviceFingerprint || null,
      fraudFlags: payload.fraudFlags?.length ? payload.fraudFlags : null,
      fraudScore: payload.fraudScore || 0,
      paidAmount: payload.paidAmount || null,
      utmSource: payload.utm?.source || null,
      utmMedium: payload.utm?.medium || null,
      utmCampaign: payload.utm?.campaign || null,
      utmContent: payload.utm?.content || null,
      utmTerm: payload.utm?.term || null,
      reservationId: payload.reservationId || null,
      reservationIds: payload.reservationIds?.length ? payload.reservationIds : null,
      items: {
        create: items
      }
    },
    // Return the lines too — the order alert itemises them, and without this
    // Prisma returns the order without its relation.
    include: { items: true }
  });
  await writeOrderAudit({
    orderId: order.id,
    actor: payload.actor,
    role: payload.role,
    action: "order.created",
    data: { status: order.status }
  });
  await notifyNewOrder(order);
  return order;
}

function normalizeReservationIds(order: any) {
  const ids: string[] = [];
  if (order.reservationId) ids.push(order.reservationId);
  if (Array.isArray(order.reservationIds)) ids.push(...order.reservationIds);
  return Array.from(new Set(ids.filter(Boolean)));
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  meta?: { actor?: string; role?: string }
) {
  const prisma = getPrisma() as any;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return null;
  const prevStatus = order.status as OrderStatus;
  if (!isTransitionAllowed(prevStatus, nextStatus)) return null;

  const reservationIds = normalizeReservationIds(order);
  const now = new Date();
  const statusTimestamp: Record<OrderStatus, string> = {
    PENDING: "createdAt",
    CONFIRMED: "confirmedAt",
    PACKED: "packedAt",
    SHIPPED: "shippedAt",
    DELIVERED: "deliveredAt",
    CANCELED: "canceledAt",
    RETURNED: "returnedAt"
  };

  // Inventory adjustment and the status change happen in one transaction so they can never
  // diverge on a partial failure.
  const updated = await prisma.$transaction(async (tx: any) => {
    if (nextStatus === "CONFIRMED" && reservationIds.length) {
      // Commit: drop the holds. Reserved stock was already decremented at reserve time and
      // now counts as sold, so nothing else changes.
      await tx.inventoryHold.deleteMany({ where: { id: { in: reservationIds } } });
    }

    if (nextStatus === "CANCELED" || nextStatus === "RETURNED") {
      if (prevStatus === "PENDING") {
        // Still reserved (not yet committed): return stock by releasing holds that still exist.
        // A missing hold means it already expired and was restored — don't double-restock.
        const holds = reservationIds.length
          ? await tx.inventoryHold.findMany({ where: { id: { in: reservationIds } } })
          : [];
        for (const hold of holds) {
          await tx.variant.update({
            where: { id: hold.variantId },
            data: { stockQty: { increment: hold.quantity } }
          });
          // Restore the FIFO batch quantities this hold had consumed.
          const allocations = Array.isArray(hold.batchAllocations) ? hold.batchAllocations : [];
          for (const a of allocations as Array<{ batchId: string; qty: number }>) {
            if (!a?.batchId || !a?.qty) continue;
            await tx.batch.updateMany({ where: { id: a.batchId }, data: { quantity: { increment: a.qty } } });
          }
        }
        if (holds.length) {
          await tx.inventoryHold.deleteMany({ where: { id: { in: holds.map((h: any) => h.id) } } });
        }
      } else {
        // Order had passed CONFIRMED, so stock was already committed/sold (holds gone). Put the
        // ordered quantities back.
        for (const item of order.items || []) {
          if (!item.variantId) continue;
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stockQty: { increment: item.quantity } }
          });
        }
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus, [statusTimestamp[nextStatus]]: now }
    });
  });

  await writeOrderAudit({
    orderId: order.id,
    actor: meta?.actor,
    role: meta?.role,
    action: "order.status",
    data: { from: prevStatus, to: nextStatus }
  });
  await notifyOrderStatusChange(updated, prevStatus, nextStatus);
  return updated;
}

export async function listOrders(limit = 50) {
  const prisma = getPrisma() as any;
  return prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { items: true }
  });
}

export async function updateOrderTracking(
  orderId: string,
  trackingCode?: string,
  shippingPartner?: string,
  meta?: { actor?: string; role?: string }
) {
  const prisma = getPrisma() as any;
  const data: Record<string, any> = {};
  if (trackingCode !== undefined) data.trackingCode = trackingCode;
  if (shippingPartner !== undefined) data.shippingPartner = shippingPartner || null;
  if (!Object.keys(data).length) return null;
  const order = await prisma.order.update({
    where: { id: orderId },
    data
  });
  await writeOrderAudit({
    orderId,
    actor: meta?.actor,
    role: meta?.role,
    action: "order.tracking",
    data: { trackingCode, shippingPartner: shippingPartner || null }
  });
  return order;
}

export async function listHolds() {
  const prisma = getPrisma() as any;
  return prisma.inventoryHold.findMany({
    orderBy: { expiresAt: "asc" },
    include: {
      variant: { include: { product: true } },
      order: true
    }
  });
}

export async function releaseHoldById(id: string) {
  return releaseInventory(id);
}
