import { HttpError } from "./foundation.js";

/**
 * In-memory Token Bucket rate limiter.
 * Each client key has a bucket with maximum capacity of tokens.
 * Tokens are continuously refilled over time.
 */
export class TokenBucketRateLimiter {
  constructor({
    capacity = 5,
    refillIntervalMs = 12_000, // 1 token every 12s -> 5 tokens per minute
    cleanupIntervalMs = 5 * 60 * 1000,
    errorMessage = "Too many requests. Please try again later.",
  } = {}) {
    this.capacity = capacity;
    this.refillIntervalMs = refillIntervalMs;
    this.errorMessage = errorMessage;
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
   * @param {string} key
   * @param {number} count
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
 * @param {Object} [options]
 * @param {TokenBucketRateLimiter} [options.limiter]
 * @param {Function} [options.keyGenerator] Function (req) => string
 * @param {string} [options.actionName] Action name (e.g. "login")
 * @param {string} [options.message] Custom error message
 */
export function createRateLimiterMiddleware({
  limiter = new TokenBucketRateLimiter(),
  keyGenerator,
  actionName = "request",
  message,
} = {}) {
  return function rateLimitMiddleware(request, response, next) {
    let clientKey;
    if (typeof keyGenerator === "function") {
      clientKey = keyGenerator(request);
    } else {
      const forwarded = request.headers["x-forwarded-for"];
      const rawIp =
        (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
        request.ip ||
        request.socket?.remoteAddress ||
        "127.0.0.1";
      clientKey = request.user?.id ? `user:${request.user.id}` : `ip:${rawIp}`;
    }

    const result = limiter.consume(clientKey, 1);

    response.setHeader("X-RateLimit-Limit", String(result.limit));
    response.setHeader("X-RateLimit-Remaining", String(result.remaining));
    response.setHeader("X-RateLimit-Reset", String(result.resetSeconds));

    if (!result.allowed) {
      response.setHeader("Retry-After", String(result.retryAfterSeconds));
      const errMsg =
        message ||
        `Too many ${actionName} attempts. Please wait ${result.retryAfterSeconds}s before trying again.`;
      return next(new HttpError(429, "RATE_LIMIT_EXCEEDED", errMsg));
    }

    return next();
  };
}
