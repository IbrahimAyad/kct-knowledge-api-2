import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { conversationService } from '../services/conversation-service';
import { messageService } from '../services/message-service';
import { stateManagementService } from '../services/state-management-service';
import { frameworkSelectorService } from '../services/framework-selector-service';
import { atelierAIService } from '../services/atelier-ai-service';
import { restoreFrameworkService } from '../services/restore-framework-service';
import { precisionFrameworkService } from '../services/precision-framework-service';
// Phase 2 services
import { chatIntegrationService } from '../services/chat-integration-service';
import { nlpIntelligenceService } from '../services/nlp-intelligence-service';
import { contextAwarenessEngine } from '../services/context-awareness-engine';
import { responseGenerationSystem } from '../services/response-generation-system';
import { realtimeChatService } from '../services/realtime-chat-service';
import { enhancedAnalyticsService } from '../services/enhanced-analytics-service';
import { createApiResponse } from '../utils/data-loader';
import {
  ConversationSession,
  ConversationContext,
  ConversationFeedback,
  Intent,
  FrameworkType,
  ChatResponse
} from '../types/chat';

export class ChatController {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize Phase 1 services
      await Promise.all([
        conversationService.initialize(),
        messageService.initialize(),
        stateManagementService.initialize(),
        frameworkSelectorService.initialize(),
        atelierAIService.initialize(),
        restoreFrameworkService.initialize(),
        precisionFrameworkService.initialize()
      ]);

      // Initialize Phase 2 services
      await Promise.all([
        chatIntegrationService.initialize(),
        nlpIntelligenceService.initialize(), 
        contextAwarenessEngine.initialize(),
        responseGenerationSystem.initialize(),
        enhancedAnalyticsService.initialize()
      ]);

      // Initialize real-time service (separate due to WebSocket dependency)
      await realtimeChatService.initialize(8080);
      
      this.initialized = true;
      logger.info('✅ ChatController initialized successfully with Phase 2 enhancements');
    } catch (error) {
      logger.error('❌ Failed to initialize ChatController:', error);
      throw error;
    }
  }

  // Start a new conversation
  async startConversation(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { customer_id, context } = req.body;

      // Validate input
      if (context && typeof context !== 'object') {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'Context must be an object'
        ));
        return;
      }

      // Start new conversation
      const conversation = await conversationService.startConversation(
        customer_id,
        context || {}
      );

      // Log conversation start
      logger.info(`✅ Started chat conversation: ${conversation.sessionId}`, {
        customerId: customer_id,
        sessionId: conversation.sessionId,
        context: context || {}
      });

      res.json(createApiResponse(true, {
        session_id: conversation.sessionId,
        conversation_id: conversation.id,
        status: conversation.status,
        started_at: conversation.startedAt,
        greeting: "Hello! I'm your personal KCT style consultant. How can I help you find the perfect menswear today?"
      }));
    } catch (error) {
      logger.error('❌ Failed to start conversation:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to start conversation'
      ));
    }
  }

  // Send a message in an existing conversation - Enhanced with Phase 2
  async sendMessage(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { session_id, message, context, image_urls } = req.body;

      // Validate required fields
      if (!session_id || !message) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'session_id and message are required'
        ));
        return;
      }

      // Get conversation
      const conversation = await conversationService.getConversation(session_id);
      if (!conversation) {
        res.status(404).json(createApiResponse(
          false,
          undefined,
          'Conversation not found or inactive'
        ));
        return;
      }

      // Get conversation history for context
      const conversationHistory = await messageService.getConversationHistory(conversation.id);

      // Phase 2: Build enhanced conversation context using Context Awareness Engine
      const enhancedContext = await contextAwarenessEngine.buildEnhancedContext(
        session_id,
        conversationHistory,
        conversation.customerId
      );

      // Add user message to conversation
      await messageService.addMessage(
        conversation.id,
        'user',
        message,
        undefined,
        undefined,
        undefined,
        context
      );

      // Phase 2: Advanced NLP analysis with 287 conversation patterns
      const nlpAnalysis = await nlpIntelligenceService.analyzeMessage({
        message: message,
        conversation_history: conversationHistory.map(m => m.content),
        customer_context: enhancedContext.customerPreferences,
        session_context: enhancedContext.sessionContext
      });

      // Phase 2: Get integrated intelligence from all KCT services
      const integrationRequest = {
        customerId: conversation.customerId,
        sessionId: session_id,
        intent: nlpAnalysis.intent,
        conversationContext: enhancedContext,
        additionalData: {
          imageUrls: image_urls,
          location: context?.location,
          timeOfDay: new Date().getHours().toString(),
          deviceType: context?.device_type || 'web',
          referrerPage: context?.referrer
        }
      };

      const enhancedIntelligence = await chatIntegrationService.getEnhancedContext(integrationRequest);

      // Phase 2: Detect topic transitions
      const topicTransition = await contextAwarenessEngine.detectTopicTransition(
        conversationHistory.slice(-2),
        message,
        nlpAnalysis.intent
      );

      // Phase 2: Manage conversation flow with advanced logic
      const conversationFlow = await contextAwarenessEngine.manageConversationFlow(
        session_id,
        nlpAnalysis.intent,
        enhancedContext,
        topicTransition || undefined
      );

      // Update framework based on enhanced analysis
      const activeFramework = conversationFlow.framework;
      const activeStage = conversationFlow.current_stage;

      // Phase 2: Generate response using advanced Response Generation System
      const response = await responseGenerationSystem.generateResponse(
        nlpAnalysis.intent,
        enhancedContext,
        nlpAnalysis
      );

      // Phase 2: Generate contextual follow-up questions
      const followUpQuestions = await contextAwarenessEngine.generateFollowUpQuestions(
        enhancedContext,
        nlpAnalysis.intent,
        topicTransition || undefined
      );

      // Update conversation with new framework/stage
      if (activeFramework !== conversation.frameworkType || activeStage !== conversation.currentStage) {
        await conversationService.updateConversation(session_id, {
          frameworkType: activeFramework,
          currentStage: activeStage
        });
      }

      // Add assistant response to conversation
      await messageService.addMessage(
        conversation.id,
        'assistant',
        response.message,
        nlpAnalysis.intent.category,
        response.confidence,
        response.layer,
        response.metadata
      );

      // Phase 2: Track analytics and performance
      const processingTime = Date.now() - startTime;
      await enhancedAnalyticsService.trackConversation(
        session_id,
        enhancedContext,
        nlpAnalysis.intent,
        response,
        processingTime
      );

      // Phase 2: Track potential conversions
      if (nlpAnalysis.intent.category === 'purchase_intent' && response.confidence > 0.7) {
        await enhancedAnalyticsService.trackConversion({
          id: `conv_${session_id}_${Date.now()}`,
          sessionId: session_id,
          customerId: conversation.customerId,
          event_type: 'lead_generated',
          product_ids: nlpAnalysis.entities.products,
          value: 0, // Would be updated on actual purchase
          currency: 'USD',
          attribution: {
            framework: activeFramework,
            stage: activeStage,
            trigger_message: message,
            ai_confidence: response.confidence
          },
          metadata: {
            channel: 'chat',
            device_type: context?.device_type || 'web',
            user_agent: context?.user_agent,
            referrer: context?.referrer
          },
          timestamp: new Date()
        });
      }

      // Phase 2: Update contextual memory
      if (nlpAnalysis.entities && Object.keys(nlpAnalysis.entities).length > 0) {
        await contextAwarenessEngine.updateContextualMemory({
          sessionId: session_id,
          updateType: 'preference',
          updateData: {
            style: nlpAnalysis.entities.style_indicators,
            colors: nlpAnalysis.entities.colors,
            occasions: nlpAnalysis.entities.occasions,
            budget_range: nlpAnalysis.entities.budget.range
          },
          confidence: nlpAnalysis.intent.confidence,
          source: 'explicit'
        });
      }

      // Log successful interaction with enhanced metrics
      logger.info(`✅ Enhanced chat message processed: ${session_id}`, {
        framework: activeFramework,
        stage: activeStage,
        intent: nlpAnalysis.intent.category,
        confidence: response.confidence,
        responseLayer: response.layer,
        processingTime: processingTime,
        intelligenceUsed: Object.keys(enhancedIntelligence.contextualInsights).filter(k => 
          enhancedIntelligence.contextualInsights[k as keyof typeof enhancedIntelligence.contextualInsights] !== null
        ),
        topicTransition: topicTransition?.to_topic,
        sentimentState: nlpAnalysis.sentiment.emotional_state
      });

      // Phase 2: Enhanced response with all new features
      res.json(createApiResponse(true, {
        message: response.message,
        framework: activeFramework,
        stage: activeStage,
        confidence: response.confidence,
        layer: response.layer,
        suggested_actions: response.suggested_actions || [],
        follow_up_questions: followUpQuestions.slice(0, 3).map(q => q.question),
        personalization_applied: response.personalization_applied,
        tone_adaptations: response.tone_adaptations,
        alternative_responses: response.alternative_responses,
        intelligence_insights: {
          sentiment: nlpAnalysis.sentiment,
          topic_transition: topicTransition,
          business_opportunities: enhancedIntelligence.businessIntelligence,
          personalization_triggers: enhancedIntelligence.responseModifiers.contentPersonalization
        },
        session_context: {
          total_messages: enhancedContext.conversationHistory.length + 1,
          framework_active: activeFramework,
          stage_active: activeStage,
          engagement_level: nlpAnalysis.sentiment.engagement_level,
          decision_readiness: nlpAnalysis.sentiment.decision_readiness,
          processing_time_ms: processingTime
        }
      }));
    } catch (error) {
      logger.error('❌ Failed to process chat message:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to process message'
      ));
    }
  }

  // Get conversation history
  async getConversationHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { sessionId } = req.params;
      const { limit, include_analytics } = req.query;

      if (!sessionId) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'Session ID is required'
        ));
        return;
      }

      // Get conversation
      const conversation = await conversationService.getConversation(sessionId);
      if (!conversation) {
        res.status(404).json(createApiResponse(
          false,
          undefined,
          'Conversation not found'
        ));
        return;
      }

      // Get message history
      const messages = await messageService.getConversationHistory(
        conversation.id,
        limit ? parseInt(limit as string) : undefined
      );

      let response: any = {
        session_id: sessionId,
        conversation_id: conversation.id,
        status: conversation.status,
        framework: conversation.frameworkType,
        current_stage: conversation.currentStage,
        started_at: conversation.startedAt,
        ended_at: conversation.endedAt,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          intent: msg.intent,
          confidence_score: msg.confidenceScore,
          response_layer: msg.responseLayer,
          timestamp: msg.timestamp
        }))
      };

      // Include analytics if requested
      if (include_analytics === 'true') {
        const messageStats = await messageService.getMessageStats(conversation.id);
        response.analytics = messageStats;
      }

      res.json(createApiResponse(true, response));
    } catch (error) {
      logger.error('❌ Failed to get conversation history:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve conversation history'
      ));
    }
  }

  // End conversation with feedback
  async endConversation(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { session_id, satisfaction_score, feedback, conversion_outcome } = req.body;

      if (!session_id) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'session_id is required'
        ));
        return;
      }

      // Validate satisfaction score if provided
      if (satisfaction_score !== undefined && (satisfaction_score < 1 || satisfaction_score > 10)) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'satisfaction_score must be between 1 and 10'
        ));
        return;
      }

      // Get conversation to ensure it exists
      const conversation = await conversationService.getConversation(session_id);
      if (!conversation) {
        res.status(404).json(createApiResponse(
          false,
          undefined,
          'Conversation not found'
        ));
        return;
      }

      // Prepare feedback object
      const conversationFeedback: ConversationFeedback = {
        satisfactionScore: satisfaction_score || 5,
        feedback,
        conversionOutcome: conversion_outcome,
        issueResolved: satisfaction_score >= 7
      };

      // End conversation
      await conversationService.endConversation(session_id, conversationFeedback);

      logger.info(`✅ Ended chat conversation: ${session_id}`, {
        satisfactionScore: satisfaction_score,
        conversionOutcome: conversion_outcome,
        duration: conversation.startedAt ? Date.now() - conversation.startedAt.getTime() : 0
      });

      res.json(createApiResponse(true, {
        message: 'Conversation ended successfully',
        session_id,
        final_satisfaction_score: satisfaction_score,
        thank_you: 'Thank you for using KCT\'s personal style consultation service!'
      }));
    } catch (error) {
      logger.error('❌ Failed to end conversation:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to end conversation'
      ));
    }
  }

  // Get chat analytics
  async getChatAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { start_date, end_date, customer_id } = req.query;

      const startDate = start_date ? new Date(start_date as string) : undefined;
      const endDate = end_date ? new Date(end_date as string) : undefined;

      const analytics = await conversationService.getConversationAnalytics(
        startDate,
        endDate,
        customer_id as string
      );

      res.json(createApiResponse(true, analytics));
    } catch (error) {
      logger.error('❌ Failed to get chat analytics:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve chat analytics'
      ));
    }
  }

  // Health check for chat services - Enhanced with Phase 2
  async getHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const [
        conversationHealth,
        messageHealth,
        stateHealth,
        frameworkHealth,
        atelierHealth,
        restoreHealth,
        precisionHealth,
        // Phase 2 services
        chatIntegrationHealth,
        nlpIntelligenceHealth,
        contextAwarenessHealth,
        responseGenerationHealth,
        realtimeChatHealth,
        enhancedAnalyticsHealth
      ] = await Promise.all([
        conversationService.getHealthCheck(),
        messageService.getHealthCheck(),
        stateManagementService.getHealthCheck(),
        frameworkSelectorService.getHealthCheck(),
        atelierAIService.getHealthCheck(),
        restoreFrameworkService.getHealthCheck(),
        precisionFrameworkService.getHealthCheck(),
        // Phase 2 services
        chatIntegrationService.getHealthCheck(),
        nlpIntelligenceService.getHealthCheck(),
        contextAwarenessEngine.getHealthCheck(),
        responseGenerationSystem.getHealthCheck(),
        realtimeChatService.getHealthCheck(),
        enhancedAnalyticsService.getHealthCheck()
      ]);

      const allHealthChecks = [
        conversationHealth,
        messageHealth,
        stateHealth,
        frameworkHealth,
        atelierHealth,
        restoreHealth,
        precisionHealth,
        chatIntegrationHealth,
        nlpIntelligenceHealth,
        contextAwarenessHealth,
        responseGenerationHealth,
        realtimeChatHealth,
        enhancedAnalyticsHealth
      ];

      const healthyServices = allHealthChecks.filter(h => h.status === 'healthy').length;
      const totalServices = allHealthChecks.length;
      const healthPercentage = healthyServices / totalServices;

      let overallStatus: string;
      if (healthPercentage >= 0.9) overallStatus = 'healthy';
      else if (healthPercentage >= 0.7) overallStatus = 'degraded';
      else overallStatus = 'unhealthy';

      res.json(createApiResponse(true, {
        overall_status: overallStatus,
        health_percentage: Math.round(healthPercentage * 100),
        phase_1_services: {
          conversation_service: conversationHealth,
          message_service: messageHealth,
          state_management: stateHealth,
          framework_selector: frameworkHealth,
          atelier_ai: atelierHealth,
          restore_framework: restoreHealth,
          precision_framework: precisionHealth
        },
        phase_2_services: {
          chat_integration: chatIntegrationHealth,
          nlp_intelligence: nlpIntelligenceHealth,
          context_awareness: contextAwarenessHealth,
          response_generation: responseGenerationHealth,
          realtime_chat: realtimeChatHealth,
          enhanced_analytics: enhancedAnalyticsHealth
        },
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('❌ Chat health check failed:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Chat health check failed'
      ));
    }
  }

  // Simple intent analysis (Phase 1 implementation)
  private analyzeIntent(message: string, context: ConversationContext): Intent {
    const lowerMessage = message.toLowerCase();
    
    // Problem/complaint detection
    const problemKeywords = ['problem', 'issue', 'wrong', 'broken', 'defect', 'complaint', 'return', 'refund'];
    const hasProblem = problemKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasProblem) {
      return {
        category: 'complaint',
        subcategory: 'product_issue',
        confidence: 0.8,
        entities: { problem_detected: true },
        requiresEscalation: lowerMessage.includes('manager') || lowerMessage.includes('escalate')
      };
    }

    // Purchase intent detection
    const purchaseKeywords = ['buy', 'purchase', 'order', 'checkout', 'price', 'cost'];
    const hasPurchaseIntent = purchaseKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasPurchaseIntent) {
      return {
        category: 'purchase_intent',
        confidence: 0.75,
        entities: { purchase_signals: true }
      };
    }

    // Style advice detection
    const styleKeywords = ['advice', 'recommend', 'suggest', 'style', 'look', 'outfit'];
    const wantsAdvice = styleKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (wantsAdvice) {
      return {
        category: 'style_advice',
        confidence: 0.7,
        entities: { advice_request: true }
      };
    }

    // Occasion-specific requests
    const occasions = ['wedding', 'business', 'interview', 'cocktail', 'formal'];
    const mentionedOccasion = occasions.find(occasion => lowerMessage.includes(occasion));
    
    if (mentionedOccasion) {
      return {
        category: 'occasion_guidance',
        confidence: 0.8,
        entities: { occasion: mentionedOccasion }
      };
    }

    // Default general inquiry
    return {
      category: 'general_inquiry',
      confidence: 0.5,
      entities: {}
    };
  }

  // Generate response using appropriate framework
  private async generateFrameworkResponse(
    framework: FrameworkType,
    intent: Intent,
    context: ConversationContext,
    stage?: string
  ): Promise<ChatResponse> {
    switch (framework) {
      case 'atelier_ai':
        return await atelierAIService.generateResponse(intent, context, stage);
      case 'restore':
        return await restoreFrameworkService.generateResponse(intent, context, stage);
      case 'precision':
        return await precisionFrameworkService.generateResponse(intent, context, stage);
      default:
        // Fallback to Atelier AI
        return await atelierAIService.generateResponse(intent, context, stage);
    }
  }

  // Phase 2: Get conversation analytics
  async getConversationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { start_date, end_date, framework, customer_id, converted } = req.query;

      const timeRange = {
        start: start_date ? new Date(start_date as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: end_date ? new Date(end_date as string) : new Date()
      };

      const filters = {
        framework: framework as FrameworkType,
        customerId: customer_id as string,
        converted: converted === 'true' ? true : converted === 'false' ? false : undefined
      };

      const analytics = await enhancedAnalyticsService.getConversationAnalytics(timeRange, filters);

      res.json(createApiResponse(true, analytics));
    } catch (error) {
      logger.error('❌ Failed to get conversation analytics:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve conversation analytics'
      ));
    }
  }

  // Phase 2: Get conversion analytics
  async getConversionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { start_date, end_date } = req.query;

      const timeRange = {
        start: start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: end_date ? new Date(end_date as string) : new Date()
      };

      const analytics = await enhancedAnalyticsService.getConversionAnalytics(timeRange);

      res.json(createApiResponse(true, analytics));
    } catch (error) {
      logger.error('❌ Failed to get conversion analytics:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve conversion analytics'
      ));
    }
  }

  // Phase 2: Get customer journey analytics
  async getCustomerJourneyAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const analytics = await enhancedAnalyticsService.getCustomerJourneyAnalytics();

      res.json(createApiResponse(true, analytics));
    } catch (error) {
      logger.error('❌ Failed to get customer journey analytics:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve customer journey analytics'
      ));
    }
  }

  // Phase 2: Get performance metrics
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const metrics = await enhancedAnalyticsService.getPerformanceMetrics();

      res.json(createApiResponse(true, metrics));
    } catch (error) {
      logger.error('❌ Failed to get performance metrics:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve performance metrics'
      ));
    }
  }

  // Phase 2: Get real-time session status
  async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'Session ID is required'
        ));
        return;
      }

      const status = await realtimeChatService.getSessionStatus(sessionId);

      res.json(createApiResponse(true, status));
    } catch (error) {
      logger.error('❌ Failed to get session status:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve session status'
      ));
    }
  }

  // Phase 2: Track conversion event
  async trackConversion(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { 
        session_id, 
        customer_id, 
        event_type, 
        product_ids, 
        value, 
        currency = 'USD',
        metadata 
      } = req.body;

      if (!session_id || !event_type || value === undefined) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'session_id, event_type, and value are required'
        ));
        return;
      }

      const conversionEvent = {
        id: `conv_${session_id}_${Date.now()}`,
        sessionId: session_id,
        customerId: customer_id,
        event_type: event_type,
        product_ids: product_ids || [],
        value: parseFloat(value),
        currency: currency,
        attribution: {
          framework: 'atelier_ai' as FrameworkType, // Default, would be determined from session
          stage: 'conversion',
          trigger_message: 'External conversion tracking',
          ai_confidence: 0.8
        },
        metadata: {
          channel: 'web',
          device_type: metadata?.device_type || 'unknown',
          user_agent: metadata?.user_agent,
          referrer: metadata?.referrer
        },
        timestamp: new Date()
      };

      await enhancedAnalyticsService.trackConversion(conversionEvent);

      res.json(createApiResponse(true, {
        conversion_id: conversionEvent.id,
        message: 'Conversion tracked successfully'
      }));
    } catch (error) {
      logger.error('❌ Failed to track conversion:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to track conversion'
      ));
    }
  }

  // Phase 2: Generate response variations for A/B testing
  async generateResponseVariations(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { session_id, message, variation_count = 3 } = req.body;

      if (!session_id || !message) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'session_id and message are required'
        ));
        return;
      }

      // Get conversation context
      const conversation = await conversationService.getConversation(session_id);
      if (!conversation) {
        res.status(404).json(createApiResponse(
          false,
          undefined,
          'Conversation not found'
        ));
        return;
      }

      const conversationHistory = await messageService.getConversationHistory(conversation.id);
      const enhancedContext = await contextAwarenessEngine.buildEnhancedContext(
        session_id,
        conversationHistory,
        conversation.customerId
      );

      // Analyze message
      const nlpAnalysis = await nlpIntelligenceService.analyzeMessage({
        message: message,
        conversation_history: conversationHistory.map(m => m.content)
      });

      // Generate variations
      const variations = await responseGenerationSystem.generateResponseVariations(
        nlpAnalysis.intent,
        enhancedContext,
        nlpAnalysis,
        variation_count
      );

      res.json(createApiResponse(true, {
        variations: variations.map((v, index) => ({
          id: `var_${index + 1}`,
          message: v.message,
          layer: v.layer,
          confidence: v.confidence,
          personalization_applied: v.personalization_applied,
          metadata: v.metadata
        }))
      }));
    } catch (error) {
      logger.error('❌ Failed to generate response variations:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to generate response variations'
      ));
    }
  }

  // Phase 2: Get contextual insights for session
  async getContextualInsights(req: Request, res: Response): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json(createApiResponse(
          false,
          undefined,
          'Session ID is required'
        ));
        return;
      }

      const insights = await contextAwarenessEngine.getContextualInsights(sessionId);

      res.json(createApiResponse(true, insights));
    } catch (error) {
      logger.error('❌ Failed to get contextual insights:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to retrieve contextual insights'
      ));
    }
  }
}

export const chatController = new ChatController();