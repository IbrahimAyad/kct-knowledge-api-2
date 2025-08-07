/**
 * Knowledge Bank Service
 * Central service that orchestrates all knowledge bank functionality
 */

import { dataLoader } from '../utils/data-loader';
import { colorService } from './color-service';
import { styleProfileService } from './style-profile-service';
import { conversionService } from './conversion-service';
import {
  ColorRecommendationRequest,
  ColorRecommendationResponse,
  StyleProfileRequest,
  StyleProfileResponse,
  ConversionOptimizationRequest,
  ConversionOptimizationResponse,
  ApiResponse,
  KnowledgeBankIndex
} from '../types/knowledge-bank';

export class KnowledgeBankService {
  private initialized = false;

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Promise.all([
      colorService.initialize(),
      styleProfileService.initialize(),
      conversionService.initialize()
    ]);

    this.initialized = true;
  }

  /**
   * Get system health and data integrity status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      [service: string]: {
        status: 'ok' | 'error';
        last_updated?: string;
        error?: string;
      };
    };
    data_integrity: {
      valid: boolean;
      missing_files: string[];
      corrupted_files: string[];
    };
    cache_stats: {
      size: number;
      keys: string[];
    };
  }> {
    const health: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: any;
      data_integrity: any;
      cache_stats: any;
    } = {
      status: 'healthy',
      services: {},
      data_integrity: {},
      cache_stats: {}
    };

    try {
      // Check data integrity
      health.data_integrity = await dataLoader.validateDataIntegrity();
      
      // Check cache stats
      health.cache_stats = dataLoader.getCacheStats();

      // Test each service
      try {
        await colorService.getColorFamilies();
        health.services.color_service = { status: 'ok' };
      } catch (error) {
        health.services.color_service = { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        health.status = 'degraded';
      }

      try {
        await styleProfileService.getAllProfiles();
        health.services.style_profile_service = { status: 'ok' };
      } catch (error) {
        health.services.style_profile_service = { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        health.status = 'degraded';
      }

      try {
        await conversionService.getTopConvertingCombinations(1);
        health.services.conversion_service = { status: 'ok' };
      } catch (error) {
        health.services.conversion_service = { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        health.status = 'degraded';
      }

      // Overall health determination
      if (!health.data_integrity.valid) {
        health.status = 'unhealthy';
      }

      const errorServices = Object.values(health.services).filter((s: any) => s.status === 'error');
      if (errorServices.length >= 2) {
        health.status = 'unhealthy';
      }

    } catch (error) {
      health.status = 'unhealthy';
    }

    return health;
  }

  /**
   * Get comprehensive color and style recommendations
   */
  async getComprehensiveRecommendations(request: {
    suit_color: string;
    occasion?: string;
    season?: string;
    formality_level?: number;
    customer_profile?: string;
    age?: string;
    occupation?: string;
  }): Promise<{
    color_recommendations: ColorRecommendationResponse;
    style_profile?: StyleProfileResponse;
    conversion_insights?: any;
    complete_looks: Array<{
      suit_color: string;
      shirt_color: string;
      tie_color: string;
      confidence: number;
      formality_score: number;
      conversion_prediction: number;
    }>;
  }> {
    await this.initialize();

    // Get color recommendations
    const colorRecommendations = await colorService.getColorRecommendations({
      suit_color: request.suit_color,
      occasion: request.occasion as any,
      season: request.season as any,
      formality_level: request.formality_level,
      customer_profile: request.customer_profile
    });

    // Get style profile if demographics provided
    let styleProfile: StyleProfileResponse | undefined;
    if (request.customer_profile || request.age || request.occupation) {
      try {
        styleProfile = await styleProfileService.identifyProfile({
          demographics: {
            age_range: request.age,
            occupation: request.occupation
          }
        });
      } catch (error) {
        // Continue without style profile if identification fails
      }
    }

    // Get conversion insights
    let conversionInsights: any = undefined;
    if (request.occasion) {
      try {
        conversionInsights = await conversionService.getConversionByOccasion(request.occasion);
      } catch (error) {
        // Continue without conversion insights if lookup fails
      }
    }

    // Generate complete looks by combining recommendations
    const completeLooks = this.generateCompleteLooks(
      request.suit_color,
      colorRecommendations,
      request.occasion,
      styleProfile?.profile_type
    );

    return {
      color_recommendations: colorRecommendations,
      style_profile: styleProfile,
      conversion_insights: conversionInsights,
      complete_looks: completeLooks
    };
  }

  /**
   * Get fashion intelligence insights
   */
  async getFashionIntelligence(): Promise<{
    trending_colors: any;
    seasonal_champions: any;
    top_combinations: any;
    conversion_leaders: any;
    style_distribution: any;
  }> {
    await this.initialize();

    const [
      trendingColors,
      seasonalChampions,
      topCombinations,
      conversionLeaders,
      styleProfiles
    ] = await Promise.all([
      colorService.getTrendingColors(),
      dataLoader.loadSeasonalChampions(),
      conversionService.getTopConvertingCombinations(10),
      dataLoader.loadTop10AllTime(),
      styleProfileService.getAllProfiles()
    ]);

    // Calculate style distribution
    const styleDistribution: any = {};
    for (const [profileName, profile] of Object.entries(styleProfiles)) {
      styleDistribution[profileName] = profile.percentage_of_customers;
    }

    return {
      trending_colors: trendingColors,
      seasonal_champions: seasonalChampions,
      top_combinations: topCombinations,
      conversion_leaders: conversionLeaders,
      style_distribution: styleDistribution
    };
  }

  /**
   * Validate and optimize a complete outfit
   */
  async validateAndOptimizeOutfit(outfit: {
    suit_color: string;
    shirt_color: string;
    tie_color: string;
    occasion?: string;
    customer_profile?: string;
  }): Promise<{
    validation: {
      valid: boolean;
      confidence: number;
      issues: string[];
      improvements: string[];
    };
    optimization: {
      predicted_conversion_rate: number;
      optimization_suggestions: string[];
      upsell_opportunities: string[];
    };
    alternatives: Array<{
      suit_color: string;
      shirt_color: string;
      tie_color: string;
      confidence: number;
      reason: string;
    }>;
  }> {
    await this.initialize();

    // Validate the combination
    const validation = await colorService.validateCombination(
      outfit.suit_color,
      outfit.shirt_color,
      outfit.tie_color,
      outfit.occasion
    );

    // Get optimization insights
    const combinationString = `${outfit.suit_color}_${outfit.shirt_color}_${outfit.tie_color}`;
    const optimization = await conversionService.getConversionOptimization({
      combination: combinationString,
      customer_profile: outfit.customer_profile,
      occasion: outfit.occasion as any
    });

    // Generate alternatives if the outfit scores low
    const alternatives: any[] = [];
    if (validation.confidence < 70) {
      const colorRecs = await colorService.getColorRecommendations({
        suit_color: outfit.suit_color,
        occasion: outfit.occasion as any,
        customer_profile: outfit.customer_profile
      });

      // Create alternative combinations
      const topShirts = colorRecs.shirt_recommendations.slice(0, 2);
      const topTies = colorRecs.tie_recommendations.slice(0, 2);

      for (const shirt of topShirts) {
        for (const tie of topTies) {
          alternatives.push({
            suit_color: outfit.suit_color,
            shirt_color: shirt.color,
            tie_color: tie.color,
            confidence: (shirt.confidence + tie.confidence) / 2,
            reason: `Better color harmony: ${shirt.reasoning.split('.')[0]}`
          });
        }
      }

      // Sort by confidence
      alternatives.sort((a, b) => b.confidence - a.confidence);
    }

    return {
      validation,
      optimization,
      alternatives: alternatives.slice(0, 4) // Top 4 alternatives
    };
  }

  /**
   * Get personalized shopping experience data
   */
  async getPersonalizedExperience(customerData: {
    profile?: string;
    age?: string;
    occupation?: string;
    shopping_behavior?: string[];
    previous_purchases?: string[];
  }): Promise<{
    recommended_homepage: string;
    messaging_style: string;
    product_sort_order: string;
    bundle_preference: string;
    color_preferences: string[];
    recommended_combinations: string[];
    upsell_opportunities: string[];
  }> {
    await this.initialize();

    // Identify or use provided profile
    let profileName = customerData.profile;
    if (!profileName && (customerData.age || customerData.occupation)) {
      const profileResult = await styleProfileService.identifyProfile({
        demographics: {
          age_range: customerData.age,
          occupation: customerData.occupation
        },
        behavioral_data: customerData.shopping_behavior ? {
          pages_viewed: customerData.shopping_behavior,
          time_spent: 180, // Default
          clicked_sections: []
        } : undefined
      });
      profileName = profileResult.profile_type;
    }

    if (!profileName) {
      profileName = 'classic_conservative'; // Default fallback
    }

    // Get personalization data
    const [profile, personalizationMatrix, recommendations] = await Promise.all([
      styleProfileService.getProfile(profileName),
      styleProfileService.getPersonalizationMatrix(profileName),
      styleProfileService.getProfileBasedRecommendations(profileName)
    ]);

    // Get conversion-optimized upsells
    const upsellData = await conversionService.getTopConvertingCombinations(5);
    const upsellOpportunities = upsellData.map(combo => combo.combination);

    return {
      recommended_homepage: personalizationMatrix?.homepage_hero || 'Classic Collection',
      messaging_style: profile?.ai_conversation_style || 'Professional and helpful',
      product_sort_order: personalizationMatrix?.product_sort || 'best_sellers_first',
      bundle_preference: recommendations.price_range,
      color_preferences: recommendations.colors,
      recommended_combinations: recommendations.styles,
      upsell_opportunities: upsellOpportunities
    };
  }

  /**
   * Get knowledge bank metadata and statistics
   */
  async getKnowledgeBankInfo(): Promise<{
    index: KnowledgeBankIndex;
    statistics: {
      total_combinations: number;
      color_relationships: number;
      style_profiles: number;
      conversion_data_points: number;
      last_updated: string;
    };
    coverage: {
      colors: string[];
      occasions: string[];
      profiles: string[];
      seasons: string[];
    };
  }> {
    const index = await dataLoader.loadIndex();
    const [colorData, styleData, conversionData] = await Promise.all([
      dataLoader.loadColorRelationships(),
      dataLoader.loadStyleProfiles(),
      dataLoader.loadConversionRates()
    ]);

    const statistics = {
      total_combinations: conversionData.top_converting_combinations.all_time_best.length,
      color_relationships: Object.keys(colorData.color_relationships).length,
      style_profiles: Object.keys(styleData.profile_categories).length,
      conversion_data_points: conversionData.metadata.total_sessions_analyzed,
      last_updated: conversionData.metadata.last_updated
    };

    const coverage = {
      colors: Object.keys(colorData.color_relationships),
      occasions: Object.keys(conversionData.conversion_by_category.occasion_based),
      profiles: Object.keys(styleData.profile_categories),
      seasons: ['spring', 'summer', 'fall', 'winter']
    };

    return {
      index,
      statistics,
      coverage
    };
  }

  // Private helper methods

  private generateCompleteLooks(
    suitColor: string,
    colorRecs: ColorRecommendationResponse,
    occasion?: string,
    customerProfile?: string
  ): Array<{
    suit_color: string;
    shirt_color: string;
    tie_color: string;
    confidence: number;
    formality_score: number;
    conversion_prediction: number;
  }> {
    const looks: any[] = [];

    // Generate combinations from recommendations
    const topShirts = colorRecs.shirt_recommendations.slice(0, 3);
    const topTies = colorRecs.tie_recommendations.slice(0, 3);

    for (const shirt of topShirts) {
      for (const tie of topTies) {
        // Calculate combined confidence
        const confidence = Math.round((shirt.confidence + tie.confidence) / 2);
        
        // Use provided formality score or calculate average
        const formalityScore = colorRecs.formality_score;
        
        // Estimate conversion prediction (simplified)
        let conversionPrediction = 18.0; // Base rate
        if (confidence > 90) conversionPrediction += 5;
        if (occasion === 'wedding_groom') conversionPrediction += 8;
        if (customerProfile === 'luxury_connoisseur') conversionPrediction += 12;

        looks.push({
          suit_color: suitColor,
          shirt_color: shirt.color,
          tie_color: tie.color,
          confidence,
          formality_score: formalityScore,
          conversion_prediction: Math.round(conversionPrediction * 10) / 10
        });
      }
    }

    // Sort by confidence and return top combinations
    return looks
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6);
  }
}

export const knowledgeBankService = new KnowledgeBankService();