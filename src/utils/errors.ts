/**
 * Standardized Error Handling System for KCT Knowledge API
 * Production-ready error classification and management
 */

import { logger } from './logger';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network',
  SYSTEM = 'system',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// Standard error codes
export enum ErrorCode {
  // Validation errors (1000-1099)
  INVALID_INPUT = 'E1001',
  MISSING_REQUIRED_FIELD = 'E1002',
  INVALID_FORMAT = 'E1003',
  INVALID_COMBINATION = 'E1004',
  VALIDATION_FAILED = 'E1005',

  // Authentication errors (1100-1199)
  INVALID_API_KEY = 'E1101',
  MISSING_API_KEY = 'E1102',
  EXPIRED_TOKEN = 'E1103',
  INVALID_CREDENTIALS = 'E1104',

  // Authorization errors (1200-1299)
  INSUFFICIENT_PERMISSIONS = 'E1201',
  ACCESS_DENIED = 'E1202',
  QUOTA_EXCEEDED = 'E1203',

  // Not found errors (1300-1399)
  RESOURCE_NOT_FOUND = 'E1301',
  COLOR_NOT_FOUND = 'E1302',
  STYLE_PROFILE_NOT_FOUND = 'E1303',
  COMBINATION_NOT_FOUND = 'E1304',

  // Business logic errors (1400-1499)
  INVALID_COLOR_COMBINATION = 'E1401',
  FORMALITY_MISMATCH = 'E1402',
  SEASONAL_INAPPROPRIATE = 'E1403',
  VENUE_MISMATCH = 'E1404',

  // External service errors (1500-1599)
  SHOPIFY_SERVICE_ERROR = 'E1501',
  REDIS_CONNECTION_ERROR = 'E1502',
  ANALYTICS_SERVICE_ERROR = 'E1503',
  EXTERNAL_API_ERROR = 'E1504',

  // Database errors (1600-1699)
  DATABASE_CONNECTION_ERROR = 'E1601',
  QUERY_FAILED = 'E1602',
  DATA_CORRUPTION = 'E1603',

  // Cache errors (1700-1799)
  CACHE_MISS = 'E1701',
  CACHE_WRITE_ERROR = 'E1702',
  CACHE_READ_ERROR = 'E1703',
  CACHE_INVALIDATION_ERROR = 'E1704',

  // Network errors (1800-1899)
  NETWORK_TIMEOUT = 'E1801',
  CONNECTION_REFUSED = 'E1802',
  DNS_RESOLUTION_ERROR = 'E1803',

  // System errors (1900-1999)
  INTERNAL_SERVER_ERROR = 'E1901',
  SERVICE_UNAVAILABLE = 'E1902',
  MEMORY_ERROR = 'E1903',
  DISK_SPACE_ERROR = 'E1904',

  // Rate limiting errors (2000-2099)
  RATE_LIMIT_EXCEEDED = 'E2001',
  TOO_MANY_REQUESTS = 'E2002',

  // Timeout errors (2100-2199)
  REQUEST_TIMEOUT = 'E2101',
  OPERATION_TIMEOUT = 'E2102',
  SERVICE_TIMEOUT = 'E2103'
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  component?: string;
  operation?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

// Base API Error class
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly userMessage: string;
  public readonly suggestions: string[];
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    severity: ErrorSeverity,
    statusCode: number,
    userMessage?: string,
    context?: ErrorContext,
    suggestions?: string[],
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
    this.context = context || {};
    this.suggestions = suggestions || [];
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);

    // Log the error
    this.logError();
  }

  private logError(): void {
    logger.error(`${this.category.toUpperCase()}: ${this.message}`, {
      ...this.context,
      metadata: {
        code: this.code,
        category: this.category,
        severity: this.severity,
        statusCode: this.statusCode,
        userMessage: this.userMessage,
        suggestions: this.suggestions,
        retryable: this.retryable,
        stack: this.stack
      }
    });
  }

  /**
   * Convert error to API response format
   */
  toResponse(): {
    success: false;
    error: {
      code: string;
      message: string;
      category: string;
      severity: string;
      suggestions?: string[];
      retryable: boolean;
      timestamp: string;
      context?: Record<string, any>;
    };
  } {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.userMessage,
        category: this.category,
        severity: this.severity,
        suggestions: this.suggestions.length > 0 ? this.suggestions : undefined,
        retryable: this.retryable,
        timestamp: this.timestamp,
        context: Object.keys(this.context).length > 0 ? this.context : undefined
      }
    };
  }

  /**
   * Check if error should trigger alert
   */
  shouldAlert(): boolean {
    return this.severity === ErrorSeverity.HIGH || this.severity === ErrorSeverity.CRITICAL;
  }
}

// Specific error classes for common scenarios
export class ValidationError extends ApiError {
  constructor(
    field: string,
    value: any,
    expected: string,
    context?: ErrorContext
  ) {
    super(
      `Validation failed for field '${field}': expected ${expected}, got ${typeof value}`,
      ErrorCode.VALIDATION_FAILED,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      `Invalid value for '${field}'. ${expected}`,
      context,
      [`Ensure '${field}' meets the required format: ${expected}`]
    );
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, identifier: string, context?: ErrorContext) {
    super(
      `${resource} not found: ${identifier}`,
      ErrorCode.RESOURCE_NOT_FOUND,
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.LOW,
      404,
      `The requested ${resource} could not be found`,
      context,
      [
        `Verify the ${resource} identifier is correct`,
        `Check available ${resource}s using the list endpoint`
      ]
    );
  }
}

export class AuthenticationError extends ApiError {
  constructor(reason: string, context?: ErrorContext) {
    super(
      `Authentication failed: ${reason}`,
      ErrorCode.INVALID_API_KEY,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401,
      'Authentication required. Please provide a valid API key',
      context,
      [
        'Ensure X-API-Key header is included',
        'Verify your API key is valid and active',
        'Contact support if you need a new API key'
      ]
    );
  }
}

export class RateLimitError extends ApiError {
  constructor(limit: number, windowMs: number, context?: ErrorContext) {
    super(
      `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      429,
      'Too many requests. Please slow down and try again later',
      context,
      [
        `You can make up to ${limit} requests per ${Math.floor(windowMs / 1000)} seconds`,
        'Implement exponential backoff in your requests',
        'Consider upgrading your plan for higher limits'
      ],
      true
    );
  }
}

export class ExternalServiceError extends ApiError {
  constructor(service: string, operation: string, originalError?: Error, context?: ErrorContext) {
    super(
      `External service error: ${service}.${operation} failed`,
      ErrorCode.EXTERNAL_API_ERROR,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      503,
      `Service temporarily unavailable. Please try again later`,
      context,
      [
        'Try your request again in a few moments',
        'Check our status page for service updates',
        'Contact support if the issue persists'
      ],
      true
    );

    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class TimeoutError extends ApiError {
  constructor(operation: string, timeoutMs: number, context?: ErrorContext) {
    super(
      `Operation timeout: ${operation} exceeded ${timeoutMs}ms`,
      ErrorCode.OPERATION_TIMEOUT,
      ErrorCategory.TIMEOUT,
      ErrorSeverity.MEDIUM,
      408,
      'Request timeout. The operation took too long to complete',
      context,
      [
        'Try your request again',
        'Consider reducing the complexity of your request',
        'Contact support if timeouts persist'
      ],
      true
    );
  }
}

export class BusinessLogicError extends ApiError {
  constructor(rule: string, details: string, context?: ErrorContext) {
    super(
      `Business rule violation: ${rule} - ${details}`,
      ErrorCode.INVALID_COLOR_COMBINATION,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.LOW,
      400,
      `Invalid combination: ${details}`,
      context,
      [
        'Review the combination rules',
        'Try alternative color combinations',
        'Use the validation endpoint to check combinations'
      ]
    );
  }
}

// Error factory for creating standardized errors
export class ErrorFactory {
  static createValidationError(
    field: string,
    value: any,
    expected: string,
    context?: ErrorContext
  ): ValidationError {
    return new ValidationError(field, value, expected, context);
  }

  static createNotFoundError(
    resource: string,
    identifier: string,
    context?: ErrorContext
  ): NotFoundError {
    return new NotFoundError(resource, identifier, context);
  }

  static createAuthenticationError(reason: string, context?: ErrorContext): AuthenticationError {
    return new AuthenticationError(reason, context);
  }

  static createRateLimitError(
    limit: number,
    windowMs: number,
    context?: ErrorContext
  ): RateLimitError {
    return new RateLimitError(limit, windowMs, context);
  }

  static createExternalServiceError(
    service: string,
    operation: string,
    originalError?: Error,
    context?: ErrorContext
  ): ExternalServiceError {
    return new ExternalServiceError(service, operation, originalError, context);
  }

  static createTimeoutError(
    operation: string,
    timeoutMs: number,
    context?: ErrorContext
  ): TimeoutError {
    return new TimeoutError(operation, timeoutMs, context);
  }

  static createBusinessLogicError(
    rule: string,
    details: string,
    context?: ErrorContext
  ): BusinessLogicError {
    return new BusinessLogicError(rule, details, context);
  }

  static createGenericError(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    severity: ErrorSeverity,
    statusCode: number,
    userMessage?: string,
    context?: ErrorContext,
    suggestions?: string[],
    retryable?: boolean
  ): ApiError {
    return new ApiError(
      message,
      code,
      category,
      severity,
      statusCode,
      userMessage,
      context,
      suggestions,
      retryable
    );
  }
}

// Error handler utility
export class ErrorHandler {
  /**
   * Handle and format any error for API response
   */
  static handleError(error: unknown, context?: ErrorContext): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      logger.error('Unhandled error converted to ApiError', {
        ...context,
        metadata: {
          originalError: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        }
      });

      return new ApiError(
        error.message,
        ErrorCode.INTERNAL_SERVER_ERROR,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        500,
        'An unexpected error occurred. Please try again later',
        context,
        ['Try your request again', 'Contact support if the issue persists'],
        true
      );
    }

    // Unknown error type
    logger.error('Unknown error type encountered', {
      ...context,
      metadata: {
        error: String(error),
        type: typeof error
      }
    });

    return new ApiError(
      'Unknown error occurred',
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      500,
      'An unexpected error occurred. Please try again later',
      context,
      ['Try your request again', 'Contact support if the issue persists'],
      true
    );
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: ApiError): boolean {
    return error.retryable || 
           error.category === ErrorCategory.EXTERNAL_SERVICE ||
           error.category === ErrorCategory.NETWORK ||
           error.category === ErrorCategory.TIMEOUT;
  }

  /**
   * Get retry delay for retryable errors
   */
  static getRetryDelay(attempt: number): number {
    // Exponential backoff: 2^attempt * 1000ms, max 30s
    return Math.min(Math.pow(2, attempt) * 1000, 30000);
  }
}

// Export common error instances for reuse
export const CommonErrors = {
  MISSING_API_KEY: new AuthenticationError('API key is required'),
  INVALID_API_KEY: new AuthenticationError('Invalid API key provided'),
  INTERNAL_ERROR: new ApiError(
    'Internal server error',
    ErrorCode.INTERNAL_SERVER_ERROR,
    ErrorCategory.SYSTEM,
    ErrorSeverity.HIGH,
    500,
    'An unexpected error occurred. Please try again later'
  )
};