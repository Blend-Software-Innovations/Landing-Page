import type { NextApiRequest, NextApiResponse } from "next";
import PDFDocument from "pdfkit";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-invoice-pdf:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;

  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "Missing id" });
  const prisma = getPrisma() as any;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.id}.pdf`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text("Invoice", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Order ID: ${order.id}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(12).text("Billed To");
  doc.fontSize(10).text(order.customerName);
  doc.text(order.phone);
  doc.text(order.address);
  doc.text(`${order.area ? `${order.area}, ` : ""}${order.city}`);
  doc.moveDown();

  doc.fontSize(12).text("Order Items");
  doc.moveDown(0.5);
  (order.items || []).forEach((item: any) => {
    doc
      .fontSize(10)
      .text(`${item.productId || "Product"} x${item.quantity} — BDT ${item.lineTotal}`);
  });
  doc.moveDown();

  doc.fontSize(12).text(`Total: BDT ${order.total}`, { align: "right" });
  doc.end();
}
