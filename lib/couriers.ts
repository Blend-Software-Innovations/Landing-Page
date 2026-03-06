import { env } from "./env";

export type CourierResult = {
  trackingCode: string;
  labelUrl?: string;
  raw?: unknown;
};

export async function createCourierShipment(
  partner: string,
  order: any
): Promise<CourierResult> {
  const key = partner.toLowerCase();
  if (key.includes("steadfast")) {
    if (!env.STEADFAST_API_KEY || !env.STEADFAST_BASE_URL) {
      throw new Error("Steadfast API not configured");
    }
    const response = await fetch(`${env.STEADFAST_BASE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": env.STEADFAST_API_KEY }
      ,
      body: JSON.stringify({ order })
    });
    if (!response.ok) {
      throw new Error("Steadfast API request failed");
    }
    const data = await response.json();
    return { trackingCode: String(data.trackingCode || data.consignment_id || ""), raw: data };
  }
  if (key.includes("pathao")) {
    if (!env.PATHAO_CLIENT_ID || !env.PATHAO_CLIENT_SECRET || !env.PATHAO_BASE_URL) {
      throw new Error("Pathao API not configured");
    }
    const response = await fetch(`${env.PATHAO_BASE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, clientId: env.PATHAO_CLIENT_ID, clientSecret: env.PATHAO_CLIENT_SECRET })
    });
    if (!response.ok) {
      throw new Error("Pathao API request failed");
    }
    const data = await response.json();
    return { trackingCode: String(data.trackingCode || data.consignment_id || ""), raw: data };
  }
  if (key.includes("redx")) {
    if (!env.REDX_API_KEY || !env.REDX_BASE_URL) {
      throw new Error("RedX API not configured");
    }
    const response = await fetch(`${env.REDX_BASE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": env.REDX_API_KEY },
      body: JSON.stringify({ order })
    });
    if (!response.ok) {
      throw new Error("RedX API request failed");
    }
    const data = await response.json();
    return { trackingCode: String(data.trackingCode || data.consignment_id || ""), raw: data };
  }

  throw new Error("Unsupported courier partner");
}
