/**
 * Venue Intelligence Service
 * Handles location-specific styling recommendations, lighting analysis, and venue-appropriate formatting
 */

import { cacheService } from './cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  VenueIntelligence,
  LightingConditions,
  EnhancedColorRecommendations,
  EnhancedFabricRecommendations,
  UnspokenRule,
  VenueSeasonalVariation,
  PhotographyConsiderations,
  VenueOptimizationRequest,
  VenueOptimizationResponse
} from '../types/enhanced-knowledge-bank';

export class VenueIntelligenceService {
  private venueData: any | null = null;
  private venueMicrodata: any | null = null;
  private venueIndex: Map<string, any> = new Map();
  private lightingDatabase: Map<string, LightingConditions> = new Map();
  private venueRulesCache: Map<string, UnspokenRule[]> = new Map();

  /**
   * Initialize the service with venue intelligence data
   */
  async initialize(): Promise<void> {
    try {
      // Load venue intelligence data with cache-aside pattern
      this.venueData = await cacheService.getOrSet(
        'venue:intelligence_data',
        () => enhancedDataLoader.loadVenueIntelligence(),
        {
          ttl: 6 * 60 * 60, // 6 hours
          tags: ['venue', 'intelligence'],
          compress: true
        }
      );

      // Load venue microdata analysis
      this.venueMicrodata = await cacheService.getOrSet(
        'venue:microdata_analysis',
        async () => {
          const fs = require('fs').promises;
          const path = require('path');
          const filePath = path.join(__dirname, '../data/intelligence/venue_microdata_analysis.json');
          const data = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(data);
        },
        {
          ttl: 6 * 60 * 60, // 6 hours
          tags: ['venue', 'microdata'],
          compress: true
        }
      );

      // Build specialized caches
      await this.buildVenueIndex();
      await this.buildLightingDatabase();
      await this.buildVenueRulesCache();
    } catch (error) {
      console.warn('Failed to initialize VenueIntelligenceService:', error);
      // Initialize with default venue data to prevent service failure
      this.venueData = this.createDefaultVenueData();
    }
  }

  /**
   * Optimize styling recommendations for specific venue conditions
   */
  async optimizeForVenue(request: VenueOptimizationRequest): Promise<VenueOptimizationResponse> {
    const cacheKey = `venue:optimization:${JSON.stringify(request)}`;
    
    // Try cache first
    const cached = await cacheService.get<VenueOptimizationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.venueData) {
      await this.initialize();
    }

    // Get venue intelligence
    const venueIntelligence = await this.getVenueIntelligence(request.venue_type);
    
    // Analyze lighting conditions
    const lightingAnalysis = await this.analyzeLightingConditions(request.lighting_conditions);
    
    // Generate color recommendations
    const colorRecommendations = await this.generateColorRecommendations(
      venueIntelligence,
      lightingAnalysis,
      request.season
    );
    
    // Generate fabric recommendations
    const fabricRecommendations = await this.generateFabricRecommendations(
      venueIntelligence,
      request.season,
      request.time_of_day
    );
    
    // Create style adjustments
    const styleAdjustments = await this.generateStyleAdjustments(
      request,
      venueIntelligence
    );
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(venueIntelligence, request);
    
    // Identify potential issues
    const potentialIssues = await this.identifyPotentialIssues(request, venueIntelligence);
    
    // Generate photography tips
    const photographyTips = await this.generatePhotographyTips(
      venueIntelligence,
      lightingAnalysis
    );

    const response: VenueOptimizationResponse = {
      color_recommendations: colorRecommendations,
      fabric_recommendations: fabricRecommendations,
      style_adjustments: styleAdjustments,
      confidence_score: confidenceScore,
      potential_issues: potentialIssues,
      photography_tips: photographyTips
    };

    // Cache the response
    await cacheService.set(cacheKey, response, {
      ttl: 2 * 60 * 60, // 2 hours
      tags: ['venue', 'optimization'],
    });

    return response;
  }

  /**
   * Get venue-specific intelligence data
   */
  async getVenueIntelligence(venueType: string): Promise<VenueIntelligence> {
    const cacheKey = `venue:intelligence:${venueType}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        if (!this.venueData) {
          await this.initialize();
        }

        // Try to find specific venue data
        const venueInfo = this.findVenueByType(venueType);
        
        if (!venueInfo) {
          return this.createDefaultVenueIntelligence(venueType);
        }

        return this.transformToVenueIntelligence(venueInfo, venueType);
      },
      {
        ttl: 4 * 60 * 60, // 4 hours
        tags: ['venue', 'intelligence'],
      }
    );
  }

  /**
   * Analyze lighting conditions and their impact on color appearance
   */
  async analyzeLightingConditions(lightingTypes: string[]): Promise<{
    primary_lighting: string;
    color_accuracy_impact: number;
    recommendations: string[];
    undertone_shifts: string[];
  }> {
    const cacheKey = `venue:lighting:${lightingTypes.join(',')}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const primaryLighting = lightingTypes[0] || 'mixed';
        let colorAccuracyImpact = 8; // Default good accuracy
        const recommendations: string[] = [];
        const undertoneShifts: string[] = [];

        // Analyze each lighting type
        lightingTypes.forEach(lighting => {
          const lightingLower = lighting.toLowerCase();
          
          if (lightingLower.includes('fluorescent')) {
            colorAccuracyImpact = Math.min(colorAccuracyImpact, 6);
            recommendations.push('Avoid warm undertones under fluorescent lighting');
            undertoneShifts.push('Warm tones appear cooler');
          } else if (lightingLower.includes('incandescent')) {
            colorAccuracyImpact = Math.min(colorAccuracyImpact, 7);
            recommendations.push('Cool colors may appear muted');
            undertoneShifts.push('Cool tones appear warmer');
          } else if (lightingLower.includes('natural')) {
            colorAccuracyImpact = 10;
            recommendations.push('Optimal conditions for all colors');
          } else if (lightingLower.includes('led')) {
            colorAccuracyImpact = Math.min(colorAccuracyImpact, 9);
            recommendations.push('Modern LED provides good color accuracy');
          }
        });

        return {
          primary_lighting: primaryLighting,
          color_accuracy_impact: colorAccuracyImpact,
          recommendations,
          undertone_shifts: undertoneShifts
        };
      },
      {
        ttl: 1 * 60 * 60, // 1 hour
        tags: ['venue', 'lighting'],
      }
    );
  }

  /**
   * Get dress code analysis for venue
   */
  async getDressCodeAnalysis(venueType: string): Promise<{
    strictness_level: number;
    required_elements: string[];
    forbidden_elements: string[];
    flexibility_factors: string[];
    unspoken_rules: UnspokenRule[];
  }> {
    const cacheKey = `venue:dress_code:${venueType}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const venueIntelligence = await this.getVenueIntelligence(venueType);
        const unspokenRules = this.venueRulesCache.get(venueType) || [];

        // Determine strictness based on venue type
        let strictnessLevel = 5; // Default medium
        const requiredElements: string[] = [];
        const forbiddenElements: string[] = [];
        const flexibilityFactors: string[] = [];

        const venueTypeLower = venueType.toLowerCase();
        
        if (venueTypeLower.includes('black_tie') || venueTypeLower.includes('gala')) {
          strictnessLevel = 10;
          requiredElements.push('Black tuxedo', 'Bow tie', 'Patent leather shoes');
          forbiddenElements.push('Business suits', 'Colored shirts');
        } else if (venueTypeLower.includes('wedding')) {
          strictnessLevel = 8;
          requiredElements.push('Formal suit', 'Dress shirt', 'Tie');
          forbiddenElements.push('White tie', 'Overly casual elements');
          flexibilityFactors.push('Season affects formality', 'Outdoor venues more flexible');
        } else if (venueTypeLower.includes('business') || venueTypeLower.includes('corporate')) {
          strictnessLevel = 7;
          requiredElements.push('Business suit', 'Dress shirt', 'Professional tie');
          forbiddenElements.push('Casual elements', 'Novelty items');
        } else if (venueTypeLower.includes('cocktail')) {
          strictnessLevel = 6;
          requiredElements.push('Suit or blazer', 'Dress shirt');
          flexibilityFactors.push('Evening events more formal', 'Venue ambiance matters');
        }

        return {
          strictness_level: strictnessLevel,
          required_elements: requiredElements,
          forbidden_elements: forbiddenElements,
          flexibility_factors: flexibilityFactors,
          unspoken_rules: unspokenRules
        };
      },
      {
        ttl: 4 * 60 * 60, // 4 hours
        tags: ['venue', 'dress_code'],
      }
    );
  }

  /**
   * Get seasonal venue recommendations
   */
  async getSeasonalVenueRecommendations(venueType: string, season: string): Promise<{
    color_adjustments: string[];
    fabric_considerations: string[];
    style_modifications: string[];
    special_requirements: string[];
  }> {
    const cacheKey = `venue:seasonal:${venueType}:${season}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const venueIntelligence = await this.getVenueIntelligence(venueType);
        const seasonalVariation = venueIntelligence.seasonal_variations?.find(
          v => v.season.toLowerCase() === season.toLowerCase()
        );

        if (seasonalVariation) {
          return {
            color_adjustments: this.extractColorAdjustments(seasonalVariation),
            fabric_considerations: this.extractFabricConsiderations(seasonalVariation),
            style_modifications: seasonalVariation.adjustments || [],
            special_requirements: seasonalVariation.special_requirements || []
          };
        }

        // Generate default seasonal recommendations
        return this.generateDefaultSeasonalRecommendations(venueType, season);
      },
      {
        ttl: 4 * 60 * 60, // 4 hours
        tags: ['venue', 'seasonal'],
      }
    );
  }

  /**
   * Private helper methods
   */
  private async buildVenueIndex(): Promise<void> {
    if (!this.venueMicrodata) return;

    // Index indoor venues
    const indoorVenues = this.venueMicrodata.venue_lighting_analysis?.indoor_venues || {};
    Object.entries(indoorVenues).forEach(([venueType, data]) => {
      this.venueIndex.set(venueType, { type: 'indoor', category: venueType, data });

      // Add normalized variants
      const normalized = this.getNormalizedVenueTypes(venueType);
      normalized.forEach(variant => {
        if (!this.venueIndex.has(variant)) {
          this.venueIndex.set(variant, { type: 'indoor', category: venueType, data });
        }
      });
    });

    // Index outdoor venues
    const outdoorVenues = this.venueMicrodata.venue_lighting_analysis?.outdoor_venues || {};
    Object.entries(outdoorVenues).forEach(([venueType, data]) => {
      this.venueIndex.set(venueType, { type: 'outdoor', category: venueType, data });

      // Add normalized variants
      const normalized = this.getNormalizedVenueTypes(venueType);
      normalized.forEach(variant => {
        if (!this.venueIndex.has(variant)) {
          this.venueIndex.set(variant, { type: 'outdoor', category: venueType, data });
        }
      });
    });
  }

  private getNormalizedVenueTypes(venueType: string): string[] {
    const variants: string[] = [];

    // Handle plural/singular variations
    if (venueType.endsWith('s')) {
      variants.push(venueType.slice(0, -1)); // singular
    } else {
      variants.push(venueType + 's'); // plural
    }

    // Handle special cases
    const normalizations: { [key: string]: string[] } = {
      'churches_cathedrals': ['church', 'cathedral', 'religious', 'worship'],
      'ballrooms': ['ballroom', 'grand_ballroom', 'formal_ballroom'],
      'historic_venues': ['historic', 'historical', 'mansion', 'estate'],
      'gardens': ['garden', 'outdoor_garden', 'botanical_garden'],
      'beaches': ['beach', 'oceanfront', 'seaside', 'waterfront'],
      'vineyards': ['vineyard', 'winery', 'wine_country']
    };

    if (normalizations[venueType]) {
      variants.push(...normalizations[venueType]);
    }

    return variants;
  }

  private async buildLightingDatabase(): Promise<void> {
    // Build database of common lighting conditions
    const lightingTypes = ['natural', 'fluorescent', 'incandescent', 'led', 'mixed'];

    lightingTypes.forEach(type => {
      this.lightingDatabase.set(type, this.createLightingConditions(type));
    });
  }

  private async buildVenueRulesCache(): Promise<void> {
    // Build cache of unspoken rules for common venues
    const commonVenues = ['wedding', 'business', 'cocktail', 'black_tie', 'casual'];
    
    commonVenues.forEach(venue => {
      this.venueRulesCache.set(venue, this.getUnspokenRulesForVenue(venue));
    });
  }

  private createLightingConditions(type: string): LightingConditions {
    const lightingMap: { [key: string]: LightingConditions } = {
      natural: {
        primary_lighting: 'natural',
        intensity: 'high',
        color_temperature: 'neutral',
        color_accuracy_impact: 10,
        recommendations: ['Optimal for all colors', 'True color representation']
      },
      fluorescent: {
        primary_lighting: 'fluorescent',
        intensity: 'medium',
        color_temperature: 'cool',
        color_accuracy_impact: 6,
        recommendations: ['Avoid warm undertones', 'Cool colors work best']
      },
      incandescent: {
        primary_lighting: 'incandescent',
        intensity: 'medium',
        color_temperature: 'warm',
        color_accuracy_impact: 7,
        recommendations: ['Warm colors enhanced', 'Cool colors may appear muted']
      },
      led: {
        primary_lighting: 'led',
        intensity: 'variable',
        color_temperature: 'neutral',
        color_accuracy_impact: 9,
        recommendations: ['Good color accuracy', 'Modern and efficient']
      },
      mixed: {
        primary_lighting: 'mixed',
        intensity: 'variable',
        color_temperature: 'neutral' as any, // mixed lighting
        color_accuracy_impact: 7,
        recommendations: ['Balanced approach needed', 'Neutral colors safest']
      }
    };

    return lightingMap[type] || lightingMap.mixed;
  }

  private getUnspokenRulesForVenue(venueType: string): UnspokenRule[] {
    const rulesMap: { [key: string]: UnspokenRule[] } = {
      wedding: [
        {
          rule: 'Never upstage the groom',
          importance: 9,
          violation_consequences: 'Social disapproval, wedding photos compromised',
          regional_variations: ['Less strict in casual outdoor weddings']
        },
        {
          rule: 'Avoid white or ivory',
          importance: 10,
          violation_consequences: 'Major social faux pas',
          regional_variations: ['Universal rule']
        }
      ],
      black_tie: [
        {
          rule: 'Tuxedo required after 6 PM',
          importance: 10,
          violation_consequences: 'Refused entry or social exclusion',
          regional_variations: ['Stricter in formal metropolitan venues']
        }
      ],
      business: [
        {
          rule: 'Conservative colors in traditional industries',
          importance: 8,
          violation_consequences: 'Professional credibility questioned',
          regional_variations: ['More flexibility in tech/creative sectors']
        }
      ]
    };

    return rulesMap[venueType] || [];
  }

  private findVenueByType(venueType: string): any {
    if (!this.venueMicrodata || this.venueIndex.size === 0) {
      return null;
    }

    // Normalize the venue type for search
    const normalizedType = venueType.toLowerCase().replace(/[-_\s]/g, '_');

    // Try direct match first
    if (this.venueIndex.has(normalizedType)) {
      return this.venueIndex.get(normalizedType);
    }

    // Try without underscores
    const withoutUnderscores = normalizedType.replace(/_/g, '');
    for (const [key, value] of Array.from(this.venueIndex.entries())) {
      if (key.replace(/_/g, '') === withoutUnderscores) {
        return value;
      }
    }

    // Try partial match
    for (const [key, value] of Array.from(this.venueIndex.entries())) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        return value;
      }
    }

    return null;
  }

  private createDefaultVenueIntelligence(venueType: string): VenueIntelligence {
    return {
      venue_type: venueType,
      lighting_conditions: this.lightingDatabase.get('mixed') || this.createLightingConditions('mixed'),
      dress_code_strictness: this.getDefaultDressCodeStrictness(venueType),
      color_recommendations: this.getDefaultColorRecommendations(venueType),
      fabric_recommendations: this.getDefaultFabricRecommendations(venueType),
      unspoken_rules: this.venueRulesCache.get(venueType) || [],
      seasonal_variations: this.getDefaultSeasonalVariations(venueType),
      photography_considerations: this.getDefaultPhotographyConsiderations(venueType)
    };
  }

  private createDefaultVenueData(): any {
    return {
      venues: {
        wedding: { formality: 8, lighting: 'mixed' },
        business: { formality: 7, lighting: 'fluorescent' },
        cocktail: { formality: 6, lighting: 'incandescent' },
        black_tie: { formality: 10, lighting: 'mixed' }
      }
    };
  }

  private transformToVenueIntelligence(venueInfo: any, venueType: string): VenueIntelligence {
    const { type, category, data } = venueInfo;

    // Extract lighting conditions from venue data
    const lightingConditions = this.extractLightingConditions(data);

    // Extract color recommendations from venue data
    const colorRecommendations = this.extractColorRecommendations(data, category);

    // Extract fabric recommendations from venue data
    const fabricRecommendations = this.extractFabricRecommendations(data, type);

    // Get unspoken rules (from elite club data if applicable)
    const unspokenRules = this.extractUnspokenRules(venueType, category);

    // Determine dress code strictness based on venue type and club status
    const dressCodeStrictness = this.determineDressCodeStrictness(venueType, category);

    return {
      venue_type: venueType,
      lighting_conditions: lightingConditions,
      dress_code_strictness: dressCodeStrictness,
      color_recommendations: colorRecommendations,
      fabric_recommendations: fabricRecommendations,
      unspoken_rules: unspokenRules,
      seasonal_variations: this.extractSeasonalVariations(data, category),
      photography_considerations: this.extractPhotographyConsiderations(data, lightingConditions)
    };
  }

  private extractLightingConditions(venueData: any): LightingConditions {
    const lightingChars = venueData.lighting_characteristics || [];

    // Determine primary lighting type from characteristics
    let primaryLighting: 'natural' | 'fluorescent' | 'incandescent' | 'led' | 'mixed' = 'mixed';
    let colorTemp: 'warm' | 'neutral' | 'cool' = 'neutral';
    let intensity: 'low' | 'medium' | 'high' | 'variable' = 'medium';
    let colorAccuracy = 7;

    const lightingText = lightingChars.join(' ').toLowerCase();

    if (lightingText.includes('natural') || lightingText.includes('daylight')) {
      primaryLighting = 'natural';
      colorTemp = 'neutral';
      intensity = 'high';
      colorAccuracy = 10;
    } else if (lightingText.includes('tungsten') || lightingText.includes('warm')) {
      primaryLighting = 'incandescent';
      colorTemp = 'warm';
      colorAccuracy = 7;
    } else if (lightingText.includes('led')) {
      primaryLighting = 'led';
      colorTemp = 'neutral';
      colorAccuracy = 9;
    } else if (lightingText.includes('fluorescent')) {
      primaryLighting = 'fluorescent';
      colorTemp = 'cool';
      colorAccuracy = 6;
    }

    return {
      primary_lighting: primaryLighting,
      intensity,
      color_temperature: colorTemp,
      color_accuracy_impact: colorAccuracy,
      recommendations: lightingChars.slice(0, 3)
    };
  }

  private extractColorRecommendations(venueData: any, category: string): EnhancedColorRecommendations {
    const colorConsiderations = venueData.color_considerations || [];
    const outfitImplications = venueData.outfit_implications || [];

    // Extract colors from considerations
    const optimal: string[] = [];
    const avoid: string[] = [];
    const undertone: string[] = [];

    colorConsiderations.forEach((consideration: string) => {
      const lower = consideration.toLowerCase();
      if (lower.includes('jewel tones') || lower.includes('deep')) {
        optimal.push('Navy', 'Burgundy', 'Forest Green');
      } else if (lower.includes('black') || lower.includes('navy')) {
        optimal.push('Black', 'Navy', 'Charcoal');
      } else if (lower.includes('light')) {
        optimal.push('Light Gray', 'Cream', 'Powder Blue');
      }

      if (lower.includes('avoid') || lower.includes('wash out')) {
        const match = lower.match(/avoid ([a-z\s]+)/);
        if (match) {
          avoid.push(match[1]);
        }
      }

      undertone.push(consideration);
    });

    // Get lighting-specific adaptations from microdata
    const lightingAdaptations = this.extractLightingAdaptations();

    return {
      optimal_colors: optimal.length > 0 ? optimal : ['Navy', 'Charcoal', 'Gray'],
      avoid_colors: avoid.length > 0 ? avoid : [],
      undertone_considerations: undertone.slice(0, 3),
      lighting_adaptations: lightingAdaptations
    };
  }

  private extractLightingAdaptations(): { [key: string]: string[] } {
    if (!this.venueMicrodata?.venue_outfit_impact?.lighting_impact_on_colors) {
      return { 'mixed': ['Neutral colors recommended'] };
    }

    const lightingImpact = this.venueMicrodata.venue_outfit_impact.lighting_impact_on_colors;
    const adaptations: { [key: string]: string[] } = {};

    if (lightingImpact.tungsten_lighting) {
      const tungsten = lightingImpact.tungsten_lighting;
      adaptations['tungsten'] = [
        `Enhances: ${tungsten.enhances?.join(', ') || 'warm colors'}`,
        `Dulls: ${tungsten.dulls?.join(', ') || 'cool colors'}`
      ];
    }

    if (lightingImpact.led_lighting) {
      const led = lightingImpact.led_lighting;
      adaptations['led'] = led.enhances || ['True color representation'];
    }

    if (lightingImpact.natural_light) {
      adaptations['natural'] = ['Optimal for all colors', 'True color representation'];
    }

    return adaptations;
  }

  private extractFabricRecommendations(venueData: any, venueType: string): EnhancedFabricRecommendations {
    const outfitImplications = venueData.outfit_implications || [];

    const optimal: string[] = [];
    const avoid: string[] = [];
    let sheenLevel: 'matte' | 'subtle' | 'high' = 'subtle';
    let wrinkleResistance = 7;

    // Get fabric performance data from microdata
    if (this.venueMicrodata?.venue_outfit_impact?.fabric_performance_by_venue) {
      const fabricPerf = this.venueMicrodata.venue_outfit_impact.fabric_performance_by_venue;

      if (venueType === 'indoor') {
        optimal.push(...(fabricPerf.indoor_controlled?.ideal_fabrics || []));
        avoid.push(...(fabricPerf.indoor_controlled?.avoid || []));
        sheenLevel = 'high';
      } else if (venueType === 'outdoor') {
        optimal.push(...(fabricPerf.outdoor_variable?.ideal_fabrics || []));
        avoid.push(...(fabricPerf.outdoor_variable?.avoid || []));
        wrinkleResistance = 9; // More important for outdoor
      }
    }

    // Parse outfit implications for fabric clues
    outfitImplications.forEach((implication: string) => {
      const lower = implication.toLowerCase();
      if (lower.includes('luxurious') || lower.includes('formal')) {
        if (!optimal.includes('Wool')) optimal.push('Wool', 'Silk');
        sheenLevel = 'high';
      } else if (lower.includes('lighter') || lower.includes('breathable')) {
        if (!optimal.includes('Cotton')) optimal.push('Cotton', 'Linen');
        wrinkleResistance = 6;
      }
    });

    return {
      optimal_textures: optimal.length > 0 ? optimal : ['Wool', 'Cotton'],
      avoid_textures: avoid,
      sheen_level: sheenLevel,
      wrinkle_resistance_importance: wrinkleResistance
    };
  }

  private extractUnspokenRules(venueType: string, category: string): UnspokenRule[] {
    const rules: UnspokenRule[] = [];

    if (!this.venueMicrodata?.elite_club_dress_codes) {
      return this.venueRulesCache.get(venueType) || [];
    }

    const clubCodes = this.venueMicrodata.elite_club_dress_codes;

    // Check if venue matches elite club patterns
    const venueTypeLower = venueType.toLowerCase();

    if (venueTypeLower.includes('club') || venueTypeLower.includes('elite')) {
      // Ultra elite clubs
      if (clubCodes.ultra_elite_clubs?.unwritten_rules?.men) {
        clubCodes.ultra_elite_clubs.unwritten_rules.men.forEach((rule: string) => {
          rules.push({
            rule,
            importance: 9,
            violation_consequences: 'Membership privileges questioned',
            regional_variations: clubCodes.ultra_elite_clubs.unwritten_rules.universal_principles || []
          });
        });
      }

      // Prestigious clubs
      if (clubCodes.prestigious_clubs?.harvard_club_standards?.prohibited_items) {
        const prohibited = clubCodes.prestigious_clubs.harvard_club_standards.prohibited_items;
        rules.push({
          rule: `Prohibited items: ${prohibited.join(', ')}`,
          importance: 8,
          violation_consequences: 'Dress code violation',
          regional_variations: ['Strictly enforced']
        });
      }
    }

    // Country clubs for golf/sporting venues
    if (venueTypeLower.includes('golf') || venueTypeLower.includes('country')) {
      if (clubCodes.country_clubs_general?.golf_requirements?.men) {
        clubCodes.country_clubs_general.golf_requirements.men.forEach((rule: string) => {
          rules.push({
            rule,
            importance: 8,
            violation_consequences: 'May be asked to change or leave',
            regional_variations: ['Standard across most clubs']
          });
        });
      }
    }

    // Return cached rules if no specific club rules found
    return rules.length > 0 ? rules : (this.venueRulesCache.get(venueType) || []);
  }

  private determineDressCodeStrictness(venueType: string, category: string): number {
    const venueTypeLower = venueType.toLowerCase();

    // Elite club venues
    if (venueTypeLower.includes('elite') || venueTypeLower.includes('ultra')) {
      return 10;
    }
    if (venueTypeLower.includes('harvard') || venueTypeLower.includes('university')) {
      return 9;
    }
    if (venueTypeLower.includes('country_club') || venueTypeLower.includes('golf')) {
      return 8;
    }

    // Venue category-based strictness
    if (category === 'ballrooms') return 9;
    if (category === 'churches_cathedrals') return 8;
    if (category === 'historic_venues') return 7;
    if (category === 'vineyards') return 6;
    if (category === 'gardens') return 5;
    if (category === 'beaches') return 4;

    return this.getDefaultDressCodeStrictness(venueType);
  }

  private extractSeasonalVariations(venueData: any, category: string): VenueSeasonalVariation[] {
    // Check if elite club with seasonal variations
    if (this.venueMicrodata?.elite_club_dress_codes?.ultra_elite_clubs?.seasonal_variations) {
      const seasonal = this.venueMicrodata.elite_club_dress_codes.ultra_elite_clubs.seasonal_variations;

      const variations: VenueSeasonalVariation[] = [];

      if (seasonal.winter_requirements) {
        variations.push({
          season: 'winter',
          adjustments: seasonal.winter_requirements,
          temperature_considerations: ['Indoor heating', 'Formal layering'],
          special_requirements: ['Sport coats required']
        });
      }

      if (seasonal.summer_allowances) {
        variations.push({
          season: 'summer',
          adjustments: seasonal.summer_allowances,
          temperature_considerations: ['Heat management', 'Breathability'],
          special_requirements: ['Lighter fabrics permitted']
        });
      }

      if (variations.length > 0) {
        return variations;
      }
    }

    return this.getDefaultSeasonalVariations(category);
  }

  private extractPhotographyConsiderations(venueData: any, lightingConditions: LightingConditions): PhotographyConsiderations {
    const considerations: string[] = [];

    // Build photography tips from lighting conditions
    if (lightingConditions.color_accuracy_impact >= 9) {
      considerations.push('Excellent for photography');
      considerations.push('True color representation');
    } else if (lightingConditions.color_accuracy_impact < 7) {
      considerations.push('Consider professional lighting setup');
      considerations.push('Neutral colors photograph best');
    }

    // Add outfit implications as photo tips
    const outfitImplications = venueData.outfit_implications || [];
    outfitImplications.forEach((implication: string) => {
      if (implication.toLowerCase().includes('photograph') || implication.toLowerCase().includes('showcase')) {
        considerations.push(implication);
      }
    });

    return {
      camera_flash_impact: lightingConditions.color_accuracy_impact < 7
        ? 'Significant - use carefully'
        : 'Minimal with good venue lighting',
      social_media_optimization: considerations.slice(0, 3),
      video_call_suitability: lightingConditions.color_accuracy_impact,
      instagram_performance: considerations.slice(0, 2)
    };
  }

  private getDefaultDressCodeStrictness(venueType: string): number {
    const strictnessMap: { [key: string]: number } = {
      black_tie: 10,
      wedding: 8,
      business: 7,
      cocktail: 6,
      casual: 3
    };

    return strictnessMap[venueType.toLowerCase()] || 5;
  }

  private getDefaultColorRecommendations(venueType: string): EnhancedColorRecommendations {
    const colorMap: { [key: string]: EnhancedColorRecommendations } = {
      wedding: {
        optimal_colors: ['Navy', 'Charcoal', 'Light Gray'],
        avoid_colors: ['White', 'Ivory', 'Cream'],
        undertone_considerations: ['Avoid competing with wedding colors'],
        lighting_adaptations: {
          'natural': ['All colors work well'],
          'mixed': ['Neutral colors safest']
        }
      },
      business: {
        optimal_colors: ['Navy', 'Charcoal', 'Dark Gray'],
        avoid_colors: ['Bright colors', 'Novelty patterns'],
        undertone_considerations: ['Conservative approach'],
        lighting_adaptations: {
          'fluorescent': ['Cool undertones work best']
        }
      }
    };

    return colorMap[venueType.toLowerCase()] || {
      optimal_colors: ['Navy', 'Charcoal', 'Gray'],
      avoid_colors: ['Overly bright colors'],
      undertone_considerations: ['Balanced approach'],
      lighting_adaptations: { 'mixed': ['Neutral colors recommended'] }
    };
  }

  private getDefaultFabricRecommendations(venueType: string): EnhancedFabricRecommendations {
    return {
      optimal_textures: ['Smooth wool', 'Fine cotton'],
      avoid_textures: ['Overly casual fabrics'],
      sheen_level: 'subtle',
      wrinkle_resistance_importance: 7
    };
  }

  private getDefaultSeasonalVariations(venueType: string): VenueSeasonalVariation[] {
    return [
      {
        season: 'spring',
        adjustments: ['Lighter colors acceptable'],
        temperature_considerations: ['Breathable fabrics'],
        special_requirements: []
      },
      {
        season: 'summer',
        adjustments: ['Lighter fabrics essential'],
        temperature_considerations: ['Heat management priority'],
        special_requirements: ['Consider outdoor elements']
      }
    ];
  }

  private getDefaultPhotographyConsiderations(venueType: string): PhotographyConsiderations {
    return {
      camera_flash_impact: 'Minimal with quality fabrics',
      social_media_optimization: ['Ensure good contrast', 'Avoid busy patterns'],
      video_call_suitability: 8,
      instagram_performance: ['Solid colors perform best']
    };
  }

  private async generateColorRecommendations(
    venueIntelligence: VenueIntelligence,
    lightingAnalysis: any,
    season: string
  ): Promise<string[]> {
    const recommendations = [...venueIntelligence.color_recommendations.optimal_colors];
    
    // Adjust for lighting
    if (lightingAnalysis.color_accuracy_impact < 7) {
      recommendations.push('Neutral colors for poor lighting');
    }
    
    // Seasonal adjustments
    if (season === 'summer') {
      recommendations.push('Light gray', 'Lighter navy');
    }
    
    return recommendations;
  }

  private async generateFabricRecommendations(
    venueIntelligence: VenueIntelligence,
    season: string,
    timeOfDay: string
  ): Promise<string[]> {
    const recommendations = [...venueIntelligence.fabric_recommendations.optimal_textures];
    
    // Seasonal adjustments
    if (season === 'summer') {
      recommendations.push('Lightweight wool', 'Breathable cotton');
    } else if (season === 'winter') {
      recommendations.push('Heavier wool', 'Flannel');
    }
    
    return recommendations;
  }

  private async generateStyleAdjustments(
    request: VenueOptimizationRequest,
    venueIntelligence: VenueIntelligence
  ): Promise<string[]> {
    const adjustments: string[] = [];
    
    // Dress code adjustments
    if (venueIntelligence.dress_code_strictness > 8) {
      adjustments.push('Formal accessories required');
      adjustments.push('Conservative styling essential');
    }
    
    // Time-based adjustments
    if (request.time_of_day === 'evening') {
      adjustments.push('Elevated formality for evening events');
    }
    
    return adjustments;
  }

  private calculateConfidenceScore(venueIntelligence: VenueIntelligence, request: VenueOptimizationRequest): number {
    let score = 80; // Base confidence
    
    // Adjust based on data availability
    if (venueIntelligence.unspoken_rules.length > 0) {
      score += 10;
    }
    
    // Adjust based on specificity
    if (request.special_considerations && request.special_considerations.length > 0) {
      score += 5;
    }
    
    return Math.min(score, 95);
  }

  private async identifyPotentialIssues(
    request: VenueOptimizationRequest,
    venueIntelligence: VenueIntelligence
  ): Promise<string[]> {
    const issues: string[] = [];
    
    // Check dress code conflicts
    if (request.dress_code_level < venueIntelligence.dress_code_strictness - 2) {
      issues.push('Dress code level may be insufficient for venue requirements');
    }
    
    // Check lighting issues
    if (request.lighting_conditions.includes('fluorescent') && 
        venueIntelligence.lighting_conditions.color_accuracy_impact < 7) {
      issues.push('Lighting conditions may affect color appearance');
    }
    
    return issues;
  }

  private async generatePhotographyTips(
    venueIntelligence: VenueIntelligence,
    lightingAnalysis: any
  ): Promise<string[]> {
    const tips = [...venueIntelligence.photography_considerations.instagram_performance];
    
    // Add lighting-specific tips
    tips.push(...lightingAnalysis.recommendations);
    
    return tips;
  }

  private extractColorAdjustments(variation: VenueSeasonalVariation): string[] {
    // Extract color-related adjustments from seasonal variation data
    return variation.adjustments.filter(adj => 
      adj.toLowerCase().includes('color') || adj.toLowerCase().includes('light')
    );
  }

  private extractFabricConsiderations(variation: VenueSeasonalVariation): string[] {
    // Extract fabric-related considerations from seasonal variation data
    return [
      ...variation.temperature_considerations,
      ...variation.adjustments.filter(adj => 
        adj.toLowerCase().includes('fabric') || adj.toLowerCase().includes('material')
      )
    ];
  }

  private generateDefaultSeasonalRecommendations(venueType: string, season: string): any {
    return {
      color_adjustments: [`${season} appropriate colors`],
      fabric_considerations: [`${season} suitable fabrics`],
      style_modifications: ['Seasonal style adjustments'],
      special_requirements: []
    };
  }

  /**
   * Clear venue-related caches
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateByTags(['venue']);
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
    const dataLoaded = this.venueData !== null;
    const cacheStats = await cacheService.getStats();
    
    return {
      status: dataLoaded ? 'healthy' : 'degraded',
      data_loaded: dataLoaded,
      cache_status: `${(cacheStats as any)?.keys_count || 0} keys cached`,
      last_update: new Date().toISOString()
    };
  }
}

export const venueIntelligenceService = new VenueIntelligenceService();