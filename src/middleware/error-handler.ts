/**
 * Global Error Handler Middleware for KCT Knowledge API
 * Production-ready error boundary and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ErrorHandler, ErrorSeverity, ErrorCategory, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';

// Error statistics tracking
class ErrorStats {
  private static instance: ErrorStats;
  private errorCounts: Map<string, number> = new Map();
  private errorRates: Map<string, { count: number; window: number }> = new Map();
  private alertThresholds = {
    error_rate_per_minute: 10,
    critical_errors_per_hour: 5,
    high_severity_errors_per_hour: 20
  };

  public static getInstance(): ErrorStats {
    if (!ErrorStats.instance) {
      ErrorStats.instance = new ErrorStats();
    }
    return ErrorStats.instance;
  }

  public recordError(error: ApiError): void {
    const key = `${error.category}:${error.code}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // Track error rate per minute
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const rateKey = `rate:${minuteWindow}`;
    const current = this.errorRates.get(rateKey) || { count: 0, window: minuteWindow };
    current.count++;
    this.errorRates.set(rateKey, current);

    // Check if we should alert
    this.checkAlertThresholds(error);
  }

  private checkAlertThresholds(error: ApiError): void {
    if (error.severity === ErrorSeverity.CRITICAL) {
      const criticalCount = this.getErrorCountLastHour(ErrorSeverity.CRITICAL);
      if (criticalCount >= this.alertThresholds.critical_errors_per_hour) {
        this.triggerAlert('critical_error_threshold_exceeded', {
          count: criticalCount,
          threshold: this.alertThresholds.critical_errors_per_hour,
          error
        });
      }
    }

    if (error.severity === ErrorSeverity.HIGH) {
      const highCount = this.getErrorCountLastHour(ErrorSeverity.HIGH);
      if (highCount >= this.alertThresholds.high_severity_errors_per_hour) {
        this.triggerAlert('high_severity_error_threshold_exceeded', {
          count: highCount,
          threshold: this.alertThresholds.high_severity_errors_per_hour,
          error
        });
      }
    }
  }

  private getErrorCountLastHour(severity: ErrorSeverity): number {
    // Simplified implementation - in production, use proper time window tracking
    return Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
  }

  private triggerAlert(type: string, data: any): void {
    logger.error(`ALERT: ${type}`, {
      component: 'error-monitoring',
      metadata: {
        alertType: type,
        alertData: data,
        severity: ErrorSeverity.CRITICAL
      }
    });

    // In production, integrate with alerting systems like PagerDuty, Slack, etc.
    // this.sendToAlertingService(type, data);
  }

  public getStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsByCode: Record<string, number>;
    recentErrorRate: number;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorsByCategory: Record<string, number> = {};
    const errorsByCode: Record<string, number> = {};

    for (const [key, count] of this.errorCounts.entries()) {
      const [category, code] = key.split(':');
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      errorsByCode[code] = (errorsByCode[code] || 0) + count;
    }

    // Calculate recent error rate (last minute)
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const recentErrorRate = this.errorRates.get(`rate:${minuteWindow}`)?.count || 0;

    return {
      totalErrors,
      errorsByCategory,
      errorsByCode,
      recentErrorRate
    };
  }
}

// Request context builder
export function buildErrorContext(req: Request): {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, any>;
} {
  return {
    requestId: (req as any).requestId || req.headers['x-request-id'] as string,
    endpoint: req.originalUrl || req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    userId: (req as any).userId,
    sessionId: (req as any).sessionId,
    metadata: {
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      params: Object.keys(req.params).length > 0 ? req.params : undefined,
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    }
  };
}

// Circuit breaker for external services
class CircuitBreaker {
  private failures: number = 0;
  private lastFailTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly failureThreshold: number = 5;
  private readonly timeout: number = 60000; // 1 minute

  public isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  public recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  public recordFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      logger.warn('Circuit breaker opened due to excessive failures', {
        component: 'circuit-breaker',
        metadata: {
          failures: this.failures,
          threshold: this.failureThreshold
        }
      });
    }
  }

  public getState(): string {
    return this.state;
  }
}

// Service health monitor
export class ServiceHealthMonitor {
  private static instance: ServiceHealthMonitor;
  private services: Map<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: number;
    consecutiveFailures: number;
    circuitBreaker: CircuitBreaker;
  }> = new Map();

  public static getInstance(): ServiceHealthMonitor {
    if (!ServiceHealthMonitor.instance) {
      ServiceHealthMonitor.instance = new ServiceHealthMonitor();
    }
    return ServiceHealthMonitor.instance;
  }

  public recordServiceCall(service: string, success: boolean): void {
    let serviceHealth = this.services.get(service);
    if (!serviceHealth) {
      serviceHealth = {
        status: 'healthy',
        lastCheck: Date.now(),
        consecutiveFailures: 0,
        circuitBreaker: new CircuitBreaker()
      };
      this.services.set(service, serviceHealth);
    }

    serviceHealth.lastCheck = Date.now();

    if (success) {
      serviceHealth.consecutiveFailures = 0;
      serviceHealth.status = 'healthy';
      serviceHealth.circuitBreaker.recordSuccess();
    } else {
      serviceHealth.consecutiveFailures++;
      serviceHealth.circuitBreaker.recordFailure();
      
      if (serviceHealth.consecutiveFailures >= 3) {
        serviceHealth.status = 'unhealthy';
      } else if (serviceHealth.consecutiveFailures >= 1) {
        serviceHealth.status = 'degraded';
      }
    }
  }

  public isServiceHealthy(service: string): boolean {
    const serviceHealth = this.services.get(service);
    return serviceHealth?.status === 'healthy' && !serviceHealth.circuitBreaker.isOpen();
  }

  public getServiceHealth(): Record<string, any> {
    const health: Record<string, any> = {};
    
    for (const [service, serviceHealth] of this.services.entries()) {
      health[service] = {
        status: serviceHealth.status,
        lastCheck: new Date(serviceHealth.lastCheck).toISOString(),
        consecutiveFailures: serviceHealth.consecutiveFailures,
        circuitBreakerState: serviceHealth.circuitBreaker.getState()
      };
    }

    return health;
  }
}

// Global error handler middleware
export function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Build error context
  const context = buildErrorContext(req);

  // Convert to standardized ApiError
  const apiError = ErrorHandler.handleError(error, context);

  // Record error statistics
  const errorStats = ErrorStats.getInstance();
  errorStats.recordError(apiError);

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  // Log the error with full context
  logger.logApiError(req.method, req.originalUrl, apiError, context);

  // Send error response
  res.status(apiError.statusCode).json(apiError.toResponse());
}

// Async error wrapper for route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new ApiError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    ErrorCode.RESOURCE_NOT_FOUND,
    ErrorCategory.NOT_FOUND,
    ErrorSeverity.LOW,
    404,
    'The requested endpoint was not found',
    buildErrorContext(req),
    [
      'Check the API documentation for available endpoints',
      'Verify the HTTP method is correct',
      'Ensure the URL path is spelled correctly'
    ]
  );

  next(error);
}

// Health check for error handling system
export function getErrorHandlingHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  stats: any;
  serviceHealth: any;
} {
  const errorStats = ErrorStats.getInstance();
  const serviceHealth = ServiceHealthMonitor.getInstance();
  const stats = errorStats.getStats();

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check error rates
  if (stats.recentErrorRate > 20) {
    status = 'unhealthy';
  } else if (stats.recentErrorRate > 10) {
    status = 'degraded';
  }

  return {
    status,
    stats,
    serviceHealth: serviceHealth.getServiceHealth()
  };
}

// Graceful degradation middleware
export function gracefulDegradation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const serviceHealth = ServiceHealthMonitor.getInstance();
  
  // Add service health checker to request
  (req as any).isServiceHealthy = (service: string) => serviceHealth.isServiceHealthy(service);
  
  // Add graceful response helper
  (req as any).gracefulResponse = (data: any, fallbackData?: any) => {
    if (data) {
      return res.json({ success: true, data });
    } else if (fallbackData) {
      return res.json({
        success: true,
        data: fallbackData,
        warning: 'Using cached/fallback data due to service issues'
      });
    } else {
      throw new ApiError(
        'Service temporarily unavailable',
        ErrorCode.SERVICE_UNAVAILABLE,
        ErrorCategory.EXTERNAL_SERVICE,
        ErrorSeverity.MEDIUM,
        503,
        'Service temporarily unavailable. Please try again later',
        buildErrorContext(req),
        ['Try again in a few moments', 'Check service status'],
        true
      );
    }
  };

  next();
}

// Performance monitoring middleware
export function performanceMonitoring(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object
  (req as any).requestId = requestId;

  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    // Log API request
    logger.logApiRequest(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      {
        requestId,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    );

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow API request detected', {
        method: req.method,
        endpoint: req.originalUrl,
        duration,
        requestId,
        component: 'performance'
      });
    }

    return originalJson.call(this, body);
  };

  next();
}

// Request timeout middleware
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      const error = new ApiError(
        `Request timeout after ${timeoutMs}ms`,
        ErrorCode.REQUEST_TIMEOUT,
        ErrorCategory.TIMEOUT,
        ErrorSeverity.MEDIUM,
        408,
        'Request timeout. The request took too long to process',
        buildErrorContext(req),
        ['Try again with a simpler request', 'Check your network connection'],
        true
      );

      next(error);
    }, timeoutMs);

    // Clear timeout when response is finished
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
}

// Export instances
export const errorStats = ErrorStats.getInstance();
export const serviceHealthMonitor = ServiceHealthMonitor.getInstance();