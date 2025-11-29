/**
 * Advanced Rate Limiting Middleware
 * Implements per-endpoint rate limiting with different limits for different operations
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

export interface EndpointRateLimitConfig {
  /**
   * Window duration in milliseconds
   */
  windowMs: number;

  /**
   * Maximum requests per window
   */
  max: number;

  /**
   * Custom message for rate limit exceeded
   */
  message?: string;

  /**
   * Skip rate limiting based on request
   */
  skip?: (req: Request) => boolean;

  /**
   * Custom key generator
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Handler when rate limit is exceeded
   */
  handler?: (req: Request, res: Response) => void;
}

/**
 * Predefined rate limit tiers
 */
export enum RateLimitTier {
  /**
   * Very strict - 10 requests per minute
   * For resource-intensive operations like batch processing
   */
  VERY_STRICT = 'very_strict',

  /**
   * Strict - 30 requests per minute
   * For AI recommendations and complex queries
   */
  STRICT = 'strict',

  /**
   * Standard - 100 requests per minute
   * For typical API operations
   */
  STANDARD = 'standard',

  /**
   * Relaxed - 300 requests per minute
   * For read-only operations
   */
  RELAXED = 'relaxed',

  /**
   * Generous - 1000 requests per minute
   * For high-frequency public endpoints
   */
  GENEROUS = 'generous',
}

/**
 * Rate limit configurations by tier
 */
const TIER_CONFIGS: Record<RateLimitTier, EndpointRateLimitConfig> = {
  [RateLimitTier.VERY_STRICT]: {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many requests. This endpoint is rate-limited to 10 requests per minute.',
  },
  [RateLimitTier.STRICT]: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many requests. This endpoint is rate-limited to 30 requests per minute.',
  },
  [RateLimitTier.STANDARD]: {
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many requests. This endpoint is rate-limited to 100 requests per minute.',
  },
  [RateLimitTier.RELAXED]: {
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    message: 'Too many requests. This endpoint is rate-limited to 300 requests per minute.',
  },
  [RateLimitTier.GENEROUS]: {
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
    message: 'Too many requests. This endpoint is rate-limited to 1000 requests per minute.',
  },
};

/**
 * Create rate limiter with custom configuration
 */
export function createRateLimiter(
  config: EndpointRateLimitConfig
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: config.message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(config.windowMs / 1000),
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skip: config.skip,
    keyGenerator: config.keyGenerator || defaultKeyGenerator,
    handler: config.handler || defaultHandler,
  });
}

/**
 * Create rate limiter by tier
 */
export function createTieredRateLimiter(
  tier: RateLimitTier
): RateLimitRequestHandler {
  const config = TIER_CONFIGS[tier];
  return createRateLimiter(config);
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Use X-Forwarded-For if behind a proxy, otherwise use req.ip
  const forwarded = req.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

/**
 * Default rate limit exceeded handler
 */
function defaultHandler(req: Request, res: Response): void {
  const retryAfter = res.get('Retry-After');

  res.status(429).json({
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: retryAfter ? parseInt(retryAfter) : 60,
    timestamp: new Date().toISOString(),
    endpoint: req.path,
  });
}

/**
 * Per-endpoint rate limit configurations
 */
export const EndpointRateLimits = {
  // AI & Recommendations (Resource-intensive)
  AI_RECOMMENDATIONS: createTieredRateLimiter(RateLimitTier.STRICT),

  // Validation (Moderate usage)
  VALIDATION: createTieredRateLimiter(RateLimitTier.STANDARD),

  // Trending & Analytics (Read-only, frequent access)
  TRENDING: createTieredRateLimiter(RateLimitTier.RELAXED),

  // Colors & Styles (Cacheable, high-frequency)
  COLORS: createTieredRateLimiter(RateLimitTier.GENEROUS),

  // Batch Operations (Very resource-intensive)
  BATCH: createTieredRateLimiter(RateLimitTier.VERY_STRICT),

  // Conversion Optimization (ML-based, expensive)
  CONVERSION: createTieredRateLimiter(RateLimitTier.STRICT),

  // Style Profiles (Standard usage)
  PROFILES: createTieredRateLimiter(RateLimitTier.STANDARD),

  // Health & Metrics (Should be accessible)
  HEALTH: createTieredRateLimiter(RateLimitTier.GENEROUS),

  // Analytics Summary (Cached, but still limit)
  ANALYTICS: createTieredRateLimiter(RateLimitTier.RELAXED),

  // General API (Default for unclassified endpoints)
  GENERAL: createTieredRateLimiter(RateLimitTier.STANDARD),
};

/**
 * Create API key-based rate limiter
 * Different limits for authenticated vs. unauthenticated requests
 */
export function createApiKeyRateLimiter(
  authenticatedMax: number = 500,
  unauthenticatedMax: number = 100
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req: Request) => {
      // Higher limit for authenticated requests
      const hasApiKey = req.get('X-API-Key') || req.get('Authorization');
      return hasApiKey ? authenticatedMax : unauthenticatedMax;
    },
    message: {
      success: false,
      error: 'Rate limit exceeded. Authenticate with an API key for higher limits.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use API key if available, otherwise use IP
      const apiKey = req.get('X-API-Key') || req.get('Authorization');
      if (apiKey) {
        return `api:${apiKey}`;
      }
      return `ip:${defaultKeyGenerator(req)}`;
    },
  });
}

/**
 * Create sliding window rate limiter
 * More accurate than fixed window but slightly more resource-intensive
 */
export function createSlidingWindowRateLimiter(
  maxRequests: number,
  windowMs: number = 60000
): RateLimitRequestHandler {
  const requestTimestamps = new Map<string, number[]>();

  return rateLimit({
    windowMs,
    max: maxRequests,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: defaultKeyGenerator,
    handler: (req: Request, res: Response) => {
      const key = defaultKeyGenerator(req);
      const now = Date.now();
      const timestamps = requestTimestamps.get(key) || [];

      // Calculate when the oldest request in the window will expire
      const oldestInWindow = timestamps.find(t => now - t < windowMs);
      const retryAfter = oldestInWindow
        ? Math.ceil((windowMs - (now - oldestInWindow)) / 1000)
        : Math.ceil(windowMs / 1000);

      res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down.',
        retryAfter,
        limit: maxRequests,
        window: `${windowMs / 1000}s`,
        timestamp: new Date().toISOString(),
      });
    },
  });
}

/**
 * Create burst protection rate limiter
 * Allows bursts but enforces sustained rate limit
 */
export function createBurstProtectionRateLimiter(
  sustainedMax: number,
  burstMax: number,
  windowMs: number = 60000
) {
  const burstLimiter = rateLimit({
    windowMs: 1000, // 1 second window for burst
    max: burstMax,
    message: {
      success: false,
      error: `Burst limit exceeded. Maximum ${burstMax} requests per second.`,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: false,
    legacyHeaders: false,
  });

  const sustainedLimiter = rateLimit({
    windowMs,
    max: sustainedMax,
    message: {
      success: false,
      error: `Rate limit exceeded. Maximum ${sustainedMax} requests per ${windowMs / 1000} seconds.`,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return (req: Request, res: Response, next: any) => {
    // First check burst limit
    burstLimiter(req, res, (err?: any) => {
      if (err) return next(err);
      // Then check sustained limit
      sustainedLimiter(req, res, next);
    });
  };
}

/**
 * Rate limit status endpoint
 * Shows current rate limit status for the client
 */
export function getRateLimitStatus() {
  return (req: Request, res: Response) => {
    const rateLimitInfo = {
      limit: res.get('RateLimit-Limit'),
      remaining: res.get('RateLimit-Remaining'),
      reset: res.get('RateLimit-Reset'),
      retryAfter: res.get('Retry-After'),
      ip: defaultKeyGenerator(req),
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: rateLimitInfo,
    });
  };
}
