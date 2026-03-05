import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { getOtpMetrics } from "../../../lib/otp";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  return value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "analytics:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-otp-metrics-csv:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;

  const rows = getOtpMetrics();
  const header = ["Phone", "Attempts", "Pending", "LastRequested", "CooldownUntil", "LockedUntil"];
  const lines = [header.join(",")];
  rows.forEach((row) => {
    lines.push(
      [
        escapeCsv(row.phone),
        String(row.attempts || 0),
        String(row.pending || 0),
        escapeCsv(row.lastRequested || ""),
        escapeCsv(row.cooldownUntil || ""),
        escapeCsv(row.lockedUntil || "")
      ].join(",")
    );
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=otp-metrics.csv");
  return res.status(200).send(lines.join("\n"));
}
