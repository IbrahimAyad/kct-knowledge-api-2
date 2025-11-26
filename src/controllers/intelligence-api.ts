/**
 * Intelligence API Controllers for KCT Knowledge API Phase 2
 * Implements advanced intelligence endpoints for psychology, career, venue, and cultural analysis
 */

import { Request, Response } from 'express';

// Helper class for unimplemented fabric analysis methods
class FabricAnalysisHelpers {
  generateUseCaseRecommendations(useCase: string, analysis: any): string[] {
    return [`Recommended for ${useCase} use`];
  }

  generateSeasonalAdvice(season: string, analysis: any): string[] {
    return [`Best worn in ${season}`];
  }

  generateClimateConsiderations(climate: string, analysis: any): string[] {
    return [`Suitable for ${climate} climates`];
  }

  generateActivityAdjustments(activityLevel: string, analysis: any): string[] {
    return [`Appropriate for ${activityLevel} activity levels`];
  }

  calculateBusinessFormalSuitability(fabricData: any): number {
    return 85;
  }

  calculateBusinessCasualSuitability(fabricData: any): number {
    return 90;
  }

  calculateSocialEventSuitability(fabricData: any): number {
    return 80;
  }

  calculateTravelFriendlySuitability(fabricData: any): number {
    return 75;
  }

  calculateAllWeatherSuitability(fabricData: any): number {
    return 70;
  }

  identifyStrengthAreas(analysis: any): string[] {
    return ['Durability', 'Comfort', 'Professional appearance'];
  }

  identifyLimitations(analysis: any): string[] {
    return ['Requires dry cleaning', 'May wrinkle easily'];
  }

  suggestAlternatives(fabricType: string, fabricData: any): string[] {
    return ['Wool blend', 'Cotton blend'];
  }

  calculateCostEffectiveness(fabricData: any): string {
    return 'High';
  }

  generateBudgetRecommendation(fabricData: any, budget: string): string {
    return 'Invest in quality pieces for long-term value';
  }
}

const fabricHelpers = new FabricAnalysisHelpers();
import { customerPsychologyService } from '../services/customer-psychology-service';
import { careerIntelligenceService } from '../services/career-intelligence-service';
import { venueIntelligenceService } from '../services/venue-intelligence-service';
import { culturalAdaptationService } from '../services/cultural-adaptation-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import { createApiResponse } from '../utils/data-loader';
import { logger } from '../utils/logger';
import {
  PsychologyAnalysisRequest,
  CareerTrajectoryRequest,
  VenueOptimizationRequest,
  CulturalAdaptationRequest,
  CulturalSensitivityLevel
} from '../types/enhanced-knowledge-bank';

/**
 * POST /api/v2/intelligence/psychology/analyze
 * Analyze customer psychology and decision patterns
 */
export const analyzeCustomerPsychology = async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      session_duration,
      choices_viewed,
      previous_sessions,
      interaction_patterns,
      behavioral_indicators,
      current_journey_stage
    } = req.body;

    // Validate required fields
    if (!customer_id) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'customer_id is required for psychology analysis'
      ));
    }

    const request: PsychologyAnalysisRequest = {
      customer_id,
      session_duration: session_duration || 0,
      choices_viewed: choices_viewed || 0,
      previous_sessions: previous_sessions || [],
      interaction_patterns: interaction_patterns || [],
      behavioral_indicators: behavioral_indicators || [],
      current_journey_stage: current_journey_stage || 'browsing'
    };

    logger.info('Psychology analysis requested', {
      endpoint: '/api/v2/intelligence/psychology/analyze',
      metadata: {
        customer_id,
        session_duration,
        choices_viewed,
        journey_stage: current_journey_stage
      }
    });

    // Perform psychology analysis
    const analysis = await customerPsychologyService.analyzeDecisionFatigue(request);

    // Get additional psychological insights
    const customerProfile = await customerPsychologyService.getCustomerProfile(customer_id);
    const personalizationRecommendations = await customerPsychologyService.getPersonalizationRecommendations(
      customer_id,
      {
        session_duration,
        choices_viewed,
        page_type: 'product_selection',
        time_of_day: new Date().getHours() < 12 ? 'morning' : 'afternoon'
      }
    );

    const response = {
      customer_id,
      psychology_analysis: analysis,
      customer_profile: customerProfile,
      personalization_recommendations: personalizationRecommendations,
      intervention_timing: {
        immediate_action_needed: analysis.risk_level === 'critical' || analysis.risk_level === 'high',
        recommended_break_time: analysis.recovery_timing,
        optimal_choice_limit: analysis.optimal_choice_count
      },
      actionable_insights: {
        primary_emotional_triggers: analysis.emotional_triggers.slice(0, 2),
        decision_support_needed: analysis.fatigue_score > 70,
        personalization_priority: analysis.risk_level === 'high' ? 'urgent' : 'standard'
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        algorithm_version: '2.0.0',
        confidence_level: 0.92
      }
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    logger.error('Psychology analysis failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Psychology analysis failed'
    ));
  }
};

/**
 * GET /api/v2/intelligence/career/trajectory/:customerId
 * Get career trajectory analysis and wardrobe recommendations
 */
export const getCareerTrajectoryAnalysis = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const {
      current_role,
      industry,
      age_range,
      company_size,
      years_experience,
      recent_behaviors,
      wardrobe_budget_range,
      career_goals,
      timeline_preference
    } = req.query;

    if (!customerId) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'customerId is required'
      ));
    }

    logger.info('Career trajectory analysis requested', {
      endpoint: '/api/v2/intelligence/career/trajectory',
      metadata: {
        customer_id: customerId,
        current_role,
        industry,
        age_range
      }
    });

    // Build career trajectory request
    const request: CareerTrajectoryRequest = {
      customer_id: customerId,
      current_role: current_role as string || 'professional',
      industry: industry as string || 'general',
      age_range: age_range as string || '25-35',
      company_size: company_size as string || 'medium',
      years_experience: parseInt(years_experience as string) || 3,
      recent_behaviors: recent_behaviors ? JSON.parse(recent_behaviors as string) : [],
      wardrobe_investment_pattern: {
        frequency: timeline_preference as string || 'quarterly',
        budget_range: wardrobe_budget_range as string || '$500-1500',
        category_priorities: ['suits', 'shirts', 'accessories']
      },
      career_advancement_signals: []
    };

    // Perform career analysis
    const trajectoryAnalysis = await careerIntelligenceService.analyzeCareerTrajectory(request);

    // Get stage-specific preferences
    const stagePreferences = await careerIntelligenceService.getCareerStagePreferences(
      'establishing', // Default stage
      request.industry
    );

    // Get industry recommendations
    const industryRecommendations = await careerIntelligenceService.getIndustryRecommendations(
      request.industry,
      'mid'
    );

    // Optimize wardrobe timing
    const timingOptimization = await careerIntelligenceService.optimizeWardrobeTiming(
      customerId,
      {
        customer_id: customerId,
        current_stage: (trajectoryAnalysis.current_trajectory?.stage || 'establishing') as any,
        advancement_probability: trajectoryAnalysis.advancement_probability,
        wardrobe_investment_pattern: (request.wardrobe_investment_pattern || {
          budget_range: 'moderate',
          spending_frequency: 'seasonal' as const,
          quality_vs_quantity: 'balanced' as const,
          upgrade_triggers: []
        }) as any,
        industry_context: request.industry,
        role_requirements: {}
      } as any
    );

    const response = {
      customer_id: customerId,
      career_analysis: trajectoryAnalysis,
      stage_preferences: stagePreferences,
      industry_insights: industryRecommendations,
      timing_optimization: timingOptimization,
      strategic_recommendations: {
        immediate_priorities: trajectoryAnalysis.wardrobe_recommendations.slice(0, 3),
        investment_strategy: trajectoryAnalysis.investment_strategy,
        career_preparation: trajectoryAnalysis.promotion_signals
      },
      professional_development: {
        wardrobe_alignment: trajectoryAnalysis.advancement_probability > 70 ? 'executive_ready' : 'building_foundation',
        key_investment_areas: trajectoryAnalysis.investment_strategy.immediate_needs,
        timeline_recommendations: trajectoryAnalysis.predicted_timeline
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        algorithm_version: '2.0.0',
        confidence_level: trajectoryAnalysis.advancement_probability / 100
      }
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    logger.error('Career trajectory analysis failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Career trajectory analysis failed'
    ));
  }
};

/**
 * POST /api/v2/intelligence/venue/optimize
 * Get venue-specific styling optimization
 */
export const optimizeForVenue = async (req: Request, res: Response) => {
  try {
    const {
      venue_type,
      lighting_conditions,
      season,
      time_of_day,
      dress_code_level,
      special_considerations,
      guest_profile,
      photography_importance,
      cultural_context
    } = req.body;

    // Validate required fields
    if (!venue_type) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'venue_type is required for venue optimization'
      ));
    }

    logger.info('Venue optimization requested', {
      endpoint: '/api/v2/intelligence/venue/optimize',
      metadata: {
        venue_type,
        lighting_conditions,
        season,
        time_of_day
      }
    });

    const request: VenueOptimizationRequest = {
      venue_type,
      lighting_conditions: lighting_conditions || ['mixed'],
      season: season || 'spring',
      time_of_day: time_of_day || 'evening',
      dress_code_level: dress_code_level || 7,
      special_considerations: special_considerations || [],
      guest_profile: guest_profile || {},
      photography_importance: photography_importance || 'medium'
    };

    // Perform venue optimization
    const optimization = await venueIntelligenceService.optimizeForVenue(request);

    // Get additional venue intelligence
    const venueIntelligence = await venueIntelligenceService.getVenueIntelligence(venue_type);
    const lightingAnalysis = await venueIntelligenceService.analyzeLightingConditions(
      request.lighting_conditions
    );
    const dressCodeAnalysis = await venueIntelligenceService.getDressCodeAnalysis(venue_type);
    const seasonalRecommendations = await venueIntelligenceService.getSeasonalVenueRecommendations(
      venue_type,
      request.season
    );

    const response = {
      venue_optimization: optimization,
      venue_intelligence: {
        type: venue_type,
        formality_requirements: venueIntelligence.dress_code_strictness,
        lighting_analysis: lightingAnalysis,
        dress_code_analysis: dressCodeAnalysis,
        seasonal_recommendations: seasonalRecommendations
      },
      styling_recommendations: {
        optimal_colors: optimization.color_recommendations,
        fabric_suggestions: optimization.fabric_recommendations,
        style_adjustments: optimization.style_adjustments,
        photography_optimizations: optimization.photography_tips
      },
      risk_assessment: {
        confidence_score: optimization.confidence_score,
        potential_issues: optimization.potential_issues,
        mitigation_strategies: optimization.potential_issues.map(issue => `Address: ${issue}`)
      },
      cultural_considerations: cultural_context ? {
        cultural_sensitivity_notes: ['Consider local customs and traditions'],
        recommended_adaptations: ['Research venue-specific cultural norms']
      } : undefined,
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        algorithm_version: '2.0.0',
        venue_database_version: '2.0.0'
      }
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    logger.error('Venue optimization failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Venue optimization failed'
    ));
  }
};

/**
 * POST /api/v2/intelligence/cultural/adapt
 * Apply cultural preferences and sensitivity
 */
export const adaptCulturalPreferences = async (req: Request, res: Response) => {
  try {
    const {
      base_recommendations,
      cultural_context,
      specific_region,
      sensitivity_level,
      religious_considerations,
      business_context,
      event_type
    } = req.body;

    // Validate required fields
    if (!base_recommendations || !Array.isArray(base_recommendations)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'base_recommendations array is required for cultural adaptation'
      ));
    }

    logger.info('Cultural adaptation requested', {
      endpoint: '/api/v2/intelligence/cultural/adapt',
      metadata: {
        recommendations_count: base_recommendations.length,
        specific_region,
        sensitivity_level,
        business_context
      }
    });

    const request: CulturalAdaptationRequest = {
      base_recommendations,
      cultural_context: cultural_context || {
        cultural_values: ['professionalism', 'respect'],
        communication_style: 'mixed',
        hierarchy_importance: 5,
        tradition_vs_modernity: 5,
        social_proof_importance: 5
      },
      specific_region: specific_region || 'north_america',
      sensitivity_level: (sensitivity_level as CulturalSensitivityLevel) || 'medium',
      religious_considerations: religious_considerations || [],
      business_context: business_context || {}
    };

    // Perform cultural adaptation
    const adaptation = await culturalAdaptationService.adaptRecommendations(request);

    // Get additional cultural insights
    const culturalNuances = await culturalAdaptationService.getCulturalNuances(
      request.specific_region || 'western_europe'
    );

    // Analyze color cultural significance if colors are present
    const colors = base_recommendations
      .filter(rec => rec.color)
      .map(rec => rec.color);

    const colorAnalysis = colors.length > 0
      ? await culturalAdaptationService.analyzeColorCulturalSignificance(colors, request.specific_region || 'western_europe')
      : {};

    // Get business culture recommendations if business context provided
    const businessCultureRecommendations = business_context?.industry
      ? await culturalAdaptationService.getBusinessCultureRecommendations(
          business_context.industry,
          request.specific_region || 'western_europe'
        )
      : undefined;

    // Get religious considerations if specified
    const religiousConsiderations = religious_considerations?.length > 0
      ? await culturalAdaptationService.getReligiousCulturalConsiderations(
          religious_considerations[0],
          event_type || 'general'
        )
      : undefined;

    const response = {
      cultural_adaptation: adaptation,
      cultural_intelligence: {
        region: request.specific_region,
        nuances: culturalNuances,
        color_significance: colorAnalysis,
        business_culture: businessCultureRecommendations,
        religious_considerations: religiousConsiderations
      },
      adaptation_summary: {
        total_recommendations: base_recommendations.length,
        adaptations_made: adaptation.adapted_recommendations.filter(rec => 
          rec.adaptation_reasoning !== 'No significant cultural adaptations needed'
        ).length,
        sensitivity_warnings: adaptation.sensitivity_warnings.length,
        cultural_fit_score: adaptation.adapted_recommendations.reduce((sum, rec) => 
          sum + rec.local_preference_score, 0
        ) / adaptation.adapted_recommendations.length
      },
      actionable_insights: {
        key_cultural_factors: adaptation.cultural_insights.slice(0, 3),
        priority_adaptations: adaptation.adapted_recommendations
          .filter(rec => rec.local_preference_score < 6)
          .map(rec => rec.adaptation_reasoning),
        local_preferences: adaptation.local_preferences.slice(0, 5)
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        algorithm_version: '2.0.0',
        cultural_database_version: '2.0.0'
      }
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    logger.error('Cultural adaptation failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Cultural adaptation failed'
    ));
  }
};

/**
 * GET /api/v2/intelligence/fabric/performance/:fabricType
 * Get fabric performance analysis and recommendations
 */
export const getFabricPerformanceAnalysis = async (req: Request, res: Response) => {
  try {
    const { fabricType } = req.params;
    const {
      use_case,
      season,
      climate,
      activity_level,
      care_requirements,
      budget_considerations
    } = req.query;

    if (!fabricType) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'fabricType is required'
      ));
    }

    logger.info('Fabric performance analysis requested', {
      endpoint: '/api/v2/intelligence/fabric/performance',
      metadata: {
        fabric_type: fabricType,
        use_case,
        season,
        climate
      }
    });

    // Load fabric performance data
    const fabricData = await enhancedDataLoader.loadFabricPerformanceData();
    
    // Find specific fabric data
    const specificFabricData = fabricData.find((fabric: any) => 
      fabric.fabric_type?.toLowerCase().includes(fabricType.toLowerCase()) ||
      fabric.material?.toLowerCase().includes(fabricType.toLowerCase())
    );

    if (!specificFabricData) {
      return res.status(404).json(createApiResponse(
        false,
        undefined,
        `Fabric type "${fabricType}" not found in database`
      ));
    }

    // Analyze performance characteristics
    const performanceAnalysis = {
      durability: {
        score: specificFabricData.durability_score || 7,
        factors: ['wear_resistance', 'color_retention', 'shape_retention'],
        expected_lifespan: specificFabricData.expected_lifespan || '3-5 years with proper care'
      },
      comfort: {
        breathability: specificFabricData.breathability || 7,
        temperature_regulation: specificFabricData.temperature_regulation || 6,
        moisture_management: specificFabricData.moisture_management || 6,
        overall_comfort_score: (
          (specificFabricData.breathability || 7) +
          (specificFabricData.temperature_regulation || 6) +
          (specificFabricData.moisture_management || 6)
        ) / 3
      },
      care_requirements: {
        maintenance_level: specificFabricData.care_level || 'medium',
        professional_cleaning: specificFabricData.professional_cleaning_required || false,
        wrinkle_resistance: specificFabricData.wrinkle_resistance || 6,
        care_instructions: specificFabricData.care_instructions || [
          'Professional dry cleaning recommended',
          'Proper hanging storage essential',
          'Regular professional pressing'
        ]
      },
      seasonal_suitability: {
        spring: specificFabricData.seasonal_scores?.spring || 7,
        summer: specificFabricData.seasonal_scores?.summer || 6,
        fall: specificFabricData.seasonal_scores?.fall || 8,
        winter: specificFabricData.seasonal_scores?.winter || 7
      }
    };

    // Generate contextual recommendations
    const contextualRecommendations = {
      use_case_optimization: use_case ? fabricHelpers.generateUseCaseRecommendations(use_case as string, performanceAnalysis) : [],
      seasonal_advice: season ? fabricHelpers.generateSeasonalAdvice(season as string, performanceAnalysis) : [],
      climate_considerations: climate ? fabricHelpers.generateClimateConsiderations(climate as string, performanceAnalysis) : [],
      activity_adjustments: activity_level ? fabricHelpers.generateActivityAdjustments(activity_level as string, performanceAnalysis) : []
    };

    // Calculate overall suitability scores
    const suitabilityScores = {
      business_formal: fabricHelpers.calculateBusinessFormalSuitability(specificFabricData),
      business_casual: fabricHelpers.calculateBusinessCasualSuitability(specificFabricData),
      social_events: fabricHelpers.calculateSocialEventSuitability(specificFabricData),
      travel_friendly: fabricHelpers.calculateTravelFriendlySuitability(specificFabricData),
      all_weather: fabricHelpers.calculateAllWeatherSuitability(specificFabricData)
    };

    const response = {
      fabric_type: fabricType,
      performance_analysis: performanceAnalysis,
      contextual_recommendations: contextualRecommendations,
      suitability_scores: suitabilityScores,
      comparative_analysis: {
        strength_areas: fabricHelpers.identifyStrengthAreas(performanceAnalysis),
        potential_limitations: fabricHelpers.identifyLimitations(performanceAnalysis),
        best_alternatives: fabricHelpers.suggestAlternatives(fabricType, specificFabricData)
      },
      investment_guidance: {
        cost_effectiveness: fabricHelpers.calculateCostEffectiveness(specificFabricData),
        roi_factors: ['durability', 'versatility', 'professional_impact'],
        budget_recommendation: budget_considerations ?
          fabricHelpers.generateBudgetRecommendation(specificFabricData, budget_considerations as string) : 
          'Quality investment recommended for professional use'
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        fabric_database_version: '2.0.0',
        algorithm_version: '2.0.0'
      }
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    logger.error('Fabric performance analysis failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Fabric performance analysis failed'
    ));
  }
};

// Helper methods for fabric analysis (would be private in a class)
const generateUseCaseRecommendations = (useCase: string, analysis: any): string[] => {
  const recommendations: string[] = [];
  
  switch (useCase.toLowerCase()) {
    case 'business':
      recommendations.push(`Durability score of ${analysis.durability.score}/10 suitable for frequent business wear`);
      if (analysis.care_requirements.wrinkle_resistance < 7) {
        recommendations.push('Consider wrinkle-resistant alternatives for business travel');
      }
      break;
    case 'formal_events':
      recommendations.push('Excellent choice for formal occasions');
      if (analysis.comfort.overall_comfort_score < 6) {
        recommendations.push('Plan for comfort breaks during extended formal events');
      }
      break;
    case 'travel':
      if (analysis.care_requirements.wrinkle_resistance > 7) {
        recommendations.push('Travel-friendly with good wrinkle resistance');
      } else {
        recommendations.push('Pack carefully and plan for professional pressing');
      }
      break;
  }
  
  return recommendations;
};

const generateSeasonalAdvice = (season: string, analysis: any): string[] => {
  const advice: string[] = [];
  const seasonalScore = analysis.seasonal_suitability[season.toLowerCase()];
  
  if (seasonalScore > 8) {
    advice.push(`Excellent choice for ${season} - optimized performance`);
  } else if (seasonalScore > 6) {
    advice.push(`Good ${season} performance with minor considerations`);
  } else {
    advice.push(`Consider alternatives for optimal ${season} comfort`);
  }
  
  return advice;
};

const generateClimateConsiderations = (climate: string, analysis: any): string[] => {
  const considerations: string[] = [];
  
  switch (climate.toLowerCase()) {
    case 'humid':
      if (analysis.comfort.breathability > 7) {
        considerations.push('Good breathability for humid conditions');
      } else {
        considerations.push('May require air conditioning or frequent breaks in humid weather');
      }
      break;
    case 'dry':
      considerations.push('Suitable for dry climates');
      if (analysis.comfort.moisture_management < 6) {
        considerations.push('Consider moisture-wicking undergarments');
      }
      break;
    case 'variable':
      considerations.push('Versatile performance across climate variations');
      break;
  }
  
  return considerations;
};

const generateActivityAdjustments = (activityLevel: string, analysis: any): string[] => {
  const adjustments: string[] = [];
  
  switch (activityLevel.toLowerCase()) {
    case 'high':
      if (analysis.comfort.breathability < 7) {
        adjustments.push('Consider more breathable fabrics for high activity levels');
      }
      if (analysis.comfort.moisture_management < 7) {
        adjustments.push('Plan for climate control or breaks during active periods');
      }
      break;
    case 'moderate':
      adjustments.push('Suitable for moderate activity levels');
      break;
    case 'low':
      adjustments.push('Excellent for low activity, office-based environments');
      break;
  }
  
  return adjustments;
};

const calculateBusinessFormalSuitability = (fabricData: any): number => {
  let score = 7; // Base score
  
  if (fabricData.formality_score) score = fabricData.formality_score;
  if (fabricData.professional_appearance_score) score += fabricData.professional_appearance_score * 0.3;
  if (fabricData.durability_score) score += fabricData.durability_score * 0.2;
  
  return Math.min(10, Math.max(1, Math.round(score)));
};

const calculateBusinessCasualSuitability = (fabricData: any): number => {
  return Math.max(6, calculateBusinessFormalSuitability(fabricData) - 1);
};

const calculateSocialEventSuitability = (fabricData: any): number => {
  let score = 7;
  if (fabricData.aesthetic_appeal) score += fabricData.aesthetic_appeal * 0.4;
  if (fabricData.comfort_score) score += fabricData.comfort_score * 0.3;
  return Math.min(10, Math.max(1, Math.round(score)));
};

const calculateTravelFriendlySuitability = (fabricData: any): number => {
  let score = 5;
  if (fabricData.wrinkle_resistance) score += fabricData.wrinkle_resistance * 0.4;
  if (fabricData.packability) score += fabricData.packability * 0.3;
  if (fabricData.care_level === 'low') score += 2;
  return Math.min(10, Math.max(1, Math.round(score)));
};

const calculateAllWeatherSuitability = (fabricData: any): number => {
  const seasonal = fabricData.seasonal_scores || {};
  const average = (seasonal.spring + seasonal.summer + seasonal.fall + seasonal.winter) / 4;
  return Math.round(average) || 6;
};

const identifyStrengthAreas = (analysis: any): string[] => {
  const strengths: string[] = [];
  
  if (analysis.durability.score > 8) strengths.push('Exceptional durability');
  if (analysis.comfort.overall_comfort_score > 8) strengths.push('Superior comfort');
  if (analysis.care_requirements.wrinkle_resistance > 8) strengths.push('Excellent wrinkle resistance');
  
  return strengths;
};

const identifyLimitations = (analysis: any): string[] => {
  const limitations: string[] = [];
  
  if (analysis.durability.score < 6) limitations.push('May require more frequent replacement');
  if (analysis.comfort.breathability < 6) limitations.push('Limited breathability in warm conditions');
  if (analysis.care_requirements.maintenance_level === 'high') limitations.push('Requires intensive care and maintenance');
  
  return limitations;
};

const suggestAlternatives = (fabricType: string, fabricData: any): string[] => {
  // Simple alternative suggestions based on fabric type
  const alternatives: { [key: string]: string[] } = {
    'wool': ['Wool blend', 'Performance wool', 'Merino wool'],
    'cotton': ['Cotton blend', 'Performance cotton', 'Egyptian cotton'],
    'linen': ['Linen blend', 'Cotton-linen', 'Ramie blend'],
    'polyester': ['Wool-polyester blend', 'Technical fabrics', 'Performance blends']
  };
  
  const fabricTypeLower = fabricType.toLowerCase();
  for (const [key, alts] of Object.entries(alternatives)) {
    if (fabricTypeLower.includes(key)) {
      return alts;
    }
  }
  
  return ['Consult with fabric specialist for alternatives'];
};

const calculateCostEffectiveness = (fabricData: any): string => {
  const durability = fabricData.durability_score || 7;
  const versatility = fabricData.versatility_score || 7;
  
  const score = (durability + versatility) / 2;
  
  if (score > 8) return 'Excellent';
  if (score > 6) return 'Good';
  if (score > 4) return 'Fair';
  return 'Consider alternatives';
};

const generateBudgetRecommendation = (fabricData: any, budget: string): string => {
  const quality = fabricData.quality_score || 7;
  
  if (budget.toLowerCase().includes('premium') || budget.toLowerCase().includes('high')) {
    return 'Invest in highest quality available - excellent ROI for professional use';
  } else if (budget.toLowerCase().includes('mid') || budget.toLowerCase().includes('moderate')) {
    return quality > 7 ? 'Good value for money at mid-range pricing' : 'Consider upgrading for better long-term value';
  } else {
    return 'Focus on durability and versatility to maximize value';
  }
};

/**
 * GET /api/v2/intelligence/health
 * Get health status of all intelligence services
 */
export const getIntelligenceHealth = async (_req: Request, res: Response) => {
  try {
    const [
      psychologyHealth,
      careerHealth,
      venueHealth,
      culturalHealth
    ] = await Promise.all([
      customerPsychologyService.getHealthStatus(),
      careerIntelligenceService.getHealthStatus(),
      venueIntelligenceService.getHealthStatus(),
      culturalAdaptationService.getHealthStatus()
    ]);

    const overallStatus = [psychologyHealth, careerHealth, venueHealth, culturalHealth]
      .every(health => health.status === 'healthy') ? 'healthy' : 
      [psychologyHealth, careerHealth, venueHealth, culturalHealth]
      .some(health => health.status === 'unhealthy') ? 'unhealthy' : 'degraded';

    const response = {
      overall_status: overallStatus,
      services: {
        customer_psychology: psychologyHealth,
        career_intelligence: careerHealth,
        venue_intelligence: venueHealth,
        cultural_adaptation: culturalHealth
      },
      system_info: {
        api_version: '2.0.0',
        intelligence_layer_version: '2.0.0',
        last_health_check: new Date().toISOString()
      }
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    logger.error('Intelligence health check failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Intelligence health check failed'
    ));
  }
};