/**
 * Sentry Configuration for Error Monitoring
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from '../utils/logger';

/**
 * Initialize Sentry error monitoring
 */
export function initializeSentry() {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    logger.warn('SENTRY_DSN not configured - error monitoring disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        nodeProfilingIntegration(),
      ],

      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['x-api-key'];
          delete event.request.headers['authorization'];
        }

        // Remove sensitive query params
        if (event.request?.query_string && typeof event.request.query_string === 'string') {
          const cleaned = event.request.query_string
            .replace(/api_key=[^&]*/gi, 'api_key=[REDACTED]')
            .replace(/token=[^&]*/gi, 'token=[REDACTED]');
          event.request.query_string = cleaned;
        }

        return event;
      },

      // Ignore expected errors
      ignoreErrors: [
        'NetworkError',
        'fetch failed',
        'ECONNREFUSED',
        'ENOTFOUND',
        'timeout',
      ],
    });

    logger.info('✅ Sentry error monitoring initialized', {
      metadata: {
        environment: process.env.NODE_ENV,
        dsn: sentryDsn.split('@')[1] // Log only the domain part
      }
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture message with severity
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for tracking
 */
export function setUserContext(userId: string, data?: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    ...data,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}

/**
 * Express error handler middleware
 */
export const sentryErrorHandler = Sentry.setupExpressErrorHandler;

/**
 * Express request handler middleware
 */
export const sentryRequestHandler = Sentry.expressIntegration;

/**
 * Flush Sentry events before shutdown
 */
export async function closeSentry() {
  await Sentry.close(2000);
}

export default Sentry;
