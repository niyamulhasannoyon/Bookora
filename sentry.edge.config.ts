// Sentry Edge Runtime Configuration
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// This file runs on the Edge Runtime (Vercel Edge Functions, Middleware).
// Edge Runtime is limited to Web APIs only (no Node.js).
// It initializes Sentry for:
//   - Edge API route errors
//   - Middleware errors
//   - Edge functions
//
// Note: Session Replay and Profiling are NOT available on Edge Runtime.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",

  // Performance monitoring: lower sample rate for edge functions
  // Edge functions are short-lived, so high sampling can add overhead
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.0,

  // Only enable Sentry in production to avoid noise during development
  enabled: process.env.NODE_ENV === "production",

  // Granular data collection control (replaces deprecated sendDefaultPii)
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: true, response: true },
    httpBodies: [], // Empty array = disable all body collection
    urlQueryParams: true,
  },

  environment: process.env.NODE_ENV || "development",

  // Tag all edge events for easy filtering
  initialScope: {
    tags: { runtime: "edge" },
  },
});
