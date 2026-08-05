import { logger } from "./logger";
import { getPrisma } from "./prisma";
import { notifyTelegramNewOrder } from "./telegram";
import { sendSms } from "./twilio";

export async function notifyOrderStatusChange(order: any, previousStatus: string, nextStatus: string) {
  // Placeholder for SMS/email integrations.
  logger.info({ orderId: order.id, previousStatus, nextStatus, customer: order.customerName }, "order status change");
}

export async function notifyNewOrder(order: any) {
  logger.info({ orderId: order.id, customer: order.customerName, total: order.total }, "new order");
  // Every order path (COD, payment link, manual proof, Stripe webhook) reaches
  // this through createOrder, so the alert is wired once here rather than in
  // four endpoints.
  //
  // Deliberately NOT awaited: createOrder awaits this function, so awaiting the
  // send would put a round-trip to Telegram (up to its timeout) between the
  // buyer pressing Order and getting a response. The alert is for the merchant,
  // not the customer, so it must not sit in the checkout path. Safe to float
  // here because the app runs as a persistent Node server, and
  // notifyTelegramNewOrder swallows its own errors.
  void notifyTelegramNewOrder(order);
}

export async function notifyManualPaymentReview(order: any, status: "VERIFIED" | "REJECTED") {
  if (!order?.phone) return;
  const name = order.customerName || "Customer";
  const message =
    status === "VERIFIED"
      ? `Hi ${name}, your manual payment has been verified. Your order is confirmed.`
      : `Hi ${name}, your manual payment could not be verified. Please contact support.`;
  await sendSms(order.phone, message);
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
