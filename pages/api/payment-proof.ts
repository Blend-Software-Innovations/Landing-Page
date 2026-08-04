import { logger } from "../../lib/logger";
﻿import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import os from "os";
import { uploadImage, sniffImageType } from "../../lib/uploads";
import { priceItems, computeOrderAmounts } from "../../lib/pricing";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { createOrder, updateOrderStatus } from "../../lib/orders";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited, getClientIp } from "../../lib/rateLimit";
import { notifyManualPaymentReview, writeOrderAudit } from "../../lib/notifications";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";
import { detectFraud } from "../../lib/fraud";

export const config = {
  api: { bodyParser: false }
};


function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("8801")) return `+${digits}`;
  if (digits.startsWith("01")) return `+88${digits}`;
  if (digits.startsWith("880")) return `+${digits}`;
  return input;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = getClientIp(req);
  if (await isRateLimited(`payment-proof:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const form = formidable({
    multiples: false,
    uploadDir: os.tmpdir(),
    keepExtensions: true,
    maxFileSize: 6 * 1024 * 1024
  });

  form.parse(req, async (err: unknown, fields: Record<string, any>, files: Record<string, any>) => {
    if (err) return res.status(400).json({ error: "Invalid upload" });
    const proofFile = files.paymentProof as any;
    const file = Array.isArray(proofFile) ? proofFile[0] : proofFile;
    if (!file) return res.status(400).json({ error: "Missing file" });

    try {
      const payloadRaw = String(fields.payload || "{}");
      const payload = JSON.parse(payloadRaw);
      const config = await getConfig();
      if (config.features?.otpEnabled) {
        const normalizedPhone = normalizePhone(String(payload.phone || ""));
        const otpToken = String(payload.otpToken || "");
        if (!otpToken || !(await validateOtpToken(otpToken, normalizedPhone))) {
          return res.status(401).json({ error: "OTP verification required" });
        }
      }
      // Cap order creation per phone as well as per IP — IPs rotate, phones don't.
      const phoneKey = normalizePhone(String(payload.phone || ""));
      if (phoneKey && (await isRateLimited(`orders:phone:${phoneKey}`, 5, 60 * 60_000))) {
        return res.status(429).json({ error: "Too many orders from this phone. Please try again later." });
      }

      const txnId = String(payload.transactionId || "").trim();
      const paidAmount = Number(payload.paidAmount || 0);
      const txnRegex = /^[A-Z0-9]{8,20}$/i;
      if (!txnId || !txnRegex.test(txnId)) {
        return res.status(400).json({ error: "Invalid transaction ID" });
      }

      // The declared mimetype is attacker-controlled; sniff the actual bytes and
      // force a safe extension so no SVG/HTML lands on our origin.
      const imageType = sniffImageType(file.filepath);
      if (!imageType) {
        return res.status(400).json({ error: "Payment proof must be a JPEG, PNG or WebP image" });
      }

      // Server-side pricing — client-sent unitPrice/total are ignored.
      const items = await priceItems(config, payload.items, {
        productId: payload.productId,
        variantId: payload.variantId,
        quantity: payload.quantity,
        optionValues: payload.selectedOptions
      });
      const amounts = computeOrderAmounts(config, items, {
        deliveryArea: String(payload.deliveryArea || ""),
        deliveryZone: String(payload.deliveryZone || ""),
        district: String(payload.district || ""),
        thana: String(payload.thana || ""),
        giftWrap: Boolean(payload.giftWrap)
      });
      const total = amounts.total;

      const reservationIds: string[] = [];
      const resolvedItems = [];
      for (const item of items) {
        if (!item.variantId) {
          resolvedItems.push(item);
          continue;
        }
        const resolvedId = await resolveInventoryVariantId(item.variantId);
        if (!resolvedId) {
          return res.status(409).json({ error: "Insufficient stock" });
        }
        const reservationId = await reserveInventory(resolvedId, item.quantity);
        if (!reservationId) {
          for (const id of reservationIds) {
            await releaseInventory(id);
          }
          return res.status(409).json({ error: "Insufficient stock" });
        }
        reservationIds.push(reservationId);
        resolvedItems.push({ ...item, variantId: resolvedId });
      }
      const upload = await uploadImage(file.filepath, `payment-proof.${imageType.ext}`, "public");
      const fraud = await detectFraud({
        phone: payload.phone || "",
        deviceFingerprint: payload.deviceFingerprint || "",
        transactionId: txnId
      });
      const duplicateTxn = fraud.flags.includes("txn_duplicate");
      // Never auto-verify: the claimed paid amount is client-declared, so a
      // matching number proves nothing. Every non-duplicate submission goes to
      // admin manual review (see admin/manual-payment-review).
      const manualStatus = duplicateTxn ? "REJECTED" : "PENDING";
      const manualReviewedAt = manualStatus === "PENDING" ? null : new Date().toISOString();
      const manualReviewNote = duplicateTxn ? "Duplicate transaction ID" : null;
      const paymentStatus = manualStatus === "REJECTED" ? "UNPAID" : "PARTIAL";
      const order = await createOrder({
        customerName: payload.name || "",
        phone: payload.phone || "",
        address: payload.address || "",
        city: payload.city || "",
        area: payload.area || "",
        total,
        paymentMethod: "MANUAL",
        paymentStatus,
        transactionId: txnId || undefined,
        shippingPartner: payload.shippingPartner || undefined,
        manualStatus,
        manualProofUrl: upload.url,
        manualSubmittedAt: new Date().toISOString(),
        manualReviewedAt: manualReviewedAt || undefined,
        manualReviewNote: manualReviewNote || undefined,
        productId: payload.productId || "",
        variantId: payload.variantId || "",
        quantity: Number(payload.quantity || 1),
        unitPrice: Math.round(total / Math.max(1, Number(payload.quantity || 1))),
        reservationIds,
        items: resolvedItems,
        status: "PENDING",
        deviceFingerprint: payload.deviceFingerprint || undefined,
        fraudFlags: fraud.flags,
        fraudScore: fraud.score,
        paidAmount: paidAmount || undefined,
        utm: payload.utm || undefined
      });
      if (manualStatus === "REJECTED") {
        await updateOrderStatus(order.id, "CANCELED", { role: "system" as any });
        await notifyManualPaymentReview(order, "REJECTED");
      }
      await writeOrderAudit({
        orderId: order.id,
        action: "payment.manual.submitted",
        data: { transactionId: txnId, proofUrl: upload.url, manualStatus }
      });
      return res.status(200).json({ status: "ok", url: upload.url });
    } catch (uploadError) {
      logger.error({ err: uploadError }, "Payment proof upload failed");
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
