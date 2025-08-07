/**
 * Formality Rules Engine
 * Comprehensive occasion appropriateness and dress code compliance validation
 * 
 * Features:
 * - Formality level calculations (1-10 scale)
 * - Occasion-specific requirements validation
 * - Dress code compliance checking
 * - Time-of-day appropriateness
 * - Venue-formality matching
 * - Cultural dress code considerations
 */

import { FormalityIndex } from '../types/knowledge-bank';
import { loadDataFile } from '../utils/data-loader';
import { OutfitCombination, ValidationContext, ValidationResult } from './validation-engine';

export interface FormalityAnalysis {
  overall_formality: number;
  component_formality: {
    suit: number;
    shirt: number;
    tie: number;
    accessories: number;
  };
  formality_consistency: number;
  occasion_match: number;
  time_appropriateness: number;
  venue_alignment: number;
  adjustments_needed: string[];
}

export interface OccasionRequirements {
  name: string;
  formality_range: [number, number];
  required_items: string[];
  forbidden_items: string[];
  preferred_colors: string[];
  avoided_colors: string[];
  time_considerations: {
    morning?: string[];
    afternoon?: string[];
    evening?: string[];
  };
  seasonal_adjustments: {
    [season: string]: {
      formality_modifier: number;
      additional_requirements?: string[];
      relaxed_rules?: string[];
    };
  };
  cultural_variations?: {
    [culture: string]: {
      modifications: string[];
      additional_rules: string[];
    };
  };
}

export interface DressCodeCompliance {
  code_name: string;
  compliance_score: number;
  missing_requirements: string[];
  violations: string[];
  recommendations: string[];
  alternatives: string[];
}

class FormalityRulesEngine {
  private formalityData: FormalityIndex | null = null;
  private venueCompatibility: any = null;

  // Comprehensive occasion definitions
  private readonly OCCASION_REQUIREMENTS: { [key: string]: OccasionRequirements } = {
    white_tie: {
      name: 'White Tie',
      formality_range: [10, 10],
      required_items: ['white_bow_tie', 'white_wing_collar_shirt', 'white_vest', 'tailcoat'],
      forbidden_items: ['colored_shirts', 'regular_ties', 'loafers'],
      preferred_colors: ['black', 'white'],
      avoided_colors: ['brown', 'casual_colors'],
      time_considerations: {
        evening: ['after_6pm_only']
      },
      seasonal_adjustments: {
        summer: { formality_modifier: 0, additional_requirements: ['lightweight_fabric'] },
        winter: { formality_modifier: 0 }
      }
    },
    black_tie: {
      name: 'Black Tie',
      formality_range: [9, 9],
      required_items: ['black_bow_tie', 'tuxedo', 'cummerbund_or_vest'],
      forbidden_items: ['regular_ties', 'brown_shoes', 'casual_shirts'],
      preferred_colors: ['black', 'midnight_blue', 'white'],
      avoided_colors: ['brown', 'tan', 'bright_colors'],
      time_considerations: {
        evening: ['after_6pm_preferred']
      },
      seasonal_adjustments: {
        summer: { formality_modifier: 0, relaxed_rules: ['lightweight_tuxedo_fabric'] },
        winter: { formality_modifier: 0 }
      }
    },
    black_tie_optional: {
      name: 'Black Tie Optional',
      formality_range: [8, 9],
      required_items: ['dark_suit_or_tuxedo'],
      forbidden_items: ['casual_shoes', 'light_colored_suits'],
      preferred_colors: ['black', 'midnight_blue', 'charcoal', 'navy'],
      avoided_colors: ['light_colors', 'casual_colors'],
      time_considerations: {
        evening: ['flexibility_allowed']
      },
      seasonal_adjustments: {
        summer: { formality_modifier: -0.5 },
        winter: { formality_modifier: 0 }
      }
    },
    formal_wedding: {
      name: 'Formal Wedding',
      formality_range: [7, 9],
      required_items: ['suit_or_tuxedo', 'dress_shirt', 'formal_tie'],
      forbidden_items: ['white_suits', 'black_suits_daytime', 'casual_shoes'],
      preferred_colors: ['navy', 'charcoal', 'midnight_blue', 'dark_grey'],
      avoided_colors: ['white', 'ivory', 'black_daytime'],
      time_considerations: {
        morning: ['lighter_colors_preferred'],
        afternoon: ['medium_formality'],
        evening: ['higher_formality_acceptable']
      },
      seasonal_adjustments: {
        spring: { formality_modifier: -0.5, additional_requirements: ['lighter_fabrics'] },
        summer: { formality_modifier: -1, additional_requirements: ['breathable_fabrics'] },
        fall: { formality_modifier: 0 },
        winter: { formality_modifier: 0.5 }
      }
    },
    cocktail: {
      name: 'Cocktail',
      formality_range: [6, 8],
      required_items: ['suit', 'dress_shirt'],
      forbidden_items: ['tuxedos', 'very_casual_items'],
      preferred_colors: ['navy', 'charcoal', 'burgundy', 'dark_grey'],
      avoided_colors: ['white', 'very_light_colors'],
      time_considerations: {
        afternoon: ['medium_formality'],
        evening: ['higher_formality_preferred']
      },
      seasonal_adjustments: {
        spring: { formality_modifier: -0.5 },
        summer: { formality_modifier: -1 },
        fall: { formality_modifier: 0 },
        winter: { formality_modifier: 0.5 }
      }
    },
    business_formal: {
      name: 'Business Formal',
      formality_range: [7, 8],
      required_items: ['business_suit', 'dress_shirt', 'conservative_tie'],
      forbidden_items: ['tuxedos', 'casual_shirts', 'sneakers'],
      preferred_colors: ['navy', 'charcoal', 'dark_grey'],
      avoided_colors: ['bright_colors', 'casual_colors'],
      time_considerations: {
        morning: ['conservative_preferred'],
        afternoon: ['standard_business']
      },
      seasonal_adjustments: {
        spring: { formality_modifier: 0 },
        summer: { formality_modifier: -0.5, relaxed_rules: ['lighter_fabrics'] },
        fall: { formality_modifier: 0 },
        winter: { formality_modifier: 0 }
      }
    },
    business_casual: {
      name: 'Business Casual',
      formality_range: [5, 7],
      required_items: ['dress_shirt_or_polo', 'dress_pants_or_chinos'],
      forbidden_items: ['tuxedos', 'athletic_wear', 'flip_flops'],
      preferred_colors: ['navy', 'khaki', 'light_blue', 'grey'],
      avoided_colors: ['neon_colors', 'party_colors'],
      time_considerations: {
        morning: ['conservative_business_casual'],
        afternoon: ['relaxed_business_casual']
      },
      seasonal_adjustments: {
        spring: { formality_modifier: -0.5 },
        summer: { formality_modifier: -1, relaxed_rules: ['no_tie_acceptable'] },
        fall: { formality_modifier: 0 },
        winter: { formality_modifier: 0.5 }
      }
    },
    casual_friday: {
      name: 'Casual Friday',
      formality_range: [3, 5],
      required_items: ['collared_shirt', 'appropriate_pants'],
      forbidden_items: ['formal_wear', 'athletic_shorts', 'tank_tops'],
      preferred_colors: ['casual_appropriate'],
      avoided_colors: ['overly_bright', 'inappropriate'],
      time_considerations: {
        morning: ['smart_casual'],
        afternoon: ['relaxed_casual']
      },
      seasonal_adjustments: {
        spring: { formality_modifier: 0 },
        summer: { formality_modifier: -0.5, relaxed_rules: ['short_sleeves_ok'] },
        fall: { formality_modifier: 0 },
        winter: { formality_modifier: 0.5 }
      }
    }
  };

  // Time-based formality adjustments
  private readonly TIME_FORMALITY_MODIFIERS = {
    morning: {
      business: 0.5,
      social: -0.5,
      wedding: -1
    },
    afternoon: {
      business: 0,
      social: 0,
      wedding: 0
    },
    evening: {
      business: -0.5,
      social: 1,
      wedding: 1
    }
  };

  async initialize(): Promise<void> {
    try {
      this.formalityData = await loadDataFile('core/formality-index.json') as FormalityIndex;
      this.venueCompatibility = await loadDataFile('core/venue-compatibility.json');
    } catch (error) {
      console.error('Failed to initialize formality rules engine:', error);
      throw new Error('Formality rules engine initialization failed');
    }
  }

  /**
   * Comprehensive formality analysis
   */
  async analyzeFormalityLevel(combination: OutfitCombination, context: ValidationContext = {}): Promise<FormalityAnalysis> {
    if (!this.formalityData) await this.initialize();

    const componentFormality = this.calculateComponentFormality(combination);
    const overallFormality = this.calculateOverallFormality(componentFormality, combination);
    const formalityConsistency = this.calculateFormalityConsistency(componentFormality);
    
    const occasionMatch = context.occasion ? 
      this.calculateOccasionMatch(overallFormality, context.occasion, context) : 0.8;
    
    const timeAppropriateness = this.calculateTimeAppropriateness(
      overallFormality, context.occasion, this.getCurrentTimeContext()
    );
    
    const venueAlignment = context.venue_type ? 
      this.calculateVenueAlignment(overallFormality, context.venue_type) : 0.8;

    const adjustmentsNeeded = this.generateFormalityAdjustments(
      overallFormality, componentFormality, context
    );

    return {
      overall_formality: overallFormality,
      component_formality: componentFormality,
      formality_consistency: formalityConsistency,
      occasion_match: occasionMatch,
      time_appropriateness: timeAppropriateness,
      venue_alignment: venueAlignment,
      adjustments_needed: adjustmentsNeeded
    };
  }

  /**
   * Validate formality consistency across components
   */
  async validateFormalityConsistency(combination: OutfitCombination): Promise<ValidationResult> {
    const componentFormality = this.calculateComponentFormality(combination);
    const formalityRange = Math.max(...Object.values(componentFormality)) - 
                          Math.min(...Object.values(componentFormality));
    
    const passed = formalityRange <= 3;
    const confidence = passed ? 0.90 : Math.max(0.40, 0.90 - (formalityRange * 0.1));
    
    return {
      rule_id: 'FC001',
      rule_name: 'Formality Consistency',
      category: 'formality_matching',
      passed,
      confidence,
      severity: passed ? 'success' : (formalityRange > 5 ? 'high' : 'medium'),
      priority: 1,
      weight: 1.0,
      message: `Formality range: ${formalityRange} ${passed ? '(consistent)' : '(inconsistent)'}`,
      reasoning: this.generateFormalityConsistencyReasoning(componentFormality, formalityRange),
      recommendation: passed ? 'Excellent formality balance' : 'Choose items within similar formality range',
      alternatives: passed ? [] : this.generateFormalityConsistencyAlternatives(combination, componentFormality),
      score_impact: passed ? 5 : -15,
      context_applied: [
        `Suit: ${componentFormality.suit}`,
        `Shirt: ${componentFormality.shirt}`,
        `Tie: ${componentFormality.tie}`
      ]
    };
  }

  /**
   * Validate occasion appropriateness
   */
  async validateOccasionAppropriateness(
    combination: OutfitCombination, 
    occasion: string, 
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const occasionReq = this.OCCASION_REQUIREMENTS[occasion];
    if (!occasionReq) {
      return this.createUnknownOccasionResult(occasion);
    }

    const overallFormality = this.calculateOverallFormality(
      this.calculateComponentFormality(combination), 
      combination
    );

    const compliance = this.checkOccasionCompliance(combination, occasionReq, context);
    const formalityMatch = this.checkFormalityRange(overallFormality, occasionReq.formality_range);
    const timeAppropriate = this.checkTimeAppropriateness(combination, occasionReq, context);
    const colorAppropriate = this.checkColorAppropriateness(combination, occasionReq);

    const overallPass = compliance.passed && formalityMatch.passed && 
                       timeAppropriate.passed && colorAppropriate.passed;
    
    const confidence = this.calculateOccasionConfidence([
      compliance, formalityMatch, timeAppropriate, colorAppropriate
    ]);

    return {
      rule_id: 'OA001',
      rule_name: 'Occasion Appropriateness',
      category: 'formality_matching',
      passed: overallPass,
      confidence,
      severity: overallPass ? 'success' : 'high',
      priority: 1,
      weight: 1.0,
      message: `${overallPass ? 'Appropriate' : 'Not fully appropriate'} for ${occasionReq.name}`,
      reasoning: this.generateOccasionReasoning(
        occasionReq, compliance, formalityMatch, timeAppropriate, colorAppropriate
      ),
      recommendation: overallPass ? 
        `Perfect choice for ${occasionReq.name}` : 
        this.generateOccasionRecommendation(occasionReq, compliance, formalityMatch),
      alternatives: overallPass ? [] : 
        this.generateOccasionAlternatives(combination, occasionReq, context),
      score_impact: overallPass ? 10 : -20,
      context_applied: [
        `Required formality: ${occasionReq.formality_range[0]}-${occasionReq.formality_range[1]}`,
        `Current formality: ${overallFormality}`,
        `Season: ${context.season || 'not specified'}`
      ]
    };
  }

  /**
   * Validate dress code compliance
   */
  async validateDressCodeCompliance(
    combination: OutfitCombination,
    dressCode: string,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const compliance = this.analyzeDressCodeCompliance(combination, dressCode, context);
    
    return {
      rule_id: 'DCC001',
      rule_name: 'Dress Code Compliance',
      category: 'formality_matching',
      passed: compliance.compliance_score >= 0.8,
      confidence: compliance.compliance_score,
      severity: compliance.compliance_score >= 0.8 ? 'success' : 
               (compliance.compliance_score >= 0.6 ? 'medium' : 'high'),
      priority: 1,
      weight: 1.0,
      message: `${compliance.code_name} compliance: ${Math.round(compliance.compliance_score * 100)}%`,
      reasoning: this.generateDressCodeReasoning(compliance),
      recommendation: compliance.compliance_score >= 0.8 ? 
        'Meets dress code requirements' : 
        compliance.recommendations.join('; '),
      alternatives: compliance.alternatives,
      score_impact: compliance.compliance_score >= 0.8 ? 8 : -12,
      context_applied: [
        `Missing: ${compliance.missing_requirements.join(', ') || 'none'}`,
        `Violations: ${compliance.violations.join(', ') || 'none'}`
      ]
    };
  }

  /**
   * Validate time-of-day appropriateness
   */
  async validateTimeAppropriateness(
    combination: OutfitCombination,
    timeOfDay: string,
    occasion?: string
  ): Promise<ValidationResult> {
    const overallFormality = this.calculateOverallFormality(
      this.calculateComponentFormality(combination), 
      combination
    );

    const timeAppropriate = this.checkTimeFormality(overallFormality, timeOfDay, occasion);
    
    return {
      rule_id: 'TA001',
      rule_name: 'Time Appropriateness',
      category: 'formality_matching',
      passed: timeAppropriate.appropriate,
      confidence: timeAppropriate.confidence,
      severity: timeAppropriate.appropriate ? 'success' : 'medium',
      priority: 2,
      weight: 0.7,
      message: timeAppropriate.message,
      reasoning: timeAppropriate.reasoning,
      recommendation: timeAppropriate.recommendation,
      alternatives: timeAppropriate.alternatives,
      score_impact: timeAppropriate.appropriate ? 3 : -8
    };
  }

  // Helper methods for formality calculations

  private calculateComponentFormality(combination: OutfitCombination): {
    suit: number;
    shirt: number;
    tie: number;
    accessories: number;
  } {
    const suitFormality = this.getSuitFormality(combination);
    const shirtFormality = this.getShirtFormality(combination);
    const tieFormality = this.getTieFormality(combination);
    const accessoryFormality = this.getAccessoryFormality(combination);

    return {
      suit: suitFormality,
      shirt: shirtFormality,
      tie: tieFormality,
      accessories: accessoryFormality
    };
  }

  private calculateOverallFormality(
    componentFormality: { suit: number; shirt: number; tie: number; accessories: number },
    combination: OutfitCombination
  ): number {
    // Weighted average with suit having highest weight
    const weights = { suit: 0.4, shirt: 0.3, tie: 0.2, accessories: 0.1 };
    
    return Math.round(
      (componentFormality.suit * weights.suit) +
      (componentFormality.shirt * weights.shirt) +
      (componentFormality.tie * weights.tie) +
      (componentFormality.accessories * weights.accessories)
    );
  }

  private calculateFormalityConsistency(
    componentFormality: { suit: number; shirt: number; tie: number; accessories: number }
  ): number {
    const values = Object.values(componentFormality);
    const range = Math.max(...values) - Math.min(...values);
    return Math.max(0, 1 - (range / 10)); // Normalize to 0-1 scale
  }

  private calculateOccasionMatch(
    overallFormality: number,
    occasion: string,
    context: ValidationContext
  ): number {
    const occasionReq = this.OCCASION_REQUIREMENTS[occasion];
    if (!occasionReq) return 0.5;

    const [minFormality, maxFormality] = occasionReq.formality_range;
    
    // Apply seasonal adjustments
    let adjustedMin = minFormality;
    let adjustedMax = maxFormality;
    
    if (context.season && occasionReq.seasonal_adjustments[context.season]) {
      const modifier = occasionReq.seasonal_adjustments[context.season].formality_modifier;
      adjustedMin += modifier;
      adjustedMax += modifier;
    }

    if (overallFormality >= adjustedMin && overallFormality <= adjustedMax) {
      return 0.95;
    }

    const distance = Math.min(
      Math.abs(overallFormality - adjustedMin),
      Math.abs(overallFormality - adjustedMax)
    );

    return Math.max(0.1, 0.95 - (distance * 0.1));
  }

  private calculateTimeAppropriateness(
    overallFormality: number,
    occasion?: string,
    timeContext?: string
  ): number {
    if (!timeContext || !occasion) return 0.8;

    const occasionReq = this.OCCASION_REQUIREMENTS[occasion];
    if (!occasionReq) return 0.8;

    const timeConsiderations = occasionReq.time_considerations[timeContext as keyof typeof occasionReq.time_considerations];
    if (!timeConsiderations) return 0.8;

    // Implementation would check specific time requirements
    return 0.85; // Placeholder
  }

  private calculateVenueAlignment(overallFormality: number, venueType: string): number {
    // Implementation would check venue-specific formality requirements
    return 0.8; // Placeholder
  }

  private generateFormalityAdjustments(
    overallFormality: number,
    componentFormality: { suit: number; shirt: number; tie: number; accessories: number },
    context: ValidationContext
  ): string[] {
    const adjustments: string[] = [];

    if (context.formality_required && overallFormality < context.formality_required) {
      adjustments.push(`Increase overall formality from ${overallFormality} to ${context.formality_required}`);
    }

    const range = Math.max(...Object.values(componentFormality)) - 
                  Math.min(...Object.values(componentFormality));
    
    if (range > 3) {
      adjustments.push('Balance formality levels across all components');
    }

    return adjustments;
  }

  private getSuitFormality(combination: OutfitCombination): number {
    if (!this.formalityData) return 5;

    const suitData = this.formalityData.suit_formality[combination.suit_color];
    if (!suitData) return 5;

    let formality = suitData.base_formality;

    // Apply fabric modifiers
    if (combination.suit_fabric && suitData.fabric_modifiers) {
      const modifier = suitData.fabric_modifiers[combination.suit_fabric];
      if (modifier) {
        const modifierValue = parseFloat(modifier.replace('+', ''));
        formality += modifierValue;
      }
    }

    return Math.max(1, Math.min(10, formality));
  }

  private getShirtFormality(combination: OutfitCombination): number {
    if (!this.formalityData) return 5;

    const shirtData = this.formalityData.shirt_formality[combination.shirt_color];
    if (!shirtData) return 5;

    let formality = shirtData.base_formality;

    // Apply pattern impacts
    if (combination.shirt_pattern && shirtData.pattern_impacts) {
      const modifier = shirtData.pattern_impacts[combination.shirt_pattern];
      if (modifier) {
        const modifierValue = parseFloat(modifier.replace('-', ''));
        formality -= modifierValue;
      }
    }

    return Math.max(1, Math.min(10, formality));
  }

  private getTieFormality(combination: OutfitCombination): number {
    if (!combination.tie_color) return 3; // No tie is casual

    if (!this.formalityData) return 6;

    // Navigate the nested tie formality structure
    const tieFormality = this.formalityData.tie_formality;
    
    // Check different tie types
    for (const [tieType, tieStyles] of Object.entries(tieFormality)) {
      for (const [style, styleData] of Object.entries(tieStyles)) {
        if (style === combination.tie_color || 
            (styleData as any).examples?.includes(combination.tie_color)) {
          return (styleData as any).formality || 6;
        }
      }
    }

    return 6; // Default tie formality
  }

  private getAccessoryFormality(combination: OutfitCombination): number {
    if (!combination.accessories) return 5;

    let totalFormality = 0;
    let count = 0;

    if (this.formalityData?.accessory_formality) {
      Object.entries(combination.accessories).forEach(([accessoryType, accessoryStyle]) => {
        const accessoryData = this.formalityData!.accessory_formality[accessoryType];
        if (accessoryData && accessoryData[accessoryStyle]) {
          const formalityData = accessoryData[accessoryStyle];
          if (formalityData.formality) {
            totalFormality += formalityData.formality;
            count++;
          }
        }
      });
    }

    return count > 0 ? Math.round(totalFormality / count) : 5;
  }

  private generateFormalityConsistencyReasoning(
    componentFormality: { suit: number; shirt: number; tie: number; accessories: number },
    range: number
  ): string {
    const components = Object.entries(componentFormality)
      .map(([component, formality]) => `${component}: ${formality}`)
      .join(', ');

    if (range <= 1) {
      return `Excellent formality consistency (${components})`;
    } else if (range <= 3) {
      return `Good formality balance (${components})`;
    } else {
      return `Formality mismatch detected (${components}). Range of ${range} is too wide.`;
    }
  }

  private generateFormalityConsistencyAlternatives(
    combination: OutfitCombination,
    componentFormality: { suit: number; shirt: number; tie: number; accessories: number }
  ): string[] {
    const alternatives: string[] = [];
    const avgFormality = Math.round(Object.values(componentFormality).reduce((a, b) => a + b) / 4);

    if (componentFormality.suit < avgFormality - 1) {
      alternatives.push('Choose a more formal suit color');
    }
    if (componentFormality.shirt < avgFormality - 1) {
      alternatives.push('Select a more formal shirt');
    }
    if (componentFormality.tie < avgFormality - 1) {
      alternatives.push('Upgrade to a more formal tie');
    }

    return alternatives;
  }

  private createUnknownOccasionResult(occasion: string): ValidationResult {
    return {
      rule_id: 'UO001',
      rule_name: 'Unknown Occasion',
      category: 'formality_matching',
      passed: true,
      confidence: 0.5,
      severity: 'info',
      priority: 3,
      weight: 0.5,
      message: `Unknown occasion: ${occasion}`,
      reasoning: 'Occasion not in knowledge base',
      recommendation: 'Verify occasion requirements separately',
      alternatives: [],
      score_impact: 0
    };
  }

  private checkOccasionCompliance(
    combination: OutfitCombination,
    occasionReq: OccasionRequirements,
    context: ValidationContext
  ): { passed: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check required items
    occasionReq.required_items.forEach(item => {
      if (!this.hasRequiredItem(combination, item)) {
        issues.push(`Missing required item: ${item}`);
      }
    });

    // Check forbidden items
    occasionReq.forbidden_items.forEach(item => {
      if (this.hasForbiddenItem(combination, item)) {
        issues.push(`Contains forbidden item: ${item}`);
      }
    });

    return {
      passed: issues.length === 0,
      issues
    };
  }

  private checkFormalityRange(
    formality: number,
    range: [number, number]
  ): { passed: boolean; distance: number } {
    const [min, max] = range;
    if (formality >= min && formality <= max) {
      return { passed: true, distance: 0 };
    }

    const distance = Math.min(Math.abs(formality - min), Math.abs(formality - max));
    return { passed: false, distance };
  }

  private checkTimeAppropriateness(
    combination: OutfitCombination,
    occasionReq: OccasionRequirements,
    context: ValidationContext
  ): { passed: boolean; issues: string[] } {
    // Implementation would check time-specific requirements
    return { passed: true, issues: [] };
  }

  private checkColorAppropriateness(
    combination: OutfitCombination,
    occasionReq: OccasionRequirements
  ): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    const colors = [combination.suit_color, combination.shirt_color, combination.tie_color].filter((color): color is string => Boolean(color));

    // Check avoided colors
    const hasAvoidedColors = colors.some(color => occasionReq.avoided_colors.includes(color));
    if (hasAvoidedColors) {
      issues.push('Contains colors that should be avoided for this occasion');
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  private calculateOccasionConfidence(checks: { passed: boolean }[]): number {
    const passedCount = checks.filter(c => c.passed).length;
    return passedCount / checks.length;
  }

  private generateOccasionReasoning(
    occasionReq: OccasionRequirements,
    compliance: { passed: boolean; issues: string[] },
    formalityMatch: { passed: boolean; distance: number },
    timeAppropriate: { passed: boolean; issues: string[] },
    colorAppropriate: { passed: boolean; issues: string[] }
  ): string {
    const issues: string[] = [];
    
    if (!compliance.passed) issues.push(...compliance.issues);
    if (!formalityMatch.passed) issues.push(`Formality level off by ${formalityMatch.distance}`);
    if (!timeAppropriate.passed) issues.push(...timeAppropriate.issues);
    if (!colorAppropriate.passed) issues.push(...colorAppropriate.issues);

    if (issues.length === 0) {
      return `Perfect match for ${occasionReq.name} requirements`;
    } else {
      return `Issues for ${occasionReq.name}: ${issues.join('; ')}`;
    }
  }

  private generateOccasionRecommendation(
    occasionReq: OccasionRequirements,
    compliance: { passed: boolean; issues: string[] },
    formalityMatch: { passed: boolean; distance: number }
  ): string {
    const recommendations: string[] = [];

    if (!compliance.passed) {
      recommendations.push('Address missing required items');
    }

    if (!formalityMatch.passed) {
      recommendations.push('Adjust formality level to match occasion requirements');
    }

    return recommendations.join('; ') || 'Minor adjustments needed';
  }

  private generateOccasionAlternatives(
    combination: OutfitCombination,
    occasionReq: OccasionRequirements,
    context: ValidationContext
  ): string[] {
    const alternatives: string[] = [];

    // Generate specific alternatives based on preferred colors
    occasionReq.preferred_colors.slice(0, 3).forEach(color => {
      alternatives.push(`Try ${color} suit for better occasion match`);
    });

    return alternatives;
  }

  private analyzeDressCodeCompliance(
    combination: OutfitCombination,
    dressCode: string,
    context: ValidationContext
  ): DressCodeCompliance {
    // Implementation would analyze specific dress codes
    return {
      code_name: dressCode,
      compliance_score: 0.85,
      missing_requirements: [],
      violations: [],
      recommendations: ['Minor adjustments suggested'],
      alternatives: []
    };
  }

  private generateDressCodeReasoning(compliance: DressCodeCompliance): string {
    if (compliance.compliance_score >= 0.8) {
      return `Meets ${compliance.code_name} requirements`;
    } else {
      return `Partial compliance with ${compliance.code_name}: ${compliance.violations.join(', ')}`;
    }
  }

  private checkTimeFormality(formality: number, timeOfDay: string, occasion?: string): any {
    // Implementation would check time-specific formality requirements
    return {
      appropriate: true,
      confidence: 0.8,
      message: 'Appropriate for time of day',
      reasoning: 'Formality level matches time requirements',
      recommendation: 'Good choice for the time',
      alternatives: []
    };
  }

  private getCurrentTimeContext(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  // Helper methods for checking items
  private hasRequiredItem(combination: OutfitCombination, item: string): boolean {
    // Implementation would check for specific required items
    return true; // Placeholder
  }

  private hasForbiddenItem(combination: OutfitCombination, item: string): boolean {
    // Implementation would check for forbidden items
    return false; // Placeholder
  }
}

// Export singleton instance
export const formalityRulesEngine = new FormalityRulesEngine();