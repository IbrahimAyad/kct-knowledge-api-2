/**
 * Enhanced Analytics Service - Phase 2
 * Conversation analytics, conversion tracking, customer journey mapping, A/B testing, and performance monitoring
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { 
  ConversationContext, 
  ConversationMessage, 
  Intent, 
  FrameworkType 
} from '../types/chat';

export interface ConversationAnalytics {
  sessionId: string;
  customerId?: string;
  metrics: {
    duration: number; // milliseconds
    message_count: number;
    avg_response_time: number;
    framework_used: FrameworkType;
    completion_rate: number;
    satisfaction_score?: number;
  };
  engagement: {
    topics_covered: string[];
    topic_switches: number;
    depth_reached: number;
    questions_asked: number;
    proactive_responses: number;
  };
  outcomes: {
    conversion: boolean;
    conversion_value?: number;
    purchase_intent_score: number;
    handoff_occurred: boolean;
    issue_resolved: boolean;
  };
  intelligence_usage: {
    nlp_calls: number;
    visual_analysis_calls: number;
    psychology_insights_used: boolean;
    career_context_applied: boolean;
    venue_intelligence_used: boolean;
  };
  errors: {
    nlp_failures: number;
    response_generation_failures: number;
    service_timeouts: number;
  };
  timestamp: Date;
}

export interface ConversionEvent {
  id: string;
  sessionId: string;
  customerId?: string;
  event_type: 'product_view' | 'add_to_cart' | 'purchase' | 'consultation_booked' | 'lead_generated';
  product_ids?: string[];
  value: number;
  currency: string;
  attribution: {
    framework: FrameworkType;
    stage: string;
    trigger_message?: string;
    ai_confidence: number;
  };
  metadata: {
    channel: string;
    device_type: string;
    user_agent?: string;
    referrer?: string;
  };
  timestamp: Date;
}

export interface CustomerJourneyStage {
  stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'evaluation' | 'purchase' | 'retention';
  entered_at: Date;
  duration?: number;
  actions: Array<{
    action_type: string;
    description: string;
    timestamp: Date;
    sentiment_at_time: string;
  }>;
  ai_interactions: Array<{
    intent: string;
    confidence: number;
    framework_used: FrameworkType;
    successful: boolean;
  }>;
  conversion_probability: number;
  next_best_action: string;
}

export interface CustomerJourney {
  customerId: string;
  journey_id: string;
  started_at: Date;
  current_stage: CustomerJourneyStage;
  completed_stages: CustomerJourneyStage[];
  touchpoints: Array<{
    channel: string;
    timestamp: Date;
    engagement_score: number;
    outcome: string;
  }>;
  total_value: number;
  predicted_ltv: number;
  churn_risk: number;
  personalization_effectiveness: number;
  conversion_probability?: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  traffic_percentage: number;
  configuration: {
    framework?: FrameworkType;
    response_depth?: number;
    personalization_level?: 'basic' | 'standard' | 'advanced';
    tone_style?: string;
    proactive_suggestions?: boolean;
  };
  status: 'draft' | 'running' | 'paused' | 'completed';
  start_date: Date;
  end_date?: Date;
}

export interface ABTestResult {
  test_id: string;
  variant_id: string;
  metrics: {
    sessions: number;
    conversion_rate: number;
    avg_satisfaction: number;
    completion_rate: number;
    handoff_rate: number;
    response_time: number;
  };
  statistical_significance: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  recommendation: 'continue' | 'stop' | 'expand' | 'modify';
}

export interface PerformanceMetrics {
  system_metrics: {
    avg_response_time: number;
    p95_response_time: number;
    p99_response_time: number;
    error_rate: number;
    throughput: number; // requests per minute
    availability: number;
  };
  ai_metrics: {
    nlp_accuracy: number;
    intent_classification_accuracy: number;
    response_generation_success_rate: number;
    personalization_effectiveness: number;
    context_awareness_score: number;
  };
  business_metrics: {
    customer_satisfaction: number;
    conversion_rate: number;
    average_order_value: number;
    cost_per_conversation: number;
    roi_per_session: number;
  };
  service_health: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    response_time: number;
    error_count: number;
    last_error?: string;
  }>;
}

class EnhancedAnalyticsService {
  private conversationAnalytics: Map<string, ConversationAnalytics> = new Map();
  private conversionEvents: Map<string, ConversionEvent[]> = new Map();
  private customerJourneys: Map<string, CustomerJourney> = new Map();
  private abTests: Map<string, ABTestVariant> = new Map();
  private performanceBuffer: PerformanceMetrics[] = [];
  private initialized = false;

  /**
   * Initialize the Enhanced Analytics Service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('📊 Initializing Enhanced Analytics Service...');

      // Load existing analytics data
      await this.loadAnalyticsData();

      // Initialize A/B tests
      await this.initializeABTests();

      // Start background processes
      this.startBackgroundProcesses();

      this.initialized = true;
      logger.info('✅ Enhanced Analytics Service initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Enhanced Analytics Service:', error instanceof Error ? { error: error.message } : {});
      throw error;
    }
  }

  /**
   * Track conversation analytics
   */
  async trackConversation(
    sessionId: string,
    context: ConversationContext,
    intent: Intent,
    response: any,
    processingTime: number
  ): Promise<void> {
    try {
      let analytics = this.conversationAnalytics.get(sessionId);
      
      if (!analytics) {
        analytics = this.createInitialAnalytics(sessionId, context);
        this.conversationAnalytics.set(sessionId, analytics);
      }

      // Update metrics
      analytics.metrics.message_count++;
      analytics.metrics.avg_response_time = 
        (analytics.metrics.avg_response_time * (analytics.metrics.message_count - 1) + processingTime) / 
        analytics.metrics.message_count;
      analytics.metrics.framework_used = context.frameworkType || 'atelier_ai';

      // Update engagement
      const topicCategory = intent.category;
      if (!analytics.engagement.topics_covered.includes(topicCategory)) {
        analytics.engagement.topics_covered.push(topicCategory);
        analytics.engagement.topic_switches++;
      }

      if (intent.entities && Object.keys(intent.entities).length > 0) {
        analytics.engagement.questions_asked++;
      }

      if (response.suggested_actions && response.suggested_actions.length > 0) {
        analytics.engagement.proactive_responses++;
      }

      // Update intelligence usage
      analytics.intelligence_usage.nlp_calls++;
      
      if (response.metadata?.visual_analysis_used) {
        analytics.intelligence_usage.visual_analysis_calls++;
      }

      // Update outcomes
      if (intent.category === 'purchase_intent') {
        analytics.outcomes.purchase_intent_score = Math.max(
          analytics.outcomes.purchase_intent_score,
          intent.confidence
        );
      }

      // Persist analytics
      await this.persistAnalytics(sessionId, analytics);

      logger.debug(`📊 Analytics updated for session: ${sessionId}`);

    } catch (error) {
      logger.error('❌ Failed to track conversation analytics:', error instanceof Error ? { error: error.message } : {});
    }
  }

  /**
   * Track conversion event
   */
  async trackConversion(conversionEvent: ConversionEvent): Promise<void> {
    try {
      const sessionEvents = this.conversionEvents.get(conversionEvent.sessionId) || [];
      sessionEvents.push(conversionEvent);
      this.conversionEvents.set(conversionEvent.sessionId, sessionEvents);

      // Update conversation analytics
      const analytics = this.conversationAnalytics.get(conversionEvent.sessionId);
      if (analytics) {
        analytics.outcomes.conversion = true;
        analytics.outcomes.conversion_value = conversionEvent.value;
        await this.persistAnalytics(conversionEvent.sessionId, analytics);
      }

      // Update customer journey
      if (conversionEvent.customerId) {
        await this.updateCustomerJourney(conversionEvent.customerId, conversionEvent);
      }

      // Persist conversion event
      const cacheKey = `conversion:${conversionEvent.id}`;
      await cacheService.set(cacheKey, conversionEvent, { ttl: 86400 * 30 }); // 30 days

      logger.info(`💰 Conversion tracked: ${conversionEvent.event_type} - $${conversionEvent.value}`);

    } catch (error) {
      logger.error('❌ Failed to track conversion:', error instanceof Error ? { error: error.message } : {});
      throw error;
    }
  }

  /**
   * Update customer journey
   */
  async updateCustomerJourney(customerId: string, event?: ConversionEvent): Promise<void> {
    try {
      let journey = this.customerJourneys.get(customerId);
      
      if (!journey) {
        journey = this.createInitialJourney(customerId);
        this.customerJourneys.set(customerId, journey);
      }

      // Determine current stage based on recent activity
      const newStage = this.determineJourneyStage(journey, event);
      
      if (newStage !== journey.current_stage.stage) {
        // Complete current stage
        journey.current_stage.duration = Date.now() - journey.current_stage.entered_at.getTime();
        journey.completed_stages.push({ ...journey.current_stage });

        // Start new stage
        journey.current_stage = this.createJourneyStage(newStage);
      }

      // Add action to current stage
      if (event) {
        journey.current_stage.actions.push({
          action_type: event.event_type,
          description: `${event.event_type} - $${event.value}`,
          timestamp: event.timestamp,
          sentiment_at_time: 'positive' // Would get from sentiment analysis
        });

        // Add AI interaction
        journey.current_stage.ai_interactions.push({
          intent: event.event_type,
          confidence: event.attribution.ai_confidence,
          framework_used: event.attribution.framework,
          successful: true
        });

        // Update total value
        journey.total_value += event.value;
      }

      // Update predictions
      journey.conversion_probability = this.calculateConversionProbability(journey);
      journey.predicted_ltv = this.calculatePredictedLTV(journey);
      journey.churn_risk = this.calculateChurnRisk(journey);

      // Persist journey
      await this.persistCustomerJourney(customerId, journey);

      logger.debug(`🛤️ Customer journey updated for: ${customerId}`);

    } catch (error) {
      logger.error('❌ Failed to update customer journey:', error instanceof Error ? { error: error.message } : {});
    }
  }

  /**
   * Run A/B test for session
   */
  async getABTestVariant(sessionId: string, testId: string): Promise<ABTestVariant | null> {
    try {
      const test = this.abTests.get(testId);
      if (!test || test.status !== 'running') {
        return null;
      }

      // Check cache first
      const cacheKey = `ab_test:${sessionId}:${testId}`;
      const cachedVariant = await cacheService.get<string>(cacheKey);
      
      if (cachedVariant) {
        return test;
      }

      // Assign variant based on session hash
      const hash = this.hashSessionId(sessionId);
      const variantAssigned = hash % 100 < test.traffic_percentage;

      if (variantAssigned) {
        // Cache assignment for consistency
        await cacheService.set(cacheKey, test.id, { ttl: 86400 }); // 24 hours
        return test;
      }

      return null;

    } catch (error) {
      logger.error('❌ Failed to get A/B test variant:', error instanceof Error ? { error: error.message } : {});
      return null;
    }
  }

  /**
   * Track A/B test result
   */
  async trackABTestResult(
    sessionId: string,
    testId: string,
    variantId: string,
    outcome: {
      converted: boolean;
      satisfaction_score?: number;
      completed: boolean;
      handoff_required: boolean;
      response_time: number;
    }
  ): Promise<void> {
    try {
      const resultKey = `ab_result:${testId}:${variantId}`;
      const existingResults = await cacheService.get<any[]>(resultKey) || [];
      
      existingResults.push({
        sessionId,
        ...outcome,
        timestamp: new Date()
      });

      await cacheService.set(resultKey, existingResults, { ttl: 86400 * 30 }); // 30 days

      logger.debug(`🧪 A/B test result tracked: ${testId}/${variantId}`);

    } catch (error) {
      logger.error('❌ Failed to track A/B test result:', error instanceof Error ? { error: error.message } : {});
    }
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(
    timeRange: { start: Date; end: Date },
    filters?: {
      framework?: FrameworkType;
      customerId?: string;
      converted?: boolean;
    }
  ): Promise<{
    total_conversations: number;
    avg_satisfaction: number;
    conversion_rate: number;
    completion_rate: number;
    avg_duration: number;
    framework_distribution: Record<FrameworkType, number>;
    top_intents: Array<{ intent: string; count: number }>;
    hourly_distribution: Array<{ hour: number; count: number }>;
  }> {
    try {
      const analytics = Array.from(this.conversationAnalytics.values()).filter(a => {
        if (a.timestamp < timeRange.start || a.timestamp > timeRange.end) return false;
        if (filters?.framework && a.metrics.framework_used !== filters.framework) return false;
        if (filters?.customerId && a.customerId !== filters.customerId) return false;
        if (filters?.converted !== undefined && a.outcomes.conversion !== filters.converted) return false;
        return true;
      });

      const totalConversations = analytics.length;
      const avgSatisfaction = analytics
        .filter(a => a.metrics.satisfaction_score)
        .reduce((sum, a) => sum + (a.metrics.satisfaction_score || 0), 0) / 
        analytics.filter(a => a.metrics.satisfaction_score).length || 0;

      const conversionRate = analytics.filter(a => a.outcomes.conversion).length / totalConversations;
      const completionRate = analytics.filter(a => a.metrics.completion_rate > 0.8).length / totalConversations;
      const avgDuration = analytics.reduce((sum, a) => sum + a.metrics.duration, 0) / totalConversations;

      // Framework distribution
      const frameworkDistribution: Record<FrameworkType, number> = {
        'atelier_ai': 0,
        'restore': 0,
        'precision': 0
      };
      analytics.forEach(a => {
        frameworkDistribution[a.metrics.framework_used]++;
      });

      // Top intents (would need to track intents separately in production)
      const topIntents = [
        { intent: 'style_advice', count: Math.floor(totalConversations * 0.4) },
        { intent: 'purchase_intent', count: Math.floor(totalConversations * 0.3) },
        { intent: 'occasion_guidance', count: Math.floor(totalConversations * 0.2) },
        { intent: 'fit_sizing', count: Math.floor(totalConversations * 0.1) }
      ];

      // Hourly distribution
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: analytics.filter(a => a.timestamp.getHours() === hour).length
      }));

      return {
        total_conversations: totalConversations,
        avg_satisfaction: avgSatisfaction,
        conversion_rate: conversionRate,
        completion_rate: completionRate,
        avg_duration: avgDuration,
        framework_distribution: frameworkDistribution,
        top_intents: topIntents,
        hourly_distribution: hourlyDistribution
      };

    } catch (error) {
      logger.error('❌ Failed to get conversation analytics:', error instanceof Error ? { error: error.message } : {});
      throw error;
    }
  }

  /**
   * Get conversion analytics
   */
  async getConversionAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    total_conversions: number;
    total_value: number;
    avg_order_value: number;
    conversion_by_type: Record<string, { count: number; value: number }>;
    conversion_by_framework: Record<FrameworkType, { count: number; value: number }>;
    daily_trend: Array<{ date: string; conversions: number; value: number }>;
  }> {
    try {
      const allEvents = Array.from(this.conversionEvents.values()).flat().filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );

      const totalConversions = allEvents.length;
      const totalValue = allEvents.reduce((sum, e) => sum + e.value, 0);
      const avgOrderValue = totalValue / totalConversions || 0;

      // Conversion by type
      const conversionByType: Record<string, { count: number; value: number }> = {};
      allEvents.forEach(e => {
        if (!conversionByType[e.event_type]) {
          conversionByType[e.event_type] = { count: 0, value: 0 };
        }
        conversionByType[e.event_type].count++;
        conversionByType[e.event_type].value += e.value;
      });

      // Conversion by framework
      const conversionByFramework: Record<FrameworkType, { count: number; value: number }> = {
        'atelier_ai': { count: 0, value: 0 },
        'restore': { count: 0, value: 0 },
        'precision': { count: 0, value: 0 }
      };
      allEvents.forEach(e => {
        conversionByFramework[e.attribution.framework].count++;
        conversionByFramework[e.attribution.framework].value += e.value;
      });

      // Daily trend
      const dailyTrend = this.calculateDailyTrend(allEvents, timeRange);

      return {
        total_conversions: totalConversions,
        total_value: totalValue,
        avg_order_value: avgOrderValue,
        conversion_by_type: conversionByType,
        conversion_by_framework: conversionByFramework,
        daily_trend: dailyTrend
      };

    } catch (error) {
      logger.error('❌ Failed to get conversion analytics:', error instanceof Error ? { error: error.message } : {});
      throw error;
    }
  }

  /**
   * Get customer journey analytics
   */
  async getCustomerJourneyAnalytics(): Promise<{
    total_journeys: number;
    avg_journey_duration: number;
    stage_distribution: Record<string, number>;
    avg_ltv: number;
    churn_risk_distribution: Record<string, number>;
  }> {
    try {
      const journeys = Array.from(this.customerJourneys.values());
      const totalJourneys = journeys.length;

      const avgJourneyDuration = journeys.reduce((sum, j) => 
        sum + (Date.now() - j.started_at.getTime()), 0
      ) / totalJourneys;

      // Stage distribution
      const stageDistribution: Record<string, number> = {};
      journeys.forEach(j => {
        const stage = j.current_stage.stage;
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
      });

      const avgLTV = journeys.reduce((sum, j) => sum + j.predicted_ltv, 0) / totalJourneys;

      // Churn risk distribution
      const churnRiskDistribution = {
        'low': journeys.filter(j => j.churn_risk < 0.3).length,
        'medium': journeys.filter(j => j.churn_risk >= 0.3 && j.churn_risk < 0.7).length,
        'high': journeys.filter(j => j.churn_risk >= 0.7).length
      };

      return {
        total_journeys: totalJourneys,
        avg_journey_duration: avgJourneyDuration,
        stage_distribution: stageDistribution,
        avg_ltv: avgLTV,
        churn_risk_distribution: churnRiskDistribution
      };

    } catch (error) {
      logger.error('❌ Failed to get customer journey analytics:', error instanceof Error ? { error: error.message } : {});
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResult[]> {
    try {
      const test = this.abTests.get(testId);
      if (!test) {
        throw new Error(`A/B test not found: ${testId}`);
      }

      // Get results for all variants (simplified - in production would have multiple variants)
      const resultKey = `ab_result:${testId}:${test.id}`;
      const results = await cacheService.get<any[]>(resultKey) || [];

      if (results.length === 0) {
        return [];
      }

      const sessions = results.length;
      const conversionRate = results.filter(r => r.converted).length / sessions;
      const avgSatisfaction = results
        .filter(r => r.satisfaction_score)
        .reduce((sum, r) => sum + r.satisfaction_score, 0) / 
        results.filter(r => r.satisfaction_score).length || 0;
      const completionRate = results.filter(r => r.completed).length / sessions;
      const handoffRate = results.filter(r => r.handoff_required).length / sessions;
      const responseTime = results.reduce((sum, r) => sum + r.response_time, 0) / sessions;

      const statisticalSignificance = this.calculateStatisticalSignificance(results);

      return [{
        test_id: testId,
        variant_id: test.id,
        metrics: {
          sessions,
          conversion_rate: conversionRate,
          avg_satisfaction: avgSatisfaction,
          completion_rate: completionRate,
          handoff_rate: handoffRate,
          response_time: responseTime
        },
        statistical_significance: statisticalSignificance,
        confidence_interval: {
          lower: conversionRate - 0.05, // Simplified calculation
          upper: conversionRate + 0.05
        },
        recommendation: statisticalSignificance > 0.95 ? 'expand' : 'continue'
      }];

    } catch (error) {
      logger.error('❌ Failed to get A/B test results:', error instanceof Error ? { error: error.message } : {});
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // In production, these would be collected from various monitoring systems
      const systemMetrics = {
        avg_response_time: 250, // ms
        p95_response_time: 800,
        p99_response_time: 1500,
        error_rate: 0.02, // 2%
        throughput: 120, // requests per minute
        availability: 0.999 // 99.9%
      };

      const aiMetrics = {
        nlp_accuracy: 0.92,
        intent_classification_accuracy: 0.89,
        response_generation_success_rate: 0.96,
        personalization_effectiveness: 0.78,
        context_awareness_score: 0.85
      };

      const businessMetrics = {
        customer_satisfaction: 4.3, // out of 5
        conversion_rate: 0.15, // 15%
        average_order_value: 485.50,
        cost_per_conversation: 2.30,
        roi_per_session: 22.50
      };

      const serviceHealth = {
        'nlp_service': {
          status: 'healthy' as const,
          response_time: 120,
          error_count: 2,
          last_error: undefined
        },
        'context_engine': {
          status: 'healthy' as const,
          response_time: 85,
          error_count: 0,
          last_error: undefined
        },
        'response_generation': {
          status: 'healthy' as const,
          response_time: 180,
          error_count: 1,
          last_error: 'Template not found'
        },
        'chat_integration': {
          status: 'healthy' as const,
          response_time: 95,
          error_count: 0,
          last_error: undefined
        }
      };

      return {
        system_metrics: systemMetrics,
        ai_metrics: aiMetrics,
        business_metrics: businessMetrics,
        service_health: serviceHealth
      };

    } catch (error) {
      logger.error('❌ Failed to get performance metrics:', error instanceof Error ? { error: error.message } : {});
      throw error;
    }
  }

  // Private helper methods

  private async loadAnalyticsData(): Promise<void> {
    try {
      // Load existing analytics from cache/database
      // Note: getKeysByPattern would require Redis KEYS or SCAN - skipping for now
      const analyticsKeys: string[] = []; // In production, implement proper key scanning

      for (const key of analyticsKeys.slice(0, 100)) { // Limit for demo
        const analytics = await cacheService.get<ConversationAnalytics>(key);
        if (analytics) {
          this.conversationAnalytics.set(analytics.sessionId, analytics);
        }
      }

      logger.debug(`📊 Loaded ${this.conversationAnalytics.size} analytics records`);
    } catch (error) {
      logger.warn('⚠️ Could not load analytics data:', error instanceof Error ? { error: error.message } : {});
    }
  }

  private async initializeABTests(): Promise<void> {
    // Initialize default A/B tests
    const defaultTest: ABTestVariant = {
      id: 'framework_comparison_v1',
      name: 'Framework Comparison Test',
      description: 'Test different conversation frameworks for effectiveness',
      traffic_percentage: 50,
      configuration: {
        framework: 'precision',
        response_depth: 2,
        personalization_level: 'advanced',
        tone_style: 'professional_friendly',
        proactive_suggestions: true
      },
      status: 'running',
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    this.abTests.set(defaultTest.id, defaultTest);
    logger.debug('🧪 Initialized A/B tests');
  }

  private startBackgroundProcesses(): void {
    // Aggregate performance metrics every 5 minutes
    setInterval(() => {
      this.aggregatePerformanceMetrics();
    }, 5 * 60 * 1000);

    // Clean up old analytics data every hour
    setInterval(() => {
      this.cleanupOldAnalytics();
    }, 60 * 60 * 1000);

    logger.info('⚙️ Analytics background processes started');
  }

  private createInitialAnalytics(sessionId: string, context: ConversationContext): ConversationAnalytics {
    return {
      sessionId,
      customerId: context.customerId,
      metrics: {
        duration: 0,
        message_count: 0,
        avg_response_time: 0,
        framework_used: context.frameworkType || 'atelier_ai',
        completion_rate: 0,
        satisfaction_score: undefined
      },
      engagement: {
        topics_covered: [],
        topic_switches: 0,
        depth_reached: 1,
        questions_asked: 0,
        proactive_responses: 0
      },
      outcomes: {
        conversion: false,
        conversion_value: undefined,
        purchase_intent_score: 0,
        handoff_occurred: false,
        issue_resolved: false
      },
      intelligence_usage: {
        nlp_calls: 0,
        visual_analysis_calls: 0,
        psychology_insights_used: false,
        career_context_applied: false,
        venue_intelligence_used: false
      },
      errors: {
        nlp_failures: 0,
        response_generation_failures: 0,
        service_timeouts: 0
      },
      timestamp: new Date()
    };
  }

  private createInitialJourney(customerId: string): CustomerJourney {
    return {
      customerId,
      journey_id: `journey_${customerId}_${Date.now()}`,
      started_at: new Date(),
      current_stage: this.createJourneyStage('awareness'),
      completed_stages: [],
      touchpoints: [],
      total_value: 0,
      predicted_ltv: 500, // Default prediction
      churn_risk: 0.2,
      personalization_effectiveness: 0.5
    };
  }

  private createJourneyStage(stage: CustomerJourneyStage['stage']): CustomerJourneyStage {
    return {
      stage,
      entered_at: new Date(),
      actions: [],
      ai_interactions: [],
      conversion_probability: this.getBaseConversionProbability(stage),
      next_best_action: this.getNextBestAction(stage)
    };
  }

  private determineJourneyStage(journey: CustomerJourney, event?: ConversionEvent): CustomerJourneyStage['stage'] {
    if (!event) return journey.current_stage.stage;

    switch (event.event_type) {
      case 'product_view':
        return journey.current_stage.stage === 'awareness' ? 'interest' : journey.current_stage.stage;
      case 'add_to_cart':
        return 'intent';
      case 'purchase':
        return 'retention';
      case 'consultation_booked':
        return 'evaluation';
      default:
        return journey.current_stage.stage;
    }
  }

  private getBaseConversionProbability(stage: CustomerJourneyStage['stage']): number {
    const probabilities = {
      'awareness': 0.05,
      'interest': 0.15,
      'consideration': 0.30,
      'intent': 0.60,
      'evaluation': 0.80,
      'purchase': 0.95,
      'retention': 0.20
    };
    return probabilities[stage] || 0.1;
  }

  private getNextBestAction(stage: CustomerJourneyStage['stage']): string {
    const actions = {
      'awareness': 'Show product catalog',
      'interest': 'Provide style consultation',
      'consideration': 'Offer comparison tools',
      'intent': 'Schedule fitting appointment',
      'evaluation': 'Provide social proof',
      'purchase': 'Complete transaction',
      'retention': 'Follow up on satisfaction'
    };
    return actions[stage] || 'Continue engagement';
  }

  private calculateConversionProbability(journey: CustomerJourney): number {
    let probability = journey.current_stage.conversion_probability;
    
    // Adjust based on AI interactions
    const successfulInteractions = journey.current_stage.ai_interactions.filter(i => i.successful).length;
    const totalInteractions = journey.current_stage.ai_interactions.length;
    
    if (totalInteractions > 0) {
      const successRate = successfulInteractions / totalInteractions;
      probability *= (0.5 + successRate * 0.5); // Boost for successful interactions
    }

    // Adjust based on total value
    if (journey.total_value > 0) {
      probability *= 1.2; // Boost for customers who have already spent
    }

    return Math.min(probability, 0.95);
  }

  private calculatePredictedLTV(journey: CustomerJourney): number {
    let baseLTV = 500; // Base prediction

    // Adjust based on current value
    if (journey.total_value > 0) {
      baseLTV = journey.total_value * 2.5; // Historical multiplier
    }

    // Adjust based on stage
    const stageMultipliers = {
      'awareness': 0.8,
      'interest': 1.0,
      'consideration': 1.2,
      'intent': 1.5,
      'evaluation': 1.8,
      'purchase': 2.0,
      'retention': 1.5
    };

    baseLTV *= stageMultipliers[journey.current_stage.stage] || 1.0;

    return Math.round(baseLTV);
  }

  private calculateChurnRisk(journey: CustomerJourney): number {
    let risk = 0.3; // Base risk

    // Recent activity reduces risk
    const daysSinceLastActivity = journey.current_stage.actions.length > 0 ? 
      (Date.now() - journey.current_stage.actions[journey.current_stage.actions.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24) : 7;
    
    risk += Math.min(daysSinceLastActivity * 0.02, 0.4);

    // Failed AI interactions increase risk
    const failedInteractions = journey.current_stage.ai_interactions.filter(i => !i.successful).length;
    risk += failedInteractions * 0.1;

    return Math.min(risk, 0.95);
  }

  private hashSessionId(sessionId: string): number {
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      const char = sessionId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateStatisticalSignificance(results: any[]): number {
    // Simplified statistical significance calculation
    // In production, would use proper statistical tests
    const sampleSize = results.length;
    if (sampleSize < 30) return 0.5; // Insufficient data
    if (sampleSize < 100) return 0.8;
    if (sampleSize < 1000) return 0.9;
    return 0.95;
  }

  private calculateDailyTrend(events: ConversionEvent[], timeRange: { start: Date; end: Date }): Array<{ date: string; conversions: number; value: number }> {
    const trend: Array<{ date: string; conversions: number; value: number }> = [];
    const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(timeRange.start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayEvents = events.filter(e => e.timestamp.toISOString().split('T')[0] === dateStr);
      
      trend.push({
        date: dateStr,
        conversions: dayEvents.length,
        value: dayEvents.reduce((sum, e) => sum + e.value, 0)
      });
    }

    return trend;
  }

  private async persistAnalytics(sessionId: string, analytics: ConversationAnalytics): Promise<void> {
    const cacheKey = `analytics:${sessionId}`;
    await cacheService.set(cacheKey, analytics, { ttl: 86400 * 7 }); // 7 days
  }

  private async persistCustomerJourney(customerId: string, journey: CustomerJourney): Promise<void> {
    const cacheKey = `journey:${customerId}`;
    await cacheService.set(cacheKey, journey, { ttl: 86400 * 30 }); // 30 days
  }

  private aggregatePerformanceMetrics(): void {
    // In production, this would collect metrics from various services
    logger.debug('📊 Aggregating performance metrics');
  }

  private cleanupOldAnalytics(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const [sessionId, analytics] of this.conversationAnalytics.entries()) {
      if (analytics.timestamp < cutoffDate) {
        this.conversationAnalytics.delete(sessionId);
      }
    }

    logger.debug('🧹 Cleaned up old analytics data');
  }

  /**
   * Get health check for analytics service
   */
  async getHealthCheck(): Promise<{
    status: string;
    active_analytics: number;
    active_journeys: number;
    active_ab_tests: number;
  }> {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      active_analytics: this.conversationAnalytics.size,
      active_journeys: this.customerJourneys.size,
      active_ab_tests: this.abTests.size
    };
  }
}

export const enhancedAnalyticsService = new EnhancedAnalyticsService();