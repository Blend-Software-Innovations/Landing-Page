import { logger } from "./logger";

// Telegram order alerts.
//
// A COD shop lives on its phone, and Telegram is the fastest way to get an order
// in front of the person who has to call the customer back. Set:
//
//   TELEGRAM_BOT_TOKEN   from @BotFather
//   TELEGRAM_CHAT_ID     your own id, or a group/channel id (starts with -100)
//
// Both unset = feature off, silently. Nothing here is allowed to fail an order:
// a Telegram outage must never stop a sale, so every call is wrapped and timed
// out.

const TELEGRAM_API = "https://api.telegram.org";
const SEND_TIMEOUT_MS = 8000;

export function telegramEnabled(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

// Last failure, kept in memory so it can be surfaced by /api/health. Telegram's
// error descriptions are safe to expose — they say things like "chat not found"
// or "bot can't initiate conversation with a user" and never echo the token,
// which lives in the URL path and is deliberately never logged.
let lastError: { at: string; status: number | null; description: string } | null = null;
let lastSuccessAt: string | null = null;

export function telegramStatus() {
  return {
    configured: telegramEnabled(),
    hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
    lastSuccessAt,
    lastError
  };
}

/** Escape the five characters Telegram's HTML parse mode treats as markup.
 *  Customer names and addresses are untrusted free text — an unescaped "<" both
 *  breaks the message and lets a customer inject formatting into your alerts. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      // Log the status, never the token — the URL contains it.
      const detail = await response.text().catch(() => "");
      let description = detail.slice(0, 300);
      try {
        const parsed = JSON.parse(detail);
        if (parsed?.description) description = String(parsed.description);
      } catch {
        // keep the raw body
      }
      lastError = { at: new Date().toISOString(), status: response.status, description };
      logger.error({ status: response.status, description }, "Telegram send failed");
      return false;
    }
    lastSuccessAt = new Date().toISOString();
    lastError = null;
    return true;
  } catch (error) {
    lastError = {
      at: new Date().toISOString(),
      status: null,
      description: error instanceof Error ? error.message : String(error)
    };
    logger.error({ err: error }, "Telegram send error");
    return false;
  } finally {
    clearTimeout(timer);
  }
}

type OrderItemLike = { quantity?: number; unitPrice?: number; lineTotal?: number; productId?: string | null };

export type OrderAlert = {
  id: string;
  customerName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  deliveryArea?: string | null;
  deliverySlot?: string | null;
  total?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  shippingPartner?: string | null;
  transactionId?: string | null;
  fraudScore?: number | null;
  fraudFlags?: unknown;
  items?: OrderItemLike[];
};

const bdt = (n: unknown) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

export function formatOrderMessage(order: OrderAlert): string {
  const lines: string[] = [];
  const cod = order.paymentMethod === "COD";

  lines.push(cod ? "🛵 <b>নতুন অর্ডার (ক্যাশ অন ডেলিভারি)</b>" : "🧾 <b>নতুন অর্ডার</b>");
  lines.push("");
  lines.push(`<b>${escapeHtml(order.customerName || "—")}</b>`);
  // tel: makes the number tappable in the Telegram app, which is the whole point
  // — the merchant calls to confirm COD orders.
  if (order.phone) lines.push(`📞 <a href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)}</a>`);

  const place = [order.deliveryArea, order.city].filter(Boolean).join(", ");
  if (order.address) lines.push(`📍 ${escapeHtml(order.address)}${place ? ` — ${escapeHtml(place)}` : ""}`);
  else if (place) lines.push(`📍 ${escapeHtml(place)}`);
  if (order.deliverySlot) lines.push(`🕒 ${escapeHtml(order.deliverySlot)}`);

  const items = order.items || [];
  if (items.length) {
    lines.push("");
    for (const item of items) {
      const qty = Number(item.quantity || 1);
      const line = Number(item.lineTotal ?? Number(item.unitPrice || 0) * qty);
      lines.push(`• ${qty} × ${bdt(item.unitPrice)} = ${bdt(line)}`);
    }
  }

  lines.push("");
  lines.push(`💰 <b>মোট ${bdt(order.total)}</b>`);
  const payment = [order.paymentMethod, order.paymentStatus].filter(Boolean).join(" · ");
  if (payment) lines.push(`💳 ${escapeHtml(payment)}`);
  if (order.transactionId) lines.push(`🔖 ${escapeHtml(order.transactionId)}`);
  if (order.shippingPartner) lines.push(`🚚 ${escapeHtml(order.shippingPartner)}`);

  // Surface the fraud signal that already exists rather than making someone open
  // the admin panel to discover it.
  const flags = Array.isArray(order.fraudFlags) ? order.fraudFlags : [];
  if (Number(order.fraudScore || 0) > 0 || flags.length) {
    lines.push(`⚠️ ঝুঁকি ${escapeHtml(order.fraudScore ?? 0)}${flags.length ? ` — ${escapeHtml(flags.join(", "))}` : ""}`);
  }

  lines.push("");
  lines.push(`<code>${escapeHtml(order.id)}</code>`);

  return lines.join("\n");
}

/** Fire-and-forget order alert. Never throws. */
export async function notifyTelegramNewOrder(order: OrderAlert): Promise<void> {
  if (!telegramEnabled()) return;
  try {
    await sendTelegramMessage(formatOrderMessage(order));
  } catch (error) {
    logger.error({ err: error, orderId: order?.id }, "Telegram order alert failed");
  }
}
