/**
 * Enhanced TypeScript Types for KCT Knowledge Bank Enhancement Integration
 * Phase 1: Core Data Models for Advanced Intelligence
 */

// Re-export original types for backward compatibility
export * from './knowledge-bank';

// ENHANCED DATA MODELS FOR KCT API ENHANCEMENT INTEGRATION

// Customer Psychology Data Models
export interface CustomerPsychologyProfile {
  customer_id: string;
  decision_fatigue_score: number; // 0-100 scale
  optimal_choice_count: number; // Recommended number of options to show
  emotional_triggers: EmotionalTrigger[];
  behavioral_patterns: BehaviorPattern[];
  personality_type?: PersonalityType;
  recovery_timing: number; // Minutes needed between decisions
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_updated: string;
}

export interface EmotionalTrigger {
  trigger_type: 'confidence' | 'status' | 'comfort' | 'tradition' | 'innovation' | 'value' | 'quality';
  intensity: number; // 1-10 scale
  context: string[];
  messaging_approach: string;
}

export interface BehaviorPattern {
  pattern_type: 'browsing' | 'decision_making' | 'purchase' | 'return';
  frequency: 'rare' | 'occasional' | 'regular' | 'frequent';
  indicators: string[];
  optimization_strategy: string;
}

export interface DecisionFatigueAnalysis {
  current_session_score: number;
  choices_viewed: number;
  session_duration: number;
  fatigue_indicators: string[];
  recommended_actions: string[];
  intervention_timing: number;
}

// Career Trajectory Data Models
export interface CareerTrajectoryData {
  customer_id: string;
  current_stage: CareerStage;
  industry: string;
  role_level: 'entry' | 'mid' | 'senior' | 'executive' | 'c_level';
  advancement_probability: number; // 0-100
  predicted_timeline: Timeline;
  wardrobe_investment_pattern: InvestmentPattern;
  promotion_signals: PromotionSignal[];
  created_at: string;
  updated_at: string;
}

export type CareerAdvancementStage = 'entry_level' | 'establishing' | 'advancing' | 'leadership' | 'executive';
export type CulturalSensitivityLevel = 'low' | 'medium' | 'high';

export interface CareerStage {
  stage: CareerAdvancementStage;
  age_range: string;
  typical_wardrobe_needs: string[];
  investment_focus: string[];
  style_evolution: string;
}

export interface Timeline {
  next_milestone: string;
  estimated_months: number;
  confidence_level: number;
  key_indicators: string[];
}

export interface InvestmentPattern {
  budget_range: string;
  spending_frequency: 'sporadic' | 'seasonal' | 'regular' | 'planned';
  quality_vs_quantity: 'quality_focused' | 'balanced' | 'quantity_focused';
  upgrade_triggers: string[];
}

export interface PromotionSignal {
  signal_type: 'wardrobe_upgrade' | 'role_change' | 'industry_shift' | 'networking_increase';
  strength: number; // 1-10
  time_horizon: string;
  recommended_actions: string[];
}

// Venue Intelligence Data Models
export interface VenueIntelligence {
  venue_type: string;
  lighting_conditions: LightingConditions;
  dress_code_strictness: number; // 1-10 scale
  color_recommendations: EnhancedColorRecommendations;
  fabric_recommendations: EnhancedFabricRecommendations;
  unspoken_rules: UnspokenRule[];
  seasonal_variations: VenueSeasonalVariation[];
  photography_considerations: PhotographyConsiderations;
}

export interface LightingConditions {
  primary_lighting: 'natural' | 'fluorescent' | 'incandescent' | 'led' | 'mixed';
  intensity: 'low' | 'medium' | 'high' | 'variable';
  color_temperature: 'warm' | 'neutral' | 'cool';
  color_accuracy_impact: number; // 1-10 scale
  recommendations: string[];
}

export interface EnhancedColorRecommendations {
  optimal_colors: string[];
  avoid_colors: string[];
  undertone_considerations: string[];
  lighting_adaptations: { [lighting: string]: string[] };
}

export interface EnhancedFabricRecommendations {
  optimal_textures: string[];
  avoid_textures: string[];
  sheen_level: 'matte' | 'subtle' | 'moderate' | 'high';
  wrinkle_resistance_importance: number; // 1-10
}

export interface UnspokenRule {
  rule: string;
  importance: number; // 1-10
  violation_consequences: string;
  regional_variations: string[];
}

export interface VenueSeasonalVariation {
  season: string;
  adjustments: string[];
  temperature_considerations: string[];
  special_requirements: string[];
}

export interface PhotographyConsiderations {
  camera_flash_impact: string;
  social_media_optimization: string[];
  video_call_suitability: number; // 1-10
  instagram_performance: string[];
}

// Cultural Nuances Data Models
export interface CulturalNuances {
  region: string;
  country?: string;
  cultural_context: CulturalContext;
  color_preferences: CulturalColorPreference[];
  style_variations: StyleVariation[];
  formality_expectations: FormalityExpectation[];
  seasonal_adaptations: CulturalSeasonalAdaptation[];
  religious_considerations: ReligiousConsideration[];
  business_culture: BusinessCulture;
}

export interface CulturalContext {
  cultural_values: string[];
  communication_style: 'direct' | 'indirect' | 'mixed';
  hierarchy_importance: number; // 1-10
  tradition_vs_modernity: number; // 1-10 (1=very traditional, 10=very modern)
  social_proof_importance: number; // 1-10
}

export interface CulturalColorPreference {
  color: string;
  cultural_significance: string;
  appropriateness_level: number; // 1-10
  context_limitations: string[];
  positive_associations: string[];
  negative_associations: string[];
}

export interface StyleVariation {
  variation_type: 'fit' | 'color' | 'pattern' | 'accessory' | 'fabric';
  local_preference: string;
  reasoning: string;
  adoption_level: number; // 1-10
}

export interface FormalityExpectation {
  context: string;
  expected_level: number; // 1-10
  flexibility: number; // 1-10
  consequences_of_deviation: string;
}

export interface CulturalSeasonalAdaptation {
  season: string;
  cultural_adjustments: string[];
  color_shifts: string[];
  fabric_preferences: string[];
}

export interface ReligiousConsideration {
  religion: string;
  considerations: string[];
  color_restrictions: string[];
  style_requirements: string[];
  special_occasions: string[];
}

export interface BusinessCulture {
  industry_norms: { [industry: string]: string[] };
  networking_expectations: string[];
  hierarchy_signaling: string[];
  international_considerations: string[];
}

// Technical Fabric Performance Data Models
export interface FabricPerformanceData {
  fabric_type: string;
  durability_metrics: DurabilityMetric[];
  care_requirements: CareRequirement[];
  photography_performance: PhotographyMetric[];
  seasonal_suitability: FabricSeasonalSuitability[];
  price_performance_ratio: number;
  real_world_ratings: UserRating[];
  construction_details: ConstructionDetails;
}

export interface DurabilityMetric {
  metric_type: 'wear_resistance' | 'wrinkle_recovery' | 'color_retention' | 'shape_retention';
  score: number; // 1-10
  test_conditions: string;
  expected_lifespan: string;
  maintenance_impact: string;
}

export interface CareRequirement {
  care_type: 'dry_clean' | 'wash' | 'steam' | 'press';
  frequency: string;
  difficulty_level: number; // 1-10
  cost_estimate: string;
  special_instructions: string[];
}

export interface PhotographyMetric {
  lighting_type: string;
  color_accuracy: number; // 1-10
  texture_visibility: number; // 1-10
  wrinkle_visibility: number; // 1-10
  overall_photogenic_score: number; // 1-10
}

export interface FabricSeasonalSuitability {
  season: string;
  comfort_score: number; // 1-10
  appropriateness: number; // 1-10
  special_considerations: string[];
}

export interface UserRating {
  rating_category: string;
  average_score: number; // 1-5
  total_reviews: number;
  common_feedback: string[];
}

export interface ConstructionDetails {
  weave_type: string;
  thread_count: number;
  finishing_treatments: string[];
  special_features: string[];
}

// Body Language & Fit Psychology Models
export interface BodyLanguageFitPreferences {
  professional_preferences: { [profession: string]: ProfessionalFitPreference };
  personality_preferences: { [personality: string]: PersonalityFitPreference };
  age_preferences: { [ageGroup: string]: AgeFitPreference };
  generational_trends: { [generation: string]: GenerationalTrend };
}

export interface ProfessionalFitPreference {
  preferred_cut: string;
  fit_style: string;
  jacket_features: string[];
  trouser_style: string[];
  colors: string[];
  avoid: string[];
  body_language_signals: string[];
  key_principle: string;
}

export interface PersonalityFitPreference {
  style_philosophy: string;
  fit_preference: string;
  key_characteristics: string[];
  suit_style: string;
  body_language: string;
}

export interface AgeFitPreference {
  preferred_silhouette: string;
  key_features: string[];
  colors: string[];
  avoid: string[];
  body_changes: string;
  confidence_level: string;
}

export interface GenerationalTrend {
  suit_preferences: string[];
  influences: string[];
  fit_philosophy: string;
}

// Enhanced Main Knowledge Bank Index
export interface EnhancedKnowledgeBankIndex {
  version: string;
  created: string;
  description: string;
  files: {
    core: string[];
    training: string[];
    intelligence: string[];
    visual: string[];
    validation: string[];
    // New enhanced categories
    psychology: string[];
    personalization: string[];
    analytics: string[];
    business_intelligence: string[];
    cultural: string[];
    technical: string[];
  };
}

// Enhanced API Request/Response Types
export interface PsychologyAnalysisRequest {
  customer_id: string;
  session_duration: number;
  choices_viewed: number;
  current_stage?: string;
  previous_sessions?: SessionData[];
  interaction_patterns?: string[];
  behavioral_indicators?: string[];
  current_journey_stage?: string;
}

export interface PsychologyAnalysisResponse {
  fatigue_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_actions: string[];
  optimal_choice_count: number;
  recovery_timing: number;
  emotional_triggers: EmotionalTrigger[];
  personalization_adjustments: PersonalizationAdjustment[];
}

export interface SessionData {
  timestamp: string;
  duration: number;
  choices_made: number;
  decision_quality: number;
}

export interface PersonalizationAdjustment {
  adjustment_type: 'choice_reduction' | 'messaging_change' | 'timing_delay' | 'format_change';
  specific_action: string;
  expected_impact: string;
}

export interface CareerTrajectoryRequest {
  customer_id: string;
  current_role: string;
  industry: string;
  age_range: string;
  company_size?: string;
  years_experience?: number;
  recent_behaviors: BehaviorData[];
  wardrobe_investment_pattern?: {
    frequency: string;
    budget_range: string;
    category_priorities: string[];
  };
  career_advancement_signals?: any[];
}

export interface BehaviorData {
  behavior_type: string;
  frequency: number;
  context: string;
  timestamp: string;
}

export interface CareerTrajectoryResponse {
  advancement_probability: number;
  predicted_timeline: Timeline;
  wardrobe_recommendations: WardrobeRecommendation[];
  investment_strategy: InvestmentStrategy;
  promotion_signals: PromotionSignal[];
  current_trajectory?: {
    stage: string;
    focus_areas: string[];
    timeline: Timeline;
  };
}

export interface WardrobeRecommendation {
  item_type: string;
  priority: number; // 1-10
  timing: string;
  reasoning: string;
  budget_range: string;
}

export interface InvestmentStrategy {
  immediate_needs: string[];
  medium_term_goals: string[];
  long_term_vision: string;
  budget_allocation: { [category: string]: number };
}

export interface VenueOptimizationRequest {
  venue_type: string;
  lighting_conditions: string[];
  dress_code_level: number;
  season: string;
  time_of_day: string;
  special_considerations?: string[];
  guest_profile?: any;
  photography_importance?: string;
}

export interface VenueOptimizationResponse {
  color_recommendations: string[];
  fabric_recommendations: string[];
  style_adjustments: string[];
  confidence_score: number;
  potential_issues: string[];
  photography_tips: string[];
}

export interface CulturalAdaptationRequest {
  base_recommendations: EnhancedRecommendation[];
  cultural_context: CulturalContext;
  sensitivity_level: 'low' | 'medium' | 'high';
  specific_region?: string;
  religious_considerations?: string[];
  business_context?: any;
}

export interface CulturalAdaptationResponse {
  adapted_recommendations: AdaptedRecommendation[];
  cultural_insights: string[];
  sensitivity_warnings: string[];
  local_preferences: string[];
}

export interface EnhancedRecommendation {
  item_type: string;
  color: string;
  style: string;
  confidence: number;
  reasoning: string;
}

export interface AdaptedRecommendation {
  original: EnhancedRecommendation;
  adapted: EnhancedRecommendation;
  adaptation_reasoning: string;
  cultural_significance: string;
  local_preference_score: number;
}

export interface FabricPerformanceRequest {
  intended_use: string[];
  frequency: 'occasional' | 'regular' | 'frequent';
  budget_range: string;
  care_preferences: string[];
  climate_conditions: string[];
  special_requirements?: string[];
}

export interface FabricPerformanceResponse {
  recommended_fabrics: FabricRecommendation[];
  care_complexity_score: number;
  longevity_estimate: string;
  value_analysis: ValueAnalysis;
  climate_suitability: ClimateSuitability[];
}

export interface FabricRecommendation {
  fabric_type: string;
  performance_score: number;
  suitability_reasons: string[];
  care_requirements: string[];
  expected_lifespan: string;
  cost_effectiveness: number;
}

export interface ValueAnalysis {
  cost_per_wear_estimate: number;
  quality_score: number;
  versatility_score: number;
  overall_value_rating: number;
}

export interface ClimateSuitability {
  climate_type: string;
  suitability_score: number;
  seasonal_performance: { [season: string]: number };
  comfort_factors: string[];
}

// Enhanced Utility Types
export type PersonalityType = 'ENTJ' | 'INTJ' | 'ENFJ' | 'INFJ' | 'ENTP' | 'INTP' | 'ESFJ' | 'ISFJ' | 'ESTJ' | 'ISTJ' | 'ESFP' | 'ISFP' | 'ESTP' | 'ISTP' | 'ENFP' | 'INFP';
export type ProfessionalType = 'Lawyers' | 'Investment_Bankers' | 'Consultants' | 'Creative_Industries' | 'Technology' | 'Healthcare' | 'Education' | 'Government' | 'Sales' | 'Marketing';
export type GenerationType = 'Gen_Z_Men' | 'Millennial_Men' | 'Gen_X_Men' | 'Baby_Boomers';
export type AgeGroup = 'Young_Men_18_29' | 'Professional_Men_30_54' | 'Mature_Men_55_Plus';
export type DecisionFatigueRisk = 'low' | 'medium' | 'high' | 'critical';
// CareerAdvancementStage and CulturalSensitivityLevel are already defined above
export type FabricUsageFrequency = 'occasional' | 'regular' | 'frequent';