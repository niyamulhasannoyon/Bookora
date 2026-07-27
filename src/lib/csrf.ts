/**
 * CSRF Protection Utility
 *
 * Protects state-changing API routes from Cross-Site Request Forgery by
 * validating the Origin and Referer headers against the application's allowed origins.
 *
 * For Next.js server actions, Next.js already includes CSRF protection via
 * the `__Host-` prefix on the session cookie and the built-in action ID checks.
 * This utility protects custom API routes that don't have that protection.
 */

import { NextResponse } from "next/server";

/**
 * Returns the list of allowed origins for CSRF validation.
 * In production, this should be the actual deployment URL.
 */
function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const origins = [appUrl];

  // Allow localhost equivalents for development
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
    origins.push("http://localhost:3001");
    origins.push("http://127.0.0.1:3001");
  }

  // Add any additional origins from environment variable
  if (process.env.CSRF_ALLOWED_ORIGINS) {
    process.env.CSRF_ALLOWED_ORIGINS.split(",").forEach((origin) => {
      const trimmed = origin.trim();
      if (trimmed) {
        origins.push(trimmed);
      }
    });
  }

  return [...new Set(origins)]; // Deduplicate
}

/**
 * Validates the Origin/Referer header of a request.
 * Returns true if the request is from an allowed origin.
 */
export function validateCsrfOrigin(req: Request): { valid: boolean; reason?: string } {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Stripe webhooks and cron jobs have their own auth mechanism (authorization header)
  // Allow requests with authorization header to bypass CSRF origin check
  if (req.headers.get("authorization")) {
    return { valid: true };
  }

  // If both Origin and Referer are missing, it might be a programmatic API call
  if (!origin && !referer) {
    return { valid: true, reason: "No origin or referer header - allowing programmatic access" };
  }

  // Extract the origin from either header
  const requestOrigin = origin || referer || "";
  let originHost: string;

  try {
    originHost = new URL(requestOrigin).origin;
  } catch {
    return { valid: false, reason: "Invalid origin URL format" };
  }

  // Check if the origin is in the allowed list
  if (allowedOrigins.includes(originHost)) {
    return { valid: true };
  }

  // For embed routes, allow the embed origin
  if (process.env.EMBED_ALLOWED_ORIGINS) {
    const embedOrigins = process.env.EMBED_ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    if (embedOrigins.includes(originHost)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: `Origin '${originHost}' is not allowed` };
}

/**
 * Higher-order function to wrap API route handlers with CSRF protection.
 * Only applies to POST, PUT, PATCH, DELETE methods.
 * Works correctly with NextResponse (preserves response extensions).
 */
export function withCsrfProtection(
  handler: (req: Request) => Promise<NextResponse>,
  options: { skipMethods?: string[] } = {}
) {
  return async (req: Request): Promise<NextResponse> => {
    const method = req.method.toUpperCase();

    // Only protect state-changing methods
    const skipMethods = options.skipMethods || [];
    if (["GET", "HEAD", "OPTIONS"].includes(method) || skipMethods.includes(method)) {
      return handler(req);
    }

    // Check for authorization header (Bearer token, Basic auth, etc.)
    if (req.headers.get("authorization")) {
      return handler(req);
    }

    const { valid, reason } = validateCsrfOrigin(req);

    if (!valid) {
      console.warn(`[CSRF] Blocked ${method} request: ${reason}`);
      return NextResponse.json(
        { error: "CSRF validation failed. Request origin is not allowed." },
        { status: 403 }
      );
    }

    return handler(req);
  };
}
