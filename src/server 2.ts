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
import { knowledgeBankService } from "./services/knowledge-bank-service";
import { colorService } from "./services/color-service";
import { styleProfileService } from "./services/style-profile-service";
import { conversionService } from "./services/conversion-service";
import { createApiResponse } from "./utils/data-loader";
import { ValidationSchemas } from "./utils/validation-schemas";
import { authenticateApiKey, addAuthenticatedFlag } from "./middleware/auth";
import * as apiControllers from "./controllers/api";
import {
  ColorRecommendationRequest,
  StyleProfileRequest,
  ConversionOptimizationRequest
} from "./types/knowledge-bank";

const app = express();
const PORT = process.env['PORT'] || 3000;

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

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Cache invalidation middleware for data modification endpoints
app.use(cacheInvalidation(['*color*', '*trending*', '*style*', '*venue*']));

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://kctmenswear.com', 'https://www.kctmenswear.com', 'https://kct-menswear-v2.vercel.app']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup Swagger UI documentation (before authentication)
setupSwagger(app);

// Add documentation links to responses
app.use(addDocumentationLinks);

// Authentication middleware for protected routes (skip docs endpoints)
app.use((req, res, next) => {
  if (req.path.startsWith('/docs') || req.path === '/health') {
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
    console.log('🔄 Initializing knowledge bank services...');
    await knowledgeBankService.initialize();
    
    console.log('🔄 Initializing validation engines...');
    await Promise.allSettled([
      validationEngine.initialize(),
      colorRulesEngine.initialize(),
      formalityRulesEngine.initialize(),
      seasonalRulesEngine.initialize()
    ]);
    
    servicesInitialized = true;
    console.log('✅ Knowledge bank services and validation engines initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
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

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    services_initialized: servicesInitialized
  });
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
app.get("/api/colors", async (req, res) => {
  await initializeServices();
  await apiControllers.getColors(req, res);
});

app.get("/api/colors/:color/relationships", async (req, res) => {
  await initializeServices();
  await apiControllers.getColorRelationships(req, res);
});

// Combinations Validation API
app.post("/api/combinations/validate", async (req, res) => {
  await initializeServices();
  await apiControllers.validateCombinations(req, res);
});

// AI Recommendations API
app.post("/api/recommendations", async (req, res) => {
  await initializeServices();
  await apiControllers.getRecommendations(req, res);
});

// Trending Analysis API
app.get("/api/trending", async (req, res) => {
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
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Interactive API Documentation: http://localhost:${PORT}/docs`);
  console.log(`📄 OpenAPI Specification: http://localhost:${PORT}/docs/openapi.yaml`);
  console.log(`📋 Postman Collection: http://localhost:${PORT}/docs/postman`);
  console.log(`🔐 Authentication: API Key required (X-API-Key header)`);
  console.log(`💎 Knowledge Bank: Advanced Fashion Intelligence Platform`);
  console.log(`\n🎯 NEW PRIORITY ENDPOINTS:`);
  console.log(`  - Colors catalog: GET /api/colors`);
  console.log(`  - Color relationships: GET /api/colors/:color/relationships`);
  console.log(`  - Validate combinations: POST /api/combinations/validate`);
  console.log(`  - AI recommendations: POST /api/recommendations`);
  console.log(`  - Trending analysis: GET /api/trending`);
  console.log(`  - Venue recommendations: GET /api/venues/:type/recommendations`);
  console.log(`  - Style profiles: GET /api/styles/:profile`);
  console.log(`  - Fashion rules check: POST /api/rules/check`);
  console.log(`\n📍 LEGACY V1 ENDPOINTS:`);
  console.log(`  - V1 API base: http://localhost:${PORT}/api/v1`);
  console.log(`  - Color recommendations: POST /api/v1/colors/recommendations`);
  console.log(`  - Style profiles: POST /api/v1/profiles/identify`);
  console.log(`  - Conversion optimization: POST /api/v1/conversion/optimize`);
  console.log(`  - Outfit validation: POST /api/v1/validation/outfit`);
  console.log(`  - Personalization: POST /api/v1/personalization`);
  console.log(`  - Fashion intelligence: GET /api/v1/intelligence`);
  console.log(`\n🔧 VALIDATION ENGINES:`);
  console.log(`  - Advanced Fashion Rules Engine`);
  console.log(`  - Color Harmony & Contrast Analysis`);
  console.log(`  - Formality & Occasion Matching`);
  console.log(`  - Seasonal Appropriateness`);
  console.log(`  - Style Profile Consistency`);
  console.log(`  - Venue Requirements`);
  console.log(`  - Pattern Mixing Guidelines`);
  console.log(`\n⚡ Rate Limiting: 1000 requests/15min per IP`);
  console.log(`🛡️ Security: Helmet, CORS, API Key Authentication`);
  console.log(`🎨 AI-Powered: Confidence scoring, alternative suggestions, trend analysis`);
  
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
