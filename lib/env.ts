import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_ADMIN_EMAIL: z.string().email().optional(),
  AUTH_ADMIN_PASSWORD: z.string().min(8).optional(),
  AUTH_JWT_SECRET: z.string().min(16),
  AUTH_REFRESH_SECRET: z.string().min(16),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_ALLOWLIST_ORIGINS: z.string().optional(),
  AUTH_RATE_LIMIT_PER_MIN: z.string().optional(),
  ADMIN_RATE_LIMIT_PER_MIN: z.string().optional(),
  PUBLIC_RATE_LIMIT_PER_MIN: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_SID: z.string().optional(),
  TWILIO_AUTH: z.string().optional(),
  TWILIO_PHONE: z.string().optional()
});

export const env = envSchema.parse(process.env);

export const authAllowlist = (env.AUTH_ALLOWLIST_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const authRateLimitPerMin = Number(env.AUTH_RATE_LIMIT_PER_MIN || "20");
export const adminRateLimitPerMin = Number(env.ADMIN_RATE_LIMIT_PER_MIN || "60");
export const publicRateLimitPerMin = Number(env.PUBLIC_RATE_LIMIT_PER_MIN || "120");
