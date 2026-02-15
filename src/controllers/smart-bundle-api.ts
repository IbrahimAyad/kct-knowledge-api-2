import { Request, Response } from 'express';
import { smartBundleService, BundleGenerationRequest, BundleCustomizationRequest } from '../services/smart-bundle-service';
import { aiScoringSystem, ScoringRequest } from '../services/ai-scoring-system';
import { cacheService } from '../services/cache-service';
import { createApiResponse } from '../utils/data-loader';
import { logger } from '../utils/logger';

/**
 * Generate smart outfit bundles
 */
export const generateBundles = async (req: Request, res: Response) => {
  try {
    const {
      generation_type,
      base_requirements,
      customization_options,
      optimization_goals,
      business_constraints,
      personalization_context
    } = req.body as BundleGenerationRequest;

    if (!generation_type) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'generation_type is required'
      ));
    }

    const validTypes = ['complete_outfit', 'occasion_specific', 'budget_conscious', 'trend_focused', 'personalized'];
    if (!validTypes.includes(generation_type)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        `Invalid generation_type. Must be one of: ${validTypes.join(', ')}`
      ));
    }

    if (!base_requirements) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'base_requirements is required'
      ));
    }

    if (!base_requirements.occasion) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'base_requirements.occasion is required'
      ));
    }

    if (!base_requirements.target_demographics) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'base_requirements.target_demographics is required'
      ));
    }

    const result = await smartBundleService.generateBundles({
      generation_type,
      base_requirements,
      customization_options,
      optimization_goals,
      business_constraints,
      personalization_context
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Bundle generation failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Bundle generation failed'
    ));
  }
};

/**
 * Customize an existing bundle
 */
export const customizeBundle = async (req: Request, res: Response) => {
  try {
    const {
      base_bundle_id,
      customizations,
      maintain_score_threshold,
      budget_constraints
    } = req.body as BundleCustomizationRequest;

    if (!base_bundle_id) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'base_bundle_id is required'
      ));
    }

    if (!customizations) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'customizations is required'
      ));
    }

    const result = await smartBundleService.customizeBundle({
      base_bundle_id,
      customizations,
      maintain_score_threshold,
      budget_constraints
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Bundle customization failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Bundle customization failed'
    ));
  }
};

/**
 * Generate bundles from image inspiration
 */
export const generateBundlesFromImage = async (req: Request, res: Response) => {
  try {
    const {
      image_url,
      image_base64,
      requirements,
      analysis_depth = 'comprehensive'
    } = req.body;

    if (!image_url && !image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either image_url or image_base64 is required'
      ));
    }

    const validDepths = ['basic', 'comprehensive', 'advanced'];
    if (!validDepths.includes(analysis_depth)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        `Invalid analysis_depth. Must be one of: ${validDepths.join(', ')}`
      ));
    }

    const result = await smartBundleService.generateBundlesFromImage(
      image_url || image_base64 || '',
      requirements,
      analysis_depth
    );

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Image-based bundle generation failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Image-based bundle generation failed'
    ));
  }
};

/**
 * Get bundle recommendations for customer segment
 */
export const getBundleRecommendationsForSegment = async (req: Request, res: Response) => {
  try {
    const {
      demographic,
      style_preference,
      budget_tier,
      occasion_frequency
    } = req.body;

    const { limit = 10 } = req.query;

    if (!demographic) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'demographic is required'
      ));
    }

    if (!style_preference) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'style_preference is required'
      ));
    }

    if (!budget_tier) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'budget_tier is required'
      ));
    }

    const validBudgetTiers = ['budget', 'mid_range', 'premium', 'luxury'];
    if (!validBudgetTiers.includes(budget_tier)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        `Invalid budget_tier. Must be one of: ${validBudgetTiers.join(', ')}`
      ));
    }

    if (!occasion_frequency || typeof occasion_frequency !== 'object') {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'occasion_frequency object is required'
      ));
    }

    const limitNum = Math.min(Math.max(parseInt(limit as string) || 10, 1), 50);

    const result = await smartBundleService.getBundleRecommendationsForSegment(
      {
        demographic,
        style_preference,
        budget_tier,
        occasion_frequency
      },
      limitNum
    );

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Segment bundle recommendations failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Segment recommendations failed'
    ));
  }
};

/**
 * Score outfit bundles using AI scoring system
 */
export const scoreBundles = async (req: Request, res: Response) => {
  try {
    const {
      bundles,
      scoring_criteria,
      context
    } = req.body as ScoringRequest;

    if (!bundles || !Array.isArray(bundles) || bundles.length === 0) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'bundles array is required and cannot be empty'
      ));
    }

    if (bundles.length > 50) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Maximum 50 bundles can be scored at once'
      ));
    }

    // Validate bundle structure
    for (const bundle of bundles) {
      if (!bundle.bundle_id) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'Each bundle must have a bundle_id'
        ));
      }
      if (!bundle.pieces || !Array.isArray(bundle.pieces)) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'Each bundle must have a pieces array'
        ));
      }
    }

    const result = await aiScoringSystem.scoreBundles({
      bundles,
      scoring_criteria,
      context
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Bundle scoring failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Bundle scoring failed'
    ));
  }
};

/**
 * Score a single outfit bundle
 */
export const scoreBundle = async (req: Request, res: Response) => {
  try {
    const {
      bundle,
      scoring_criteria,
      context
    } = req.body;

    if (!bundle) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'bundle is required'
      ));
    }

    if (!bundle.bundle_id) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'bundle.bundle_id is required'
      ));
    }

    if (!bundle.pieces || !Array.isArray(bundle.pieces)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'bundle.pieces array is required'
      ));
    }

    const result = await aiScoringSystem.scoreBundle(
      bundle,
      scoring_criteria,
      context
    );

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Single bundle scoring failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Bundle scoring failed'
    ));
  }
};

/**
 * Get optimization recommendations for a bundle
 */
export const getOptimizationRecommendations = async (req: Request, res: Response) => {
  try {
    const {
      bundle,
      target_score,
      context
    } = req.body;

    if (!bundle) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'bundle is required'
      ));
    }

    if (!bundle.bundle_id) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'bundle.bundle_id is required'
      ));
    }

    if (!target_score || target_score < 0 || target_score > 1) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'target_score is required and must be between 0 and 1'
      ));
    }

    const result = await aiScoringSystem.getOptimizationRecommendations(
      bundle,
      target_score,
      context
    );

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Optimization recommendations failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Optimization recommendations failed'
    ));
  }
};

/**
 * Get trending bundle insights
 */
export const getTrendingBundles = async (req: Request, res: Response) => {
  try {
    const { 
      limit = 10, 
      time_period = '30d',
      occasion,
      budget_tier,
      demographic 
    } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit as string) || 10, 1), 50);
    
    const validTimePeriods = ['7d', '30d', '90d', '1y'];
    if (!validTimePeriods.includes(time_period as string)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        `Invalid time_period. Must be one of: ${validTimePeriods.join(', ')}`
      ));
    }

    // This would integrate with trending analysis service
    const result = {
      trending_bundles: [
        {
          bundle_id: 'trending_001',
          name: 'Classic Navy Business Bundle',
          trend_score: 0.92,
          growth_rate: 0.35,
          popularity_rank: 1,
          occasions: ['business_formal', 'interview'],
          demographics: ['25-35', 'professional'],
          price_range: { min: 400, max: 600 }
        }
      ],
      trend_insights: [
        'Navy suits showing 35% growth in business formal category',
        'White shirts remain the most popular pairing',
        'Burgundy ties gaining popularity for fall season'
      ],
      market_analysis: {
        total_trending_bundles: 1,
        average_trend_score: 0.92,
        top_growing_categories: ['business_formal', 'smart_casual'],
        seasonal_trends: {
          current_season: 'fall',
          trending_colors: ['navy', 'burgundy', 'forest_green'],
          declining_colors: ['bright_colors', 'summer_pastels']
        }
      },
      time_period: time_period,
      generated_at: new Date().toISOString()
    };

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Trending bundles analysis failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Trending analysis failed'
    ));
  }
};

/**
 * Get bundle performance analytics
 */
export const getBundlePerformanceAnalytics = async (req: Request, res: Response) => {
  try {
    const {
      bundle_ids,
      metrics = ['conversion_rate', 'revenue', 'customer_satisfaction'],
      time_period = '30d'
    } = req.body;

    if (!bundle_ids || !Array.isArray(bundle_ids) || bundle_ids.length === 0) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'bundle_ids array is required and cannot be empty'
      ));
    }

    if (bundle_ids.length > 20) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Maximum 20 bundle IDs can be analyzed at once'
      ));
    }

    const validMetrics = ['conversion_rate', 'revenue', 'customer_satisfaction', 'return_rate', 'view_count'];
    const invalidMetrics = metrics.filter((metric: string) => !validMetrics.includes(metric));
    if (invalidMetrics.length > 0) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        `Invalid metrics: ${invalidMetrics.join(', ')}. Valid metrics: ${validMetrics.join(', ')}`
      ));
    }

    // NOTE: Real analytics integration needed — these are deterministic placeholder values
    const stableHash = (s: string, min: number, max: number) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return min + ((Math.abs(h) % 10000) / 10000) * (max - min);
    };

    const result = {
      bundle_performance: bundle_ids.map((bundle_id: string) => ({
        bundle_id,
        metrics: {
          conversion_rate: stableHash(bundle_id + '_cvr', 0.05, 0.25),
          revenue: stableHash(bundle_id + '_rev', 1000, 11000),
          customer_satisfaction: stableHash(bundle_id + '_sat', 0.7, 1.0),
          return_rate: stableHash(bundle_id + '_ret', 0.02, 0.12),
          view_count: Math.floor(stableHash(bundle_id + '_views', 100, 1100))
        },
        trends: {
          conversion_trend: stableHash(bundle_id + '_ct', -0.2, 0.2),
          revenue_trend: stableHash(bundle_id + '_rt', -0.3, 0.3),
          satisfaction_trend: stableHash(bundle_id + '_st', -0.1, 0.1)
        }
      })),
      summary: {
        total_revenue: bundle_ids.reduce((sum, id) => sum + stableHash(id + '_rev', 1000, 11000), 0),
        average_conversion_rate: stableHash(bundle_ids.join('') + '_acvr', 0.05, 0.25),
        overall_satisfaction: stableHash(bundle_ids.join('') + '_osat', 0.7, 1.0),
        top_performer: bundle_ids[0],
        needs_attention: bundle_ids[bundle_ids.length - 1]
      },
      time_period,
      generated_at: new Date().toISOString()
    };

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Bundle performance analytics failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Performance analytics failed'
    ));
  }
};

/**
 * Get smart bundle service health
 */
export const getSmartBundleHealth = async (req: Request, res: Response) => {
  try {
    // Pull real metrics from cache service instead of hardcoded values
    const cacheMetrics = cacheService.getMetrics();
    const totalOps = cacheMetrics.hits + cacheMetrics.misses;
    const hitRate = totalOps > 0 ? Math.round((cacheMetrics.hits / totalOps) * 100) : 0;

    const health = {
      service_status: 'healthy',
      initialized: true,
      dependencies: {
        ai_scoring_system: 'active',
        fashion_clip_service: 'active',
        visual_analysis_engine: 'active',
        color_extraction_service: 'active'
      },
      performance: {
        cache_hit_rate: `${hitRate}%`,
        uptime_seconds: Math.round(process.uptime())
      },
      last_health_check: new Date().toISOString()
    };

    res.json(createApiResponse(true, health));
  } catch (error) {
    logger.error('Smart bundle service health check failed:', error);
    res.status(503).json(createApiResponse(
      false,
      undefined,
      'Smart bundle service health check failed'
    ));
  }
};