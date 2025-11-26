import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import 'express-async-errors';
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
import { trendingAnalysisService } from "./services/trending-analysis-service";
import { systemHealthService } from "./services/system-health-service";
import { createApiResponse } from "./utils/data-loader";
import { ValidationSchemas } from "./utils/validation-schemas";
import { authenticateApiKey, addAuthenticatedFlag } from "./middleware/auth";
import { 
  globalErrorHandler, 
  notFoundHandler, 
  asyncHandler, 
  gracefulDegradation,
  performanceMonitoring,
  requestTimeout,
  buildErrorContext
} from "./middleware/error-handler";
import { logger } from "./utils/logger";
import * as apiControllers from "./controllers/api";
import * as fashionClipControllers from "./controllers/fashion-clip-api";
import * as smartBundleControllers from "./controllers/smart-bundle-api";
import * as intelligenceControllers from "./controllers/intelligence-api";
import {
  ColorRecommendationRequest,
  StyleProfileRequest,
  ConversionOptimizationRequest
} from "./types/knowledge-bank";
// Import new services
import { fashionClipService } from "./services/fashion-clip-service";
import { visualAnalysisEngine } from "./services/visual-analysis-engine";
import { colorExtractionService } from "./services/color-extraction-service";
import { aiScoringSystem } from "./services/ai-scoring-system";
import { smartBundleService } from "./services/smart-bundle-service";
// Import Phase 2 intelligence services
import { customerPsychologyService } from "./services/customer-psychology-service";
import { careerIntelligenceService } from "./services/career-intelligence-service";
import { venueIntelligenceService } from "./services/venue-intelligence-service";
import { culturalAdaptationService } from "./services/cultural-adaptation-service";
// Import Phase 3 services
import { advancedPersonalizationService } from "./services/advanced-personalization-service";
import { salesOptimizationService } from "./services/sales-optimization-service";
import { predictiveAnalyticsService } from "./services/predictive-analytics-service";
import { customerSegmentationService } from "./services/customer-segmentation-service";
import { chatIntegrationService } from "./services/chat-integration-service";
import * as phase3Controllers from "./controllers/phase3-integration-controller";
// Import Chat services (Phase 1)
import { chatController } from "./controllers/chat-controller";
import { databaseService } from "./config/database";
// Import V2 Compatibility Router
import v2CompatibilityRouter from "./routes/v2-compatibility";

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

// Request timeout middleware (30 seconds)
app.use(requestTimeout(30000));

// Performance monitoring middleware
app.use(performanceMonitoring);

// Graceful degradation middleware
app.use(gracefulDegradation);

// Cache invalidation middleware for data modification endpoints
app.use(cacheInvalidation(['*color*', '*trending*', '*style*', '*venue*']));

// CORS Configuration with support for environment variables
const getAllowedOrigins = () => {
  if (process.env.CORS_ALLOWED_ORIGINS) {
    return process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }
  return process.env.NODE_ENV === 'production'
    ? [
        'https://kctmenswear.com',
        'https://www.kctmenswear.com',
        'https://kct-menswear-v2.vercel.app',
        'https://*.lovable.app', // Lovable preview domains
        'https://preview--kct-viral-looks-shop.lovable.app' // Specific Lovable preview
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://*.lovable.app', // Lovable preview domains (for testing)
        'https://preview--kct-viral-looks-shop.lovable.app'
      ];
};

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed (including wildcard support)
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return false;
    });
    
    callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'x-api-key'],
  optionsSuccessStatus: 200
}));

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
    '/api/recommendations',
    '/api/v2', // All v2 endpoints are public
    '/api/combinations/validate',
    '/api/colors',
    '/api/trending',
    '/api/venues',
    '/api/styles'
  ];
  
  const isPublicPath = publicPaths.some(path => 
    req.path.startsWith(path) || req.path === path
  );
  
  if (isPublicPath) {
    return next();
  }
  return authenticateApiKey(req, res, next);
});
app.use(addAuthenticatedFlag);

// Request logging middleware (now handled by performance monitoring)
// Removed console.log in favor of structured logging

// Initialize services on startup
let servicesInitialized = false;
const initializeServices = async () => {
  if (servicesInitialized) return;
  try {
    logger.info('🔄 Initializing database service...');
    await databaseService.initialize();
    await databaseService.createTables();
    
    logger.info('🔄 Initializing knowledge bank services...');
    await knowledgeBankService.initialize();
    
    logger.info('🔄 Initializing validation engines...');
    await Promise.allSettled([
      validationEngine.initialize(),
      colorRulesEngine.initialize(),
      formalityRulesEngine.initialize(),
      seasonalRulesEngine.initialize()
    ]);
    
    logger.info('🔄 Initializing trending analysis service...');
    await trendingAnalysisService.initialize();
    
    logger.info('🔄 Initializing system health service...');
    await systemHealthService.initialize();
    
    logger.info('🔄 Initializing Fashion-CLIP services...');
    await Promise.allSettled([
      fashionClipService.initialize(),
      visualAnalysisEngine.initialize(),
      colorExtractionService.initialize(),
      aiScoringSystem.initialize(),
      smartBundleService.initialize()
    ]);
    
    logger.info('🔄 Initializing Phase 2 Intelligence services...');
    await Promise.allSettled([
      customerPsychologyService.initialize(),
      careerIntelligenceService.initialize(),
      venueIntelligenceService.initialize(),
      culturalAdaptationService.initialize()
    ]);
    
    logger.info('🔄 Initializing Phase 3 Advanced services...');
    await Promise.allSettled([
      advancedPersonalizationService.initialize(),
      salesOptimizationService.initialize(),
      predictiveAnalyticsService.initialize(),
      customerSegmentationService.initialize(),
      chatIntegrationService.initialize()
    ]);
    
    logger.info('🔄 Initializing Chat services (Phase 1)...');
    await chatController.initialize();
    
    // Voice services temporarily disabled for production deployment
    // logger.info('🔄 Initializing Voice services...');
    // const { voiceService } = await import("./services/voice-service");
    // await voiceService.initialize();
    
    servicesInitialized = true;
    logger.info('✅ All services initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
};

app.get("/", (_req, res) => {
  res.json({
    message: "KCT Knowledge API v2.0.0 - Fashion Intelligence Platform",
    status: "active",
    description: "Comprehensive fashion knowledge base with AI-powered recommendations and advanced visual analysis",
    endpoints: {
      // V1 Legacy Endpoints
      v1: {
        health: "/api/v1/health",
        colors: "/api/v1/colors",
        recommendations: "/api/v1/recommendations",
        profiles: "/api/v1/profiles",
        conversion: "/api/v1/conversion",
        intelligence: "/api/v1/intelligence",
        validation: "/api/v1/validation",
        personalization: "/api/v1/personalization",
        info: "/api/v1/info"
      },
      // V2 Advanced AI Endpoints
      v2: {
        fashion_clip: {
          analyze_image: "POST /api/v2/fashion-clip/analyze",
          comprehensive_analysis: "POST /api/v2/visual-analysis/comprehensive",
          image_to_outfit: "POST /api/v2/visual-analysis/image-to-outfit",
          extract_colors: "POST /api/v2/colors/extract",
          match_colors: "POST /api/v2/colors/match",
          occasion_palette: "GET /api/v2/colors/occasions/:occasion/palette",
          style_transfer: "POST /api/v2/style-transfer/apply",
          style_analysis: "POST /api/v2/style-transfer/analyze",
          similar_items: "POST /api/v2/similarity/search",
          health: "/api/v2/fashion-clip/health"
        },
        smart_bundles: {
          generate: "POST /api/v2/bundles/generate",
          customize: "POST /api/v2/bundles/customize",
          from_image: "POST /api/v2/bundles/generate-from-image",
          segment_recommendations: "POST /api/v2/bundles/segment-recommendations",
          score_bulk: "POST /api/v2/bundles/score-bulk",
          score_single: "POST /api/v2/bundles/score",
          optimize: "POST /api/v2/bundles/optimize",
          trending: "GET /api/v2/bundles/trending",
          analytics: "POST /api/v2/bundles/analytics",
          health: "/api/v2/bundles/health"
        },
        intelligence: {
          psychology_analysis: "POST /api/v2/intelligence/psychology/analyze",
          career_trajectory: "GET /api/v2/intelligence/career/trajectory/:customerId",
          venue_optimization: "POST /api/v2/intelligence/venue/optimize",
          cultural_adaptation: "POST /api/v2/intelligence/cultural/adapt",
          fabric_performance: "GET /api/v2/intelligence/fabric/performance/:fabricType",
          health: "GET /api/v2/intelligence/health"
        }
      },
      // V3 Customer Facing Chat (Phase 1)
      v3: {
        chat: {
          start_conversation: "POST /api/v3/chat/conversation/start",
          send_message: "POST /api/v3/chat/conversation/message",
          get_history: "GET /api/v3/chat/conversation/history/:sessionId",
          end_conversation: "POST /api/v3/chat/conversation/end",
          analytics: "GET /api/v3/chat/analytics/patterns",
          health: "GET /api/v3/chat/health"
        },
        voice: {
          transcribe: "POST /api/v3/voice/transcribe",
          synthesize: "POST /api/v3/voice/synthesize",
          chat: "POST /api/v3/voice/chat",
          stream: "GET /api/v3/voice/stream/:sessionId",
          languages: "GET /api/v3/voice/languages",
          feedback: "POST /api/v3/voice/feedback"
        }
      },
      // V4 Phase 3 Advanced Features
      v4: {
        personalization: {
          profile: "GET /api/v1/personalization/profile/:customerId",
          update_profile: "POST /api/v1/personalization/profile/:customerId/update",
          recommendations: "POST /api/v1/personalization/recommendations",
          learn: "POST /api/v1/personalization/learn",
          predict: "GET /api/v1/personalization/predict/:customerId/:predictionType"
        },
        sales_optimization: {
          recommendations: "POST /api/v1/sales-optimization/recommendations",
          pricing: "GET /api/v1/sales-optimization/pricing/:customerId",
          bundles: "GET /api/v1/sales-optimization/bundles/:customerId",
          cross_sell: "GET /api/v1/sales-optimization/cross-sell/:customerId",
          cart_recovery: "POST /api/v1/sales-optimization/cart-recovery",
          analytics: "GET /api/v1/sales-optimization/analytics"
        },
        predictive_analytics: {
          analyze: "POST /api/v1/predictive-analytics/analyze",
          churn: "GET /api/v1/predictive-analytics/churn/:customerId",
          ltv: "GET /api/v1/predictive-analytics/ltv/:customerId",
          purchase_probability: "GET /api/v1/predictive-analytics/purchase-probability/:customerId",
          next_best_action: "GET /api/v1/predictive-analytics/next-best-action/:customerId",
          seasonal_trends: "GET /api/v1/predictive-analytics/seasonal-trends"
        },
        segmentation: {
          segment: "GET /api/v1/segmentation/segment/:customerId",
          adapt_persona: "POST /api/v1/segmentation/adapt-persona/:customerId",
          analysis: "GET /api/v1/segmentation/analysis",
          targeting: "POST /api/v1/segmentation/targeting"
        },
        integration: {
          customer_intelligence: "GET /api/v1/integration/customer-intelligence/:customerId",
          enhanced_chat: "POST /api/v1/integration/enhanced-chat",
          health: "GET /api/v1/integration/health"
        }
      }
    },
    features: {
      fashion_clip_integration: "Advanced image analysis and visual recommendations",
      ai_scoring_system: "Comprehensive bundle scoring with conversion probability",
      smart_bundle_generation: "Intelligent outfit creation with price optimization",
      visual_analysis_engine: "Deep learning fashion intelligence",
      color_extraction: "Advanced color analysis and matching",
      style_transfer: "AI-powered style transformation",
      personalization: "Customer-specific recommendations and insights",
      // Phase 2 Intelligence Features
      customer_psychology: "Behavioral analysis and decision fatigue detection",
      career_intelligence: "Professional trajectory tracking and wardrobe optimization",
      venue_intelligence: "Location-specific styling with lighting analysis",
      cultural_adaptation: "Regional preferences and cultural sensitivity",
      fabric_performance: "Technical analysis and performance recommendations",
      // Phase 1 Chat Features
      customer_facing_chat: "AI-powered conversational customer service with Atelier AI, RESTORE™, and PRECISION™ frameworks",
      conversation_management: "Complete session tracking with context preservation and state management",
      multi_framework_intelligence: "Dynamic framework selection based on customer needs and conversation context",
      sterling_crown_personality: "Luxury menswear expertise with 'Luxury is a mindset, not a price tag' philosophy",
      // Phase 3 Advanced Features
      advanced_personalization: "Comprehensive customer profiles with behavioral analytics and predictive insights",
      sales_optimization: "Dynamic pricing, intelligent bundling, and revenue maximization algorithms",
      predictive_analytics: "Customer lifetime value prediction, churn risk assessment, and next-best-action recommendations",
      customer_segmentation: "Real-time behavioral clustering with dynamic persona adaptation",
      integrated_intelligence: "360-degree customer view with cross-service orchestration"
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

app.get("/health", asyncHandler(async (_req, res) => {
  const healthCheck = await systemHealthService.getHealthCheck();
  res.json(healthCheck);
}));

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
app.get("/health/system", asyncHandler(async (_req, res) => {
  const systemHealth = await systemHealthService.getSystemHealth();
  res.json({
    success: true,
    data: systemHealth,
    timestamp: new Date().toISOString()
  });
}));

// Metrics endpoint
app.get("/health/metrics", asyncHandler(async (_req, res) => {
  const metrics = await metricsCollector.getMetricsSnapshot();
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString()
  });
}));

// Trending health endpoint
app.get("/health/trending", asyncHandler(async (_req, res) => {
  const trendingHealth = await systemHealthService.getTrendingHealth();
  res.json({
    success: true,
    data: trendingHealth,
    timestamp: new Date().toISOString()
  });
}));

// Comprehensive system health check
app.get("/api/v1/health", asyncHandler(async (_req, res) => {
  await initializeServices();
  const healthData = await systemHealthService.getSystemHealth();
  res.json(createApiResponse(true, healthData));
}));

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

// ===== V2 COMPATIBILITY LAYER FOR FRONTEND =====
// Mount the V2 compatibility router to handle all frontend-expected endpoints
app.use('/api/v2', v2CompatibilityRouter);

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

// Lovable compatibility alias for recommendations
app.post("/api/recommendations/generate", async (req, res) => {
  await initializeServices();
  await apiControllers.getRecommendations(req, res);
});

// Trending Analysis API
app.get("/api/trending", async (req, res) => {
  await initializeServices();
  await apiControllers.getTrending(req, res);
});

// Lovable compatibility alias for trends
app.get("/api/trends/current", async (req, res) => {
  // Add HTTP cache headers for better performance
  res.set({
    'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
   'Vary': 'Accept-Encoding'
  });

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

// ===== FASHION-CLIP API ENDPOINTS =====

// Fashion-CLIP Image Analysis
app.post("/api/v2/fashion-clip/analyze", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.analyzeImage(req, res);
});

// Comprehensive Visual Analysis
app.post("/api/v2/visual-analysis/comprehensive", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.comprehensiveVisualAnalysis(req, res);
});

// Image to Outfit Generation
app.post("/api/v2/visual-analysis/image-to-outfit", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.imageToOutfit(req, res);
});

// Color Extraction from Images
app.post("/api/v2/colors/extract", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.extractImageColors(req, res);
});

// Color Matching
app.post("/api/v2/colors/match", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.findMatchingColors(req, res);
});

// Occasion Color Palette
app.get("/api/v2/colors/occasions/:occasion/palette", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.getOccasionColorPalette(req, res);
});

// Style Transfer
app.post("/api/v2/style-transfer/apply", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.applyStyleTransfer(req, res);
});

// Style Transfer Analysis
app.post("/api/v2/style-transfer/analyze", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.analyzeStyleTransfer(req, res);
});

// Similar Items Search
app.post("/api/v2/similarity/search", async (req, res) => {
  await initializeServices();
  await fashionClipControllers.findSimilarItems(req, res);
});

// Fashion-CLIP Health
app.get("/api/v2/fashion-clip/health", async (req, res) => {
  await fashionClipControllers.getFashionClipHealth(req, res);
});

// ===== SMART BUNDLE API ENDPOINTS =====

// Generate Smart Bundles
app.post("/api/v2/bundles/generate", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.generateBundles(req, res);
});

// Customize Bundle
app.post("/api/v2/bundles/customize", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.customizeBundle(req, res);
});

// Generate Bundles from Image
app.post("/api/v2/bundles/generate-from-image", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.generateBundlesFromImage(req, res);
});

// Bundle Recommendations for Segment
app.post("/api/v2/bundles/segment-recommendations", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.getBundleRecommendationsForSegment(req, res);
});

// Score Multiple Bundles
app.post("/api/v2/bundles/score-bulk", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.scoreBundles(req, res);
});

// Score Single Bundle
app.post("/api/v2/bundles/score", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.scoreBundle(req, res);
});

// Bundle Optimization Recommendations
app.post("/api/v2/bundles/optimize", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.getOptimizationRecommendations(req, res);
});

// Trending Bundles
app.get("/api/v2/bundles/trending", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.getTrendingBundles(req, res);
});

// Bundle Performance Analytics
app.post("/api/v2/bundles/analytics", async (req, res) => {
  await initializeServices();
  await smartBundleControllers.getBundlePerformanceAnalytics(req, res);
});

// Smart Bundle Service Health
app.get("/api/v2/bundles/health", async (req, res) => {
  await smartBundleControllers.getSmartBundleHealth(req, res);
});

// ===== PHASE 2 INTELLIGENCE API ENDPOINTS =====

// Customer Psychology Analysis
app.post("/api/v2/intelligence/psychology/analyze", async (req, res) => {
  await initializeServices();
  await intelligenceControllers.analyzeCustomerPsychology(req, res);
});

// Career Trajectory Analysis
app.get("/api/v2/intelligence/career/trajectory/:customerId", async (req, res) => {
  await initializeServices();
  await intelligenceControllers.getCareerTrajectoryAnalysis(req, res);
});

// Venue Optimization
app.post("/api/v2/intelligence/venue/optimize", async (req, res) => {
  await initializeServices();
  await intelligenceControllers.optimizeForVenue(req, res);
});

// Cultural Adaptation
app.post("/api/v2/intelligence/cultural/adapt", async (req, res) => {
  await initializeServices();
  await intelligenceControllers.adaptCulturalPreferences(req, res);
});

// Fabric Performance Analysis
app.get("/api/v2/intelligence/fabric/performance/:fabricType", async (req, res) => {
  await initializeServices();
  await intelligenceControllers.getFabricPerformanceAnalysis(req, res);
});

// Intelligence Services Health
app.get("/api/v2/intelligence/health", async (req, res) => {
  await intelligenceControllers.getIntelligenceHealth(req, res);
});

// ===== CHAT API ENDPOINTS (Phase 1) =====

// Start new conversation
app.post("/api/v3/chat/conversation/start", async (req, res) => {
  await initializeServices();
  await chatController.startConversation(req, res);
});

// Send message in conversation
app.post("/api/v3/chat/conversation/message", async (req, res) => {
  await initializeServices();
  await chatController.sendMessage(req, res);
});

// Get conversation history
app.get("/api/v3/chat/conversation/history/:sessionId", async (req, res) => {
  await initializeServices();
  await chatController.getConversationHistory(req, res);
});

// End conversation with feedback
app.post("/api/v3/chat/conversation/end", async (req, res) => {
  await initializeServices();
  await chatController.endConversation(req, res);
});

// Get chat analytics
app.get("/api/v3/chat/analytics/patterns", async (req, res) => {
  await initializeServices();
  await chatController.getChatAnalytics(req, res);
});

// Chat services health
app.get("/api/v3/chat/health", async (req, res) => {
  await chatController.getHealthCheck(req, res);
});

// ===== VOICE API ENDPOINTS =====
// Voice routes temporarily disabled for production deployment
// // Import voice routes
// import voiceRoutes from "./routes/voice-routes";
// 
// // Mount voice routes
// app.use("/api/v3/voice", voiceRoutes);

// ===== PHASE 3 ADVANCED PERSONALIZATION API ENDPOINTS =====

// Advanced Personalization Endpoints
app.get("/api/v1/personalization/profile/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getCustomerProfile(req, res);
});

app.post("/api/v1/personalization/profile/:customerId/update", async (req, res) => {
  await initializeServices();
  await phase3Controllers.updateCustomerProfile(req, res);
});

app.post("/api/v1/personalization/recommendations", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getPersonalizedRecommendations(req, res);
});

app.post("/api/v1/personalization/learn", async (req, res) => {
  await initializeServices();
  await phase3Controllers.learnFromStylePreferences(req, res);
});

app.get("/api/v1/personalization/predict/:customerId/:predictionType", async (req, res) => {
  await initializeServices();
  await phase3Controllers.predictCustomerBehavior(req, res);
});

// Sales Optimization Endpoints
app.post("/api/v1/sales-optimization/recommendations", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getSalesOptimization(req, res);
});

app.get("/api/v1/sales-optimization/pricing/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getDynamicPricing(req, res);
});

app.get("/api/v1/sales-optimization/bundles/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getIntelligentBundles(req, res);
});

app.get("/api/v1/sales-optimization/cross-sell/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getCrossSellOpportunities(req, res);
});

app.post("/api/v1/sales-optimization/cart-recovery", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getCartRecoveryStrategy(req, res);
});

app.get("/api/v1/sales-optimization/analytics", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getSalesAnalytics(req, res);
});

// Predictive Analytics Endpoints
app.post("/api/v1/predictive-analytics/analyze", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getPredictiveAnalytics(req, res);
});

app.get("/api/v1/predictive-analytics/churn/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getChurnRiskAssessment(req, res);
});

app.get("/api/v1/predictive-analytics/ltv/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getLifetimeValuePrediction(req, res);
});

app.get("/api/v1/predictive-analytics/purchase-probability/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getPurchaseProbability(req, res);
});

app.get("/api/v1/predictive-analytics/next-best-action/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getNextBestActions(req, res);
});

app.get("/api/v1/predictive-analytics/seasonal-trends", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getSeasonalTrends(req, res);
});

// Customer Segmentation Endpoints
app.get("/api/v1/segmentation/segment/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.segmentCustomer(req, res);
});

app.post("/api/v1/segmentation/adapt-persona/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.adaptCustomerPersona(req, res);
});

app.get("/api/v1/segmentation/analysis", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getSegmentationAnalysis(req, res);
});

app.post("/api/v1/segmentation/targeting", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getSegmentTargeting(req, res);
});

// Integration Endpoints
app.get("/api/v1/integration/customer-intelligence/:customerId", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getComprehensiveCustomerIntelligence(req, res);
});

app.post("/api/v1/integration/enhanced-chat", async (req, res) => {
  await initializeServices();
  await phase3Controllers.getEnhancedChatIntegration(req, res);
});

app.get("/api/v1/integration/health", async (req, res) => {
  await phase3Controllers.getPhase3HealthCheck(req, res);
});

// 404 handler - must come before global error handler
app.use("*", notFoundHandler);

// Global error handler - must be last
app.use(globalErrorHandler);

// Initialize and start server
app.listen(PORT, async () => {
  logger.info(`🚀 KCT Knowledge API v2.0.0 running on port ${PORT}`);
  logger.info(`📋 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 Interactive API Documentation: http://localhost:${PORT}/docs`);
  logger.info(`📄 OpenAPI Specification: http://localhost:${PORT}/docs/openapi.yaml`);
  logger.info(`📋 Postman Collection: http://localhost:${PORT}/docs/postman`);
  logger.info(`🔐 Authentication: API Key required (X-API-Key header)`);
  logger.info(`💎 Knowledge Bank: Advanced Fashion Intelligence Platform`);
  logger.info(`\n🎯 NEW PRIORITY ENDPOINTS:`);
  logger.info(`  - Colors catalog: GET /api/colors`);
  logger.info(`  - Color relationships: GET /api/colors/:color/relationships`);
  logger.info(`  - Validate combinations: POST /api/combinations/validate`);
  logger.info(`  - AI recommendations: POST /api/recommendations`);
  logger.info(`  - Trending analysis: GET /api/trending`);
  logger.info(`  - Venue recommendations: GET /api/venues/:type/recommendations`);
  logger.info(`  - Style profiles: GET /api/styles/:profile`);
  logger.info(`  - Fashion rules check: POST /api/rules/check`);
  logger.info(`\n📍 LEGACY V1 ENDPOINTS:`);
  logger.info(`  - V1 API base: http://localhost:${PORT}/api/v1`);
  logger.info(`  - Color recommendations: POST /api/v1/colors/recommendations`);
  logger.info(`  - Style profiles: POST /api/v1/profiles/identify`);
  logger.info(`  - Conversion optimization: POST /api/v1/conversion/optimize`);
  logger.info(`  - Outfit validation: POST /api/v1/validation/outfit`);
  logger.info(`  - Personalization: POST /api/v1/personalization`);
  logger.info(`  - Fashion intelligence: GET /api/v1/intelligence`);
  logger.info(`\n🔧 VALIDATION ENGINES:`);
  logger.info(`  - Advanced Fashion Rules Engine`);
  logger.info(`  - Color Harmony & Contrast Analysis`);
  logger.info(`  - Formality & Occasion Matching`);
  logger.info(`  - Seasonal Appropriateness`);
  logger.info(`  - Style Profile Consistency`);
  logger.info(`  - Venue Requirements`);
  logger.info(`  - Pattern Mixing Guidelines`);
  logger.info(`\n⚡ Rate Limiting: 1000 requests/15min per IP`);
  logger.info(`🛡️ Security: Helmet, CORS, API Key Authentication`);
  logger.info(`🎨 AI-Powered: Confidence scoring, alternative suggestions, trend analysis`);
  
  // Initialize services and cache in background
  initializeServices().then(async () => {
    // Schedule periodic cache refresh
    cacheInvalidationService.schedulePeriodicRefresh();
    
    // Warm up cache for critical endpoints
    logger.info('🔥 Warming up cache...');
    try {
      await Promise.allSettled([
        colorService.getColorFamilies(),
        colorService.getUniversalRules(),
        colorService.getTrendingColors(),
        styleProfileService.getAllProfiles(),
        trendingAnalysisService.getTrendingCombinations(5)
      ]);
      logger.info('✅ Cache warm-up completed');
    } catch (error) {
      logger.warn('⚠️ Cache warm-up partially failed', { 
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }).catch(error => {
    logger.error('Failed to initialize services on startup:', error);
  });
});

export default app;
export { initializeServices };
