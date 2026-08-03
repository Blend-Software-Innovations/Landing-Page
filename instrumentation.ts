import * as Sentry from "@sentry/nextjs";

// Next.js loads sentry.server/edge.config only through this hook — without it
// no server-side error ever reaches Sentry.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
