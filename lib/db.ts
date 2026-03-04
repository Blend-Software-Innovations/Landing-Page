import { Pool } from "pg";

let pool: any = null;

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
    pool = new Pool({ connectionString: url });
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
