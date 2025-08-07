/**
 * Test App Factory
 * Creates Express app instances for testing with proper middleware and route setup
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '../../middleware/error-handler';
import { performanceMiddleware } from '../../middleware/performance';
import { authMiddleware } from '../../middleware/auth';

// Import API controllers
import { setupIntelligenceRoutes } from '../helpers/test-routes-setup';

/**
 * Create Express app for testing
 */
export async function createTestApp(): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for testing
    hsts: false // Disable for testing
  }));

  // CORS
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  }));

  // Basic middleware
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting (more permissive for testing)
  app.use('/api', rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      success: false,
      error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Performance monitoring
  app.use(performanceMiddleware);

  // Authentication middleware (mock for testing)
  app.use('/api/v1/intelligence', (req, res, next) => {
    // Mock authentication - in real tests you'd provide auth tokens
    if (req.headers.authorization) {
      req.user = { id: 'test-user-1', role: 'authenticated' };
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'test'
    });
  });

  // Setup API routes
  await setupIntelligenceRoutes(app);

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });

  return app;
}

/**
 * Create minimal Express app for unit testing
 */
export function createMinimalTestApp(): Express {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Basic health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  return app;
}

/**
 * Create test app with specific middleware configuration
 */
export function createCustomTestApp(config: {
  enableAuth?: boolean;
  enableRateLimit?: boolean;
  enableCORS?: boolean;
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
}): Express {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Optional CORS
  if (config.enableCORS) {
    app.use(cors());
  }

  // Optional rate limiting
  if (config.enableRateLimit) {
    app.use(rateLimit({
      windowMs: config.rateLimit?.windowMs || 60000,
      max: config.rateLimit?.max || 100
    }));
  }

  // Optional authentication
  if (config.enableAuth) {
    app.use(authMiddleware);
  }

  return app;
}