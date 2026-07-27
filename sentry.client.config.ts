// Sentry Client-Side Configuration
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// This file runs in the browser. It initializes Sentry for:
//   - Client component errors
//   - Unhandled promise rejections
//   - Session replays (for debugging user interactions)
//   - Browser performance monitoring

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Client-side DSN must use NEXT_PUBLIC_ prefix so it's available in browser
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Performance monitoring: capture 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.0,

  // Session Replay: captures user interactions for debugging
  // Capture 100% of sessions that encounter an error
  replaysOnErrorSampleRate: 1.0,
  // Capture 10% of all sessions for proactive monitoring
  replaysSessionSampleRate: 0.1,

  // Session Replay integration with privacy defaults
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content by default for privacy
      maskAllText: true,
      // Block all media elements by default
      blockAllMedia: true,
    }),
  ],

  // Only enable Sentry in production to avoid noise during development
  enabled: process.env.NODE_ENV === "production",

  // Granular data collection control (replaces deprecated sendDefaultPii)
  dataCollection: {
    userInfo: false,
    httpHeaders: { request: true, response: true },
    httpBodies: [], // Empty array = disable all body collection
    urlQueryParams: true,
  },

  environment: process.env.NODE_ENV || "development",

  // Tag all client-side events for easy filtering
  initialScope: {
    tags: { runtime: "browser" },
  },
});
