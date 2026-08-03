import crypto from "crypto";

// Inventory holds are referenced from the Stripe success/cancel redirect URLs.
// Signing the id list stops anyone who learns a hold id (via Referer leakage,
// history, or guessing) from committing or releasing someone else's hold.
// Falls back to a per-process random key in dev when no auth secret is set.
const secret =
  process.env.AUTH_JWT_SECRET ||
  process.env.AUTH_REFRESH_SECRET ||
  crypto.randomBytes(32).toString("hex");

export function signReservationIds(ids: string[]): string {
  return crypto
    .createHmac("sha256", secret)
    .update([...ids].sort().join(","))
    .digest("base64url");
}

export function verifyReservationIds(ids: string[], signature: string): boolean {
  if (!ids.length || !signature) return false;
  const expected = signReservationIds(ids);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
