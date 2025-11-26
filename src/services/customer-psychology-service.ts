/**
 * Customer Psychology Service
 * Handles behavioral analysis, decision fatigue detection, and personalization optimization
 */

import { cacheService } from './cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  CustomerPsychologyProfile,
  EmotionalTrigger,
  BehaviorPattern,
  DecisionFatigueAnalysis,
  PsychologyAnalysisRequest,
  PsychologyAnalysisResponse,
  SessionData,
  PersonalizationAdjustment,
  PersonalityType,
  DecisionFatigueRisk
} from '../types/enhanced-knowledge-bank';

export class CustomerPsychologyService {
  private psychologyData: any[] | null = null;
  private bodyLanguageData: any | null = null;

  /**
   * Initialize the service with psychology data
   */
  async initialize(): Promise<void> {
    try {
      // Load psychology data with cache-aside pattern
      this.psychologyData = await cacheService.getOrSet(
        'psychology:data',
        () => enhancedDataLoader.loadCustomerPsychologyData(),
        {
          ttl: 2 * 60 * 60, // 2 hours
          tags: ['psychology', 'customer_data'],
          compress: true
        }
      );

      this.bodyLanguageData = await cacheService.getOrSet(
        'psychology:body_language',
        () => enhancedDataLoader.loadBodyLanguageFitPreferences(),
        {
          ttl: 4 * 60 * 60, // 4 hours
          tags: ['psychology', 'body_language'],
          compress: true
        }
      );
    } catch (error) {
      console.warn('Failed to initialize CustomerPsychologyService:', error);
      // Initialize with empty data to prevent service failure
      this.psychologyData = [];
      this.bodyLanguageData = {
        professional_preferences: {},
        personality_preferences: {},
        age_preferences: {},
        generational_trends: {}
      };
    }
  }

  /**
   * Analyze customer decision fatigue and provide recommendations
   */
  async analyzeDecisionFatigue(request: PsychologyAnalysisRequest): Promise<PsychologyAnalysisResponse> {
    const cacheKey = `psychology:analysis:${request.customer_id}:${JSON.stringify(request)}`;
    
    // Try cache first
    const cached = await cacheService.get<PsychologyAnalysisResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.psychologyData) {
      await this.initialize();
    }

    // Calculate decision fatigue score
    const fatigueAnalysis = this.calculateDecisionFatigue(request);
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(fatigueAnalysis.current_session_score, request.session_duration, request.choices_viewed);
    
    // Get emotional triggers for this customer profile
    const emotionalTriggers = await this.getEmotionalTriggers(request.customer_id);
    
    // Generate personalization adjustments
    const adjustments = this.generatePersonalizationAdjustments(fatigueAnalysis, riskLevel, emotionalTriggers);
    
    // Create recommendations
    const recommendedActions = this.generateRecommendedActions(fatigueAnalysis, riskLevel);
    
    const response: PsychologyAnalysisResponse = {
      fatigue_score: fatigueAnalysis.current_session_score,
      risk_level: riskLevel,
      recommended_actions: recommendedActions,
      optimal_choice_count: this.calculateOptimalChoiceCount(fatigueAnalysis.current_session_score),
      recovery_timing: this.calculateRecoveryTiming(fatigueAnalysis.current_session_score),
      emotional_triggers: emotionalTriggers,
      personalization_adjustments: adjustments
    };

    // Cache the response
    await cacheService.set(cacheKey, response, {
      ttl: 30 * 60, // 30 minutes
      tags: ['psychology', 'analysis'],
    });

    return response;
  }

  /**
   * Get customer psychology profile
   */
  async getCustomerProfile(customerId: string): Promise<CustomerPsychologyProfile | null> {
    const cacheKey = `psychology:profile:${customerId}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        if (!this.psychologyData) {
          await this.initialize();
        }

        // For now, create a profile based on available data
        // In a production system, this would come from customer database
        const profileData = this.findCustomerDataById(customerId);
        
        if (!profileData) {
          return this.createDefaultProfile(customerId);
        }

        return this.transformToPsychologyProfile(profileData, customerId);
      },
      {
        ttl: 60 * 60, // 1 hour
        tags: ['psychology', 'profile'],
      }
    );
  }

  /**
   * Update customer psychology profile
   */
  async updateCustomerProfile(customerId: string, updates: Partial<CustomerPsychologyProfile>): Promise<CustomerPsychologyProfile> {
    const existingProfile = await this.getCustomerProfile(customerId);
    
    if (!existingProfile) {
      throw new Error(`Customer profile not found: ${customerId}`);
    }

    const updatedProfile: CustomerPsychologyProfile = {
      ...existingProfile,
      ...updates,
      last_updated: new Date().toISOString()
    };

    // Cache the updated profile
    const cacheKey = `psychology:profile:${customerId}`;
    await cacheService.set(cacheKey, updatedProfile, {
      ttl: 60 * 60, // 1 hour
      tags: ['psychology', 'profile'],
    });

    return updatedProfile;
  }

  /**
   * Get personalization recommendations based on psychology profile
   */
  async getPersonalizationRecommendations(
    customerId: string,
    context: {
      session_duration?: number;
      choices_viewed?: number;
      page_type?: string;
      time_of_day?: string;
    }
  ): Promise<PersonalizationAdjustment[]> {
    const profile = await this.getCustomerProfile(customerId);
    
    if (!profile) {
      return this.getDefaultPersonalizationRecommendations();
    }

    const adjustments: PersonalizationAdjustment[] = [];

    // Decision fatigue adjustments
    if (profile.decision_fatigue_score > 70) {
      adjustments.push({
        adjustment_type: 'choice_reduction',
        specific_action: `Limit options to ${profile.optimal_choice_count} items`,
        expected_impact: 'Reduce cognitive load and improve decision quality'
      });
    }

    // Emotional trigger adjustments
    profile.emotional_triggers.forEach(trigger => {
      if (trigger.intensity > 7) {
        adjustments.push({
          adjustment_type: 'messaging_change',
          specific_action: `Emphasize ${trigger.trigger_type} messaging`,
          expected_impact: `Appeal to primary motivator (${trigger.trigger_type})`
        });
      }
    });

    // Time-based adjustments
    if (context.session_duration && context.session_duration > profile.recovery_timing * 60 * 1000) {
      adjustments.push({
        adjustment_type: 'timing_delay',
        specific_action: 'Suggest taking a break or saving for later',
        expected_impact: 'Prevent decision fatigue from affecting purchase quality'
      });
    }

    // Risk level adjustments
    if (profile.risk_level === 'high' || profile.risk_level === 'critical') {
      adjustments.push({
        adjustment_type: 'format_change',
        specific_action: 'Switch to guided experience with fewer decisions',
        expected_impact: 'Reduce abandonment risk and improve completion rate'
      });
    }

    return adjustments;
  }

  /**
   * Calculate decision fatigue score
   */
  private calculateDecisionFatigue(request: PsychologyAnalysisRequest): DecisionFatigueAnalysis {
    const baseScore = 20; // Starting baseline
    let fatigueScore = baseScore;

    // Session duration impact (exponential curve)
    const sessionMinutes = request.session_duration / (1000 * 60);
    fatigueScore += Math.min(sessionMinutes * 2, 30);

    // Choices viewed impact (logarithmic curve to prevent infinite growth)
    fatigueScore += Math.min(Math.log(request.choices_viewed + 1) * 10, 25);

    // Previous sessions impact
    if (request.previous_sessions && request.previous_sessions.length > 0) {
      const recentSessions = request.previous_sessions.slice(-3); // Last 3 sessions
      const avgPreviousFatigue = recentSessions.reduce((sum, session) => {
        return sum + (session.duration / 1000 / 60) + session.choices_made;
      }, 0) / recentSessions.length;
      
      fatigueScore += Math.min(avgPreviousFatigue * 0.3, 15);
    }

    // Cap at 100
    fatigueScore = Math.min(fatigueScore, 100);

    // Generate fatigue indicators
    const indicators: string[] = [];
    if (fatigueScore > 70) indicators.push('High cognitive load detected');
    if (sessionMinutes > 15) indicators.push('Extended session duration');
    if (request.choices_viewed > 20) indicators.push('Excessive option exploration');
    
    return {
      current_session_score: Math.round(fatigueScore),
      choices_viewed: request.choices_viewed,
      session_duration: request.session_duration,
      fatigue_indicators: indicators,
      recommended_actions: [],
      intervention_timing: Math.max(1, 10 - Math.floor(fatigueScore / 10))
    };
  }

  /**
   * Assess risk level based on fatigue score and other factors
   */
  private assessRiskLevel(fatigueScore: number, sessionDuration: number, choicesViewed: number): DecisionFatigueRisk {
    if (fatigueScore >= 85 || sessionDuration > 30 * 60 * 1000 || choicesViewed > 50) {
      return 'critical';
    }
    if (fatigueScore >= 70 || sessionDuration > 20 * 60 * 1000 || choicesViewed > 30) {
      return 'high';
    }
    if (fatigueScore >= 50 || sessionDuration > 10 * 60 * 1000 || choicesViewed > 15) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get emotional triggers for a customer
   */
  private async getEmotionalTriggers(customerId: string): Promise<EmotionalTrigger[]> {
    // For demonstration, return common triggers based on psychology data
    // In production, this would be personalized based on customer behavior
    return [
      {
        trigger_type: 'confidence',
        intensity: 8,
        context: ['professional', 'social'],
        messaging_approach: 'Emphasize how this enhances professional presence and confidence'
      },
      {
        trigger_type: 'quality',
        intensity: 7,
        context: ['investment', 'longevity'],
        messaging_approach: 'Highlight craftsmanship, materials, and long-term value'
      }
    ];
  }

  /**
   * Generate personalization adjustments
   */
  private generatePersonalizationAdjustments(
    fatigueAnalysis: DecisionFatigueAnalysis,
    riskLevel: DecisionFatigueRisk,
    emotionalTriggers: EmotionalTrigger[]
  ): PersonalizationAdjustment[] {
    const adjustments: PersonalizationAdjustment[] = [];

    // Based on fatigue level
    if (fatigueAnalysis.current_session_score > 60) {
      adjustments.push({
        adjustment_type: 'choice_reduction',
        specific_action: 'Reduce visible options by 50%',
        expected_impact: 'Lower cognitive load, faster decisions'
      });
    }

    // Based on risk level
    if (riskLevel === 'high' || riskLevel === 'critical') {
      adjustments.push({
        adjustment_type: 'format_change',
        specific_action: 'Switch to curator-guided selection',
        expected_impact: 'Prevent abandonment, improve satisfaction'
      });
    }

    // Based on emotional triggers
    const primaryTrigger = emotionalTriggers.reduce((prev, current) => 
      prev.intensity > current.intensity ? prev : current
    );

    adjustments.push({
      adjustment_type: 'messaging_change',
      specific_action: `Prioritize ${primaryTrigger.trigger_type}-focused messaging`,
      expected_impact: `Align with primary emotional driver`
    });

    return adjustments;
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(fatigueAnalysis: DecisionFatigueAnalysis, riskLevel: DecisionFatigueRisk): string[] {
    const actions: string[] = [];

    if (riskLevel === 'critical') {
      actions.push('Immediate intervention required - suggest break or simplified flow');
      actions.push('Activate save-for-later functionality');
      actions.push('Switch to phone consultation option');
    } else if (riskLevel === 'high') {
      actions.push('Reduce choice complexity');
      actions.push('Provide clear recommendations');
      actions.push('Offer guided shopping experience');
    } else if (riskLevel === 'medium') {
      actions.push('Highlight top recommendations');
      actions.push('Provide comparison tools');
      actions.push('Show limited-time social proof');
    } else {
      actions.push('Maintain current experience');
      actions.push('Show full product range');
      actions.push('Enable detailed customization');
    }

    return actions;
  }

  /**
   * Calculate optimal choice count
   */
  private calculateOptimalChoiceCount(fatigueScore: number): number {
    if (fatigueScore >= 80) return 3;
    if (fatigueScore >= 60) return 5;
    if (fatigueScore >= 40) return 7;
    return 10;
  }

  /**
   * Calculate recovery timing in minutes
   */
  private calculateRecoveryTiming(fatigueScore: number): number {
    if (fatigueScore >= 80) return 15;
    if (fatigueScore >= 60) return 10;
    if (fatigueScore >= 40) return 5;
    return 2;
  }

  /**
   * Find customer data by ID (mock implementation)
   */
  private findCustomerDataById(customerId: string): any {
    // In production, this would query the customer database
    // For now, return null to trigger default profile creation
    return null;
  }

  /**
   * Create default psychology profile
   */
  private createDefaultProfile(customerId: string): CustomerPsychologyProfile {
    return {
      customer_id: customerId,
      decision_fatigue_score: 30,
      optimal_choice_count: 7,
      emotional_triggers: [
        {
          trigger_type: 'quality',
          intensity: 6,
          context: ['value', 'durability'],
          messaging_approach: 'Focus on quality and craftsmanship'
        }
      ],
      behavioral_patterns: [
        {
          pattern_type: 'browsing',
          frequency: 'regular',
          indicators: ['methodical_comparison'],
          optimization_strategy: 'provide_detailed_information'
        }
      ],
      recovery_timing: 5,
      risk_level: 'low',
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Transform raw data to psychology profile
   */
  private transformToPsychologyProfile(data: any, customerId: string): CustomerPsychologyProfile {
    return enhancedDataLoader.transformToPsychologyProfiles([data])[0] || this.createDefaultProfile(customerId);
  }

  /**
   * Get default personalization recommendations
   */
  private getDefaultPersonalizationRecommendations(): PersonalizationAdjustment[] {
    return [
      {
        adjustment_type: 'messaging_change',
        specific_action: 'Use balanced quality and value messaging',
        expected_impact: 'Appeal to common motivators'
      }
    ];
  }

  /**
   * Get personality-based preferences
   */
  async getPersonalityPreferences(personalityType: PersonalityType): Promise<any> {
    if (!this.bodyLanguageData) {
      await this.initialize();
    }

    const cacheKey = `psychology:personality:${personalityType}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const preferences = this.bodyLanguageData?.personality_preferences?.[personalityType];
        return preferences || {
          style_philosophy: 'Balanced approach',
          fit_preference: 'Modern fit',
          key_characteristics: ['Quality focused'],
          suit_style: 'Classic business',
          body_language: 'Professional confidence'
        };
      },
      {
        ttl: 4 * 60 * 60, // 4 hours
        tags: ['psychology', 'personality'],
      }
    );
  }

  /**
   * Clear psychology-related caches
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateByTags(['psychology']);
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
    const dataLoaded = this.psychologyData !== null && this.bodyLanguageData !== null;
    const cacheStats = await cacheService.getStats();
    
    return {
      status: dataLoaded ? 'healthy' : 'degraded',
      data_loaded: dataLoaded,
      cache_status: `${(cacheStats as any)?.keys_count || 0} keys cached`,
      last_update: new Date().toISOString()
    };
  }
}

export const customerPsychologyService = new CustomerPsychologyService();