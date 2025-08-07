/**
 * Context Awareness Engine - Phase 2
 * Handles conversation context tracking, memory system, topic switching, and flow management
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { nlpIntelligenceService } from './nlp-intelligence-service';
import { 
  ConversationContext, 
  ConversationMessage, 
  Intent, 
  FrameworkType 
} from '../types/chat';

export interface ContextualMemory {
  customerId: string;
  sessionId: string;
  preferences: {
    style: string[];
    colors: string[];
    occasions: string[];
    budget_range: string;
    fit_preferences: string[];
    avoided_items: string[];
  };
  behaviors: {
    decision_patterns: string[];
    browsing_style: string;
    communication_style: string;
    response_time_preference: string;
  };
  history: {
    past_purchases: any[];
    favorite_items: any[];
    abandoned_carts: any[];
    frequent_occasions: string[];
  };
  demographics: {
    age_range?: string;
    profession?: string;
    location?: string;
    lifestyle_indicators: string[];
  };
  emotional_profile: {
    typical_sentiment: string;
    decision_confidence: number;
    stress_indicators: string[];
    motivation_triggers: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface TopicTransition {
  from_topic: string;
  to_topic: string;
  transition_type: 'natural' | 'forced' | 'customer_initiated' | 'system_recommended';
  confidence: number;
  trigger_words: string[];
  context_clues: string[];
  transition_phrase: string;
}

export interface ConversationFlow {
  current_stage: string;
  framework: FrameworkType;
  flow_state: {
    completed_stages: string[];
    current_objectives: string[];
    next_recommended_stage: string;
    alternative_paths: string[];
  };
  engagement_metrics: {
    message_count: number;
    avg_response_time: number;
    topic_switches: number;
    depth_level: number;
  };
  decision_journey: {
    current_phase: 'discovery' | 'consideration' | 'decision' | 'post_decision';
    progression_score: number;
    key_decisions_made: string[];
    remaining_decisions: string[];
  };
}

export interface FollowUpQuestion {
  question: string;
  category: string;
  priority: number;
  context_relevance: number;
  expected_response_type: string;
  follow_up_actions: string[];
}

export interface ContextUpdate {
  sessionId: string;
  updateType: 'preference' | 'behavior' | 'demographic' | 'emotional' | 'flow_state';
  updateData: any;
  confidence: number;
  source: 'explicit' | 'inferred' | 'behavioral';
}

class ContextAwarenessEngine {
  private memoryStore: Map<string, ContextualMemory> = new Map();
  private flowStates: Map<string, ConversationFlow> = new Map();
  private topicModels: Map<string, any> = new Map();
  private initialized = false;

  /**
   * Initialize the Context Awareness Engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🧠 Initializing Context Awareness Engine...');

      // Initialize topic models
      await this.initializeTopicModels();

      // Load persistent memory data
      await this.loadPersistentMemory();

      this.initialized = true;
      logger.info('✅ Context Awareness Engine initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Context Awareness Engine:', error);
      throw error;
    }
  }

  /**
   * Build enhanced conversation context
   */
  async buildEnhancedContext(
    sessionId: string,
    conversationHistory: ConversationMessage[],
    customerId?: string
  ): Promise<ConversationContext> {
    const cacheKey = `context:enhanced:${sessionId}`;

    try {
      // Check cache first
      const cached = await cacheService.get<ConversationContext>(cacheKey);
      if (cached && cached.conversationHistory.length === conversationHistory.length) {
        return cached;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      logger.debug(`🧠 Building enhanced context for session: ${sessionId}`);

      // Get or create memory
      const memory = await this.getOrCreateMemory(sessionId, customerId);

      // Get or create flow state
      const flowState = await this.getOrCreateFlowState(sessionId);

      // Extract preferences from conversation
      const preferences = await this.extractPreferencesFromHistory(conversationHistory);

      // Merge with persistent preferences
      const mergedPreferences = this.mergePreferences(memory.preferences, preferences);

      // Extract session context
      const sessionContext = await this.extractSessionContext(conversationHistory, flowState);

      // Build enhanced context
      const enhancedContext: ConversationContext = {
        customerId: customerId,
        sessionId: sessionId,
        frameworkType: flowState.framework,
        currentStage: flowState.current_stage,
        conversationHistory: conversationHistory,
        customerPreferences: mergedPreferences,
        sessionContext: sessionContext,
        pageContext: await this.extractPageContext(conversationHistory)
      };

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, enhancedContext, 300);

      return enhancedContext;

    } catch (error) {
      logger.error('❌ Failed to build enhanced context:', error);
      throw error;
    }
  }

  /**
   * Update contextual memory based on conversation
   */
  async updateContextualMemory(update: ContextUpdate): Promise<void> {
    try {
      const memory = await this.getOrCreateMemory(update.sessionId);
      
      switch (update.updateType) {
        case 'preference':
          this.updatePreferences(memory, update.updateData, update.confidence);
          break;
        case 'behavior':
          this.updateBehaviors(memory, update.updateData, update.confidence);
          break;
        case 'demographic':
          this.updateDemographics(memory, update.updateData, update.confidence);
          break;
        case 'emotional':
          this.updateEmotionalProfile(memory, update.updateData, update.confidence);
          break;
        case 'flow_state':
          await this.updateFlowState(update.sessionId, update.updateData);
          break;
      }

      memory.updated_at = new Date().toISOString();

      // Persist to cache
      await this.persistMemory(memory);

      logger.debug(`✅ Updated contextual memory: ${update.updateType} for ${update.sessionId}`);

    } catch (error) {
      logger.error('❌ Failed to update contextual memory:', error);
      throw error;
    }
  }

  /**
   * Detect topic transitions in conversation
   */
  async detectTopicTransition(
    previousMessages: ConversationMessage[],
    currentMessage: string,
    currentIntent: Intent
  ): Promise<TopicTransition | null> {
    try {
      if (previousMessages.length === 0) {
        return null; // No transition for first message
      }

      const previousTopic = await this.identifyTopic(previousMessages.slice(-2));
      const currentTopic = await this.identifyTopic([{ 
        ...previousMessages[0], 
        content: currentMessage 
      }]);

      if (previousTopic === currentTopic) {
        return null; // No topic change
      }

      // Analyze transition type
      const transitionType = this.analyzeTransitionType(
        previousMessages,
        currentMessage,
        currentIntent
      );

      // Generate transition phrase
      const transitionPhrase = await this.generateTransitionPhrase(
        previousTopic,
        currentTopic,
        transitionType
      );

      const transition: TopicTransition = {
        from_topic: previousTopic,
        to_topic: currentTopic,
        transition_type: transitionType,
        confidence: this.calculateTransitionConfidence(previousTopic, currentTopic, currentIntent),
        trigger_words: this.extractTriggerWords(currentMessage, currentTopic),
        context_clues: this.extractContextClues(previousMessages, currentMessage),
        transition_phrase: transitionPhrase
      };

      logger.debug(`🔄 Topic transition detected: ${previousTopic} → ${currentTopic}`);
      return transition;

    } catch (error) {
      logger.error('❌ Failed to detect topic transition:', error);
      return null;
    }
  }

  /**
   * Generate contextual follow-up questions
   */
  async generateFollowUpQuestions(
    context: ConversationContext,
    intent: Intent,
    topicTransition?: TopicTransition
  ): Promise<FollowUpQuestion[]> {
    try {
      const cacheKey = `followup:${context.sessionId}:${intent.category}`;
      
      // Check cache first
      const cached = await cacheService.get<FollowUpQuestion[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const questions: FollowUpQuestion[] = [];
      const flowState = this.flowStates.get(context.sessionId);

      // Generate questions based on intent category
      switch (intent.category) {
        case 'style_advice':
          questions.push(...await this.generateStyleAdviceFollowUps(context, intent));
          break;
        case 'purchase_intent':
          questions.push(...await this.generatePurchaseFollowUps(context, intent));
          break;
        case 'occasion_guidance':
          questions.push(...await this.generateOccasionFollowUps(context, intent));
          break;
        case 'fit_sizing':
          questions.push(...await this.generateFitFollowUps(context, intent));
          break;
      }

      // Add questions based on missing information
      questions.push(...await this.generateInformationGatheringQuestions(context));

      // Add questions based on conversation flow
      if (flowState) {
        questions.push(...await this.generateFlowBasedQuestions(flowState, context));
      }

      // Sort by priority and relevance
      questions.sort((a, b) => (b.priority * b.context_relevance) - (a.priority * a.context_relevance));

      // Limit to top 5 questions
      const topQuestions = questions.slice(0, 5);

      // Cache for 2 minutes
      await cacheService.set(cacheKey, topQuestions, 120);

      return topQuestions;

    } catch (error) {
      logger.error('❌ Failed to generate follow-up questions:', error);
      return [];
    }
  }

  /**
   * Manage conversation flow state
   */
  async manageConversationFlow(
    sessionId: string,
    intent: Intent,
    context: ConversationContext,
    topicTransition?: TopicTransition
  ): Promise<ConversationFlow> {
    try {
      let flowState = this.flowStates.get(sessionId);
      
      if (!flowState) {
        flowState = await this.createInitialFlowState(sessionId, intent, context);
      }

      // Update engagement metrics
      flowState.engagement_metrics.message_count++;
      if (topicTransition) {
        flowState.engagement_metrics.topic_switches++;
      }

      // Update decision journey
      await this.updateDecisionJourney(flowState, intent, context);

      // Determine next stage
      flowState.flow_state.next_recommended_stage = await this.determineNextStage(
        flowState,
        intent,
        context
      );

      // Update flow state
      this.flowStates.set(sessionId, flowState);

      // Persist to cache
      const cacheKey = `flow:${sessionId}`;
      await cacheService.set(cacheKey, flowState, 1800); // 30 minutes

      return flowState;

    } catch (error) {
      logger.error('❌ Failed to manage conversation flow:', error);
      throw error;
    }
  }

  /**
   * Get contextual insights for response generation
   */
  async getContextualInsights(sessionId: string): Promise<{
    memory_insights: any;
    flow_insights: any;
    personalization_data: any;
    conversation_state: any;
  }> {
    try {
      const memory = this.memoryStore.get(sessionId);
      const flowState = this.flowStates.get(sessionId);

      return {
        memory_insights: memory ? {
          preferred_style: memory.preferences.style[0],
          typical_occasions: memory.history.frequent_occasions,
          decision_style: memory.behaviors.decision_patterns[0],
          emotional_state: memory.emotional_profile.typical_sentiment
        } : null,
        
        flow_insights: flowState ? {
          current_phase: flowState.decision_journey.current_phase,
          progression: flowState.decision_journey.progression_score,
          engagement_level: this.calculateEngagementLevel(flowState),
          recommended_approach: this.getRecommendedApproach(flowState)
        } : null,
        
        personalization_data: memory ? {
          communication_style: memory.behaviors.communication_style,
          response_preference: memory.behaviors.response_time_preference,
          motivation_triggers: memory.emotional_profile.motivation_triggers
        } : null,
        
        conversation_state: {
          message_count: flowState?.engagement_metrics.message_count || 0,
          topic_switches: flowState?.engagement_metrics.topic_switches || 0,
          depth_level: flowState?.engagement_metrics.depth_level || 1
        }
      };

    } catch (error) {
      logger.error('❌ Failed to get contextual insights:', error);
      return { memory_insights: null, flow_insights: null, personalization_data: null, conversation_state: {} };
    }
  }

  // Private helper methods

  private async initializeTopicModels(): Promise<void> {
    // Initialize topic classification models
    this.topicModels.set('style_consultation', {
      keywords: ['style', 'look', 'outfit', 'fashion', 'advice', 'recommend'],
      patterns: ['what should i wear', 'help me choose', 'style advice']
    });

    this.topicModels.set('product_details', {
      keywords: ['fabric', 'material', 'quality', 'construction', 'details', 'features'],
      patterns: ['tell me about', 'how is it made', 'what kind of']
    });

    this.topicModels.set('sizing_fitting', {
      keywords: ['size', 'fit', 'measurements', 'alterations', 'tailoring'],
      patterns: ['what size', 'how does it fit', 'will it fit']
    });

    this.topicModels.set('pricing_budget', {
      keywords: ['price', 'cost', 'budget', 'expensive', 'affordable', 'cheap'],
      patterns: ['how much', 'what does it cost', 'in my budget']
    });

    this.topicModels.set('occasion_styling', {
      keywords: ['wedding', 'business', 'formal', 'casual', 'event', 'occasion'],
      patterns: ['for a wedding', 'business meeting', 'formal event']
    });
  }

  private async loadPersistentMemory(): Promise<void> {
    try {
      // In a production environment, this would load from a database
      // For now, we'll load from cache if available
      const memoryKeys = await cacheService.getKeysByPattern('memory:*');
      
      for (const key of memoryKeys) {
        const memory = await cacheService.get<ContextualMemory>(key);
        if (memory) {
          this.memoryStore.set(memory.sessionId, memory);
        }
      }

      logger.debug(`📚 Loaded ${this.memoryStore.size} memory entries`);
    } catch (error) {
      logger.warn('⚠️ Could not load persistent memory:', error);
    }
  }

  private async getOrCreateMemory(sessionId: string, customerId?: string): Promise<ContextualMemory> {
    let memory = this.memoryStore.get(sessionId);
    
    if (!memory) {
      memory = this.createDefaultMemory(sessionId, customerId);
      this.memoryStore.set(sessionId, memory);
      await this.persistMemory(memory);
    }

    return memory;
  }

  private createDefaultMemory(sessionId: string, customerId?: string): ContextualMemory {
    return {
      customerId: customerId || 'anonymous',
      sessionId: sessionId,
      preferences: {
        style: [],
        colors: [],
        occasions: [],
        budget_range: '',
        fit_preferences: [],
        avoided_items: []
      },
      behaviors: {
        decision_patterns: [],
        browsing_style: 'exploratory',
        communication_style: 'casual',
        response_time_preference: 'immediate'
      },
      history: {
        past_purchases: [],
        favorite_items: [],
        abandoned_carts: [],
        frequent_occasions: []
      },
      demographics: {
        lifestyle_indicators: []
      },
      emotional_profile: {
        typical_sentiment: 'neutral',
        decision_confidence: 0.5,
        stress_indicators: [],
        motivation_triggers: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private async getOrCreateFlowState(sessionId: string): Promise<ConversationFlow> {
    let flowState = this.flowStates.get(sessionId);
    
    if (!flowState) {
      flowState = {
        current_stage: 'initial_discovery',
        framework: 'atelier_ai',
        flow_state: {
          completed_stages: [],
          current_objectives: ['understand_needs', 'gather_preferences'],
          next_recommended_stage: 'needs_assessment',
          alternative_paths: []
        },
        engagement_metrics: {
          message_count: 0,
          avg_response_time: 0,
          topic_switches: 0,
          depth_level: 1
        },
        decision_journey: {
          current_phase: 'discovery',
          progression_score: 0.1,
          key_decisions_made: [],
          remaining_decisions: ['style_preference', 'occasion', 'budget', 'timeline']
        }
      };

      this.flowStates.set(sessionId, flowState);
    }

    return flowState;
  }

  private async extractPreferencesFromHistory(history: ConversationMessage[]): Promise<any> {
    const preferences: any = {
      style: [],
      colors: [],
      occasions: [],
      budget_range: '',
      fit_preferences: []
    };

    for (const message of history) {
      if (message.role === 'user') {
        // Use NLP service to extract entities
        const nlpResponse = await nlpIntelligenceService.analyzeMessage({
          message: message.content,
          conversation_history: history.map(m => m.content)
        });

        // Merge extracted entities
        preferences.style.push(...nlpResponse.entities.style_indicators);
        preferences.colors.push(...nlpResponse.entities.colors);
        preferences.occasions.push(...nlpResponse.entities.occasions);
        
        if (nlpResponse.entities.budget.range) {
          preferences.budget_range = nlpResponse.entities.budget.range;
        }
      }
    }

    // Remove duplicates
    preferences.style = [...new Set(preferences.style)];
    preferences.colors = [...new Set(preferences.colors)];
    preferences.occasions = [...new Set(preferences.occasions)];

    return preferences;
  }

  private mergePreferences(persistent: any, extracted: any): any {
    return {
      style: [...new Set([...persistent.style, ...extracted.style])],
      colors: [...new Set([...persistent.colors, ...extracted.colors])],
      occasions: [...new Set([...persistent.occasions, ...extracted.occasions])],
      budget_range: extracted.budget_range || persistent.budget_range,
      fit_preferences: [...new Set([...persistent.fit_preferences, ...extracted.fit_preferences || []])],
      avoided_items: persistent.avoided_items
    };
  }

  private async extractSessionContext(history: ConversationMessage[], flowState: ConversationFlow): Promise<any> {
    return {
      startTime: history.length > 0 ? history[0].timestamp : new Date(),
      messageCount: history.length,
      lastInteraction: history.length > 0 ? history[history.length - 1].timestamp : new Date(),
      currentStage: flowState.current_stage,
      topicsDiscussed: await this.extractTopicsFromHistory(history),
      decisionProgress: flowState.decision_journey.progression_score,
      engagementLevel: this.calculateEngagementLevel(flowState)
    };
  }

  private async extractPageContext(history: ConversationMessage[]): Promise<any> {
    // Extract page context from conversation history
    // This would typically come from the frontend/client
    return {
      currentPage: 'chat',
      userAction: 'messaging',
      productContext: null
    };
  }

  private async identifyTopic(messages: ConversationMessage[]): Promise<string> {
    const content = messages.map(m => m.content).join(' ').toLowerCase();
    let bestTopic = 'general';
    let bestScore = 0;

    for (const [topic, model] of this.topicModels.entries()) {
      let score = 0;
      
      // Check keywords
      for (const keyword of model.keywords) {
        if (content.includes(keyword)) {
          score += 1;
        }
      }

      // Check patterns
      for (const pattern of model.patterns) {
        if (content.includes(pattern)) {
          score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }

    return bestTopic;
  }

  private analyzeTransitionType(
    previousMessages: ConversationMessage[],
    currentMessage: string,
    currentIntent: Intent
  ): 'natural' | 'forced' | 'customer_initiated' | 'system_recommended' {
    const lowerMessage = currentMessage.toLowerCase();

    // Check for explicit topic changes
    if (lowerMessage.includes('actually') || lowerMessage.includes('instead') || lowerMessage.includes('but')) {
      return 'customer_initiated';
    }

    // Check for natural flow indicators
    if (currentIntent.confidence > 0.8) {
      return 'natural';
    }

    // Check for forced transitions (system recommendations)
    if (previousMessages.length > 0 && 
        previousMessages[previousMessages.length - 1].role === 'assistant' &&
        previousMessages[previousMessages.length - 1].content.includes('let\'s talk about')) {
      return 'system_recommended';
    }

    return 'natural';
  }

  private async generateTransitionPhrase(
    fromTopic: string,
    toTopic: string,
    transitionType: string
  ): Promise<string> {
    const phrases: Record<string, string[]> = {
      'natural': [
        'Now that we\'ve covered that, let\'s talk about...',
        'Speaking of which...',
        'That brings up another important point...'
      ],
      'customer_initiated': [
        'I understand you\'d like to focus on...',
        'Absolutely, let\'s switch to...',
        'Of course, let me help you with...'
      ],
      'system_recommended': [
        'Based on what we\'ve discussed, I\'d recommend we look at...',
        'The next step would be to consider...',
        'Let me help you with the next important aspect...'
      ]
    };

    const phrasesForType = phrases[transitionType] || phrases['natural'];
    return phrasesForType[Math.floor(Math.random() * phrasesForType.length)];
  }

  private calculateTransitionConfidence(fromTopic: string, toTopic: string, intent: Intent): number {
    // Base confidence on intent confidence
    let confidence = intent.confidence;

    // Boost confidence for logical topic progressions
    const logicalProgression: Record<string, string[]> = {
      'style_consultation': ['product_details', 'sizing_fitting', 'pricing_budget'],
      'product_details': ['sizing_fitting', 'pricing_budget', 'occasion_styling'],
      'sizing_fitting': ['product_details', 'pricing_budget'],
      'pricing_budget': ['product_details', 'occasion_styling']
    };

    if (logicalProgression[fromTopic]?.includes(toTopic)) {
      confidence += 0.2;
    }

    return Math.min(confidence, 0.95);
  }

  private extractTriggerWords(message: string, topic: string): string[] {
    const topicModel = this.topicModels.get(topic);
    if (!topicModel) return [];

    const words = message.toLowerCase().split(' ');
    return words.filter(word => topicModel.keywords.includes(word));
  }

  private extractContextClues(previousMessages: ConversationMessage[], currentMessage: string): string[] {
    const clues: string[] = [];
    
    // Look for connecting words
    const connectingWords = ['because', 'since', 'also', 'additionally', 'furthermore', 'moreover'];
    const lowerMessage = currentMessage.toLowerCase();
    
    for (const word of connectingWords) {
      if (lowerMessage.includes(word)) {
        clues.push(`connecting_word:${word}`);
      }
    }

    // Look for references to previous messages
    if (lowerMessage.includes('you mentioned') || lowerMessage.includes('you said')) {
      clues.push('reference_to_previous');
    }

    return clues;
  }

  private async extractTopicsFromHistory(history: ConversationMessage[]): Promise<string[]> {
    const topics: string[] = [];
    
    for (const message of history) {
      const topic = await this.identifyTopic([message]);
      if (topic !== 'general' && !topics.includes(topic)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private calculateEngagementLevel(flowState: ConversationFlow): number {
    const { message_count, topic_switches, depth_level } = flowState.engagement_metrics;
    
    // Calculate engagement based on various factors
    let engagement = 0.5; // baseline
    
    // Message count factor (more messages = higher engagement, up to a point)
    engagement += Math.min(message_count * 0.05, 0.3);
    
    // Topic diversity factor
    engagement += Math.min(topic_switches * 0.1, 0.2);
    
    // Depth factor
    engagement += Math.min(depth_level * 0.1, 0.2);

    return Math.min(engagement, 1.0);
  }

  private getRecommendedApproach(flowState: ConversationFlow): string {
    const { current_phase, progression_score } = flowState.decision_journey;
    const engagementLevel = this.calculateEngagementLevel(flowState);

    if (engagementLevel < 0.3) return 'reengage';
    if (current_phase === 'discovery' && progression_score < 0.3) return 'gather_more_info';
    if (current_phase === 'consideration' && progression_score > 0.6) return 'guide_to_decision';
    if (current_phase === 'decision') return 'facilitate_purchase';
    
    return 'continue_current_flow';
  }

  // Additional helper methods for follow-up questions

  private async generateStyleAdviceFollowUps(context: ConversationContext, intent: Intent): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];

    if (!context.customerPreferences.occasions.length) {
      questions.push({
        question: "What occasions do you typically dress for?",
        category: "occasion_discovery",
        priority: 8,
        context_relevance: 0.9,
        expected_response_type: "occasions_list",
        follow_up_actions: ["update_occasion_preferences", "suggest_occasion_appropriate_styles"]
      });
    }

    if (!context.customerPreferences.style.length) {
      questions.push({
        question: "Do you prefer a more classic look or something more modern and trendy?",
        category: "style_preference",
        priority: 7,
        context_relevance: 0.8,
        expected_response_type: "style_preference",
        follow_up_actions: ["update_style_preferences", "show_style_examples"]
      });
    }

    return questions;
  }

  private async generatePurchaseFollowUps(context: ConversationContext, intent: Intent): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];

    questions.push({
      question: "When do you need this by?",
      category: "timeline",
      priority: 9,
      context_relevance: 0.95,
      expected_response_type: "date_timeline",
      follow_up_actions: ["check_availability", "schedule_alterations"]
    });

    if (!context.customerPreferences.budget_range) {
      questions.push({
        question: "What investment level are you considering for this piece?",
        category: "budget",
        priority: 8,
        context_relevance: 0.85,
        expected_response_type: "budget_range",
        follow_up_actions: ["filter_by_budget", "show_value_options"]
      });
    }

    return questions;
  }

  private async generateOccasionFollowUps(context: ConversationContext, intent: Intent): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];

    if (intent.entities.occasion && intent.entities.occasion.includes('wedding')) {
      questions.push({
        question: "Are you the groom, groomsman, or a guest at the wedding?",
        category: "role_clarification",
        priority: 9,
        context_relevance: 0.9,
        expected_response_type: "wedding_role",
        follow_up_actions: ["suggest_role_appropriate_styles", "check_wedding_timeline"]
      });
    }

    return questions;
  }

  private async generateFitFollowUps(context: ConversationContext, intent: Intent): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];

    questions.push({
      question: "Have you been professionally measured for a suit before?",
      category: "measurement_history",
      priority: 8,
      context_relevance: 0.8,
      expected_response_type: "yes_no_details",
      follow_up_actions: ["schedule_fitting", "explain_measurement_process"]
    });

    return questions;
  }

  private async generateInformationGatheringQuestions(context: ConversationContext): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];
    const memory = this.memoryStore.get(context.sessionId);

    if (memory && !memory.demographics.profession) {
      questions.push({
        question: "What do you do for work? This helps me recommend appropriate styles.",
        category: "profession",
        priority: 6,
        context_relevance: 0.7,
        expected_response_type: "profession",
        follow_up_actions: ["update_professional_context", "suggest_business_appropriate_styles"]
      });
    }

    return questions;
  }

  private async generateFlowBasedQuestions(flowState: ConversationFlow, context: ConversationContext): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];

    if (flowState.decision_journey.current_phase === 'consideration' && 
        flowState.decision_journey.progression_score > 0.6) {
      questions.push({
        question: "Which option are you leaning towards, and what questions do you still have?",
        category: "decision_facilitation",
        priority: 9,
        context_relevance: 0.9,
        expected_response_type: "preference_with_concerns",
        follow_up_actions: ["address_concerns", "facilitate_decision"]
      });
    }

    return questions;
  }

  // Flow state management methods

  private async createInitialFlowState(
    sessionId: string,
    intent: Intent,
    context: ConversationContext
  ): Promise<ConversationFlow> {
    const framework = this.determineInitialFramework(intent);
    
    return {
      current_stage: 'initial_discovery',
      framework: framework,
      flow_state: {
        completed_stages: [],
        current_objectives: this.getInitialObjectives(intent),
        next_recommended_stage: this.getNextStageForIntent(intent),
        alternative_paths: []
      },
      engagement_metrics: {
        message_count: 1,
        avg_response_time: 0,
        topic_switches: 0,
        depth_level: 1
      },
      decision_journey: {
        current_phase: 'discovery',
        progression_score: 0.1,
        key_decisions_made: [],
        remaining_decisions: this.getRemainingDecisions(intent)
      }
    };
  }

  private determineInitialFramework(intent: Intent): FrameworkType {
    if (intent.category === 'complaint') return 'restore';
    if (intent.category === 'purchase_intent' && intent.confidence > 0.8) return 'precision';
    return 'atelier_ai';
  }

  private getInitialObjectives(intent: Intent): string[] {
    switch (intent.category) {
      case 'style_advice':
        return ['understand_style_preferences', 'identify_occasions', 'gather_sizing_info'];
      case 'purchase_intent':
        return ['confirm_product_interest', 'check_availability', 'discuss_timeline'];
      case 'occasion_guidance':
        return ['clarify_event_details', 'understand_dress_code', 'suggest_appropriate_styles'];
      default:
        return ['understand_needs', 'gather_preferences'];
    }
  }

  private getNextStageForIntent(intent: Intent): string {
    switch (intent.category) {
      case 'style_advice': return 'style_consultation';
      case 'purchase_intent': return 'product_presentation';
      case 'occasion_guidance': return 'occasion_styling';
      case 'fit_sizing': return 'sizing_consultation';
      default: return 'needs_assessment';
    }
  }

  private getRemainingDecisions(intent: Intent): string[] {
    const baseDecisions = ['style_preference', 'budget', 'timeline'];
    
    switch (intent.category) {
      case 'style_advice':
        return [...baseDecisions, 'occasion', 'color_preference'];
      case 'purchase_intent':
        return ['size_confirmation', 'final_selection', 'purchase_decision'];
      case 'occasion_guidance':
        return [...baseDecisions, 'dress_code_compliance', 'accessory_selection'];
      default:
        return baseDecisions;
    }
  }

  private async updateDecisionJourney(flowState: ConversationFlow, intent: Intent, context: ConversationContext): Promise<void> {
    // Update progression based on information gathered
    const informationGathered = this.calculateInformationGathered(context);
    flowState.decision_journey.progression_score = Math.min(informationGathered * 0.25, 0.9);

    // Update phase based on progression
    if (flowState.decision_journey.progression_score > 0.7) {
      flowState.decision_journey.current_phase = 'decision';
    } else if (flowState.decision_journey.progression_score > 0.4) {
      flowState.decision_journey.current_phase = 'consideration';
    }

    // Mark decisions as made based on available information
    if (context.customerPreferences.style.length > 0 && 
        !flowState.decision_journey.key_decisions_made.includes('style_preference')) {
      flowState.decision_journey.key_decisions_made.push('style_preference');
    }

    if (context.customerPreferences.budget_range && 
        !flowState.decision_journey.key_decisions_made.includes('budget')) {
      flowState.decision_journey.key_decisions_made.push('budget');
    }

    // Remove made decisions from remaining decisions
    flowState.decision_journey.remaining_decisions = flowState.decision_journey.remaining_decisions.filter(
      decision => !flowState.decision_journey.key_decisions_made.includes(decision)
    );
  }

  private calculateInformationGathered(context: ConversationContext): number {
    let score = 0;
    const totalPossible = 4; // style, occasion, budget, timeline

    if (context.customerPreferences.style.length > 0) score++;
    if (context.customerPreferences.occasions.length > 0) score++;
    if (context.customerPreferences.budget_range) score++;
    if (context.sessionContext.timeline) score++;

    return score / totalPossible;
  }

  private async determineNextStage(
    flowState: ConversationFlow,
    intent: Intent,
    context: ConversationContext
  ): Promise<string> {
    const currentStage = flowState.current_stage;
    const progression = flowState.decision_journey.progression_score;

    // Define stage progression paths
    const stageProgression: Record<string, string[]> = {
      'initial_discovery': ['needs_assessment', 'style_consultation'],
      'needs_assessment': ['style_consultation', 'product_presentation'],
      'style_consultation': ['product_presentation', 'sizing_consultation'],
      'product_presentation': ['sizing_consultation', 'purchase_decision'],
      'sizing_consultation': ['final_recommendations', 'purchase_decision'],
      'purchase_decision': ['order_completion', 'follow_up_scheduling']
    };

    const possibleNext = stageProgression[currentStage] || ['needs_assessment'];
    
    // Choose based on progression and intent
    if (progression > 0.7 && intent.category === 'purchase_intent') {
      return possibleNext[possibleNext.length - 1]; // Most advanced stage
    }

    return possibleNext[0]; // Next logical stage
  }

  // Memory update methods

  private updatePreferences(memory: ContextualMemory, data: any, confidence: number): void {
    if (confidence > 0.6) {
      if (data.style) memory.preferences.style = [...new Set([...memory.preferences.style, ...data.style])];
      if (data.colors) memory.preferences.colors = [...new Set([...memory.preferences.colors, ...data.colors])];
      if (data.occasions) memory.preferences.occasions = [...new Set([...memory.preferences.occasions, ...data.occasions])];
      if (data.budget_range) memory.preferences.budget_range = data.budget_range;
    }
  }

  private updateBehaviors(memory: ContextualMemory, data: any, confidence: number): void {
    if (confidence > 0.7) {
      if (data.decision_pattern) memory.behaviors.decision_patterns.push(data.decision_pattern);
      if (data.browsing_style) memory.behaviors.browsing_style = data.browsing_style;
      if (data.communication_style) memory.behaviors.communication_style = data.communication_style;
    }
  }

  private updateDemographics(memory: ContextualMemory, data: any, confidence: number): void {
    if (confidence > 0.8) {
      if (data.age_range) memory.demographics.age_range = data.age_range;
      if (data.profession) memory.demographics.profession = data.profession;
      if (data.location) memory.demographics.location = data.location;
      if (data.lifestyle_indicators) {
        memory.demographics.lifestyle_indicators = [...new Set([
          ...memory.demographics.lifestyle_indicators,
          ...data.lifestyle_indicators
        ])];
      }
    }
  }

  private updateEmotionalProfile(memory: ContextualMemory, data: any, confidence: number): void {
    if (confidence > 0.6) {
      if (data.sentiment) memory.emotional_profile.typical_sentiment = data.sentiment;
      if (data.decision_confidence !== undefined) memory.emotional_profile.decision_confidence = data.decision_confidence;
      if (data.stress_indicators) {
        memory.emotional_profile.stress_indicators = [...new Set([
          ...memory.emotional_profile.stress_indicators,
          ...data.stress_indicators
        ])];
      }
      if (data.motivation_triggers) {
        memory.emotional_profile.motivation_triggers = [...new Set([
          ...memory.emotional_profile.motivation_triggers,
          ...data.motivation_triggers
        ])];
      }
    }
  }

  private async updateFlowState(sessionId: string, data: any): Promise<void> {
    const flowState = this.flowStates.get(sessionId);
    if (flowState && data) {
      Object.assign(flowState, data);
      this.flowStates.set(sessionId, flowState);
    }
  }

  private async persistMemory(memory: ContextualMemory): Promise<void> {
    const cacheKey = `memory:${memory.sessionId}`;
    await cacheService.set(cacheKey, memory, 86400); // 24 hours
  }

  /**
   * Get health check for the Context Awareness Engine
   */
  async getHealthCheck(): Promise<{
    status: string;
    active_memories: number;
    active_flows: number;
    topic_models_loaded: number;
  }> {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      active_memories: this.memoryStore.size,
      active_flows: this.flowStates.size,
      topic_models_loaded: this.topicModels.size
    };
  }

  /**
   * Clear context caches
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateByTags(['context', 'memory', 'flow']);
  }
}

export const contextAwarenessEngine = new ContextAwarenessEngine();