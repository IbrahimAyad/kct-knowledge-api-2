/**
 * Style Profile Service
 * Identifies customer style profiles and provides personalized recommendations
 */

import { dataLoader } from '../utils/data-loader';
import { cacheService } from './cache-service';
import {
  StyleProfiles,
  StyleProfile,
  StyleProfileRequest,
  StyleProfileResponse,
  CustomerProfile
} from '../types/knowledge-bank';
// Import career intelligence service for enhanced profiling
import { careerIntelligenceService } from './career-intelligence-service';

export class StyleProfileService {
  private styleData: StyleProfiles | null = null;

  /**
   * Initialize the service with data
   */
  async initialize(): Promise<void> {
    this.styleData = await cacheService.getOrSet(
      'styles:profiles',
      () => dataLoader.loadStyleProfiles(),
      { 
        ttl: 7 * 24 * 60 * 60, // 7 days - style profiles are fairly static
        tags: ['styles', 'profiles'],
        compress: true 
      }
    );
  }

  /**
   * Identify customer style profile based on quiz answers and behavior
   */
  async identifyProfile(request: StyleProfileRequest): Promise<StyleProfileResponse> {
    if (!this.styleData) {
      await this.initialize();
    }

    let profileScores: { [profile: string]: number } = {};

    // Initialize scores
    for (const profileName of Object.keys(this.styleData!.profile_categories)) {
      profileScores[profileName] = 0;
    }

    // Analyze quiz answers
    if (request.quiz_answers) {
      for (const [question, answer] of Object.entries(request.quiz_answers)) {
        const mapping = this.styleData!.profile_identification.quiz_mapping[question];
        if (mapping && mapping[answer]) {
          profileScores[mapping[answer]] += 3;
        }
      }
    }

    // Analyze behavioral data
    if (request.behavioral_data) {
      const indicators = this.styleData!.profile_identification.behavioral_indicators;
      
      for (const page of request.behavioral_data.pages_viewed) {
        for (const [behavior, profile] of Object.entries(indicators)) {
          if (this.matchesBehavior(page, behavior)) {
            profileScores[profile] += 2;
          }
        }
      }

      // Analyze clicked sections
      for (const section of request.behavioral_data.clicked_sections) {
        for (const [behavior, profile] of Object.entries(indicators)) {
          if (this.matchesBehavior(section, behavior)) {
            profileScores[profile] += 1;
          }
        }
      }

      // Time spent analysis
      if (request.behavioral_data.time_spent > 300) { // 5+ minutes
        profileScores['classic_conservative'] += 2;
        profileScores['practical_value_seeker'] += 1;
      } else if (request.behavioral_data.time_spent < 60) { // Less than 1 minute
        profileScores['modern_adventurous'] += 2;
        profileScores['occasion_driven'] += 3;
      }
    }

    // Analyze demographics
    if (request.demographics) {
      if (request.demographics.age_range) {
        this.applyAgeBasedScoring(profileScores, request.demographics.age_range);
      }

      if (request.demographics.occupation) {
        this.applyOccupationBasedScoring(profileScores, request.demographics.occupation);
      }
    }

    // Find the highest scoring profile
    const topProfile = Object.entries(profileScores).reduce((a, b) => 
      profileScores[a[0]] > profileScores[b[0]] ? a : b
    )[0];

    const confidence = this.calculateConfidence(profileScores, topProfile);
    const profileData = this.styleData!.profile_categories[topProfile];

    // Get recommended combinations
    const recommendedCombinations = profileData.preferred_combinations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(combo => combo.combo);

    return {
      profile_type: topProfile,
      confidence,
      characteristics: profileData.characteristics,
      recommended_combinations: recommendedCombinations,
      messaging_style: profileData.ai_conversation_style,
      bundle_preference: this.getBundlePreference(profileData.bundle_preferences)
    };
  }

  /**
   * Get all available style profiles
   */
  async getAllProfiles(): Promise<{ [profile: string]: StyleProfile }> {
    if (!this.styleData) {
      await this.initialize();
    }

    return this.styleData!.profile_categories;
  }

  /**
   * Get profile by name
   */
  async getProfile(profileName: string): Promise<StyleProfile | null> {
    if (!this.styleData) {
      await this.initialize();
    }

    return this.styleData!.profile_categories[profileName] || null;
  }

  /**
   * Get personalization matrix for a profile
   */
  async getPersonalizationMatrix(profileName: string): Promise<any> {
    if (!this.styleData) {
      await this.initialize();
    }

    return this.styleData!.personalization_matrix[profileName] || null;
  }

  /**
   * Get conversion optimization data for profiles
   */
  async getConversionOptimization(): Promise<any> {
    if (!this.styleData) {
      await this.initialize();
    }

    return this.styleData!.conversion_optimization;
  }

  /**
   * Get AI adaptation rules for a profile
   */
  async getAIAdaptationRules(profileName: string): Promise<{
    language: string;
    recommendation_logic: string;
  }> {
    if (!this.styleData) {
      await this.initialize();
    }

    const rules = this.styleData!.ai_adaptation_rules;
    
    return {
      language: rules.language_adaptation[profileName] || '',
      recommendation_logic: rules.recommendation_logic[profileName] || ''
    };
  }

  /**
   * Get quiz questions for profile identification
   */
  async getQuizQuestions(): Promise<{
    questions: Array<{
      id: string;
      question: string;
      options: Array<{
        value: string;
        label: string;
        profile_hint: string;
      }>;
    }>;
  }> {
    // Define quiz questions based on the profile identification mapping
    return {
      questions: [
        {
          id: 'question_1_style_preference',
          question: 'How would you describe your personal style?',
          options: [
            {
              value: 'classic',
              label: 'Classic and timeless',
              profile_hint: 'classic_conservative'
            },
            {
              value: 'trendy',
              label: 'Trendy and fashion-forward',
              profile_hint: 'modern_adventurous'
            },
            {
              value: 'comfortable',
              label: 'Comfortable and practical',
              profile_hint: 'practical_value_seeker'
            },
            {
              value: 'depends',
              label: 'Depends on the occasion',
              profile_hint: 'occasion_driven'
            }
          ]
        },
        {
          id: 'question_2_color_comfort',
          question: 'Which colors do you feel most comfortable wearing?',
          options: [
            {
              value: 'navy_black',
              label: 'Navy, charcoal, and black',
              profile_hint: 'classic_conservative'
            },
            {
              value: 'bright_colors',
              label: 'Bright and unique colors',
              profile_hint: 'modern_adventurous'
            },
            {
              value: 'earth_tones',
              label: 'Versatile earth tones',
              profile_hint: 'practical_value_seeker'
            }
          ]
        },
        {
          id: 'question_3_shopping_style',
          question: 'How do you typically shop for formal wear?',
          options: [
            {
              value: 'research_everything',
              label: 'I research extensively before buying',
              profile_hint: 'classic_conservative'
            },
            {
              value: 'see_it_buy_it',
              label: 'If I like it, I buy it quickly',
              profile_hint: 'modern_adventurous'
            },
            {
              value: 'compare_prices',
              label: 'I compare prices and look for deals',
              profile_hint: 'practical_value_seeker'
            },
            {
              value: 'need_it_now',
              label: 'I shop when I need something for an event',
              profile_hint: 'occasion_driven'
            }
          ]
        }
      ]
    };
  }

  /**
   * Recommend products based on profile
   */
  async getProfileBasedRecommendations(
    profileName: string,
    category?: string
  ): Promise<{
    colors: string[];
    styles: string[];
    messaging: string;
    price_range: string;
  }> {
    if (!this.styleData) {
      await this.initialize();
    }

    const profile = this.styleData!.profile_categories[profileName];
    if (!profile) {
      throw new Error(`Profile "${profileName}" not found`);
    }

    const personalization = this.styleData!.personalization_matrix[profileName];
    
    return {
      colors: profile.characteristics.color_preferences,
      styles: profile.preferred_combinations.map(combo => combo.combo),
      messaging: personalization?.messaging || profile.ai_conversation_style,
      price_range: this.getBundlePreference(profile.bundle_preferences)
    };
  }

  /**
   * Calculate demographic-based adjustments
   */
  async getDemographicInsights(
    age?: string,
    occupation?: string
  ): Promise<{
    likely_profiles: string[];
    characteristics: any;
  }> {
    if (!this.styleData) {
      await this.initialize();
    }

    const likelyProfiles: string[] = [];
    const characteristics: any = {};

    for (const [profileName, profile] of Object.entries(this.styleData!.profile_categories)) {
      let score = 0;

      if (age && this.ageRangeOverlap(age, profile.demographics.age_range)) {
        score += 3;
      }

      if (occupation && profile.demographics.occupations.some(occ => 
        occ.toLowerCase().includes(occupation.toLowerCase()) || 
        occupation.toLowerCase().includes(occ.toLowerCase())
      )) {
        score += 2;
      }

      if (score > 0) {
        likelyProfiles.push(profileName);
        characteristics[profileName] = {
          score,
          typical_behavior: profile.demographics.shopping_behavior,
          decision_time: profile.demographics.decision_time
        };
      }
    }

    return {
      likely_profiles: likelyProfiles.sort((a, b) => 
        characteristics[b].score - characteristics[a].score
      ),
      characteristics
    };
  }

  /**
   * Get enhanced profile with career trajectory integration
   */
  async getEnhancedProfile(
    profileName: string,
    customerId?: string,
    careerContext?: {
      current_role?: string;
      industry?: string;
      age_range?: string;
      years_experience?: number;
    }
  ): Promise<StyleProfile & {
    career_insights?: any;
    professional_recommendations?: any;
    investment_strategy?: any;
  }> {
    const baseProfile = await this.getProfile(profileName);
    if (!baseProfile) {
      throw new Error(`Profile "${profileName}" not found`);
    }

    // If career context is provided, enhance with career intelligence
    if (careerContext && customerId) {
      try {
        const careerRequest = {
          customer_id: customerId,
          current_role: careerContext.current_role || 'professional',
          industry: careerContext.industry || 'general',
          age_range: careerContext.age_range || '25-35',
          company_size: 'medium',
          years_experience: careerContext.years_experience || 3,
          recent_behaviors: [],
          wardrobe_investment_pattern: {
            frequency: 'quarterly',
            budget_range: this.mapProfileToBudgetRange(profileName),
            category_priorities: ['suits', 'shirts', 'accessories']
          },
          career_advancement_signals: []
        };

        const careerAnalysis = await careerIntelligenceService.analyzeCareerTrajectory(careerRequest);
        const industryRecommendations = await careerIntelligenceService.getIndustryRecommendations(
          careerContext.industry || 'general',
          'mid'
        );

        return {
          ...baseProfile,
          career_insights: {
            advancement_probability: careerAnalysis.advancement_probability,
            predicted_timeline: careerAnalysis.predicted_timeline,
            key_indicators: careerAnalysis.predicted_timeline.key_indicators
          },
          professional_recommendations: {
            industry_colors: industryRecommendations.colors,
            industry_styles: industryRecommendations.styles,
            body_language_goals: industryRecommendations.body_language_goals,
            key_principles: industryRecommendations.key_principles
          },
          investment_strategy: careerAnalysis.investment_strategy
        };
      } catch (error) {
        console.warn('Failed to enhance profile with career intelligence:', error);
        // Return base profile if career enhancement fails
        return baseProfile;
      }
    }

    return baseProfile;
  }

  /**
   * Get career-stage appropriate styling recommendations
   */
  async getCareerStageRecommendations(
    profileName: string,
    careerStage: 'entry_level' | 'establishing' | 'advancing' | 'leadership' | 'executive',
    industry: string
  ): Promise<{
    wardrobe_priorities: string[];
    color_recommendations: string[];
    style_adjustments: string[];
    investment_focus: string[];
    budget_guidance: string;
  }> {
    const baseProfile = await this.getProfile(profileName);
    if (!baseProfile) {
      throw new Error(`Profile "${profileName}" not found`);
    }

    try {
      const stagePreferences = await careerIntelligenceService.getCareerStagePreferences(careerStage, industry);
      const industryRecommendations = await careerIntelligenceService.getIndustryRecommendations(industry, 'mid');

      // Merge profile preferences with career stage requirements
      const mergedColorRecommendations = [
        ...baseProfile.characteristics.color_preferences,
        ...industryRecommendations.colors
      ].filter((color, index, arr) => arr.indexOf(color) === index);

      return {
        wardrobe_priorities: stagePreferences.wardrobe_focus,
        color_recommendations: mergedColorRecommendations,
        style_adjustments: [
          ...baseProfile.characteristics.style_notes,
          `Career stage: ${careerStage} - ${stagePreferences.stage_info.style_evolution}`
        ],
        investment_focus: stagePreferences.investment_priorities,
        budget_guidance: this.generateBudgetGuidance(careerStage, baseProfile.bundle_preferences)
      };
    } catch (error) {
      console.warn('Failed to get career stage recommendations:', error);
      // Return profile-based recommendations if career service fails
      return {
        wardrobe_priorities: ['Professional foundation pieces'],
        color_recommendations: baseProfile.characteristics.color_preferences,
        style_adjustments: baseProfile.characteristics.style_notes,
        investment_focus: ['Quality basics', 'Proper fit'],
        budget_guidance: this.getBundlePreference(baseProfile.bundle_preferences)
      };
    }
  }

  // Private helper methods

  private matchesBehavior(action: string, behavior: string): boolean {
    const actionLower = action.toLowerCase();
    const behaviorLower = behavior.toLowerCase();
    
    if (behaviorLower.includes('views_5+_products')) {
      return actionLower.includes('product') || actionLower.includes('collection');
    }
    
    if (behaviorLower.includes('clicks_sale_section')) {
      return actionLower.includes('sale') || actionLower.includes('discount');
    }
    
    if (behaviorLower.includes('views_new_arrivals')) {
      return actionLower.includes('new') || actionLower.includes('trending');
    }
    
    if (behaviorLower.includes('reads_about_section')) {
      return actionLower.includes('about') || actionLower.includes('story');
    }
    
    if (behaviorLower.includes('uses_size_guide')) {
      return actionLower.includes('size') || actionLower.includes('fit');
    }
    
    if (behaviorLower.includes('adds_to_cart_quickly')) {
      return actionLower.includes('cart') || actionLower.includes('checkout');
    }

    return false;
  }

  private applyAgeBasedScoring(scores: { [profile: string]: number }, ageRange: string): void {
    const ageNum = parseInt(ageRange.split('-')[0]) || 30;

    if (ageNum >= 35 && ageNum <= 55) {
      scores['classic_conservative'] += 2;
    }
    
    if (ageNum >= 25 && ageNum <= 40) {
      scores['modern_adventurous'] += 2;
    }
    
    if (ageNum >= 28 && ageNum <= 45) {
      scores['practical_value_seeker'] += 1;
    }
    
    if (ageNum >= 35) {
      scores['luxury_connoisseur'] += 1;
    }
  }

  private applyOccupationBasedScoring(scores: { [profile: string]: number }, occupation: string): void {
    const occLower = occupation.toLowerCase();

    const conservativeOccupations = ['finance', 'law', 'corporate', 'government'];
    const adventurousOccupations = ['creative', 'tech', 'marketing', 'entrepreneur'];
    const practicalOccupations = ['management', 'sales', 'education'];
    const luxuryOccupations = ['executive', 'business owner', 'professional'];

    if (conservativeOccupations.some(occ => occLower.includes(occ))) {
      scores['classic_conservative'] += 3;
    }
    
    if (adventurousOccupations.some(occ => occLower.includes(occ))) {
      scores['modern_adventurous'] += 3;
    }
    
    if (practicalOccupations.some(occ => occLower.includes(occ))) {
      scores['practical_value_seeker'] += 3;
    }
    
    if (luxuryOccupations.some(occ => occLower.includes(occ))) {
      scores['luxury_connoisseur'] += 2;
    }
  }

  private calculateConfidence(scores: { [profile: string]: number }, topProfile: string): number {
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const topScore = scores[topProfile];
    
    if (totalScore === 0) return 50; // Default confidence
    
    const confidence = Math.round((topScore / totalScore) * 100);
    return Math.min(95, Math.max(25, confidence)); // Cap between 25-95%
  }

  private getBundlePreference(preferences: StyleProfile['bundle_preferences']): string {
    const essential = parseInt(preferences.essential.replace('%', ''));
    const premium = parseInt(preferences.premium.replace('%', ''));
    const luxury = parseInt(preferences.luxury.replace('%', ''));

    if (luxury >= essential && luxury >= premium) return 'luxury';
    if (premium >= essential && premium >= luxury) return 'premium';
    return 'essential';
  }

  private ageRangeOverlap(inputAge: string, profileAgeRange: string): boolean {
    // Simple overlap check - can be made more sophisticated
    const inputNum = parseInt(inputAge.split('-')[0]) || 30;
    const profileStart = parseInt(profileAgeRange.split('-')[0]);
    const profileEnd = parseInt(profileAgeRange.split('-')[1]);
    
    return inputNum >= profileStart && inputNum <= profileEnd;
  }

  private mapProfileToBudgetRange(profileName: string): string {
    const budgetMap: { [key: string]: string } = {
      'luxury_connoisseur': '$2000-5000',
      'classic_conservative': '$800-2000',
      'modern_adventurous': '$600-1500',
      'practical_value_seeker': '$400-1000',
      'occasion_driven': '$300-800'
    };

    return budgetMap[profileName] || '$500-1500';
  }

  private generateBudgetGuidance(
    careerStage: string,
    bundlePreferences: StyleProfile['bundle_preferences']
  ): string {
    const basePreference = this.getBundlePreference(bundlePreferences);
    
    const stageGuidanceMap: { [key: string]: string } = {
      'entry_level': `${basePreference} tier with focus on building foundation pieces`,
      'establishing': `${basePreference} tier with strategic quality upgrades`,
      'advancing': `Premium tier investments for career advancement preparation`,
      'leadership': `Premium to luxury tier for authority signaling`,
      'executive': `Luxury tier with bespoke considerations for C-suite presence`
    };

    return stageGuidanceMap[careerStage] || `${basePreference} tier recommendations`;
  }
}

export const styleProfileService = new StyleProfileService();