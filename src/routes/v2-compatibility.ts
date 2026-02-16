/**
 * V2 API Compatibility Layer for Frontend Integration
 * Maps frontend-expected endpoints to Knowledge Bank services
 */

import { Router, Request, Response } from 'express';
import { colorService } from '../services/color-service';
import { styleProfileService } from '../services/style-profile-service';
import { knowledgeBankService } from '../services/knowledge-bank-service';
import { trendingAnalysisService } from '../services/trending-analysis-service';
import { conversionService } from '../services/conversion-service';
import { smartBundleService } from '../services/smart-bundle-service';
import { productCatalogService } from '../services/product-catalog-service';
import { recommendationContextBuilder } from '../services/recommendation-context-builder';
import { logger } from '../utils/logger';
import {
  validateBody,
  validateParams,
  v2RecommendationsSchema,
  completeTheLookSchema,
  validateCombinationSchema,
  analyzeOutfitSchema,
  similarProductsSchema,
  colorParamSchema
} from '../middleware/validation';

const router = Router();

/**
 * Helper function to ensure services are initialized
 */
const ensureServicesInitialized = async () => {
  try {
    await Promise.all([
      colorService.initialize(),
      styleProfileService.initialize(),
      knowledgeBankService.initialize(),
      trendingAnalysisService.initialize(),
      conversionService.initialize()
    ]);
  } catch (error) {
    logger.warn('Some services failed to initialize, using fallbacks', { error: error instanceof Error ? error.message : String(error) });
  }
};

/**
 * Transform Knowledge Bank recommendations to frontend format
 */
const transformRecommendations = (kbRecommendations: any) => {
  return {
    success: true,
    data: {
      recommendations: kbRecommendations.recommendations || [],
      trending: kbRecommendations.trending || [],
      personalized: kbRecommendations.personalized || [],
      categories: {
        suits: kbRecommendations.suits || [],
        shirts: kbRecommendations.shirts || [],
        ties: kbRecommendations.ties || [],
        accessories: kbRecommendations.accessories || []
      }
    },
    metadata: {
      total: kbRecommendations.recommendations?.length || 0,
      confidence: kbRecommendations.confidence || 0.8,
      source: 'knowledge-bank-ai'
    }
  };
};

/**
 * POST /api/v2/recommendations
 * Main recommendations endpoint for Complete the Look
 */
router.post('/recommendations', validateBody(v2RecommendationsSchema), async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();

    const {
      productId,
      category,
      color,
      style,
      occasion,
      priceRange,
      customerId,
      preferences
    } = req.body;

    // Section 4.4: Build intelligence context
    let intelligenceContext = null;
    try {
      intelligenceContext = await recommendationContextBuilder.buildContext({
        occasion: occasion || 'business',
        suit_color: color,
        season: preferences?.season,
        venue_type: preferences?.venue_type,
        age: preferences?.age ? parseInt(preferences.age) : undefined,
        occupation: preferences?.occupation,
        use_case: style,
      });
    } catch (error) {
      logger.warn('Intelligence context unavailable for v2 recommendations', { error: error instanceof Error ? error.message : String(error) });
    }

    // Use intelligence context to derive formality level
    const formalityLevel = intelligenceContext?.formality_range ?
      intelligenceContext.formality_range[0] :
      (style === 'formal' ? 5 : 3);

    // Get comprehensive recommendations from Knowledge Bank
    const recommendations = await knowledgeBankService.getComprehensiveRecommendations({
      suit_color: color || 'navy',
      occasion: occasion || 'business',
      customer_profile: customerId,
      formality_level: formalityLevel,
      season: intelligenceContext?.fabric_preferences ? preferences?.season : undefined
    });

    // Transform to frontend expected format
    const response: any = transformRecommendations(recommendations);

    // Section 4.4: Add intelligence context and shop links
    if (intelligenceContext) {
      response.intelligence = {
        signals_used: intelligenceContext.signals_used,
        confidence: intelligenceContext.confidence,
        color_guidance: intelligenceContext.color_filters,
        fabric_guidance: intelligenceContext.fabric_preferences,
        price_tier: intelligenceContext.price_tier,
        reasoning: intelligenceContext.reasoning,
        shop_links: productCatalogService.enrichRecommendationWithLinks(occasion, category)
      };
    }

    res.json(response);
  } catch (error) {
    logger.error('Error in /api/v2/recommendations:', error);

    // Return error instead of fake success
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v2/products/complete-the-look
 * Complete the Look feature for product pages
 */
router.post('/products/complete-the-look', validateBody(completeTheLookSchema), async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();

    const {
      product,
      currentOutfit = [],
      preferences = {},
      occasion = 'business'
    } = req.body;

    // Section 4.1: Build intelligence context
    let intelligenceContext = null;
    try {
      intelligenceContext = await recommendationContextBuilder.buildContext({
        occasion: occasion || 'business',
        suit_color: product?.color,
        season: preferences?.season,
        venue_type: preferences?.venue_type,
        age: preferences?.age ? parseInt(preferences.age) : undefined,
        occupation: preferences?.occupation,
        use_case: preferences?.style,
      });
    } catch (error) {
      logger.warn('Intelligence context unavailable for complete-the-look', { error: error instanceof Error ? error.message : String(error) });
    }

    // Use smart bundle service if available
    let recommendations: any;
    try {
      recommendations = await smartBundleService.generateBundles({
        generation_type: 'complete_outfit',
        base_requirements: {
          occasion: occasion || 'business',
          formality_level: intelligenceContext?.formality_range ?
            (intelligenceContext.formality_range[0] >= 7 ? 'formal' :
             intelligenceContext.formality_range[0] >= 5 ? 'business_casual' : 'casual') :
            'business_casual',
          season: intelligenceContext?.fabric_preferences ?
            (preferences?.season || 'fall') : 'fall',
          target_demographics: {
            age_range: preferences?.age || '25-45',
            style_preference: preferences?.style || 'modern',
            budget_range: intelligenceContext?.price_tier ? {
              min: intelligenceContext.price_tier.min_investment,
              max: intelligenceContext.price_tier.max_investment
            } : { min: 200, max: 1000 },
            body_types: []
          }
        }
      });
    } catch (error) {
      // Fallback to basic recommendations
      recommendations = await knowledgeBankService.getComprehensiveRecommendations({
        suit_color: product?.color || 'navy',
        occasion,
        customer_profile: preferences.customerId
      });
    }

    const isBundleResponse = recommendations.bundles !== undefined;

    // Enrich with real Shopify product links
    const suitColor = product?.color || 'navy';
    const productLinks = productCatalogService.getProductsByColor(suitColor);

    res.json({
      success: true,
      data: {
        outfitSuggestions: isBundleResponse ? recommendations.bundles : [],
        complementaryItems: isBundleResponse ? [] : (recommendations.color_recommendations?.complementary || []),
        trendingCombinations: isBundleResponse ? [] : (recommendations.trending || []),
        conversionScore: isBundleResponse ? 0.75 : (recommendations.conversion_probability || 0.75),
        // Real purchasable products from kctmenswear.com
        shopProducts: productLinks ? {
          suits: productLinks.suits?.slice(0, 3) || [],
          ties: productLinks.ties?.slice(0, 3) || [],
          accessories: productLinks.accessories?.slice(0, 3) || [],
          shirts: productLinks.shirts?.slice(0, 3) || [],
          shop_all_url: `https://kctmenswear.com/collections/all?q=${encodeURIComponent(suitColor.replace(/_/g, ' '))}`
        } : null,
        // Section 4.1: Add intelligence context and shop links
        intelligence: intelligenceContext ? {
          signals_used: intelligenceContext.signals_used,
          confidence: intelligenceContext.confidence,
          color_guidance: intelligenceContext.color_filters,
          fabric_guidance: intelligenceContext.fabric_preferences,
          price_tier: intelligenceContext.price_tier,
          reasoning: intelligenceContext.reasoning,
          shop_links: productCatalogService.enrichRecommendationWithLinks(occasion, product?.category)
        } : null,
      },
      metadata: {
        productId: product?.id,
        generated: new Date().toISOString(),
        products_mapped: !!productLinks
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/products/complete-the-look:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to generate complete-the-look suggestions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/colors
 * Get color data and relationships
 */
router.get('/colors', async (_req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();
    
    const colorFamilies = await colorService.getColorFamilies();
    const universalRules = await colorService.getUniversalRules();
    const trendingColors = await colorService.getTrendingColors();

    res.json({
      success: true,
      data: {
        families: colorFamilies,
        rules: universalRules,
        trending: trendingColors,
        relationships: {
          complementary: {},
          analogous: {},
          triadic: {}
        }
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/colors:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch color data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/colors/:color
 * Get specific color information
 */
router.get('/colors/:color', validateParams(colorParamSchema), async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();

    const { color } = req.params;
    const complementaryColors = await colorService.findComplementaryColors(color);

    res.json({
      success: true,
      data: {
        color,
        complementary: complementaryColors,
        relationships: complementaryColors
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/colors/:color:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch color information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/trending
 * Get trending items and combinations
 */
router.get('/trending', async (_req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();
    
    const trendingData = await trendingAnalysisService.getTrendingCombinations(10);
    
    res.json({
      success: true,
      data: {
        trending: trendingData,
        categories: {
          suits: trendingData.filter((item: any) => item.category === 'suits'),
          shirts: trendingData.filter((item: any) => item.category === 'shirts'),
          accessories: trendingData.filter((item: any) => item.category === 'accessories')
        },
        updated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/trending:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v2/combinations/validate
 * Validate outfit combinations
 */
router.post('/combinations/validate', validateBody(validateCombinationSchema), async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();
    
    const { suit_color, shirt_color, tie_color, occasion } = req.body;
    
    const validation = await knowledgeBankService.validateAndOptimizeOutfit({
      suit_color: suit_color || 'navy',
      shirt_color: shirt_color || 'white',
      tie_color: tie_color || 'burgundy',
      occasion: occasion || 'business'
    });

    res.json({
      success: true,
      data: {
        valid: (validation as any).is_valid || validation.validation?.valid || true,
        score: (validation as any).overall_score || 0.85,
        recommendations: (validation as any).recommendations || validation.optimization?.optimization_suggestions || [],
        conflicts: (validation as any).conflicts || validation.validation?.issues || [],
        improvements: (validation as any).improvements || validation.validation?.improvements || []
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/combinations/validate:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to validate combination',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v2/analyze/outfit
 * Analyze complete outfit
 */
router.post('/analyze/outfit', validateBody(analyzeOutfitSchema), async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();
    
    const { outfit, occasion, preferences } = req.body;
    
    // Use validation engine for analysis
    const analysis = await knowledgeBankService.validateAndOptimizeOutfit({
      suit_color: outfit?.suit?.color || 'navy',
      shirt_color: outfit?.shirt?.color || 'white',
      tie_color: outfit?.tie?.color || 'burgundy',
      occasion: occasion || 'business',
      customer_profile: preferences?.customerId
    });
    
    res.json({
      success: true,
      data: {
        score: (analysis as any).overall_score || 0.8,
        analysis: {
          colorHarmony: (analysis as any).color_harmony || 0.85,
          styleConsistency: (analysis as any).style_consistency || 0.9,
          occasionAppropriateness: (analysis as any).occasion_match || 0.95,
          trendAlignment: (analysis as any).trend_score || 0.7
        },
        suggestions: (analysis as any).recommendations || analysis.optimization?.optimization_suggestions || [],
        alternatives: analysis.alternatives || []
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/analyze/outfit:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to analyze outfit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v2/products/similar
 * Find similar products
 */
router.post('/products/similar', validateBody(similarProductsSchema), async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();
    
    const { product, limit = 5 } = req.body;
    
    // Get recommendations based on product attributes
    const recommendations = await knowledgeBankService.getComprehensiveRecommendations({
      suit_color: product?.color || 'navy',
      occasion: product?.occasion || 'business',
      formality_level: product?.formality || 3
    });
    
    res.json({
      success: true,
      data: {
        similar: (recommendations as any).recommendations?.slice(0, limit) || [],
        alternatives: (recommendations as any).alternatives?.slice(0, limit) || [],
        trending: (recommendations as any).trending?.slice(0, limit) || []
      },
      metadata: {
        productId: product?.id,
        count: limit
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/products/similar:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to find similar products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/health
 * Health check for v2 API
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    version: '2.0.0',
    service: 'v2-compatibility-layer',
    timestamp: new Date().toISOString()
  });
});

export default router;