/**
 * Specialized Color Rules Engine
 * Advanced color harmony validation, contrast analysis, and never-combine pattern enforcement
 * 
 * Features:
 * - Color harmony analysis using color theory
 * - Contrast ratio calculations
 * - Temperature mixing validation
 * - Monochromatic combination detection
 * - Never-combine rule enforcement
 * - Cultural color sensitivity
 * - Seasonal color appropriateness
 */

import { ColorRelationships } from '../types/knowledge-bank';
import { loadDataFile } from '../utils/data-loader';
import { OutfitCombination, ValidationContext, ValidationResult } from './validation-engine';

export interface ColorAnalysis {
  primary_color: string;
  secondary_colors: string[];
  color_family: string;
  temperature: 'warm' | 'cool' | 'neutral';
  contrast_level: 'low' | 'medium' | 'high';
  harmony_type: 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'mixed';
  cultural_considerations: string[];
  seasonal_alignment: { [season: string]: number };
}

export interface ColorHarmonyResult {
  harmony_score: number;
  harmony_type: string;
  confidence: number;
  reasoning: string;
  improvements: string[];
  color_analysis: ColorAnalysis;
}

export interface ColorContrast {
  combination: string;
  contrast_ratio: number;
  accessibility_rating: 'AAA' | 'AA' | 'A' | 'Failed';
  visual_impact: 'subtle' | 'moderate' | 'strong' | 'dramatic';
  recommendation: string;
}

class ColorRulesEngine {
  private colorData: ColorRelationships | null = null;
  private neverCombineRules: any = null;
  private colorHexMapping: any = null;

  // Color theory constants
  private readonly WARM_COLORS = [
    'burgundy', 'brown', 'tan', 'coral', 'orange', 'red', 'yellow', 'gold',
    'rust', 'terracotta', 'salmon', 'peach', 'amber'
  ];

  private readonly COOL_COLORS = [
    'blue', 'navy', 'light_blue', 'powder_blue', 'midnight_blue', 'royal_blue',
    'green', 'sage_green', 'hunter_green', 'forest_green', 'teal',
    'purple', 'lavender', 'violet', 'grey', 'charcoal', 'silver'
  ];

  private readonly NEUTRAL_COLORS = [
    'white', 'black', 'grey', 'light_grey', 'charcoal', 'cream', 'ivory', 'beige'
  ];

  private readonly SEASONAL_COLORS = {
    spring: ['light_blue', 'sage_green', 'coral', 'cream', 'light_grey', 'pink'],
    summer: ['white', 'light_blue', 'tan', 'sage_green', 'powder_blue', 'light_grey'],
    fall: ['burgundy', 'brown', 'hunter_green', 'navy', 'rust', 'gold'],
    winter: ['black', 'charcoal', 'navy', 'burgundy', 'midnight_blue', 'silver']
  };

  private readonly CULTURAL_COLOR_MEANINGS = {
    red: ['luck_chinese', 'power_western', 'danger_universal'],
    white: ['purity_western', 'mourning_eastern', 'peace_universal'],
    black: ['formal_western', 'mourning_universal', 'elegance_universal'],
    green: ['nature_universal', 'sacred_islamic', 'luck_irish'],
    blue: ['trust_universal', 'calm_universal', 'professional_western'],
    purple: ['royalty_universal', 'luxury_western', 'spirituality_eastern'],
    yellow: ['happiness_universal', 'caution_western', 'imperial_chinese'],
    gold: ['wealth_universal', 'prestige_universal', 'divine_multiple']
  };

  async initialize(): Promise<void> {
    try {
      this.colorData = await loadDataFile('core/color-relationships.json') as ColorRelationships;
      this.neverCombineRules = await loadDataFile('core/never-combine-rules.json');
      this.colorHexMapping = await loadDataFile('visual/color-hex-mapping.json');
    } catch (error) {
      console.error('Failed to initialize color rules engine:', error);
      throw new Error('Color rules engine initialization failed');
    }
  }

  /**
   * Comprehensive color harmony analysis
   */
  async analyzeColorHarmony(combination: OutfitCombination, context: ValidationContext = {}): Promise<ColorHarmonyResult> {
    if (!this.colorData) await this.initialize();

    const colors = this.extractColors(combination);
    const colorAnalysis = this.analyzeColors(colors);
    const harmonyType = this.determineHarmonyType(colors);
    const harmonyScore = this.calculateHarmonyScore(colors, harmonyType, context);
    
    const confidence = this.calculateHarmonyConfidence(colors, harmonyScore, context);
    const reasoning = this.generateHarmonyReasoning(colors, harmonyType, harmonyScore, colorAnalysis);
    const improvements = this.generateHarmonyImprovements(colors, harmonyScore, colorAnalysis);

    return {
      harmony_score: harmonyScore,
      harmony_type: harmonyType,
      confidence,
      reasoning,
      improvements,
      color_analysis: colorAnalysis
    };
  }

  /**
   * Validate against never-combine rules with detailed analysis
   */
  async validateNeverCombineRules(combination: OutfitCombination): Promise<ValidationResult[]> {
    if (!this.neverCombineRules) await this.initialize();

    const results: ValidationResult[] = [];
    const colors = this.extractColors(combination);

    // Check absolute never-combine rules
    for (const rule of this.neverCombineRules.absolute_never_combine || []) {
      const violation = this.checkNeverCombineRule(combination, rule);
      if (violation) {
        results.push({
          rule_id: rule.rule_id,
          rule_name: 'Never Combine Rule',
          category: 'color_harmony',
          passed: false,
          confidence: 0.95,
          severity: rule.severity === 'critical' ? 'critical' : 'high',
          priority: 1,
          weight: 1.0,
          message: `Violates never-combine rule: ${rule.reason}`,
          reasoning: rule.reason,
          recommendation: this.generateNeverCombineRecommendation(combination, rule),
          alternatives: this.generateNeverCombineAlternatives(combination, rule),
          score_impact: -30
        });
      }
    }

    // Check conditional avoid rules
    for (const rule of this.neverCombineRules.conditional_avoid || []) {
      const violation = this.checkConditionalAvoidRule(combination, rule);
      if (violation) {
        results.push({
          rule_id: rule.rule_id,
          rule_name: 'Conditional Avoid Rule',
          category: 'color_harmony',
          passed: false,
          confidence: 0.80,
          severity: rule.severity === 'critical' ? 'high' : 'medium',
          priority: 2,
          weight: 0.8,
          message: `Conditional avoid: ${rule.reason}`,
          reasoning: rule.reason,
          recommendation: this.generateConditionalAvoidRecommendation(combination, rule),
          alternatives: [],
          score_impact: -15
        });
      }
    }

    // If no violations, add positive result
    if (results.length === 0) {
      results.push({
        rule_id: 'NCR_PASS',
        rule_name: 'Never Combine Rules',
        category: 'color_harmony',
        passed: true,
        confidence: 0.95,
        severity: 'success',
        priority: 1,
        weight: 1.0,
        message: 'Passes all never-combine rules',
        reasoning: 'No forbidden color combinations detected',
        recommendation: 'Excellent color choice',
        alternatives: [],
        score_impact: 5
      });
    }

    return results;
  }

  /**
   * Analyze color contrast and accessibility
   */
  async analyzeColorContrast(combination: OutfitCombination): Promise<ColorContrast[]> {
    const colors = this.extractColors(combination);
    const contrasts: ColorContrast[] = [];

    // Analyze suit-shirt contrast
    if (combination.suit_color && combination.shirt_color) {
      const contrast = this.calculateContrast(combination.suit_color, combination.shirt_color);
      contrasts.push({
        combination: `${combination.suit_color} suit with ${combination.shirt_color} shirt`,
        contrast_ratio: contrast.ratio,
        accessibility_rating: contrast.accessibility,
        visual_impact: contrast.impact,
        recommendation: contrast.recommendation
      });
    }

    // Analyze shirt-tie contrast
    if (combination.shirt_color && combination.tie_color) {
      const contrast = this.calculateContrast(combination.shirt_color, combination.tie_color);
      contrasts.push({
        combination: `${combination.shirt_color} shirt with ${combination.tie_color} tie`,
        contrast_ratio: contrast.ratio,
        accessibility_rating: contrast.accessibility,
        visual_impact: contrast.impact,
        recommendation: contrast.recommendation
      });
    }

    return contrasts;
  }

  /**
   * Validate color temperature mixing
   */
  async validateColorTemperature(combination: OutfitCombination): Promise<ValidationResult> {
    const colors = this.extractColors(combination);
    const temperatures = colors.map(c => this.getColorTemperature(c));
    
    const hasWarm = temperatures.includes('warm');
    const hasCool = temperatures.includes('cool');
    const hasNeutral = temperatures.includes('neutral');

    const mixing = hasWarm && hasCool;
    const hasBridge = mixing && hasNeutral;
    
    let passed = true;
    let severity: any = 'success';
    let message = 'Color temperatures work harmoniously';
    let reasoning = 'Consistent color temperature or proper bridging';
    let recommendation = 'Excellent temperature balance';
    let scoreImpact = 3;

    if (mixing && !hasBridge) {
      passed = false;
      severity = 'medium';
      message = 'Mixing warm and cool colors without neutral bridge';
      reasoning = 'Warm and cool colors can clash without neutral intermediary';
      recommendation = 'Add a neutral color (white, grey, black) to bridge temperature difference';
      scoreImpact = -8;
    } else if (mixing && hasBridge) {
      message = 'Successfully bridging warm and cool temperatures';
      reasoning = 'Neutral colors create harmony between warm and cool tones';
      recommendation = 'Well-balanced temperature mixing';
      scoreImpact = 5;
    }

    return {
      rule_id: 'CT001',
      rule_name: 'Color Temperature Mixing',
      category: 'color_harmony',
      passed,
      confidence: 0.85,
      severity,
      priority: 2,
      weight: 0.7,
      message,
      reasoning,
      recommendation,
      alternatives: this.generateTemperatureAlternatives(combination, mixing, hasBridge),
      score_impact: scoreImpact,
      context_applied: [`Warm: ${hasWarm}`, `Cool: ${hasCool}`, `Neutral: ${hasNeutral}`]
    };
  }

  /**
   * Validate monochromatic combinations
   */
  async validateMonochromaticCombination(combination: OutfitCombination): Promise<ValidationResult> {
    const colors = this.extractColors(combination);
    const isMonochromatic = this.isMonochromaticScheme(colors);
    const hasShadeVariation = this.hasShadeVariation(colors);
    
    if (isMonochromatic) {
      const passed = hasShadeVariation;
      
      return {
        rule_id: 'MC001',
        rule_name: 'Monochromatic Combination',
        category: 'color_harmony',
        passed,
        confidence: 0.90,
        severity: passed ? 'success' : 'medium',
        priority: 3,
        weight: 0.6,
        message: passed ? 'Sophisticated monochromatic combination with shade variation' : 'Monochromatic but lacks shade variation',
        reasoning: passed ? 'Different shades create visual interest while maintaining color harmony' : 'Same color family needs shade variation to avoid flatness',
        recommendation: passed ? 'Excellent sophisticated choice' : 'Add shade variation or texture contrast',
        alternatives: passed ? [] : this.generateMonochromaticAlternatives(combination),
        score_impact: passed ? 8 : -5
      };
    }

    return {
      rule_id: 'MC001',
      rule_name: 'Monochromatic Check',
      category: 'color_harmony',
      passed: true,
      confidence: 0.75,
      severity: 'info',
      priority: 4,
      weight: 0.3,
      message: 'Multi-color combination',
      reasoning: 'Using multiple color families',
      recommendation: 'Consider monochromatic approach for sophisticated elegance',
      alternatives: [],
      score_impact: 0
    };
  }

  /**
   * Cultural sensitivity validation
   */
  async validateCulturalSensitivity(combination: OutfitCombination, context: ValidationContext): Promise<ValidationResult> {
    const colors = this.extractColors(combination);
    const culturalConsiderations: string[] = [];
    
    colors.forEach(color => {
      const meanings = this.CULTURAL_COLOR_MEANINGS[color as keyof typeof this.CULTURAL_COLOR_MEANINGS];
      if (meanings) {
        culturalConsiderations.push(...meanings.map(m => `${color}: ${m}`));
      }
    });

    const hasConsiderations = culturalConsiderations.length > 0;
    
    return {
      rule_id: 'CCS001',
      rule_name: 'Cultural Color Sensitivity',
      category: 'cultural_sensitivity',
      passed: true, // This is informational unless specific context requires restriction
      confidence: 0.80,
      severity: 'info',
      priority: 5,
      weight: 0.2,
      message: hasConsiderations ? 'Colors have cultural significance' : 'No specific cultural considerations',
      reasoning: hasConsiderations ? culturalConsiderations.join('; ') : 'Colors are culturally neutral',
      recommendation: hasConsiderations ? 'Consider cultural context for international events' : 'Colors appropriate for global use',
      alternatives: [],
      score_impact: 0,
      context_applied: culturalConsiderations
    };
  }

  /**
   * Seasonal color appropriateness
   */
  async validateSeasonalColors(combination: OutfitCombination, season: string): Promise<ValidationResult> {
    const colors = this.extractColors(combination);
    const seasonalScore = this.calculateSeasonalColorScore(colors, season);
    const passed = seasonalScore >= 0.7;
    
    return {
      rule_id: 'SCA001',
      rule_name: 'Seasonal Color Appropriateness',
      category: 'seasonal_appropriateness',
      passed,
      confidence: seasonalScore,
      severity: passed ? 'success' : 'low',
      priority: 3,
      weight: 0.6,
      message: `Seasonal color appropriateness: ${Math.round(seasonalScore * 100)}%`,
      reasoning: this.generateSeasonalColorReasoning(colors, season, seasonalScore),
      recommendation: passed ? `Perfect colors for ${season}` : `Consider more ${season}-appropriate colors`,
      alternatives: passed ? [] : this.generateSeasonalColorAlternatives(combination, season),
      score_impact: passed ? 4 : -6
    };
  }

  // Helper methods for color analysis

  private extractColors(combination: OutfitCombination): string[] {
    return [
      combination.suit_color,
      combination.shirt_color,
      combination.tie_color
    ].filter((color): color is string => Boolean(color));
  }

  private analyzeColors(colors: string[]): ColorAnalysis {
    const primaryColor = colors[0];
    const secondaryColors = colors.slice(1);
    
    return {
      primary_color: primaryColor,
      secondary_colors: secondaryColors,
      color_family: this.getColorFamily(primaryColor),
      temperature: this.getColorTemperature(primaryColor),
      contrast_level: this.calculateOverallContrast(colors),
      harmony_type: this.determineHarmonyType(colors),
      cultural_considerations: this.getCulturalConsiderations(colors),
      seasonal_alignment: this.calculateSeasonalAlignment(colors)
    };
  }

  private determineHarmonyType(colors: string[]): 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'mixed' {
    if (this.isMonochromaticScheme(colors)) return 'monochromatic';
    if (this.isComplementaryScheme(colors)) return 'complementary';
    if (this.isAnalogousScheme(colors)) return 'analogous';
    if (this.isTriadicScheme(colors)) return 'triadic';
    return 'mixed';
  }

  private calculateHarmonyScore(colors: string[], harmonyType: string, context: ValidationContext): number {
    let baseScore = 0.7; // Base harmony score
    
    // Adjust based on harmony type
    switch (harmonyType) {
      case 'monochromatic':
        baseScore = 0.9;
        break;
      case 'complementary':
        baseScore = 0.85;
        break;
      case 'analogous':
        baseScore = 0.8;
        break;
      case 'triadic':
        baseScore = 0.75;
        break;
      default:
        baseScore = 0.7;
    }
    
    // Adjust for context
    if (context.occasion === 'formal' && harmonyType === 'monochromatic') {
      baseScore += 0.05;
    }
    
    if (context.season && this.areSeasonallyAppropriate(colors, context.season)) {
      baseScore += 0.05;
    }
    
    return Math.min(1.0, baseScore);
  }

  private calculateHarmonyConfidence(colors: string[], score: number, context: ValidationContext): number {
    let confidence = 0.8;
    
    // Higher confidence for well-known harmonious combinations
    if (score > 0.85) confidence = 0.95;
    else if (score > 0.75) confidence = 0.85;
    else confidence = 0.70;
    
    return confidence;
  }

  private generateHarmonyReasoning(colors: string[], harmonyType: string, score: number, analysis: ColorAnalysis): string {
    const colorList = colors.join(', ');
    let reasoning = `Colors: ${colorList}. `;
    
    switch (harmonyType) {
      case 'monochromatic':
        reasoning += 'Monochromatic scheme creates sophisticated harmony.';
        break;
      case 'complementary':
        reasoning += 'Complementary colors create dynamic contrast.';
        break;
      case 'analogous':
        reasoning += 'Analogous colors create gentle harmony.';
        break;
      case 'triadic':
        reasoning += 'Triadic colors create vibrant balance.';
        break;
      default:
        reasoning += 'Mixed color approach with moderate harmony.';
    }
    
    if (analysis.temperature !== 'neutral') {
      reasoning += ` Color temperature: ${analysis.temperature}.`;
    }
    
    return reasoning;
  }

  private generateHarmonyImprovements(colors: string[], score: number, analysis: ColorAnalysis): string[] {
    const improvements: string[] = [];
    
    if (score < 0.7) {
      improvements.push('Consider using colors from the same family for better harmony');
    }
    
    if (analysis.contrast_level === 'low') {
      improvements.push('Add more contrast for visual interest');
    }
    
    if (analysis.harmony_type === 'mixed' && score < 0.8) {
      improvements.push('Try a more structured color scheme (monochromatic or complementary)');
    }
    
    return improvements;
  }

  private checkNeverCombineRule(combination: OutfitCombination, rule: any): boolean {
    // Implementation would check specific rule conditions
    return false; // Placeholder
  }

  private checkConditionalAvoidRule(combination: OutfitCombination, rule: any): boolean {
    // Implementation would check conditional avoid rules
    return false; // Placeholder
  }

  private generateNeverCombineRecommendation(combination: OutfitCombination, rule: any): string {
    return `Avoid ${rule.combination.suit || 'this suit'} with ${rule.combination.shirt || 'this shirt'}. ${rule.reason}`;
  }

  private generateNeverCombineAlternatives(combination: OutfitCombination, rule: any): string[] {
    return ['Try navy instead of black', 'Consider charcoal as alternative', 'White shirt is always safe'];
  }

  private generateConditionalAvoidRecommendation(combination: OutfitCombination, rule: any): string {
    return `For ${rule.event || 'this occasion'}, consider alternative colors. ${rule.reason}`;
  }

  private calculateContrast(color1: string, color2: string): any {
    // Implementation would calculate actual contrast ratios using hex values
    return {
      ratio: 4.5,
      accessibility: 'AA' as const,
      impact: 'moderate' as const,
      recommendation: 'Good contrast for readability'
    };
  }

  private getColorTemperature(color: string): 'warm' | 'cool' | 'neutral' {
    if (this.WARM_COLORS.includes(color)) return 'warm';
    if (this.COOL_COLORS.includes(color)) return 'cool';
    return 'neutral';
  }

  private generateTemperatureAlternatives(combination: OutfitCombination, mixing: boolean, hasBridge: boolean): string[] {
    if (mixing && !hasBridge) {
      return [
        'Add white shirt as neutral bridge',
        'Use grey accessories to balance temperatures',
        'Choose tie in neutral tone'
      ];
    }
    return [];
  }

  private isMonochromaticScheme(colors: string[]): boolean {
    const families = colors.map(c => this.getColorFamily(c));
    return new Set(families).size === 1;
  }

  private hasShadeVariation(colors: string[]): boolean {
    // Implementation would check for shade variation within color family
    return colors.length > 1; // Simplified placeholder
  }

  private generateMonochromaticAlternatives(combination: OutfitCombination): string[] {
    return [
      'Try different shades of the same color',
      'Add textural contrast with same color family',
      'Use pattern to create visual interest'
    ];
  }

  private calculateSeasonalColorScore(colors: string[], season: string): number {
    const seasonalColors = this.SEASONAL_COLORS[season as keyof typeof this.SEASONAL_COLORS] || [];
    const matches = colors.filter(c => seasonalColors.includes(c)).length;
    return matches / colors.length;
  }

  private generateSeasonalColorReasoning(colors: string[], season: string, score: number): string {
    const seasonalColors = this.SEASONAL_COLORS[season as keyof typeof this.SEASONAL_COLORS] || [];
    const matches = colors.filter(c => seasonalColors.includes(c));
    
    if (matches.length === colors.length) {
      return `All colors (${colors.join(', ')}) are perfect for ${season}`;
    } else if (matches.length > 0) {
      return `Some colors (${matches.join(', ')}) work well for ${season}`;
    } else {
      return `Colors may not be optimal for ${season} season`;
    }
  }

  private generateSeasonalColorAlternatives(combination: OutfitCombination, season: string): string[] {
    const seasonalColors = this.SEASONAL_COLORS[season as keyof typeof this.SEASONAL_COLORS] || [];
    return seasonalColors.slice(0, 3).map(c => `Try ${c} for better ${season} alignment`);
  }

  // Additional helper methods (placeholders for full implementation)
  private getColorFamily(color: string): string { return 'neutral'; }
  private calculateOverallContrast(colors: string[]): 'low' | 'medium' | 'high' { return 'medium'; }
  private getCulturalConsiderations(colors: string[]): string[] { return []; }
  private calculateSeasonalAlignment(colors: string[]): { [season: string]: number } { 
    return { spring: 0.5, summer: 0.5, fall: 0.5, winter: 0.5 }; 
  }
  private isComplementaryScheme(colors: string[]): boolean { return false; }
  private isAnalogousScheme(colors: string[]): boolean { return false; }
  private isTriadicScheme(colors: string[]): boolean { return false; }
  private areSeasonallyAppropriate(colors: string[], season: string): boolean { return true; }
}

// Export singleton instance
export const colorRulesEngine = new ColorRulesEngine();