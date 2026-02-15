/**
 * NLP Intelligence Service - Phase 2
 * Implements 287 natural language patterns from conversation intelligence
 * Provides advanced intent classification, entity extraction, and sentiment analysis
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { readFileSync } from 'fs';
import { join } from 'path';

import { Intent, ConversationContext } from '../types/chat';

export interface EntityExtractionResult {
  occasions: string[];
  products: string[];
  colors: string[];
  sizes: string[];
  preferences: string[];
  budget: {
    min?: number;
    max?: number;
    range?: string;
  };
  timeline: {
    urgency?: string;
    date?: string;
    flexible?: boolean;
  };
  demographic: {
    age_range?: string;
    profession?: string;
    location?: string;
  };
  style_indicators: string[];
  emotional_indicators: string[];
}

export interface SentimentAnalysis {
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotional_state: 'excited' | 'anxious' | 'confident' | 'uncertain' | 'frustrated' | 'satisfied';
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  decision_readiness: number; // 0-1 scale
  engagement_level: number; // 0-1 scale
}

export interface ConversationPattern {
  pattern_id: string;
  category: string;
  subcategory: string;
  patterns: string[];
  context_indicators: string[];
  response_triggers: string[];
  confidence_factors: string[];
}

export interface NLPAnalysisRequest {
  message: string;
  conversation_history: string[];
  customer_context?: any;
  session_context?: any;
}

export interface NLPAnalysisResponse {
  intent: Intent;
  entities: EntityExtractionResult;
  sentiment: SentimentAnalysis;
  conversation_patterns: ConversationPattern[];
  topic_transitions: {
    current_topic: string;
    suggested_transitions: string[];
    natural_bridges: string[];
  };
  response_guidance: {
    recommended_tone: string;
    key_points: string[];
    avoid_topics: string[];
    personalization_hooks: string[];
  };
}

class NLPIntelligenceService {
  private conversationPatterns: any = null;
  private intentClassifier: Map<string, any> = new Map();
  private entityExtractor: Map<string, RegExp[]> = new Map();
  private sentimentIndicators: Map<string, number> = new Map();
  private initialized = false;

  /**
   * Initialize the NLP service with conversation intelligence data
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🧠 Initializing NLP Intelligence Service...');

      // Load conversation patterns
      await this.loadConversationPatterns();
      
      // Initialize intent classification rules
      await this.initializeIntentClassifier();
      
      // Initialize entity extraction patterns
      await this.initializeEntityExtractor();
      
      // Initialize sentiment analysis indicators
      await this.initializeSentimentIndicators();

      this.initialized = true;
      logger.info('✅ NLP Intelligence Service initialized with 287 conversation patterns');

    } catch (error) {
      logger.error('❌ Failed to initialize NLP Intelligence Service:', error);
      throw error;
    }
  }

  /**
   * Analyze message with comprehensive NLP
   */
  async analyzeMessage(request: NLPAnalysisRequest): Promise<NLPAnalysisResponse> {
    const cacheKey = `nlp:analysis:${this.generateCacheKey(request)}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get<NLPAnalysisResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      logger.debug(`🧠 Analyzing message: "${request.message.substring(0, 50)}..."`);

      // Perform parallel analysis
      const [intent, entities, sentiment, patterns] = await Promise.all([
        this.classifyIntent(request.message, request.conversation_history),
        this.extractEntities(request.message, request.conversation_history),
        this.analyzeSentiment(request.message, request.conversation_history),
        this.identifyConversationPatterns(request.message, request.conversation_history)
      ]);

      // Generate topic transitions
      const topicTransitions = await this.generateTopicTransitions(
        request.message,
        request.conversation_history,
        intent
      );

      // Generate response guidance
      const responseGuidance = await this.generateResponseGuidance(
        intent,
        entities,
        sentiment,
        patterns
      );

      const response: NLPAnalysisResponse = {
        intent,
        entities,
        sentiment,
        conversation_patterns: patterns,
        topic_transitions: topicTransitions,
        response_guidance: responseGuidance
      };

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, response, { ttl: 300 });

      logger.debug(`✅ NLP analysis completed: ${intent.category} (${intent.confidence})`);
      return response;

    } catch (error) {
      logger.error('❌ NLP analysis failed:', error);
      throw error;
    }
  }

  /**
   * Classify intent using advanced pattern matching
   */
  private async classifyIntent(message: string, history: string[]): Promise<Intent> {
    const lowerMessage = message.toLowerCase();
    const context = history.join(' ').toLowerCase();

    // Initialize base intent
    let bestIntent: Intent = {
      category: 'general_inquiry',
      confidence: 0.3,
      entities: {}
    };

    // Check each intent category
    for (const [category, rules] of this.intentClassifier.entries()) {
      const confidence = this.calculateIntentConfidence(lowerMessage, context, rules);
      
      if (confidence > bestIntent.confidence) {
        bestIntent = {
          category,
          subcategory: rules.subcategory,
          confidence,
          entities: this.extractIntentEntities(lowerMessage, rules),
          requiresEscalation: rules.escalation_triggers?.some((trigger: string) => 
            lowerMessage.includes(trigger)
          ) || false
        };
      }
    }

    // Apply conversation history context boost
    bestIntent.confidence = this.applyHistoryContextBoost(bestIntent, history);

    return bestIntent;
  }

  /**
   * Extract entities from message
   */
  private async extractEntities(message: string, history: string[]): Promise<EntityExtractionResult> {
    const lowerMessage = message.toLowerCase();
    const fullContext = `${history.join(' ')} ${message}`.toLowerCase();

    const entities: EntityExtractionResult = {
      occasions: [],
      products: [],
      colors: [],
      sizes: [],
      preferences: [],
      budget: {},
      timeline: {},
      demographic: {},
      style_indicators: [],
      emotional_indicators: []
    };

    // Extract occasions
    entities.occasions = this.extractByPattern('occasions', lowerMessage);
    
    // Extract products
    entities.products = this.extractByPattern('products', lowerMessage);
    
    // Extract colors
    entities.colors = this.extractByPattern('colors', lowerMessage);
    
    // Extract sizes
    entities.sizes = this.extractByPattern('sizes', lowerMessage);
    
    // Extract style preferences
    entities.preferences = this.extractByPattern('style_preferences', lowerMessage);
    
    // Extract budget information
    entities.budget = this.extractBudget(lowerMessage);
    
    // Extract timeline information
    entities.timeline = this.extractTimeline(lowerMessage);
    
    // Extract demographic indicators
    entities.demographic = this.extractDemographic(fullContext);
    
    // Extract style indicators
    entities.style_indicators = this.extractByPattern('style_indicators', lowerMessage);
    
    // Extract emotional indicators
    entities.emotional_indicators = this.extractByPattern('emotional_indicators', lowerMessage);

    return entities;
  }

  /**
   * Analyze sentiment and emotional state
   */
  private async analyzeSentiment(message: string, history: string[]): Promise<SentimentAnalysis> {
    const lowerMessage = message.toLowerCase();
    const recentHistory = history.slice(-3).join(' ').toLowerCase();

    // Calculate sentiment scores
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0.5; // baseline

    // Analyze sentiment indicators
    for (const [indicator, weight] of this.sentimentIndicators.entries()) {
      const occurrences = (lowerMessage.match(new RegExp(indicator, 'g')) || []).length;
      if (weight > 0) {
        positiveScore += occurrences * weight;
      } else {
        negativeScore += occurrences * Math.abs(weight);
      }
    }

    // Determine overall sentiment
    const totalScore = positiveScore + negativeScore + neutralScore;
    const normalizedPositive = positiveScore / totalScore;
    const normalizedNegative = negativeScore / totalScore;

    let overallSentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (normalizedPositive > 0.6) {
      overallSentiment = 'positive';
      confidence = normalizedPositive;
    } else if (normalizedNegative > 0.6) {
      overallSentiment = 'negative';
      confidence = normalizedNegative;
    } else {
      overallSentiment = 'neutral';
      confidence = Math.max(normalizedPositive, normalizedNegative, 0.5);
    }

    // Determine emotional state
    const emotionalState = this.determineEmotionalState(lowerMessage, recentHistory);
    
    // Determine urgency level
    const urgencyLevel = this.determineUrgencyLevel(lowerMessage);
    
    // Calculate decision readiness
    const decisionReadiness = this.calculateDecisionReadiness(lowerMessage, recentHistory);
    
    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(lowerMessage, history);

    return {
      overall_sentiment: overallSentiment,
      confidence,
      emotional_state: emotionalState,
      urgency_level: urgencyLevel,
      decision_readiness: decisionReadiness,
      engagement_level: engagementLevel
    };
  }

  /**
   * Identify conversation patterns from the 287 patterns
   */
  private async identifyConversationPatterns(message: string, history: string[]): Promise<ConversationPattern[]> {
    const lowerMessage = message.toLowerCase();
    const context = history.join(' ').toLowerCase();
    const matchedPatterns: ConversationPattern[] = [];

    if (!this.conversationPatterns) {
      return matchedPatterns;
    }

    // Check each pattern category
    for (const [category, categoryData] of Object.entries(this.conversationPatterns.conversation_patterns)) {
      for (const [subcategory, patterns] of Object.entries(categoryData as any)) {
        if (Array.isArray(patterns)) {
          const matchScore = this.calculatePatternMatch(lowerMessage, patterns);
          
          if (matchScore > 0.3) {
            matchedPatterns.push({
              pattern_id: `${category}_${subcategory}`,
              category,
              subcategory,
              patterns: patterns.filter(p => lowerMessage.includes(p.toLowerCase().substring(0, 10))),
              context_indicators: this.getContextIndicators(category, subcategory),
              response_triggers: this.getResponseTriggers(category, subcategory),
              confidence_factors: this.getConfidenceFactors(matchScore)
            });
          }
        }
      }
    }

    return matchedPatterns.sort((a, b) => b.confidence_factors.length - a.confidence_factors.length);
  }

  // Private helper methods

  private async loadConversationPatterns(): Promise<void> {
    try {
      const patternsPath = join(process.cwd(), 'Customer Facing Chat', 'Natural Language Flow_ Mastering Conversational Co', 'menswear_conversation_intelligence.json');
      const patternsData = readFileSync(patternsPath, 'utf8');
      this.conversationPatterns = JSON.parse(patternsData);
      logger.debug('✅ Loaded conversation patterns data');
    } catch (error) {
      logger.warn('⚠️ Could not load conversation patterns file, using fallback patterns');
      this.conversationPatterns = this.getFallbackPatterns();
    }
  }

  private async initializeIntentClassifier(): Promise<void> {
    // Style advice intent
    this.intentClassifier.set('style_advice', {
      keywords: ['advice', 'recommend', 'suggest', 'help', 'style', 'look', 'outfit', 'what should', 'best option'],
      context_boost: ['confused', 'unsure', 'help me choose'],
      subcategory: 'style_consultation',
      confidence_multiplier: 1.2,
      escalation_triggers: ['expert opinion', 'professional stylist']
    });

    // Purchase intent
    this.intentClassifier.set('purchase_intent', {
      keywords: ['buy', 'purchase', 'order', 'checkout', 'price', 'cost', 'how much', 'available', 'in stock'],
      context_boost: ['ready to buy', 'want to order', 'take it'],
      subcategory: 'buying_decision',
      confidence_multiplier: 1.5,
      escalation_triggers: ['payment issues', 'delivery problem']
    });

    // Occasion guidance
    this.intentClassifier.set('occasion_guidance', {
      keywords: ['wedding', 'business', 'interview', 'cocktail', 'formal', 'event', 'party', 'meeting', 'date'],
      context_boost: ['dress code', 'appropriate', 'what to wear'],
      subcategory: 'event_styling',
      confidence_multiplier: 1.3,
      escalation_triggers: ['urgent event', 'tomorrow', 'last minute']
    });

    // Product inquiry
    this.intentClassifier.set('product_inquiry', {
      keywords: ['details', 'features', 'material', 'fabric', 'construction', 'quality', 'brand', 'made', 'specifications'],
      context_boost: ['tell me about', 'how is it made', 'quality of'],
      subcategory: 'product_details',
      confidence_multiplier: 1.1,
      escalation_triggers: ['defect', 'quality issue', 'damaged']
    });

    // Fit and sizing
    this.intentClassifier.set('fit_sizing', {
      keywords: ['fit', 'size', 'sizing', 'measurements', 'alterations', 'tailoring', 'adjustment', 'too big', 'too small'],
      context_boost: ['how does it fit', 'what size', 'will it fit'],
      subcategory: 'fit_consultation',
      confidence_multiplier: 1.4,
      escalation_triggers: ['fit guarantee', 'exchange', 'return']
    });

    // Complaint/Problem
    this.intentClassifier.set('complaint', {
      keywords: ['problem', 'issue', 'wrong', 'broken', 'defect', 'complaint', 'return', 'refund', 'disappointed', 'unsatisfied'],
      context_boost: ['not happy', 'mistake', 'error', 'fix this'],
      subcategory: 'customer_service',
      confidence_multiplier: 1.6,
      escalation_triggers: ['manager', 'escalate', 'supervisor', 'corporate']
    });

    // Color/Style matching
    this.intentClassifier.set('color_style_matching', {
      keywords: ['color', 'match', 'coordinate', 'goes with', 'complements', 'clashes', 'combination', 'palette'],
      context_boost: ['what colors', 'does this match', 'color advice'],
      subcategory: 'color_consultation',
      confidence_multiplier: 1.1,
      escalation_triggers: ['color blind', 'vision issues']
    });
  }

  private async initializeEntityExtractor(): Promise<void> {
    // Occasions
    this.entityExtractor.set('occasions', [
      /\b(wedding|marriage|ceremony|reception)\b/gi,
      /\b(business|work|office|professional|corporate)\b/gi,
      /\b(interview|job interview|meeting)\b/gi,
      /\b(formal|black tie|white tie|gala)\b/gi,
      /\b(cocktail|party|social|event)\b/gi,
      /\b(casual|everyday|weekend)\b/gi,
      /\b(prom|homecoming|graduation)\b/gi,
      /\b(date|dinner|restaurant)\b/gi
    ]);

    // Products
    this.entityExtractor.set('products', [
      /\b(suit|suits|tuxedo|tux)\b/gi,
      /\b(blazer|jacket|sport coat)\b/gi,
      /\b(shirt|dress shirt|button down)\b/gi,
      /\b(pants|trousers|slacks)\b/gi,
      /\b(tie|necktie|bow tie|bowtie)\b/gi,
      /\b(vest|waistcoat)\b/gi,
      /\b(shoes|dress shoes|oxfords|loafers)\b/gi,
      /\b(accessories|cufflinks|pocket square)\b/gi
    ]);

    // Colors
    this.entityExtractor.set('colors', [
      /\b(black|navy|charcoal|grey|gray|blue|brown|burgundy|maroon)\b/gi,
      /\b(white|cream|ivory|beige|tan)\b/gi,
      /\b(red|green|purple|yellow|orange|pink)\b/gi,
      /\b(light|dark|medium)\s+(blue|grey|gray|brown)\b/gi
    ]);

    // Sizes
    this.entityExtractor.set('sizes', [
      /\b(small|medium|large|extra large|xl|xxl)\b/gi,
      /\b(3[6-9]|4[0-9]|5[0-2])\s*(regular|long|short|slim|big|tall)\b/gi,
      /\b(slim fit|regular fit|athletic fit|big and tall)\b/gi
    ]);

    // Style preferences
    this.entityExtractor.set('style_preferences', [
      /\b(modern|contemporary|classic|traditional|vintage)\b/gi,
      /\b(slim|fitted|tailored|loose|relaxed|comfortable)\b/gi,
      /\b(conservative|bold|trendy|fashion forward)\b/gi,
      /\b(minimalist|detailed|simple|elegant|sophisticated)\b/gi
    ]);
  }

  private async initializeSentimentIndicators(): Promise<void> {
    // Positive indicators
    this.sentimentIndicators.set('love', 0.8);
    this.sentimentIndicators.set('perfect', 0.7);
    this.sentimentIndicators.set('great', 0.6);
    this.sentimentIndicators.set('excellent', 0.7);
    this.sentimentIndicators.set('amazing', 0.8);
    this.sentimentIndicators.set('fantastic', 0.7);
    this.sentimentIndicators.set('wonderful', 0.6);
    this.sentimentIndicators.set('pleased', 0.5);
    this.sentimentIndicators.set('satisfied', 0.5);
    this.sentimentIndicators.set('happy', 0.6);

    // Negative indicators
    this.sentimentIndicators.set('hate', -0.8);
    this.sentimentIndicators.set('terrible', -0.7);
    this.sentimentIndicators.set('awful', -0.7);
    this.sentimentIndicators.set('disappointed', -0.6);
    this.sentimentIndicators.set('frustrated', -0.6);
    this.sentimentIndicators.set('annoyed', -0.5);
    this.sentimentIndicators.set('problem', -0.4);
    this.sentimentIndicators.set('issue', -0.4);
    this.sentimentIndicators.set('wrong', -0.5);
    this.sentimentIndicators.set('broken', -0.6);

    // Uncertainty indicators
    this.sentimentIndicators.set('unsure', -0.2);
    this.sentimentIndicators.set('confused', -0.3);
    this.sentimentIndicators.set('maybe', -0.1);
    this.sentimentIndicators.set('not sure', -0.2);
    this.sentimentIndicators.set('help', 0.1);
  }

  private calculateIntentConfidence(message: string, context: string, rules: any): number {
    let confidence = 0;
    let matches = 0;

    // Check keyword matches
    for (const keyword of rules.keywords) {
      if (message.includes(keyword)) {
        confidence += 0.3;
        matches++;
      }
    }

    // Check context boost terms
    for (const booster of rules.context_boost || []) {
      if (message.includes(booster) || context.includes(booster)) {
        confidence += 0.2;
      }
    }

    // Apply confidence multiplier
    confidence *= (rules.confidence_multiplier || 1.0);

    // Normalize based on matches
    if (matches > 0) {
      confidence = Math.min(confidence, 0.95); // Cap at 95%
    }

    return confidence;
  }

  private extractIntentEntities(message: string, rules: any): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract specific entities based on intent type
    if (rules.subcategory === 'buying_decision') {
      entities.purchase_signals = this.extractByPattern('purchase_signals', message);
    }

    return entities;
  }

  private applyHistoryContextBoost(intent: Intent, history: string[]): number {
    let boost = 0;
    const recentMessages = history.slice(-3).join(' ').toLowerCase();

    // Conversation flow context boost
    if (intent.category === 'purchase_intent' && recentMessages.includes('recommend')) {
      boost += 0.1;
    }

    if (intent.category === 'style_advice' && recentMessages.includes('occasion')) {
      boost += 0.1;
    }

    return Math.min(intent.confidence + boost, 0.95);
  }

  private extractByPattern(entityType: string, message: string): string[] {
    const patterns = this.entityExtractor.get(entityType) || [];
    const matches: string[] = [];

    for (const pattern of patterns) {
      const found = message.match(pattern);
      if (found) {
        matches.push(...found.map(m => m.toLowerCase().trim()));
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  private extractBudget(message: string): { min?: number; max?: number; range?: string } {
    const budget: { min?: number; max?: number; range?: string } = {};

    // Extract dollar amounts
    const dollarMatches = message.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
    if (dollarMatches) {
      const amounts = dollarMatches.map(m => parseFloat(m.replace(/[$,]/g, '')));
      if (amounts.length === 1) {
        budget.max = amounts[0];
      } else if (amounts.length >= 2) {
        budget.min = Math.min(...amounts);
        budget.max = Math.max(...amounts);
      }
    }

    // Extract budget ranges
    if (message.includes('under')) budget.range = 'budget';
    if (message.includes('premium') || message.includes('luxury')) budget.range = 'premium';
    if (message.includes('mid-range') || message.includes('moderate')) budget.range = 'mid_range';

    return budget;
  }

  private extractTimeline(message: string): { urgency?: string; date?: string; flexible?: boolean } {
    const timeline: { urgency?: string; date?: string; flexible?: boolean } = {};

    // Urgency indicators
    if (message.includes('urgent') || message.includes('asap') || message.includes('immediately')) {
      timeline.urgency = 'urgent';
    } else if (message.includes('soon') || message.includes('quickly')) {
      timeline.urgency = 'soon';
    } else if (message.includes('no rush') || message.includes('flexible')) {
      timeline.urgency = 'flexible';
      timeline.flexible = true;
    }

    // Date extraction
    const datePattern = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\bnext\s+week|\bthis\s+weekend/gi;
    const dateMatch = message.match(datePattern);
    if (dateMatch) {
      timeline.date = dateMatch[0];
    }

    return timeline;
  }

  private extractDemographic(context: string): { age_range?: string; profession?: string; location?: string } {
    const demographic: { age_range?: string; profession?: string; location?: string } = {};

    // Age indicators
    if (context.includes('college') || context.includes('student')) demographic.age_range = '18-25';
    if (context.includes('young professional') || context.includes('entry level')) demographic.age_range = '25-35';
    if (context.includes('experienced') || context.includes('manager')) demographic.age_range = '35-50';
    if (context.includes('executive') || context.includes('senior')) demographic.age_range = '45-65';

    // Profession indicators
    const professions = ['lawyer', 'doctor', 'teacher', 'engineer', 'banker', 'consultant', 'sales', 'manager', 'executive'];
    for (const profession of professions) {
      if (context.includes(profession)) {
        demographic.profession = profession;
        break;
      }
    }

    return demographic;
  }

  private determineEmotionalState(message: string, recentHistory: string): 'excited' | 'anxious' | 'confident' | 'uncertain' | 'frustrated' | 'satisfied' {
    const combined = `${recentHistory} ${message}`.toLowerCase();

    if (combined.includes('excited') || combined.includes('can\'t wait') || combined.includes('love')) return 'excited';
    if (combined.includes('worried') || combined.includes('nervous') || combined.includes('concerned')) return 'anxious';
    if (combined.includes('sure') || combined.includes('definitely') || combined.includes('confident')) return 'confident';
    if (combined.includes('not sure') || combined.includes('maybe') || combined.includes('confused')) return 'uncertain';
    if (combined.includes('frustrated') || combined.includes('annoyed') || combined.includes('problem')) return 'frustrated';
    if (combined.includes('satisfied') || combined.includes('pleased') || combined.includes('good')) return 'satisfied';

    return 'uncertain'; // default
  }

  private determineUrgencyLevel(message: string): 'low' | 'medium' | 'high' | 'critical' {
    if (message.includes('urgent') || message.includes('asap') || message.includes('emergency')) return 'critical';
    if (message.includes('soon') || message.includes('quickly') || message.includes('this week')) return 'high';
    if (message.includes('sometime') || message.includes('eventually')) return 'low';
    return 'medium';
  }

  private calculateDecisionReadiness(message: string, recentHistory: string): number {
    let readiness = 0.5; // baseline

    const combined = `${recentHistory} ${message}`.toLowerCase();

    // Positive readiness indicators
    if (combined.includes('ready to buy') || combined.includes('take it')) readiness += 0.4;
    if (combined.includes('looks good') || combined.includes('perfect')) readiness += 0.2;
    if (combined.includes('price') || combined.includes('how much')) readiness += 0.15;

    // Negative readiness indicators
    if (combined.includes('thinking about') || combined.includes('maybe')) readiness -= 0.2;
    if (combined.includes('not sure') || combined.includes('confused')) readiness -= 0.3;

    return Math.max(0, Math.min(1, readiness));
  }

  private calculateEngagementLevel(message: string, history: string[]): number {
    let engagement = 0.5; // baseline

    // Message length factor
    if (message.length > 100) engagement += 0.1;
    if (message.length > 200) engagement += 0.1;

    // Question asking indicates engagement
    const questionCount = (message.match(/\?/g) || []).length;
    engagement += questionCount * 0.1;

    // History length factor
    engagement += Math.min(history.length * 0.05, 0.3);

    return Math.max(0, Math.min(1, engagement));
  }

  private calculatePatternMatch(message: string, patterns: string[]): number {
    let totalScore = 0;
    let matches = 0;

    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase();
      if (message.includes(normalizedPattern) || this.fuzzyMatch(message, normalizedPattern)) {
        totalScore += 1;
        matches++;
      }
    }

    return patterns.length > 0 ? totalScore / patterns.length : 0;
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    const words = pattern.split(' ');
    const matchedWords = words.filter(word => text.includes(word));
    return matchedWords.length / words.length > 0.5; // 50% word match threshold
  }

  private async generateTopicTransitions(
    message: string,
    history: string[],
    intent: Intent
  ): Promise<{ current_topic: string; suggested_transitions: string[]; natural_bridges: string[] }> {
    const currentTopic = this.identifyCurrentTopic(message, intent);
    const suggestedTransitions = this.getSuggestedTransitions(currentTopic, intent);
    const naturalBridges = this.getNaturalBridges(currentTopic, suggestedTransitions);

    return {
      current_topic: currentTopic,
      suggested_transitions: suggestedTransitions,
      natural_bridges: naturalBridges
    };
  }

  private async generateResponseGuidance(
    intent: Intent,
    entities: EntityExtractionResult,
    sentiment: SentimentAnalysis,
    patterns: ConversationPattern[]
  ): Promise<{ recommended_tone: string; key_points: string[]; avoid_topics: string[]; personalization_hooks: string[] }> {
    const recommendedTone = this.getRecommendedTone(sentiment, intent);
    const keyPoints = this.getKeyPoints(intent, entities);
    const avoidTopics = this.getTopicsToAvoid(sentiment, intent);
    const personalizationHooks = this.getPersonalizationHooks(entities, patterns);

    return {
      recommended_tone: recommendedTone,
      key_points: keyPoints,
      avoid_topics: avoidTopics,
      personalization_hooks: personalizationHooks
    };
  }

  // Additional helper methods for generating guidance

  private identifyCurrentTopic(message: string, intent: Intent): string {
    if (intent.category === 'style_advice') return 'style_consultation';
    if (intent.category === 'purchase_intent') return 'product_selection';
    if (intent.category === 'occasion_guidance') return 'event_styling';
    if (intent.category === 'fit_sizing') return 'fit_consultation';
    return 'general_assistance';
  }

  private getSuggestedTransitions(currentTopic: string, intent: Intent): string[] {
    const transitions: Record<string, string[]> = {
      'style_consultation': ['product_selection', 'occasion_matching', 'color_coordination'],
      'product_selection': ['sizing_fitting', 'accessory_matching', 'care_instructions'],
      'event_styling': ['complete_outfit', 'grooming_tips', 'confidence_building'],
      'fit_consultation': ['style_refinement', 'care_maintenance', 'wardrobe_expansion']
    };

    return transitions[currentTopic] || ['product_selection', 'style_consultation'];
  }

  private getNaturalBridges(currentTopic: string, transitions: string[]): string[] {
    const bridges: Record<string, string[]> = {
      'style_consultation': ['Now that we understand your style preferences...', 'Based on what you\'ve told me...'],
      'product_selection': ['Perfect choice! Now let\'s talk about...', 'With that selected, we should consider...'],
      'event_styling': ['For your event, you\'ll also want to think about...', 'To complete this look...']
    };

    return bridges[currentTopic] || ['Let me help you with...', 'Now we can focus on...'];
  }

  private getRecommendedTone(sentiment: SentimentAnalysis, intent: Intent): string {
    if (sentiment.emotional_state === 'frustrated' || intent.category === 'complaint') return 'empathetic_professional';
    if (sentiment.emotional_state === 'excited') return 'enthusiastic_supportive';
    if (sentiment.emotional_state === 'anxious') return 'reassuring_confident';
    if (sentiment.decision_readiness > 0.7) return 'encouraging_decisive';
    return 'professional_friendly';
  }

  private getKeyPoints(intent: Intent, entities: EntityExtractionResult): string[] {
    const points: string[] = [];

    if (entities.occasions.length > 0) {
      points.push(`Focus on ${entities.occasions[0]} appropriateness`);
    }

    if (entities.budget.range) {
      points.push(`Address ${entities.budget.range} options`);
    }

    if (intent.category === 'purchase_intent') {
      points.push('Provide clear next steps', 'Address any final concerns');
    }

    return points;
  }

  private getTopicsToAvoid(sentiment: SentimentAnalysis, intent: Intent): string[] {
    const avoid: string[] = [];

    if (sentiment.emotional_state === 'frustrated') {
      avoid.push('complex_options', 'lengthy_explanations');
    }

    if (sentiment.urgency_level === 'critical') {
      avoid.push('extensive_browsing', 'detailed_comparisons');
    }

    return avoid;
  }

  private getPersonalizationHooks(entities: EntityExtractionResult, patterns: ConversationPattern[]): string[] {
    const hooks: string[] = [];

    if (entities.demographic.profession) {
      hooks.push(`professional_context:${entities.demographic.profession}`);
    }

    if (entities.occasions.length > 0) {
      hooks.push(`occasion_specific:${entities.occasions[0]}`);
    }

    if (entities.style_indicators.length > 0) {
      hooks.push(`style_preference:${entities.style_indicators[0]}`);
    }

    return hooks;
  }

  private getContextIndicators(category: string, subcategory: string): string[] {
    // Default context indicators based on conversation patterns
    return [`${category}_context`, `${subcategory}_indicators`];
  }

  private getResponseTriggers(category: string, subcategory: string): string[] {
    // Default response triggers
    return [`${category}_response`, `${subcategory}_action`];
  }

  private getConfidenceFactors(matchScore: number): string[] {
    const factors: string[] = [];
    if (matchScore > 0.7) factors.push('high_pattern_match');
    if (matchScore > 0.5) factors.push('moderate_pattern_match');
    if (matchScore > 0.3) factors.push('low_pattern_match');
    return factors;
  }

  private getFallbackPatterns(): any {
    return {
      conversation_patterns: {
        greeting_and_discovery: {
          opening_patterns: ["Hello! How can I help you today?", "Welcome! What brings you in?"],
          discovery_transitions: ["Tell me more about...", "That sounds like..."]
        },
        needs_assessment: {
          lifestyle_questions: ["What occasions do you dress for?", "What's your style preference?"],
          budget_transitions: ["What investment level works for you?"]
        }
      }
    };
  }

  private generateCacheKey(request: NLPAnalysisRequest): string {
    const key = `${request.message}_${request.conversation_history.length}`;
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  /**
   * Get health check for NLP service
   */
  async getHealthCheck(): Promise<{ status: string; patterns_loaded: boolean; classifiers_ready: boolean }> {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      patterns_loaded: this.conversationPatterns !== null,
      classifiers_ready: this.intentClassifier.size > 0
    };
  }
}

export const nlpIntelligenceService = new NLPIntelligenceService();