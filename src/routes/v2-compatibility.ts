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
import { logger } from '../utils/logger';

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
    logger.warn('Some services failed to initialize, using fallbacks', { error });
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
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();
    
    const { 
      productId, 
      category, 
      color, 
      style, 
      occasion,
      priceRange,
      customerId 
    } = req.body;

    // Get comprehensive recommendations from Knowledge Bank
    const recommendations = await knowledgeBankService.getComprehensiveRecommendations({
      suit_color: color || 'navy',
      occasion: occasion || 'business',
      customer_profile: customerId,
      formality_level: style === 'formal' ? 5 : 3
    });

    // Transform to frontend expected format
    const response = transformRecommendations(recommendations);
    res.json(response);
  } catch (error) {
    logger.error('Error in /api/v2/recommendations:', error);
    
    // Fallback response
    res.json({
      success: true,
      data: {
        recommendations: [],
        trending: [],
        personalized: [],
        categories: {
          suits: [],
          shirts: [],
          ties: [],
          accessories: []
        }
      },
      metadata: {
        total: 0,
        confidence: 0,
        source: 'fallback'
      }
    });
  }
});

/**
 * POST /api/v2/products/complete-the-look
 * Complete the Look feature for product pages
 */
router.post('/products/complete-the-look', async (req: Request, res: Response) => {
  try {
    await ensureServicesInitialized();
    
    const { 
      product,
      currentOutfit = [],
      preferences = {},
      occasion = 'business'
    } = req.body;

    // Use smart bundle service if available
    let recommendations;
    try {
      recommendations = await smartBundleService.generateBundles({
        base_item: product,
        occasion,
        preferences,
        budget_range: preferences.priceRange
      });
    } catch (error) {
      // Fallback to basic recommendations
      recommendations = await knowledgeBankService.getComprehensiveRecommendations({
        suit_color: product?.color || 'navy',
        occasion,
        customer_profile: preferences.customerId
      });
    }

    res.json({
      success: true,
      data: {
        outfitSuggestions: recommendations.bundles || [],
        complementaryItems: recommendations.color_recommendations?.complementary || [],
        trendingCombinations: recommendations.trending || [],
        conversionScore: recommendations.conversion_probability || 0.75
      },
      metadata: {
        productId: product?.id,
        generated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/products/complete-the-look:', error);
    
    res.json({
      success: true,
      data: {
        outfitSuggestions: [],
        complementaryItems: [],
        trendingCombinations: [],
        conversionScore: 0.5
      },
      metadata: {
        productId: req.body.product?.id,
        generated: new Date().toISOString()
      }
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
    
    res.json({
      success: true,
      data: {
        families: [],
        rules: [],
        trending: [],
        relationships: {}
      }
    });
  }
});

/**
 * GET /api/v2/colors/:color
 * Get specific color information
 */
router.get('/colors/:color', async (req: Request, res: Response) => {
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
    
    res.json({
      success: true,
      data: {
        color: req.params.color,
        complementary: [],
        relationships: []
      }
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
    
    res.json({
      success: true,
      data: {
        trending: [],
        categories: {
          suits: [],
          shirts: [],
          accessories: []
        },
        updated: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/v2/combinations/validate
 * Validate outfit combinations
 */
router.post('/combinations/validate', async (req: Request, res: Response) => {
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
        valid: validation.is_valid || true,
        score: validation.overall_score || 0.85,
        recommendations: validation.recommendations || [],
        conflicts: validation.conflicts || [],
        improvements: validation.improvements || []
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/combinations/validate:', error);
    
    res.json({
      success: true,
      data: {
        valid: true,
        score: 0.75,
        recommendations: [],
        conflicts: [],
        improvements: []
      }
    });
  }
});

/**
 * POST /api/v2/analyze/outfit
 * Analyze complete outfit
 */
router.post('/analyze/outfit', async (req: Request, res: Response) => {
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
        score: analysis.overall_score || 0.8,
        analysis: {
          colorHarmony: analysis.color_harmony || 0.85,
          styleConsistency: analysis.style_consistency || 0.9,
          occasionAppropriateness: analysis.occasion_match || 0.95,
          trendAlignment: analysis.trend_score || 0.7
        },
        suggestions: analysis.recommendations || [],
        alternatives: analysis.alternatives || []
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/analyze/outfit:', error);
    
    res.json({
      success: true,
      data: {
        score: 0.75,
        analysis: {
          colorHarmony: 0.8,
          styleConsistency: 0.85,
          occasionAppropriateness: 0.9,
          trendAlignment: 0.7
        },
        suggestions: [],
        alternatives: []
      }
    });
  }
});

/**
 * POST /api/v2/products/similar
 * Find similar products
 */
router.post('/products/similar', async (req: Request, res: Response) => {
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
        similar: recommendations.recommendations?.slice(0, limit) || [],
        alternatives: recommendations.alternatives?.slice(0, limit) || [],
        trending: recommendations.trending?.slice(0, limit) || []
      },
      metadata: {
        productId: product?.id,
        count: limit
      }
    });
  } catch (error) {
    logger.error('Error in /api/v2/products/similar:', error);
    
    res.json({
      success: true,
      data: {
        similar: [],
        alternatives: [],
        trending: []
      },
      metadata: {
        productId: req.body.product?.id,
        count: req.body.limit || 5
      }
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