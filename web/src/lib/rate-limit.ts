import { NextRequest, NextResponse } from "next/server";
import { getClientIP } from "@/lib/auth/rate-limit";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Max requests allowed within the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/**
 * In-memory sliding-window rate limiter keyed by user ID + IP.
 * Suitable for protecting expensive LLM/AI API calls.
 */
class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Purge expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      // Window expired or first request — start fresh
      const resetAt = now + config.windowSeconds * 1000;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    if (entry.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

const limiter = new RateLimiter();

/** Default config for LLM/AI API routes: 20 requests per 60 seconds per user */
const LLM_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowSeconds: 60,
};

/**
 * Check rate limit for an LLM API route.
 * Call after session validation so `userId` is available.
 *
 * @returns `null` if allowed, or a 429 `NextResponse` to return immediately.
 */
export function checkLLMRateLimit(
  request: NextRequest,
  userId: string,
  config: RateLimitConfig = LLM_RATE_LIMIT,
): NextResponse | null {
  const ip = getClientIP(request) ?? "unknown";
  const key = `llm:${userId}:${ip}`;

  const result = limiter.check(key, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  return null;
}
