/**
 * Cultural Adaptation Service
 * Handles regional preferences, cultural sensitivity, and culturally-aware styling recommendations
 */

import { cacheService } from './cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  CulturalNuances,
  CulturalContext,
  CulturalColorPreference,
  StyleVariation,
  FormalityExpectation,
  CulturalSeasonalAdaptation,
  ReligiousConsideration,
  BusinessCulture,
  CulturalAdaptationRequest,
  CulturalAdaptationResponse,
  AdaptedRecommendation,
  EnhancedRecommendation,
  CulturalSensitivityLevel
} from '../types/enhanced-knowledge-bank';

export class CulturalAdaptationService {
  private culturalData: any | null = null;
  private regionalPreferences: Map<string, CulturalNuances> = new Map();
  private colorSignificanceDatabase: Map<string, CulturalColorPreference[]> = new Map();
  private businessCultureCache: Map<string, BusinessCulture> = new Map();

  // Section 1.5: Indexes for cultural_regional_nuances.json
  private religiousIndex: Map<string, any> = new Map();
  private detroitRegionsIndex: Map<string, any> = new Map();
  private colorTaboosIndex: Map<string, any> = new Map();

  /**
   * Initialize the service with cultural data
   */
  async initialize(): Promise<void> {
    try {
      // Load cultural data with cache-aside pattern
      this.culturalData = await cacheService.getOrSet(
        'cultural:nuances_data',
        () => enhancedDataLoader.loadCulturalNuances(),
        {
          ttl: 8 * 60 * 60, // 8 hours - cultural data changes infrequently
          tags: ['cultural', 'nuances'],
          compress: true
        }
      );

      // Build specialized caches
      await this.buildRegionalPreferencesCache();
      await this.buildColorSignificanceDatabase();
      await this.buildBusinessCultureCache();

      // Section 1.5: Build indexes from cultural_regional_nuances.json
      await this.buildCulturalNuancesIndexes();
    } catch (error) {
      console.warn('Failed to initialize CulturalAdaptationService:', error);
      // Initialize with default cultural data to prevent service failure
      this.culturalData = this.createDefaultCulturalData();
    }
  }

  /**
   * Section 1.5: Build indexes from cultural_regional_nuances.json
   */
  private async buildCulturalNuancesIndexes(): Promise<void> {
    if (!this.culturalData) return;

    // Build religious dress code index
    if (this.culturalData.religious_dress_codes) {
      Object.entries(this.culturalData.religious_dress_codes).forEach(([religion, data]) => {
        // Normalize religion names
        const normalized = this.normalizeReligiousContext(religion);
        this.religiousIndex.set(normalized, data);
        // Also store with underscores and original
        this.religiousIndex.set(religion.toLowerCase(), data);
        this.religiousIndex.set(religion, data);
      });
    }

    // Build Detroit regional styles index
    if (this.culturalData.detroit_regional_styles) {
      Object.entries(this.culturalData.detroit_regional_styles).forEach(([area, data]) => {
        // Normalize area names: "Detroit", "detroit", "Downtown Detroit" → downtown_detroit
        const variants = this.getDetroitAreaVariants(area);
        variants.forEach(variant => {
          this.detroitRegionsIndex.set(variant, data);
        });
      });
    }

    // Build color taboos index
    if (this.culturalData.cultural_color_taboos) {
      Object.entries(this.culturalData.cultural_color_taboos).forEach(([color, data]) => {
        this.colorTaboosIndex.set(color.toLowerCase(), data);
      });
    }
  }

  /**
   * Normalize religious context input
   */
  private normalizeReligiousContext(input: string): string {
    const normalized = input.toLowerCase().replace(/[_\s-]/g, '');

    // Map common variations
    const mapping: { [key: string]: string } = {
      'catholic': 'catholicchurch',
      'catholicchurch': 'catholicchurch',
      'orthodox': 'orthodoxchurch',
      'orthodoxchurch': 'orthodoxchurch',
      'jewish': 'jewishsynagogue',
      'jewishsynagogue': 'jewishsynagogue',
      'synagogue': 'jewishsynagogue',
      'islam': 'islamicmosque',
      'islamic': 'islamicmosque',
      'islamicmosque': 'islamicmosque',
      'mosque': 'islamicmosque',
      'muslim': 'islamicmosque',
      'hindu': 'hindutemple',
      'hindutemple': 'hindutemple',
      'buddhist': 'buddhisttemple',
      'buddhisttemple': 'buddhisttemple'
    };

    return mapping[normalized] || normalized;
  }

  /**
   * Get all variants of Detroit area names for indexing
   */
  private getDetroitAreaVariants(area: string): string[] {
    const variants: string[] = [];
    const normalized = area.toLowerCase().replace(/[_\s-]/g, '');

    // Add original and normalized
    variants.push(area);
    variants.push(area.toLowerCase());
    variants.push(normalized);

    // Add specific mappings
    const mappings: { [key: string]: string[] } = {
      'Downtown_Detroit': ['downtown', 'detroit', 'downtown detroit', 'downtowndetroit'],
      'Royal_Oak': ['royal oak', 'royaloak', 'ro'],
      'Midtown_Detroit': ['midtown', 'midtowndetroit', 'midtown detroit'],
      'Suburbs_General': ['suburbs', 'suburban', 'novi', 'rochester', 'sterling heights'],
      'Ferndale': ['ferndale'],
      'Ann_Arbor': ['ann arbor', 'annarbor', 'a2'],
      'Hamtramck': ['hamtramck'],
      'Dearborn': ['dearborn']
    };

    if (mappings[area]) {
      variants.push(...mappings[area]);
    }

    return variants;
  }

  /**
   * Adapt recommendations based on cultural context
   */
  async adaptRecommendations(request: CulturalAdaptationRequest): Promise<CulturalAdaptationResponse> {
    const cacheKey = `cultural:adaptation:${JSON.stringify(request)}`;
    
    // Try cache first
    const cached = await cacheService.get<CulturalAdaptationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.culturalData) {
      await this.initialize();
    }

    // Get cultural context for the region
    const culturalNuances = await this.getCulturalNuances(request.specific_region || 'general');
    
    // Adapt each recommendation
    const adaptedRecommendations = await Promise.all(
      request.base_recommendations.map(rec => 
        this.adaptSingleRecommendation(rec, request.cultural_context, culturalNuances, request.sensitivity_level)
      )
    );
    
    // Generate cultural insights
    const culturalInsights = await this.generateCulturalInsights(request.cultural_context, culturalNuances);
    
    // Identify sensitivity warnings
    const sensitivityWarnings = await this.identifySensitivityWarnings(
      request.base_recommendations,
      culturalNuances,
      request.sensitivity_level
    );
    
    // Get local preferences
    const localPreferences = await this.getLocalPreferences(request.specific_region || 'general');

    const response: CulturalAdaptationResponse = {
      adapted_recommendations: adaptedRecommendations,
      cultural_insights: culturalInsights,
      sensitivity_warnings: sensitivityWarnings,
      local_preferences: localPreferences
    };

    // Cache the response
    await cacheService.set(cacheKey, response, {
      ttl: 4 * 60 * 60, // 4 hours
      tags: ['cultural', 'adaptation'],
    });

    return response;
  }

  /**
   * Get cultural nuances for a specific region
   */
  async getCulturalNuances(region: string): Promise<CulturalNuances> {
    const cacheKey = `cultural:nuances:${region}`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        // Section 1.5: Check Detroit regional styles first
        const detroitStyle = this.getDetroitRegionalStyle(region);
        if (detroitStyle) {
          return this.createCulturalNuancesFromDetroitStyle(region, detroitStyle);
        }

        // Check regional preferences cache
        const cachedNuances = this.regionalPreferences.get(region.toLowerCase());
        if (cachedNuances) {
          return cachedNuances;
        }

        // Try to find in cultural data
        const nuances = this.findCulturalNuancesByRegion(region);
        if (nuances) {
          return nuances;
        }

        // Return default cultural nuances
        return this.createDefaultCulturalNuances(region);
      },
      {
        ttl: 6 * 60 * 60, // 6 hours
        tags: ['cultural', 'nuances'],
      }
    );
  }

  /**
   * Section 1.5: Get religious dress code requirements
   */
  async getReligiousDressCode(religiousContext: string): Promise<{
    general_principles: string;
    men_preferred: string[];
    men_avoid: string[];
    men_colors: string[];
    unspoken_rules: string[];
  } | null> {
    if (!this.culturalData) await this.initialize();

    const normalized = this.normalizeReligiousContext(religiousContext);
    const dressCode = this.religiousIndex.get(normalized);

    if (!dressCode) return null;

    return {
      general_principles: dressCode.general_principles || '',
      men_preferred: dressCode.men?.preferred || [],
      men_avoid: dressCode.men?.avoid || [],
      men_colors: dressCode.men?.colors || [],
      unspoken_rules: dressCode.unspoken_rules || []
    };
  }

  /**
   * Section 1.5: Get Detroit regional style data
   */
  private getDetroitRegionalStyle(region: string): any | null {
    const normalized = region.toLowerCase().replace(/[_\s-]/g, '');

    // Try direct lookup
    if (this.detroitRegionsIndex.has(normalized)) {
      return this.detroitRegionsIndex.get(normalized);
    }

    // Try each variant
    for (const [key, value] of this.detroitRegionsIndex.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Section 1.5: Create cultural nuances from Detroit style data
   */
  private createCulturalNuancesFromDetroitStyle(region: string, styleData: any): CulturalNuances {
    return {
      region: region,
      cultural_context: {
        cultural_values: ['local pride', 'community', 'authenticity'],
        communication_style: styleData.dress_code || 'mixed',
        hierarchy_importance: 5,
        tradition_vs_modernity: 5,
        social_proof_importance: 6
      },
      color_preferences: this.getColorSignificanceForRegion(region),
      style_variations: [{
        variation_type: 'fit',
        local_preference: styleData.style_profile || 'Local preference',
        reasoning: styleData.characteristics?.join(', ') || 'Regional style influence',
        adoption_level: 7
      }],
      formality_expectations: [],
      seasonal_adaptations: [],
      religious_considerations: [],
      business_culture: this.getDefaultBusinessCulture(region)
    };
  }

  /**
   * Section 1.5: Get color taboos and cultural significance
   */
  async getColorCulturalTaboos(color: string): Promise<{
    positive_meanings: string[];
    negative_meanings: string[];
    taboos: string[];
    religious_significance: string[];
  } | null> {
    if (!this.culturalData) await this.initialize();

    const normalized = color.toLowerCase();
    const tabooData = this.colorTaboosIndex.get(normalized);

    if (!tabooData) return null;

    return {
      positive_meanings: tabooData.positive_meanings || [],
      negative_meanings: tabooData.negative_meanings || [],
      taboos: tabooData.taboos || [],
      religious_significance: tabooData.religious_significance || []
    };
  }

  /**
   * Analyze color cultural significance
   */
  async analyzeColorCulturalSignificance(colors: string[], region: string): Promise<{
    [color: string]: {
      appropriateness: number;
      cultural_meaning: string[];
      context_considerations: string[];
      recommended_usage: string;
    }
  }> {
    const cacheKey = `cultural:colors:${colors.join(',')}:${region}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const analysis: any = {};
        const colorPreferences = this.colorSignificanceDatabase.get(region.toLowerCase()) || [];
        
        colors.forEach(color => {
          const colorData = colorPreferences.find(pref => 
            pref.color.toLowerCase() === color.toLowerCase()
          );
          
          if (colorData) {
            analysis[color] = {
              appropriateness: colorData.appropriateness_level,
              cultural_meaning: [colorData.cultural_significance],
              context_considerations: colorData.context_limitations,
              recommended_usage: this.generateColorUsageRecommendation(colorData)
            };
          } else {
            analysis[color] = this.getDefaultColorAnalysis(color);
          }
        });
        
        return analysis;
      },
      {
        ttl: 4 * 60 * 60, // 4 hours
        tags: ['cultural', 'colors'],
      }
    );
  }

  /**
   * Get business culture recommendations for industry and region
   */
  async getBusinessCultureRecommendations(industry: string, region: string): Promise<{
    industry_norms: string[];
    networking_expectations: string[];
    hierarchy_considerations: string[];
    international_considerations: string[];
    adaptation_strategies: string[];
  }> {
    const cacheKey = `cultural:business:${industry}:${region}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const businessCulture = this.businessCultureCache.get(region.toLowerCase());
        const culturalNuances = await this.getCulturalNuances(region);
        
        const industryNorms = businessCulture?.industry_norms?.[industry] || this.getDefaultIndustryNorms(industry);
        const networkingExpectations = businessCulture?.networking_expectations || this.getDefaultNetworkingExpectations();
        const hierarchyConsiderations = this.generateHierarchyConsiderations(culturalNuances);
        const internationalConsiderations = businessCulture?.international_considerations || [];
        const adaptationStrategies = this.generateAdaptationStrategies(culturalNuances, industry);
        
        return {
          industry_norms: industryNorms,
          networking_expectations: networkingExpectations,
          hierarchy_considerations: hierarchyConsiderations,
          international_considerations: internationalConsiderations,
          adaptation_strategies: adaptationStrategies
        };
      },
      {
        ttl: 6 * 60 * 60, // 6 hours
        tags: ['cultural', 'business'],
      }
    );
  }

  /**
   * Get religious and cultural considerations for events
   */
  async getReligiousCulturalConsiderations(religion: string, eventType: string): Promise<{
    color_restrictions: string[];
    style_requirements: string[];
    special_considerations: string[];
    recommended_approaches: string[];
  }> {
    const cacheKey = `cultural:religious:${religion}:${eventType}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const religiousConsiderations = this.findReligiousConsiderations(religion);
        
        return {
          color_restrictions: religiousConsiderations?.color_restrictions || [],
          style_requirements: religiousConsiderations?.style_requirements || [],
          special_considerations: religiousConsiderations?.considerations || [],
          recommended_approaches: this.generateReligiousRecommendations(religion, eventType)
        };
      },
      {
        ttl: 8 * 60 * 60, // 8 hours
        tags: ['cultural', 'religious'],
      }
    );
  }

  /**
   * Private helper methods
   */
  private async adaptSingleRecommendation(
    recommendation: EnhancedRecommendation,
    culturalContext: CulturalContext,
    culturalNuances: CulturalNuances,
    sensitivityLevel: CulturalSensitivityLevel
  ): Promise<AdaptedRecommendation> {
    // Create adapted version of the recommendation
    const adaptedRec: EnhancedRecommendation = { ...recommendation };
    let adaptationReasoning = '';
    let culturalSignificance = '';
    let localPreferenceScore = 8; // Default good score

    // Check color cultural significance
    const colorPreference = culturalNuances.color_preferences.find(pref => 
      pref.color.toLowerCase() === recommendation.color.toLowerCase()
    );
    
    if (colorPreference) {
      localPreferenceScore = colorPreference.appropriateness_level;
      culturalSignificance = colorPreference.cultural_significance;
      
      // Adapt if sensitivity level is high and appropriateness is low
      if (sensitivityLevel === 'high' && colorPreference.appropriateness_level < 6) {
        // Find a more appropriate color
        const betterColor = this.findCulturallyAppropriateColor(culturalNuances.color_preferences);
        if (betterColor) {
          adaptedRec.color = betterColor.color;
          adaptationReasoning = `Changed from ${recommendation.color} to ${betterColor.color} for cultural appropriateness`;
          localPreferenceScore = betterColor.appropriateness_level;
        }
      }
    }

    // Check style variations
    const styleVariation = culturalNuances.style_variations.find((variation: any) =>
      variation.variation_type === 'style' || variation.variation_type === 'fit'
    );
    
    if (styleVariation && styleVariation.adoption_level > 7) {
      adaptedRec.style = `${adaptedRec.style} with ${styleVariation.local_preference}`;
      adaptationReasoning += adaptationReasoning ? '; ' : '';
      adaptationReasoning += `Incorporated local style preference: ${styleVariation.reasoning}`;
    }

    // Adjust confidence based on cultural fit
    const culturalFitAdjustment = this.calculateCulturalFitAdjustment(
      recommendation,
      culturalContext,
      culturalNuances
    );
    adaptedRec.confidence = Math.min(100, Math.max(10, adaptedRec.confidence + culturalFitAdjustment));

    return {
      original: recommendation,
      adapted: adaptedRec,
      adaptation_reasoning: adaptationReasoning || 'No significant cultural adaptations needed',
      cultural_significance: culturalSignificance || 'Culturally neutral choice',
      local_preference_score: localPreferenceScore
    };
  }

  private async generateCulturalInsights(
    culturalContext: CulturalContext,
    culturalNuances: CulturalNuances
  ): Promise<string[]> {
    const insights: string[] = [];
    
    // Communication style insights
    if (culturalContext.communication_style === 'indirect') {
      insights.push('Subtle styling choices preferred over bold statements');
    } else if (culturalContext.communication_style === 'direct') {
      insights.push('Clear, confident styling choices appreciated');
    }
    
    // Hierarchy importance insights
    if (culturalContext.hierarchy_importance > 7) {
      insights.push('Status and authority signaling through attire is important');
    }
    
    // Tradition vs modernity insights
    if (culturalContext.tradition_vs_modernity < 4) {
      insights.push('Traditional styling approaches are valued');
    } else if (culturalContext.tradition_vs_modernity > 7) {
      insights.push('Modern and contemporary styling is embraced');
    }
    
    // Social proof importance
    if (culturalContext.social_proof_importance > 7) {
      insights.push('Community acceptance and social validation are crucial');
    }
    
    return insights;
  }

  private async identifySensitivityWarnings(
    recommendations: EnhancedRecommendation[],
    culturalNuances: CulturalNuances,
    sensitivityLevel: CulturalSensitivityLevel
  ): Promise<string[]> {
    const warnings: string[] = [];
    
    // Check each recommendation for potential issues
    recommendations.forEach(rec => {
      const colorPref = culturalNuances.color_preferences.find(pref => 
        pref.color.toLowerCase() === rec.color.toLowerCase()
      );
      
      if (colorPref && colorPref.appropriateness_level < 5) {
        warnings.push(`${rec.color} may have negative cultural associations: ${colorPref.cultural_significance}`);
      }
      
      if (colorPref && colorPref.context_limitations.length > 0) {
        warnings.push(`${rec.color} has context limitations: ${colorPref.context_limitations.join(', ')}`);
      }
    });
    
    // Check formality expectations
    const formalityIssues = culturalNuances.formality_expectations.filter(exp => 
      exp.flexibility < 5 && exp.expected_level > 7
    );
    
    if (formalityIssues.length > 0) {
      warnings.push('High formality expectations with limited flexibility in this region');
    }
    
    return warnings;
  }

  private async getLocalPreferences(region: string): Promise<string[]> {
    const preferences: string[] = [];
    const culturalNuances = await this.getCulturalNuances(region);
    
    // Extract preferences from style variations
    culturalNuances.style_variations.forEach(variation => {
      if (variation.adoption_level > 6) {
        preferences.push(`${variation.variation_type}: ${variation.local_preference} (${variation.reasoning})`);
      }
    });
    
    // Add seasonal preferences
    culturalNuances.seasonal_adaptations.forEach(adaptation => {
      if (adaptation.cultural_adjustments.length > 0) {
        preferences.push(`${adaptation.season}: ${adaptation.cultural_adjustments.join(', ')}`);
      }
    });
    
    return preferences;
  }

  private async buildRegionalPreferencesCache(): Promise<void> {
    // Build cache of regional preferences for common regions
    const regions = ['north_america', 'europe', 'asia', 'middle_east', 'africa', 'latin_america'];
    
    regions.forEach(region => {
      this.regionalPreferences.set(region, this.createDefaultCulturalNuances(region));
    });
  }

  private async buildColorSignificanceDatabase(): Promise<void> {
    // Build database of color cultural significance by region
    const regions = ['north_america', 'europe', 'asia', 'middle_east'];
    
    regions.forEach(region => {
      this.colorSignificanceDatabase.set(region, this.getColorSignificanceForRegion(region));
    });
  }

  private async buildBusinessCultureCache(): Promise<void> {
    // Build cache of business culture data by region
    const regions = ['north_america', 'europe', 'asia'];
    
    regions.forEach(region => {
      this.businessCultureCache.set(region, this.getDefaultBusinessCulture(region));
    });
  }

  private createDefaultCulturalData(): any {
    return {
      regions: {
        general: {
          cultural_context: {
            cultural_values: ['respect', 'professionalism'],
            communication_style: 'mixed',
            hierarchy_importance: 5,
            tradition_vs_modernity: 5,
            social_proof_importance: 5
          }
        }
      }
    };
  }

  private findCulturalNuancesByRegion(region: string): CulturalNuances | null {
    // Section 1.5: Search Detroit regional styles
    const detroitStyle = this.getDetroitRegionalStyle(region);
    if (detroitStyle) {
      return this.createCulturalNuancesFromDetroitStyle(region, detroitStyle);
    }

    // Try broader region search in cultural data
    if (this.culturalData?.regions && this.culturalData.regions[region]) {
      return this.culturalData.regions[region];
    }

    return null;
  }

  private createDefaultCulturalNuances(region: string): CulturalNuances {
    return {
      region: region,
      cultural_context: {
        cultural_values: ['professionalism', 'respect', 'quality'],
        communication_style: 'mixed',
        hierarchy_importance: 5,
        tradition_vs_modernity: 5,
        social_proof_importance: 5
      },
      color_preferences: this.getColorSignificanceForRegion(region),
      style_variations: [
        {
          variation_type: 'fit',
          local_preference: 'Modern tailored fit',
          reasoning: 'Contemporary professional standards',
          adoption_level: 7
        }
      ],
      formality_expectations: [
        {
          context: 'business',
          expected_level: 7,
          flexibility: 6,
          consequences_of_deviation: 'May impact professional credibility'
        }
      ],
      seasonal_adaptations: [
        {
          season: 'summer',
          cultural_adjustments: ['Lighter colors acceptable'],
          color_shifts: ['Lighter blues', 'Light grays'],
          fabric_preferences: ['Breathable materials']
        }
      ],
      religious_considerations: [],
      business_culture: this.getDefaultBusinessCulture(region)
    };
  }

  private getColorSignificanceForRegion(region: string): CulturalColorPreference[] {
    const baseColors: CulturalColorPreference[] = [];

    // Section 1.5: Build color preferences from color taboos data
    const commonColors = ['black', 'white', 'red', 'navy', 'charcoal', 'grey'];

    commonColors.forEach(color => {
      const tabooData = this.colorTaboosIndex.get(color);

      if (tabooData) {
        // Calculate appropriateness based on taboos
        const hasTaboos = tabooData.taboos && tabooData.taboos.length > 0;
        const appropriateness = hasTaboos ? 6 : 9;

        baseColors.push({
          color: color.charAt(0).toUpperCase() + color.slice(1),
          cultural_significance: tabooData.positive_meanings?.[0] || 'Professional color',
          appropriateness_level: appropriateness,
          context_limitations: tabooData.taboos || [],
          positive_associations: tabooData.positive_meanings || [],
          negative_associations: tabooData.negative_meanings || []
        });
      } else {
        // Fallback for colors not in taboo database
        baseColors.push({
          color: color.charAt(0).toUpperCase() + color.slice(1),
          cultural_significance: 'Professional color',
          appropriateness_level: 9,
          context_limitations: [],
          positive_associations: ['Professional', 'Versatile'],
          negative_associations: []
        });
      }
    });

    return baseColors;
  }

  private getDefaultBusinessCulture(region: string): BusinessCulture {
    return {
      industry_norms: {
        'finance': ['Conservative colors', 'Traditional styling', 'High formality'],
        'technology': ['Business casual acceptable', 'Modern fits', 'Flexible formality'],
        'consulting': ['Client-appropriate styling', 'Versatile wardrobe', 'Medium-high formality']
      },
      networking_expectations: [
        'Professional appearance essential',
        'Quality over quantity',
        'Appropriate for venue and occasion'
      ],
      hierarchy_signaling: [
        'Quality of materials indicates status',
        'Attention to detail shows professionalism',
        'Consistency builds trust'
      ],
      international_considerations: [
        'Research local customs for international business',
        'When in doubt, err on the side of formality',
        'Respect religious and cultural sensitivities'
      ]
    };
  }

  private findCulturallyAppropriateColor(colorPreferences: CulturalColorPreference[]): CulturalColorPreference | null {
    // Find the most appropriate color (highest appropriateness level)
    return colorPreferences.reduce((best, current) => {
      return current.appropriateness_level > (best?.appropriateness_level || 0) ? current : best;
    }, null as CulturalColorPreference | null);
  }

  private calculateCulturalFitAdjustment(
    recommendation: EnhancedRecommendation,
    culturalContext: CulturalContext,
    culturalNuances: CulturalNuances
  ): number {
    let adjustment = 0;
    
    // Check color appropriateness
    const colorPref = culturalNuances.color_preferences.find(pref => 
      pref.color.toLowerCase() === recommendation.color.toLowerCase()
    );
    
    if (colorPref) {
      if (colorPref.appropriateness_level > 8) adjustment += 5;
      else if (colorPref.appropriateness_level < 5) adjustment -= 10;
    }
    
    // Check cultural values alignment
    if (culturalContext.hierarchy_importance > 7 && 
        recommendation.item_type.toLowerCase().includes('executive')) {
      adjustment += 5;
    }
    
    return adjustment;
  }

  private generateColorUsageRecommendation(colorData: CulturalColorPreference): string {
    if (colorData.appropriateness_level > 8) {
      return 'Highly recommended for professional use';
    } else if (colorData.appropriateness_level > 6) {
      return 'Good choice with minor considerations';
    } else if (colorData.appropriateness_level > 4) {
      return `Use with caution: ${colorData.context_limitations.join(', ')}`;
    } else {
      return 'Consider alternative colors for this context';
    }
  }

  private getDefaultColorAnalysis(color: string): any {
    return {
      appropriateness: 7,
      cultural_meaning: ['Generally acceptable professional color'],
      context_considerations: ['Context-dependent appropriateness'],
      recommended_usage: 'Professional contexts generally appropriate'
    };
  }

  private getDefaultIndustryNorms(industry: string): string[] {
    const normsMap: { [key: string]: string[] } = {
      'finance': ['Conservative approach', 'High formality', 'Traditional colors'],
      'technology': ['Business casual acceptable', 'Modern styling', 'Flexible approach'],
      'consulting': ['Client-appropriate styling', 'Professional versatility'],
      'legal': ['Very conservative', 'Traditional styling', 'Highest formality']
    };

    return normsMap[industry.toLowerCase()] || ['Professional standards', 'Context-appropriate styling'];
  }

  private getDefaultNetworkingExpectations(): string[] {
    return [
      'Professional appearance essential',
      'Quality materials and construction',
      'Appropriate for venue and context',
      'Consistent personal branding'
    ];
  }

  private generateHierarchyConsiderations(culturalNuances: CulturalNuances): string[] {
    const considerations: string[] = [];
    
    if (culturalNuances.cultural_context.hierarchy_importance > 7) {
      considerations.push('Status signaling through attire is important');
      considerations.push('Quality and luxury details matter');
    } else {
      considerations.push('Egalitarian approach to professional dress');
      considerations.push('Competence over status signaling');
    }
    
    return considerations;
  }

  private generateAdaptationStrategies(culturalNuances: CulturalNuances, industry: string): string[] {
    const strategies: string[] = [];
    
    // Based on communication style
    if (culturalNuances.cultural_context.communication_style === 'indirect') {
      strategies.push('Subtle, refined styling choices');
      strategies.push('Avoid overly bold or attention-grabbing elements');
    } else {
      strategies.push('Clear, confident styling decisions');
      strategies.push('Well-defined personal style acceptable');
    }
    
    // Based on tradition vs modernity
    if (culturalNuances.cultural_context.tradition_vs_modernity < 5) {
      strategies.push('Honor traditional business dress codes');
      strategies.push('Classic, time-tested styling approaches');
    } else {
      strategies.push('Contemporary styling appropriate');
      strategies.push('Modern interpretations of classic pieces');
    }
    
    return strategies;
  }

  private findReligiousConsiderations(religion: string): ReligiousConsideration | null {
    // In a real implementation, this would search religious considerations database
    return null;
  }

  private generateReligiousRecommendations(religion: string, eventType: string): string[] {
    return [
      'Research specific religious customs',
      'Consult with event organizers when uncertain',
      'Err on the side of modesty and respect',
      'Consider seasonal and regional variations'
    ];
  }

  /**
   * Clear cultural adaptation caches
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateByTags(['cultural']);
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    data_loaded: boolean;
    cache_status: string;
    last_update: string;
  }> {
    const dataLoaded = this.culturalData !== null;
    const cacheStats = await cacheService.getStats();
    
    return {
      status: dataLoaded ? 'healthy' : 'degraded',
      data_loaded: dataLoaded,
      cache_status: `${(cacheStats as any)?.keys_count || 0} keys cached`,
      last_update: new Date().toISOString()
    };
  }
}

export const culturalAdaptationService = new CulturalAdaptationService();