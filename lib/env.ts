import { z } from "zod";

// A variable created in a dashboard and left blank arrives as "" — which
// `.optional()` does NOT accept, and a single failing field would 500 the
// entire app at import time. Treat empty strings as unset everywhere.
const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_ADMIN_EMAIL: blankAsUndefined(z.string().email().optional()),
  AUTH_ADMIN_PASSWORD: blankAsUndefined(z.string().min(8).optional()),
  AUTH_JWT_SECRET: blankAsUndefined(z.string().min(16).optional()),
  AUTH_REFRESH_SECRET: blankAsUndefined(z.string().min(16).optional()),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_ALLOWLIST_ORIGINS: z.string().optional(),
  AUTH_RATE_LIMIT_PER_MIN: z.string().optional(),
  ADMIN_RATE_LIMIT_PER_MIN: z.string().optional(),
  PUBLIC_RATE_LIMIT_PER_MIN: z.string().optional(),
  OTP_LENGTH: z.string().optional(),
  OTP_TTL_MIN: z.string().optional(),
  OTP_SESSION_TTL_MIN: z.string().optional(),
  OTP_RESEND_COOLDOWN_SEC: z.string().optional(),
  OTP_LOCKOUT_MAX_ATTEMPTS: z.string().optional(),
  OTP_LOCKOUT_MIN: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
  NEXT_PUBLIC_GA4_ID: z.string().optional(),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DATABASE_CA_CERT: z.string().optional(),
  DATABASE_SSL_NO_VERIFY: z.string().optional(),
  DISABLE_DB: z.string().optional(),
  CONFIG_ID: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_BOT_TOKEN: blankAsUndefined(z.string().optional()),
  TELEGRAM_CHAT_ID: blankAsUndefined(z.string().optional()),
  // Twilio's own names, which is what the dashboard and their docs give you.
  TWILIO_ACCOUNT_SID: blankAsUndefined(z.string().optional()),
  TWILIO_AUTH_TOKEN: blankAsUndefined(z.string().optional()),
  TWILIO_PHONE_NUMBER: blankAsUndefined(z.string().optional()),
  // Legacy short names, still accepted so an existing deployment keeps working.
  TWILIO_SID: blankAsUndefined(z.string().optional()),
  TWILIO_AUTH: blankAsUndefined(z.string().optional()),
  TWILIO_PHONE: blankAsUndefined(z.string().optional()),
  META_PIXEL_ID: z.string().optional(),
  META_CAPI_TOKEN: z.string().optional(),
  META_TEST_EVENT_CODE: z.string().optional(),
  STEADFAST_API_KEY: z.string().optional(),
  STEADFAST_SECRET_KEY: blankAsUndefined(z.string().optional()),
  PATHAO_USERNAME: blankAsUndefined(z.string().optional()),
  PATHAO_PASSWORD: blankAsUndefined(z.string().optional()),
  PATHAO_STORE_ID: blankAsUndefined(z.string().optional()),
  STEADFAST_BASE_URL: z.string().optional(),
  PATHAO_CLIENT_ID: z.string().optional(),
  PATHAO_CLIENT_SECRET: z.string().optional(),
  PATHAO_BASE_URL: z.string().optional(),
  REDX_API_KEY: z.string().optional(),
  REDX_BASE_URL: z.string().optional(),
  REDIS_URL: blankAsUndefined(z.string().url().optional()),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SENTRY_DSN: blankAsUndefined(z.string().url().optional()),
  NEXT_PUBLIC_SENTRY_DSN: blankAsUndefined(z.string().url().optional()),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional()
});

export const env = envSchema.parse(process.env);

export const authAllowlist = (env.AUTH_ALLOWLIST_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const authRateLimitPerMin = Number(env.AUTH_RATE_LIMIT_PER_MIN || "20");
export const adminRateLimitPerMin = Number(env.ADMIN_RATE_LIMIT_PER_MIN || "60");
export const publicRateLimitPerMin = Number(env.PUBLIC_RATE_LIMIT_PER_MIN || "120");
export const otpLength = Number(env.OTP_LENGTH || "6");
export const otpTtlMin = Number(env.OTP_TTL_MIN || "5");
export const otpSessionTtlMin = Number(env.OTP_SESSION_TTL_MIN || "30");
export const otpResendCooldownSec = Number(env.OTP_RESEND_COOLDOWN_SEC || "60");
export const otpLockoutMaxAttempts = Number(env.OTP_LOCKOUT_MAX_ATTEMPTS || "5");
export const otpLockoutMin = Number(env.OTP_LOCKOUT_MIN || "10");
