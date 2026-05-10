/**
 * Simple rate limiter.
 *
 * Phase 1 login-rate-limit is handled by Better-Auth's built-in limiter
 * (`rateLimit.customRules["/sign-in/email"]` in src/lib/auth.ts). This module
 * exports a lightweight, general-purpose limiter for anything else we need
 * to throttle from application code (e.g. webhook replay protection, magic
 * link requests in Phase 3).
 *
 * Two backends are provided:
 *   1. `memoryRateLimit()` — in-process Map. Fast, no external dependency, but
 *      only correct for single-node deployments.
 *   2. `dbRateLimit()` — persists counters in `rate_limit_buckets`. Correct
 *      across multiple app instances at the cost of one SELECT+UPSERT per call.
 *
 * Swap to Upstash Redis in production (Phase 7) via `@upstash/ratelimit`.
 */

import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { rateLimitBuckets } from "@/db/schema";

export type RateLimitResult = {
  success: boolean;
  /** How many requests remain before the window resets. */
  remaining: number;
  /** Epoch millis when the current window resets. */
  resetAt: number;
};

type Bucket = { count: number; resetAt: number };
const memoryStore = new Map<string, Bucket>();

/**
 * In-process rate limit. Returns `success: false` when the caller has exceeded
 * `max` hits within `windowSeconds`. Call sites typically: limit by
 * `"checkout:" + ip` or `"magic-link:" + email`.
 */
export function memoryRateLimit(
  key: string,
  options: { max: number; windowSeconds: number },
): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: options.max - 1, resetAt };
  }

  if (existing.count >= options.max) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: options.max - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Purge any expired buckets from memory. Call periodically if the process is long-lived. */
export function purgeExpiredMemoryBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of memoryStore) {
    if (bucket.resetAt <= now) memoryStore.delete(key);
  }
}

/**
 * DB-backed rate limit using the `rate_limit_buckets` table. Use this when
 * the application runs with multiple processes (e.g. docker compose scale) or
 * when you need limits to survive process restarts.
 *
 * Uses an `INSERT ... ON CONFLICT DO UPDATE` to atomically increment the
 * counter, avoiding races between concurrent callers.
 */
export async function dbRateLimit(
  key: string,
  options: { max: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const windowMs = options.windowSeconds * 1000;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const rows = await db
    .insert(rateLimitBuckets)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        // If the stored window has expired, start a new one (count = 1, new resetAt).
        // Otherwise increment count and keep resetAt.
        count: sql`CASE
          WHEN ${rateLimitBuckets.resetAt} <= ${now}
            THEN 1
          ELSE ${rateLimitBuckets.count} + 1
        END`,
        resetAt: sql`CASE
          WHEN ${rateLimitBuckets.resetAt} <= ${now}
            THEN ${resetAt}
          ELSE ${rateLimitBuckets.resetAt}
        END`,
      },
    })
    .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt });

  const row = rows[0];
  if (!row) {
    // Should never happen — fail open to avoid locking users out on a DB hiccup.
    return { success: true, remaining: options.max - 1, resetAt: resetAt.getTime() };
  }

  const resetAtMs = row.resetAt.getTime();
  if (row.count > options.max) {
    return { success: false, remaining: 0, resetAt: resetAtMs };
  }
  return {
    success: true,
    remaining: options.max - row.count,
    resetAt: resetAtMs,
  };
}
