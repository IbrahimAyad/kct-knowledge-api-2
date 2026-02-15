import { logger } from '../utils/logger';
import {
  FrameworkType,
  ConversationContext,
  Intent,
  FrameworkSelector
} from '../types/chat';

export class FrameworkSelectorService implements FrameworkSelector {
  private initialized = false;

  // Intent categories that map to different frameworks
  private readonly FRAMEWORK_MAPPINGS = {
    atelier_ai: {
      intents: [
        'general_inquiry',
        'product_information',
        'style_advice',
        'brand_information',
        'sizing_help',
        'occasion_guidance',
        'color_matching',
        'care_instructions'
      ],
      keywords: [
        'help', 'advice', 'recommend', 'suggest', 'what should', 'how to',
        'style', 'fashion', 'look', 'color', 'size', 'fit', 'occasion'
      ]
    },
    restore: {
      intents: [
        'complaint',
        'problem_report',
        'return_request',
        'refund_request',
        'quality_issue',
        'shipping_problem',
        'order_issue',
        'dissatisfaction'
      ],
      keywords: [
        'problem', 'issue', 'wrong', 'broken', 'defect', 'complaint',
        'return', 'refund', 'unhappy', 'disappointed', 'mistake',
        'damaged', 'poor quality', 'not as expected'
      ]
    },
    precision: {
      intents: [
        'purchase_intent',
        'price_inquiry',
        'comparison_request',
        'availability_check',
        'cart_assistance',
        'checkout_help',
        'promotion_inquiry',
        'urgent_purchase'
      ],
      keywords: [
        'buy', 'purchase', 'price', 'cost', 'how much', 'available',
        'in stock', 'order', 'checkout', 'payment', 'discount',
        'sale', 'urgent', 'need by', 'wedding', 'event'
      ]
    }
  };

  // Stage progression mappings for each framework
  private readonly STAGE_PROGRESSIONS = {
    atelier_ai: [
      'greeting_discovery',
      'needs_assessment',
      'recommendation_generation',
      'style_refinement',
      'final_guidance'
    ],
    restore: [
      'empathetic_discovery',
      'diagnostic_excellence',
      'comprehensive_resolution',
      'proactive_value_restoration',
      'relationship_acceleration',
      'loyalty_acceleration'
    ],
    precision: [
      'value_first_discovery',
      'strategic_needs_architecture',
      'invisible_objection_preemption',
      'value_stacking_presentation',
      'assumptive_completion'
    ]
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.initialized = true;
      logger.info('✅ FrameworkSelectorService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize FrameworkSelectorService:', error);
      throw error;
    }
  }

  selectFramework(context: ConversationContext, intent: Intent): FrameworkType {
    if (!this.initialized) {
      // Initialize synchronously for this simple service
      this.initialized = true;
    }

    try {
      // Priority 1: Check for explicit framework indicators in intent
      const frameworkFromIntent = this.getFrameworkFromIntent(intent);
      if (frameworkFromIntent) {
        logger.info(`✅ Selected framework from intent: ${frameworkFromIntent}`, {
          sessionId: context.sessionId,
          intent: intent.category,
          confidence: intent.confidence
        });
        return frameworkFromIntent;
      }

      // Priority 2: Check conversation history for context clues
      const frameworkFromHistory = this.getFrameworkFromHistory(context);
      if (frameworkFromHistory) {
        logger.info(`✅ Selected framework from history: ${frameworkFromHistory}`, {
          sessionId: context.sessionId,
          historyLength: context.conversationHistory.length
        });
        return frameworkFromHistory;
      }

      // Priority 3: Check customer preferences and context
      const frameworkFromContext = this.getFrameworkFromContext(context);
      if (frameworkFromContext) {
        logger.info(`✅ Selected framework from context: ${frameworkFromContext}`, {
          sessionId: context.sessionId,
          customerId: context.customerId
        });
        return frameworkFromContext;
      }

      // Priority 4: Check for urgency indicators
      const frameworkFromUrgency = this.getFrameworkFromUrgency(context, intent);
      if (frameworkFromUrgency) {
        logger.info(`✅ Selected framework from urgency: ${frameworkFromUrgency}`, {
          sessionId: context.sessionId,
          urgencyIndicators: this.extractUrgencyIndicators(context, intent)
        });
        return frameworkFromUrgency;
      }

      // Default: Use Atelier AI for general assistance
      logger.info('✅ Selected default framework: atelier_ai', {
        sessionId: context.sessionId,
        reason: 'no specific framework indicators found'
      });
      return 'atelier_ai';

    } catch (error) {
      logger.error('❌ Error in framework selection, defaulting to atelier_ai:', error);
      return 'atelier_ai';
    }
  }

  shouldTransition(
    currentFramework: FrameworkType,
    currentStage: string,
    intent: Intent,
    context: ConversationContext
  ): { shouldTransition: boolean; newFramework?: FrameworkType; newStage?: string } {
    try {
      // Check if intent suggests a different framework
      const suggestedFramework = this.getFrameworkFromIntent(intent);
      
      // Transition rules
      if (suggestedFramework && suggestedFramework !== currentFramework) {
        // Allow transitions from Atelier AI to specialized frameworks
        if (currentFramework === 'atelier_ai' && (suggestedFramework === 'restore' || suggestedFramework === 'precision')) {
          return {
            shouldTransition: true,
            newFramework: suggestedFramework,
            newStage: this.getInitialStage(suggestedFramework)
          };
        }

        // Allow transition from PRECISION to RESTORE if problems arise
        if (currentFramework === 'precision' && suggestedFramework === 'restore') {
          return {
            shouldTransition: true,
            newFramework: 'restore',
            newStage: 'empathetic_discovery'
          };
        }

        // Escalation to RESTORE from any framework for serious issues
        if (suggestedFramework === 'restore' && intent.confidence > 0.8) {
          return {
            shouldTransition: true,
            newFramework: 'restore',
            newStage: 'empathetic_discovery'
          };
        }
      }

      // Check for stage progression within current framework
      const nextStage = this.getNextStage(currentFramework, currentStage, intent);
      if (nextStage && nextStage !== currentStage) {
        return {
          shouldTransition: true,
          newStage: nextStage
        };
      }

      // Check for conversation completion or restart
      if (this.shouldRestartConversation(context, intent)) {
        return {
          shouldTransition: true,
          newFramework: this.selectFramework(context, intent),
          newStage: this.getInitialStage(this.selectFramework(context, intent))
        };
      }

      return { shouldTransition: false };

    } catch (error) {
      logger.error('❌ Error in transition decision:', error);
      return { shouldTransition: false };
    }
  }

  private getFrameworkFromIntent(intent: Intent): FrameworkType | null {
    for (const [framework, config] of Object.entries(this.FRAMEWORK_MAPPINGS)) {
      if (config.intents.includes(intent.category)) {
        return framework as FrameworkType;
      }
    }
    return null;
  }

  private getFrameworkFromHistory(context: ConversationContext): FrameworkType | null {
    if (context.conversationHistory.length === 0) return null;

    // Analyze recent messages for framework indicators
    const recentMessages = context.conversationHistory.slice(-5);
    const messageContent = recentMessages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.toLowerCase())
      .join(' ');

    // Check for framework keywords in message content
    for (const [framework, config] of Object.entries(this.FRAMEWORK_MAPPINGS)) {
      const keywordMatches = config.keywords.filter(keyword => 
        messageContent.includes(keyword.toLowerCase())
      );
      
      if (keywordMatches.length >= 2) { // Require multiple keyword matches
        return framework as FrameworkType;
      }
    }

    return null;
  }

  private getFrameworkFromContext(context: ConversationContext): FrameworkType | null {
    // Check for urgent contexts that require PRECISION
    if (context.sessionContext?.urgency === 'high' || 
        context.sessionContext?.occasion === 'urgent' ||
        context.pageContext?.currentPage?.includes('checkout')) {
      return 'precision';
    }

    // Check customer preferences for framework affinity
    if (context.customerPreferences?.communication_style === 'problem_solving') {
      return 'restore';
    }

    if (context.customerPreferences?.shopping_behavior === 'decisive_buyer') {
      return 'precision';
    }

    return null;
  }

  private getFrameworkFromUrgency(context: ConversationContext, intent: Intent): FrameworkType | null {
    const urgencyIndicators = this.extractUrgencyIndicators(context, intent);
    
    if (urgencyIndicators.length > 0) {
      // High urgency suggests PRECISION framework for quick results
      return 'precision';
    }

    return null;
  }

  private extractUrgencyIndicators(context: ConversationContext, intent: Intent): string[] {
    const indicators: string[] = [];
    
    // Check intent entities for time constraints
    if (intent.entities?.time_constraint || intent.entities?.deadline) {
      indicators.push('time_constraint');
    }

    // Check context for urgency markers
    if (context.sessionContext?.urgency === 'high') {
      indicators.push('high_urgency_context');
    }

    // Check conversation history for urgency words
    const urgencyWords = ['urgent', 'asap', 'quickly', 'soon', 'tomorrow', 'today', 'rush'];
    const hasUrgencyWords = context.conversationHistory.some(msg =>
      urgencyWords.some(word => msg.content.toLowerCase().includes(word))
    );

    if (hasUrgencyWords) {
      indicators.push('urgency_language');
    }

    return indicators;
  }

  private getInitialStage(framework: FrameworkType): string {
    const stages = this.STAGE_PROGRESSIONS[framework];
    return stages[0];
  }

  private getNextStage(framework: FrameworkType, currentStage: string, intent: Intent): string | null {
    const stages = this.STAGE_PROGRESSIONS[framework];
    const currentIndex = stages.indexOf(currentStage);
    
    if (currentIndex === -1) {
      // Current stage not found, return first stage
      return stages[0];
    }

    // Check if we should progress to next stage based on intent
    if (this.shouldProgressStage(framework, currentStage, intent)) {
      const nextIndex = currentIndex + 1;
      if (nextIndex < stages.length) {
        return stages[nextIndex];
      }
      // If at last stage, consider conversation complete
      return null;
    }

    return null;
  }

  private shouldProgressStage(framework: FrameworkType, currentStage: string, intent: Intent): boolean {
    // Framework-specific stage progression logic
    switch (framework) {
      case 'atelier_ai':
        return this.shouldProgressAtelierStage(currentStage, intent);
      case 'restore':
        return this.shouldProgressRestoreStage(currentStage, intent);
      case 'precision':
        return this.shouldProgressPrecisionStage(currentStage, intent);
      default:
        return false;
    }
  }

  private shouldProgressAtelierStage(currentStage: string, intent: Intent): boolean {
    switch (currentStage) {
      case 'greeting_discovery':
        return intent.category === 'product_information' || intent.confidence > 0.7;
      case 'needs_assessment':
        return intent.category === 'style_advice' || intent.entities?.preferences;
      case 'recommendation_generation':
        return intent.category === 'comparison_request' || intent.entities?.refinement;
      case 'style_refinement':
        return intent.category === 'purchase_intent' || intent.entities?.satisfaction;
      default:
        return false;
    }
  }

  private shouldProgressRestoreStage(currentStage: string, intent: Intent): boolean {
    switch (currentStage) {
      case 'empathetic_discovery':
        return intent.entities?.problem_details || intent.confidence > 0.8;
      case 'diagnostic_excellence':
        return intent.entities?.root_cause || intent.category === 'solution_acceptance';
      case 'comprehensive_resolution':
        return intent.category === 'satisfaction_confirmation';
      case 'proactive_value_restoration':
        return intent.entities?.value_recognized;
      case 'relationship_acceleration':
        return intent.category === 'trust_building';
      default:
        return false;
    }
  }

  private shouldProgressPrecisionStage(currentStage: string, intent: Intent): boolean {
    switch (currentStage) {
      case 'value_first_discovery':
        return intent.entities?.needs_identified || intent.confidence > 0.75;
      case 'strategic_needs_architecture':
        return intent.category === 'purchase_intent' || intent.entities?.requirements_clear;
      case 'invisible_objection_preemption':
        return intent.entities?.objections_addressed;
      case 'value_stacking_presentation':
        return intent.category === 'purchase_decision' || intent.entities?.value_understood;
      default:
        return false;
    }
  }

  private shouldRestartConversation(context: ConversationContext, intent: Intent): boolean {
    // Check if conversation has been idle for too long
    if (context.conversationHistory.length > 0) {
      const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
      const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();
      
      if (timeSinceLastMessage > 30 * 60 * 1000) { // 30 minutes
        return true;
      }
    }

    // Check for explicit restart indicators
    const restartIntents = ['new_conversation', 'start_over', 'different_topic'];
    return restartIntents.includes(intent.category);
  }

  getFrameworkDescription(framework: FrameworkType): string {
    const descriptions = {
      atelier_ai: 'Sterling Crown AI Assistant - Luxury menswear expertise with personalized style guidance',
      restore: 'RESTORE™ Framework - Transform problems into loyalty-building opportunities',
      precision: 'PRECISION™ Framework - High-conversion sales conversations with psychological optimization'
    };

    return descriptions[framework];
  }

  async getHealthCheck(): Promise<{ status: string; frameworkMappings: number; timestamp: string }> {
    return {
      status: 'healthy',
      frameworkMappings: Object.keys(this.FRAMEWORK_MAPPINGS).length,
      timestamp: new Date().toISOString()
    };
  }
}

export const frameworkSelectorService = new FrameworkSelectorService();