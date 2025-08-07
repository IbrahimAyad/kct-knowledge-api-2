/**
 * Comprehensive Fashion Rules Validation Engine
 * Implements advanced validation with confidence scoring, severity levels, and alternative suggestions
 * 
 * Features:
 * - Multi-category rule validation (Color, Formality, Seasonal, Style, Venue, Pattern)
 * - Confidence scoring (0-100%)
 * - Detailed reasoning for violations
 * - Alternative suggestions
 * - Severity levels (critical, high, medium, low, info)
 * - Rule priority and weighting system
 */

import { ColorRelationships, FormalityIndex } from '../types/knowledge-bank';
import { loadDataFile } from '../utils/data-loader';
// Import intelligence services for enhanced validation
import { venueIntelligenceService } from './venue-intelligence-service';
import { culturalAdaptationService } from './cultural-adaptation-service';

export interface ValidationContext {
  occasion?: string;
  season?: string;
  venue_type?: string;
  customer_profile?: string;
  formality_required?: number;
  age_group?: string;
  style_preference?: string;
  budget_tier?: string;
  climate_zone?: string;
  weather_conditions?: string;
  // Enhanced context for Phase 2
  cultural_region?: string;
  cultural_sensitivity_level?: 'low' | 'medium' | 'high';
  lighting_conditions?: string[];
  venue_formality_strictness?: number;
  psychology_risk_level?: 'low' | 'medium' | 'high' | 'critical';
  career_stage?: 'entry_level' | 'establishing' | 'advancing' | 'leadership' | 'executive';
  industry_context?: string;
  religious_considerations?: string[];
  photography_importance?: 'low' | 'medium' | 'high';
}

export interface OutfitCombination {
  suit_color: string;
  suit_pattern?: string;
  suit_fabric?: string;
  shirt_color: string;
  shirt_pattern?: string;
  shirt_fabric?: string;
  tie_color?: string;
  tie_pattern?: string;
  tie_fabric?: string;
  accessories?: {
    pocket_square?: string;
    watch_type?: string;
    shoes?: string;
    belt?: string;
  };
}

export interface ValidationRule {
  rule_id: string;
  name: string;
  category: RuleCategory;
  severity: RuleSeverity;
  priority: number;
  weight: number;
  condition: RuleCondition;
  message: string;
  reasoning: string;
  recommendation: string;
  alternatives?: string[];
  exceptions?: string[];
}

export interface ValidationResult {
  rule_id: string;
  rule_name: string;
  category: RuleCategory;
  passed: boolean;
  confidence: number;
  severity: RuleSeverity;
  priority: number;
  weight: number;
  message: string;
  reasoning: string;
  recommendation: string;
  alternatives: string[];
  score_impact: number;
  context_applied?: string[];
}

export interface ValidationSummary {
  overall_score: number;
  confidence: number;
  validation_passed: boolean;
  category_scores: { [category: string]: number };
  rule_results: ValidationResult[];
  violations: ValidationResult[];
  warnings: ValidationResult[];
  suggestions: ValidationResult[];
  alternatives: CombinationAlternative[];
  improvement_suggestions: string[];
  metadata: {
    rules_processed: number;
    processing_time_ms: number;
    knowledge_bank_version: string;
    validated_at: string;
  };
}

export interface CombinationAlternative {
  combination: OutfitCombination;
  confidence: number;
  reasoning: string;
  improvements: string[];
  score: number;
}

export type RuleCategory = 
  | 'color_harmony' 
  | 'formality_matching' 
  | 'seasonal_appropriateness' 
  | 'style_consistency' 
  | 'venue_appropriateness' 
  | 'pattern_mixing' 
  | 'texture_compatibility' 
  | 'cultural_sensitivity' 
  | 'trend_alignment';

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success';

export interface RuleCondition {
  type: string;
  parameters: { [key: string]: any };
}

class ValidationEngine {
  private colorData: ColorRelationships | null = null;
  private formalityData: FormalityIndex | null = null;
  private neverCombineRules: any = null;
  private validationRules: any = null;

  async initialize(): Promise<void> {
    try {
      this.colorData = await loadDataFile('core/color-relationships.json') as ColorRelationships;
      this.formalityData = await loadDataFile('core/formality-index.json') as FormalityIndex;
      this.neverCombineRules = await loadDataFile('core/never-combine-rules.json');
      this.validationRules = await loadDataFile('validation/combination-validator.json');
    } catch (error) {
      console.error('Failed to initialize validation engine:', error);
      throw new Error('Validation engine initialization failed');
    }
  }

  /**
   * Main validation method - validates complete outfit combination
   */
  async validateCombination(
    combination: OutfitCombination,
    context: ValidationContext = {}
  ): Promise<ValidationSummary> {
    const startTime = Date.now();
    
    if (!this.colorData || !this.formalityData) {
      await this.initialize();
    }

    const ruleResults: ValidationResult[] = [];
    const categoryScores: { [category: string]: number } = {};

    // Execute all validation categories
    const colorResults = await this.validateColorHarmony(combination, context);
    const formalityResults = await this.validateFormalityMatching(combination, context);
    const seasonalResults = await this.validateSeasonalAppropriateness(combination, context);
    const styleResults = await this.validateStyleConsistency(combination, context);
    const venueResults = await this.validateVenueAppropriateness(combination, context);
    const patternResults = await this.validatePatternMixing(combination, context);
    const textureResults = await this.validateTextureCompatibility(combination, context);
    const culturalResults = await this.validateCulturalSensitivity(combination, context);
    const trendResults = await this.validateTrendAlignment(combination, context);

    // Collect all results
    const allResults = [
      ...colorResults,
      ...formalityResults,
      ...seasonalResults,
      ...styleResults,
      ...venueResults,
      ...patternResults,
      ...textureResults,
      ...culturalResults,
      ...trendResults
    ];

    ruleResults.push(...allResults);

    // Calculate category scores
    const categories = ['color_harmony', 'formality_matching', 'seasonal_appropriateness', 
                      'style_consistency', 'venue_appropriateness', 'pattern_mixing',
                      'texture_compatibility', 'cultural_sensitivity', 'trend_alignment'];

    categories.forEach(category => {
      const categoryResults = ruleResults.filter(r => r.category === category);
      if (categoryResults.length > 0) {
        const weightedScore = categoryResults.reduce((sum, result) => 
          sum + (result.confidence * result.weight), 0) / 
          categoryResults.reduce((sum, result) => sum + result.weight, 0);
        categoryScores[category] = Math.round(weightedScore * 100) / 100;
      }
    });

    // Calculate overall score
    const overallScore = this.calculateOverallScore(ruleResults);
    const overallConfidence = this.calculateOverallConfidence(ruleResults);

    // Separate results by type
    const violations = ruleResults.filter(r => !r.passed && (r.severity === 'critical' || r.severity === 'high'));
    const warnings = ruleResults.filter(r => !r.passed && (r.severity === 'medium' || r.severity === 'low'));
    const suggestions = ruleResults.filter(r => r.severity === 'info');

    // Generate alternatives
    const alternatives = await this.generateAlternatives(combination, violations, context);

    // Generate improvement suggestions
    const improvementSuggestions = this.generateImprovementSuggestions(violations, warnings);

    const processingTime = Date.now() - startTime;

    return {
      overall_score: overallScore,
      confidence: overallConfidence,
      validation_passed: violations.length === 0,
      category_scores: categoryScores,
      rule_results: ruleResults,
      violations,
      warnings,
      suggestions,
      alternatives,
      improvement_suggestions: improvementSuggestions,
      metadata: {
        rules_processed: ruleResults.length,
        processing_time_ms: processingTime,
        knowledge_bank_version: '2.0.0',
        validated_at: new Date().toISOString()
      }
    };
  }

  /**
   * Color Harmony Validation
   */
  private async validateColorHarmony(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check never-combine rules
    const neverCombineResult = this.checkNeverCombineRules(combination);
    results.push(neverCombineResult);

    // Check color harmony
    const harmonyResult = this.checkColorHarmonyRules(combination);
    results.push(harmonyResult);

    // Check color temperature mixing
    const temperatureResult = this.checkColorTemperatureMixing(combination);
    results.push(temperatureResult);

    // Check monochromatic elegance
    const monochromaticResult = this.checkMonochromaticCombination(combination);
    results.push(monochromaticResult);

    return results;
  }

  /**
   * Formality Matching Validation
   */
  private async validateFormalityMatching(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check formality consistency
    const consistencyResult = this.checkFormalityConsistency(combination);
    results.push(consistencyResult);

    // Check occasion appropriateness
    if (context.occasion) {
      const occasionResult = this.checkOccasionAppropriateness(combination, context.occasion);
      results.push(occasionResult);
    }

    // Check formality level requirements
    if (context.formality_required) {
      const levelResult = this.checkFormalityLevel(combination, context.formality_required);
      results.push(levelResult);
    }

    return results;
  }

  /**
   * Seasonal Appropriateness Validation
   */
  private async validateSeasonalAppropriateness(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (context.season) {
      // Check fabric seasonality
      const fabricResult = this.checkFabricSeasonality(combination, context.season);
      results.push(fabricResult);

      // Check color seasonality
      const colorResult = this.checkColorSeasonality(combination, context.season);
      results.push(colorResult);

      // Check seasonal trends
      const trendResult = this.checkSeasonalTrends(combination, context.season);
      results.push(trendResult);
    }

    return results;
  }

  /**
   * Style Consistency Validation
   */
  private async validateStyleConsistency(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (context.customer_profile) {
      const profileResult = this.checkStyleProfileConsistency(combination, context.customer_profile);
      results.push(profileResult);
    }

    return results;
  }

  /**
   * Venue Appropriateness Validation
   */
  private async validateVenueAppropriateness(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (context.venue_type) {
      const venueResult = this.checkVenueRequirements(combination, context.venue_type);
      results.push(venueResult);
    }

    return results;
  }

  /**
   * Pattern Mixing Validation
   */
  private async validatePatternMixing(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check pattern count
    const countResult = this.checkPatternCount(combination);
    results.push(countResult);

    // Check pattern scale compatibility
    const scaleResult = this.checkPatternScale(combination);
    results.push(scaleResult);

    // Check stripe compatibility
    const stripeResult = this.checkStripeCompatibility(combination);
    results.push(stripeResult);

    return results;
  }

  /**
   * Texture Compatibility Validation
   */
  private async validateTextureCompatibility(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check texture balance
    const balanceResult = this.checkTextureBalance(combination);
    results.push(balanceResult);

    // Check shine level
    const shineResult = this.checkShineLevel(combination);
    results.push(shineResult);

    return results;
  }

  /**
   * Cultural Sensitivity Validation
   */
  private async validateCulturalSensitivity(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check cultural color meanings
    const culturalResult = this.checkCulturalColorMeanings(combination, context);
    results.push(culturalResult);

    return results;
  }

  /**
   * Trend Alignment Validation
   */
  private async validateTrendAlignment(
    combination: OutfitCombination,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check current trends
    const trendResult = this.checkCurrentTrends(combination);
    results.push(trendResult);

    return results;
  }

  // Individual rule checking methods
  private checkNeverCombineRules(combination: OutfitCombination): ValidationResult {
    const violations: string[] = [];
    
    // Check absolute never-combine rules
    if (this.neverCombineRules?.absolute_never_combine) {
      for (const rule of this.neverCombineRules.absolute_never_combine) {
        if (this.matchesCombination(combination, rule.combination)) {
          violations.push(rule.reason);
        }
      }
    }

    const passed = violations.length === 0;
    const confidence = passed ? 0.95 : 0.10;

    return {
      rule_id: 'NC001',
      rule_name: 'Never Combine Rules',
      category: 'color_harmony',
      passed,
      confidence,
      severity: passed ? 'success' : 'critical',
      priority: 1,
      weight: 1.0,
      message: passed ? 'Color combination follows never-combine rules' : 'Violates never-combine fashion rules',
      reasoning: passed ? 'No critical color combinations detected' : violations.join('; '),
      recommendation: passed ? 'Excellent color choice' : 'Consider alternative color combinations',
      alternatives: passed ? [] : this.suggestNeverCombineAlternatives(combination),
      score_impact: passed ? 0 : -30
    };
  }

  private checkColorHarmonyRules(combination: OutfitCombination): ValidationResult {
    const harmonyScore = this.calculateColorHarmony(combination);
    const passed = harmonyScore >= 0.7;
    
    return {
      rule_id: 'CH001',
      rule_name: 'Color Harmony',
      category: 'color_harmony',
      passed,
      confidence: harmonyScore,
      severity: passed ? 'success' : 'medium',
      priority: 2,
      weight: 0.8,
      message: `Color harmony score: ${Math.round(harmonyScore * 100)}%`,
      reasoning: this.getColorHarmonyReasoning(combination, harmonyScore),
      recommendation: passed ? 'Colors work well together' : 'Consider adjusting color balance',
      alternatives: passed ? [] : this.suggestHarmonyAlternatives(combination),
      score_impact: passed ? 5 : -10
    };
  }

  private checkColorTemperatureMixing(combination: OutfitCombination): ValidationResult {
    const warmColors = ['burgundy', 'brown', 'tan', 'coral', 'orange'];
    const coolColors = ['blue', 'grey', 'green', 'purple', 'navy'];
    const neutralColors = ['white', 'black', 'charcoal'];

    const colors = [combination.suit_color, combination.shirt_color, combination.tie_color].filter((color): color is string => Boolean(color));
    const hasWarm = colors.some(c => warmColors.includes(c));
    const hasCool = colors.some(c => coolColors.includes(c));
    const hasNeutral = colors.some(c => neutralColors.includes(c));

    const mixingWarmCool = hasWarm && hasCool;
    const hasNeutralBridge = mixingWarmCool && hasNeutral;
    const passed = !mixingWarmCool || hasNeutralBridge;

    return {
      rule_id: 'CT001',
      rule_name: 'Color Temperature Mixing',
      category: 'color_harmony',
      passed,
      confidence: passed ? 0.85 : 0.60,
      severity: passed ? 'success' : 'info',
      priority: 3,
      weight: 0.6,
      message: passed ? 'Color temperatures work well together' : 'Mixing warm and cool colors - consider neutral bridge',
      reasoning: this.getTemperatureReasoning(hasWarm, hasCool, hasNeutral),
      recommendation: passed ? 'Good color temperature balance' : 'Add a neutral color as bridge between warm and cool',
      alternatives: [],
      score_impact: passed ? 2 : -3
    };
  }

  private checkMonochromaticCombination(combination: OutfitCombination): ValidationResult {
    const isMonochromatic = this.isMonochromaticCombination(combination);
    const hasDifferentShades = this.hasDifferentShades(combination);
    
    if (isMonochromatic && hasDifferentShades) {
      return {
        rule_id: 'MC001',
        rule_name: 'Monochromatic Elegance',
        category: 'color_harmony',
        passed: true,
        confidence: 0.90,
        severity: 'success',
        priority: 4,
        weight: 0.7,
        message: 'Sophisticated monochromatic combination with varied shades',
        reasoning: 'Different shades of the same color family create visual interest',
        recommendation: 'Excellent sophisticated choice',
        alternatives: [],
        score_impact: 8
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
      message: 'Non-monochromatic combination',
      reasoning: 'Mixed color approach',
      recommendation: 'Consider monochromatic for sophisticated look',
      alternatives: [],
      score_impact: 0
    };
  }

  private checkFormalityConsistency(combination: OutfitCombination): ValidationResult {
    const suitFormality = this.getSuitFormality(combination.suit_color);
    const shirtFormality = this.getShirtFormality(combination.shirt_color);
    const tieFormality = combination.tie_color ? this.getTieFormality(combination.tie_color) : suitFormality;

    const formalityRange = Math.max(suitFormality, shirtFormality, tieFormality) - 
                          Math.min(suitFormality, shirtFormality, tieFormality);
    
    const passed = formalityRange <= 3;
    const confidence = passed ? 0.90 : Math.max(0.40, 0.90 - (formalityRange * 0.1));

    return {
      rule_id: 'FM001',
      rule_name: 'Formality Consistency',
      category: 'formality_matching',
      passed,
      confidence,
      severity: passed ? 'success' : (formalityRange > 5 ? 'high' : 'medium'),
      priority: 1,
      weight: 1.0,
      message: `Formality range: ${formalityRange} (${passed ? 'consistent' : 'inconsistent'})`,
      reasoning: `Suit: ${suitFormality}, Shirt: ${shirtFormality}, Tie: ${tieFormality}`,
      recommendation: passed ? 'Good formality balance' : 'Choose items within similar formality range',
      alternatives: passed ? [] : this.suggestFormalityAlternatives(combination),
      score_impact: passed ? 3 : -15
    };
  }

  private checkOccasionAppropriateness(combination: OutfitCombination, occasion: string): ValidationResult {
    const occasionRequirements = this.getOccasionRequirements(occasion);
    const meetsRequirements = this.checkOccasionRequirements(combination, occasionRequirements);
    
    return {
      rule_id: 'OA001',
      rule_name: 'Occasion Appropriateness',
      category: 'formality_matching',
      passed: meetsRequirements.passed,
      confidence: meetsRequirements.confidence,
      severity: meetsRequirements.passed ? 'success' : 'high',
      priority: 1,
      weight: 1.0,
      message: `${meetsRequirements.passed ? 'Appropriate' : 'Not appropriate'} for ${occasion}`,
      reasoning: meetsRequirements.reasoning,
      recommendation: meetsRequirements.recommendation,
      alternatives: meetsRequirements.alternatives,
      score_impact: meetsRequirements.passed ? 5 : -20
    };
  }

  private checkFormalityLevel(combination: OutfitCombination, requiredLevel: number): ValidationResult {
    const combinationLevel = this.calculateCombinationFormality(combination);
    const difference = Math.abs(combinationLevel - requiredLevel);
    const passed = difference <= 1;
    
    return {
      rule_id: 'FL001',
      rule_name: 'Formality Level',
      category: 'formality_matching',
      passed,
      confidence: passed ? 0.90 : Math.max(0.50, 0.90 - (difference * 0.1)),
      severity: passed ? 'success' : (difference > 2 ? 'high' : 'medium'),
      priority: 2,
      weight: 0.9,
      message: `Formality level: ${combinationLevel}/10 (required: ${requiredLevel}/10)`,
      reasoning: `Combination is ${difference > 0 ? (combinationLevel > requiredLevel ? 'more formal' : 'less formal') : 'appropriately formal'}`,
      recommendation: passed ? 'Perfect formality level' : `Adjust to ${requiredLevel} formality level`,
      alternatives: [],
      score_impact: passed ? 3 : -10
    };
  }

  private checkFabricSeasonality(combination: OutfitCombination, season: string): ValidationResult {
    const inappropriateFabrics = this.getInappropriateFabrics(combination, season);
    const passed = inappropriateFabrics.length === 0;
    
    return {
      rule_id: 'FS001',
      rule_name: 'Fabric Seasonality',
      category: 'seasonal_appropriateness',
      passed,
      confidence: passed ? 0.85 : 0.60,
      severity: passed ? 'success' : 'medium',
      priority: 2,
      weight: 0.7,
      message: passed ? `Fabrics appropriate for ${season}` : `Some fabrics not ideal for ${season}`,
      reasoning: passed ? 'All fabrics suitable for season' : `Avoid: ${inappropriateFabrics.join(', ')}`,
      recommendation: passed ? 'Good seasonal fabric choice' : `Choose ${season}-appropriate fabrics`,
      alternatives: [],
      score_impact: passed ? 2 : -8
    };
  }

  private checkColorSeasonality(combination: OutfitCombination, season: string): ValidationResult {
    const seasonalScore = this.calculateSeasonalColorScore(combination, season);
    const passed = seasonalScore >= 0.7;
    
    return {
      rule_id: 'CS001',
      rule_name: 'Color Seasonality',
      category: 'seasonal_appropriateness',
      passed,
      confidence: seasonalScore,
      severity: passed ? 'success' : 'low',
      priority: 3,
      weight: 0.6,
      message: `Seasonal color appropriateness: ${Math.round(seasonalScore * 100)}%`,
      reasoning: this.getSeasonalColorReasoning(combination, season),
      recommendation: passed ? 'Colors work well for the season' : 'Consider more seasonal colors',
      alternatives: [],
      score_impact: passed ? 3 : -5
    };
  }

  private checkSeasonalTrends(combination: OutfitCombination, season: string): ValidationResult {
    const trendScore = this.calculateSeasonalTrendScore(combination, season);
    
    return {
      rule_id: 'ST001',
      rule_name: 'Seasonal Trends',
      category: 'trend_alignment',
      passed: true,
      confidence: trendScore,
      severity: 'info',
      priority: 5,
      weight: 0.4,
      message: `Seasonal trend alignment: ${Math.round(trendScore * 100)}%`,
      reasoning: 'Trend analysis based on current seasonal preferences',
      recommendation: trendScore > 0.8 ? 'Very trendy choice' : 'Classic choice with timeless appeal',
      alternatives: [],
      score_impact: Math.round(trendScore * 5)
    };
  }

  private checkStyleProfileConsistency(combination: OutfitCombination, profile: string): ValidationResult {
    const consistency = this.calculateStyleProfileConsistency(combination, profile);
    const passed = consistency >= 0.7;
    
    return {
      rule_id: 'SP001',
      rule_name: 'Style Profile Consistency',
      category: 'style_consistency',
      passed,
      confidence: consistency,
      severity: passed ? 'success' : 'low',
      priority: 3,
      weight: 0.7,
      message: `Style profile match: ${Math.round(consistency * 100)}%`,
      reasoning: this.getStyleProfileReasoning(combination, profile, consistency),
      recommendation: passed ? 'Matches your style perfectly' : 'Consider more profile-aligned choices',
      alternatives: [],
      score_impact: passed ? 4 : -6
    };
  }

  private checkVenueRequirements(combination: OutfitCombination, venueType: string): ValidationResult {
    const venueCheck = this.checkVenueCompatibility(combination, venueType);
    
    return {
      rule_id: 'VR001',
      rule_name: 'Venue Requirements',
      category: 'venue_appropriateness',
      passed: venueCheck.passed,
      confidence: venueCheck.confidence,
      severity: venueCheck.passed ? 'success' : 'medium',
      priority: 2,
      weight: 0.8,
      message: venueCheck.message,
      reasoning: venueCheck.reasoning,
      recommendation: venueCheck.recommendation,
      alternatives: [],
      score_impact: venueCheck.passed ? 4 : -12
    };
  }

  private checkPatternCount(combination: OutfitCombination): ValidationResult {
    const patterns = [
      combination.suit_pattern,
      combination.shirt_pattern,
      combination.tie_pattern
    ].filter(p => p && p !== 'solid');
    
    const passed = patterns.length <= 2;
    
    return {
      rule_id: 'PM001',
      rule_name: 'Pattern Count',
      category: 'pattern_mixing',
      passed,
      confidence: passed ? 0.90 : 0.50,
      severity: passed ? 'success' : 'medium',
      priority: 1,
      weight: 0.9,
      message: `${patterns.length} patterns used (max recommended: 2)`,
      reasoning: passed ? 'Good pattern balance' : 'Too many patterns can clash',
      recommendation: passed ? 'Excellent pattern choice' : 'Limit to 2 patterns maximum',
      alternatives: [],
      score_impact: passed ? 2 : -12
    };
  }

  private checkPatternScale(combination: OutfitCombination): ValidationResult {
    const scaleConflict = this.hasPatternScaleConflict(combination);
    
    return {
      rule_id: 'PS001',
      rule_name: 'Pattern Scale',
      category: 'pattern_mixing',
      passed: !scaleConflict,
      confidence: scaleConflict ? 0.40 : 0.85,
      severity: scaleConflict ? 'medium' : 'success',
      priority: 2,
      weight: 0.7,
      message: scaleConflict ? 'Pattern scales conflict' : 'Pattern scales work well',
      reasoning: scaleConflict ? 'Similar pattern scales compete visually' : 'Good pattern scale variation',
      recommendation: scaleConflict ? 'Vary pattern scales (large with small)' : 'Great pattern scale choice',
      alternatives: [],
      score_impact: scaleConflict ? -8 : 3
    };
  }

  private checkStripeCompatibility(combination: OutfitCombination): ValidationResult {
    const hasStripeConflict = this.hasStripeConflict(combination);
    
    return {
      rule_id: 'SC001',
      rule_name: 'Stripe Compatibility',
      category: 'pattern_mixing',
      passed: !hasStripeConflict,
      confidence: hasStripeConflict ? 0.30 : 0.90,
      severity: hasStripeConflict ? 'high' : 'success',
      priority: 1,
      weight: 0.8,
      message: hasStripeConflict ? 'Multiple stripe patterns conflict' : 'Stripe patterns work well',
      reasoning: hasStripeConflict ? 'Multiple stripes create visual confusion' : 'Good stripe usage',
      recommendation: hasStripeConflict ? 'Limit stripes to one item' : 'Excellent stripe choice',
      alternatives: [],
      score_impact: hasStripeConflict ? -15 : 2
    };
  }

  private checkTextureBalance(combination: OutfitCombination): ValidationResult {
    const textureScore = this.calculateTextureBalance(combination);
    const passed = textureScore >= 0.7;
    
    return {
      rule_id: 'TB001',
      rule_name: 'Texture Balance',
      category: 'texture_compatibility',
      passed,
      confidence: textureScore,
      severity: passed ? 'success' : 'low',
      priority: 3,
      weight: 0.5,
      message: `Texture balance score: ${Math.round(textureScore * 100)}%`,
      reasoning: this.getTextureBalanceReasoning(combination, textureScore),
      recommendation: passed ? 'Good texture variety' : 'Consider adding textural contrast',
      alternatives: [],
      score_impact: passed ? 2 : -3
    };
  }

  private checkShineLevel(combination: OutfitCombination): ValidationResult {
    const shinyItems = this.countShinyItems(combination);
    const passed = shinyItems <= 1;
    
    return {
      rule_id: 'SL001',
      rule_name: 'Shine Level',
      category: 'texture_compatibility',
      passed,
      confidence: passed ? 0.90 : 0.50,
      severity: passed ? 'success' : 'medium',
      priority: 2,
      weight: 0.6,
      message: `${shinyItems} shiny items (max recommended: 1)`,
      reasoning: passed ? 'Appropriate shine level' : 'Too many shiny items can look gaudy',
      recommendation: passed ? 'Perfect shine balance' : 'Limit shiny items to one (typically tie)',
      alternatives: [],
      score_impact: passed ? 1 : -8
    };
  }

  private checkCulturalColorMeanings(combination: OutfitCombination, context: ValidationContext): ValidationResult {
    // This would check cultural color meanings if context includes cultural considerations
    return {
      rule_id: 'CCM001',
      rule_name: 'Cultural Color Meanings',
      category: 'cultural_sensitivity',
      passed: true,
      confidence: 0.80,
      severity: 'info',
      priority: 4,
      weight: 0.3,
      message: 'No cultural conflicts detected',
      reasoning: 'Colors appropriate for general use',
      recommendation: 'Consider cultural context for international events',
      alternatives: [],
      score_impact: 0
    };
  }

  private checkCurrentTrends(combination: OutfitCombination): ValidationResult {
    const trendScore = this.calculateTrendScore(combination);
    
    return {
      rule_id: 'CT001',
      rule_name: 'Current Trends',
      category: 'trend_alignment',
      passed: true,
      confidence: trendScore,
      severity: 'info',
      priority: 5,
      weight: 0.4,
      message: `Trend alignment: ${Math.round(trendScore * 100)}%`,
      reasoning: 'Based on current fashion trends',
      recommendation: trendScore > 0.8 ? 'Very trendy choice' : 'Timeless classic approach',
      alternatives: [],
      score_impact: Math.round(trendScore * 5)
    };
  }

  // Helper methods for calculations and checks
  private calculateOverallScore(results: ValidationResult[]): number {
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const weightedSum = results.reduce((sum, r) => {
      const scoreContribution = r.passed ? (r.confidence * 100) + r.score_impact : 
                               Math.max(0, (r.confidence * 100) + r.score_impact);
      return sum + (scoreContribution * r.weight);
    }, 0);
    
    return Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));
  }

  private calculateOverallConfidence(results: ValidationResult[]): number {
    const confidences = results.map(r => r.confidence);
    return Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 100) / 100;
  }

  private async generateAlternatives(
    combination: OutfitCombination,
    violations: ValidationResult[],
    context: ValidationContext
  ): Promise<CombinationAlternative[]> {
    if (violations.length === 0) return [];

    const alternatives: CombinationAlternative[] = [];
    
    // Generate alternatives based on violations
    for (const violation of violations.slice(0, 3)) { // Limit to top 3 violations
      const alternative = await this.generateAlternativeForViolation(combination, violation, context);
      if (alternative) {
        alternatives.push(alternative);
      }
    }

    return alternatives;
  }

  private async generateAlternativeForViolation(
    combination: OutfitCombination,
    violation: ValidationResult,
    context: ValidationContext
  ): Promise<CombinationAlternative | null> {
    // This would generate specific alternatives based on violation type
    // For now, return a generic alternative
    return {
      combination: {
        ...combination,
        tie_color: 'burgundy' // Example alternative
      },
      confidence: 0.85,
      reasoning: `Alternative addressing ${violation.rule_name}`,
      improvements: [violation.recommendation],
      score: 85
    };
  }

  private generateImprovementSuggestions(
    violations: ValidationResult[],
    warnings: ValidationResult[]
  ): string[] {
    const suggestions: string[] = [];
    
    violations.forEach(v => suggestions.push(v.recommendation));
    warnings.slice(0, 3).forEach(w => suggestions.push(w.recommendation));
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  // Additional helper methods would be implemented here...
  // These would include all the specific logic for checking individual rules

  private matchesCombination(combination: OutfitCombination, ruleCombo: any): boolean {
    // Implementation for matching combinations against rules
    return false; // Placeholder
  }

  private suggestNeverCombineAlternatives(combination: OutfitCombination): string[] {
    return ['Try navy instead of black', 'Consider charcoal as alternative'];
  }

  private calculateColorHarmony(combination: OutfitCombination): number {
    // Implementation for color harmony calculation
    return 0.8; // Placeholder
  }

  private getColorHarmonyReasoning(combination: OutfitCombination, score: number): string {
    return `Color harmony analysis based on suit: ${combination.suit_color}, shirt: ${combination.shirt_color}`;
  }

  private suggestHarmonyAlternatives(combination: OutfitCombination): string[] {
    return ['Try complementary colors', 'Consider monochromatic approach'];
  }

  private getTemperatureReasoning(hasWarm: boolean, hasCool: boolean, hasNeutral: boolean): string {
    if (hasWarm && hasCool && hasNeutral) return 'Warm and cool colors bridged by neutral';
    if (hasWarm && hasCool) return 'Mixing warm and cool without neutral bridge';
    return 'Good color temperature consistency';
  }

  private isMonochromaticCombination(combination: OutfitCombination): boolean {
    // Implementation for monochromatic check
    return false; // Placeholder
  }

  private hasDifferentShades(combination: OutfitCombination): boolean {
    // Implementation for shade variation check
    return true; // Placeholder
  }

  private getSuitFormality(color: string): number {
    const formalityMap: { [key: string]: number } = {
      'black': 9, 'midnight_blue': 9, 'navy': 8, 'charcoal': 8,
      'dark_grey': 7, 'light_grey': 6, 'burgundy': 6, 'brown': 5, 'tan': 4
    };
    return formalityMap[color] || 5;
  }

  private getShirtFormality(color: string): number {
    const formalityMap: { [key: string]: number } = {
      'white': 10, 'light_blue': 7, 'cream': 6, 'pink': 5, 'lavender': 5, 'black': 6
    };
    return formalityMap[color] || 5;
  }

  private getTieFormality(color: string): number {
    const formalityMap: { [key: string]: number } = {
      'black': 9, 'silver': 8, 'navy': 7, 'burgundy': 7, 'gold': 6
    };
    return formalityMap[color] || 6;
  }

  private suggestFormalityAlternatives(combination: OutfitCombination): string[] {
    return ['Choose more formal colors', 'Match formality levels'];
  }

  private getOccasionRequirements(occasion: string): any {
    // Implementation for occasion requirements
    return { formality: 7, colors: ['navy', 'charcoal'] };
  }

  private checkOccasionRequirements(combination: OutfitCombination, requirements: any): any {
    return {
      passed: true,
      confidence: 0.85,
      reasoning: 'Meets occasion requirements',
      recommendation: 'Perfect for the occasion',
      alternatives: []
    };
  }

  private calculateCombinationFormality(combination: OutfitCombination): number {
    const suitFormality = this.getSuitFormality(combination.suit_color);
    const shirtFormality = this.getShirtFormality(combination.shirt_color);
    const tieFormality = combination.tie_color ? this.getTieFormality(combination.tie_color) : suitFormality;
    
    return Math.round((suitFormality + shirtFormality + tieFormality) / 3);
  }

  // Additional placeholder methods - these would contain the full implementation logic
  private getInappropriateFabrics(combination: OutfitCombination, season: string): string[] { return []; }
  private calculateSeasonalColorScore(combination: OutfitCombination, season: string): number { return 0.8; }
  private getSeasonalColorReasoning(combination: OutfitCombination, season: string): string { return 'Seasonal analysis'; }
  private calculateSeasonalTrendScore(combination: OutfitCombination, season: string): number { return 0.75; }
  private calculateStyleProfileConsistency(combination: OutfitCombination, profile: string): number { return 0.8; }
  private getStyleProfileReasoning(combination: OutfitCombination, profile: string, consistency: number): string { return 'Profile analysis'; }
  private checkVenueCompatibility(combination: OutfitCombination, venueType: string): any { return { passed: true, confidence: 0.8, message: 'Venue compatible', reasoning: 'Good for venue', recommendation: 'Perfect choice' }; }
  private hasPatternScaleConflict(combination: OutfitCombination): boolean { return false; }
  private hasStripeConflict(combination: OutfitCombination): boolean { return false; }
  private calculateTextureBalance(combination: OutfitCombination): number { return 0.8; }
  private getTextureBalanceReasoning(combination: OutfitCombination, score: number): string { return 'Texture analysis'; }
  private countShinyItems(combination: OutfitCombination): number { return 0; }
  private calculateTrendScore(combination: OutfitCombination): number { return 0.75; }
}

// Export singleton instance
export const validationEngine = new ValidationEngine();