// @ts-check
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Allow next/image to optimize remote images from Cloudinary and DigitalOcean Spaces.
    // Without this, next/image returns 400 for these hosts and images appear broken.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.digitaloceanspaces.com" }
    ]
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Prevent clickjacking
        { key: "X-Frame-Options", value: "DENY" },
        // Prevent MIME-sniffing
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Referrer leakage control
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Disable browser features not used
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=(self)"
        },
        // Force HTTPS for 1 year (only active once HTTPS is confirmed)
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload"
        },
        // CSP: allows GTM, GA4, FB Pixel, Stripe + self
        // unsafe-inline needed for Next.js inline scripts and GTM
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://js.stripe.com https://checkout.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://www.google-analytics.com https://stats.g.doubleclick.net https://www.facebook.com https://api.stripe.com https://checkout.stripe.com https://sentry.io https://*.ingest.sentry.io",
            "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'"
          ].join("; ")
        }
      ]
    }
  ]
};

const sentryWebpackPluginOptions = {
  // Suppresses source map upload logs during build
  silent: true,
  // Upload source maps only in production CI (set SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT)
  dryRun: process.env.NODE_ENV !== "production" || !process.env.SENTRY_AUTH_TOKEN
};

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
