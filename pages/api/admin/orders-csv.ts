import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { listOrders } from "../../../lib/orders";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";

function csvEscape(value: string) {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`admin-orders-csv:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;

  const statusFilter = String(req.query.status || "").toUpperCase();
  const orders = await listOrders(200);
  const filtered = statusFilter
    ? orders.filter((order: any) => order.status === statusFilter)
    : orders;

  const header = [
    "OrderId",
    "Name",
    "Phone",
    "Address",
    "City",
    "Area",
    "CODAmount",
    "Notes",
    "Items",
    "Status",
    "TrackingCode",
    "Courier",
    "PaymentProvider",
    "PaidAmount",
    "FraudFlags",
    "FraudScore",
    "PaymentLink",
    "CallStatus",
    "CallNotes"
  ];
  const rows: string[][] = filtered.map((order: any) => {
    const items = (order.items || [])
      .map((item: any) => `${item.productId}${item.variantId ? `(${item.variantId})` : ""} x${item.quantity}`)
      .join("; ");
    const codAmount = order.paymentMethod === "COD" ? order.total : 0;
    return [
      order.id,
      order.customerName,
      order.phone,
      order.address,
      order.city,
      order.area || "",
      String(codAmount),
      "",
      items,
      order.status,
      order.trackingCode || "",
      order.shippingPartner || "",
      order.paymentProvider || "",
      order.paidAmount ? String(order.paidAmount) : "",
      Array.isArray(order.fraudFlags) ? order.fraudFlags.join("|") : "",
      order.fraudScore ? String(order.fraudScore) : "",
      order.paymentLink || "",
      order.callStatus || "",
      order.callNotes || ""
    ].map((value) => csvEscape(String(value)));
  });

  const csv = [header.map(csvEscape).join(","), ...rows.map((row: string[]) => row.join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  return res.status(200).send(csv);
}
