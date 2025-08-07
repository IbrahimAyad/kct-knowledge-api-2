/**
 * Structured Logging System for KCT Knowledge API
 * Production-ready logging with Winston
 */

import winston from 'winston';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.colorize({ all: true })
);

// Production log format (no colors)
const productionFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Winston logger configuration
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? productionFormat : logFormat,
  defaultMeta: {
    service: 'kct-knowledge-api',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),

    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),

    // File transport for API requests
    new winston.transports.File({
      filename: path.join(logsDir, 'api.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ],

  // Don't exit on handled exceptions
  exitOnError: false
});

// Enhanced logging interface
export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  component?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private winston: winston.Logger;

  constructor() {
    this.winston = winstonLogger;
  }

  /**
   * Log error messages
   */
  error(message: string, context?: LogContext | Error | unknown): void {
    if (context instanceof Error) {
      this.winston.error(message, {
        error: {
          name: context.name,
          message: context.message,
          stack: context.stack
        },
        timestamp: new Date().toISOString()
      });
    } else if (context && typeof context === 'object') {
      this.winston.error(message, {
        ...(context as LogContext),
        timestamp: new Date().toISOString()
      });
    } else {
      this.winston.error(message, {
        metadata: { 
          error: context ? String(context) : undefined 
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    this.winston.info(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log HTTP requests
   */
  http(message: string, context?: LogContext): void {
    this.winston.http(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log debug messages
   */
  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API requests with enhanced context
   */
  logApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: Partial<LogContext>
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    const message = `${method} ${endpoint} ${statusCode} ${duration}ms`;
    
    this.winston.log(level, message, {
      method,
      endpoint,
      statusCode,
      duration,
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API errors with full context
   */
  logApiError(
    method: string,
    endpoint: string,
    error: Error,
    context?: Partial<LogContext>
  ): void {
    this.winston.error(`API Error: ${method} ${endpoint}`, {
      method,
      endpoint,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.winston.info(`Performance: ${operation}`, {
      operation,
      duration,
      component: 'performance',
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log cache operations
   */
  logCache(
    operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear',
    key: string,
    metadata?: Record<string, any>
  ): void {
    this.winston.debug(`Cache ${operation}: ${key}`, {
      operation,
      key,
      component: 'cache',
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log service operations
   */
  logService(
    service: string,
    operation: string,
    success: boolean,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    const level = success ? 'info' : 'error';
    const message = `${service}.${operation} ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this.winston.log(level, message, {
      service,
      operation,
      success,
      duration,
      component: 'service',
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log trending analysis operations
   */
  logTrending(
    operation: string,
    filters?: Record<string, any>,
    results?: number,
    duration?: number
  ): void {
    this.winston.info(`Trending Analysis: ${operation}`, {
      operation,
      filters,
      results,
      duration,
      component: 'trending',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security events
   */
  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    this.winston.log(level, `Security Event: ${event}`, {
      event,
      severity,
      component: 'security',
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get logger statistics
   */
  getStats(): {
    level: string;
    transports: number;
    environment: string;
  } {
    return {
      level: this.winston.level,
      transports: this.winston.transports.length,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Change log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.winston.level = level;
    this.winston.info(`Log level changed to: ${level}`);
  }

  /**
   * Create child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    const originalMethods = ['error', 'warn', 'info', 'http', 'debug'];
    
    originalMethods.forEach(method => {
      const originalMethod = (childLogger as any)[method];
      (childLogger as any)[method] = (message: string, context?: LogContext) => {
        originalMethod.call(childLogger, message, { ...defaultContext, ...context });
      };
    });
    
    return childLogger;
  }
}

// Create and export logger instance
export const logger = new Logger();

// Export for testing
export { Logger };

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  winstonLogger.end();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  winstonLogger.end();
});