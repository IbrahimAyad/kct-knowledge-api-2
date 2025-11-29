/**
 * Cache Headers Middleware
 * Implements proper HTTP caching with Cache-Control, ETags, and conditional requests
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CacheHeaderOptions {
  /**
   * Cache-Control max-age in seconds
   */
  maxAge?: number;

  /**
   * Cache visibility (public, private, no-cache, no-store)
   */
  cacheControl?: 'public' | 'private' | 'no-cache' | 'no-store';

  /**
   * Enable ETag generation
   */
  etag?: boolean;

  /**
   * Custom ETag generator function
   */
  etagGenerator?: (data: any) => string;

  /**
   * Enable Last-Modified header
   */
  lastModified?: boolean;

  /**
   * Enable stale-while-revalidate
   */
  staleWhileRevalidate?: number;

  /**
   * Must-revalidate directive
   */
  mustRevalidate?: boolean;

  /**
   * Immutable directive (for content that never changes)
   */
  immutable?: boolean;
}

/**
 * Cache Headers Middleware Factory
 */
export function cacheHeaders(options: CacheHeaderOptions = {}) {
  const {
    maxAge = 0,
    cacheControl = 'public',
    etag = true,
    etagGenerator,
    lastModified = true,
    staleWhileRevalidate,
    mustRevalidate = false,
    immutable = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override send method to add cache headers
    res.send = function (data: any) {
      // Only add cache headers for successful GET requests
      if (req.method === 'GET' && res.statusCode >= 200 && res.statusCode < 300) {
        // Build Cache-Control header
        const cacheControlParts: string[] = [];

        // Add cache visibility
        if (cacheControl !== 'no-store') {
          cacheControlParts.push(cacheControl);
        } else {
          cacheControlParts.push('no-store', 'no-cache');
        }

        // Add max-age
        if (maxAge > 0 && cacheControl !== 'no-cache' && cacheControl !== 'no-store') {
          cacheControlParts.push(`max-age=${maxAge}`);
        }

        // Add stale-while-revalidate
        if (staleWhileRevalidate && staleWhileRevalidate > 0) {
          cacheControlParts.push(`stale-while-revalidate=${staleWhileRevalidate}`);
        }

        // Add must-revalidate
        if (mustRevalidate) {
          cacheControlParts.push('must-revalidate');
        }

        // Add immutable
        if (immutable) {
          cacheControlParts.push('immutable');
        }

        // Set Cache-Control header
        res.set('Cache-Control', cacheControlParts.join(', '));

        // Generate and set ETag
        if (etag && data) {
          const etagValue = etagGenerator
            ? etagGenerator(data)
            : generateETag(data);

          res.set('ETag', `"${etagValue}"`);

          // Check If-None-Match header for conditional requests
          const ifNoneMatch = req.get('If-None-Match');
          if (ifNoneMatch && ifNoneMatch === `"${etagValue}"`) {
            // Content hasn't changed, send 304 Not Modified
            res.status(304);
            return originalSend.call(this, '');
          }
        }

        // Set Last-Modified header
        if (lastModified) {
          const lastModifiedDate = new Date().toUTCString();
          res.set('Last-Modified', lastModifiedDate);

          // Check If-Modified-Since header for conditional requests
          const ifModifiedSince = req.get('If-Modified-Since');
          if (ifModifiedSince) {
            const ifModifiedSinceDate = new Date(ifModifiedSince);
            const resourceLastModified = new Date(lastModifiedDate);

            if (ifModifiedSinceDate >= resourceLastModified) {
              // Content hasn't been modified, send 304 Not Modified
              res.status(304);
              return originalSend.call(this, '');
            }
          }
        }

        // Set Vary header to ensure proper caching with different request headers
        const varyHeaders = ['Accept-Encoding', 'Origin'];
        if (req.get('Authorization') || req.get('X-API-Key')) {
          varyHeaders.push('Authorization', 'X-API-Key');
        }
        res.set('Vary', varyHeaders.join(', '));
      }

      return originalSend.call(this, data);
    };

    // Override json method to use our enhanced send
    res.json = function (data: any) {
      res.type('application/json');
      return res.send(JSON.stringify(data));
    };

    next();
  };
}

/**
 * Predefined cache strategies
 */
export const CacheStrategies = {
  /**
   * No caching - always fetch fresh data
   */
  NO_CACHE: (): ReturnType<typeof cacheHeaders> => {
    return cacheHeaders({
      cacheControl: 'no-cache',
      maxAge: 0,
      mustRevalidate: true,
    });
  },

  /**
   * Short-term cache (5 minutes)
   */
  SHORT: (): ReturnType<typeof cacheHeaders> => {
    return cacheHeaders({
      cacheControl: 'public',
      maxAge: 5 * 60, // 5 minutes
      staleWhileRevalidate: 60, // Allow stale for 1 minute while revalidating
      etag: true,
    });
  },

  /**
   * Medium-term cache (1 hour)
   */
  MEDIUM: (): ReturnType<typeof cacheHeaders> => {
    return cacheHeaders({
      cacheControl: 'public',
      maxAge: 60 * 60, // 1 hour
      staleWhileRevalidate: 5 * 60, // Allow stale for 5 minutes while revalidating
      etag: true,
    });
  },

  /**
   * Long-term cache (24 hours)
   */
  LONG: (): ReturnType<typeof cacheHeaders> => {
    return cacheHeaders({
      cacheControl: 'public',
      maxAge: 24 * 60 * 60, // 24 hours
      staleWhileRevalidate: 60 * 60, // Allow stale for 1 hour while revalidating
      etag: true,
    });
  },

  /**
   * Immutable cache (1 year) - for content that never changes
   */
  IMMUTABLE: (): ReturnType<typeof cacheHeaders> => {
    return cacheHeaders({
      cacheControl: 'public',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      immutable: true,
      etag: false, // No need for ETag if content is immutable
    });
  },

  /**
   * Private cache (user-specific data, 5 minutes)
   */
  PRIVATE: (): ReturnType<typeof cacheHeaders> => {
    return cacheHeaders({
      cacheControl: 'private',
      maxAge: 5 * 60, // 5 minutes
      etag: true,
      mustRevalidate: true,
    });
  },

  /**
   * API response cache with ETag validation
   */
  API: (maxAge: number = 300): ReturnType<typeof cacheHeaders> => {
    return cacheHeaders({
      cacheControl: 'public',
      maxAge,
      staleWhileRevalidate: Math.floor(maxAge / 10), // 10% of maxAge
      etag: true,
      mustRevalidate: false,
    });
  },
};

/**
 * Generate ETag from response data
 */
function generateETag(data: any): string {
  let content: string;

  if (typeof data === 'string') {
    content = data;
  } else if (Buffer.isBuffer(data)) {
    content = data.toString();
  } else {
    content = JSON.stringify(data);
  }

  // Generate MD5 hash of content
  const hash = crypto.createHash('md5').update(content).digest('hex');

  // Use weak ETag (W/) for JSON responses since they might be semantically equivalent
  // but have different representations (different key ordering, spacing, etc.)
  const prefix = typeof data === 'object' && !Buffer.isBuffer(data) ? 'W/' : '';

  return `${prefix}${hash}`;
}

/**
 * Clear cache directives middleware (for mutations)
 */
export function clearCacheHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // For POST, PUT, DELETE requests, ensure no caching
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
    }
    next();
  };
}

/**
 * Conditional request middleware
 * Handles If-None-Match and If-Modified-Since headers
 */
export function conditionalRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (data: any) {
      // Only process GET requests
      if (req.method === 'GET' && data) {
        const etag = res.get('ETag');
        const lastModified = res.get('Last-Modified');

        // Check If-None-Match (ETag)
        const ifNoneMatch = req.get('If-None-Match');
        if (etag && ifNoneMatch && ifNoneMatch === etag) {
          res.status(304);
          res.removeHeader('Content-Type');
          res.removeHeader('Content-Length');
          return originalSend.call(this, '');
        }

        // Check If-Modified-Since (Last-Modified)
        const ifModifiedSince = req.get('If-Modified-Since');
        if (lastModified && ifModifiedSince) {
          const ifModifiedSinceDate = new Date(ifModifiedSince);
          const lastModifiedDate = new Date(lastModified);

          if (lastModifiedDate <= ifModifiedSinceDate) {
            res.status(304);
            res.removeHeader('Content-Type');
            res.removeHeader('Content-Length');
            return originalSend.call(this, '');
          }
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
}
