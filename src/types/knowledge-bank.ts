/**
 * Comprehensive TypeScript types for KCT Knowledge Bank Data
 * Generated from migrated data structure
 */

// Core Data Types
export interface ColorRelationships {
  version: string;
  last_updated: string;
  color_relationships: {
    [color: string]: {
      perfect_matches: {
        shirts: string[];
        ties: string[];
        confidence: number;
      };
      good_matches?: {
        shirts: string[];
        ties: string[];
        confidence: number;
      };
      seasonal_boosts?: {
        [season: string]: string[];
      };
      popularity_score?: number;
      trending?: string;
      limited_use?: string;
      avoid_casual?: boolean;
      seasonal_favorite?: string;
      special_pairings?: {
        [color: string]: string;
      };
      formality?: string;
      tuxedo_appropriate?: boolean;
      seasonal_restriction?: string;
      venue_specific?: string[];
    };
  };
  universal_rules: {
    [rule: string]: {
      works_with: string | string[];
      confidence: number;
      note?: string;
    };
  };
  color_families: {
    [family: string]: {
      colors: string[];
      complement_with: string;
      tie_suggestions: string[];
      trending?: string;
    };
  };
}

export interface FormalityIndex {
  version: string;
  last_updated: string;
  formality_scale: {
    description: string;
    reference_points: {
      [level: string]: string;
    };
  };
  suit_formality: {
    [color: string]: {
      base_formality: number;
      fabric_modifiers?: {
        [fabric: string]: string;
      };
      event_appropriateness?: {
        [time: string]: string;
      };
      advantages?: string;
      tuxedo_appropriate?: boolean;
      versatility?: string;
      appropriate_range?: string;
      modifier_range?: string;
      similar_to?: string;
      slightly_more?: string;
      statement_level?: string;
      best_for?: string;
      seasonal_boost?: string;
      daytime_appropriate?: boolean;
      season_dependent?: string;
      uniqueness?: string;
      trending?: string;
      context_dependent?: boolean;
      never?: string;
      seasonal?: string;
      max_formality?: string;
      fresh_factor?: string;
      very_specific?: string;
      controversial?: boolean;
    };
  };
  shirt_formality: {
    [color: string]: {
      base_formality: number;
      universal?: boolean;
      collar_impacts?: {
        [collar: string]: string;
      };
      versatility?: string;
      never_with?: string;
      warmth?: string;
      seasonal?: string;
      shade_dependent?: string;
      modern?: boolean;
      age_appropriate?: string;
      pattern_impacts?: {
        [pattern: string]: string;
      };
      context_specific?: string;
      modern_formal?: boolean;
    };
  };
  tie_formality: {
    [type: string]: {
      [style: string]: {
        formality: number;
        required_for?: string;
        playful?: boolean;
        examples?: string[];
        traditional?: boolean;
        sophisticated?: boolean;
        casual_leaning?: boolean;
        only_acceptable?: string;
      };
    };
  };
  fabric_formality_modifiers: {
    increases_formality: {
      [fabric: string]: string;
    };
    decreases_formality: {
      [fabric: string]: string;
    };
    neutral: {
      [fabric: string]: string;
    };
  };
  accessory_formality: {
    [accessory: string]: {
      [style: string]: {
        formality?: number;
        formality_boost?: string;
        always_appropriate?: boolean;
        adds?: string;
        required_for?: string;
        never_with?: string;
        formality_impact?: string;
      };
    };
  };
  formality_combinations: {
    [level: string]: {
      suit: string;
      shirt: string;
      tie: string;
      accessories: string;
    };
  };
  ai_formality_calculator: {
    formula: string;
    rules: string[];
    response_template: string;
  };
  common_formality_mistakes: {
    [category: string]: string[];
  };
}

// Training Data Types
export interface StyleProfile {
  percentage_of_customers: string;
  demographics: {
    age_range: string;
    occupations: string[];
    shopping_behavior: string;
    decision_time: string;
  };
  characteristics: {
    color_preferences: string[];
    pattern_tolerance: string;
    adventure_level: string;
    brand_loyalty: string;
    price_sensitivity: string;
    quality_focus?: string;
    style_focus?: string;
    value_focus?: string;
    urgency?: string;
  };
  preferred_combinations: Array<{
    combo: string;
    confidence: number;
  }>;
  shopping_triggers: {
    trust_signals: string[];
    decision_factors: string[];
    objections: string[];
  };
  messaging_preferences: {
    tone: string;
    focus: string;
    avoid?: string;
    embrace?: string;
    highlight?: string;
    provide?: string;
    demonstrate?: string;
  };
  bundle_preferences: {
    essential: string;
    premium: string;
    luxury: string;
  };
  ai_conversation_style: string;
  upsell_receptivity: string;
}

export interface StyleProfiles {
  version: string;
  last_updated: string;
  total_profiles: number;
  profile_categories: {
    [profile: string]: StyleProfile;
  };
  profile_identification: {
    quiz_mapping: {
      [question: string]: {
        [answer: string]: string;
      };
    };
    behavioral_indicators: {
      [behavior: string]: string;
    };
  };
  personalization_matrix: {
    [profile: string]: {
      homepage_hero: string;
      product_sort: string;
      messaging: string;
      social_proof: string;
      bundle_push: string;
    };
  };
  conversion_optimization: {
    by_profile: {
      [profile: string]: {
        conversion_rate: string;
        average_order_value: string;
        return_rate: string;
      };
    };
  };
  ai_adaptation_rules: {
    language_adaptation: {
      [profile: string]: string;
    };
    recommendation_logic: {
      [profile: string]: string;
    };
  };
}

// Intelligence Data Types
export interface ConversionRates {
  metadata: {
    version: string;
    last_updated: string;
    description: string;
    tracking_period: string;
    total_sessions_analyzed: number;
    currency: string;
  };
  top_converting_combinations: {
    all_time_best: Array<{
      rank: number;
      combination: string;
      conversion_rate: string;
      average_order_value: number;
      sessions: number;
      purchases: number;
      return_rate: string;
      lifetime_value: number;
      bundle_configuration?: {
        base_items: string[];
        upsell_success: string;
        common_additions: string[];
      };
      trend?: string;
    }>;
  };
  conversion_by_category: {
    price_tiers: {
      [tier: string]: {
        range: string;
        conversion_rate: string;
        top_combination: string;
        customer_segment: string;
      };
    };
    occasion_based: {
      [occasion: string]: {
        conversion_rate: string;
        average_order_value: number;
        popular_combinations: string[];
        bundle_attach_rate?: string;
        multiple_purchase_rate?: string;
      };
    };
  };
  conversion_factors: {
    positive_drivers: {
      [factor: string]: {
        impact: string;
        threshold?: string;
        usage_rate?: string;
        completion_rate?: string;
        sweet_spot?: string;
        claims_rate?: string;
        effectiveness_window?: string;
      };
    };
    negative_factors: {
      [factor: string]: {
        impact: string;
        recovery_rate?: string;
        mitigation?: string;
        solution?: string;
        improvement?: string;
      };
    };
  };
  device_performance: {
    [device: string]: {
      conversion_rate: string;
      average_order_value: number;
      session_duration: string;
      pages_per_session: number;
      improvement_opportunities?: string[];
    };
  };
  time_based_patterns: {
    day_of_week: {
      [day: string]: {
        conversion_rate: string;
        peak_hours: string[];
        best_combinations: string;
      };
    };
    seasonal_trends: {
      [season: string]: {
        peak_months: string[];
        conversion_rate: string;
        trending_combinations: string[];
        wedding_season_impact?: string;
        outdoor_wedding_boost?: string;
        highest_aov_season?: boolean;
        holiday_party_boost?: string;
      };
    };
  };
  customer_journey_conversions: {
    first_touch_to_purchase: {
      [timeframe: string]: string;
    };
    touchpoints_before_conversion: {
      [count: string]: string;
    };
    conversion_by_source: {
      [source: string]: {
        rate: string;
        top_keywords?: string[];
        content_driven?: boolean;
        best_campaigns?: string[];
        roi?: string;
        best_platform?: string;
        influencer_driven?: string;
        best_segments?: string[];
        personalization_impact?: string;
        returning_customer_percentage?: string;
      };
    };
  };
  ai_optimization_insights: {
    recommendation_impact: {
      ai_suggested_combinations: {
        conversion_rate: string;
        vs_self_selected: string;
      };
      personalization_score: {
        [level: string]: string;
      };
    };
    chat_engagement: {
      used_chat: {
        conversion_rate: string;
        average_order_value: number;
      };
      no_chat: {
        conversion_rate: string;
        average_order_value: number;
      };
      chat_topics_that_convert: string[];
    };
  };
  testing_insights: {
    recent_ab_tests: {
      [test: string]: {
        variant: string;
        lift: string;
        significance: string;
      };
    };
  };
}

// Main Knowledge Bank Index
export interface KnowledgeBankIndex {
  version: string;
  created: string;
  description: string;
  files: {
    core: string[];
    training: string[];
    intelligence: string[];
    visual: string[];
    validation: string[];
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T | undefined;
  error: string | undefined;
  timestamp: string;
}

export interface ColorRecommendationRequest {
  suit_color: string;
  occasion?: string;
  season?: string;
  formality_level?: number;
  customer_profile?: string;
}

export interface ColorRecommendationResponse {
  shirt_recommendations: Array<{
    color: string;
    confidence: number;
    reasoning: string;
  }>;
  tie_recommendations: Array<{
    color: string;
    confidence: number;
    reasoning: string;
  }>;
  formality_score: number;
  occasion_appropriate: boolean;
  seasonal_notes: string[] | undefined;
}

export interface StyleProfileRequest {
  quiz_answers?: {
    [question: string]: string;
  };
  behavioral_data?: {
    pages_viewed: string[];
    time_spent: number;
    clicked_sections: string[];
  };
  demographics?: {
    age_range?: string;
    occupation?: string;
  };
}

export interface StyleProfileResponse {
  profile_type: string;
  confidence: number;
  characteristics: StyleProfile['characteristics'];
  recommended_combinations: string[];
  messaging_style: string;
  bundle_preference: string;
}

export interface ConversionOptimizationRequest {
  combination: string;
  customer_profile?: string;
  occasion?: string;
  price_tier?: string;
  device_type?: string;
}

export interface ConversionOptimizationResponse {
  predicted_conversion_rate: number;
  factors_affecting_conversion: {
    positive: string[];
    negative: string[];
  };
  optimization_suggestions: string[];
  upsell_opportunities: string[];
}

// Utility Types
export type SuitColor = 'navy' | 'charcoal' | 'light_grey' | 'burgundy' | 'black' | 'tan' | 'light_blue' | 'sage_green' | 'hunter_green' | 'powder_blue' | 'midnight_blue' | 'white';
export type ShirtColor = 'white' | 'light_blue' | 'pink' | 'lavender' | 'cream' | 'light_grey' | 'black';
export type TieColor = 'burgundy' | 'silver' | 'gold' | 'coral' | 'forest_green' | 'navy' | 'purple' | 'black';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Occasion = 'wedding_groom' | 'wedding_guest' | 'business_professional' | 'special_event' | 'cocktail' | 'black_tie' | 'casual';
export type CustomerProfile = 'classic_conservative' | 'modern_adventurous' | 'practical_value_seeker' | 'occasion_driven' | 'luxury_connoisseur';