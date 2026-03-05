import fs from "fs";
import path from "path";
import { getPool } from "./db";
import { nanoid } from "nanoid";

export type AnalyticsEvent = {
  name: string;
  createdAt: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  referrer?: string;
};

const analyticsPath = path.join(process.cwd(), "data", "analytics.jsonl");

export async function recordEvent(event: AnalyticsEvent) {
  const pool = getPool();
  if (pool) {
    try {
      const id = nanoid();
      await pool.query(
        "insert into analytics_events (id, event_name, payload, created_at, ip, user_agent, referrer) values ($1, $2, $3, $4, $5, $6, $7)",
        [id, event.name, event.payload || {}, event.createdAt, event.ip || null, event.userAgent || null, event.referrer || null]
      );
      return;
    } catch (error) {
      console.error("Failed to save analytics event to database", error);
    }
  }

  try {
    fs.appendFileSync(analyticsPath, `${JSON.stringify(event)}\n`, "utf8");
  } catch (error) {
    console.error("Failed to write analytics event file", error);
  }
}

type AnalyticsSummary = {
  total: number;
  last7Days: number;
  events: Record<string, number>;
};

function parseAnalyticsFile(): AnalyticsEvent[] {
  if (!fs.existsSync(analyticsPath)) return [];
  try {
    const raw = fs.readFileSync(analyticsPath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AnalyticsEvent);
  } catch {
    return [];
  }
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const pool = getPool();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (pool) {
    try {
      const totalRes = await pool.query("select count(*)::int as count from analytics_events");
      const recentRes = await pool.query(
        "select count(*)::int as count from analytics_events where created_at >= $1",
        [since]
      );
      const byEventRes = await pool.query(
        "select event_name, count(*)::int as count from analytics_events group by event_name"
      );
      const events: Record<string, number> = {};
      byEventRes.rows.forEach((row: { event_name: string; count: number }) => {
        events[row.event_name] = row.count;
      });
      return {
        total: totalRes.rows[0]?.count || 0,
        last7Days: recentRes.rows[0]?.count || 0,
        events
      };
    } catch (error) {
      console.error("Failed to load analytics summary from database", error);
    }
  }

  const events = parseAnalyticsFile();
  const eventsMap: Record<string, number> = {};
  events.forEach((event) => {
    eventsMap[event.name] = (eventsMap[event.name] || 0) + 1;
  });
  const last7Days = events.filter((event) => event.createdAt >= since).length;
  return {
    total: events.length,
    last7Days,
    events: eventsMap
  };
}
