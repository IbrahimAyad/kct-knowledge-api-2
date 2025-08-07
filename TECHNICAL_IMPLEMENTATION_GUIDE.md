# Technical Implementation Guide: Customer Facing Chat Intelligence

## Overview

This guide provides detailed technical implementation steps for integrating the customer-facing chat intelligence into the KCT Knowledge API. It includes code examples, database schemas, service architectures, and integration patterns.

## Phase 1: Core Service Implementation

### 1.1 Customer Chat Service

#### Service Structure
```typescript
// src/services/customer-chat-service.ts
import { ConversationSession, ChatResponse, ConversationHistory } from '../types/chat';
import { ConversationEngineService } from './conversation-engine-service';
import { DataSanitizationService } from './data-sanitization-service';
import { LearningPipelineService } from './learning-pipeline-service';
import { logger } from '../utils/logger';

export class CustomerChatService {
  private conversationEngine: ConversationEngineService;
  private sanitizationService: DataSanitizationService;
  private learningPipeline: LearningPipelineService;
  private activeConversations: Map<string, ConversationSession> = new Map();

  constructor() {
    this.conversationEngine = new ConversationEngineService();
    this.sanitizationService = new DataSanitizationService();
    this.learningPipeline = new LearningPipelineService();
  }

  async startConversation(customerId?: string, context?: ConversationContext): Promise<ConversationSession> {
    const sessionId = this.generateSessionId();
    const conversation: ConversationSession = {
      id: sessionId,
      customerId,
      startedAt: new Date(),
      status: 'active',
      context: context || {},
      messages: [],
      currentFramework: 'discovery',
      currentStage: 'greeting'
    };

    this.activeConversations.set(sessionId, conversation);
    
    // Log conversation start
    logger.info('New conversation started', { 
      sessionId, 
      customerId, 
      context: context || {} 
    });

    // Generate welcome message
    const welcomeResponse = await this.conversationEngine.generateWelcomeMessage(context);
    
    conversation.messages.push({
      id: this.generateMessageId(),
      role: 'assistant',
      content: welcomeResponse.content,
      timestamp: new Date(),
      intent: 'greeting',
      confidenceScore: 1.0,
      responseLayer: 1
    });

    return conversation;
  }

  async processMessage(
    sessionId: string, 
    message: string, 
    context?: MessageContext
  ): Promise<ChatResponse> {
    const conversation = this.activeConversations.get(sessionId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      context
    };
    conversation.messages.push(userMessage);

    try {
      // Analyze intent and generate response
      const intent = await this.conversationEngine.analyzeIntent(message, conversation);
      const response = await this.conversationEngine.generateResponse(intent, conversation);
      
      // Sanitize response for customer safety
      const sanitizedResponse = await this.sanitizationService.sanitizeResponse(
        response, 
        conversation.customerId ? 'CUSTOMER' : 'GUEST'
      );

      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: sanitizedResponse.content,
        timestamp: new Date(),
        intent: intent.type,
        confidenceScore: intent.confidence,
        responseLayer: sanitizedResponse.layer
      };
      conversation.messages.push(assistantMessage);

      // Update conversation state
      conversation.currentStage = response.nextStage;
      conversation.lastActivity = new Date();

      // Queue for learning if valuable interaction
      if (this.isValuableInteraction(intent, response)) {
        await this.learningPipeline.queueForLearning({
          conversationId: sessionId,
          userMessage: message,
          assistantResponse: sanitizedResponse.content,
          intent,
          satisfaction: response.predictedSatisfaction
        });
      }

      return {
        content: sanitizedResponse.content,
        layer: sanitizedResponse.layer,
        nextSuggestions: response.nextSuggestions,
        confidence: intent.confidence,
        conversationState: {
          stage: conversation.currentStage,
          framework: conversation.currentFramework
        }
      };
    } catch (error) {
      logger.error('Error processing message', { sessionId, error });
      
      // Graceful degradation
      return {
        content: "I apologize, but I'm having trouble understanding right now. Could you please rephrase your question?",
        layer: 1,
        confidence: 0.1,
        conversationState: {
          stage: conversation.currentStage,
          framework: conversation.currentFramework
        }
      };
    }
  }

  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValuableInteraction(intent: Intent, response: Response): boolean {
    return intent.confidence > 0.8 && response.predictedSatisfaction > 0.7;
  }
}
```

### 1.2 Conversation Engine Service

```typescript
// src/services/conversation-engine-service.ts
import { Intent, ConversationSession, Response } from '../types/chat';
import { RESTOREFramework } from './frameworks/restore-framework';
import { PRECISIONFramework } from './frameworks/precision-framework';
import { AtelierAIFramework } from './frameworks/atelier-ai-framework';

export class ConversationEngineService {
  private restoreFramework: RESTOREFramework;
  private precisionFramework: PRECISIONFramework;
  private atelierFramework: AtelierAIFramework;
  private intentClassifier: IntentClassifier;

  constructor() {
    this.restoreFramework = new RESTOREFramework();
    this.precisionFramework = new PRECISIONFramework();
    this.atelierFramework = new AtelierAIFramework();
    this.intentClassifier = new IntentClassifier();
  }

  async analyzeIntent(message: string, conversation: ConversationSession): Promise<Intent> {
    // Pre-process message
    const cleanMessage = this.preprocessMessage(message);
  
    // Extract features
    const features = await this.extractFeatures(cleanMessage, conversation);
    
    // Classify intent
    const classification = await this.intentClassifier.classify(features);
    
    // Determine confidence and context
    return {
      type: classification.intent,
      confidence: classification.confidence,
      entities: features.entities,
      sentiment: features.sentiment,
      urgency: this.assessUrgency(cleanMessage, conversation),
      context: {
        conversationStage: conversation.currentStage,
        previousIntents: this.getPreviousIntents(conversation),
        customerType: this.determineCustomerType(conversation)
      }
    };
  }

  async generateResponse(intent: Intent, conversation: ConversationSession): Promise<Response> {
    // Select appropriate framework
    const framework = this.selectFramework(intent, conversation);
    
    let response: Response;
    
    switch (framework) {
      case 'restore':
        response = await this.restoreFramework.generateResponse(intent, conversation);
        break;
      case 'precision':
        response = await this.precisionFramework.generateResponse(intent, conversation);
        break;
      case 'atelier':
      default:
        response = await this.atelierFramework.generateResponse(intent, conversation);
        break;
    }

    // Enhance with context-aware improvements
    return this.enhanceResponse(response, conversation);
  }

  private selectFramework(intent: Intent, conversation: ConversationSession): 'restore' | 'precision' | 'atelier' {
    // Problem/complaint detection
    if (intent.type.includes('problem') || intent.type.includes('complaint') || intent.sentiment < 0.3) {
      return 'restore';
    }
    
    // Sales intent detection
    if (intent.type.includes('purchase') || intent.type.includes('price') || intent.context.customerType === 'ready_to_buy') {
      return 'precision';
    }
    
    // Default to Atelier AI for general inquiries
    return 'atelier';
  }

  private preprocessMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '');
  }

  private async extractFeatures(message: string, conversation: ConversationSession): Promise<MessageFeatures> {
    return {
      tokens: message.split(' '),
      entities: await this.extractEntities(message),
      sentiment: await this.analyzeSentiment(message),
      topics: await this.extractTopics(message),
      conversationHistory: conversation.messages.slice(-5) // Last 5 messages for context
    };
  }

  private assessUrgency(message: string, conversation: ConversationSession): 'low' | 'medium' | 'high' {
    const urgencyKeywords = {
      high: ['urgent', 'asap', 'emergency', 'immediately', 'today', 'now'],
      medium: ['soon', 'quickly', 'this week', 'important'],
      low: ['eventually', 'whenever', 'no rush']
    };

    const messageLower = message.toLowerCase();
    
    if (urgencyKeywords.high.some(keyword => messageLower.includes(keyword))) {
      return 'high';
    }
    if (urgencyKeywords.medium.some(keyword => messageLower.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }
}
```

### 1.3 Data Sanitization Service

```typescript
// src/services/data-sanitization-service.ts
export class DataSanitizationService {
  private sensitivePatterns: RegExp[];
  private protectedFields: string[];
  private sanitizationRules: SanitizationRules;

  constructor() {
    this.sensitivePatterns = [
      /\b(profit|margin|cost|supplier|inventory count|return rate)\b/gi,
      /\b(\d+%\s*(margin|profit|markup))\b/gi,
      /\b(competitor|pricing strategy|market share)\b/gi,
      /\b(customer segment|lifetime value|purchase probability)\b/gi
    ];

    this.protectedFields = [
      'conversionRate', 'profitMargin', 'customerSegment',
      'inventoryCount', 'supplierCost', 'internalScore',
      'purchaseProbability', 'lifetimeValue', 'returnRate',
      'marketShare', 'competitorAnalysis', 'pricingStrategy'
    ];

    this.sanitizationRules = this.loadSanitizationRules();
  }

  async sanitizeResponse(response: any, userType: UserType): Promise<SanitizedResponse> {
    const sanitizationLevel = this.getSanitizationLevel(userType);
    
    let sanitizedContent = response.content;
    
    // Remove sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      sanitizedContent = sanitizedContent.replace(pattern, '[BUSINESS INFORMATION]');
    }

    // Apply field-level sanitization
    if (response.data) {
      response.data = this.sanitizeDataFields(response.data, sanitizationLevel);
    }

    // Replace sensitive business language with customer-friendly alternatives
    sanitizedContent = this.replaceSensitiveLanguage(sanitizedContent);

    return {
      content: sanitizedContent,
      layer: response.layer,
      data: response.data,
      confidence: response.confidence,
      safetyChecks: {
        sensitiveDataRemoved: this.hasSensitiveData(response.content),
        businessLanguageReplaced: this.hasBusinessLanguage(response.content),
        customerAppropriate: true
      }
    };
  }

  private getSanitizationLevel(userType: UserType): SanitizationLevel {
    switch (userType) {
      case 'GUEST': return 'MAXIMUM';
      case 'CUSTOMER': return 'STANDARD';
      case 'VIP': return 'MINIMAL';
      default: return 'MAXIMUM';
    }
  }

  private sanitizeDataFields(data: any, level: SanitizationLevel): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    for (const field of this.protectedFields) {
      if (sanitized[field] !== undefined) {
        switch (level) {
          case 'MAXIMUM':
            delete sanitized[field];
            break;
          case 'STANDARD':
            sanitized[field] = this.obfuscateValue(sanitized[field]);
            break;
          case 'MINIMAL':
            // Keep as is for VIP customers
            break;
        }
      }
    }

    return sanitized;
  }

  private replaceSensitiveLanguage(content: string): string {
    const replacements = {
      'profit margin': 'value proposition',
      'markup': 'pricing',
      'cost': 'investment',
      'inventory': 'availability',
      'conversion rate': 'customer satisfaction',
      'customer segment': 'customer preference'
    };

    let sanitizedContent = content;
    for (const [sensitive, replacement] of Object.entries(replacements)) {
      sanitizedContent = sanitizedContent.replace(
        new RegExp(sensitive, 'gi'), 
        replacement
      );
    }

    return sanitizedContent;
  }

  private hasSensitiveData(content: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(content));
  }
}
```

## Phase 2: Framework Implementation

### 2.1 RESTORE™ Framework

```typescript
// src/services/frameworks/restore-framework.ts
export class RESTOREFramework {
  private stages: Map<string, RESTOREStage>;

  constructor() {
    this.stages = new Map([
      ['empathetic_discovery', new EmpatheticDiscoveryStage()],
      ['diagnostic_excellence', new DiagnosticExcellenceStage()],
      ['comprehensive_resolution', new ComprehensiveResolutionStage()],
      ['immediate_action', new ImmediateActionStage()],
      ['excellence_confirmation', new ExcellenceConfirmationStage()],
      ['loyalty_acceleration', new LoyaltyAccelerationStage()]
    ]);
  }

  async generateResponse(intent: Intent, conversation: ConversationSession): Promise<Response> {
    const currentStage = this.determineStage(intent, conversation);
    const stageHandler = this.stages.get(currentStage);
    
    if (!stageHandler) {
      throw new Error(`Unknown RESTORE stage: ${currentStage}`);
    }

    const response = await stageHandler.process(intent, conversation);
    
    return {
      content: response.content,
      layer: response.layer,
      nextStage: response.nextStage,
      framework: 'restore',
      predictedSatisfaction: response.satisfactionScore,
      nextSuggestions: response.suggestions,
      followUpRequired: response.followUpRequired
    };
  }

  private determineStage(intent: Intent, conversation: ConversationSession): string {
    // Problem severity assessment
    if (intent.sentiment < 0.2) {
      return 'empathetic_discovery';
    }
    
    // Current stage progression logic
    const messageCount = conversation.messages.length;
    if (messageCount <= 2) return 'empathetic_discovery';
    if (messageCount <= 4) return 'diagnostic_excellence';
    if (messageCount <= 6) return 'comprehensive_resolution';
    if (messageCount <= 8) return 'immediate_action';
    if (messageCount <= 10) return 'excellence_confirmation';
    
    return 'loyalty_acceleration';
  }
}

class EmpatheticDiscoveryStage implements RESTOREStage {
  async process(intent: Intent, conversation: ConversationSession): Promise<StageResponse> {
    const acknowledgments = [
      "I'm so sorry to hear you're having this issue. Let me help you get this resolved right away.",
      "I completely understand your frustration, and I'm here to make this right for you.",
      "Thank you for bringing this to my attention. I'm going to personally ensure we fix this."
    ];

    const competenceSignals = [
      "I deal with situations like this regularly, so I know exactly how to help.",
      "Let me walk you through how we're going to solve this step by step.",
      "I've helped many customers with similar issues, and we always find a great solution."
    ];

    // Select appropriate responses based on sentiment and problem type
    const acknowledgment = this.selectResponse(acknowledgments, intent);
    const competence = this.selectResponse(competenceSignals, intent);
    
    const content = `${acknowledgment} ${competence} Help me understand exactly what happened so I can find the best solution for you.`;

    return {
      content,
      layer: 1,
      nextStage: 'diagnostic_excellence',
      satisfactionScore: 0.6,
      suggestions: [
        "Tell me more about what happened",
        "When did this issue first occur?",
        "How is this affecting you right now?"
      ],
      followUpRequired: true
    };
  }

  private selectResponse(responses: string[], intent: Intent): string {
    // Simple selection based on sentiment
    const index = Math.min(
      Math.floor((1 - intent.sentiment) * responses.length),
      responses.length - 1
    );
    return responses[index];
  }
}
```

### 2.2 PRECISION™ Framework

```typescript
// src/services/frameworks/precision-framework.ts
export class PRECISIONFramework {
  private stages: Map<string, PRECISIONStage>;
  private psychologicalTriggers: PsychologicalTriggers;

  constructor() {
    this.stages = new Map([
      ['value_first_discovery', new ValueFirstDiscoveryStage()],
      ['strategic_needs_architecture', new StrategicNeedsStage()],
      ['solution_architecture', new SolutionArchitectureStage()],
      ['preemptive_value_reinforcement', new PreemptiveValueStage()],
      ['assumptive_completion', new AssumptiveCompletionStage()]
    ]);

    this.psychologicalTriggers = new PsychologicalTriggers();
  }

  async generateResponse(intent: Intent, conversation: ConversationSession): Promise<Response> {
    const currentStage = this.determineSalesStage(intent, conversation);
    const stageHandler = this.stages.get(currentStage);
    
    if (!stageHandler) {
      throw new Error(`Unknown PRECISION stage: ${currentStage}`);
    }

    // Apply psychological triggers
    const triggers = await this.psychologicalTriggers.identifyTriggers(intent, conversation);
    
    const response = await stageHandler.process(intent, conversation, triggers);
    
    return {
      content: response.content,
      layer: response.layer,
      nextStage: response.nextStage,
      framework: 'precision',
      predictedSatisfaction: response.satisfactionScore,
      conversionProbability: response.conversionProbability,
      nextSuggestions: response.suggestions,
      urgencyIndicators: response.urgencyIndicators
    };
  }

  private determineSalesStage(intent: Intent, conversation: ConversationSession): string {
    // Analyze conversation for sales progression
    const salesSignals = this.extractSalesSignals(conversation);
    
    if (salesSignals.showingInterest && !salesSignals.hasOccasion) {
      return 'value_first_discovery';
    }
    
    if (salesSignals.hasOccasion && !salesSignals.hasBudget) {
      return 'strategic_needs_architecture';
    }
    
    if (salesSignals.hasBudget && !salesSignals.hasPreference) {
      return 'solution_architecture';
    }
    
    if (salesSignals.hasPreference && !salesSignals.hasUrgency) {
      return 'preemptive_value_reinforcement';
    }
    
    return 'assumptive_completion';
  }

  private extractSalesSignals(conversation: ConversationSession): SalesSignals {
    const messages = conversation.messages.map(m => m.content.toLowerCase()).join(' ');
    
    return {
      showingInterest: /\b(looking|want|need|shopping|interested)\b/.test(messages),
      hasOccasion: /\b(wedding|prom|interview|work|formal|event)\b/.test(messages),
      hasBudget: /\b(budget|price|cost|afford|spend|investment)\b/.test(messages),
      hasPreference: /\b(like|prefer|style|color|fit|size)\b/.test(messages),
      hasUrgency: /\b(when|date|time|soon|need by)\b/.test(messages)
    };
  }
}

class ValueFirstDiscoveryStage implements PRECISIONStage {
  async process(
    intent: Intent, 
    conversation: ConversationSession, 
    triggers: PsychologicalTrigger[]
  ): Promise<StageResponse> {
    const openers = [
      "I help men look exceptional for their most important moments. What's bringing you in today?",
      "Perfect! I specialize in creating that perfect look for special occasions. Tell me about your upcoming event.",
      "Excellent! I love helping customers find exactly what they need to look their absolute best. What's the occasion?"
    ];

    const opener = this.selectOpener(openers, intent);
    
    const qualificationQuestions = [
      "When is this happening?",
      "What would success look like for you that day?",
      "On a scale of 1-10, how important is it that you look absolutely perfect for this?"
    ];

    const content = `${opener} Let me ask you a few quick questions to make sure I find you the perfect solution: ${qualificationQuestions.join(' ')}`;

    return {
      content,
      layer: 1,
      nextStage: 'strategic_needs_architecture',
      satisfactionScore: 0.7,
      conversionProbability: 0.45,
      suggestions: [
        "Tell me about the occasion",
        "When do you need this by?",
        "What's most important to you?"
      ],
      urgencyIndicators: triggers.filter(t => t.type === 'urgency')
    };
  }

  private selectOpener(openers: string[], intent: Intent): string {
    // Select based on confidence and context
    if (intent.confidence > 0.8) {
      return openers[0]; // Most direct
    } else if (intent.context.previousIntents.length > 0) {
      return openers[1]; // Acknowledging continuation
    }
    return openers[2]; // Most supportive
  }
}
```

## Phase 3: Database Integration

### 3.1 Database Schema Implementation

```sql
-- Create chat-related tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(255),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    framework_type VARCHAR(50) DEFAULT 'atelier',
    current_stage VARCHAR(100) DEFAULT 'greeting',
    context JSONB DEFAULT '{}',
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    last_activity TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10),
    conversion_outcome BOOLEAN,
    total_messages INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation messages table
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    intent VARCHAR(100),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    response_layer INTEGER CHECK (response_layer IN (1, 2, 3)),
    context JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Conversation analytics table
CREATE TABLE conversation_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    metadata JSONB DEFAULT '{}',
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- Learning queue table
CREATE TABLE learning_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    interaction_data JSONB NOT NULL,
    pattern_type VARCHAR(100),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    processed BOOLEAN DEFAULT FALSE,
    processing_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Intent patterns table for learning
CREATE TABLE intent_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_text TEXT NOT NULL,
    intent_type VARCHAR(100) NOT NULL,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer feedback table
CREATE TABLE customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10),
    feedback_text TEXT,
    feedback_type VARCHAR(50),
    helpful_score INTEGER CHECK (helpful_score >= 1 AND helpful_score <= 5),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_timestamp ON conversation_messages(timestamp);
CREATE INDEX idx_learning_queue_processed ON learning_queue(processed);
CREATE INDEX idx_intent_patterns_intent_type ON intent_patterns(intent_type);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intent_patterns_updated_at 
    BEFORE UPDATE ON intent_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Database Service Implementation

```typescript
// src/services/database/chat-database-service.ts
import { Pool } from 'pg';
import { ConversationSession, ConversationMessage } from '../../types/chat';

export class ChatDatabaseService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async saveConversation(conversation: ConversationSession): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert or update conversation
      const conversationQuery = `
        INSERT INTO conversations (
          session_id, customer_id, framework_type, current_stage, 
          context, status, total_messages, last_activity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (session_id) 
        DO UPDATE SET
          current_stage = EXCLUDED.current_stage,
          context = EXCLUDED.context,
          status = EXCLUDED.status,
          total_messages = EXCLUDED.total_messages,
          last_activity = EXCLUDED.last_activity
        RETURNING id
      `;
      
      const conversationResult = await client.query(conversationQuery, [
        conversation.id,
        conversation.customerId,
        conversation.currentFramework,
        conversation.currentStage,
        JSON.stringify(conversation.context),
        conversation.status,
        conversation.messages.length,
        conversation.lastActivity || new Date()
      ]);
      
      const conversationDbId = conversationResult.rows[0].id;
      
      // Insert new messages
      for (const message of conversation.messages) {
        if (!message.saved) {
          await this.saveMessage(conversationDbId, message, client);
          message.saved = true;
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async loadConversation(sessionId: string): Promise<ConversationSession | null> {
    const query = `
      SELECT c.*, 
             json_agg(
               json_build_object(
                 'id', m.id,
                 'role', m.role,
                 'content', m.content,
                 'intent', m.intent,
                 'confidenceScore', m.confidence_score,
                 'responseLayer', m.response_layer,
                 'timestamp', m.timestamp,
                 'context', m.context
               ) ORDER BY m.timestamp
             ) as messages
      FROM conversations c
      LEFT JOIN conversation_messages m ON c.id = m.conversation_id
      WHERE c.session_id = $1
      GROUP BY c.id
    `;
    
    const result = await this.pool.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      id: row.session_id,
      customerId: row.customer_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      lastActivity: row.last_activity,
      status: row.status,
      context: row.context,
      currentFramework: row.framework_type,
      currentStage: row.current_stage,
      messages: row.messages.filter((m: any) => m.id !== null) // Filter out null messages
    };
  }

  private async saveMessage(
    conversationId: string, 
    message: ConversationMessage, 
    client: any
  ): Promise<void> {
    const query = `
      INSERT INTO conversation_messages (
        conversation_id, role, content, intent, confidence_score,
        response_layer, context, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await client.query(query, [
      conversationId,
      message.role,
      message.content,
      message.intent,
      message.confidenceScore,
      message.responseLayer,
      JSON.stringify(message.context || {}),
      message.timestamp
    ]);
  }

  async saveConversationAnalytics(
    conversationId: string, 
    metrics: ConversationMetrics
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      for (const [metricName, metricValue] of Object.entries(metrics)) {
        await client.query(
          'INSERT INTO conversation_analytics (conversation_id, metric_name, metric_value) VALUES ($1, $2, $3)',
          [conversationId, metricName, metricValue]
        );
      }
    } finally {
      client.release();
    }
  }

  async queueForLearning(learningData: LearningQueueItem): Promise<void> {
    const query = `
      INSERT INTO learning_queue (
        conversation_id, interaction_data, pattern_type, priority
      ) VALUES ($1, $2, $3, $4)
    `;
    
    await this.pool.query(query, [
      learningData.conversationId,
      JSON.stringify(learningData.interactionData),
      learningData.patternType,
      learningData.priority
    ]);
  }
}
```

## Phase 4: API Controller Implementation

### 4.1 Chat API Controller

```typescript
// src/controllers/chat-api.ts
import { Request, Response } from 'express';
import { CustomerChatService } from '../services/customer-chat-service';
import { createApiResponse } from '../utils/data-loader';
import { logger } from '../utils/logger';

export class ChatApiController {
  private chatService: CustomerChatService;

  constructor() {
    this.chatService = new CustomerChatService();
  }

  async startConversation(req: Request, res: Response): Promise<void> {
    try {
      const { customer_id, context } = req.body;
      
      const conversation = await this.chatService.startConversation(customer_id, context);
      
      res.json(createApiResponse(true, {
        session_id: conversation.id,
        welcome_message: conversation.messages[0].content,
        conversation_state: {
          stage: conversation.currentStage,
          framework: conversation.currentFramework
        }
      }));
    } catch (error) {
      logger.error('Error starting conversation:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to start conversation'
      ));
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { session_id, message, context } = req.body;
      
      if (!session_id || !message) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'session_id and message are required'
        ));
      }
      
      const response = await this.chatService.processMessage(session_id, message, context);
      
      res.json(createApiResponse(true, response));
    } catch (error) {
      logger.error('Error processing message:', error);
      
      if (error.message === 'Conversation not found') {
        return res.status(404).json(createApiResponse(
          false,
          undefined,
          'Conversation not found'
        ));
      }
      
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to process message'
      ));
    }
  }

  async getConversationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { include_analytics = false, limit = 50 } = req.query;
      
      const history = await this.chatService.getConversationHistory(
        sessionId, 
        { 
          includeAnalytics: include_analytics === 'true', 
          limit: parseInt(limit as string) 
        }
      );
      
      if (!history) {
        return res.status(404).json(createApiResponse(
          false,
          undefined,
          'Conversation not found'
        ));
      }
      
      res.json(createApiResponse(true, history));
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to get conversation history'
      ));
    }
  }

  async endConversation(req: Request, res: Response): Promise<void> {
    try {
      const { session_id, satisfaction_score, feedback, conversion_outcome } = req.body;
      
      if (!session_id) {
        return res.status(400).json(createApiResponse(
          false,
          undefined,
          'session_id is required'
        ));
      }
      
      await this.chatService.endConversation(session_id, {
        satisfactionScore: satisfaction_score,
        feedback,
        conversionOutcome: conversion_outcome
      });
      
      res.json(createApiResponse(true, { message: 'Conversation ended successfully' }));
    } catch (error) {
      logger.error('Error ending conversation:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to end conversation'
      ));
    }
  }

  async getChatAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '7d' } = req.query;
      
      const analytics = await this.chatService.getChatAnalytics(timeframe as string);
      
      res.json(createApiResponse(true, analytics));
    } catch (error) {
      logger.error('Error getting chat analytics:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to get chat analytics'
      ));
    }
  }

  async getChatHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.chatService.getHealthStatus();
      
      res.json(createApiResponse(true, health));
    } catch (error) {
      logger.error('Error getting chat health:', error);
      res.status(500).json(createApiResponse(
        false,
        undefined,
        'Failed to get chat health status'
      ));
    }
  }
}
```

## Phase 5: Testing Implementation

### 5.1 Conversation Quality Tests

```typescript
// src/tests/chat/conversation-quality.test.ts
import { CustomerChatService } from '../../services/customer-chat-service';
import { ConversationEngineService } from '../../services/conversation-engine-service';
import { DataSanitizationService } from '../../services/data-sanitization-service';

describe('Conversation Quality Tests', () => {
  let chatService: CustomerChatService;
  let conversationEngine: ConversationEngineService;
  let sanitizationService: DataSanitizationService;

  beforeEach(() => {
    chatService = new CustomerChatService();
    conversationEngine = new ConversationEngineService();
    sanitizationService = new DataSanitizationService();
  });

  describe('Data Protection', () => {
    test('should not expose sensitive business data in responses', async () => {
      const testMessage = "What's your profit margin on suits?";
      const mockConversation = createMockConversation();
      
      const response = await chatService.processMessage(
        mockConversation.id, 
        testMessage
      );
      
      expect(response.content).not.toMatch(/margin|profit|cost/i);
      expect(response.content).toMatch(/quality|value|investment/i);
    });

    test('should sanitize inventory information', async () => {
      const testData = {
        content: "We have 243 units in stock with a 45% margin",
        inventoryCount: 243,
        profitMargin: 0.45
      };
      
      const sanitized = await sanitizationService.sanitizeResponse(
        testData, 
        'GUEST'
      );
      
      expect(sanitized.content).not.toContain('243 units');
      expect(sanitized.content).not.toContain('45%');
      expect(sanitized.data).not.toHaveProperty('inventoryCount');
      expect(sanitized.data).not.toHaveProperty('profitMargin');
    });

    test('should replace business language with customer-friendly terms', async () => {
      const businessContent = "The conversion rate for this combination is high with good profit margins";
      
      const sanitized = await sanitizationService.sanitizeResponse(
        { content: businessContent }, 
        'CUSTOMER'
      );
      
      expect(sanitized.content).toContain('customer satisfaction');
      expect(sanitized.content).toContain('value proposition');
      expect(sanitized.content).not.toContain('conversion rate');
      expect(sanitized.content).not.toContain('profit margins');
    });
  });

  describe('Framework Integration', () => {
    test('should select RESTORE framework for problem scenarios', async () => {
      const problemMessage = "I'm really frustrated with my order, it doesn't fit at all";
      const mockConversation = createMockConversation();
      
      const intent = await conversationEngine.analyzeIntent(problemMessage, mockConversation);
      expect(intent.sentiment).toBeLessThan(0.5);
      
      const response = await conversationEngine.generateResponse(intent, mockConversation);
      expect(response.framework).toBe('restore');
      expect(response.content).toMatch(/sorry|understand|frustration/i);
    });

    test('should select PRECISION framework for sales scenarios', async () => {
      const salesMessage = "I'm looking to buy a suit for my wedding next month";
      const mockConversation = createMockConversation();
      
      const intent = await conversationEngine.analyzeIntent(salesMessage, mockConversation);
      expect(intent.type).toMatch(/purchase|wedding/);
      
      const response = await conversationEngine.generateResponse(intent, mockConversation);
      expect(response.framework).toBe('precision');
      expect(response.conversionProbability).toBeGreaterThan(0.4);
    });

    test('should maintain personality consistency across conversation', async () => {
      const conversation = await simulateFullConversation([
        "Hi, I need help finding a suit",
        "It's for a job interview",
        "What would you recommend?",
        "How much would that cost?"
      ]);
      
      const toneConsistency = analyzeToneConsistency(conversation.messages);
      expect(toneConsistency).toBeGreaterThan(0.9);
      
      // Check for consistent voice characteristics
      const responses = conversation.messages
        .filter(m => m.role === 'assistant')
        .map(m => m.content);
      
      responses.forEach(response => {
        expect(response).toMatch(/\b(help|perfect|great|excellent)\b/i);
        expect(response).not.toMatch(/\b(buy|purchase|cheap)\b/i);
      });
    });
  });

  describe('Learning System', () => {
    test('should identify valuable interactions for learning', async () => {
      const highValueInteraction = {
        intent: { type: 'product_inquiry', confidence: 0.9 },
        response: { predictedSatisfaction: 0.8 }
      };
      
      const isValuable = chatService.isValuableInteraction(
        highValueInteraction.intent, 
        highValueInteraction.response
      );
      
      expect(isValuable).toBe(true);
    });

    test('should queue successful patterns for learning', async () => {
      const mockConversation = createSuccessfulConversation();
      
      const learningData = await chatService.extractLearningData(mockConversation);
      
      expect(learningData).toHaveProperty('patterns');
      expect(learningData.patterns.length).toBeGreaterThan(0);
      expect(learningData.patterns[0]).toHaveProperty('successRate');
    });
  });

  describe('Response Quality', () => {
    test('should provide layered responses appropriately', async () => {
      const question = "How should a suit fit?";
      const mockConversation = createMockConversation();
      
      const response = await chatService.processMessage(
        mockConversation.id, 
        question
      );
      
      // Layer 1 should be concise
      expect(response.content.split(' ').length).toBeLessThan(50);
      expect(response.layer).toBe(1);
      
      // Should have options for deeper information
      expect(response.nextSuggestions).toContain('Tell me more');
    });

    test('should handle context transitions smoothly', async () => {
      const conversation = await simulateConversationFlow([
        { message: "I need a suit", expectedStage: "discovery" },
        { message: "It's for a wedding", expectedStage: "needs_assessment" },
        { message: "In June next year", expectedStage: "product_presentation" }
      ]);
      
      expect(conversation.stages).toEqual(["discovery", "needs_assessment", "product_presentation"]);
    });
  });

  describe('Performance Metrics', () => {
    test('should meet response time requirements', async () => {
      const startTime = Date.now();
      
      await chatService.processMessage(
        'test-session', 
        'What colors go with a navy suit?'
      );
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // 3 seconds max
    });

    test('should handle concurrent conversations', async () => {
      const conversations = await Promise.all([
        chatService.startConversation('customer1'),
        chatService.startConversation('customer2'),
        chatService.startConversation('customer3')
      ]);
      
      expect(conversations).toHaveLength(3);
      expect(new Set(conversations.map(c => c.id))).toHaveLength(3);
    });
  });
});

// Test utilities
function createMockConversation(): ConversationSession {
  return {
    id: 'test-session-123',
    startedAt: new Date(),
    status: 'active',
    context: {},
    messages: [],
    currentFramework: 'atelier',
    currentStage: 'greeting'
  };
}

function analyzeToneConsistency(messages: ConversationMessage[]): number {
  // Simplified tone analysis
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  if (assistantMessages.length < 2) return 1;
  
  const toneScores = assistantMessages.map(m => analyzeTone(m.content));
  const avgTone = toneScores.reduce((a, b) => a + b, 0) / toneScores.length;
  const variance = toneScores.reduce((acc, score) => acc + Math.pow(score - avgTone, 2), 0) / toneScores.length;
  
  return Math.max(0, 1 - Math.sqrt(variance));
}

function analyzeTone(content: string): number {
  // Simple tone scoring based on positive/helpful language
  const positiveWords = ['help', 'perfect', 'great', 'excellent', 'wonderful'];
  const negativeWords = ['cheap', 'buy', 'sell', 'cost'];
  
  const words = content.toLowerCase().split(' ');
  const positiveCount = words.filter(w => positiveWords.includes(w)).length;
  const negativeCount = words.filter(w => negativeWords.includes(w)).length;
  
  return (positiveCount - negativeCount + words.length) / words.length;
}
```

This technical implementation guide provides a comprehensive foundation for building the customer-facing chat intelligence system. The code examples demonstrate proper architecture, data protection, framework integration, and quality assurance measures that align with the three core frameworks (Atelier AI, RESTORE™, and PRECISION™).

The implementation ensures business intelligence protection while delivering personalized, context-aware customer service that can handle various scenarios from general inquiries to problem resolution and sales conversion.