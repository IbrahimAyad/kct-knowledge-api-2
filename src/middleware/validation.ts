/**
 * Request Validation Middleware
 * Zod schemas for all API endpoints
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================
// Analytics Schemas
// ============================================

// Flexible analytics track schema - accepts any event type
// Made ultra-flexible to accept whatever format frontend sends
export const analyticsTrackSchema = z.object({
  eventType: z.string().optional().default('unknown'),
  sessionId: z.string().optional().default('unknown'),
  pageUrl: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(), // Flexible JSONB data field
  timestamp: z.number().optional(),

  // Legacy fields for backward compatibility
  productId: z.string().optional(),
  productTitle: z.string().optional(),
  occasion: z.string().optional(),
  source: z.string().optional(),
}).passthrough(); // Allow extra fields from frontend

export const analyticsDashboardSchema = z.object({
  days: z.string().optional().transform(val => {
    const parsed = parseInt(val || '7');
    return isNaN(parsed) ? 7 : Math.min(Math.max(parsed, 1), 90); // Clamp between 1-90 days
  }),
});

export const analyticsSessionSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

// ============================================
// Recommendation Schemas
// ============================================

export const recommendationSchema = z.object({
  occasion: z.enum(['wedding', 'business', 'prom', 'formal', 'casual', 'black_tie', 'cocktail', 'gala']).optional(),
  suit_color: z.string().optional(),
  shirt_color: z.string().optional(),
  tie_color: z.string().optional(),
  formality_level: z.number().min(1).max(5).optional(),
  customer_profile: z.string().optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
});

export const completeTheLookSchema = z.object({
  product: z.object({
    id: z.string().optional(),
    color: z.string().optional(),
    category: z.string().optional(),
    occasion: z.string().optional(),
    formality: z.number().optional(),
  }).optional(),
  currentOutfit: z.array(z.any()).optional(),
  preferences: z.object({
    customerId: z.string().optional(),
  }).optional(),
  occasion: z.string().optional(),
});

export const validateCombinationSchema = z.object({
  suit_color: z.string().default('navy'),
  shirt_color: z.string().default('white'),
  tie_color: z.string().optional(),
  occasion: z.string().default('business'),
  customer_profile: z.string().optional(),
});

export const analyzeOutfitSchema = z.object({
  outfit: z.object({
    suit: z.object({ color: z.string() }).optional(),
    shirt: z.object({ color: z.string() }).optional(),
    tie: z.object({ color: z.string() }).optional(),
  }).optional(),
  occasion: z.string().default('business'),
  preferences: z.object({
    customerId: z.string().optional(),
  }).optional(),
});

export const similarProductsSchema = z.object({
  product: z.object({
    id: z.string().optional(),
    color: z.string().optional(),
    occasion: z.string().optional(),
    formality: z.number().optional(),
  }),
  limit: z.number().min(1).max(20).default(5),
});

// ============================================
// V2 API Schemas
// ============================================

export const v2RecommendationsSchema = z.object({
  productId: z.string().optional(),
  category: z.string().optional(),
  color: z.string().optional(),
  style: z.string().optional(),
  occasion: z.string().optional(),
  priceRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  customerId: z.string().optional(),
});

export const colorParamSchema = z.object({
  color: z.string().min(1, 'Color parameter is required'),
});

// ============================================
// Validation Middleware Factory
// ============================================

type SchemaType = 'body' | 'query' | 'params';

export const validate = (schema: z.ZodSchema, type: SchemaType = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let data;

      switch (type) {
        case 'body':
          data = req.body;
          break;
        case 'query':
          data = req.query;
          break;
        case 'params':
          data = req.params;
          break;
      }

      const validated = schema.parse(data);

      // Replace original data with validated data
      switch (type) {
        case 'body':
          req.body = validated;
          break;
        case 'query':
          req.query = validated as any;
          break;
        case 'params':
          req.params = validated as any;
          break;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        // Log validation failures for debugging
        console.log('❌ Validation failed:', JSON.stringify({
          source,
          payload: req[source as keyof typeof req],
          errors
        }).substring(0, 300));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }

      // Log unexpected validation errors
      console.log('❌ Unexpected validation error:', error);

      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    }
  };
};

// ============================================
// Export Convenience Functions
// ============================================

export const validateBody = (schema: z.ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: z.ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: z.ZodSchema) => validate(schema, 'params');
