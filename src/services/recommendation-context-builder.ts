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
import { fabricPerformanceService } from './fabric-performance-service';
import { productTagService } from './product-tag-service';
import { promAuraService } from './prom-aura-service';
import { weddingForecastService } from './wedding-forecast-service';
import * as fs from 'fs';
import * as path from 'path';

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

  // Section 2.3: Product tag filtering (from occasion + venue + season)
  product_tags: {
    all_tags: string[];                      // All relevant product tags
    prioritized_tags: Array<{                // Tags with priority boost
      tag: string;
      boost: number;
    }>;
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
  private kctPriceTiers: any = null;

  constructor() {
    this.loadKctPriceTiers();
  }

  /**
   * Section 2.2: Load KCT actual price tiers from JSON
   */
  private loadKctPriceTiers(): void {
    try {
      const tiersPath = path.join(__dirname, '../data/intelligence/kct-price-tiers.json');
      const raw = fs.readFileSync(tiersPath, 'utf8');
      this.kctPriceTiers = JSON.parse(raw);
      logger.info('📊 KCT price tiers loaded successfully');
    } catch (error) {
      logger.warn('KCT price tiers not loaded, using career-based fallbacks', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

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

      // Step 6: Build product tag filters (Section 2.3: occasion + venue + season)
      const productTags = this.buildProductTagFilters(request, reasoning, signalsUsed);

      // Step 6.5: Prom Aura Enhancement (Section 3.0: only for prom occasions)
      if (request.occasion?.toLowerCase() === 'prom') {
        this.enhanceWithPromAura(request, colorFilters, productTags, reasoning, signalsUsed);
      }

      // Step 7: Calculate max recommendations (decision fatigue logic)
      const maxRecommendations = this.calculateMaxRecommendations(request, reasoning);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(signalsUsed);

      const context: RecommendationContext = {
        formality_range: formalityRange,
        color_filters: colorFilters,
        fabric_preferences: fabricPreferences,
        price_tier: priceTier,
        fit_guidance: fitGuidance,
        product_tags: productTags,
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

    // Adjust for career level (Section 1.4: now uses real career intelligence)
    if (request.role_level || request.occupation) {
      const careerFormality = await this.getCareerFormality(request.occupation, request.role_level);
      if (careerFormality > 0) {
        minFormality = Math.max(minFormality, careerFormality - 1);
        reasoning.push(`${request.occupation || 'Professional'} role suggests formality level ${careerFormality}/10`);
        signalsUsed.push('career_intelligence');
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

    // Apply cultural filters (Section 1.5: now uses real cultural data)
    if (request.cultural_region || request.religious_context) {
      try {
        // Handle religious dress codes
        if (request.religious_context) {
          const religiousDressCode = await culturalAdaptationService.getReligiousDressCode(request.religious_context);
          if (religiousDressCode) {
            // Extract preferred colors
            if (religiousDressCode.men_colors && religiousDressCode.men_colors.length > 0) {
              preferred.push(...religiousDressCode.men_colors.map(c => c.toLowerCase()));
              reasoning.push(`${request.religious_context} dress code: ${religiousDressCode.men_colors.join(', ')}`);
              signalsUsed.push('religious_dress_code');
            }

            // Note conservative requirements
            if (religiousDressCode.general_principles) {
              reasoning.push(religiousDressCode.general_principles);
            }
          }
        }

        // Handle regional cultural preferences
        const culturalData = await culturalAdaptationService.getCulturalNuances(
          request.cultural_region || 'general'
        );

        // Extract color preferences from cultural data
        if (culturalData.color_preferences && culturalData.color_preferences.length > 0) {
          // Colors with low appropriateness are taboo
          const taboos = culturalData.color_preferences
            .filter(cp => cp.appropriateness_level < 4)
            .map(cp => cp.color.toLowerCase());
          if (taboos.length > 0) {
            avoid.push(...taboos);
            reasoning.push(`Cultural context: avoiding ${taboos.join(', ')}`);
            signalsUsed.push('cultural_color_taboos');
          }

          // Colors with high appropriateness are preferred
          const culturallyPreferred = culturalData.color_preferences
            .filter(cp => cp.appropriateness_level > 7)
            .map(cp => cp.color.toLowerCase());
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

    // Section 3.3: Apply monthly color palette
    const monthlyColors = seasonalRulesEngine.getMonthlyColorPalette();
    if (monthlyColors.length > 0) {
      preferred.push(...monthlyColors);
      signalsUsed.push('monthly_calendar_intelligence');

      // Add buyer mindset reasoning
      const buyerMindset = seasonalRulesEngine.getBuyerMindset();
      if (buyerMindset) {
        reasoning.push(`Current buyer mindset: ${buyerMindset}`);
      }
    }

    // Section 3.1: Apply wedding 2026 color forecast (only for wedding occasions)
    if (request.occasion?.toLowerCase() === 'wedding') {
      const topWeddingColors = weddingForecastService.getTopWeddingColors(5);
      if (topWeddingColors.length > 0) {
        // Add KCT suit colors from top wedding trends
        for (const weddingColor of topWeddingColors) {
          preferred.push(...weddingColor.kct_suit_colors);

          // Add reasoning for top 3
          if (weddingColor.rank <= 3) {
            const marketShare = weddingColor.market_share_pct.split('-')[0]; // Get lower bound
            reasoning.push(`2026 wedding trend: ${weddingColor.color.replace(/_/g, ' ')} (${marketShare}% of weddings) — ${weddingColor.trend_driver}`);
          }
        }

        signalsUsed.push('wedding_2026_forecast');

        logger.info('💍 Wedding 2026 forecast applied', {
          colors_added: topWeddingColors.length,
          top_color: topWeddingColors[0].color
        });
      }
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

    // Fabric performance data integration (Section 1.3)
    try {
      const fabricContext = await fabricPerformanceService.getFabricRecommendationsFor({
        occasion: request.occasion as any,
        climate: request.season === 'summer' ? 'hot' : request.season === 'winter' ? 'cold' : 'mild',
        photography: request.use_case === 'photography' || request.venue_type?.includes('wedding'),
      });

      if (fabricContext.recommended.length > 0) {
        // Add top 3 fabrics from performance data
        fabricContext.recommended.slice(0, 3).forEach(fabric => {
          recommended.push(fabric.fabric_type.toLowerCase().replace(/\s+/g, '_'));
        });

        // Add reasoning from performance analysis
        fabricContext.reasoning.forEach(r => reasoning.push(r));
        signalsUsed.push('fabric_performance_analysis');
      }
    } catch (error) {
      logger.warn('Fabric performance service unavailable, using defaults');
    }

    // Section 3.3: Add monthly fabric recommendations
    const monthlyFabrics = seasonalRulesEngine.getMonthlyFabrics();
    if (monthlyFabrics.length > 0) {
      recommended.push(...monthlyFabrics);
      // Signal already added in buildColorFilters() to avoid duplication
    }

    return {
      recommended: [...new Set(recommended)],
      avoid: [...new Set(avoid)],
      performance_priorities: [...new Set(performancePriorities)],
    };
  }

  /**
   * Calculate price tier from career stage + occasion
   * Section 2.2: Now uses KCT actual price tiers instead of career-based guesses
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

    // Section 2.2: Use KCT actual price tiers if available
    if (this.kctPriceTiers?.price_tiers) {
      // Step 1: Determine which KCT tier to recommend (entry/mid/premium/luxury)
      let kctTierName = 'mid'; // Default to mid tier

      // Get career-based tier suggestion
      if (request.age || request.role_level || request.occupation) {
        const careerTier = await this.getCareerPricingTier(request.occupation, request.role_level, request.age);
        if (careerTier) {
          // Map career tier (entry/mid/high/luxury) to KCT tier (entry/mid/premium/luxury)
          kctTierName = careerTier.range === 'high' ? 'premium' : careerTier.range;
          qualityLevel = careerTier.quality;
          signalsUsed.push('career_intelligence');
        }
      }

      // Adjust tier for occasion importance (move up tiers for important events)
      if (request.occasion) {
        const occasionMultiplier = this.getOccasionImportanceMultiplier(request.occasion);
        if (occasionMultiplier >= 1.5) {
          // Major occasion (wedding, gala): move up one tier
          if (kctTierName === 'entry') kctTierName = 'mid';
          else if (kctTierName === 'mid') kctTierName = 'premium';
          else if (kctTierName === 'premium') kctTierName = 'luxury';

          reasoning.push(`${this.capitalizeOccasion(request.occasion)} is a significant occasion — recommending ${kctTierName} tier`);
        }
      }

      // Step 2: Get KCT actual price ranges for this tier
      const kctTier = this.kctPriceTiers.price_tiers[kctTierName];
      if (kctTier) {
        range = kctTierName;
        minInvestment = kctTier.suit_range[0];
        maxInvestment = kctTier.suit_range[1];

        reasoning.push(`KCT ${kctTierName} tier: suits $${minInvestment}-$${maxInvestment}, shirts $${kctTier.shirt_range[0]}-$${kctTier.shirt_range[1]}, ties $${kctTier.tie_range[0]}-$${kctTier.tie_range[1]}`);

        // Add accessory rule note
        const maxAccessoryCost = Math.floor(maxInvestment * kctTier.max_accessory_pct);
        reasoning.push(`Accessory limit: $${maxAccessoryCost} (${Math.floor(kctTier.max_accessory_pct * 100)}% of suit cost)`);

        // Section 3.4: Handle edge case where accessory budget is below minimum shoe price
        const minShoePrice = kctTier.shoes_range?.[0] || 49;
        if (maxAccessoryCost < minShoePrice) {
          reasoning.push(`Note: Entry-tier accessory budget ($${maxAccessoryCost}) is below minimum shoe price ($${minShoePrice}) — recommending entry-tier shoes regardless`);
        }

        signalsUsed.push('kct_price_tiers');
      }
    } else {
      // Fallback to career-based pricing if KCT tiers not loaded
      if (request.age || request.role_level || request.occupation) {
        const careerTier = await this.getCareerPricingTier(request.occupation, request.role_level, request.age);
        if (careerTier) {
          minInvestment = careerTier.min;
          maxInvestment = careerTier.max;
          range = careerTier.range;
          qualityLevel = careerTier.quality;
          reasoning.push(`Professional level suggests ${range} tier: $${minInvestment}-$${maxInvestment}`);
          signalsUsed.push('career_intelligence');
        }
      }

      // Adjust for occasion importance (legacy behavior)
      if (request.occasion) {
        const occasionMultiplier = this.getOccasionImportanceMultiplier(request.occasion);
        if (occasionMultiplier > 1) {
          minInvestment = Math.floor(minInvestment * occasionMultiplier);
          maxInvestment = Math.floor(maxInvestment * occasionMultiplier);
          reasoning.push(`${this.capitalizeOccasion(request.occasion)} is a significant occasion — worth investing in quality`);
        }
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
   * Section 2.3: Build product tag filters from occasion + venue + season + style
   */
  private buildProductTagFilters(
    request: RecommendationRequest,
    reasoning: string[],
    signalsUsed: string[]
  ): RecommendationContext['product_tags'] {

    // Determine style preference from fit guidance or occasion
    let style: string | undefined;
    if (request.occasion) {
      // Map occasions to likely styles
      const occasionToStyle: { [key: string]: string } = {
        'prom': 'bold',
        'gala': 'luxury',
        'wedding': 'classic',
        'formal': 'classic',
        'interview': 'classic',
        'business': 'modern'
      };
      const normalizedOccasion = request.occasion.toLowerCase();
      style = occasionToStyle[normalizedOccasion];
    }

    // Use productTagService to combine all tag sources
    const tagFilters = productTagService.combineTagFilters(
      request.occasion,
      request.venue_type,
      request.season,
      style
    );

    // Add reasoning from tag service
    if (tagFilters.reasoning.length > 0) {
      reasoning.push(...tagFilters.reasoning);
      signalsUsed.push('product_tag_filtering');
    }

    return {
      all_tags: tagFilters.all_tags,
      prioritized_tags: tagFilters.prioritized_tags
    };
  }

  /**
   * Section 3.0: Enhance with prom aura system (only for prom occasions)
   */
  private enhanceWithPromAura(
    request: RecommendationRequest,
    colorFilters: RecommendationContext['color_filters'],
    productTags: RecommendationContext['product_tags'],
    reasoning: string[],
    signalsUsed: string[]
  ): void {
    // Try to detect aura based on request signals
    const auraResult = promAuraService.detectAura({
      style_preference: request.use_case, // e.g., "bold", "classic"
      color_preference: request.suit_color || request.tie_color,
      personality: undefined // Could be added to request interface in future
    });

    if (auraResult) {
      // Boost matching product tags
      const auraTags = auraResult.aura_details.product_tags;
      for (const tag of auraTags) {
        // Add to product tags if not already there
        if (!productTags.all_tags.includes(tag)) {
          productTags.all_tags.push(tag);
        }
        // Boost priority
        productTags.prioritized_tags.push({ tag, boost: 2.5 }); // Higher boost for aura match
      }

      // Add aura colors to preferred colors
      const auraColors = auraResult.aura_details.recommended_colors;
      for (const color of auraColors) {
        if (!colorFilters.preferred.includes(color)) {
          colorFilters.preferred.push(color);
        }
      }

      // Add reasoning and signal
      reasoning.push(`Prom aura: ${auraResult.aura_details.display_name} ${auraResult.aura_details.emoji} — ${auraResult.aura_details.styling_notes}`);
      signalsUsed.push('prom_aura_system');

      logger.info('🔥 Prom aura detected', {
        aura: auraResult.aura_name,
        confidence: auraResult.confidence,
        tags_added: auraTags.length,
        colors_added: auraColors.length
      });
    }
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
      product_tags: {
        all_tags: [],
        prioritized_tags: [],
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
  private async getCareerFormality(occupation?: string, role_level?: string): Promise<number> {
    if (!occupation && !role_level) return 0;

    // Section 1.4: Try to use real career intelligence data first
    if (role_level) {
      try {
        const careerData = await careerIntelligenceService.getCareerStageData(role_level);
        if (careerData && careerData.formality_score) {
          return careerData.formality_score;
        }
      } catch (error) {
        logger.warn('Career intelligence service unavailable, using fallback');
      }
    }

    // Fallback to heuristics if service unavailable
    if (role_level) {
      const level = role_level.toLowerCase();
      if (level.includes('c-level') || level.includes('executive') || level.includes('c-suite')) return 9;
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
   * Career pricing tier (Section 1.4: now uses real career intelligence data)
   */
  private async getCareerPricingTier(occupation?: string, role_level?: string, age?: number): Promise<{
    min: number;
    max: number;
    range: string;
    quality: string;
  } | null> {
    if (!occupation && !role_level && !age) return null;

    // Default professional tier
    let min = 200;
    let max = 400;
    let range = 'mid';
    let quality = 'professional';

    // Section 1.4: Try to use real career intelligence data
    if (role_level) {
      try {
        const careerData = await careerIntelligenceService.getCareerStageData(role_level);
        if (careerData && careerData.investment) {
          // Suit is typically 30-40% of total wardrobe investment
          const suitBudget = careerData.investment * 0.35;
          min = Math.round(suitBudget * 0.6); // 60% of suit budget
          max = Math.round(suitBudget * 1.4); // 140% of suit budget
          quality = careerData.quality_level;

          // Determine range tier based on investment
          if (suitBudget >= 2000) {
            range = 'luxury';
          } else if (suitBudget >= 1000) {
            range = 'high';
          } else if (suitBudget >= 500) {
            range = 'mid';
          } else {
            range = 'entry';
          }

          return { min, max, range, quality };
        }
      } catch (error) {
        logger.warn('Career intelligence service unavailable for pricing, using fallback');
      }
    }

    // Age-based data if available
    if (age) {
      try {
        const ageData = await careerIntelligenceService.getAgeCareerData(age);
        if (ageData && ageData.typical_stage) {
          // Try to get stage data from age
          const stageData = await careerIntelligenceService.getCareerStageData(ageData.typical_stage);
          if (stageData && stageData.investment) {
            const suitBudget = stageData.investment * 0.35;
            min = Math.max(min, Math.round(suitBudget * 0.6));
            max = Math.max(max, Math.round(suitBudget * 1.4));
            quality = stageData.quality_level;
          }
        }
      } catch (error) {
        logger.warn('Age-based career data unavailable');
      }
    }

    // Fallback to heuristics if service unavailable
    if (role_level) {
      const level = role_level.toLowerCase();
      if (level.includes('c-level') || level.includes('executive') || level.includes('c-suite')) {
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
