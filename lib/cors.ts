import type { NextApiRequest, NextApiResponse } from "next";
import { authAllowlist } from "./env";

export function applyCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || "";
  if (authAllowlist.length && origin && !authAllowlist.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return false;
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }

  return true;
}
