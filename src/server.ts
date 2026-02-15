// CRITICAL: Sentry must be imported FIRST, before express, so it can instrument it
import {
  initializeSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureMessage
} from "./config/sentry";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
// Import caching and performance middleware
import {
  httpCache,
  cacheInvalidation,
  performanceTiming,
  memoryMonitoring
} from "./middleware/cache";
import {
  smartCompression,
  responseOptimization,
  connectionOptimization,
  performanceLogging,
  memoryLeakPrevention,
  performanceHealthCheck
} from "./middleware/performance";
// Import cache headers and rate limiting
import {
  CacheStrategies,
  clearCacheHeaders,
  conditionalRequest
} from "./middleware/cache-headers";
import {
  EndpointRateLimits,
  createApiKeyRateLimiter,
  getRateLimitStatus
} from "./middleware/rate-limiting";
// Import Swagger UI middleware
import { setupSwagger, addDocumentationLinks } from "./middleware/swagger";
// Import validation engines
import { validationEngine } from "./services/validation-engine";
import { colorRulesEngine } from "./services/color-rules-engine";
import { formalityRulesEngine } from "./services/formality-rules-engine";
import { seasonalRulesEngine } from "./services/seasonal-rules-engine";
// Import existing services
import { cacheService } from "./services/cache-service";
import { cacheInvalidationService } from "./services/cache-invalidation";
import { healthMonitor } from "./services/health-monitor";
import { metricsCollector } from "./services/metrics-collector";
import { enhancedHealthService } from "./services/enhanced-health-service";
import { knowledgeBankService } from "./services/knowledge-bank-service";
import { productCatalogService } from "./services/product-catalog-service";
import { databaseService } from "./config/database";
import { colorService } from "./services/color-service";
import { styleProfileService } from "./services/style-profile-service";
import { conversionService } from "./services/conversion-service";
import { createApiResponse } from "./utils/data-loader";
import { ValidationSchemas } from "./utils/validation-schemas";
import { authenticateApiKey, addAuthenticatedFlag } from "./middleware/auth";
import * as apiControllers from "./controllers/api";
import { analyticsSummaryService } from "./services/analytics-summary-service";
import analyticsRouter from "./routes/analytics";
// SEO routes temporarily disabled - Puppeteer requires Chrome which isn't in Alpine Docker
// import seoRouter from "./routes/seo-routes";
// Voice routes disabled - not used by kctmenswear.com frontend
// import voiceRouter from "./routes/voice-routes";
import v2Router from "./routes/v2-compatibility";
import {
  ColorRecommendationRequest,
  StyleProfileRequest,
  ConversionOptimizationRequest
} from "./types/knowledge-bank";

const app = express();
const PORT = process.env['PORT'] || 3000;

// Initialize Sentry for error monitoring (must be first)
initializeSentry();

// Security and Performance Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for API usage
  crossOriginEmbedderPolicy: false
}));

// Enhanced compression with smart compression
app.use(smartCompression());

// Performance optimization middleware
app.use(responseOptimization());
app.use(connectionOptimization());
app.use(performanceLogging());
app.use(memoryLeakPrevention());
app.use(performanceTiming());
app.use(memoryMonitoring());

// Cache headers and conditional requests
app.use(conditionalRequest());
app.use(clearCacheHeaders());

// Global API key-based rate limiting (higher limits for authenticated requests)
const globalLimiter = createApiKeyRateLimiter(500, 100);
app.use('/api/', globalLimiter);

// Cache invalidation middleware - ONLY for fashion data modification endpoints
// Do NOT apply globally: analytics POST writes were clearing trending/color caches on every page view
app.use('/api/v1', cacheInvalidation(['*color*', '*trending*', '*style*', '*venue*']));
app.use('/api/v2', cacheInvalidation(['*color*', '*trending*', '*style*', '*venue*']));
app.use('/api/colors', cacheInvalidation(['*color*']));
app.use('/api/combinations', cacheInvalidation(['*color*', '*style*']));
app.use('/api/recommendations', cacheInvalidation(['*trending*', '*style*']));

// CORS Configuration with Monitoring
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          'https://kctmenswear.com',
          'http://kctmenswear.com',  // Allow HTTP (will redirect to HTTPS)
          'https://www.kctmenswear.com',
          'http://www.kctmenswear.com',  // Allow HTTP (will redirect to HTTPS)
          'https://kct-menswear-v2.vercel.app',
          'https://kct-menswear-2025.pages.dev'  // Cloudflare Pages deployment
        ]
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or is a Lovable preview domain
    // FIXED: Lovable uses both .lovable.app AND .lovableproject.com domains
    const isLovablePreview = origin.includes('.lovable.app') || origin.includes('.lovableproject.com');
    if (allowedOrigins.indexOf(origin) !== -1 || isLovablePreview) {
      console.log(`✅ CORS allowed: ${origin}`);
      callback(null, true);
    } else {
      // Log and monitor blocked origins
      console.warn(`⛔ CORS blocked: ${origin}`);

      // Send to Sentry for monitoring
      captureMessage(
        `CORS request blocked from origin: ${origin}`,
        'warning',
        {
          origin,
          allowedOrigins,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      );

      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup Swagger UI documentation (before authentication)
setupSwagger(app);

// Add documentation links to responses
app.use(addDocumentationLinks);

// Authentication middleware for protected routes (skip public endpoints)
app.use((req, res, next) => {
  const publicPaths = [
    '/docs',
    '/health',
    '/',
    '/api/trending',
    '/api/trends', // Add this for backwards compatibility
    '/api/colors',
    '/api/combinations/validate',
    '/api/recommendations',
    '/api/venues',
    '/api/styles',
    '/api/rules/check',
    '/api/analytics', // Public analytics endpoints
    '/api/rate-limit-status', // Rate limit status endpoint
    '/api/v3/voice' // Voice AI endpoints (customer-facing)
  ];

  const isPublicPath = publicPaths.some(path =>
    req.path === path || req.path.startsWith(path)
  );

  if (isPublicPath) {
    return next();
  }
  return authenticateApiKey(req, res, next);
});
app.use(addAuthenticatedFlag);

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize services on startup
let servicesInitialized = false;
const initializeServices = async () => {
  if (servicesInitialized) return;
  try {
    console.log('🔄 Initializing database connection...');
    await databaseService.initialize();
    await databaseService.createTables();

    console.log('🔄 Initializing knowledge bank services...');
    await knowledgeBankService.initialize();

    console.log('🔄 Initializing product catalog...');
    await productCatalogService.initialize();

    console.log('🔄 Initializing validation engines...');
    await Promise.allSettled([
      validationEngine.initialize(),
      colorRulesEngine.initialize(),
      formalityRulesEngine.initialize(),
      seasonalRulesEngine.initialize()
    ]);

    servicesInitialized = true;
    enhancedHealthService.setServicesReady(true);
    console.log('✅ Knowledge bank services and validation engines initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    enhancedHealthService.setServicesReady(false);
    throw error;
  }
};

app.get("/", (_req, res) => {
  res.json({
    message: "KCT Knowledge API v2.0.0 - Fashion Intelligence Platform",
    status: "active",
    description: "Comprehensive fashion knowledge base with AI-powered recommendations",
    endpoints: {
      health: "/health",
      system_health: "/api/v1/health",
      colors: "/api/v1/colors",
      recommendations: "/api/v1/recommendations",
      profiles: "/api/v1/profiles",
      conversion: "/api/v1/conversion",
      intelligence: "/api/v1/intelligence",
      validation: "/api/v1/validation",
      personalization: "/api/v1/personalization",
      info: "/api/v1/info"
    },
    documentation: {
      interactive: "/docs",
      openapi_spec: "/docs/openapi.yaml",
      integration_guide: "/docs/API_INTEGRATION_GUIDE.md",
      postman_collection: "/docs/postman"
    },
    version: "2.0.0"
  });
});

// Basic health check (backwards compatibility)
app.get("/health",
  EndpointRateLimits.HEALTH,
  (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      services_initialized: servicesInitialized
    });
  });

// Comprehensive health check (detailed status)
app.get("/health/detailed",
  EndpointRateLimits.HEALTH,
  async (_req, res) => {
    try {
      const health = await enhancedHealthService.getComprehensiveHealth();
      const statusCode = health.status === 'pass' ? 200 : health.status === 'warn' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'fail',
        version: '2.0.0',
        output: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  });

// Readiness probe (Kubernetes/Railway compatible)
app.get("/health/ready",
  EndpointRateLimits.HEALTH,
  async (_req, res) => {
    try {
      const health = await enhancedHealthService.getReadinessProbe();
      const statusCode = health.status === 'pass' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'fail',
        version: '2.0.0',
        checks: {
          'error': {
            status: 'fail',
            output: error instanceof Error ? error.message : 'Readiness check failed'
          }
        }
      });
    }
  });

// Liveness probe (Kubernetes/Railway compatible)
app.get("/health/live",
  EndpointRateLimits.HEALTH,
  async (_req, res) => {
    try {
      const health = await enhancedHealthService.getLivenessProbe();
      const statusCode = health.status === 'pass' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'fail',
        version: '2.0.0',
        checks: {
          'error': {
            status: 'fail',
            output: 'Liveness check failed - process not responsive'
          }
        }
      });
    }
  });

// Startup probe (Kubernetes compatible)
app.get("/health/startup",
  EndpointRateLimits.HEALTH,
  async (_req, res) => {
    try {
      const health = await enhancedHealthService.getStartupProbe();
      const statusCode = health.status === 'pass' ? 200 : health.status === 'warn' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'fail',
        version: '2.0.0',
        output: error instanceof Error ? error.message : 'Startup check failed'
      });
    }
  });

// Performance metrics endpoint
app.get("/health/performance", performanceHealthCheck());

// Cache health endpoint
app.get("/health/cache", async (_req, res) => {
  try {
    const cacheHealth = await cacheService.getHealthInfo();
    res.json({
      success: true,
      data: cacheHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Cache health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// System health endpoint
app.get("/health/system", async (_req, res) => {
  try {
    const systemHealth = await healthMonitor.getSystemHealth();
    res.json({
      success: true,
      data: systemHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'System health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
app.get("/health/metrics", async (_req, res) => {
  try {
    const metrics = await metricsCollector.getMetricsSnapshot();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Metrics collection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Comprehensive system health check
app.get("/api/v1/health", async (_req, res) => {
  try {
    await initializeServices();
    const healthData = await knowledgeBankService.getSystemHealth();
    res.json(createApiResponse(true, healthData));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Health check failed'
    ));
  }
});

// Color Service Endpoints with caching
app.get("/api/v1/colors",
  EndpointRateLimits.COLORS,
  CacheStrategies.LONG(),
  httpCache({
    ttl: 24 * 60 * 60, // 24 hours
    tags: ['colors']
  }),
  async (_req, res) => {
    try {
      await initializeServices();
      const colorFamilies = await colorService.getColorFamilies();
      const universalRules = await colorService.getUniversalRules();
      const trendingColors = await colorService.getTrendingColors();

      res.json(createApiResponse(true, {
        color_families: colorFamilies,
        universal_rules: universalRules,
        trending: trendingColors
      }));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to load color data'
      ));
    }
  });

app.post("/api/v1/colors/recommendations",
  EndpointRateLimits.AI_RECOMMENDATIONS,
  ValidationSchemas.validateColorRecommendationRequest,
  async (req, res) => {
    try {
      await initializeServices();
      const request: ColorRecommendationRequest = req.body;
      
      if (!request.suit_color) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'suit_color is required'
        ));
      }
      
      const recommendations = await colorService.getColorRecommendations(request);
      res.json(createApiResponse(true, recommendations));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to get color recommendations'
      ));
    }
  });

app.get("/api/v1/colors/:color/complementary", async (req, res) => {
  try {
    await initializeServices();
    const { color } = req.params;
    const complementaryColors = await colorService.findComplementaryColors(color);
    res.json(createApiResponse(true, complementaryColors));
  } catch (error) {
    res.status(404).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Color not found'
    ));
  }
});

// Comprehensive Recommendations Endpoint
app.post("/api/v1/recommendations", async (req, res) => {
  try {
    await initializeServices();
    const recommendations = await knowledgeBankService.getComprehensiveRecommendations(req.body);
    res.json(createApiResponse(true, recommendations));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to get recommendations'
    ));
  }
});

// Style Profile Service Endpoints
app.post("/api/v1/profiles/identify", 
  ValidationSchemas.validateStyleProfileRequest,
  async (req, res) => {
    try {
      await initializeServices();
      const request: StyleProfileRequest = req.body;
      const profile = await styleProfileService.identifyProfile(request);
      res.json(createApiResponse(true, profile));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to identify profile'
      ));
    }
  });

app.get("/api/v1/profiles", async (_req, res) => {
  try {
    await initializeServices();
    const profiles = await styleProfileService.getAllProfiles();
    res.json(createApiResponse(true, profiles));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to load profiles'
    ));
  }
});

app.get("/api/v1/profiles/:profileName", async (req, res) => {
  try {
    await initializeServices();
    const { profileName } = req.params;
    const profile = await styleProfileService.getProfile(profileName);
    
    if (!profile) {
      return res.status(404).json(createApiResponse(
        false,
        undefined,
        'Profile not found'
      ));
    }
    
    res.json(createApiResponse(true, profile));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to load profile'
    ));
  }
});

app.get("/api/v1/profiles/quiz/questions", async (_req, res) => {
  try {
    await initializeServices();
    const questions = await styleProfileService.getQuizQuestions();
    res.json(createApiResponse(true, questions));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to load quiz questions'
    ));
  }
});

// Conversion Service Endpoints
app.post("/api/v1/conversion/optimize", 
  ValidationSchemas.validateConversionOptimizationRequest,
  async (req, res) => {
  try {
    await initializeServices();
    const request: ConversionOptimizationRequest = req.body;
    const optimization = await conversionService.getConversionOptimization(request);
    res.json(createApiResponse(true, optimization));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to get conversion optimization'
    ));
  }
});

app.get("/api/v1/conversion/top-combinations", async (req, res) => {
  try {
    await initializeServices();
    const limit = parseInt(req.query['limit'] as string) || 10;
    const topCombinations = await conversionService.getTopConvertingCombinations(limit);
    res.json(createApiResponse(true, topCombinations));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to get top combinations'
    ));
  }
});

app.get("/api/v1/conversion/occasion/:occasion", async (req, res) => {
  try {
    await initializeServices();
    const { occasion } = req.params;
    const data = await conversionService.getConversionByOccasion(occasion);
    res.json(createApiResponse(true, data));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to get occasion data'
    ));
  }
});

app.post("/api/v1/conversion/predict", 
  ValidationSchemas.validateConversionPredictionRequest,
  async (req, res) => {
    try {
      await initializeServices();
      const { combination, customer_profile, occasion, device, season } = req.body;
      
      if (!combination) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'combination is required'
        ));
      }
      
      const prediction = await conversionService.predictConversionRate(
        combination,
        customer_profile,
        occasion,
        device,
        season
      );
      res.json(createApiResponse(true, prediction));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to predict conversion rate'
      ));
    }
  });

// Fashion Intelligence Endpoints
app.get("/api/v1/intelligence", async (_req, res) => {
  try {
    await initializeServices();
    const intelligence = await knowledgeBankService.getFashionIntelligence();
    res.json(createApiResponse(true, intelligence));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to get fashion intelligence'
    ));
  }
});

// Outfit Validation Endpoint
app.post("/api/v1/validation/outfit", 
  ValidationSchemas.validateOutfitValidationRequest,
  async (req, res) => {
    try {
      await initializeServices();
      const { suit_color, shirt_color, tie_color, occasion, customer_profile } = req.body;
      
      if (!suit_color || !shirt_color || !tie_color) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'suit_color, shirt_color, and tie_color are required'
        ));
      }
      
      const validation = await knowledgeBankService.validateAndOptimizeOutfit({
        suit_color,
        shirt_color,
        tie_color,
        occasion,
        customer_profile
      });
      res.json(createApiResponse(true, validation));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to validate outfit'
      ));
    }
  });

// Personalization Endpoint
app.post("/api/v1/personalization", 
  ValidationSchemas.validatePersonalizationRequest,
  async (req, res) => {
  try {
    await initializeServices();
    const personalization = await knowledgeBankService.getPersonalizedExperience(req.body);
    res.json(createApiResponse(true, personalization));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to get personalization data'
    ));
  }
});

// Knowledge Bank Info Endpoint
app.get("/api/v1/info", async (_req, res) => {
  try {
    await initializeServices();
    const info = await knowledgeBankService.getKnowledgeBankInfo();
    res.json(createApiResponse(true, info));
  } catch (error) {
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Failed to get knowledge bank info'
    ));
  }
});

// ===== NEW PRIORITY API ENDPOINTS =====

// Core Colors API
app.get("/api/colors",
  EndpointRateLimits.COLORS,
  CacheStrategies.LONG(),
  async (req, res) => {
    await initializeServices();
    await apiControllers.getColors(req, res);
  });

app.get("/api/colors/:color/relationships", async (req, res) => {
  await initializeServices();
  await apiControllers.getColorRelationships(req, res);
});

// Combinations Validation API
app.post("/api/combinations/validate",
  EndpointRateLimits.VALIDATION,
  async (req, res) => {
    await initializeServices();
    await apiControllers.validateCombinations(req, res);
  });

// AI Recommendations API
app.post("/api/recommendations",
  EndpointRateLimits.AI_RECOMMENDATIONS,
  async (req, res) => {
    await initializeServices();
    await apiControllers.getRecommendations(req, res);
  });

// Trending Analysis API
app.get("/api/trending",
  EndpointRateLimits.TRENDING,
  CacheStrategies.SHORT(),
  async (req, res) => {
    await initializeServices();
    await apiControllers.getTrending(req, res);
  });

// Backwards compatibility endpoint for /api/trends/current
app.get("/api/trends/current",
  EndpointRateLimits.TRENDING,
  CacheStrategies.SHORT(),
  async (req, res) => {
    await initializeServices();
    await apiControllers.getTrending(req, res);
  });

// Venue-Specific Recommendations API
app.get("/api/venues/:type/recommendations", async (req, res) => {
  await initializeServices();
  await apiControllers.getVenueRecommendations(req, res);
});

// Style Profile API
app.get("/api/styles/:profile", async (req, res) => {
  await initializeServices();
  await apiControllers.getStyleProfile(req, res);
});

// Fashion Rules Validation API
app.post("/api/rules/check", async (req, res) => {
  await initializeServices();
  await apiControllers.checkFashionRules(req, res);
});

// ===== ANALYTICS ENDPOINTS =====

// Comprehensive analytics summary
app.get("/api/analytics/summary",
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.MEDIUM(),
  async (_req, res) => {
    try {
      await initializeServices();
      const summary = await analyticsSummaryService.getSummary();
      res.json(createApiResponse(true, summary));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to get analytics summary'
      ));
    }
  });

// Backwards compatibility endpoint
app.get("/api/analytics/get_analytics_summary",
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.MEDIUM(),
  async (_req, res) => {
    try {
      await initializeServices();
      const summary = await analyticsSummaryService.getSummary();
      res.json(createApiResponse(true, summary));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to get analytics summary'
      ));
    }
  });

// Quick stats endpoint for lightweight requests
app.get("/api/analytics/stats",
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (_req, res) => {
    try {
      await initializeServices();
      const stats = await analyticsSummaryService.getQuickStats();
      res.json(createApiResponse(true, stats));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to get quick stats'
      ));
    }
  });

// Rate limit status endpoint
app.get("/api/rate-limit-status", getRateLimitStatus());

// Analytics routes
app.use("/api/analytics", analyticsRouter);

// SEO Crawler routes - temporarily disabled (Puppeteer needs Chrome)
// app.use("/api/seo", seoRouter);

// Voice AI routes - disabled (not used by kctmenswear.com frontend)
// app.use("/api/v3/voice", voiceRouter);

// V2 Compatibility routes (complete-the-look, recommendations, outfit analysis)
app.use("/api/v2", v2Router);

// Alias routes for frontend compatibility
// Lovable calls /api/recommendations/complete-look but v2 router has /products/complete-the-look
app.post("/api/recommendations/complete-look", async (req, res) => {
  await initializeServices();
  // Forward to v2 complete-the-look handler
  req.url = '/products/complete-the-look';
  v2Router.handle(req, res, () => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });
});

// Lovable calls /api/style/validate-outfit but server only has /api/v1/validation/outfit
app.post("/api/style/validate-outfit",
  ValidationSchemas.validateOutfitValidationRequest,
  async (req, res) => {
    try {
      await initializeServices();
      const { suit_color, shirt_color, tie_color, occasion, customer_profile } = req.body;

      if (!suit_color || !shirt_color || !tie_color) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'suit_color, shirt_color, and tie_color are required'
        ));
      }

      const validation = await knowledgeBankService.validateAndOptimizeOutfit({
        suit_color,
        shirt_color,
        tie_color,
        occasion,
        customer_profile
      });
      res.json(createApiResponse(true, validation));
    } catch (error) {
      res.status(500).json(createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Failed to validate outfit'
      ));
    }
  });

// Sentry error handler (must be before other error handlers)
sentryErrorHandler(app);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    timestamp: new Date().toISOString()
  });
});

// 404 handler  
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
app.listen(PORT, async () => {
  console.log(`🚀 KCT Knowledge API v2.0.0 running on port ${PORT}`);
  console.log(`📚 Docs: http://localhost:${PORT}/docs | Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: API Key (X-API-Key) | ⚡ Rate limit: 1000 req/15min`);
  console.log(`🎯 Endpoints: /api/colors, /api/recommendations, /api/trending, /api/v2/*`);
  console.log(`🛡️ Security: Helmet, CORS, Sentry | Node ${process.version}`);
  
  // Initialize services and cache in background
  initializeServices().then(async () => {
    // Schedule periodic cache refresh
    cacheInvalidationService.schedulePeriodicRefresh();
    
    // Warm up cache for critical endpoints
    console.log('🔥 Warming up cache...');
    try {
      await Promise.allSettled([
        colorService.getColorFamilies(),
        colorService.getUniversalRules(),
        colorService.getTrendingColors(),
        styleProfileService.getAllProfiles(),
      ]);
      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.warn('⚠️ Cache warm-up partially failed:', error);
    }
  }).catch(error => {
    console.error('Failed to initialize services on startup:', error);
  });
});

export default app;
export { initializeServices };
