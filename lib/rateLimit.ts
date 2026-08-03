import type { NextApiRequest } from "next";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// getClientIp — derive the client IP without trusting attacker-controlled
// headers. X-Forwarded-For is appended to by each proxy hop, so the FIRST
// entry is whatever the client sent and must never be used for rate limiting.
// We take the entry TRUSTED_PROXY_HOPS from the right (default 1 = the address
// the closest trusted proxy saw). Cloudflare's cf-connecting-ip is preferred
// when present because Cloudflare strips any client-sent copy at its edge.
// ---------------------------------------------------------------------------
const trustedProxyHops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS || "1"));

export function getClientIp(req: NextApiRequest): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff.join(",") : xff || "";
  const entries = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (entries.length >= trustedProxyHops) {
    return entries[entries.length - trustedProxyHops];
  }
  return req.socket.remoteAddress || "unknown";
}

// ---------------------------------------------------------------------------
// In-memory fallback store (used when REDIS_URL is not set)
// ---------------------------------------------------------------------------
const store = new Map<string, { count: number; expires: number }>();

// ---------------------------------------------------------------------------
// Redis client — lazily initialised, only if REDIS_URL is configured
// ---------------------------------------------------------------------------
let redisClient: import("ioredis").Redis | null = null;

async function getRedis(): Promise<import("ioredis").Redis | null> {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;
  try {
    const { Redis } = await import("ioredis");
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1
    });
    redisClient.on("error", (err) => logger.error({ err }, "Redis rate-limit client error"));
    await redisClient.connect();
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis — falling back to in-memory rate limiting");
    redisClient = null;
  }
  return redisClient;
}

// ---------------------------------------------------------------------------
// isRateLimited — async, Redis-backed with automatic in-memory fallback
// ---------------------------------------------------------------------------
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redis = await getRedis();

  if (redis) {
    try {
      const windowSec = Math.ceil(windowMs / 1000);
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      return count > limit;
    } catch (err) {
      logger.warn({ err, key }, "Redis rate-limit check failed — falling back to in-memory");
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.expires < now) {
    store.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  entry.count += 1;
  store.set(key, entry);
  return entry.count > limit;
}
