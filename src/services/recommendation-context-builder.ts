/**
 * Recommendation Context Builder
 *
 * THE FUSION BRAIN: Combines all intelligence signals into one unified context
 * BEFORE any color matching or product lookup happens.
 *
 * This is what separates a lookup table from a recommendation engine.
 * Farfetch, Stitch Fix, and Trunk Club all do this — fuse signals first, THEN recommend.
 */

import { logger } from '../utils/logger';
import { venueIntelligenceService } from './venue-intelligence-service';
import { careerIntelligenceService } from './career-intelligence-service';
import { culturalAdaptationService } from './cultural-adaptation-service';
import { customerPsychologyService } from './customer-psychology-service';
import { seasonalRulesEngine } from './seasonal-rules-engine';

/**
 * Unified recommendation context - everything needed to make smart recommendations
 */
export interface RecommendationContext {
  // Formality guidance (fused from venue + occasion + career)
  formality_range: [number, number];        // e.g., [6, 9] for church wedding

  // Color filtering (fused from season + culture + venue lighting)
  color_filters: {
    preferred: string[];                     // Colors that work well for this context
    avoid: string[];                         // Colors to exclude (cultural/venue clashes)
    photograph_well: string[];               // Colors that look good in photos/lighting
  };

  // Fabric preferences (fused from venue + season + occasion)
  fabric_preferences: {
    recommended: string[];                   // Fabrics suited to context
    avoid: string[];                         // Fabrics to exclude
    performance_priorities: string[];        // What matters: breathable, wrinkle-resistant, etc.
  };

  // Price tier (from career stage + occasion importance)
  price_tier: {
    range: string;                           // "entry", "mid", "high", "luxury"
    min_investment: number;                  // Minimum recommended spend
    max_investment: number;                  // Maximum recommended spend
    quality_level: string;                   // "starter", "professional", "executive"
  };

  // Fit guidance (from occupation + age + body language data)
  fit_guidance: {
    style: string;                           // "modern", "classic", "slim", "relaxed"
    details: string[];                       // Specific fit recommendations
    industry_standard?: string;              // What this industry typically wears
  };

  // Decision fatigue logic (from research data)
  max_recommendations: number;               // How many options to show (3-10)

  // Human-readable explanations for every decision
  reasoning: string[];                       // Clear "why" for each recommendation

  // Metadata
  confidence: number;                        // Overall confidence in context (0-1)
  signals_used: string[];                    // Which intelligence sources contributed
}

/**
 * Input for building recommendation context
 */
export interface RecommendationRequest {
  // Core product request
  suit_color?: string;
  shirt_color?: string;
  tie_color?: string;

  // Occasion context
  occasion?: string;                         // "wedding", "prom", "interview", etc.
  venue_type?: string;                       // "church", "ballroom", "outdoor", etc.
  season?: string;                           // "spring", "summer", "fall", "winter"

  // Customer context
  age?: number;
  occupation?: string;
  role_level?: string;                       // "entry", "mid", "senior", "executive"
  customer_id?: string;                      // For known customers

  // Regional/cultural context
  cultural_region?: string;                  // "detroit", "midwest", etc.
  religious_context?: string;                // "catholic", "jewish", "muslim", etc.

  // Session context (for decision fatigue)
  session_duration?: number;                 // Minutes browsing
  choices_viewed?: number;                   // Products viewed this session

  // Optional flags
  use_case?: string;                         // "video_call", "photography", "travel"
}

/**
 * Recommendation Context Builder Service
 */
class RecommendationContextBuilder {

  /**
   * Build unified recommendation context from all available signals
   */
  async buildContext(request: RecommendationRequest): Promise<RecommendationContext> {
    const reasoning: string[] = [];
    const signalsUsed: string[] = [];

    try {
      logger.info('🧠 Building recommendation context', {
        occasion: request.occasion,
        venue: request.venue_type,
        age: request.age,
        occupation: request.occupation
      });

      // Step 1: Determine formality range (venue + occasion + career)
      const formalityRange = await this.determineFormalityRange(request, reasoning, signalsUsed);

      // Step 2: Build color filters (season + culture + venue lighting)
      const colorFilters = await this.buildColorFilters(request, reasoning, signalsUsed);

      // Step 3: Determine fabric preferences (venue context + season)
      const fabricPreferences = await this.buildFabricPreferences(request, reasoning, signalsUsed);

      // Step 4: Calculate price tier (career stage + occasion)
      const priceTier = await this.calculatePriceTier(request, reasoning, signalsUsed);

      // Step 5: Build fit guidance (occupation + age)
      const fitGuidance = await this.buildFitGuidance(request, reasoning, signalsUsed);

      // Step 6: Calculate max recommendations (decision fatigue logic)
      const maxRecommendations = this.calculateMaxRecommendations(request, reasoning);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(signalsUsed);

      const context: RecommendationContext = {
        formality_range: formalityRange,
        color_filters: colorFilters,
        fabric_preferences: fabricPreferences,
        price_tier: priceTier,
        fit_guidance: fitGuidance,
        max_recommendations: maxRecommendations,
        reasoning,
        confidence,
        signals_used: signalsUsed,
      };

      logger.info('✅ Context built successfully', {
        signals: signalsUsed.length,
        reasoning_points: reasoning.length,
        max_recs: maxRecommendations,
        confidence
      });

      return context;

    } catch (error) {
      logger.error('Failed to build recommendation context:', error);

      // Return safe fallback context
      return this.getFallbackContext(request, reasoning);
    }
  }

  /**
   * Determine formality range from venue + occasion + career
   */
  private async determineFormalityRange(
    request: RecommendationRequest,
    reasoning: string[],
    signalsUsed: string[]
  ): Promise<[number, number]> {

    let minFormality = 5; // Default: business casual
    let maxFormality = 8; // Default: business formal

    // Get venue intelligence
    if (request.venue_type) {
      try {
        const venueData = await venueIntelligenceService.getVenueIntelligence(request.venue_type);

        if (venueData.dress_code_strictness) {
          // Venue dress_code_strictness is a 1-10 number
          const strictness = venueData.dress_code_strictness;
          minFormality = Math.max(minFormality, strictness - 1);
          maxFormality = Math.min(10, strictness + 1);

          reasoning.push(`${this.capitalizeVenue(request.venue_type)} setting requires formality level ${minFormality}-${maxFormality}`);
          signalsUsed.push('venue_intelligence');
        }
      } catch (error) {
        logger.warn('Venue intelligence unavailable, using defaults');
      }
    }

    // Adjust for occasion
    if (request.occasion) {
      const occasionAdjustment = this.getOccasionFormalityAdjustment(request.occasion);
      minFormality = Math.max(1, minFormality + occasionAdjustment.min);
      maxFormality = Math.min(10, maxFormality + occasionAdjustment.max);

      if (occasionAdjustment.reasoning) {
        reasoning.push(occasionAdjustment.reasoning);
        signalsUsed.push('occasion_analysis');
      }
    }

    // Adjust for career level (TODO: Wire in Section 1.4)
    if (request.role_level || request.occupation) {
      // Temporary simple mapping until Section 1.4 wires career intelligence
      const careerFormality = this.getCareerFormality(request.occupation, request.role_level);
      if (careerFormality > 0) {
        minFormality = Math.max(minFormality, careerFormality - 1);
        reasoning.push(`${request.occupation || 'Professional'} role suggests formality level ${careerFormality}/10`);
        signalsUsed.push('career_heuristic');
      }
    }

    return [minFormality, maxFormality];
  }

  /**
   * Build color filters from season + culture + venue lighting
   */
  private async buildColorFilters(
    request: RecommendationRequest,
    reasoning: string[],
    signalsUsed: string[]
  ): Promise<RecommendationContext['color_filters']> {

    const preferred: string[] = [];
    const avoid: string[] = [];
    const photographWell: string[] = [];

    // Apply cultural filters (TODO: Wire in Section 1.5)
    if (request.cultural_region || request.religious_context) {
      try {
        const culturalData = await culturalAdaptationService.getCulturalNuances(
          request.cultural_region || 'general'
        );

        // Extract color preferences from cultural data
        if (culturalData.color_preferences && culturalData.color_preferences.length > 0) {
          // Colors with low appropriateness are taboo
          const taboos = culturalData.color_preferences
            .filter(cp => cp.appropriateness_level < 4)
            .map(cp => cp.color);
          if (taboos.length > 0) {
            avoid.push(...taboos);
            reasoning.push(`Cultural context: avoiding ${taboos.join(', ')}`);
            signalsUsed.push('cultural_adaptation');
          }

          // Colors with high appropriateness are preferred
          const culturallyPreferred = culturalData.color_preferences
            .filter(cp => cp.appropriateness_level > 7)
            .map(cp => cp.color);
          if (culturallyPreferred.length > 0) {
            preferred.push(...culturallyPreferred);
          }
        }
      } catch (error) {
        logger.warn('Cultural adaptation service unavailable');
      }
    }

    // Apply venue lighting considerations
    if (request.venue_type) {
      try {
        const venueData = await venueIntelligenceService.getVenueIntelligence(request.venue_type);

        if (venueData.lighting_conditions?.primary_lighting) {
          const lightingColors = this.getColorsByLighting(venueData.lighting_conditions.primary_lighting);
          photographWell.push(...lightingColors.photographWell);

          if (lightingColors.reasoning) {
            reasoning.push(lightingColors.reasoning);
            signalsUsed.push('lighting_analysis');
          }
        }
      } catch (error) {
        logger.warn('Venue lighting analysis unavailable');
      }
    }

    // Apply seasonal preferences
    if (request.season) {
      const seasonalColors = this.getSeasonalColors(request.season);
      preferred.push(...seasonalColors.preferred);

      reasoning.push(`${this.capitalizeSeason(request.season)} season favors ${seasonalColors.preferred.slice(0, 3).join(', ')}`);
      signalsUsed.push('seasonal_analysis');
    }

    return {
      preferred: [...new Set(preferred)], // Remove duplicates
      avoid: [...new Set(avoid)],
      photograph_well: [...new Set(photographWell)],
    };
  }

  /**
   * Build fabric preferences from venue context + season
   */
  private async buildFabricPreferences(
    request: RecommendationRequest,
    reasoning: string[],
    signalsUsed: string[]
  ): Promise<RecommendationContext['fabric_preferences']> {

    const recommended: string[] = [];
    const avoid: string[] = [];
    const performancePriorities: string[] = [];

    // Seasonal fabric recommendations
    if (request.season) {
      const seasonalFabrics = this.getSeasonalFabrics(request.season);
      recommended.push(...seasonalFabrics.recommended);
      avoid.push(...seasonalFabrics.avoid);
      performancePriorities.push(...seasonalFabrics.priorities);

      reasoning.push(`For ${request.season}, we recommend ${seasonalFabrics.recommended[0]} for optimal comfort`);
      signalsUsed.push('seasonal_fabric_analysis');
    }

    // Venue-specific fabric needs
    if (request.venue_type) {
      const venueFabrics = this.getVenueFabrics(request.venue_type);
      recommended.push(...venueFabrics.recommended);
      performancePriorities.push(...venueFabrics.priorities);

      if (venueFabrics.reasoning) {
        reasoning.push(venueFabrics.reasoning);
      }
    }

    // Use case specific (e.g., travel, video calls)
    if (request.use_case === 'travel') {
      recommended.push('wrinkle_resistant_blend', 'stretch_wool');
      performancePriorities.push('wrinkle_resistance', 'packability');
      reasoning.push('For travel: prioritizing wrinkle-resistant and packable fabrics');
      signalsUsed.push('use_case_analysis');
    }

    return {
      recommended: [...new Set(recommended)],
      avoid: [...new Set(avoid)],
      performance_priorities: [...new Set(performancePriorities)],
    };
  }

  /**
   * Calculate price tier from career stage + occasion
   */
  private async calculatePriceTier(
    request: RecommendationRequest,
    reasoning: string[],
    signalsUsed: string[]
  ): Promise<RecommendationContext['price_tier']> {

    let range = 'mid';
    let minInvestment = 200;
    let maxInvestment = 400;
    let qualityLevel = 'professional';

    // Get career-based pricing (TODO: Wire in Section 1.4)
    if (request.age || request.role_level || request.occupation) {
      // Temporary simple mapping until Section 1.4
      const careerTier = this.getCareerPricingTier(request.occupation, request.role_level, request.age);
      if (careerTier) {
        minInvestment = careerTier.min;
        maxInvestment = careerTier.max;
        range = careerTier.range;
        qualityLevel = careerTier.quality;
        reasoning.push(`Professional level suggests ${range} tier: $${minInvestment}-$${maxInvestment}`);
        signalsUsed.push('career_heuristic');
      }
    }

    // Adjust for occasion importance
    if (request.occasion) {
      const occasionMultiplier = this.getOccasionImportanceMultiplier(request.occasion);
      if (occasionMultiplier > 1) {
        minInvestment = Math.floor(minInvestment * occasionMultiplier);
        maxInvestment = Math.floor(maxInvestment * occasionMultiplier);
        reasoning.push(`${this.capitalizeOccasion(request.occasion)} is a significant occasion — worth investing in quality`);
      }
    }

    return {
      range,
      min_investment: minInvestment,
      max_investment: maxInvestment,
      quality_level: qualityLevel,
    };
  }

  /**
   * Build fit guidance from occupation + age
   */
  private async buildFitGuidance(
    request: RecommendationRequest,
    reasoning: string[],
    signalsUsed: string[]
  ): Promise<RecommendationContext['fit_guidance']> {

    let style = 'classic';
    const details: string[] = [];
    let industryStandard: string | undefined;

    // Occupation-based fit preferences
    if (request.occupation) {
      const fitPreferences = this.getOccupationFitPreferences(request.occupation);
      style = fitPreferences.style;
      details.push(...fitPreferences.details);
      industryStandard = fitPreferences.industryStandard;

      reasoning.push(`${fitPreferences.industryStandard || 'Professional standards'} suggest ${style} fit with ${fitPreferences.details[0]}`);
      signalsUsed.push('occupation_fit_analysis');
    }

    // Age-based adjustments
    if (request.age) {
      const ageFitAdjustments = this.getAgeFitAdjustments(request.age);
      if (ageFitAdjustments.style) {
        style = ageFitAdjustments.style;
      }
      if (ageFitAdjustments.details.length > 0) {
        details.push(...ageFitAdjustments.details);
      }

      signalsUsed.push('age_fit_analysis');
    }

    return {
      style,
      details: [...new Set(details)],
      industry_standard: industryStandard,
    };
  }

  /**
   * Calculate maximum recommendations based on decision fatigue research
   *
   * From research data (menswear_decision_fatigue_summary.csv):
   * - Optimal personalized: 4-5 items (85% effectiveness)
   * - Optimal generic: 9-12 items (45% peak conversion)
   * - Fatigue threshold: 25+ minutes browsing
   */
  private calculateMaxRecommendations(
    request: RecommendationRequest,
    reasoning: string[]
  ): number {

    const OPTIMAL_PERSONALIZED = 5;    // 85% effectiveness
    const OPTIMAL_GENERIC = 10;        // 45% peak conversion at 9-12
    const FATIGUE_REDUCED = 3;         // For sessions > 25 min

    // Check for decision fatigue (long session)
    if (request.session_duration && request.session_duration > 25) {
      reasoning.push('Simplified selection — focused on top choices to reduce decision fatigue');
      return FATIGUE_REDUCED;
    }

    // Personalized recommendations for known customers
    if (request.customer_id || (request.age && request.occupation)) {
      reasoning.push('Showing 4-5 personalized recommendations for optimal decision-making');
      return OPTIMAL_PERSONALIZED;
    }

    // Generic browsing — show more options
    reasoning.push('Showing curated selection to help you find the perfect fit');
    return OPTIMAL_GENERIC;
  }

  /**
   * Calculate overall confidence in the context
   */
  private calculateConfidence(signalsUsed: string[]): number {
    // More signals = higher confidence
    const baseConfidence = 0.6;
    const signalBoost = Math.min(0.4, signalsUsed.length * 0.05);
    return Math.min(1.0, baseConfidence + signalBoost);
  }

  /**
   * Fallback context when intelligence services fail
   */
  private getFallbackContext(
    request: RecommendationRequest,
    reasoning: string[]
  ): RecommendationContext {

    reasoning.push('Using general recommendations — enhance your profile for personalized suggestions');

    return {
      formality_range: [5, 8],
      color_filters: {
        preferred: ['navy', 'charcoal', 'black'],
        avoid: [],
        photograph_well: ['navy', 'charcoal'],
      },
      fabric_preferences: {
        recommended: ['worsted_wool', 'wool_blend'],
        avoid: [],
        performance_priorities: ['durability'],
      },
      price_tier: {
        range: 'mid',
        min_investment: 200,
        max_investment: 400,
        quality_level: 'professional',
      },
      fit_guidance: {
        style: 'classic',
        details: ['Regular fit', 'Notch lapel'],
      },
      max_recommendations: 10,
      reasoning,
      confidence: 0.5,
      signals_used: ['fallback'],
    };
  }

  // ===========================
  // Helper Methods
  // ===========================

  private capitalizeVenue(venue: string): string {
    return venue.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private capitalizeSeason(season: string): string {
    return season.charAt(0).toUpperCase() + season.slice(1);
  }

  private capitalizeOccasion(occasion: string): string {
    return occasion.charAt(0).toUpperCase() + occasion.slice(1);
  }

  private getOccasionFormalityAdjustment(occasion: string): { min: number; max: number; reasoning?: string } {
    const adjustments: Record<string, { min: number; max: number; reasoning?: string }> = {
      wedding: { min: 1, max: 2, reasoning: 'Weddings call for elevated formality and refined presentation' },
      prom: { min: 0, max: 2, reasoning: 'Prom is a formal occasion deserving of polished attire' },
      interview: { min: 2, max: 2, reasoning: 'Job interviews require professional, conservative presentation' },
      funeral: { min: 2, max: 2, reasoning: 'Funerals require respectful, conservative attire' },
      gala: { min: 3, max: 3, reasoning: 'Gala events demand black-tie or formal evening wear' },
      business: { min: 0, max: 1, reasoning: 'Business settings call for professional attire' },
      casual: { min: -2, max: -1, reasoning: 'Casual occasions allow for more relaxed styling' },
    };

    return adjustments[occasion.toLowerCase()] || { min: 0, max: 0 };
  }

  private getColorsByLighting(lightingType: string): { photographWell: string[]; reasoning?: string } {
    const lightingMap: Record<string, { photographWell: string[]; reasoning?: string }> = {
      tungsten: {
        photographWell: ['navy', 'charcoal', 'burgundy'],
        reasoning: 'Under tungsten lighting, these colors maintain depth and photograph beautifully',
      },
      fluorescent: {
        photographWell: ['charcoal', 'black', 'dark_grey'],
        reasoning: 'Fluorescent lighting works best with neutral, darker tones',
      },
      natural: {
        photographWell: ['navy', 'light_grey', 'tan', 'sage_green'],
        reasoning: 'Natural lighting showcases these colors with true, vibrant tones',
      },
      led: {
        photographWell: ['navy', 'charcoal', 'burgundy', 'emerald_green'],
        reasoning: 'LED lighting brings out the richness in these colors',
      },
    };

    return lightingMap[lightingType.toLowerCase()] || { photographWell: ['navy', 'charcoal'] };
  }

  private getSeasonalColors(season: string): { preferred: string[] } {
    // Try to get from seasonal rules engine (uses real data from color-seasonality.json)
    try {
      const seasonData = (seasonalRulesEngine as any).colorSeasonality?.[season.toLowerCase()];
      if (seasonData?.primary) {
        // Combine primary + accent for comprehensive preferences
        const preferred = [...(seasonData.primary || []), ...(seasonData.accent || [])];
        return { preferred };
      }
    } catch (error) {
      logger.warn('Failed to load seasonal colors from engine, using fallback');
    }

    // Fallback to inline map (only if engine data unavailable)
    const seasonalMap: Record<string, { preferred: string[] }> = {
      spring: { preferred: ['light_blue', 'sage_green', 'tan', 'light_grey'] },
      summer: { preferred: ['light_blue', 'white', 'tan', 'sage_green'] },
      fall: { preferred: ['burgundy', 'chocolate_brown', 'hunter_green', 'charcoal', 'terracotta'] },
      winter: { preferred: ['navy', 'charcoal', 'black', 'burgundy', 'emerald_green'] },
    };

    return seasonalMap[season.toLowerCase()] || { preferred: ['navy', 'charcoal'] };
  }

  private getSeasonalFabrics(season: string): { recommended: string[]; avoid: string[]; priorities: string[] } {
    // Try to get from seasonal rules engine (uses real data from fabric-seasonality.json)
    try {
      const fabricData = (seasonalRulesEngine as any).fabricSeasonality?.[season.toLowerCase()];
      if (fabricData?.excellent) {
        return {
          recommended: [...(fabricData.excellent || []), ...(fabricData.good || [])],
          avoid: fabricData.avoid || [],
          priorities: fabricData.characteristics || [],
        };
      }
    } catch (error) {
      logger.warn('Failed to load seasonal fabrics from engine, using fallback');
    }

    // Fallback to inline map (only if engine data unavailable)
    const seasonalMap: Record<string, { recommended: string[]; avoid: string[]; priorities: string[] }> = {
      spring: {
        recommended: ['lightweight_wool', 'cotton_blend', 'linen_blend'],
        avoid: ['heavy_wool', 'velvet'],
        priorities: ['breathability', 'comfort'],
      },
      summer: {
        recommended: ['linen', 'cotton', 'tropical_wool', 'lightweight_wool'],
        avoid: ['heavy_wool', 'flannel', 'velvet'],
        priorities: ['breathability', 'moisture_wicking', 'lightweight'],
      },
      fall: {
        recommended: ['worsted_wool', 'tweed', 'flannel'],
        avoid: ['linen', 'lightweight_cotton'],
        priorities: ['warmth', 'durability'],
      },
      winter: {
        recommended: ['heavy_wool', 'flannel', 'cashmere_blend', 'velvet'],
        avoid: ['linen', 'lightweight_wool'],
        priorities: ['warmth', 'insulation'],
      },
    };

    return seasonalMap[season.toLowerCase()] || {
      recommended: ['worsted_wool', 'wool_blend'],
      avoid: [],
      priorities: ['versatility'],
    };
  }

  private getVenueFabrics(venueType: string): { recommended: string[]; priorities: string[]; reasoning?: string } {
    const venueMap: Record<string, { recommended: string[]; priorities: string[]; reasoning?: string }> = {
      outdoor: {
        recommended: ['lightweight_wool', 'linen_blend', 'cotton_blend'],
        priorities: ['breathability', 'wrinkle_resistance'],
        reasoning: 'Outdoor venues benefit from breathable, weather-appropriate fabrics',
      },
      church: {
        recommended: ['worsted_wool', 'wool_blend'],
        priorities: ['durability', 'formality'],
        reasoning: 'Church settings call for traditional, refined fabric choices',
      },
      beach: {
        recommended: ['linen', 'cotton', 'tropical_wool'],
        priorities: ['breathability', 'lightweight', 'moisture_wicking'],
        reasoning: 'Beach venues require lightweight, breathable fabrics',
      },
      ballroom: {
        recommended: ['worsted_wool', 'silk_blend', 'wool_blend'],
        priorities: ['formality', 'appearance'],
        reasoning: 'Ballroom settings showcase refined, premium fabrics',
      },
    };

    return venueMap[venueType.toLowerCase()] || {
      recommended: ['worsted_wool'],
      priorities: ['versatility'],
    };
  }

  private getOccasionImportanceMultiplier(occasion: string): number {
    const multipliers: Record<string, number> = {
      wedding: 1.3,
      prom: 1.2,
      gala: 1.5,
      interview: 1.1,
      funeral: 1.0,
      business: 1.0,
      casual: 0.9,
    };

    return multipliers[occasion.toLowerCase()] || 1.0;
  }

  private getOccupationFitPreferences(occupation: string): {
    style: string;
    details: string[];
    industryStandard: string;
  } {
    const occupationMap: Record<string, { style: string; details: string[]; industryStandard: string }> = {
      lawyer: {
        style: 'classic',
        details: ['Structured shoulders', 'Peak lapels', 'Conservative cut'],
        industryStandard: 'Legal professionals prefer traditional, authoritative styling',
      },
      banker: {
        style: 'classic',
        details: ['Structured fit', 'Conservative styling', 'Peak or notch lapels'],
        industryStandard: 'Banking industry standards call for traditional business attire',
      },
      consultant: {
        style: 'modern',
        details: ['Slim fit', 'Contemporary cut', 'Clean lines'],
        industryStandard: 'Consulting professionals favor modern, polished looks',
      },
      creative: {
        style: 'modern',
        details: ['Slim or tailored fit', 'Contemporary styling', 'Fashion-forward details'],
        industryStandard: 'Creative industries embrace modern, expressive styling',
      },
      executive: {
        style: 'classic',
        details: ['Tailored fit', 'Premium construction', 'Refined details'],
        industryStandard: 'Executive presence calls for impeccable tailoring',
      },
    };

    const normalized = occupation.toLowerCase();
    return occupationMap[normalized] || {
      style: 'classic',
      details: ['Regular fit', 'Notch lapel', 'Professional styling'],
      industryStandard: 'Professional standards suggest classic, versatile styling',
    };
  }

  private getAgeFitAdjustments(age: number): { style: string; details: string[] } {
    if (age < 25) {
      return {
        style: 'modern',
        details: ['Slim or modern fit', 'Contemporary styling'],
      };
    } else if (age < 40) {
      return {
        style: 'modern',
        details: ['Tailored fit', 'Clean lines'],
      };
    } else {
      return {
        style: 'classic',
        details: ['Classic fit', 'Traditional styling'],
      };
    }
  }

  /**
   * Simple career formality heuristic (until Section 1.4 wires full career intelligence)
   */
  private getCareerFormality(occupation?: string, role_level?: string): number {
    if (!occupation && !role_level) return 0;

    // Role level mapping
    if (role_level) {
      const level = role_level.toLowerCase();
      if (level.includes('c-level') || level.includes('executive')) return 9;
      if (level.includes('director') || level.includes('vp')) return 8;
      if (level.includes('manager') || level.includes('senior')) return 7;
      if (level.includes('associate') || level.includes('mid')) return 6;
      if (level.includes('entry') || level.includes('junior')) return 5;
    }

    // Occupation mapping
    if (occupation) {
      const occ = occupation.toLowerCase();
      if (occ.includes('lawyer') || occ.includes('banker') || occ.includes('consultant')) return 8;
      if (occ.includes('accountant') || occ.includes('finance')) return 7;
      if (occ.includes('teacher') || occ.includes('engineer')) return 6;
      if (occ.includes('creative') || occ.includes('designer')) return 5;
    }

    return 6; // Default professional level
  }

  /**
   * Simple career pricing heuristic (until Section 1.4 wires full career intelligence)
   */
  private getCareerPricingTier(occupation?: string, role_level?: string, age?: number): {
    min: number;
    max: number;
    range: string;
    quality: string;
  } | null {
    if (!occupation && !role_level && !age) return null;

    // Default professional tier
    let min = 200;
    let max = 400;
    let range = 'mid';
    let quality = 'professional';

    // Adjust by role level
    if (role_level) {
      const level = role_level.toLowerCase();
      if (level.includes('c-level') || level.includes('executive')) {
        min = 600;
        max = 1200;
        range = 'luxury';
        quality = 'executive';
      } else if (level.includes('director') || level.includes('vp')) {
        min = 400;
        max = 800;
        range = 'high';
        quality = 'senior_professional';
      } else if (level.includes('manager') || level.includes('senior')) {
        min = 300;
        max = 600;
        range = 'mid';
        quality = 'professional';
      }
    }

    // Adjust by occupation
    if (occupation) {
      const occ = occupation.toLowerCase();
      if (occ.includes('lawyer') || occ.includes('banker') || occ.includes('consultant')) {
        min = Math.max(min, 400);
        max = Math.max(max, 800);
        range = max >= 800 ? 'luxury' : 'high';
        quality = 'senior_professional';
      }
    }

    // Adjust by age (older professionals typically invest more)
    if (age && age > 40) {
      min = Math.max(min, 300);
      max = Math.max(max, 600);
    }

    return { min, max, range, quality };
  }
}

// Export singleton instance
export const recommendationContextBuilder = new RecommendationContextBuilder();
