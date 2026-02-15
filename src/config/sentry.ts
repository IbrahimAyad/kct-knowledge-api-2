/**
 * Sentry Configuration for Error Monitoring
 *
 * CRITICAL: This module must be imported BEFORE express or any other
 * instrumented library. Sentry.init() runs at module load time so that
 * subsequent imports of express, http, etc. are properly monkey-patched.
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry immediately at module load time (before express is imported)
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
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

    console.log(`✅ Sentry error monitoring initialized (env: ${process.env.NODE_ENV}, dsn: ${sentryDsn.split('@')[1]})`);
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
} else {
  console.warn('SENTRY_DSN not configured - error monitoring disabled');
}

/**
 * Kept for backward compatibility - now a no-op since init happens at import time
 */
export function initializeSentry() {
  // Sentry is already initialized at module load time above.
  // This function exists for backward compatibility with server.ts
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
