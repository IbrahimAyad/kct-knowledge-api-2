/**
 * Color Recommendation Service
 * Provides intelligent color matching and recommendations based on knowledge bank data
 */

import { dataLoader } from '../utils/data-loader';
import { cacheService } from './cache-service';
import {
  ColorRelationships,
  FormalityIndex,
  ColorRecommendationRequest,
  ColorRecommendationResponse,
  SuitColor,
  Season,
  Occasion
} from '../types/knowledge-bank';

export class ColorService {
  private colorData: ColorRelationships | null = null;
  private formalityData: FormalityIndex | null = null;

  /**
   * Initialize the service with data
   */
  async initialize(): Promise<void> {
    // Use cache-aside pattern for initialization
    this.colorData = await cacheService.getOrSet(
      'color:relationships',
      () => dataLoader.loadColorRelationships(),
      { 
        ttl: 24 * 60 * 60, // 24 hours
        tags: ['colors', 'relationships'],
        compress: true 
      }
    );

    this.formalityData = await cacheService.getOrSet(
      'color:formality',
      () => dataLoader.loadFormalityIndex(),
      { 
        ttl: 24 * 60 * 60, // 24 hours
        tags: ['colors', 'formality'],
        compress: true 
      }
    );
  }

  /**
   * Get color recommendations for a suit color
   */
  async getColorRecommendations(request: ColorRecommendationRequest): Promise<ColorRecommendationResponse> {
    // Create cache key for this specific request
    const cacheKey = `color:recommendations:${JSON.stringify(request)}`;
    
    // Try to get cached recommendations first
    const cached = await cacheService.get<ColorRecommendationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.colorData || !this.formalityData) {
      await this.initialize();
    }

    const suitColor = request.suit_color.toLowerCase().replace(/\s+/g, '_');
    const suitColorData = this.colorData!.color_relationships[suitColor];

    if (!suitColorData) {
      throw new Error(`Color "${request.suit_color}" not found in knowledge bank`);
    }

    // Get shirt recommendations
    const shirtRecommendations = [
      ...suitColorData.perfect_matches.shirts.map(color => ({
        color,
        confidence: suitColorData.perfect_matches.confidence,
        reasoning: 'Perfect match based on color theory and customer data'
      }))
    ];

    if (suitColorData.good_matches) {
      shirtRecommendations.push(
        ...suitColorData.good_matches.shirts.map(color => ({
          color,
          confidence: suitColorData.good_matches!.confidence,
          reasoning: 'Good match with high versatility'
        }))
      );
    }

    // Apply seasonal boost if specified
    if (request.season && suitColorData.seasonal_boosts) {
      const seasonalColors = suitColorData.seasonal_boosts[request.season];
      if (seasonalColors) {
        shirtRecommendations.forEach(rec => {
          if (seasonalColors.includes(rec.color)) {
            rec.confidence += 5;
            rec.reasoning += ` (${request.season} seasonal favorite)`;
          }
        });
      }
    }

    // Get tie recommendations
    const tieRecommendations = [
      ...suitColorData.perfect_matches.ties.map(color => ({
        color,
        confidence: suitColorData.perfect_matches.confidence,
        reasoning: 'Perfect match based on color theory and customer data'
      }))
    ];

    if (suitColorData.good_matches) {
      tieRecommendations.push(
        ...suitColorData.good_matches.ties.map(color => ({
          color,
          confidence: suitColorData.good_matches!.confidence,
          reasoning: 'Good match with style versatility'
        }))
      );
    }

    // Calculate formality score
    const formalityScore = this.calculateFormalityScore(suitColor, request.formality_level);

    // Check occasion appropriateness
    const occasionAppropriate = this.checkOccasionAppropriateness(
      suitColor,
      request.occasion,
      formalityScore
    );

    // Add seasonal notes
    const seasonalNotes = this.getSeasonalNotes(suitColor, request.season);

    // Sort recommendations by confidence
    shirtRecommendations.sort((a, b) => b.confidence - a.confidence);
    tieRecommendations.sort((a, b) => b.confidence - a.confidence);

    const response = {
      shirt_recommendations: shirtRecommendations.slice(0, 6), // Top 6 recommendations
      tie_recommendations: tieRecommendations.slice(0, 8), // Top 8 recommendations
      formality_score: formalityScore,
      occasion_appropriate: occasionAppropriate,
      seasonal_notes: seasonalNotes
    };

    // Cache the response for future requests
    await cacheService.set(cacheKey, response, {
      ttl: 4 * 60 * 60, // 4 hours - color recommendations can be cached for medium duration
      tags: ['colors', 'recommendations'],
    });

    return response;
  }

  /**
   * Get color families and relationships
   */
  async getColorFamilies(): Promise<any> {
    return await cacheService.getOrSet(
      'color:families',
      async () => {
        if (!this.colorData) {
          await this.initialize();
        }
        return this.colorData!.color_families;
      },
      { 
        ttl: 24 * 60 * 60, // 24 hours - static data
        tags: ['colors', 'families'],
      }
    );
  }

  /**
   * Get universal color rules
   */
  async getUniversalRules(): Promise<any> {
    return await cacheService.getOrSet(
      'color:universal_rules',
      async () => {
        if (!this.colorData) {
          await this.initialize();
        }
        return this.colorData!.universal_rules;
      },
      { 
        ttl: 24 * 60 * 60, // 24 hours - static data
        tags: ['colors', 'rules'],
      }
    );
  }

  /**
   * Find complementary colors for a given color
   */
  async findComplementaryColors(color: string): Promise<{
    perfect_matches: string[];
    good_matches: string[];
    avoid: string[];
  }> {
    if (!this.colorData) {
      await this.initialize();
    }

    const normalizedColor = color.toLowerCase().replace(/\s+/g, '_');
    const colorData = this.colorData!.color_relationships[normalizedColor];

    if (!colorData) {
      throw new Error(`Color "${color}" not found`);
    }

    const avoid = await this.getColorsToAvoid(normalizedColor);

    return {
      perfect_matches: [...colorData.perfect_matches.shirts, ...colorData.perfect_matches.ties],
      good_matches: colorData.good_matches 
        ? [...colorData.good_matches.shirts, ...colorData.good_matches.ties]
        : [],
      avoid
    };
  }

  /**
   * Get trending colors
   */
  async getTrendingColors(): Promise<{
    rising: string[];
    stable: string[];
    declining: string[];
  }> {
    return await cacheService.getOrSet(
      'color:trending',
      async () => {
        if (!this.colorData) {
          await this.initialize();
        }

        const trending = { rising: [] as string[], stable: [] as string[], declining: [] as string[] };

        for (const [color, data] of Object.entries(this.colorData!.color_relationships)) {
          if (data.trending) {
            if (data.trending.includes('up') || data.trending.includes('increasing')) {
              trending.rising.push(color);
            } else if (data.trending === 'stable') {
              trending.stable.push(color);
            } else if (data.trending.includes('down') || data.trending.includes('declining')) {
              trending.declining.push(color);
            }
          }
        }

        return trending;
      },
      { 
        ttl: 60 * 60, // 1 hour - trending data changes more frequently
        tags: ['colors', 'trending'],
      }
    );
  }

  /**
   * Validate a color combination
   */
  async validateCombination(
    suitColor: string,
    shirtColor: string,
    tieColor: string,
    occasion?: string
  ): Promise<{
    valid: boolean;
    confidence: number;
    issues: string[];
    improvements: string[];
  }> {
    if (!this.colorData) {
      await this.initialize();
    }

    const normalizedSuitColor = suitColor.toLowerCase().replace(/\s+/g, '_');
    const normalizedShirtColor = shirtColor.toLowerCase().replace(/\s+/g, '_');
    const normalizedTieColor = tieColor.toLowerCase().replace(/\s+/g, '_');

    const suitData = this.colorData!.color_relationships[normalizedSuitColor];
    if (!suitData) {
      throw new Error(`Suit color "${suitColor}" not found`);
    }

    const issues: string[] = [];
    const improvements: string[] = [];
    let confidence = 0;

    // Check shirt compatibility
    if (suitData.perfect_matches.shirts.includes(normalizedShirtColor)) {
      confidence += 40;
    } else if (suitData.good_matches?.shirts.includes(normalizedShirtColor)) {
      confidence += 25;
    } else {
      issues.push(`Shirt color "${shirtColor}" is not recommended with "${suitColor}" suit`);
      confidence -= 20;
    }

    // Check tie compatibility
    if (suitData.perfect_matches.ties.includes(normalizedTieColor)) {
      confidence += 40;
    } else if (suitData.good_matches?.ties.includes(normalizedTieColor)) {
      confidence += 25;
    } else {
      issues.push(`Tie color "${tieColor}" is not recommended with "${suitColor}" suit`);
      confidence -= 20;
    }

    // Check for never-combine rules
    const neverCombineRules = await dataLoader.loadNeverCombineRules();
    // Add logic to check never-combine rules here

    // Check occasion appropriateness
    if (occasion) {
      const formalityScore = this.calculateFormalityScore(normalizedSuitColor);
      const occasionAppropriate = this.checkOccasionAppropriateness(
        normalizedSuitColor,
        occasion,
        formalityScore
      );

      if (!occasionAppropriate) {
        issues.push(`This combination may not be appropriate for "${occasion}"`);
        confidence -= 15;
      }
    }

    // Generate improvements
    if (confidence < 70) {
      const recommendations = await this.getColorRecommendations({
        suit_color: suitColor,
        occasion: occasion as Occasion
      });

      improvements.push(
        `Consider these shirt colors: ${recommendations.shirt_recommendations
          .slice(0, 3)
          .map(r => r.color)
          .join(', ')}`
      );

      improvements.push(
        `Consider these tie colors: ${recommendations.tie_recommendations
          .slice(0, 3)
          .map(r => r.color)
          .join(', ')}`
      );
    }

    return {
      valid: confidence >= 50,
      confidence: Math.max(0, Math.min(100, confidence)),
      issues,
      improvements
    };
  }

  /**
   * Calculate formality score for a color combination
   */
  private calculateFormalityScore(suitColor: string, requestedLevel?: number): number {
    if (!this.formalityData) return 5;

    const suitFormalityData = this.formalityData.suit_formality[suitColor];
    if (!suitFormalityData) return 5;

    let score = suitFormalityData.base_formality;

    // Apply any modifiers based on context
    if (requestedLevel) {
      score = Math.min(score, requestedLevel);
    }

    return score;
  }

  /**
   * Check if color combination is appropriate for occasion
   */
  private checkOccasionAppropriateness(
    suitColor: string,
    occasion?: string,
    formalityScore?: number
  ): boolean {
    if (!occasion || !this.formalityData) return true;

    const requiredFormality = this.getOccasionFormalityRequirement(occasion);
    const actualFormality = formalityScore || this.calculateFormalityScore(suitColor);

    return actualFormality >= requiredFormality;
  }

  /**
   * Get formality requirement for occasion
   */
  private getOccasionFormalityRequirement(occasion: string): number {
    const formalityMap: { [key: string]: number } = {
      'black_tie': 9,
      'wedding_groom': 7,
      'business_professional': 6,
      'cocktail': 5,
      'wedding_guest': 5,
      'special_event': 4,
      'casual': 3
    };

    return formalityMap[occasion] || 5;
  }

  /**
   * Get seasonal notes for a color
   */
  private getSeasonalNotes(suitColor: string, season?: string): string[] | undefined {
    if (!season || !this.colorData) return undefined;

    const colorData = this.colorData.color_relationships[suitColor];
    const notes: string[] = [];

    if (colorData.seasonal_favorite && colorData.seasonal_favorite.includes(season)) {
      notes.push(`${suitColor} is a seasonal favorite for ${season}`);
    }

    if (colorData.seasonal_restriction && season) {
      notes.push(`Note: ${colorData.seasonal_restriction}`);
    }

    if (colorData.seasonal_boosts && colorData.seasonal_boosts[season]) {
      notes.push(`Seasonal accent colors: ${colorData.seasonal_boosts[season].join(', ')}`);
    }

    return notes.length > 0 ? notes : undefined;
  }

  /**
   * Get colors to avoid with a specific color
   */
  private async getColorsToAvoid(color: string): Promise<string[]> {
    try {
      const neverCombineRules = await dataLoader.loadNeverCombineRules();
      return neverCombineRules[color] || [];
    } catch {
      return [];
    }
  }

  /**
   * ENHANCED METHODS FOR CULTURAL COLOR INTELLIGENCE
   * Integrates with CulturalAdaptationService for culturally-aware color recommendations
   */

  /**
   * Get culturally-aware color recommendations
   */
  async getCulturallyAwareColorRecommendations(request: ColorRecommendationRequest & {
    cultural_region?: string;
    cultural_sensitivity_level?: 'low' | 'medium' | 'high';
  }): Promise<ColorRecommendationResponse & {
    cultural_considerations?: {
      color: string;
      cultural_significance: string;
      appropriateness_level: number;
      regional_notes: string[];
    }[];
    cultural_warnings?: string[];
  }> {
    // Get base recommendations
    const baseRecommendations = await this.getColorRecommendations(request);
    
    // If no cultural context provided, return base recommendations
    if (!request.cultural_region) {
      return baseRecommendations;
    }

    try {
      // Import cultural service
      const { culturalAdaptationService } = await import('./cultural-adaptation-service');
      
      // Analyze cultural significance of recommended colors
      const allRecommendedColors = [
        ...baseRecommendations.shirt_recommendations.map(r => r.color),
        ...baseRecommendations.tie_recommendations.map(r => r.color)
      ];
      
      const culturalAnalysis = await culturalAdaptationService.analyzeColorCulturalSignificance(
        allRecommendedColors,
        request.cultural_region
      );

      // Create cultural considerations
      const culturalConsiderations = Object.entries(culturalAnalysis).map(([color, analysis]) => ({
        color,
        cultural_significance: analysis.cultural_meaning[0] || 'No specific cultural significance',
        appropriateness_level: analysis.appropriateness,
        regional_notes: analysis.context_considerations
      }));

      // Identify cultural warnings
      const culturalWarnings: string[] = [];
      Object.entries(culturalAnalysis).forEach(([color, analysis]) => {
        if (analysis.appropriateness < 5) {
          culturalWarnings.push(`${color} may not be culturally appropriate in ${request.cultural_region}: ${analysis.cultural_meaning[0]}`);
        }
      });

      // Adjust confidence scores based on cultural appropriateness
      const enhancedShirtRecommendations = baseRecommendations.shirt_recommendations.map(rec => {
        const culturalData = culturalAnalysis[rec.color];
        if (culturalData && culturalData.appropriateness < 6) {
          return {
            ...rec,
            confidence: Math.max(rec.confidence - 15, 10),
            reasoning: `${rec.reasoning} (Cultural appropriateness: ${culturalData.appropriateness}/10)`
          };
        }
        return rec;
      });

      const enhancedTieRecommendations = baseRecommendations.tie_recommendations.map(rec => {
        const culturalData = culturalAnalysis[rec.color];
        if (culturalData && culturalData.appropriateness < 6) {
          return {
            ...rec,
            confidence: Math.max(rec.confidence - 15, 10),
            reasoning: `${rec.reasoning} (Cultural appropriateness: ${culturalData.appropriateness}/10)`
          };
        }
        return rec;
      });

      return {
        ...baseRecommendations,
        shirt_recommendations: enhancedShirtRecommendations,
        tie_recommendations: enhancedTieRecommendations,
        cultural_considerations: culturalConsiderations,
        cultural_warnings: culturalWarnings
      };

    } catch (error) {
      console.warn('Failed to get cultural color analysis:', error);
      return baseRecommendations;
    }
  }

  /**
   * Get venue-optimized color recommendations
   */
  async getVenueOptimizedColorRecommendations(request: ColorRecommendationRequest & {
    venue_type?: string;
    lighting_conditions?: string[];
    time_of_day?: string;
  }): Promise<ColorRecommendationResponse & {
    venue_optimization?: {
      lighting_impact: string;
      venue_suitability: number;
      photography_tips: string[];
    };
  }> {
    // Get base recommendations
    const baseRecommendations = await this.getColorRecommendations(request);
    
    // If no venue context provided, return base recommendations
    if (!request.venue_type) {
      return baseRecommendations;
    }

    try {
      // Import venue service
      const { venueIntelligenceService } = await import('./venue-intelligence-service');
      
      // Get venue intelligence
      const venueIntelligence = await venueIntelligenceService.getVenueIntelligence(request.venue_type);
      
      // Analyze lighting impact on colors
      let lightingImpact = 'Good color accuracy expected';
      let photographyTips: string[] = [];
      
      if (request.lighting_conditions) {
        const lightingAnalysis = await venueIntelligenceService.analyzeLightingConditions(request.lighting_conditions);
        lightingImpact = `Color accuracy: ${lightingAnalysis.color_accuracy_impact}/10`;
        photographyTips = lightingAnalysis.recommendations;
      }

      // Calculate venue suitability based on dress code and formality
      const venueSuitability = Math.min(
        baseRecommendations.formality_score,
        venueIntelligence.dress_code_strictness
      ) / Math.max(baseRecommendations.formality_score, venueIntelligence.dress_code_strictness) * 10;

      return {
        ...baseRecommendations,
        venue_optimization: {
          lighting_impact: lightingImpact,
          venue_suitability: Math.round(venueSuitability),
          photography_tips: photographyTips
        }
      };

    } catch (error) {
      console.warn('Failed to get venue optimization:', error);
      return baseRecommendations;
    }
  }

  /**
   * Get psychology-optimized color recommendations
   */
  async getPsychologyOptimizedColorRecommendations(request: ColorRecommendationRequest & {
    customer_id?: string;
    emotional_triggers?: string[];
    personality_type?: string;
  }): Promise<ColorRecommendationResponse & {
    psychology_optimization?: {
      emotional_alignment: string[];
      confidence_boost_colors: string[];
      personality_match: string;
    };
  }> {
    // Get base recommendations
    const baseRecommendations = await this.getColorRecommendations(request);
    
    // If no psychology context provided, return base recommendations
    if (!request.customer_id && !request.emotional_triggers && !request.personality_type) {
      return baseRecommendations;
    }

    try {
      // Import psychology service
      const { customerPsychologyService } = await import('./customer-psychology-service');
      
      const emotionalAlignment: string[] = [];
      const confidenceBoostColors: string[] = [];
      let personalityMatch = 'Standard professional colors';

      // Analyze emotional triggers
      if (request.emotional_triggers) {
        request.emotional_triggers.forEach(trigger => {
          switch (trigger) {
            case 'confidence':
              confidenceBoostColors.push('Navy', 'Charcoal');
              emotionalAlignment.push('Authority colors boost confidence');
              break;
            case 'status':
              confidenceBoostColors.push('Black', 'Midnight Blue');
              emotionalAlignment.push('Premium colors signal status');
              break;
            case 'comfort':
              confidenceBoostColors.push('Light Blue', 'Light Grey');
              emotionalAlignment.push('Softer colors provide comfort');
              break;
          }
        });
      }

      // Get personality-based preferences
      if (request.personality_type) {
        try {
          const personalityPrefs = await customerPsychologyService.getPersonalityPreferences(request.personality_type as any);
          personalityMatch = personalityPrefs.body_language || 'Professional confidence';
        } catch (error) {
          console.warn('Failed to get personality preferences:', error);
        }
      }

      // Enhance recommendations with psychology insights
      const enhancedShirtRecommendations = baseRecommendations.shirt_recommendations.map(rec => {
        if (confidenceBoostColors.includes(rec.color)) {
          return {
            ...rec,
            confidence: Math.min(rec.confidence + 10, 100),
            reasoning: `${rec.reasoning} (Aligned with emotional triggers)`
          };
        }
        return rec;
      });

      return {
        ...baseRecommendations,
        shirt_recommendations: enhancedShirtRecommendations,
        psychology_optimization: {
          emotional_alignment: emotionalAlignment,
          confidence_boost_colors: confidenceBoostColors,
          personality_match: personalityMatch
        }
      };

    } catch (error) {
      console.warn('Failed to get psychology optimization:', error);
      return baseRecommendations;
    }
  }

  /**
   * Get comprehensive enhanced color recommendations
   * Combines cultural, venue, and psychology intelligence
   */
  async getComprehensiveColorRecommendations(request: ColorRecommendationRequest & {
    cultural_region?: string;
    cultural_sensitivity_level?: 'low' | 'medium' | 'high';
    venue_type?: string;
    lighting_conditions?: string[];
    customer_id?: string;
    emotional_triggers?: string[];
    personality_type?: string;
  }): Promise<{
    base_recommendations: ColorRecommendationResponse;
    cultural_analysis?: any;
    venue_analysis?: any;
    psychology_analysis?: any;
    final_recommendations: {
      shirt_recommendations: Array<{
        color: string;
        confidence: number;
        reasoning: string;
        cultural_score?: number;
        venue_score?: number;
        psychology_score?: number;
        overall_score: number;
      }>;
      tie_recommendations: Array<{
        color: string;
        confidence: number;
        reasoning: string;
        cultural_score?: number;
        venue_score?: number;
        psychology_score?: number;
        overall_score: number;
      }>;
    };
    insights: string[];
    warnings: string[];
  }> {
    // Get all analyses in parallel
    const [baseRecommendations, culturalAnalysis, venueAnalysis, psychologyAnalysis] = await Promise.all([
      this.getColorRecommendations(request),
      request.cultural_region ? this.getCulturallyAwareColorRecommendations(request) : null,
      request.venue_type ? this.getVenueOptimizedColorRecommendations(request) : null,
      (request.customer_id || request.emotional_triggers || request.personality_type) ? 
        this.getPsychologyOptimizedColorRecommendations(request) : null
    ]);

    // Combine insights and warnings
    const insights: string[] = [];
    const warnings: string[] = [];

    if (culturalAnalysis?.cultural_considerations) {
      insights.push(`Cultural analysis included for ${request.cultural_region}`);
      if (culturalAnalysis.cultural_warnings) {
        warnings.push(...culturalAnalysis.cultural_warnings);
      }
    }

    if (venueAnalysis?.venue_optimization) {
      insights.push(`Venue optimization applied for ${request.venue_type}`);
      insights.push(`Lighting impact: ${venueAnalysis.venue_optimization.lighting_impact}`);
    }

    if (psychologyAnalysis?.psychology_optimization) {
      insights.push('Psychology-based color optimization applied');
      insights.push(...psychologyAnalysis.psychology_optimization.emotional_alignment);
    }

    // Create comprehensive final recommendations
    const finalShirtRecommendations = baseRecommendations.shirt_recommendations.map(rec => {
      let overallScore = rec.confidence;
      const scores: any = {};

      // Add cultural score
      if (culturalAnalysis?.cultural_considerations) {
        const culturalData = culturalAnalysis.cultural_considerations.find(c => c.color === rec.color);
        if (culturalData) {
          scores.cultural_score = culturalData.appropriateness_level * 10;
          overallScore = (overallScore + scores.cultural_score) / 2;
        }
      }

      // Add venue score
      if (venueAnalysis?.venue_optimization) {
        scores.venue_score = venueAnalysis.venue_optimization.venue_suitability * 10;
        overallScore = (overallScore + scores.venue_score) / 2;
      }

      // Add psychology score
      if (psychologyAnalysis?.psychology_optimization) {
        const isConfidenceColor = psychologyAnalysis.psychology_optimization.confidence_boost_colors.includes(rec.color);
        scores.psychology_score = isConfidenceColor ? 90 : 70;
        overallScore = (overallScore + scores.psychology_score) / 2;
      }

      return {
        ...rec,
        ...scores,
        overall_score: Math.round(overallScore)
      };
    });

    const finalTieRecommendations = baseRecommendations.tie_recommendations.map(rec => {
      let overallScore = rec.confidence;
      const scores: any = {};

      // Similar scoring logic for ties
      if (culturalAnalysis?.cultural_considerations) {
        const culturalData = culturalAnalysis.cultural_considerations.find(c => c.color === rec.color);
        if (culturalData) {
          scores.cultural_score = culturalData.appropriateness_level * 10;
          overallScore = (overallScore + scores.cultural_score) / 2;
        }
      }

      return {
        ...rec,
        ...scores,
        overall_score: Math.round(overallScore)
      };
    });

    return {
      base_recommendations: baseRecommendations,
      cultural_analysis: culturalAnalysis,
      venue_analysis: venueAnalysis,
      psychology_analysis: psychologyAnalysis,
      final_recommendations: {
        shirt_recommendations: finalShirtRecommendations.sort((a, b) => b.overall_score - a.overall_score),
        tie_recommendations: finalTieRecommendations.sort((a, b) => b.overall_score - a.overall_score)
      },
      insights,
      warnings
    };
  }
}

export const colorService = new ColorService();