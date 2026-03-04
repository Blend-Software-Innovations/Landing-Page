import { getPrisma } from "./prisma";

export async function notifyOrderStatusChange(order: any, previousStatus: string, nextStatus: string) {
  // Placeholder for SMS/email integrations.
  console.log("[notify] order status change", {
    orderId: order.id,
    previousStatus,
    nextStatus,
    customer: order.customerName,
    phone: order.phone
  });
}

export async function notifyNewOrder(order: any) {
  // Placeholder for new-order notifications.
  console.log("[notify] new order", {
    orderId: order.id,
    customer: order.customerName,
    phone: order.phone,
    total: order.total
  });
}

export async function writeOrderAudit(params: {
  orderId: string;
  actor?: string;
  role?: string;
  action: string;
  data?: Record<string, unknown>;
}) {
  const prisma = getPrisma() as any;
  await prisma.auditLog.create({
    data: {
      actor: params.actor || null,
      role: params.role || null,
      action: params.action,
      data: params.data || null
    }
  });
}
