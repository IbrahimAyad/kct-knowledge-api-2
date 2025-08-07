/**
 * Performance Optimization Middleware
 * Provides compression, connection pooling, response optimization, and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { gzipSync, deflateSync } from 'zlib';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  totalResponseTime: number;
  slowRequestCount: number;
  errorCount: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  lastReset: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    slowRequestCount: 0,
    errorCount: 0,
    memoryUsage: {
      rss: 0,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
    },
    lastReset: new Date(),
  };

  private readonly slowRequestThreshold = 1000; // 1 second
  private readonly memoryCheckInterval = 30000; // 30 seconds

  constructor() {
    this.startMemoryMonitoring();
  }

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;

    if (responseTime > this.slowRequestThreshold) {
      this.metrics.slowRequestCount++;
    }

    if (isError) {
      this.metrics.errorCount++;
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      slowRequestCount: 0,
      errorCount: 0,
      memoryUsage: this.metrics.memoryUsage,
      lastReset: new Date(),
    };
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      };

      // Log high memory usage
      if (this.metrics.memoryUsage.heapUsed > 500) { // > 500MB
        console.warn(`🧠 High memory usage: ${this.metrics.memoryUsage.heapUsed}MB heap used`);
      }
    }, this.memoryCheckInterval);
  }
}

const performanceMonitor = new PerformanceMonitor();

/**
 * Enhanced compression middleware with smart compression
 */
export function smartCompression() {
  const compressionMiddleware = compression({
    // Only compress responses larger than 1kb
    threshold: 1024,
    // Compression level (1-9, 6 is default)
    level: 6,
    // Memory level (1-9, 8 is default)
    memLevel: 8,
    // Filter function to determine what to compress
    filter: (req: Request, res: Response) => {
      // Don't compress if explicitly disabled
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Don't compress images, videos, or already compressed content
      const contentType = res.getHeader('content-type') as string;
      if (contentType) {
        const type = contentType.toLowerCase();
        if (type.includes('image/') || 
            type.includes('video/') || 
            type.includes('audio/') ||
            type.includes('application/zip') ||
            type.includes('application/gzip')) {
          return false;
        }
      }

      // Use default compression filter
      return compression.filter(req, res);
    },
  });

  return compressionMiddleware;
}

/**
 * Response optimization middleware
 */
export function responseOptimization() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    const startTimestamp = Date.now();

    // Optimize JSON serialization
    const originalJson = res.json;
    res.json = function(obj: any) {
      // Use faster JSON serialization for large objects
      if (obj && typeof obj === 'object') {
        const size = JSON.stringify(obj).length;
        if (size > 100000) { // 100KB threshold
          console.log(`📦 Large JSON response optimized: ${Math.round(size / 1024)}KB`);
        }
      }

      return originalJson.call(this, obj);
    };

    // Add performance headers
    const originalSend = res.send;
    res.send = function(data: any) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;
      const isError = res.statusCode >= 400;

      // Record metrics
      performanceMonitor.recordRequest(responseTime, isError);

      // Add performance headers
      res.set({
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'X-Process-Memory': `${performanceMonitor.getMetrics().memoryUsage.heapUsed}MB`,
        'X-Server-Time': new Date().toISOString(),
      });

      // Add cache control headers for static content
      if (req.path.includes('/api/colors') || req.path.includes('/api/styles')) {
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Connection pooling and keep-alive optimization
 */
export function connectionOptimization() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Enable keep-alive
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=5, max=1000');

    // Set reasonable timeouts
    req.setTimeout(30000); // 30 seconds
    res.setTimeout(30000); // 30 seconds

    next();
  };
}

/**
 * Request/response logging with performance metrics
 */
export function performanceLogging() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startHrTime = process.hrtime.bigint();

    // Log request start (only for non-health checks)
    if (!req.path.includes('/health')) {
      console.log(`➡️  ${req.method} ${req.originalUrl} (${req.ip})`);
    }

    const originalSend = res.send;
    res.send = function(data: any) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startHrTime) / 1000000;
      const statusCode = res.statusCode;
      const contentLength = res.get('Content-Length') || (data ? Buffer.byteLength(data) : 0);

      // Determine log level based on response time and status
      let logSymbol = '✅';
      if (statusCode >= 400) {
        logSymbol = '❌';
      } else if (responseTime > 1000) {
        logSymbol = '🐌';
      } else if (responseTime > 500) {
        logSymbol = '⚠️';
      }

      // Log response (skip health checks)
      if (!req.path.includes('/health')) {
        console.log(
          `${logSymbol} ${req.method} ${req.originalUrl} ` +
          `${statusCode} ${responseTime.toFixed(2)}ms ${Math.round(Number(contentLength) / 1024)}KB`
        );
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Memory leak prevention middleware
 */
export function memoryLeakPrevention() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Clean up request listeners on response finish
    res.on('finish', () => {
      req.removeAllListeners();
      res.removeAllListeners();
    });

    // Set maximum request body size
    if (!req.get('content-length')) {
      req.on('data', (chunk) => {
        const currentSize = (req as any)._totalSize || 0;
        (req as any)._totalSize = currentSize + chunk.length;
        
        // Reject requests larger than 50MB
        if ((req as any)._totalSize > 50 * 1024 * 1024) {
          req.destroy();
          return res.status(413).json({
            success: false,
            error: 'Request entity too large',
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    next();
  };
}

/**
 * Health check endpoint for performance metrics
 */
export function performanceHealthCheck() {
  return (req: Request, res: Response) => {
    const metrics = performanceMonitor.getMetrics();
    const systemInfo = {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    };

    res.json({
      success: true,
      data: {
        performance: metrics,
        system: systemInfo,
        timestamp: new Date().toISOString(),
      },
    });
  };
}

/**
 * Lazy loading helper for heavy operations
 */
export class LazyLoader<T> {
  private cached: T | null = null;
  private loading: Promise<T> | null = null;
  private lastLoaded: number = 0;
  private ttl: number;

  constructor(
    private loader: () => Promise<T>,
    ttlSeconds: number = 300 // 5 minutes default
  ) {
    this.ttl = ttlSeconds * 1000;
  }

  async get(): Promise<T> {
    const now = Date.now();
    
    // Return cached value if still valid
    if (this.cached && (now - this.lastLoaded) < this.ttl) {
      return this.cached;
    }

    // Return existing loading promise if in progress
    if (this.loading) {
      return this.loading;
    }

    // Start new loading operation
    this.loading = this.loader();
    
    try {
      this.cached = await this.loading;
      this.lastLoaded = now;
      return this.cached;
    } finally {
      this.loading = null;
    }
  }

  invalidate(): void {
    this.cached = null;
    this.lastLoaded = 0;
    this.loading = null;
  }

  isValid(): boolean {
    return this.cached !== null && (Date.now() - this.lastLoaded) < this.ttl;
  }
}

// Export performance monitor instance
export { performanceMonitor };