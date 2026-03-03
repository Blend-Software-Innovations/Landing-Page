import fs from "fs";
import path from "path";
import { getPool } from "./db";
import type { SiteConfig } from "./siteConfig";

export type AuditEntry = {
  id: string;
  configId: string;
  createdAt: string;
  actor?: string;
  role?: string;
  ip?: string;
  note?: string;
  data: SiteConfig;
};

const auditPath = path.join(process.cwd(), "data", "audit.json");
const configId = process.env.CONFIG_ID || "default";

function loadFileAudit(): AuditEntry[] {
  if (!fs.existsSync(auditPath)) return [];
  try {
    const raw = fs.readFileSync(auditPath, "utf8");
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFileAudit(entries: AuditEntry[]) {
  const trimmed = entries.slice(0, 50);
  fs.writeFileSync(auditPath, JSON.stringify(trimmed, null, 2), "utf8");
}

export async function appendAudit(entry: Omit<AuditEntry, "id" | "createdAt" | "configId">) {
  const pool = getPool();
  const createdAt = new Date().toISOString();
  if (pool) {
    try {
      await pool.query(
        "insert into site_config_audit (config_id, created_at, actor, role, ip, note, data) values ($1, $2, $3, $4, $5, $6, $7)",
        [configId, createdAt, entry.actor || null, entry.role || null, entry.ip || null, entry.note || null, entry.data]
      );
      return;
    } catch (error) {
      console.error("Failed to save audit log to database", error);
    }
  }

  const current = loadFileAudit();
  const next: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    configId,
    createdAt,
    actor: entry.actor,
    role: entry.role,
    ip: entry.ip,
    note: entry.note,
    data: entry.data
  };
  saveFileAudit([next, ...current]);
}

export async function getAuditLog(limit = 20): Promise<Omit<AuditEntry, "data">[]> {
  const pool = getPool();
  if (pool) {
    try {
      const result = await pool.query(
        "select id, config_id, created_at, actor, role, ip, note from site_config_audit where config_id = $1 order by created_at desc limit $2",
        [configId, limit]
      );
      return result.rows.map(
        (row: {
          id: string | number;
          config_id: string;
          created_at: string;
          actor?: string | null;
          role?: string | null;
          ip?: string | null;
          note?: string | null;
        }) => ({
          id: String(row.id),
          configId: row.config_id,
          createdAt: row.created_at,
          actor: row.actor || undefined,
          role: row.role || undefined,
          ip: row.ip || undefined,
          note: row.note || undefined
        })
      );
    } catch (error) {
      console.error("Failed to load audit log from database", error);
    }
  }

  const current = loadFileAudit();
  return current.slice(0, limit).map(({ data, ...rest }) => rest);
}

export async function getAuditEntry(id: string): Promise<AuditEntry | null> {
  const pool = getPool();
  if (pool) {
    try {
      const result = await pool.query(
        "select id, config_id, created_at, actor, role, ip, note, data from site_config_audit where id = $1",
        [id]
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: String(row.id),
        configId: row.config_id,
        createdAt: row.created_at,
        actor: row.actor || undefined,
        role: row.role || undefined,
        ip: row.ip || undefined,
        note: row.note || undefined,
        data: row.data as SiteConfig
      };
    } catch (error) {
      console.error("Failed to load audit entry from database", error);
    }
  }

  const current = loadFileAudit();
  return current.find((entry) => entry.id === id) || null;
}
