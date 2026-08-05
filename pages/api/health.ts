import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "../../lib/logger";
import { getPool, isDbAvailable } from "../../lib/db";
import { telegramStatus } from "../../lib/telegram";
import { twilioConfigured } from "../../lib/twilio";

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
    // In production a missing/placeholder DATABASE_URL is exactly the
    // misconfiguration the health check exists to catch — fail loudly instead
    // of letting the platform route traffic to a DB-less instance.
    if (process.env.NODE_ENV === "production") {
      healthy = false;
    }
  }

  // Notification wiring, reported as booleans plus Telegram's own error text.
  // No secret is ever included: the bot token lives in the request URL and is
  // never logged or returned, and Telegram's descriptions ("chat not found",
  // "bot can't initiate conversation with a user") carry no credentials. These
  // are the two integrations that fail silently by design — a missing env var
  // simply disables them — so without this the only way to tell a broken config
  // from a broken send is to place a real order and wait.
  const telegram = telegramStatus();
  const notifications = {
    telegram: telegram.configured ? "configured" : "not-configured",
    telegramToken: telegram.hasToken ? "set" : "missing",
    telegramChatId: telegram.hasChatId ? "set" : "missing",
    telegramLastSuccessAt: telegram.lastSuccessAt,
    telegramLastError: telegram.lastError,
    sms: twilioConfigured() ? "configured" : "not-configured"
  };

  return res
    .status(healthy ? 200 : 503)
    .json({ status: healthy ? "ok" : "degraded", checks, notifications, time: new Date().toISOString() });
}
