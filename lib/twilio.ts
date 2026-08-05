import twilio from "twilio";
import { logger } from "./logger";

// Single place that resolves Twilio credentials and builds the client.
//
// The code used to read TWILIO_SID / TWILIO_AUTH / TWILIO_PHONE while the
// deployed app was configured with Twilio's own official names
// (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER). Nothing
// errored — the client was simply never constructed, so every OTP and order
// confirmation SMS silently did not send.
//
// Both spellings are now accepted, official names first, because those are what
// Twilio's own docs and dashboard hand you and therefore what anyone setting
// this up will paste in. The client was also being constructed in five separate
// files; they all come here instead, so a naming fix can never again land in
// four places out of five.

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return "";
}

export function getTwilioSid(): string {
  return readEnv("TWILIO_ACCOUNT_SID", "TWILIO_SID");
}

export function getTwilioAuth(): string {
  return readEnv("TWILIO_AUTH_TOKEN", "TWILIO_AUTH");
}

export function getTwilioPhone(): string {
  return readEnv("TWILIO_PHONE_NUMBER", "TWILIO_PHONE");
}

export function twilioConfigured(): boolean {
  return Boolean(getTwilioSid() && getTwilioAuth() && getTwilioPhone());
}

// Resolved lazily rather than at module load: an API route may be imported
// before the platform has injected the environment, and a cached empty client
// would then be wrong for the process lifetime.
let cached: { key: string; client: ReturnType<typeof twilio> } | null = null;

export function getTwilioClient() {
  const sid = getTwilioSid();
  const auth = getTwilioAuth();
  if (!sid || !auth) return null;
  // Twilio rejects an account sid that does not start with "AC"; catching it
  // here keeps a misconfiguration from throwing inside a request handler.
  if (!sid.startsWith("AC")) {
    logger.error({ sidPrefix: sid.slice(0, 2) }, "Twilio account SID looks invalid (expected it to start with AC)");
    return null;
  }
  const key = `${sid}:${auth}`;
  if (cached?.key === key) return cached.client;
  try {
    const client = twilio(sid, auth);
    cached = { key, client };
    return client;
  } catch (error) {
    logger.error({ err: error }, "Failed to construct Twilio client");
    return null;
  }
}

/** Send an SMS. Returns false instead of throwing — a messaging failure must
 *  never take down the request that triggered it. */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient();
  const from = getTwilioPhone();
  if (!client || !from || !to) return false;
  try {
    await client.messages.create({ to, from, body });
    return true;
  } catch (error) {
    logger.error({ err: error, to }, "Twilio send failed");
    return false;
  }
}
