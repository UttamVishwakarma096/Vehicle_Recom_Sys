import { HttpError } from "./foundation.js";

/**
 * In-memory Token Bucket rate limiter.
 * Each key (user or IP) has a bucket with a maximum capacity of tokens.
 * Tokens are consumed on requests and continuously refilled at a rate of
 * 1 token per `refillIntervalMs` (default 15 seconds).
 */
export class TokenBucketRateLimiter {
  constructor({
    capacity = 3,
    refillIntervalMs = 15_000, // 15 seconds per token
    cleanupIntervalMs = 5 * 60 * 1000,
  } = {}) {
    this.capacity = capacity;
    this.refillIntervalMs = refillIntervalMs;
    this.buckets = new Map();

    if (cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  getBucket(key) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
      return bucket;
    }

    const elapsed = now - bucket.lastRefill;
    if (elapsed > 0) {
      const tokensToAdd = elapsed / this.refillIntervalMs;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    return bucket;
  }

  /**
   * Attempts to consume tokens for the given client key.
   * @param {string} key Unique client identifier (e.g. user ID or IP)
   * @param {number} count Number of tokens to consume (default 1)
   * @returns {{ allowed: boolean, remaining: number, resetSeconds: number, retryAfterSeconds: number, limit: number }}
   */
  consume(key, count = 1) {
    const bucket = this.getBucket(key);
    const limit = this.capacity;

    if (bucket.tokens >= count) {
      bucket.tokens -= count;
      const remaining = Math.floor(bucket.tokens);
      const timeToFullMs = (this.capacity - bucket.tokens) * this.refillIntervalMs;
      const resetSeconds = Math.max(0, Math.ceil(timeToFullMs / 1000));
      return {
        allowed: true,
        remaining,
        resetSeconds,
        retryAfterSeconds: 0,
        limit,
      };
    }

    const deficit = count - bucket.tokens;
    const waitMs = deficit * this.refillIntervalMs;
    const retryAfterSeconds = Math.max(1, Math.ceil(waitMs / 1000));
    const remaining = 0;
    const resetSeconds = retryAfterSeconds;

    return {
      allowed: false,
      remaining,
      resetSeconds,
      retryAfterSeconds,
      limit,
    };
  }

  /**
   * Cleans up buckets that are idle and fully refilled.
   */
  cleanup(maxIdleMs = 60 * 60 * 1000) {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxIdleMs && bucket.tokens >= this.capacity) {
        this.buckets.delete(key);
      }
    }
  }

  reset() {
    this.buckets.clear();
  }

  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.buckets.clear();
  }
}

/**
 * Creates Express middleware using the Token Bucket rate limiter.
 * @param {TokenBucketRateLimiter} [limiter]
 */
export function createRateLimiterMiddleware(limiter = new TokenBucketRateLimiter()) {
  return function rateLimitMiddleware(request, response, next) {
    const forwarded = request.headers["x-forwarded-for"];
    const rawIp =
      (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
      request.ip ||
      request.socket?.remoteAddress ||
      "127.0.0.1";

    const clientKey = request.user?.id ? `user:${request.user.id}` : `ip:${rawIp}`;
    const result = limiter.consume(clientKey, 1);

    response.setHeader("X-RateLimit-Limit", String(result.limit));
    response.setHeader("X-RateLimit-Remaining", String(result.remaining));
    response.setHeader("X-RateLimit-Reset", String(result.resetSeconds));

    if (!result.allowed) {
      response.setHeader("Retry-After", String(result.retryAfterSeconds));
      return next(
        new HttpError(
          429,
          "RATE_LIMIT_EXCEEDED",
          `AI search rate limit reached. A new token refills every 15 seconds. Please wait ${result.retryAfterSeconds}s before trying again.`,
        ),
      );
    }

    return next();
  };
}
