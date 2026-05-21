import { Pool } from "pg";

let pool: any = null;

// Hosted Postgres (e.g. DigitalOcean Managed DB) presents a CA that the Node `pg` client does
// not trust by default, which throws SELF_SIGNED_CERT_IN_CHAIN. Verify the chain against the
// provider's CA certificate (set DATABASE_CA_CERT — on DO App Platform bind it to ${db.CA_CERT}).
// Skip SSL for local or explicitly-disabled connections.
export function pgSsl(url: string): false | { ca?: string; rejectUnauthorized: boolean } {
  if (!url) return false;
  if (/sslmode=disable/.test(url)) return false;
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) return false;
  const ca = process.env.DATABASE_CA_CERT;
  if (ca && ca.includes("BEGIN CERTIFICATE")) return { ca, rejectUnauthorized: true };
  // Opt-in escape hatch for DBs that don't expose a CA cert (e.g. DO dev databases): keep the
  // connection encrypted but skip certificate verification. Safe only when the DB is reachable
  // solely over a trusted private network with restricted sources. For production, use a managed
  // DB and provide DATABASE_CA_CERT so the chain is verified instead.
  if (process.env.DATABASE_SSL_NO_VERIFY === "true") return { rejectUnauthorized: false };
  // Default: verify against the system trust store (fails clearly if a hosted CA cert is needed).
  return { rejectUnauthorized: true };
}

// Strip ssl-related params from the connection string so our explicit `ssl` config (pgSsl) is the
// single source of truth for TLS. Otherwise pg-connection-string interprets sslmode=require as
// verify-full and overrides our settings (causing SELF_SIGNED_CERT_IN_CHAIN against hosted DBs).
export function pgConnectionString(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    for (const p of ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey"]) {
      u.searchParams.delete(p);
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function isDbAvailable() {
  const url = process.env.DATABASE_URL || "";
  if (!url) return false;
  if (process.env.DISABLE_DB === "1") return false;
  if (url.includes("USER:PASSWORD")) return false;
  return true;
}

export function getPool(): any | null {
  const url = process.env.DATABASE_URL || "";
  if (!isDbAvailable()) return null;
  if (!pool) {
    pool = new Pool({ connectionString: pgConnectionString(url), ssl: pgSsl(url) });
  }
  return pool;
}

export function requireDb(res: { status: (code: number) => any }) {
  if (!isDbAvailable()) {
    res.status(503).json({ error: "Database unavailable" });
    return false;
  }
  return true;
}
