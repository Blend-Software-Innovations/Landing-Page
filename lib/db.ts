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
  if (ca) return { ca, rejectUnauthorized: true };
  // No CA provided: verify against the system trust store. For DO Managed PG this means
  // DATABASE_CA_CERT must be set, otherwise the connection fails (rather than skipping verification).
  return { rejectUnauthorized: true };
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
    pool = new Pool({ connectionString: url, ssl: pgSsl(url) });
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
