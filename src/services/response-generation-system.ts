/**
 * Response Generation System - Phase 2
 * Advanced template-based responses with personalization, dynamic builders, and multi-level depth
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { nlpIntelligenceService, NLPAnalysisResponse } from './nlp-intelligence-service';
import { contextAwarenessEngine } from './context-awareness-engine';
import { 
  ConversationContext, 
  Intent, 
  ChatResponse, 
  FrameworkType,
  ResponseLayer 
} from '../types/chat';

export interface ResponseTemplate {
  id: string;
  category: string;
  subcategory: string;
  framework: FrameworkType;
  layer: ResponseLayer;
  base_template: string;
  personalization_variables: string[];
  tone_variations: Record<string, string>;
  context_adaptations: Record<string, string>;
  follow_up_triggers: string[];
  validation_rules: string[];
}

export interface PersonalizationContext {
  customer_profile: {
    communication_style: string;
    formality_preference: string;
    detail_preference: 'brief' | 'moderate' | 'comprehensive';
    emotional_state: string;
    decision_readiness: number;
  };
  conversation_context: {
    stage: string;
    framework: FrameworkType;
    message_count: number;
    topics_discussed: string[];
    previous_responses: string[];
  };
  business_context: {
    urgency_level: string;
    conversion_opportunity: number;
    cross_sell_potential: string[];
    retention_risk: number;
  };
}

export interface ResponseDepthConfig {
  layer: ResponseLayer;
  max_length: number;
  detail_level: 'quick' | 'standard' | 'comprehensive';
  include_explanations: boolean;
  include_examples: boolean;
  include_alternatives: boolean;
  include_next_steps: boolean;
}

export interface GeneratedResponse {
  message: string;
  confidence: number;
  layer: ResponseLayer;
  personalization_applied: string[];
  tone_adaptations: string[];
  validation_passed: boolean;
  suggested_actions: string[];
  follow_up_hooks: string[];
  alternative_responses: string[];
  metadata: {
    template_used: string;
    generation_time_ms: number;
    personalization_score: number;
    safety_score: number;
  };
}

class ResponseGenerationSystem {
  private templates: Map<string, ResponseTemplate> = new Map();
  private toneAdaptations: Map<string, Record<string, string>> = new Map();
  private personalityProfiles: Map<string, any> = new Map();
  private safetyFilters: Map<string, RegExp[]> = new Map();
  private conversationPatterns: any = null;
  private initialized = false;

  /**
   * Initialize the Response Generation System
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('💬 Initializing Response Generation System...');

      // Load response templates
      await this.loadResponseTemplates();

      // Initialize tone adaptations
      await this.initializeToneAdaptations();

      // Load personality profiles
      await this.loadPersonalityProfiles();

      // Initialize safety filters
      await this.initializeSafetyFilters();

      // Load conversation patterns
      await this.loadConversationPatterns();

      this.initialized = true;
      logger.info('✅ Response Generation System initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Response Generation System:', error);
      throw error;
    }
  }

  /**
   * Generate personalized response with dynamic depth
   */
  async generateResponse(
    intent: Intent,
    context: ConversationContext,
    nlpAnalysis: NLPAnalysisResponse,
    depthConfig?: ResponseDepthConfig
  ): Promise<GeneratedResponse> {
    const cacheKey = `response:${this.generateCacheKey(intent, context, depthConfig)}`;

    try {
      // Check cache first (shorter TTL for responses)
      const cached = await cacheService.get<GeneratedResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      const startTime = Date.now();
      logger.debug(`💬 Generating response for intent: ${intent.category}, framework: ${context.frameworkType}`);

      // Get contextual insights
      const contextualInsights = await contextAwarenessEngine.getContextualInsights(context.sessionId);

      // Build personalization context
      const personalizationContext = await this.buildPersonalizationContext(
        context,
        nlpAnalysis,
        contextualInsights
      );

      // Determine response depth configuration
      const finalDepthConfig = depthConfig || await this.determineOptimalDepth(
        intent,
        personalizationContext,
        nlpAnalysis
      );

      // Select appropriate template
      const template = await this.selectTemplate(
        intent,
        context.frameworkType || 'atelier_ai',
        finalDepthConfig.layer,
        personalizationContext
      );

      // Generate base response
      const baseResponse = await this.generateBaseResponse(
        template,
        intent,
        context,
        personalizationContext
      );

      // Apply personalization
      const personalizedResponse = await this.applyPersonalization(
        baseResponse,
        template,
        personalizationContext,
        nlpAnalysis
      );

      // Apply tone adaptations
      const toneAdaptedResponse = await this.applyToneAdaptations(
        personalizedResponse.message,
        personalizationContext,
        nlpAnalysis.sentiment
      );

      // Apply depth configuration
      const depthAdjustedResponse = await this.applyDepthConfiguration(
        toneAdaptedResponse.message,
        finalDepthConfig,
        intent,
        context
      );

      // Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(
        intent,
        context,
        finalDepthConfig
      );

      // Generate follow-up hooks
      const followUpHooks = await this.generateFollowUpHooks(
        template,
        intent,
        context,
        nlpAnalysis
      );

      // Generate alternative responses
      const alternativeResponses = await this.generateAlternativeResponses(
        template,
        personalizedResponse.message,
        personalizationContext
      );

      // Validate response
      const validationResult = await this.validateResponse(
        depthAdjustedResponse.message,
        intent,
        context
      );

      const generatedResponse: GeneratedResponse = {
        message: validationResult.sanitized_message,
        confidence: this.calculateResponseConfidence(template, personalizedResponse, validationResult),
        layer: finalDepthConfig.layer,
        personalization_applied: personalizedResponse.personalization_applied,
        tone_adaptations: toneAdaptedResponse.adaptations_applied,
        validation_passed: validationResult.passed,
        suggested_actions: suggestedActions,
        follow_up_hooks: followUpHooks,
        alternative_responses: alternativeResponses.slice(0, 3),
        metadata: {
          template_used: template.id,
          generation_time_ms: Date.now() - startTime,
          personalization_score: personalizedResponse.personalization_score,
          safety_score: validationResult.safety_score
        }
      };

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, generatedResponse, 300);

      logger.debug(`✅ Response generated in ${generatedResponse.metadata.generation_time_ms}ms`);
      return generatedResponse;

    } catch (error) {
      logger.error('❌ Failed to generate response:', error);
      throw error;
    }
  }

  /**
   * Generate multiple response variations for A/B testing
   */
  async generateResponseVariations(
    intent: Intent,
    context: ConversationContext,
    nlpAnalysis: NLPAnalysisResponse,
    variationCount: number = 3
  ): Promise<GeneratedResponse[]> {
    try {
      const variations: GeneratedResponse[] = [];
      
      // Generate variations with different depth levels
      const depthConfigs: ResponseDepthConfig[] = [
        {
          layer: 1,
          max_length: 150,
          detail_level: 'quick',
          include_explanations: false,
          include_examples: false,
          include_alternatives: false,
          include_next_steps: true
        },
        {
          layer: 2,
          max_length: 300,
          detail_level: 'standard',
          include_explanations: true,
          include_examples: false,
          include_alternatives: true,
          include_next_steps: true
        },
        {
          layer: 3,
          max_length: 500,
          detail_level: 'comprehensive',
          include_explanations: true,
          include_examples: true,
          include_alternatives: true,
          include_next_steps: true
        }
      ];

      for (let i = 0; i < Math.min(variationCount, depthConfigs.length); i++) {
        const variation = await this.generateResponse(
          intent,
          context,
          nlpAnalysis,
          depthConfigs[i]
        );
        variations.push(variation);
      }

      return variations;

    } catch (error) {
      logger.error('❌ Failed to generate response variations:', error);
      throw error;
    }
  }

  // Private helper methods

  private async loadResponseTemplates(): Promise<void> {
    // Load templates for each framework and intent category
    const templates = this.getDefaultTemplates();
    
    for (const template of templates) {
      this.templates.set(template.id, template);
    }

    logger.debug(`📝 Loaded ${this.templates.size} response templates`);
  }

  private async initializeToneAdaptations(): Promise<void> {
    // Initialize tone adaptation patterns
    this.toneAdaptations.set('professional_friendly', {
      'greeting': 'Hello! I\'m happy to help you',
      'transition': 'Let me assist you with',
      'recommendation': 'I\'d recommend considering',
      'closing': 'Please let me know if you have any other questions'
    });

    this.toneAdaptations.set('enthusiastic_supportive', {
      'greeting': 'Hi there! I\'m excited to help you find',
      'transition': 'This is going to be perfect for',
      'recommendation': 'I absolutely love this option for you',
      'closing': 'I can\'t wait to see how this turns out!'
    });

    this.toneAdaptations.set('reassuring_confident', {
      'greeting': 'Don\'t worry, I\'m here to help',
      'transition': 'Let me guide you through',
      'recommendation': 'I\'m confident this will work perfectly',
      'closing': 'You\'re in good hands - we\'ll get this sorted'
    });

    this.toneAdaptations.set('empathetic_professional', {
      'greeting': 'I understand your concern, and I\'m here to help',
      'transition': 'Let me address that for you',
      'recommendation': 'Based on your situation, I\'d suggest',
      'closing': 'I\'m committed to resolving this for you'
    });
  }

  private async loadPersonalityProfiles(): Promise<void> {
    // Define personality-based communication preferences
    this.personalityProfiles.set('analytical', {
      preferred_detail_level: 'comprehensive',
      communication_style: 'data_driven',
      decision_factors: ['specifications', 'comparisons', 'reviews'],
      response_structure: 'logical_progression'
    });

    this.personalityProfiles.set('relationship_focused', {
      preferred_detail_level: 'moderate',
      communication_style: 'personal_connection',
      decision_factors: ['recommendations', 'social_proof', 'personal_stories'],
      response_structure: 'conversational_flow'
    });

    this.personalityProfiles.set('task_oriented', {
      preferred_detail_level: 'brief',
      communication_style: 'direct_efficient',
      decision_factors: ['quick_answers', 'next_steps', 'clear_options'],
      response_structure: 'action_focused'
    });
  }

  private async initializeSafetyFilters(): Promise<void> {
    // Initialize content safety filters
    this.safetyFilters.set('inappropriate_content', [
      /\b(damn|hell|crap)\b/gi,
      /\b(stupid|dumb|idiotic)\b/gi
    ]);

    this.safetyFilters.set('overpromising', [
      /\b(guarantee|promised|definitely will)\b/gi,
      /\b(best|perfect|amazing) (deal|price|ever)\b/gi
    ]);

    this.safetyFilters.set('pushy_sales', [
      /\b(buy now|limited time|act fast)\b/gi,
      /\b(you have to|you must|you need to buy)\b/gi
    ]);
  }

  private async loadConversationPatterns(): Promise<void> {
    try {
      // Load conversation patterns from NLP service or fallback
      this.conversationPatterns = {
        greeting_patterns: [
          "Hello! I'm here to help you find the perfect {item} for {occasion}",
          "Hi there! Looking for something special for {occasion}?",
          "Welcome! I'd love to help you find exactly what you're looking for"
        ],
        recommendation_patterns: [
          "Based on what you've told me, I think you'd love {recommendation} because {reason}",
          "For {occasion}, I'd recommend {recommendation} - it's perfect for {context}",
          "Given your {preference}, {recommendation} would be an excellent choice"
        ],
        transition_patterns: [
          "Now that we've covered {previous_topic}, let's talk about {new_topic}",
          "Speaking of {context}, have you considered {new_topic}?",
          "That brings up an important point about {new_topic}"
        ]
      };
    } catch (error) {
      logger.warn('⚠️ Could not load conversation patterns, using defaults');
    }
  }

  private async buildPersonalizationContext(
    context: ConversationContext,
    nlpAnalysis: NLPAnalysisResponse,
    contextualInsights: any
  ): Promise<PersonalizationContext> {
    return {
      customer_profile: {
        communication_style: contextualInsights.personalization_data?.communication_style || 'professional',
        formality_preference: this.determineFormalityPreference(nlpAnalysis, context),
        detail_preference: this.determineDetailPreference(nlpAnalysis, contextualInsights),
        emotional_state: nlpAnalysis.sentiment.emotional_state,
        decision_readiness: nlpAnalysis.sentiment.decision_readiness
      },
      conversation_context: {
        stage: context.currentStage || 'discovery',
        framework: context.frameworkType || 'atelier_ai',
        message_count: context.conversationHistory.length,
        topics_discussed: contextualInsights.conversation_state?.topics_discussed || [],
        previous_responses: context.conversationHistory
          .filter(m => m.role === 'assistant')
          .map(m => m.content)
          .slice(-3)
      },
      business_context: {
        urgency_level: nlpAnalysis.sentiment.urgency_level,
        conversion_opportunity: this.calculateConversionOpportunity(nlpAnalysis, contextualInsights),
        cross_sell_potential: contextualInsights.business_intelligence?.cross_sell_moments || [],
        retention_risk: this.calculateRetentionRisk(nlpAnalysis, contextualInsights)
      }
    };
  }

  private async determineOptimalDepth(
    intent: Intent,
    personalizationContext: PersonalizationContext,
    nlpAnalysis: NLPAnalysisResponse
  ): Promise<ResponseDepthConfig> {
    let layer: ResponseLayer = 2; // default
    let detailLevel: 'quick' | 'standard' | 'comprehensive' = 'standard';

    // Adjust based on emotional state and urgency
    if (nlpAnalysis.sentiment.urgency_level === 'critical' || 
        nlpAnalysis.sentiment.emotional_state === 'frustrated') {
      layer = 1;
      detailLevel = 'quick';
    } else if (personalizationContext.customer_profile.detail_preference === 'comprehensive' &&
               nlpAnalysis.sentiment.engagement_level > 0.7) {
      layer = 3;
      detailLevel = 'comprehensive';
    }

    // Adjust based on decision readiness
    if (personalizationContext.customer_profile.decision_readiness > 0.8) {
      layer = Math.min(layer + 1, 3) as ResponseLayer;
    }

    return {
      layer,
      max_length: layer === 1 ? 150 : layer === 2 ? 300 : 500,
      detail_level: detailLevel,
      include_explanations: layer >= 2,
      include_examples: layer === 3,
      include_alternatives: layer >= 2 && intent.category !== 'complaint',
      include_next_steps: true
    };
  }

  private async selectTemplate(
    intent: Intent,
    framework: FrameworkType,
    layer: ResponseLayer,
    personalizationContext: PersonalizationContext
  ): Promise<ResponseTemplate> {
    // Find templates matching criteria
    const matchingTemplates = Array.from(this.templates.values()).filter(template => 
      template.category === intent.category &&
      template.framework === framework &&
      template.layer === layer
    );

    if (matchingTemplates.length === 0) {
      // Fallback to default template
      return this.getDefaultTemplate(intent.category, framework, layer);
    }

    // Select best template based on context
    return matchingTemplates.reduce((best, current) => {
      const bestScore = this.scoreTemplate(best, personalizationContext);
      const currentScore = this.scoreTemplate(current, personalizationContext);
      return currentScore > bestScore ? current : best;
    });
  }

  private async generateBaseResponse(
    template: ResponseTemplate,
    intent: Intent,
    context: ConversationContext,
    personalizationContext: PersonalizationContext
  ): Promise<{ message: string; variables_used: string[] }> {
    let message = template.base_template;
    const variablesUsed: string[] = [];

    // Replace template variables
    for (const variable of template.personalization_variables) {
      const value = await this.getVariableValue(variable, intent, context, personalizationContext);
      if (value) {
        message = message.replace(new RegExp(`{${variable}}`, 'g'), value);
        variablesUsed.push(variable);
      }
    }

    // Clean up any remaining unreplaced variables
    message = message.replace(/{[^}]+}/g, '');

    return { message, variables_used: variablesUsed };
  }

  private async applyPersonalization(
    baseResponse: { message: string; variables_used: string[] },
    template: ResponseTemplate,
    personalizationContext: PersonalizationContext,
    nlpAnalysis: NLPAnalysisResponse
  ): Promise<{ message: string; personalization_applied: string[]; personalization_score: number }> {
    let message = baseResponse.message;
    const personalizationApplied: string[] = [];

    // Apply personality-based adaptations
    const personalityProfile = this.personalityProfiles.get(
      personalizationContext.customer_profile.communication_style
    );

    if (personalityProfile) {
      message = await this.applyPersonalityAdaptations(message, personalityProfile);
      personalizationApplied.push('personality_adaptation');
    }

    // Apply context-based adaptations
    if (template.context_adaptations) {
      const contextKey = `${personalizationContext.conversation_context.stage}_${personalizationContext.customer_profile.emotional_state}`;
      const adaptation = template.context_adaptations[contextKey];
      if (adaptation) {
        message = `${adaptation} ${message}`;
        personalizationApplied.push('context_adaptation');
      }
    }

    // Apply name personalization if available
    if (personalizationContext.customer_profile.communication_style === 'relationship_focused') {
      // In a real implementation, you'd have customer name from context
      personalizationApplied.push('relationship_personalization');
    }

    const personalizationScore = this.calculatePersonalizationScore(
      baseResponse.variables_used,
      personalizationApplied,
      personalizationContext
    );

    return {
      message,
      personalization_applied: personalizationApplied,
      personalization_score: personalizationScore
    };
  }

  private async applyToneAdaptations(
    message: string,
    personalizationContext: PersonalizationContext,
    sentiment: any
  ): Promise<{ message: string; adaptations_applied: string[] }> {
    const adaptationsApplied: string[] = [];
    let adaptedMessage = message;

    // Determine appropriate tone based on context
    const toneKey = this.determineToneKey(personalizationContext, sentiment);
    const toneAdaptations = this.toneAdaptations.get(toneKey);

    if (toneAdaptations) {
      // Apply tone-specific adaptations
      for (const [pattern, replacement] of Object.entries(toneAdaptations)) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
        if (regex.test(adaptedMessage)) {
          adaptedMessage = adaptedMessage.replace(regex, replacement);
          adaptationsApplied.push(`tone_${pattern}`);
        }
      }
    }

    return {
      message: adaptedMessage,
      adaptations_applied: adaptationsApplied
    };
  }

  private async applyDepthConfiguration(
    message: string,
    depthConfig: ResponseDepthConfig,
    intent: Intent,
    context: ConversationContext
  ): Promise<{ message: string; depth_features_added: string[] }> {
    let enhancedMessage = message;
    const depthFeaturesAdded: string[] = [];

    // Add explanations if required
    if (depthConfig.include_explanations && depthConfig.layer >= 2) {
      const explanation = await this.generateExplanation(intent, context);
      if (explanation) {
        enhancedMessage += ` ${explanation}`;
        depthFeaturesAdded.push('explanation');
      }
    }

    // Add examples if required
    if (depthConfig.include_examples && depthConfig.layer === 3) {
      const example = await this.generateExample(intent, context);
      if (example) {
        enhancedMessage += ` For example, ${example}`;
        depthFeaturesAdded.push('example');
      }
    }

    // Add alternatives if required
    if (depthConfig.include_alternatives && depthConfig.layer >= 2) {
      const alternatives = await this.generateAlternatives(intent, context);
      if (alternatives) {
        enhancedMessage += ` Alternatively, ${alternatives}`;
        depthFeaturesAdded.push('alternatives');
      }
    }

    // Add next steps if required
    if (depthConfig.include_next_steps) {
      const nextSteps = await this.generateNextSteps(intent, context);
      if (nextSteps) {
        enhancedMessage += ` ${nextSteps}`;
        depthFeaturesAdded.push('next_steps');
      }
    }

    // Ensure message doesn't exceed max length
    if (enhancedMessage.length > depthConfig.max_length) {
      enhancedMessage = this.truncateMessage(enhancedMessage, depthConfig.max_length);
      depthFeaturesAdded.push('truncated');
    }

    return {
      message: enhancedMessage,
      depth_features_added: depthFeaturesAdded
    };
  }

  private async validateResponse(
    message: string,
    intent: Intent,
    context: ConversationContext
  ): Promise<{ passed: boolean; sanitized_message: string; safety_score: number; issues: string[] }> {
    let sanitizedMessage = message;
    let safetyScore = 1.0;
    const issues: string[] = [];

    // Apply safety filters
    for (const [filterName, patterns] of this.safetyFilters.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(sanitizedMessage)) {
          sanitizedMessage = sanitizedMessage.replace(pattern, (match) => this.getSaferAlternative(match));
          safetyScore -= 0.1;
          issues.push(`${filterName}_detected`);
        }
      }
    }

    // Check for overly long responses (could indicate rambling)
    if (sanitizedMessage.length > 800) {
      issues.push('response_too_long');
      safetyScore -= 0.05;
    }

    // Check for repetitive content
    const words = sanitizedMessage.toLowerCase().split(' ');
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio < 0.6) {
      issues.push('repetitive_content');
      safetyScore -= 0.1;
    }

    const passed = safetyScore >= 0.7 && issues.length < 3;

    return {
      passed,
      sanitized_message: sanitizedMessage,
      safety_score: Math.max(safetyScore, 0),
      issues
    };
  }

  // Helper methods for template generation and scoring

  private scoreTemplate(template: ResponseTemplate, context: PersonalizationContext): number {
    let score = 0.5; // base score

    // Score based on framework match
    if (template.framework === context.conversation_context.framework) {
      score += 0.2;
    }

    // Score based on personalization variables availability
    const availableVars = template.personalization_variables.length;
    score += Math.min(availableVars * 0.05, 0.2);

    // Score based on tone variations
    const toneVariations = Object.keys(template.tone_variations).length;
    score += Math.min(toneVariations * 0.03, 0.1);

    return score;
  }

  private async getVariableValue(
    variable: string,
    intent: Intent,
    context: ConversationContext,
    personalizationContext: PersonalizationContext
  ): Promise<string | null> {
    switch (variable) {
      case 'occasion':
        return intent.entities.occasion || context.customerPreferences.occasions?.[0] || 'your event';
      case 'item':
        return intent.entities.product || 'the perfect piece';
      case 'customer_name':
        return 'valued customer'; // In real implementation, get from customer data
      case 'style_preference':
        return context.customerPreferences.style?.[0] || 'your preferred style';
      case 'budget_range':
        return context.customerPreferences.budget_range || 'your budget';
      case 'urgency':
        return personalizationContext.business_context.urgency_level;
      default:
        return null;
    }
  }

  private async applyPersonalityAdaptations(message: string, personalityProfile: any): Promise<string> {
    if (personalityProfile.response_structure === 'action_focused') {
      // Make the response more action-oriented
      if (!message.includes('let\'s') && !message.includes('we can')) {
        message = `Let's ${message.toLowerCase()}`;
      }
    } else if (personalityProfile.response_structure === 'conversational_flow') {
      // Make the response more conversational
      if (!message.includes('I') && !message.includes('you')) {
        message = `I'd love to help you with this. ${message}`;
      }
    }

    return message;
  }

  private calculatePersonalizationScore(
    variablesUsed: string[],
    personalizationApplied: string[],
    context: PersonalizationContext
  ): number {
    let score = 0.5; // base score

    // Score for variable usage
    score += variablesUsed.length * 0.1;

    // Score for personalization features
    score += personalizationApplied.length * 0.05;

    // Bonus for high-value personalizations
    if (personalizationApplied.includes('personality_adaptation')) score += 0.1;
    if (personalizationApplied.includes('context_adaptation')) score += 0.1;

    return Math.min(score, 1.0);
  }

  private determineToneKey(context: PersonalizationContext, sentiment: any): string {
    if (sentiment.emotional_state === 'frustrated') return 'empathetic_professional';
    if (sentiment.emotional_state === 'excited') return 'enthusiastic_supportive';
    if (sentiment.emotional_state === 'anxious') return 'reassuring_confident';
    return 'professional_friendly';
  }

  private determineFormalityPreference(nlpAnalysis: NLPAnalysisResponse, context: ConversationContext): string {
    // Analyze message patterns for formality indicators
    const messages = context.conversationHistory.map(m => m.content).join(' ').toLowerCase();
    
    if (messages.includes('sir') || messages.includes('ma\'am') || messages.includes('please')) {
      return 'formal';
    } else if (messages.includes('hey') || messages.includes('yeah') || messages.includes('cool')) {
      return 'casual';
    }
    
    return 'professional';
  }

  private determineDetailPreference(nlpAnalysis: NLPAnalysisResponse, contextualInsights: any): 'brief' | 'moderate' | 'comprehensive' {
    const engagementLevel = nlpAnalysis.sentiment.engagement_level;
    const messageCount = contextualInsights.conversation_state?.message_count || 0;

    if (engagementLevel < 0.4 || messageCount < 3) return 'brief';
    if (engagementLevel > 0.7 && messageCount > 5) return 'comprehensive';
    return 'moderate';
  }

  private calculateConversionOpportunity(nlpAnalysis: NLPAnalysisResponse, contextualInsights: any): number {
    let opportunity = 0.5; // base

    if (nlpAnalysis.sentiment.decision_readiness > 0.7) opportunity += 0.3;
    if (nlpAnalysis.sentiment.overall_sentiment === 'positive') opportunity += 0.2;
    if (contextualInsights.flow_insights?.current_phase === 'decision') opportunity += 0.2;

    return Math.min(opportunity, 1.0);
  }

  private calculateRetentionRisk(nlpAnalysis: NLPAnalysisResponse, contextualInsights: any): number {
    let risk = 0.1; // base low risk

    if (nlpAnalysis.sentiment.emotional_state === 'frustrated') risk += 0.4;
    if (nlpAnalysis.sentiment.overall_sentiment === 'negative') risk += 0.3;
    if (nlpAnalysis.sentiment.urgency_level === 'critical') risk += 0.2;

    return Math.min(risk, 1.0);
  }

  private async generateSuggestedActions(
    intent: Intent,
    context: ConversationContext,
    depthConfig: ResponseDepthConfig
  ): Promise<string[]> {
    const actions: string[] = [];

    switch (intent.category) {
      case 'style_advice':
        actions.push('Show style examples', 'Schedule consultation', 'Browse similar items');
        break;
      case 'purchase_intent':
        actions.push('Add to cart', 'Schedule fitting', 'Check availability');
        break;
      case 'occasion_guidance':
        actions.push('View occasion looks', 'Get complete outfit', 'Set event reminder');
        break;
      case 'fit_sizing':
        actions.push('Schedule fitting appointment', 'View size guide', 'Get measurement tips');
        break;
      default:
        actions.push('Continue conversation', 'Browse products', 'Contact specialist');
    }

    return actions.slice(0, depthConfig.layer + 1);
  }

  private async generateFollowUpHooks(
    template: ResponseTemplate,
    intent: Intent,
    context: ConversationContext,
    nlpAnalysis: NLPAnalysisResponse
  ): Promise<string[]> {
    const hooks: string[] = [...template.follow_up_triggers];

    // Add context-specific hooks
    if (nlpAnalysis.topic_transitions.suggested_transitions.length > 0) {
      hooks.push(...nlpAnalysis.topic_transitions.suggested_transitions);
    }

    // Add intent-specific hooks
    switch (intent.category) {
      case 'style_advice':
        hooks.push('occasion_details', 'color_preferences', 'budget_discussion');
        break;
      case 'purchase_intent':
        hooks.push('sizing_check', 'timeline_confirmation', 'accessory_suggestions');
        break;
    }

    return [...new Set(hooks)].slice(0, 5);
  }

  private async generateAlternativeResponses(
    template: ResponseTemplate,
    baseMessage: string,
    context: PersonalizationContext
  ): Promise<string[]> {
    const alternatives: string[] = [];

    // Generate tone variations
    for (const [tone, variation] of Object.entries(template.tone_variations)) {
      if (tone !== context.customer_profile.communication_style) {
        alternatives.push(variation.replace('{base_message}', baseMessage));
      }
    }

    // Generate length variations
    const shortVersion = this.truncateMessage(baseMessage, 100);
    const expandedVersion = await this.expandMessage(baseMessage, template);

    alternatives.push(shortVersion, expandedVersion);

    return alternatives.filter(alt => alt.length > 20 && alt !== baseMessage).slice(0, 3);
  }

  private calculateResponseConfidence(
    template: ResponseTemplate,
    personalizedResponse: any,
    validationResult: any
  ): number {
    let confidence = 0.7; // base confidence

    // Template quality score
    confidence += template.personalization_variables.length * 0.02;

    // Personalization score
    confidence += personalizedResponse.personalization_score * 0.2;

    // Safety score
    confidence += validationResult.safety_score * 0.1;

    return Math.min(confidence, 0.95);
  }

  // Utility methods

  private async generateExplanation(intent: Intent, context: ConversationContext): Promise<string | null> {
    const explanations: Record<string, string> = {
      'style_advice': 'This recommendation is based on your style preferences and the occasion you mentioned.',
      'purchase_intent': 'This option aligns with your budget and requirements.',
      'occasion_guidance': 'This style is perfectly appropriate for your event and will help you look your best.',
      'fit_sizing': 'Proper fit is crucial for both comfort and appearance.'
    };

    return explanations[intent.category] || null;
  }

  private async generateExample(intent: Intent, context: ConversationContext): Promise<string | null> {
    const examples: Record<string, string> = {
      'style_advice': 'a navy suit with a crisp white shirt creates a timeless, professional look.',
      'occasion_guidance': 'for a wedding, you might pair a charcoal suit with a subtle patterned tie.',
      'fit_sizing': 'the jacket should close comfortably without pulling at the buttons.'
    };

    return examples[intent.category] || null;
  }

  private async generateAlternatives(intent: Intent, context: ConversationContext): Promise<string | null> {
    const alternatives: Record<string, string> = {
      'style_advice': 'you could also consider a different color or pattern that achieves a similar effect.',
      'purchase_intent': 'we have similar options in different price ranges if you\'d like to see them.',
      'occasion_guidance': 'depending on the venue, you might want to consider a slightly more or less formal approach.'
    };

    return alternatives[intent.category] || null;
  }

  private async generateNextSteps(intent: Intent, context: ConversationContext): Promise<string | null> {
    const nextSteps: Record<string, string> = {
      'style_advice': 'Shall we look at some specific options that match this style?',
      'purchase_intent': 'Would you like me to check availability and schedule a fitting?',
      'occasion_guidance': 'Let\'s put together a complete look for your event.',
      'fit_sizing': 'I\'d recommend scheduling a fitting to ensure perfect measurements.'
    };

    return nextSteps[intent.category] || null;
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) return message;
    
    const truncated = message.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  private async expandMessage(message: string, template: ResponseTemplate): Promise<string> {
    // Add more detail to the message
    const expansion = `${message} I'm here to ensure you get exactly what you're looking for, and I'm happy to go into more detail about any aspect of this recommendation.`;
    return expansion;
  }

  private getSaferAlternative(problematicText: string): string {
    const alternatives: Record<string, string> = {
      'damn': 'very',
      'hell': 'really',
      'crap': 'poor quality',
      'stupid': 'not ideal',
      'dumb': 'not the best',
      'guarantee': 'believe',
      'definitely will': 'should'
    };

    return alternatives[problematicText.toLowerCase()] || problematicText;
  }

  private generateCacheKey(intent: Intent, context: ConversationContext, depthConfig?: ResponseDepthConfig): string {
    const key = `${intent.category}_${context.frameworkType}_${depthConfig?.layer || 2}_${context.currentStage}`;
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  // Default templates

  private getDefaultTemplates(): ResponseTemplate[] {
    return [
      {
        id: 'atelier_style_advice_l2',
        category: 'style_advice',
        subcategory: 'general_consultation',
        framework: 'atelier_ai',
        layer: 2,
        base_template: 'I\'d love to help you find the perfect {item} for {occasion}. Based on your {style_preference}, I have some excellent recommendations that would work beautifully.',
        personalization_variables: ['item', 'occasion', 'style_preference'],
        tone_variations: {
          'professional': 'I would be pleased to assist you in finding the ideal {item} for {occasion}.',
          'enthusiastic': 'I\'m so excited to help you find the most amazing {item} for {occasion}!',
          'reassuring': 'Don\'t worry, we\'ll find the perfect {item} for {occasion} together.'
        },
        context_adaptations: {
          'discovery_excited': 'This is going to be fun!',
          'consideration_anxious': 'Let me help ease your concerns.'
        },
        follow_up_triggers: ['style_examples', 'color_discussion', 'budget_confirmation'],
        validation_rules: ['no_overpromising', 'appropriate_tone', 'helpful_content']
      },
      {
        id: 'precision_purchase_l3',
        category: 'purchase_intent',
        subcategory: 'buying_decision',
        framework: 'precision',
        layer: 3,
        base_template: 'Excellent choice! This {item} is perfect for {occasion} and offers exceptional value. The quality construction ensures years of wear, and the style will remain timeless.',
        personalization_variables: ['item', 'occasion', 'budget_range'],
        tone_variations: {
          'confident': 'You\'ve made an outstanding decision with this {item}.',
          'supportive': 'This {item} is going to be perfect for you.',
          'professional': 'This {item} represents excellent value and quality.'
        },
        context_adaptations: {
          'decision_confident': 'Your instincts are spot-on.',
          'decision_uncertain': 'Let me share why this is such a great choice.'
        },
        follow_up_triggers: ['sizing_confirmation', 'delivery_timeline', 'accessory_suggestions'],
        validation_rules: ['no_pressure_tactics', 'honest_recommendations', 'clear_next_steps']
      }
    ];
  }

  private getDefaultTemplate(category: string, framework: FrameworkType, layer: ResponseLayer): ResponseTemplate {
    return {
      id: `default_${category}_${framework}_l${layer}`,
      category: category,
      subcategory: 'general',
      framework: framework,
      layer: layer,
      base_template: 'I\'m here to help you with {item}. Let me provide you with some recommendations.',
      personalization_variables: ['item'],
      tone_variations: {},
      context_adaptations: {},
      follow_up_triggers: ['continue_conversation'],
      validation_rules: ['basic_safety']
    };
  }

  /**
   * Get health check for the Response Generation System
   */
  async getHealthCheck(): Promise<{
    status: string;
    templates_loaded: number;
    tone_adaptations: number;
    safety_filters: number;
  }> {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      templates_loaded: this.templates.size,
      tone_adaptations: this.toneAdaptations.size,
      safety_filters: this.safetyFilters.size
    };
  }
}

export const responseGenerationSystem = new ResponseGenerationSystem();