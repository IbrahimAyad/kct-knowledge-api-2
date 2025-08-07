/**
 * Chat Integration Service - Phase 2
 * Connects chat services to all existing KCT Knowledge API services
 * Provides unified API access for conversation intelligence
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { fashionClipService } from './fashion-clip-service';
import { customerPsychologyService } from './customer-psychology-service';
import { careerIntelligenceService } from './career-intelligence-service';
import { venueIntelligenceService } from './venue-intelligence-service';
import { culturalAdaptationService } from './cultural-adaptation-service';
import { smartBundleService } from './smart-bundle-service';
import { trendingAnalysisService } from './trending-analysis-service';
import { colorService } from './color-service';

import {
  ConversationContext,
  Intent,
  ChatResponse,
  FrameworkType
} from '../types/chat';

export interface EnhancedContextRequest {
  customerId?: string;
  sessionId: string;
  intent: Intent;
  conversationContext: ConversationContext;
  additionalData?: {
    imageUrls?: string[];
    location?: string;
    timeOfDay?: string;
    deviceType?: string;
    referrerPage?: string;
  };
}

export interface IntegratedIntelligenceResponse {
  visualAnalysis?: {
    styleClassification: any;
    colorAnalysis: any;
    outfitRecommendations: any;
  };
  psychologyInsights?: {
    fatigueAnalysis: any;
    emotionalState: string;
    personalizationTriggers: any[];
  };
  careerContext?: {
    professionalLevel: string;
    wardrobeNeeds: any[];
    investmentRecommendations: any;
  };
  venueIntelligence?: {
    appropriateness: any;
    lightingConsiderations: any;
    culturalFactors: any;
  };
  smartBundles?: {
    recommendedBundles: any[];
    upsellOpportunities: any[];
  };
  trendingInsights?: {
    currentTrends: any[];
    seasonalRecommendations: any[];
  };
  colorIntelligence?: {
    personalColors: any;
    combinationRules: any;
    seasonalMatching: any;
  };
}

export interface ConversationEnhancement {
  contextualInsights: IntegratedIntelligenceResponse;
  responseModifiers: {
    tonalAdjustments: string[];
    contentPersonalization: string[];
    priorityTopics: string[];
  };
  conversationFlow: {
    suggestedNextTopics: string[];
    naturalTransitions: string[];
    opportunityMoments: string[];
  };
  businessIntelligence: {
    conversionOpportunities: any[];
    crossSellMoments: any[];
    retentionTriggers: any[];
  };
}

class ChatIntegrationService {
  private initialized = false;
  private serviceHealth: Map<string, boolean> = new Map();

  /**
   * Initialize all integrated services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🔗 Initializing Chat Integration Service...');

      // Initialize all services in parallel
      const initPromises = [
        this.initializeService('fashionClip', () => fashionClipService.initialize()),
        this.initializeService('customerPsychology', () => customerPsychologyService.initialize()),
        this.initializeService('careerIntelligence', () => careerIntelligenceService.initialize()),
        this.initializeService('venueIntelligence', () => venueIntelligenceService.initialize()),
        this.initializeService('culturalAdaptation', () => culturalAdaptationService.initialize()),
        this.initializeService('smartBundle', () => smartBundleService.initialize()),
        this.initializeService('trendingAnalysis', () => trendingAnalysisService.initialize()),
        this.initializeService('colorService', () => colorService.initialize())
      ];

      await Promise.allSettled(initPromises);

      this.initialized = true;
      logger.info('✅ Chat Integration Service initialized successfully');
      logger.info(`🔗 Service Health Status: ${this.getHealthSummary()}`);

    } catch (error) {
      logger.error('❌ Failed to initialize Chat Integration Service:', error);
      throw error;
    }
  }

  /**
   * Get enhanced conversation context by integrating all services
   */
  async getEnhancedContext(request: EnhancedContextRequest): Promise<ConversationEnhancement> {
    const cacheKey = `chat-integration:enhanced-context:${request.sessionId}:${JSON.stringify(request.intent)}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get<ConversationEnhancement>(cacheKey);
      if (cached) {
        logger.debug('Chat integration cache hit');
        return cached;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      logger.info(`🔗 Building enhanced context for session: ${request.sessionId}`);

      // Gather intelligence from all services in parallel
      const intelligenceResponse = await this.gatherIntegratedIntelligence(request);

      // Generate response modifiers based on intelligence
      const responseModifiers = await this.generateResponseModifiers(intelligenceResponse, request);

      // Create conversation flow recommendations
      const conversationFlow = await this.generateConversationFlow(intelligenceResponse, request);

      // Identify business opportunities
      const businessIntelligence = await this.generateBusinessIntelligence(intelligenceResponse, request);

      const enhancement: ConversationEnhancement = {
        contextualInsights: intelligenceResponse,
        responseModifiers,
        conversationFlow,
        businessIntelligence
      };

      // Cache the result for 10 minutes (conversation-scoped)
      await cacheService.set(cacheKey, enhancement, 600);

      logger.info(`✅ Enhanced context built with ${Object.keys(intelligenceResponse).length} intelligence sources`);
      return enhancement;

    } catch (error) {
      logger.error('❌ Failed to build enhanced context:', error);
      throw error;
    }
  }

  /**
   * Get visual analysis for conversation
   */
  async getVisualAnalysis(imageUrls: string[], intent: Intent): Promise<any> {
    if (!this.serviceHealth.get('fashionClip')) {
      logger.warn('Fashion-CLIP service unavailable, skipping visual analysis');
      return null;
    }

    try {
      logger.info(`🎨 Analyzing ${imageUrls.length} images for conversation context`);

      const analysisPromises = imageUrls.map(async (imageUrl) => {
        return await fashionClipService.getComprehensiveAnalysis(imageUrl);
      });

      const analyses = await Promise.allSettled(analysisPromises);
      const successfulAnalyses = analyses
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      if (successfulAnalyses.length === 0) {
        logger.warn('No successful visual analyses completed');
        return null;
      }

      // Aggregate analysis results
      return {
        totalImages: imageUrls.length,
        successfulAnalyses: successfulAnalyses.length,
        styleClassification: this.aggregateStyleClassifications(successfulAnalyses),
        colorAnalysis: this.aggregateColorAnalyses(successfulAnalyses),
        outfitRecommendations: this.aggregateOutfitRecommendations(successfulAnalyses)
      };

    } catch (error) {
      logger.error('❌ Visual analysis failed:', error);
      return null;
    }
  }

  /**
   * Get psychology insights for conversation
   */
  async getPsychologyInsights(customerId: string, conversationContext: ConversationContext): Promise<any> {
    if (!this.serviceHealth.get('customerPsychology')) {
      logger.warn('Customer Psychology service unavailable, skipping psychology insights');
      return null;
    }

    try {
      const sessionDuration = Date.now() - new Date(conversationContext.sessionContext.startTime || Date.now()).getTime();
      const choicesViewed = conversationContext.sessionContext.choicesViewed || 0;

      const analysisRequest = {
        customer_id: customerId || 'anonymous',
        session_duration: sessionDuration,
        choices_viewed: choicesViewed,
        previous_sessions: conversationContext.sessionContext.previousSessions || []
      };

      const psychologyResponse = await customerPsychologyService.analyzeDecisionFatigue(analysisRequest);

      return {
        fatigueAnalysis: {
          score: psychologyResponse.fatigue_score,
          riskLevel: psychologyResponse.risk_level,
          optimalChoiceCount: psychologyResponse.optimal_choice_count
        },
        emotionalState: this.determineEmotionalState(psychologyResponse),
        personalizationTriggers: psychologyResponse.personalization_adjustments || []
      };

    } catch (error) {
      logger.error('❌ Psychology insights failed:', error);
      return null;
    }
  }

  /**
   * Get career context insights
   */
  async getCareerContext(customerId: string, intent: Intent): Promise<any> {
    if (!this.serviceHealth.get('careerIntelligence')) {
      logger.warn('Career Intelligence service unavailable, skipping career context');
      return null;
    }

    try {
      // Extract career-related entities from intent
      const careerEntities = this.extractCareerEntities(intent);
      
      if (!careerEntities.industry && !careerEntities.position && !intent.entities.occasion?.includes('business')) {
        return null; // No career context needed
      }

      const careerRequest = {
        customer_id: customerId || 'anonymous',
        current_industry: careerEntities.industry,
        current_role: careerEntities.position,
        career_stage: careerEntities.stage,
        upcoming_events: careerEntities.events
      };

      const careerResponse = await careerIntelligenceService.analyzeCareerTrajectory(careerRequest);

      return {
        professionalLevel: careerResponse.advancement_probability?.current_level || 'professional',
        wardrobeNeeds: careerResponse.wardrobe_recommendations || [],
        investmentRecommendations: careerResponse.investment_strategy || {}
      };

    } catch (error) {
      logger.error('❌ Career context failed:', error);
      return null;
    }
  }

  /**
   * Get venue and cultural intelligence
   */
  async getVenueIntelligence(intent: Intent, location?: string): Promise<any> {
    if (!this.serviceHealth.get('venueIntelligence') || !this.serviceHealth.get('culturalAdaptation')) {
      logger.warn('Venue/Cultural services unavailable, skipping venue intelligence');
      return null;
    }

    try {
      const venue = intent.entities.venue || intent.entities.location;
      const occasion = intent.entities.occasion;

      if (!venue && !occasion) {
        return null; // No venue context needed
      }

      const [venueResponse, culturalResponse] = await Promise.allSettled([
        venueIntelligenceService.analyzeVenueRequirements({
          venue_type: venue,
          occasion_type: occasion,
          location: location
        }),
        culturalAdaptationService.getCulturalContext({
          location: location || 'general',
          occasion: occasion,
          demographic_context: intent.entities.demographic || {}
        })
      ]);

      const venueData = venueResponse.status === 'fulfilled' ? venueResponse.value : null;
      const culturalData = culturalResponse.status === 'fulfilled' ? culturalResponse.value : null;

      return {
        appropriateness: venueData?.dress_code_analysis || {},
        lightingConsiderations: venueData?.lighting_analysis || {},
        culturalFactors: culturalData?.cultural_considerations || {}
      };

    } catch (error) {
      logger.error('❌ Venue intelligence failed:', error);
      return null;
    }
  }

  /**
   * Get smart bundle recommendations
   */
  async getSmartBundles(customerId: string, intent: Intent, conversationContext: ConversationContext): Promise<any> {
    if (!this.serviceHealth.get('smartBundle')) {
      logger.warn('Smart Bundle service unavailable, skipping bundle recommendations');
      return null;
    }

    try {
      const preferences = conversationContext.customerPreferences || {};
      const occasion = intent.entities.occasion;
      const budget = intent.entities.budget;

      const bundleRequest = {
        customer_id: customerId || 'anonymous',
        occasion_type: occasion,
        budget_range: budget,
        style_preferences: preferences.style || [],
        conversation_context: {
          intent_category: intent.category,
          entities: intent.entities
        }
      };

      const bundleResponse = await smartBundleService.generatePersonalizedBundles(bundleRequest);

      return {
        recommendedBundles: bundleResponse.recommended_bundles || [],
        upsellOpportunities: bundleResponse.upsell_opportunities || []
      };

    } catch (error) {
      logger.error('❌ Smart bundles failed:', error);
      return null;
    }
  }

  /**
   * Get trending insights
   */
  async getTrendingInsights(intent: Intent): Promise<any> {
    if (!this.serviceHealth.get('trendingAnalysis')) {
      logger.warn('Trending Analysis service unavailable, skipping trending insights');
      return null;
    }

    try {
      const season = this.getCurrentSeason();
      const occasion = intent.entities.occasion;

      const [trendingResponse, seasonalResponse] = await Promise.allSettled([
        trendingAnalysisService.getCurrentTrends({
          category: occasion || 'general',
          time_period: 'current'
        }),
        trendingAnalysisService.getSeasonalAnalysis({
          season: season,
          occasion: occasion
        })
      ]);

      const trendingData = trendingResponse.status === 'fulfilled' ? trendingResponse.value : null;
      const seasonalData = seasonalResponse.status === 'fulfilled' ? seasonalResponse.value : null;

      return {
        currentTrends: trendingData?.trending_items || [],
        seasonalRecommendations: seasonalData?.seasonal_recommendations || []
      };

    } catch (error) {
      logger.error('❌ Trending insights failed:', error);
      return null;
    }
  }

  /**
   * Get color intelligence
   */
  async getColorIntelligence(intent: Intent, imageUrls?: string[]): Promise<any> {
    if (!this.serviceHealth.get('colorService')) {
      logger.warn('Color Service unavailable, skipping color intelligence');
      return null;
    }

    try {
      const colorPreferences = intent.entities.colors || [];
      const occasion = intent.entities.occasion;

      const [personalColors, combinationRules, seasonalMatching] = await Promise.allSettled([
        colorService.getPersonalColorProfile({
          preferred_colors: colorPreferences,
          occasion: occasion
        }),
        colorService.getColorCombinationRules({
          base_colors: colorPreferences,
          formality_level: this.determineFormalityLevel(intent)
        }),
        colorService.getSeasonalColorRecommendations({
          season: this.getCurrentSeason(),
          occasion: occasion
        })
      ]);

      return {
        personalColors: personalColors.status === 'fulfilled' ? personalColors.value : null,
        combinationRules: combinationRules.status === 'fulfilled' ? combinationRules.value : null,
        seasonalMatching: seasonalMatching.status === 'fulfilled' ? seasonalMatching.value : null
      };

    } catch (error) {
      logger.error('❌ Color intelligence failed:', error);
      return null;
    }
  }

  // Private helper methods

  private async initializeService(serviceName: string, initFunction: () => Promise<void>): Promise<void> {
    try {
      await initFunction();
      this.serviceHealth.set(serviceName, true);
      logger.debug(`✅ ${serviceName} service initialized`);
    } catch (error) {
      this.serviceHealth.set(serviceName, false);
      logger.warn(`⚠️ ${serviceName} service failed to initialize:`, error);
    }
  }

  private async gatherIntegratedIntelligence(request: EnhancedContextRequest): Promise<IntegratedIntelligenceResponse> {
    const { customerId, intent, conversationContext, additionalData } = request;

    // Gather intelligence from all services in parallel
    const [
      visualAnalysis,
      psychologyInsights,
      careerContext,
      venueIntelligence,
      smartBundles,
      trendingInsights,
      colorIntelligence
    ] = await Promise.allSettled([
      additionalData?.imageUrls ? this.getVisualAnalysis(additionalData.imageUrls, intent) : Promise.resolve(null),
      this.getPsychologyInsights(customerId || '', conversationContext),
      this.getCareerContext(customerId || '', intent),
      this.getVenueIntelligence(intent, additionalData?.location),
      this.getSmartBundles(customerId || '', intent, conversationContext),
      this.getTrendingInsights(intent),
      this.getColorIntelligence(intent, additionalData?.imageUrls)
    ]);

    return {
      visualAnalysis: visualAnalysis.status === 'fulfilled' ? visualAnalysis.value : undefined,
      psychologyInsights: psychologyInsights.status === 'fulfilled' ? psychologyInsights.value : undefined,
      careerContext: careerContext.status === 'fulfilled' ? careerContext.value : undefined,
      venueIntelligence: venueIntelligence.status === 'fulfilled' ? venueIntelligence.value : undefined,
      smartBundles: smartBundles.status === 'fulfilled' ? smartBundles.value : undefined,
      trendingInsights: trendingInsights.status === 'fulfilled' ? trendingInsights.value : undefined,
      colorIntelligence: colorIntelligence.status === 'fulfilled' ? colorIntelligence.value : undefined
    };
  }

  private async generateResponseModifiers(
    intelligence: IntegratedIntelligenceResponse,
    request: EnhancedContextRequest
  ): Promise<{ tonalAdjustments: string[]; contentPersonalization: string[]; priorityTopics: string[] }> {
    const tonalAdjustments: string[] = [];
    const contentPersonalization: string[] = [];
    const priorityTopics: string[] = [];

    // Psychology-based adjustments
    if (intelligence.psychologyInsights) {
      const { fatigueAnalysis, emotionalState } = intelligence.psychologyInsights;
      
      if (fatigueAnalysis?.riskLevel === 'high' || fatigueAnalysis?.riskLevel === 'critical') {
        tonalAdjustments.push('simplify_language', 'reduce_options', 'be_decisive');
        priorityTopics.push('quick_decision_support');
      }

      if (emotionalState === 'anxious') {
        tonalAdjustments.push('reassuring', 'confident', 'supportive');
      } else if (emotionalState === 'excited') {
        tonalAdjustments.push('enthusiastic', 'detailed', 'comprehensive');
      }
    }

    // Career-based adjustments
    if (intelligence.careerContext) {
      contentPersonalization.push(`career_level:${intelligence.careerContext.professionalLevel}`);
      priorityTopics.push('professional_appropriateness', 'career_advancement');
    }

    // Visual analysis adjustments
    if (intelligence.visualAnalysis) {
      priorityTopics.push('visual_coherence', 'style_matching');
      contentPersonalization.push('visual_reference_available');
    }

    // Venue-specific adjustments
    if (intelligence.venueIntelligence) {
      priorityTopics.push('venue_appropriateness', 'cultural_sensitivity');
    }

    return { tonalAdjustments, contentPersonalization, priorityTopics };
  }

  private async generateConversationFlow(
    intelligence: IntegratedIntelligenceResponse,
    request: EnhancedContextRequest
  ): Promise<{ suggestedNextTopics: string[]; naturalTransitions: string[]; opportunityMoments: string[] }> {
    const suggestedNextTopics: string[] = [];
    const naturalTransitions: string[] = [];
    const opportunityMoments: string[] = [];

    // Based on smart bundles
    if (intelligence.smartBundles?.recommendedBundles?.length > 0) {
      suggestedNextTopics.push('complementary_pieces', 'complete_looks');
      naturalTransitions.push('Now that we have your main piece, let\'s think about...');
      opportunityMoments.push('bundle_recommendation');
    }

    // Based on trending insights
    if (intelligence.trendingInsights?.currentTrends?.length > 0) {
      suggestedNextTopics.push('trending_styles', 'seasonal_updates');
      naturalTransitions.push('Speaking of current trends...');
    }

    // Based on career context
    if (intelligence.careerContext) {
      suggestedNextTopics.push('professional_wardrobe', 'investment_pieces');
      naturalTransitions.push('For your professional needs...');
      opportunityMoments.push('career_wardrobe_expansion');
    }

    return { suggestedNextTopics, naturalTransitions, opportunityMoments };
  }

  private async generateBusinessIntelligence(
    intelligence: IntegratedIntelligenceResponse,
    request: EnhancedContextRequest
  ): Promise<{ conversionOpportunities: any[]; crossSellMoments: any[]; retentionTriggers: any[] }> {
    const conversionOpportunities: any[] = [];
    const crossSellMoments: any[] = [];
    const retentionTriggers: any[] = [];

    // High psychology fatigue = need for quick conversion
    if (intelligence.psychologyInsights?.fatigueAnalysis?.riskLevel === 'high') {
      conversionOpportunities.push({
        type: 'urgency',
        message: 'Limited decision bandwidth detected - focus on top recommendation',
        action: 'present_single_best_option'
      });
    }

    // Smart bundles create cross-sell opportunities
    if (intelligence.smartBundles?.upsellOpportunities?.length > 0) {
      crossSellMoments.push(...intelligence.smartBundles.upsellOpportunities.map((opp: any) => ({
        type: 'bundle_upsell',
        items: opp.items,
        value_proposition: opp.value_proposition
      })));
    }

    // Career advancement creates retention opportunities
    if (intelligence.careerContext?.investmentRecommendations) {
      retentionTriggers.push({
        type: 'career_growth',
        trigger: 'Professional wardrobe investment',
        follow_up_timing: '3_months'
      });
    }

    return { conversionOpportunities, crossSellMoments, retentionTriggers };
  }

  // Utility methods

  private aggregateStyleClassifications(analyses: any[]): any {
    const styles = analyses.flatMap(a => a.style?.results?.style_classification?.secondary_styles || []);
    const styleMap = new Map();
    
    styles.forEach(style => {
      const current = styleMap.get(style.style) || { style: style.style, totalConfidence: 0, count: 0 };
      current.totalConfidence += style.confidence;
      current.count += 1;
      styleMap.set(style.style, current);
    });

    return Array.from(styleMap.values())
      .map(style => ({ ...style, averageConfidence: style.totalConfidence / style.count }))
      .sort((a, b) => b.averageConfidence - a.averageConfidence);
  }

  private aggregateColorAnalyses(analyses: any[]): any {
    const colors = analyses.flatMap(a => a.colors?.results?.color_analysis?.dominant_colors || []);
    const colorMap = new Map();
    
    colors.forEach(color => {
      const current = colorMap.get(color.color) || { color: color.color, totalPercentage: 0, count: 0, hex: color.hex };
      current.totalPercentage += color.percentage;
      current.count += 1;
      colorMap.set(color.color, current);
    });

    return Array.from(colorMap.values())
      .map(color => ({ ...color, averagePercentage: color.totalPercentage / color.count }))
      .sort((a, b) => b.averagePercentage - a.averagePercentage);
  }

  private aggregateOutfitRecommendations(analyses: any[]): any {
    return analyses
      .flatMap(a => a.outfit_suggestions?.generated_outfits || [])
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 5); // Top 5 outfit recommendations
  }

  private determineEmotionalState(psychologyResponse: any): string {
    const fatigueScore = psychologyResponse.fatigue_score;
    const riskLevel = psychologyResponse.risk_level;

    if (riskLevel === 'critical') return 'overwhelmed';
    if (riskLevel === 'high') return 'anxious';
    if (fatigueScore < 30) return 'excited';
    if (fatigueScore < 50) return 'engaged';
    return 'neutral';
  }

  private extractCareerEntities(intent: Intent): any {
    return {
      industry: intent.entities.industry || intent.entities.profession,
      position: intent.entities.position || intent.entities.role,
      stage: intent.entities.career_stage || 'professional',
      events: intent.entities.business_events || []
    };
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private determineFormalityLevel(intent: Intent): string {
    const occasion = intent.entities.occasion;
    if (!occasion) return 'business_casual';
    
    if (occasion.includes('black_tie') || occasion.includes('formal')) return 'formal';
    if (occasion.includes('business') || occasion.includes('professional')) return 'business';
    if (occasion.includes('casual')) return 'casual';
    return 'business_casual';
  }

  private getHealthSummary(): string {
    const totalServices = this.serviceHealth.size;
    const healthyServices = Array.from(this.serviceHealth.values()).filter(healthy => healthy).length;
    return `${healthyServices}/${totalServices} services healthy`;
  }

  /**
   * Get health check for all integrated services
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    summary: string;
  }> {
    const healthyCount = Array.from(this.serviceHealth.values()).filter(healthy => healthy).length;
    const totalCount = this.serviceHealth.size;
    const healthPercentage = totalCount > 0 ? healthyCount / totalCount : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthPercentage >= 0.8) status = 'healthy';
    else if (healthPercentage >= 0.5) status = 'degraded';
    else status = 'unhealthy';

    return {
      status,
      services: Object.fromEntries(this.serviceHealth),
      summary: this.getHealthSummary()
    };
  }

  /**
   * Clear all integration caches
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateByTags(['chat-integration']);
  }
}

export const chatIntegrationService = new ChatIntegrationService();