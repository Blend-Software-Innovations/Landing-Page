import type { NextApiRequest, NextApiResponse } from "next";
import { authAllowlist } from "./env";

export function applyCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || "";
  if (authAllowlist.length && origin && !authAllowlist.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return false;
  }

  // Default-deny: CORS headers are only emitted for explicitly allowlisted origins.
  // With an empty allowlist no Access-Control-Allow-Origin is set at all — same-origin
  // requests do not need it, and reflecting arbitrary origins with credentials enabled
  // would let any site read authenticated responses.
  if (origin && authAllowlist.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }

  return true;
}
