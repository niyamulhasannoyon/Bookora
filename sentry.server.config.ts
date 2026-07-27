// Sentry Server-Side Configuration
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// This file runs on the Node.js runtime. It initializes Sentry for:
//   - API route errors
//   - Server component errors
//   - getServerSideProps / getStaticProps errors

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",

  // Performance monitoring: capture 10% of transactions in production
  // Adjust based on traffic volume. 1.0 = 100%, 0.1 = 10%, 0 = disabled
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.0,

  // Only enable Sentry in production to avoid noise during development
  enabled: process.env.NODE_ENV === "production",

  // Granular data collection control (replaces deprecated sendDefaultPii)
  // We explicitly disable collecting user info, cookies, and request/response bodies
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: true, response: true }, // Keep headers for request tracing
    httpBodies: [], // Empty array = disable all body collection
    urlQueryParams: true, // Keep URL params for debugging
  },

  environment: process.env.NODE_ENV || "development",

  // Tag all server-side events with the runtime for easy filtering in Sentry UI
  initialScope: {
    tags: { runtime: "node" },
  },
});
