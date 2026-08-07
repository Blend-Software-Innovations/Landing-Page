import { logger } from "./logger";

export type CourierResult = {
  trackingCode: string;
  consignmentId?: string;
  labelUrl?: string;
  raw?: unknown;
};

export type CourierOrder = {
  id: string;
  customerName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  deliveryArea?: string | null;
  total?: number | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  items?: Array<{ quantity?: number | null }> | null;
};

const REQUEST_TIMEOUT_MS = 15_000;
/** Fallback parcel weight in kg when nothing better is known. Couriers reject a
 *  zero weight, and most BD APIs bill by half-kilo steps. */
const DEFAULT_PARCEL_KG = 0.5;

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function missing(...names: string[]): string[] {
  return names.filter((n) => !env(n));
}

/** The amount the rider must collect.
 *
 *  This is the single most dangerous field in the whole integration: booking a
 *  prepaid order with a COD amount makes the courier charge the customer twice.
 *  Only an order that is genuinely unpaid carries a collection amount. */
export function codAmountFor(order: CourierOrder): number {
  const paid = order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED";
  if (paid) return 0;
  const total = Number(order.total || 0);
  return total > 0 ? Math.round(total) : 0;
}

export function parcelWeightKg(order: CourierOrder): number {
  const units = (order.items || []).reduce((sum, i) => sum + Number(i?.quantity || 0), 0);
  return Math.max(DEFAULT_PARCEL_KG, Number((units * DEFAULT_PARCEL_KG).toFixed(2)));
}

export function fullAddress(order: CourierOrder): string {
  return [order.address, order.deliveryArea || order.area, order.city]
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(", ");
}

/** Bangladeshi couriers want a local 11-digit number, not +880. */
export function localPhone(input: string | null | undefined): string {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

async function postJson(url: string, body: unknown, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!response.ok) {
      // Log the courier's own message — "invalid phone", "zone required" — or a
      // booking failure is impossible to diagnose from a bare status code.
      logger.error({ url, status: response.status, body: text.slice(0, 500) }, "Courier API rejected the request");
      const detail = parsed?.message || parsed?.error || `HTTP ${response.status}`;
      throw new Error(`Courier rejected the booking: ${detail}`);
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Steadfast — API key + secret key, no OAuth.
// ---------------------------------------------------------------------------
async function createSteadfast(order: CourierOrder): Promise<CourierResult> {
  const gaps = missing("STEADFAST_API_KEY", "STEADFAST_SECRET_KEY", "STEADFAST_BASE_URL");
  if (gaps.length) throw new Error(`Steadfast is not configured. Missing: ${gaps.join(", ")}`);

  const data = await postJson(
    `${env("STEADFAST_BASE_URL").replace(/\/$/, "")}/create_order`,
    {
      // Steadfast rejects a duplicate invoice, which is what makes a retry safe.
      invoice: order.id,
      recipient_name: order.customerName || "Customer",
      recipient_phone: localPhone(order.phone),
      recipient_address: fullAddress(order),
      cod_amount: codAmountFor(order),
      note: order.deliveryArea || ""
    },
    { "Api-Key": env("STEADFAST_API_KEY"), "Secret-Key": env("STEADFAST_SECRET_KEY") }
  );

  // Steadfast nests the result: { status, consignment: { consignment_id, tracking_code } }
  const consignment = data?.consignment || data?.data || {};
  const trackingCode = String(consignment.tracking_code || consignment.trackingCode || "");
  if (!trackingCode) {
    logger.error({ orderId: order.id, response: data }, "Steadfast returned no tracking code");
    throw new Error("Steadfast accepted the booking but returned no tracking code");
  }
  return { trackingCode, consignmentId: String(consignment.consignment_id || ""), raw: data };
}

// ---------------------------------------------------------------------------
// Pathao — OAuth2. The token is cached because issuing one per booking gets the
// merchant rate-limited.
// ---------------------------------------------------------------------------
let pathaoToken: { value: string; expiresAt: number } | null = null;

async function pathaoAccessToken(base: string): Promise<string> {
  if (pathaoToken && pathaoToken.expiresAt > Date.now() + 60_000) return pathaoToken.value;
  const data = await postJson(
    `${base}/aladdin/api/v1/issue-token`,
    {
      client_id: env("PATHAO_CLIENT_ID"),
      client_secret: env("PATHAO_CLIENT_SECRET"),
      username: env("PATHAO_USERNAME"),
      password: env("PATHAO_PASSWORD"),
      grant_type: "password"
    },
    {}
  );
  const token = String(data?.access_token || "");
  if (!token) throw new Error("Pathao did not return an access token");
  const ttl = Number(data?.expires_in || 3600) * 1000;
  pathaoToken = { value: token, expiresAt: Date.now() + ttl };
  return token;
}

async function createPathao(order: CourierOrder): Promise<CourierResult> {
  const gaps = missing(
    "PATHAO_CLIENT_ID",
    "PATHAO_CLIENT_SECRET",
    "PATHAO_USERNAME",
    "PATHAO_PASSWORD",
    "PATHAO_STORE_ID",
    "PATHAO_BASE_URL"
  );
  if (gaps.length) throw new Error(`Pathao is not configured. Missing: ${gaps.join(", ")}`);

  const base = env("PATHAO_BASE_URL").replace(/\/$/, "");
  const token = await pathaoAccessToken(base);
  const data = await postJson(
    `${base}/aladdin/api/v1/orders`,
    {
      store_id: Number(env("PATHAO_STORE_ID")),
      merchant_order_id: order.id,
      recipient_name: order.customerName || "Customer",
      recipient_phone: localPhone(order.phone),
      recipient_address: fullAddress(order),
      delivery_type: 48, // 48 = normal, 12 = on-demand
      item_type: 2, // 2 = parcel
      item_quantity: Math.max(1, (order.items || []).reduce((s, i) => s + Number(i?.quantity || 0), 0)),
      item_weight: parcelWeightKg(order),
      amount_to_collect: codAmountFor(order),
      item_description: `Order ${order.id}`
    },
    { Authorization: `Bearer ${token}` }
  );

  const payload = data?.data || data || {};
  const trackingCode = String(payload.consignment_id || payload.tracking_code || "");
  if (!trackingCode) {
    logger.error({ orderId: order.id, response: data }, "Pathao returned no consignment id");
    throw new Error("Pathao accepted the booking but returned no consignment id");
  }
  return { trackingCode, consignmentId: trackingCode, raw: data };
}

// ---------------------------------------------------------------------------
// RedX — bearer token in a custom header.
// ---------------------------------------------------------------------------
async function createRedx(order: CourierOrder): Promise<CourierResult> {
  const gaps = missing("REDX_API_KEY", "REDX_BASE_URL");
  if (gaps.length) throw new Error(`RedX is not configured. Missing: ${gaps.join(", ")}`);

  const data = await postJson(
    `${env("REDX_BASE_URL").replace(/\/$/, "")}/v1.0.0-beta/parcel`,
    {
      customer_name: order.customerName || "Customer",
      customer_phone: localPhone(order.phone),
      customer_address: fullAddress(order),
      delivery_area: order.deliveryArea || order.city || "",
      merchant_invoice_id: order.id,
      cash_collection_amount: String(codAmountFor(order)),
      parcel_weight: Math.round(parcelWeightKg(order) * 1000), // grams
      value: Math.round(Number(order.total || 0)),
      instruction: ""
    },
    { "API-ACCESS-TOKEN": `Bearer ${env("REDX_API_KEY")}` }
  );

  const trackingCode = String(data?.tracking_id || data?.trackingId || "");
  if (!trackingCode) {
    logger.error({ orderId: order.id, response: data }, "RedX returned no tracking id");
    throw new Error("RedX accepted the booking but returned no tracking id");
  }
  return { trackingCode, consignmentId: trackingCode, raw: data };
}

/** Which partners are usable right now — drives the admin UI so an operator
 *  cannot pick a courier whose keys are absent. */
export function configuredCouriers(): string[] {
  const out: string[] = [];
  if (!missing("STEADFAST_API_KEY", "STEADFAST_SECRET_KEY", "STEADFAST_BASE_URL").length) out.push("Steadfast");
  if (
    !missing(
      "PATHAO_CLIENT_ID",
      "PATHAO_CLIENT_SECRET",
      "PATHAO_USERNAME",
      "PATHAO_PASSWORD",
      "PATHAO_STORE_ID",
      "PATHAO_BASE_URL"
    ).length
  )
    out.push("Pathao");
  if (!missing("REDX_API_KEY", "REDX_BASE_URL").length) out.push("RedX");
  return out;
}

export async function createCourierShipment(partner: string, order: CourierOrder): Promise<CourierResult> {
  const key = String(partner || "").toLowerCase();
  if (key.includes("steadfast")) return createSteadfast(order);
  if (key.includes("pathao")) return createPathao(order);
  if (key.includes("redx")) return createRedx(order);
  throw new Error(`Unsupported courier partner: ${partner}`);
}
