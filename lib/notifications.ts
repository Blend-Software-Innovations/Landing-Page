import { getPrisma } from "./prisma";
import twilio from "twilio";

const twilioSid = process.env.TWILIO_SID || "";
const twilioAuth = process.env.TWILIO_AUTH || "";
const twilioPhone = process.env.TWILIO_PHONE || "";
const twilioClient = twilioSid && twilioAuth ? twilio(twilioSid, twilioAuth) : null;

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

export async function notifyManualPaymentReview(order: any, status: "VERIFIED" | "REJECTED") {
  if (!twilioClient || !twilioPhone || !order?.phone) return;
  const name = order.customerName || "Customer";
  const message =
    status === "VERIFIED"
      ? `Hi ${name}, your manual payment has been verified. Your order is confirmed.`
      : `Hi ${name}, your manual payment could not be verified. Please contact support.`;
  try {
    await twilioClient.messages.create({
      to: order.phone,
      from: twilioPhone,
      body: message
    });
  } catch (error) {
    console.error("Manual payment SMS failed", error);
  }
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
