/**
 * Test Routes Setup
 * Sets up API routes for testing purposes
 */

import { Express, Router, Request, Response, NextFunction } from 'express';
import { customerPsychologyService } from '../../services/customer-psychology-service';
import { careerIntelligenceService } from '../../services/career-intelligence-service';
import { venueIntelligenceService } from '../../services/venue-intelligence-service';
import { culturalAdaptationService } from '../../services/cultural-adaptation-service';
import { body, param, validationResult } from 'express-validator';

/**
 * Setup intelligence API routes for testing
 */
export async function setupIntelligenceRoutes(app: Express): Promise<void> {
  const router = Router();

  // Validation middleware
  const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  };

  // Psychology Intelligence Routes
  router.post('/psychology/analyze',
    [
      body('customer_id').notEmpty().withMessage('Customer ID is required'),
      body('session_duration').isNumeric().withMessage('Session duration must be a number'),
      body('choices_viewed').isNumeric().withMessage('Choices viewed must be a number'),
      body('page_views').isNumeric().withMessage('Page views must be a number'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await customerPsychologyService.analyzeDecisionFatigue(req.body);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/psychology/profile/:customerId',
    [
      param('customerId').notEmpty().withMessage('Customer ID is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await customerPsychologyService.getCustomerProfile(req.params.customerId);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post('/psychology/personalization',
    [
      body('customer_id').notEmpty().withMessage('Customer ID is required'),
      body('context').isObject().withMessage('Context must be an object'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await customerPsychologyService.getPersonalizationRecommendations(
          req.body.customer_id,
          req.body.context
        );
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Career Intelligence Routes
  router.post('/career/analyze',
    [
      body('customer_id').notEmpty().withMessage('Customer ID is required'),
      body('current_role').notEmpty().withMessage('Current role is required'),
      body('industry').notEmpty().withMessage('Industry is required'),
      body('age_range').notEmpty().withMessage('Age range is required'),
      body('experience_years').isNumeric().withMessage('Experience years must be a number'),
      body('recent_behaviors').isArray().withMessage('Recent behaviors must be an array'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await careerIntelligenceService.analyzeCareerTrajectory(req.body);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/career/preferences/:stage/:industry',
    [
      param('stage').notEmpty().withMessage('Career stage is required'),
      param('industry').notEmpty().withMessage('Industry is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await careerIntelligenceService.getCareerStagePreferences(
          req.params.stage as any,
          req.params.industry
        );
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/career/industry/:industry/:roleLevel',
    [
      param('industry').notEmpty().withMessage('Industry is required'),
      param('roleLevel').notEmpty().withMessage('Role level is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await careerIntelligenceService.getIndustryRecommendations(
          req.params.industry,
          req.params.roleLevel
        );
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post('/career/timing',
    [
      body('customer_id').notEmpty().withMessage('Customer ID is required'),
      body('current_trajectory').isObject().withMessage('Current trajectory must be an object'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await careerIntelligenceService.optimizeWardrobeTiming(
          req.body.customer_id,
          req.body.current_trajectory
        );
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Venue Intelligence Routes
  router.post('/venue/optimize',
    [
      body('venue_type').notEmpty().withMessage('Venue type is required'),
      body('lighting_conditions').isObject().withMessage('Lighting conditions must be an object'),
      body('season').notEmpty().withMessage('Season is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await venueIntelligenceService.optimizeForVenue(req.body);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/venue/info/:venueType',
    [
      param('venueType').notEmpty().withMessage('Venue type is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await venueIntelligenceService.getVenueIntelligence(req.params.venueType);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post('/venue/lighting/analyze',
    [
      body('natural_light').notEmpty().withMessage('Natural light information is required'),
      body('artificial_light').notEmpty().withMessage('Artificial light information is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await venueIntelligenceService.analyzeLightingConditions(req.body);
        res.json({
          success: true,
          data: {
            analysis: result,
            recommendations: [`Optimized for ${req.body.color_temperature} lighting`],
            color_adjustments: [`Adjust for ${req.body.intensity} intensity`]
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Cultural Adaptation Routes
  router.post('/cultural/adapt',
    [
      body('base_recommendations').isArray().withMessage('Base recommendations must be an array'),
      body('cultural_context').isObject().withMessage('Cultural context must be an object'),
      body('sensitivity_level').notEmpty().withMessage('Sensitivity level is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await culturalAdaptationService.adaptRecommendations(req.body);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/cultural/nuances/:region',
    [
      param('region').notEmpty().withMessage('Region is required'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await culturalAdaptationService.getCulturalNuances(req.params.region);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post('/cultural/color/analyze',
    [
      body('color').notEmpty().withMessage('Color is required'),
      body('cultural_context').isObject().withMessage('Cultural context must be an object'),
      handleValidationErrors
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await culturalAdaptationService.analyzeColorCulturalSignificance(
          req.body.color,
          req.body.cultural_context
        );
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Health check routes for services
  router.get('/health/psychology', async (req, res, next) => {
    try {
      const result = await customerPsychologyService.getHealthStatus();
      res.json({
        success: true,
        service: 'psychology',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/health/career', async (req, res, next) => {
    try {
      const result = await careerIntelligenceService.getHealthStatus();
      res.json({
        success: true,
        service: 'career',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/health/venue', async (req, res, next) => {
    try {
      const result = await venueIntelligenceService.getHealthStatus();
      res.json({
        success: true,
        service: 'venue',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/health/cultural', async (req, res, next) => {
    try {
      const result = await culturalAdaptationService.getHealthStatus();
      res.json({
        success: true,
        service: 'cultural',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  // Cache management routes
  router.post('/cache/clear/psychology', async (req, res, next) => {
    try {
      await customerPsychologyService.clearCache();
      res.json({
        success: true,
        message: 'Psychology cache cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/cache/clear/career', async (req, res, next) => {
    try {
      await careerIntelligenceService.clearCache();
      res.json({
        success: true,
        message: 'Career cache cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/cache/clear/venue', async (req, res, next) => {
    try {
      await venueIntelligenceService.clearCache();
      res.json({
        success: true,
        message: 'Venue cache cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/cache/clear/cultural', async (req, res, next) => {
    try {
      await culturalAdaptationService.clearCache();
      res.json({
        success: true,
        message: 'Cultural cache cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  });

  // Mount router
  app.use('/api/v1/intelligence', router);
}