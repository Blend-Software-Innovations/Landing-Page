import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[health] ${req.method} ${req.url} ${new Date().toISOString()}`);
  return res.status(200).json({ status: "ok", time: new Date().toISOString() });
}
