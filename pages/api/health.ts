import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "../../lib/logger";
import { getPool, isDbAvailable } from "../../lib/db";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const checks: Record<string, string> = {};
  let healthy = true;

  if (isDbAvailable()) {
    try {
      await getPool()!.query("SELECT 1");
      checks.db = "ok";
    } catch (error) {
      logger.error({ err: error }, "health check: database unreachable");
      checks.db = "error";
      healthy = false;
    }
  } else {
    checks.db = "disabled";
  }

  return res
    .status(healthy ? 200 : 503)
    .json({ status: healthy ? "ok" : "degraded", checks, time: new Date().toISOString() });
}
