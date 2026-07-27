/**
 * Simple in-memory rate limiter for API protection.
 * 
 * Uses a sliding window algorithm to limit requests per IP/identifier.
 * In production, replace with Redis-based rate limiting (e.g., upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export const DEFAULT_RATE_LIMITS = {
  /** Public booking creation: 10 requests per minute per IP */
  BOOKING_CREATE: { maxRequests: 10, windowMs: 60 * 1000 },
  /** Slot availability queries: 60 requests per minute per IP */
  SLOTS_QUERY: { maxRequests: 60, windowMs: 60 * 1000 },
  /** Authentication endpoints: 5 requests per minute per IP */
  AUTH: { maxRequests: 5, windowMs: 60 * 1000 },
  /** Checkout session creation: 10 requests per minute per IP */
  CHECKOUT: { maxRequests: 10, windowMs: 60 * 1000 },
  /** General API: 30 requests per minute per IP */
  GENERAL: { maxRequests: 30, windowMs: 60 * 1000 },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Checks whether a request from the given identifier is within the rate limit.
 * Returns the result with remaining quota info.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS.GENERAL
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // First request or window expired - create new window
    store.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  entry.count += 1;

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: config.maxRequests,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  };
}

/**
 * Extracts a client identifier from a Request object.
 * Uses IP address, falling back to a combination of headers.
 */
export function getClientIdentifier(req: Request): string {
  // Try Cloudflare/Proxy headers first
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a combination of less reliable headers
  const acceptLanguage = req.headers.get("accept-language") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  // Create a hash-like identifier from available headers
  return `anon:${acceptLanguage.length}:${userAgent.length}`;
}

/**
 * Higher-order function that wraps an API route handler with rate limiting.
 * Returns a 429 response if rate limit is exceeded.
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS.GENERAL
) {
  return async (req: Request): Promise<Response> => {
    const identifier = getClientIdentifier(req);
    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
          },
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers to the response if it's a NextResponse-like object
    if (response && typeof response === "object" && "headers" in response) {
      try {
        const headers = new Headers(response.headers);
        headers.set("X-RateLimit-Limit", String(result.limit));
        headers.set("X-RateLimit-Remaining", String(result.remaining));
        headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch {
        // If modifying headers fails, return original response
        return response;
      }
    }

    return response;
  };
}
