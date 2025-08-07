/**
 * Cache Middleware
 * Provides HTTP response caching with Redis backend
 * Supports conditional caching, cache headers, and performance optimization
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheOptions } from '../services/cache-service';
import crypto from 'crypto';

export interface CacheMiddlewareOptions extends CacheOptions {
  skipCache?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
  conditionalCache?: (req: Request, res: Response) => boolean;
  skipPersonalized?: boolean; // Skip caching for personalized responses
}

/**
 * HTTP Response Cache Middleware
 * Caches GET requests based on URL and query parameters
 */
export function httpCache(options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if condition is met
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    // Skip personalized endpoints
    if (options.skipPersonalized && isPersonalizedRequest(req)) {
      return next();
    }

    const cacheKey = options.keyGenerator ? options.keyGenerator(req) : generateCacheKey(req);
    const startTime = Date.now();

    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get<CachedResponse>(cacheKey);
      
      if (cachedResponse) {
        const responseTime = Date.now() - startTime;
        
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Response-Time': `${responseTime}ms`,
          'Content-Type': cachedResponse.contentType || 'application/json',
        });

        if (cachedResponse.headers) {
          res.set(cachedResponse.headers);
        }

        console.log(`⚡ Cache HIT: ${req.originalUrl} (${responseTime}ms)`);
        return res.status(cachedResponse.statusCode).send(cachedResponse.data);
      }

      // Cache miss - intercept response
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;
      let statusCode = 200;

      // Override status method
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Override send method
      res.send = function(data: any) {
        const responseTime = Date.now() - startTime;
        
        // Only cache successful responses
        if (statusCode >= 200 && statusCode < 300) {
          const shouldCache = !options.conditionalCache || options.conditionalCache(req, res);
          
          if (shouldCache) {
            const cachedResponse: CachedResponse = {
              data,
              statusCode,
              contentType: res.get('Content-Type') || 'application/json',
              headers: extractCacheableHeaders(res),
              timestamp: Date.now(),
            };

            // Cache asynchronously to avoid blocking response
            cacheService.set(cacheKey, cachedResponse, {
              ...options,
              tags: options.tags || generateCacheTags(req),
            }).catch(error => {
              console.error('Failed to cache response:', error);
            });
          }
        }

        // Set cache miss headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'X-Response-Time': `${responseTime}ms`,
        });

        console.log(`💨 Cache MISS: ${req.originalUrl} (${responseTime}ms)`);
        return originalSend.call(this, data);
      };

      // Override json method
      res.json = function(data: any) {
        return res.send(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * Invalidates cache based on request patterns
 */
export function cacheInvalidation(patterns: string[] | ((req: Request) => string[])) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(data: any) {
      const statusCode = res.statusCode;
      
      // Only invalidate on successful modifications
      if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') && 
          statusCode >= 200 && statusCode < 300) {
        
        const invalidationPatterns = typeof patterns === 'function' ? patterns(req) : patterns;
        
        // Invalidate cache asynchronously
        Promise.all(
          invalidationPatterns.map(pattern => cacheService.invalidateByPattern(pattern))
        ).then(results => {
          const totalInvalidated = results.reduce((sum, count) => sum + count, 0);
          if (totalInvalidated > 0) {
            console.log(`🗑️ Cache invalidated: ${totalInvalidated} keys for patterns [${invalidationPatterns.join(', ')}]`);
          }
        }).catch(error => {
          console.error('Cache invalidation failed:', error);
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Performance timing middleware
 * Adds request/response timing and performance headers  
 */
export function performanceTiming() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    const startTimestamp = Date.now();

    // Add request timing
    req.startTime = startTimestamp;

    const originalSend = res.send;
    res.send = function(data: any) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      // Add performance headers
      res.set({
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'X-Process-Time': `${Date.now() - startTimestamp}ms`,
        'X-Timestamp': new Date().toISOString(),
      });

      // Log slow requests
      if (responseTime > 1000) { // Log requests slower than 1 second
        console.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} (${responseTime.toFixed(2)}ms)`);
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Memory usage monitoring middleware
 */
export function memoryMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Add memory usage headers in development
      if (process.env.NODE_ENV !== 'production') {
        const memUsage = process.memoryUsage();
        res.set({
          'X-Memory-RSS': `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          'X-Memory-Heap-Used': `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          'X-Memory-Heap-Total': `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// Helper interfaces and functions

interface CachedResponse {
  data: any;
  statusCode: number;
  contentType: string;
  headers?: { [key: string]: string };
  timestamp: number;
}

function generateCacheKey(req: Request): string {
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  const auth = req.get('Authorization') || req.get('X-API-Key') || '';
  
  // Include auth in key for user-specific caching but hash it for privacy
  const authHash = auth ? crypto.createHash('md5').update(auth).digest('hex').substring(0, 8) : '';
  
  const keyString = `${req.method}:${url}:${query}:${authHash}`;
  return `http:${crypto.createHash('md5').update(keyString).digest('hex')}`;
}

function generateCacheTags(req: Request): string[] {
  const tags: string[] = [];
  const path = req.path;

  // Generate tags based on URL patterns
  if (path.includes('/api/colors')) tags.push('colors');
  if (path.includes('/api/trending')) tags.push('trending');
  if (path.includes('/api/styles') || path.includes('/api/profiles')) tags.push('styles');
  if (path.includes('/api/venues')) tags.push('venues');
  if (path.includes('/api/intelligence')) tags.push('intelligence');
  if (path.includes('/api/validation')) tags.push('validation');

  // Add version tag
  tags.push('v2');

  return tags;
}

function isPersonalizedRequest(req: Request): boolean {
  const path = req.path;
  const query = req.query;

  // Skip caching for personalized endpoints
  if (path.includes('/personalization')) return true;
  if (path.includes('/profile') && !path.includes('/profiles')) return true;
  if (query.user_id || query.customer_id) return true;
  if (req.get('X-User-ID') || req.get('X-Customer-ID')) return true;

  return false;
}

function extractCacheableHeaders(res: Response): { [key: string]: string } {
  const cacheableHeaders: { [key: string]: string } = {};
  const headers = res.getHeaders();

  // Only cache specific headers
  const allowedHeaders = [
    'content-type',
    'cache-control',
    'expires',
    'last-modified',
    'etag'
  ];

  for (const header of allowedHeaders) {
    if (headers[header]) {
      cacheableHeaders[header] = String(headers[header]);
    }
  }

  return cacheableHeaders;
}

// Extend Request interface for timing
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}