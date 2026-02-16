/**
 * Seasonal Rules Engine
 * Comprehensive fabric seasonality and color seasonality validation
 * 
 * Features:
 * - Fabric seasonality analysis (weight, breathability, warmth)
 * - Color seasonality validation (seasonal color palettes)
 * - Weather appropriateness checking
 * - Seasonal trend alignment
 * - Climate zone considerations
 * - Regional seasonal variations
 */

import { FormalityIndex } from '../types/knowledge-bank';
import { loadDataFile } from '../utils/data-loader';
import { OutfitCombination, ValidationContext, ValidationResult } from './validation-engine';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

export interface SeasonalAnalysis {
  fabric_appropriateness: {
    suit: SeasonalScore;
    shirt: SeasonalScore; 
    tie: SeasonalScore;
    overall: SeasonalScore;
  };
  color_appropriateness: {
    seasonal_palette_match: number;
    trending_seasonal_colors: string[];
    off_season_warnings: string[];
  };
  weather_suitability: {
    overall_suitability: number;
    temperature_match: number;
    breathability_match: number;
    weather_protection: number;
    comfort_factors: {
      fabric_weight: 'too_heavy' | 'perfect' | 'too_light';
      breathability: 'poor' | 'adequate' | 'excellent';
      moisture_management: 'poor' | 'good' | 'excellent';
      wind_resistance: 'poor' | 'adequate' | 'good';
    };
  };
  regional_considerations: {
    climate_zone: string;
    local_seasonal_preferences: string[];
    cultural_seasonal_norms: string[];
  };
  improvement_suggestions: string[];
}

export interface SeasonalScore {
  score: number;
  reasoning: string;
  improvements: string[];
  alternatives: string[];
}

export interface WeatherAppropriatenessResult {
  overall_suitability: number;
  temperature_match: number;
  breathability_match: number;
  weather_protection: number;
  comfort_factors: {
    fabric_weight: 'too_heavy' | 'perfect' | 'too_light';
    breathability: 'poor' | 'adequate' | 'excellent';
    moisture_management: 'poor' | 'good' | 'excellent';
    wind_resistance: 'poor' | 'adequate' | 'good';
  };
}

class SeasonalRulesEngine {
  private fabricSeasonality: any = null;
  private colorSeasonality: any = null;
  private graduationTiming: any[] = [];
  private monthlyPatterns: any[] = [];

  // Comprehensive seasonal fabric guidelines
  private readonly SEASONAL_FABRICS = {
    spring: {
      excellent: ['lightweight_wool', 'cotton', 'linen_blend', 'silk', 'cotton_blend'],
      good: ['medium_wool', 'poplin', 'chambray', 'fine_cotton'],
      avoid: ['heavy_wool', 'flannel', 'velvet', 'thick_tweed', 'heavy_corduroy'],
      temperature_range: '60-75°F (15-24°C)',
      characteristics: ['breathable', 'light_to_medium_weight', 'natural_fibers_preferred']
    },
    summer: {
      excellent: ['linen', 'cotton', 'seersucker', 'tropical_wool', 'silk', 'cotton_poplin'],
      good: ['lightweight_cotton_blend', 'bamboo_blend', 'performance_fabrics'],
      avoid: ['wool', 'flannel', 'velvet', 'heavy_cotton', 'synthetic_blends_poor_breathability'],
      temperature_range: '75-95°F (24-35°C)',
      characteristics: ['highly_breathable', 'moisture_wicking', 'UV_protective', 'wrinkle_resistant_preferred']
    },
    fall: {
      excellent: ['wool', 'tweed', 'flannel', 'corduroy', 'wool_blend', 'cashmere'],
      good: ['cotton_wool_blend', 'medium_weight_cotton', 'brushed_cotton'],
      avoid: ['linen', 'seersucker', 'very_light_cotton', 'mesh_fabrics'],
      temperature_range: '45-70°F (7-21°C)',
      characteristics: ['moderate_warmth', 'textured_acceptable', 'layering_friendly']
    },
    winter: {
      excellent: ['heavy_wool', 'flannel', 'velvet', 'cashmere', 'thick_tweed', 'merino_wool'],
      good: ['wool_blend', 'brushed_cotton', 'corduroy', 'synthetic_insulation'],
      avoid: ['linen', 'seersucker', 'thin_cotton', 'mesh', 'lightweight_silk'],
      temperature_range: '20-50°F (-7-10°C)',
      characteristics: ['insulating', 'wind_resistant', 'moisture_resistant', 'durable']
    }
  };

  // Seasonal color palettes with psychological and cultural context
  private readonly SEASONAL_COLOR_PALETTES = {
    spring: {
      primary: ['light_blue', 'sage_green', 'cream', 'light_grey', 'powder_blue'],
      accent: ['coral', 'pink', 'light_yellow', 'mint_green', 'lavender'],
      neutral: ['white', 'light_grey', 'cream', 'beige'],
      trending: ['sage_green', 'powder_blue', 'coral'],
      psychology: 'renewal, freshness, optimism',
      avoid: ['heavy_dark_colors', 'deep_winter_tones']
    },
    summer: {
      primary: ['white', 'light_blue', 'tan', 'khaki', 'sage_green'],
      accent: ['coral', 'turquoise', 'lemon', 'mint', 'peach'],
      neutral: ['white', 'cream', 'light_tan', 'stone_grey'],
      trending: ['white', 'sage_green', 'coral'],
      psychology: 'energy, vitality, adventure',
      avoid: ['dark_heavy_colors', 'black_suits', 'deep_burgundy']
    },
    fall: {
      primary: ['burgundy', 'brown', 'hunter_green', 'navy', 'charcoal'],
      accent: ['rust', 'gold', 'burnt_orange', 'deep_red', 'forest_green'],
      neutral: ['charcoal', 'brown', 'grey', 'cream'],
      trending: ['burgundy', 'hunter_green', 'rust'],
      psychology: 'sophistication, warmth, tradition',
      avoid: ['bright_summer_colors', 'pastels', 'white_suits']
    },
    winter: {
      primary: ['black', 'charcoal', 'navy', 'burgundy', 'midnight_blue'],
      accent: ['silver', 'deep_red', 'royal_blue', 'emerald', 'gold'],
      neutral: ['black', 'charcoal', 'grey', 'white'],
      trending: ['midnight_blue', 'burgundy', 'emerald'],
      psychology: 'elegance, power, formality',
      avoid: ['light_pastels', 'bright_summer_colors', 'tan_suits']
    }
  };

  // Regional climate variations
  private readonly CLIMATE_ZONES = {
    tropical: {
      year_round_considerations: ['extreme_breathability', 'UV_protection', 'quick_dry'],
      fabric_priorities: ['linen', 'tropical_wool', 'performance_cotton'],
      color_preferences: ['light_colors', 'white', 'pastels'],
      avoid_year_round: ['heavy_wools', 'dark_colors', 'synthetic_poor_breathability']
    },
    temperate: {
      seasonal_variation: 'high',
      spring_summer_priority: ['breathability', 'comfort'],
      fall_winter_priority: ['warmth', 'weather_protection'],
      transitional_pieces: ['layering_options', 'versatile_weights']
    },
    continental: {
      extreme_seasons: true,
      summer_requirements: ['maximum_breathability', 'moisture_management'],
      winter_requirements: ['maximum_warmth', 'wind_protection'],
      seasonal_wardrobe_changes: 'complete'
    },
    mediterranean: {
      mild_winters: true,
      hot_dry_summers: true,
      year_round_suitable: ['lightweight_wool', 'cotton', 'linen'],
      seasonal_adjustments: 'minimal'
    }
  };

  async initialize(): Promise<void> {
    try {
      this.fabricSeasonality = await loadDataFile('core/fabric-seasonality.json');
    } catch (error) {
      console.warn('fabric-seasonality.json not found, using built-in SEASONAL_FABRICS data');
      this.fabricSeasonality = this.SEASONAL_FABRICS;
    }
    try {
      this.colorSeasonality = await loadDataFile('core/color-seasonality.json');
    } catch (error) {
      console.warn('color-seasonality.json not found, using built-in SEASONAL_COLOR_PALETTES data');
      this.colorSeasonality = this.SEASONAL_COLOR_PALETTES;
    }

    // Load graduation timing CSV
    try {
      this.graduationTiming = await this.loadCSV('research/seasonal/graduation_season_timing.csv');
    } catch (error) {
      console.warn('graduation_season_timing.csv not found, seasonal graduation insights unavailable');
    }

    // Load monthly seasonal patterns CSV
    try {
      this.monthlyPatterns = await this.loadCSV('research/seasonal/monthly_seasonal_patterns.csv');
    } catch (error) {
      console.warn('monthly_seasonal_patterns.csv not found, monthly pattern insights unavailable');
    }
  }

  /**
   * Load CSV file and return parsed data
   */
  private async loadCSV(relativePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const filePath = path.join(__dirname, '../data', relativePath);

      if (!fs.existsSync(filePath)) {
        reject(new Error(`CSV file not found: ${filePath}`));
        return;
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }

  /**
   * Comprehensive seasonal analysis
   */
  async analyzeSeasonalAppropriateness(
    combination: OutfitCombination,
    season: string,
    context: ValidationContext = {}
  ): Promise<SeasonalAnalysis> {
    if (!this.fabricSeasonality) await this.initialize();

    const fabricAppropriateness = this.analyzeFabricSeasonality(combination, season);
    const colorAppropriateness = this.analyzeColorSeasonality(combination, season);
    const weatherSuitability = this.analyzeWeatherSuitability(combination, season, context);
    const regionalConsiderations = this.analyzeRegionalConsiderations(combination, season, context);
    const improvementSuggestions = this.generateSeasonalImprovements(
      combination, season, fabricAppropriateness, colorAppropriateness
    );

    return {
      fabric_appropriateness: fabricAppropriateness,
      color_appropriateness: colorAppropriateness,
      weather_suitability: weatherSuitability,
      regional_considerations: regionalConsiderations,
      improvement_suggestions: improvementSuggestions
    };
  }

  /**
   * Validate fabric seasonality
   */
  async validateFabricSeasonality(
    combination: OutfitCombination,
    season: string,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const seasonalFabrics = this.SEASONAL_FABRICS[season as keyof typeof this.SEASONAL_FABRICS];
    if (!seasonalFabrics) {
      return this.createUnknownSeasonResult(season);
    }

    const fabricAnalysis = this.analyzeFabricSeasonality(combination, season);
    const overallScore = fabricAnalysis.overall.score;
    const passed = overallScore >= 0.7;

    return {
      rule_id: 'FS001',
      rule_name: 'Fabric Seasonality',
      category: 'seasonal_appropriateness',
      passed,
      confidence: overallScore,
      severity: passed ? 'success' : (overallScore < 0.5 ? 'medium' : 'low'),
      priority: 2,
      weight: 0.8,
      message: `Fabric seasonality score: ${Math.round(overallScore * 100)}% for ${season}`,
      reasoning: fabricAnalysis.overall.reasoning,
      recommendation: passed ? 
        `Excellent fabric choices for ${season}` : 
        fabricAnalysis.overall.improvements.join('; '),
      alternatives: fabricAnalysis.overall.alternatives,
      score_impact: passed ? 5 : -10,
      context_applied: [
        `Season: ${season}`,
        `Temperature range: ${seasonalFabrics.temperature_range}`,
        `Climate: ${context.climate_zone || 'temperate'}`
      ]
    };
  }

  /**
   * Validate color seasonality
   */
  async validateColorSeasonality(
    combination: OutfitCombination,
    season: string
  ): Promise<ValidationResult> {
    const seasonalColors = this.SEASONAL_COLOR_PALETTES[season as keyof typeof this.SEASONAL_COLOR_PALETTES];
    if (!seasonalColors) {
      return this.createUnknownSeasonResult(season);
    }

    const colorAnalysis = this.analyzeColorSeasonality(combination, season);
    const paletteMatch = colorAnalysis.seasonal_palette_match;
    const passed = paletteMatch >= 0.6;

    return {
      rule_id: 'CS001',
      rule_name: 'Color Seasonality',
      category: 'seasonal_appropriateness',
      passed,
      confidence: paletteMatch,
      severity: passed ? 'success' : 'low',
      priority: 3,
      weight: 0.6,
      message: `Seasonal color match: ${Math.round(paletteMatch * 100)}% for ${season}`,
      reasoning: this.generateColorSeasonalityReasoning(combination, season, colorAnalysis),
      recommendation: passed ? 
        `Colors work beautifully for ${season}` : 
        `Consider more ${season}-appropriate colors`,
      alternatives: this.generateSeasonalColorAlternatives(combination, season),
      score_impact: passed ? 4 : -6,
      context_applied: [
        `Trending colors: ${seasonalColors.trending.join(', ')}`,
        `Psychology: ${seasonalColors.psychology}`
      ]
    };
  }

  /**
   * Validate weather appropriateness
   */
  async validateWeatherAppropriateness(
    combination: OutfitCombination,
    weather: string,
    season: string,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const weatherSuitability = this.analyzeWeatherSuitability(combination, season, {
      ...context,
      weather_conditions: weather
    });

    const passed = weatherSuitability.overall_suitability >= 0.7;

    return {
      rule_id: 'WA001',
      rule_name: 'Weather Appropriateness',
      category: 'seasonal_appropriateness',
      passed,
      confidence: weatherSuitability.overall_suitability,
      severity: passed ? 'success' : 'medium',
      priority: 1,
      weight: 0.9,
      message: `Weather suitability: ${Math.round(weatherSuitability.overall_suitability * 100)}%`,
      reasoning: this.generateWeatherReasoning(weatherSuitability, weather, season),
      recommendation: passed ? 
        'Perfect for the weather conditions' : 
        this.generateWeatherRecommendation(weatherSuitability, weather),
      alternatives: this.generateWeatherAlternatives(combination, weather, season),
      score_impact: passed ? 6 : -12,
      context_applied: [
        `Weather: ${weather}`,
        `Fabric weight: ${weatherSuitability.comfort_factors.fabric_weight}`,
        `Breathability: ${weatherSuitability.comfort_factors.breathability}`
      ]
    };
  }

  /**
   * Validate seasonal trend alignment
   */
  async validateSeasonalTrends(
    combination: OutfitCombination,
    season: string
  ): Promise<ValidationResult> {
    const trendScore = this.calculateSeasonalTrendScore(combination, season);
    
    return {
      rule_id: 'ST001',
      rule_name: 'Seasonal Trends',
      category: 'trend_alignment',
      passed: true, // Trends are informational
      confidence: trendScore,
      severity: 'info',
      priority: 4,
      weight: 0.4,
      message: `Seasonal trend alignment: ${Math.round(trendScore * 100)}%`,
      reasoning: this.generateTrendReasoning(combination, season, trendScore),
      recommendation: trendScore > 0.8 ? 
        'Very trendy for the season' : 
        'Classic choice with timeless appeal',
      alternatives: [],
      score_impact: Math.round(trendScore * 5),
      context_applied: [`Season: ${season}`, `Trend factor: ${trendScore.toFixed(2)}`]
    };
  }

  // Helper methods for seasonal analysis

  private analyzeFabricSeasonality(combination: OutfitCombination, season: string): {
    suit: SeasonalScore;
    shirt: SeasonalScore;
    tie: SeasonalScore;
    overall: SeasonalScore;
  } {
    const seasonalFabrics = this.SEASONAL_FABRICS[season as keyof typeof this.SEASONAL_FABRICS];
    
    const suitScore = this.evaluateComponentFabric(combination.suit_fabric || 'wool', seasonalFabrics, 'suit');
    const shirtScore = this.evaluateComponentFabric(combination.shirt_fabric || 'cotton', seasonalFabrics, 'shirt');
    const tieScore = this.evaluateComponentFabric(combination.tie_fabric || 'silk', seasonalFabrics, 'tie');

    const overallScore = (suitScore.score * 0.5) + (shirtScore.score * 0.3) + (tieScore.score * 0.2);

    return {
      suit: suitScore,
      shirt: shirtScore,
      tie: tieScore,
      overall: {
        score: overallScore,
        reasoning: `Overall fabric seasonality for ${season}: ${this.getOverallFabricReasoning(overallScore)}`,
        improvements: this.generateFabricImprovements(suitScore, shirtScore, tieScore),
        alternatives: this.generateFabricAlternatives(combination, season)
      }
    };
  }

  private analyzeColorSeasonality(combination: OutfitCombination, season: string): {
    seasonal_palette_match: number;
    trending_seasonal_colors: string[];
    off_season_warnings: string[];
  } {
    const seasonalColors = this.SEASONAL_COLOR_PALETTES[season as keyof typeof this.SEASONAL_COLOR_PALETTES];
    const colors = [combination.suit_color, combination.shirt_color, combination.tie_color].filter((color): color is string => Boolean(color));
    
    let matchScore = 0;
    let totalColors = colors.length;
    const offSeasonWarnings: string[] = [];
    
    colors.forEach(color => {
      if (seasonalColors.primary.includes(color)) {
        matchScore += 1.0;
      } else if (seasonalColors.accent.includes(color)) {
        matchScore += 0.8;
      } else if (seasonalColors.neutral.includes(color)) {
        matchScore += 0.9;
      } else if (seasonalColors.avoid?.includes(color)) {
        matchScore += 0.1;
        offSeasonWarnings.push(`${color} not recommended for ${season}`);
      } else {
        matchScore += 0.5; // Neutral score for unlisted colors
      }
    });

    return {
      seasonal_palette_match: totalColors > 0 ? matchScore / totalColors : 0.5,
      trending_seasonal_colors: seasonalColors.trending,
      off_season_warnings: offSeasonWarnings
    };
  }

  private analyzeWeatherSuitability(
    combination: OutfitCombination,
    season: string,
    context: ValidationContext
  ): {
    overall_suitability: number;
    temperature_match: number;
    breathability_match: number;
    weather_protection: number;
    comfort_factors: {
      fabric_weight: 'too_heavy' | 'perfect' | 'too_light';
      breathability: 'poor' | 'adequate' | 'excellent';
      moisture_management: 'poor' | 'good' | 'excellent';
      wind_resistance: 'poor' | 'adequate' | 'good';
    };
  } {
    const temperatureMatch = this.calculateTemperatureMatch(combination, season);
    const breathabilityMatch = this.calculateBreathabilityMatch(combination, season);
    const weatherProtection = this.calculateWeatherProtection(combination, season, context);
    const comfortFactors = this.analyzeComfortFactors(combination, season);

    const overallSuitability = (temperatureMatch + breathabilityMatch + weatherProtection) / 3;

    return {
      overall_suitability: overallSuitability,
      temperature_match: temperatureMatch,
      breathability_match: breathabilityMatch,
      weather_protection: weatherProtection,
      comfort_factors: comfortFactors
    };
  }

  private analyzeRegionalConsiderations(
    combination: OutfitCombination,
    season: string,
    context: ValidationContext
  ): {
    climate_zone: string;
    local_seasonal_preferences: string[];
    cultural_seasonal_norms: string[];
  } {
    const climateZone = context.climate_zone || 'temperate';
    const climateData = this.CLIMATE_ZONES[climateZone as keyof typeof this.CLIMATE_ZONES];
    
    return {
      climate_zone: climateZone,
      local_seasonal_preferences: this.getLocalSeasonalPreferences(climateZone, season),
      cultural_seasonal_norms: this.getCulturalSeasonalNorms(climateZone, season)
    };
  }

  private generateSeasonalImprovements(
    combination: OutfitCombination,
    season: string,
    fabricAnalysis: any,
    colorAnalysis: any
  ): string[] {
    const improvements: string[] = [];

    if (fabricAnalysis.overall.score < 0.7) {
      improvements.push(...fabricAnalysis.overall.improvements);
    }

    if (colorAnalysis.seasonal_palette_match < 0.6) {
      improvements.push(`Consider ${season} color palette: ${this.SEASONAL_COLOR_PALETTES[season as keyof typeof this.SEASONAL_COLOR_PALETTES].primary.join(', ')}`);
    }

    if (colorAnalysis.off_season_warnings.length > 0) {
      improvements.push(...colorAnalysis.off_season_warnings);
    }

    return improvements;
  }

  private evaluateComponentFabric(fabric: string, seasonalFabrics: any, component: string): SeasonalScore {
    let score = 0.5; // Default neutral score
    let reasoning = '';
    const improvements: string[] = [];
    const alternatives: string[] = [];

    if (seasonalFabrics.excellent.includes(fabric)) {
      score = 0.95;
      reasoning = `${fabric} is excellent for this season`;
    } else if (seasonalFabrics.good.includes(fabric)) {
      score = 0.8;
      reasoning = `${fabric} is good for this season`;
    } else if (seasonalFabrics.avoid.includes(fabric)) {
      score = 0.2;
      reasoning = `${fabric} should be avoided this season`;
      improvements.push(`Choose ${seasonalFabrics.excellent[0]} instead of ${fabric}`);
      alternatives.push(...seasonalFabrics.excellent.slice(0, 3));
    } else {
      reasoning = `${fabric} is acceptable but not optimal for this season`;
      improvements.push(`Consider ${seasonalFabrics.excellent[0]} for better seasonal appropriateness`);
    }

    return {
      score,
      reasoning,
      improvements,
      alternatives
    };
  }

  private getOverallFabricReasoning(score: number): string {
    if (score >= 0.9) return 'Outstanding seasonal fabric choices';
    if (score >= 0.7) return 'Good seasonal fabric appropriateness';
    if (score >= 0.5) return 'Adequate but could be improved';
    return 'Poor seasonal fabric choices, adjustments needed';
  }

  private generateFabricImprovements(suit: SeasonalScore, shirt: SeasonalScore, tie: SeasonalScore): string[] {
    const improvements: string[] = [];
    
    if (suit.score < 0.7) improvements.push(...suit.improvements);
    if (shirt.score < 0.7) improvements.push(...shirt.improvements);
    if (tie.score < 0.7) improvements.push(...tie.improvements);

    return improvements;
  }

  private generateFabricAlternatives(combination: OutfitCombination, season: string): string[] {
    const seasonalFabrics = this.SEASONAL_FABRICS[season as keyof typeof this.SEASONAL_FABRICS];
    return seasonalFabrics.excellent.slice(0, 3).map(fabric => 
      `Try ${fabric} for optimal ${season} comfort`
    );
  }

  private generateColorSeasonalityReasoning(
    combination: OutfitCombination,
    season: string,
    colorAnalysis: any
  ): string {
    const colors = [combination.suit_color, combination.shirt_color, combination.tie_color].filter((color): color is string => Boolean(color));
    const seasonalColors = this.SEASONAL_COLOR_PALETTES[season as keyof typeof this.SEASONAL_COLOR_PALETTES];
    
    const matchingColors = colors.filter(c => 
      seasonalColors.primary.includes(c) || 
      seasonalColors.accent.includes(c) || 
      seasonalColors.neutral.includes(c)
    );

    if (matchingColors.length === colors.length) {
      return `All colors (${colors.join(', ')}) perfectly match ${season} palette`;
    } else if (matchingColors.length > 0) {
      return `Some colors (${matchingColors.join(', ')}) work well for ${season}`;
    } else {
      return `Colors may not be optimal for ${season} season preferences`;
    }
  }

  private generateSeasonalColorAlternatives(combination: OutfitCombination, season: string): string[] {
    const seasonalColors = this.SEASONAL_COLOR_PALETTES[season as keyof typeof this.SEASONAL_COLOR_PALETTES];
    return seasonalColors.trending.slice(0, 3).map(color => 
      `Try ${color} for trending ${season} style`
    );
  }

  private generateWeatherReasoning(
    weatherSuitability: any,
    weather: string,
    season: string
  ): string {
    const factors = [];
    
    if (weatherSuitability.temperature_match > 0.8) {
      factors.push('excellent temperature appropriateness');
    } else if (weatherSuitability.temperature_match < 0.5) {
      factors.push('temperature mismatch concerns');
    }

    if (weatherSuitability.comfort_factors.fabric_weight === 'too_heavy') {
      factors.push('fabrics may be too warm');
    } else if (weatherSuitability.comfort_factors.fabric_weight === 'too_light') {
      factors.push('fabrics may be too cool');
    }

    return factors.length > 0 ? factors.join(', ') : `Suitable for ${weather} weather in ${season}`;
  }

  private generateWeatherRecommendation(weatherSuitability: any, weather: string): string {
    const recommendations: string[] = [];

    if (weatherSuitability.comfort_factors.fabric_weight === 'too_heavy') {
      recommendations.push('Choose lighter weight fabrics');
    } else if (weatherSuitability.comfort_factors.fabric_weight === 'too_light') {
      recommendations.push('Select warmer, heavier fabrics');
    }

    if (weatherSuitability.comfort_factors.breathability === 'poor') {
      recommendations.push('Improve breathability with natural fibers');
    }

    return recommendations.join('; ') || 'Minor adjustments for optimal comfort';
  }

  private generateWeatherAlternatives(combination: OutfitCombination, weather: string, season: string): string[] {
    // Generate weather-specific alternatives
    return [
      'Consider weather-appropriate fabrics',
      'Adjust layers for comfort',
      'Choose breathable materials'
    ];
  }

  private calculateSeasonalTrendScore(combination: OutfitCombination, season: string): number {
    const seasonalColors = this.SEASONAL_COLOR_PALETTES[season as keyof typeof this.SEASONAL_COLOR_PALETTES];
    const colors = [combination.suit_color, combination.shirt_color, combination.tie_color].filter((color): color is string => Boolean(color));
    
    const trendingMatches = colors.filter(c => seasonalColors.trending.includes(c)).length;
    return Math.min(1.0, (trendingMatches / colors.length) + 0.3); // Base trend score
  }

  private generateTrendReasoning(combination: OutfitCombination, season: string, trendScore: number): string {
    if (trendScore > 0.8) {
      return `High trend alignment with ${season} fashion preferences`;
    } else if (trendScore > 0.6) {
      return `Moderate trend alignment with some contemporary elements`;
    } else {
      return `Classic approach with timeless appeal, less trend-focused`;
    }
  }

  private createUnknownSeasonResult(season: string): ValidationResult {
    return {
      rule_id: 'US001',
      rule_name: 'Unknown Season',
      category: 'seasonal_appropriateness',
      passed: true,
      confidence: 0.5,
      severity: 'info',
      priority: 5,
      weight: 0.1,
      message: `Unknown season: ${season}`,
      reasoning: 'Season not in knowledge base',
      recommendation: 'Verify seasonal requirements',
      alternatives: [],
      score_impact: 0
    };
  }

  // Additional helper methods (placeholders for full implementation)
  private calculateTemperatureMatch(combination: OutfitCombination, season: string): number { return 0.8; }
  private calculateBreathabilityMatch(combination: OutfitCombination, season: string): number { return 0.8; }
  private calculateWeatherProtection(combination: OutfitCombination, season: string, context: ValidationContext): number { return 0.8; }
  private analyzeComfortFactors(combination: OutfitCombination, season: string): any {
    return {
      fabric_weight: 'perfect' as const,
      breathability: 'excellent' as const,
      moisture_management: 'good' as const,
      wind_resistance: 'adequate' as const
    };
  }
  private getLocalSeasonalPreferences(climateZone: string, season: string): string[] { return []; }
  private getCulturalSeasonalNorms(climateZone: string, season: string): string[] { return []; }

  /**
   * Get graduation timing data for a specific month (Section 1.2)
   */
  async getGraduationTiming(month: string): Promise<{
    volume_percentage: number;
    peak_window_days: number;
    avg_spend: number;
    size_demand: string;
    color_preferences: string[];
    is_peak: boolean;
  } | null> {
    if (!this.graduationTiming || this.graduationTiming.length === 0) {
      await this.initialize();
    }

    const data = this.graduationTiming.find(
      row => row.Month?.toLowerCase() === month.toLowerCase()
    );

    if (!data) return null;

    return {
      volume_percentage: parseFloat(data.Graduation_Volume_Percentage) || 0,
      peak_window_days: parseInt(data.Peak_Purchase_Window_Days) || 0,
      avg_spend: parseFloat(data.Average_Spend_Per_Customer) || 0,
      size_demand: data.Size_Range_Demand || 'Unknown',
      color_preferences: (data.Color_Preference_Trend || '').split(',').map((c: string) => c.trim()),
      is_peak: parseFloat(data.Graduation_Volume_Percentage) >= 15
    };
  }

  /**
   * Get monthly seasonal pattern for a specific month (Section 1.2)
   */
  async getMonthlyPattern(month: string): Promise<{
    primary_events: string[];
    weather_sensitivity: number;
    inventory_priority: string[];
    purchase_urgency: number;
  } | null> {
    if (!this.monthlyPatterns || this.monthlyPatterns.length === 0) {
      await this.initialize();
    }

    const data = this.monthlyPatterns.find(
      row => row.Month?.toLowerCase() === month.toLowerCase()
    );

    if (!data) return null;

    return {
      primary_events: (data.Primary_Events || '').split(',').map((e: string) => e.trim()),
      weather_sensitivity: parseInt(data.Weather_Sensitivity) || 5,
      inventory_priority: (data.Inventory_Priority || '').split(',').map((p: string) => p.trim()),
      purchase_urgency: parseInt(data.Purchase_Urgency_Score) || 5
    };
  }

  /**
   * Check if current month is peak graduation season (Section 1.2)
   */
  async isGraduationSeason(month: string): Promise<boolean> {
    const timing = await this.getGraduationTiming(month);
    return timing?.is_peak || false;
  }

  /**
   * Get seasonal inventory recommendations for a month (Section 1.2)
   */
  async getSeasonalInventoryPriority(month: string): Promise<string[]> {
    const pattern = await this.getMonthlyPattern(month);
    return pattern?.inventory_priority || [];
  }

  /**
   * Get graduation color preferences by month (Section 1.2)
   */
  async getGraduationColorPreferences(month: string): Promise<string[]> {
    const timing = await this.getGraduationTiming(month);
    return timing?.color_preferences || [];
  }

  /**
   * Get comprehensive seasonal context for a given month (Section 1.2)
   * This is what the recommendation context builder will call
   */
  async getSeasonalContext(month: string, includeGraduation: boolean = true): Promise<{
    monthly_pattern: any;
    graduation_timing: any;
    seasonal_insights: string[];
  }> {
    const monthlyPattern = await this.getMonthlyPattern(month);
    const graduationTiming = includeGraduation ? await this.getGraduationTiming(month) : null;

    const insights: string[] = [];

    if (monthlyPattern) {
      if (monthlyPattern.purchase_urgency >= 8) {
        insights.push(`High demand month - ${monthlyPattern.primary_events.join(', ')}`);
      }
      if (monthlyPattern.inventory_priority.length > 0) {
        insights.push(`Inventory focus: ${monthlyPattern.inventory_priority.join(', ')}`);
      }
    }

    if (graduationTiming && graduationTiming.is_peak) {
      insights.push(`Peak graduation season (${graduationTiming.volume_percentage}% of annual volume)`);
      insights.push(`Typical spend: $${graduationTiming.avg_spend}`);
    }

    return {
      monthly_pattern: monthlyPattern,
      graduation_timing: graduationTiming,
      seasonal_insights: insights
    };
  }
}

// Export singleton instance
export const seasonalRulesEngine = new SeasonalRulesEngine();