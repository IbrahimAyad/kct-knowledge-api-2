/**
 * Data Validation Schemas
 * Validates knowledge bank data structure and API requests
 */

import { Request, Response, NextFunction } from 'express';
import { createApiResponse } from './data-loader';

// Validation utility functions
export class ValidationSchemas {
  
  /**
   * Validate color recommendation request
   */
  static validateColorRecommendationRequest(req: Request, res: Response, next: NextFunction) {
    const { suit_color, occasion, season, formality_level, customer_profile } = req.body;

    const errors: string[] = [];

    // Required fields
    if (!suit_color || typeof suit_color !== 'string') {
      errors.push('suit_color is required and must be a string');
    }

    // Optional field validations
    if (occasion && !ValidationSchemas.isValidOccasion(occasion)) {
      errors.push('Invalid occasion. Valid values: wedding_groom, wedding_guest, business_professional, special_event, cocktail, black_tie, casual');
    }

    if (season && !ValidationSchemas.isValidSeason(season)) {
      errors.push('Invalid season. Valid values: spring, summer, fall, winter');
    }

    if (formality_level && (typeof formality_level !== 'number' || formality_level < 1 || formality_level > 10)) {
      errors.push('formality_level must be a number between 1 and 10');
    }

    if (customer_profile && !ValidationSchemas.isValidCustomerProfile(customer_profile)) {
      errors.push('Invalid customer_profile. Valid values: classic_conservative, modern_adventurous, practical_value_seeker, occasion_driven, luxury_connoisseur');
    }

    if (errors.length > 0) {
      return res.status(400).json(createApiResponse(false, undefined, errors.join('; ')));
    }

    return next();
  }

  /**
   * Validate style profile identification request
   */
  static validateStyleProfileRequest(req: Request, res: Response, next: NextFunction) {
    const { quiz_answers, behavioral_data, demographics } = req.body;

    const errors: string[] = [];

    // At least one data source should be provided
    if (!quiz_answers && !behavioral_data && !demographics) {
      errors.push('At least one of quiz_answers, behavioral_data, or demographics must be provided');
    }

    // Validate quiz_answers structure
    if (quiz_answers && typeof quiz_answers !== 'object') {
      errors.push('quiz_answers must be an object');
    }

    // Validate behavioral_data structure
    if (behavioral_data) {
      if (typeof behavioral_data !== 'object') {
        errors.push('behavioral_data must be an object');
      } else {
        if (behavioral_data.pages_viewed && !Array.isArray(behavioral_data.pages_viewed)) {
          errors.push('behavioral_data.pages_viewed must be an array');
        }
        if (behavioral_data.time_spent && typeof behavioral_data.time_spent !== 'number') {
          errors.push('behavioral_data.time_spent must be a number');
        }
        if (behavioral_data.clicked_sections && !Array.isArray(behavioral_data.clicked_sections)) {
          errors.push('behavioral_data.clicked_sections must be an array');
        }
      }
    }

    // Validate demographics structure
    if (demographics) {
      if (typeof demographics !== 'object') {
        errors.push('demographics must be an object');
      } else {
        if (demographics.age_range && typeof demographics.age_range !== 'string') {
          errors.push('demographics.age_range must be a string');
        }
        if (demographics.occupation && typeof demographics.occupation !== 'string') {
          errors.push('demographics.occupation must be a string');
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(createApiResponse(false, undefined, errors.join('; ')));
    }

    return next();
  }

  /**
   * Validate conversion optimization request
   */
  static validateConversionOptimizationRequest(req: Request, res: Response, next: NextFunction) {
    const { combination, customer_profile, occasion, price_tier, device_type } = req.body;

    const errors: string[] = [];

    // Required fields
    if (!combination || typeof combination !== 'string') {
      errors.push('combination is required and must be a string');
    }

    // Optional field validations
    if (customer_profile && !ValidationSchemas.isValidCustomerProfile(customer_profile)) {
      errors.push('Invalid customer_profile');
    }

    if (occasion && !ValidationSchemas.isValidOccasion(occasion)) {
      errors.push('Invalid occasion');
    }

    if (price_tier && !ValidationSchemas.isValidPriceTier(price_tier)) {
      errors.push('Invalid price_tier. Valid values: budget, mid_range, premium, luxury');
    }

    if (device_type && !ValidationSchemas.isValidDeviceType(device_type)) {
      errors.push('Invalid device_type. Valid values: desktop, mobile, tablet');
    }

    if (errors.length > 0) {
      return res.status(400).json(createApiResponse(false, undefined, errors.join('; ')));
    }

    return next();
  }

  /**
   * Validate outfit validation request
   */
  static validateOutfitValidationRequest(req: Request, res: Response, next: NextFunction) {
    const { suit_color, shirt_color, tie_color, occasion, customer_profile } = req.body;

    const errors: string[] = [];

    // Required fields
    if (!suit_color || typeof suit_color !== 'string') {
      errors.push('suit_color is required and must be a string');
    }

    if (!shirt_color || typeof shirt_color !== 'string') {
      errors.push('shirt_color is required and must be a string');
    }

    if (!tie_color || typeof tie_color !== 'string') {
      errors.push('tie_color is required and must be a string');
    }

    // Optional field validations
    if (occasion && !ValidationSchemas.isValidOccasion(occasion)) {
      errors.push('Invalid occasion');
    }

    if (customer_profile && !ValidationSchemas.isValidCustomerProfile(customer_profile)) {
      errors.push('Invalid customer_profile');
    }

    if (errors.length > 0) {
      return res.status(400).json(createApiResponse(false, undefined, errors.join('; ')));
    }

    return next();
  }

  /**
   * Validate conversion prediction request
   */
  static validateConversionPredictionRequest(req: Request, res: Response, next: NextFunction) {
    const { combination, customer_profile, occasion, device, season } = req.body;

    const errors: string[] = [];

    // Required fields
    if (!combination || typeof combination !== 'string') {
      errors.push('combination is required and must be a string');
    }

    // Optional field validations
    if (customer_profile && !ValidationSchemas.isValidCustomerProfile(customer_profile)) {
      errors.push('Invalid customer_profile');
    }

    if (occasion && !ValidationSchemas.isValidOccasion(occasion)) {
      errors.push('Invalid occasion');
    }

    if (device && !ValidationSchemas.isValidDeviceType(device)) {
      errors.push('Invalid device');
    }

    if (season && !ValidationSchemas.isValidSeason(season)) {
      errors.push('Invalid season');
    }

    if (errors.length > 0) {
      return res.status(400).json(createApiResponse(false, undefined, errors.join('; ')));
    }

    return next();
  }

  /**
   * Validate personalization request
   */
  static validatePersonalizationRequest(req: Request, res: Response, next: NextFunction) {
    const { profile, age, occupation, shopping_behavior, previous_purchases } = req.body;

    const errors: string[] = [];

    // Optional field validations
    if (profile && !ValidationSchemas.isValidCustomerProfile(profile)) {
      errors.push('Invalid profile');
    }

    if (age && typeof age !== 'string') {
      errors.push('age must be a string');
    }

    if (occupation && typeof occupation !== 'string') {
      errors.push('occupation must be a string');
    }

    if (shopping_behavior && !Array.isArray(shopping_behavior)) {
      errors.push('shopping_behavior must be an array');
    }

    if (previous_purchases && !Array.isArray(previous_purchases)) {
      errors.push('previous_purchases must be an array');
    }

    if (errors.length > 0) {
      return res.status(400).json(createApiResponse(false, undefined, errors.join('; ')));
    }

    return next();
  }

  // Helper validation methods

  private static isValidOccasion(occasion: string): boolean {
    const validOccasions = [
      'wedding_groom',
      'wedding_guest',
      'business_professional',
      'special_event',
      'cocktail',
      'black_tie',
      'casual'
    ];
    return validOccasions.includes(occasion);
  }

  private static isValidSeason(season: string): boolean {
    const validSeasons = ['spring', 'summer', 'fall', 'winter'];
    return validSeasons.includes(season);
  }

  private static isValidCustomerProfile(profile: string): boolean {
    const validProfiles = [
      'classic_conservative',
      'modern_adventurous',
      'practical_value_seeker',
      'occasion_driven',
      'luxury_connoisseur'
    ];
    return validProfiles.includes(profile);
  }

  private static isValidPriceTier(tier: string): boolean {
    const validTiers = ['budget', 'mid_range', 'premium', 'luxury'];
    return validTiers.includes(tier);
  }

  private static isValidDeviceType(device: string): boolean {
    const validDevices = ['desktop', 'mobile', 'tablet'];
    return validDevices.includes(device);
  }
}

/**
 * Data structure validation schemas
 */
export class DataValidationSchemas {
  
  /**
   * Validate color relationships data structure
   */
  static validateColorRelationshipsData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.version || typeof data.version !== 'string') {
      errors.push('Missing or invalid version field');
    }

    if (!data.last_updated || typeof data.last_updated !== 'string') {
      errors.push('Missing or invalid last_updated field');
    }

    if (!data.color_relationships || typeof data.color_relationships !== 'object') {
      errors.push('Missing or invalid color_relationships field');
    } else {
      // Validate each color entry
      for (const [color, colorData] of Object.entries(data.color_relationships)) {
        if (!colorData || typeof colorData !== 'object') {
          errors.push(`Invalid data for color: ${color}`);
          continue;
        }

        const cd = colorData as any;
        
        if (!cd.perfect_matches || typeof cd.perfect_matches !== 'object') {
          errors.push(`Missing perfect_matches for color: ${color}`);
        } else {
          if (!Array.isArray(cd.perfect_matches.shirts)) {
            errors.push(`Invalid shirts array for color: ${color}`);
          }
          if (!Array.isArray(cd.perfect_matches.ties)) {
            errors.push(`Invalid ties array for color: ${color}`);
          }
          if (typeof cd.perfect_matches.confidence !== 'number') {
            errors.push(`Invalid confidence value for color: ${color}`);
          }
        }
      }
    }

    if (!data.universal_rules || typeof data.universal_rules !== 'object') {
      errors.push('Missing or invalid universal_rules field');
    }

    if (!data.color_families || typeof data.color_families !== 'object') {
      errors.push('Missing or invalid color_families field');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate style profiles data structure
   */
  static validateStyleProfilesData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.version || typeof data.version !== 'string') {
      errors.push('Missing or invalid version field');
    }

    if (!data.total_profiles || typeof data.total_profiles !== 'number') {
      errors.push('Missing or invalid total_profiles field');
    }

    if (!data.profile_categories || typeof data.profile_categories !== 'object') {
      errors.push('Missing or invalid profile_categories field');
    } else {
      // Validate each profile
      for (const [profileName, profileData] of Object.entries(data.profile_categories)) {
        if (!profileData || typeof profileData !== 'object') {
          errors.push(`Invalid data for profile: ${profileName}`);
          continue;
        }

        const pd = profileData as any;

        if (!pd.percentage_of_customers || typeof pd.percentage_of_customers !== 'string') {
          errors.push(`Missing percentage_of_customers for profile: ${profileName}`);
        }

        if (!pd.demographics || typeof pd.demographics !== 'object') {
          errors.push(`Missing demographics for profile: ${profileName}`);
        }

        if (!pd.characteristics || typeof pd.characteristics !== 'object') {
          errors.push(`Missing characteristics for profile: ${profileName}`);
        }

        if (!Array.isArray(pd.preferred_combinations)) {
          errors.push(`Invalid preferred_combinations for profile: ${profileName}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate conversion rates data structure
   */
  static validateConversionRatesData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('Missing or invalid metadata field');
    } else {
      if (!data.metadata.version || typeof data.metadata.version !== 'string') {
        errors.push('Missing metadata version');
      }
      if (!data.metadata.total_sessions_analyzed || typeof data.metadata.total_sessions_analyzed !== 'number') {
        errors.push('Missing or invalid total_sessions_analyzed');
      }
    }

    if (!data.top_converting_combinations || typeof data.top_converting_combinations !== 'object') {
      errors.push('Missing or invalid top_converting_combinations field');
    } else {
      if (!Array.isArray(data.top_converting_combinations.all_time_best)) {
        errors.push('Invalid all_time_best array');
      }
    }

    if (!data.conversion_by_category || typeof data.conversion_by_category !== 'object') {
      errors.push('Missing or invalid conversion_by_category field');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Generic request validation middleware
 */
export function validateRequest(schema: (req: Request, res: Response, next: NextFunction) => void) {
  return schema;
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(req: Request, res: Response, next: NextFunction) {
  // Basic rate limiting logic can be implemented here
  // For now, just pass through
  next();
}

/**
 * API key validation (if needed)
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query['api_key'];
  
  // For development, skip API key validation
  // In production, implement proper API key validation
  if (process.env['NODE_ENV'] === 'production' && !apiKey) {
    return res.status(401).json(createApiResponse(
      false,
      undefined,
      'API key is required'
    ));
  }
  
  return next();
}