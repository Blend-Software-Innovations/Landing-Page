import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "../../lib/logger";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  logger.info({ method: req.method, url: req.url }, "health check");
  return res.status(200).json({ status: "ok", time: new Date().toISOString() });
}
