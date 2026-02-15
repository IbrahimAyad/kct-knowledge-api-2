import { logger } from '../utils/logger';
import {
  ConversationContext,
  Intent,
  ChatResponse,
  PRECISIONFramework,
  PRECISIONStage
} from '../types/chat';

export class PrecisionFrameworkService {
  private initialized = false;
  private framework: PRECISIONFramework = {
    value_first_discovery: {
      name: 'Value-First Discovery',
      duration: { min: 60, max: 90 },
      conversionTarget: 45,
      techniques: [
        "Investment in quality saves money long-term",
        "Perfect fit eliminates expensive alterations",
        "Versatile pieces maximize cost-per-wear",
        "Professional appearance drives career success"
      ],
      triggers: [
        "special_occasion",
        "career_advancement",
        "time_constraint",
        "quality_investment"
      ]
    },
    strategic_needs_architecture: {
      name: 'Strategic Needs Architecture',
      duration: { min: 120, max: 180 },
      conversionTarget: 65,
      techniques: [
        "Multi-occasion versatility planning",
        "Wardrobe gap analysis",
        "Style progression roadmap",
        "Personal brand development"
      ],
      triggers: [
        "wardrobe_planning",
        "professional_image",
        "lifestyle_change",
        "comprehensive_update"
      ]
    },
    invisible_objection_preemption: {
      name: 'Invisible Objection Preemption',
      duration: { min: 45, max: 75 },
      conversionTarget: 75,
      techniques: [
        "Price justification before concern",
        "Quality comparison framework",
        "Investment timeline perspective",
        "Risk mitigation assurance"
      ],
      triggers: [
        "price_sensitivity",
        "quality_concerns",
        "sizing_hesitation",
        "decision_uncertainty"
      ]
    },
    value_stacking_presentation: {
      name: 'Value Stacking Presentation',
      duration: { min: 90, max: 120 },
      conversionTarget: 85,
      techniques: [
        "Comprehensive benefit compilation",
        "Total value calculation",
        "Exclusive advantage highlighting",
        "Future benefit projection"
      ],
      triggers: [
        "comparison_shopping",
        "value_questioning",
        "benefit_focus",
        "decision_approaching"
      ]
    },
    assumptive_completion: {
      name: 'Assumptive Completion',
      duration: { min: 30, max: 60 },
      conversionTarget: 92,
      techniques: [
        "Natural purchase progression",
        "Implementation planning",
        "Success visualization",
        "Immediate action facilitation"
      ],
      triggers: [
        "positive_signals",
        "objections_resolved",
        "value_recognized",
        "urgency_identified"
      ]
    }
  };

  // Customer psychology and buying trigger mappings
  private readonly PSYCHOLOGICAL_TRIGGERS = {
    urgency: {
      patterns: ['deadline', 'event', 'soon', 'quickly', 'urgent', 'by [date]'],
      response_multiplier: 1.5,
      close_probability: 0.85
    },
    authority: {
      patterns: ['professional', 'executive', 'leader', 'important', 'meeting'],
      response_multiplier: 1.3,
      close_probability: 0.75
    },
    social_proof: {
      patterns: ['others', 'popular', 'bestseller', 'recommended', 'reviews'],
      response_multiplier: 1.2,
      close_probability: 0.70
    },
    scarcity: {
      patterns: ['limited', 'exclusive', 'last', 'rare', 'special'],
      response_multiplier: 1.4,
      close_probability: 0.80
    },
    reciprocity: {
      patterns: ['help', 'service', 'consultation', 'advice', 'guidance'],
      response_multiplier: 1.1,
      close_probability: 0.65
    }
  };

  // Price psychology and value positioning
  private readonly VALUE_POSITIONING = {
    investment_mindset: {
      cost_per_wear_calculator: true,
      quality_longevity_emphasis: true,
      professional_roi_focus: true,
      total_wardrobe_value: true
    },
    comparison_frameworks: {
      premium_vs_standard: "Quality investment that pays dividends",
      bespoke_vs_ready: "Bespoke quality with ready-to-wear convenience",
      rental_vs_purchase: "Own your confidence, don't rent your style",
      discount_vs_investment: "True luxury never goes on sale for a reason"
    },
    objection_preemption: {
      price_concerns: "The cost of not investing in quality far exceeds this investment",
      timing_hesitation: "The right opportunity costs more tomorrow than today",
      decision_paralysis: "Successful people make decisions quickly and change them slowly",
      competitor_comparison: "You're not just buying clothes, you're investing in your success"
    }
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.initialized = true;
      logger.info('✅ PrecisionFrameworkService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize PrecisionFrameworkService:', error);
      throw error;
    }
  }

  async generateResponse(
    intent: Intent,
    context: ConversationContext,
    stage?: string
  ): Promise<ChatResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const currentStage = stage || 'value_first_discovery';
      const response = this.buildStageResponse(intent, context, currentStage);
      
      logger.info(`✅ Generated PRECISION™ response for stage ${currentStage}`, {
        sessionId: context.sessionId,
        stage: currentStage,
        conversionTarget: (this.framework as any)[currentStage]?.conversionTarget,
        psychologicalTriggers: this.identifyPsychologicalTriggers(intent, context)
      });

      return response;
    } catch (error) {
      logger.error('❌ Failed to generate PRECISION™ response:', error);
      
      // Fallback value-focused response
      return {
        message: "I'm here to help you find exactly what you need for success. What's the occasion or goal we're working toward?",
        confidence: 0.6,
        layer: 2,
        framework: 'precision',
        stage: 'value_first_discovery',
        metadata: { error: 'fallback_response' }
      };
    }
  }

  private buildStageResponse(
    intent: Intent,
    context: ConversationContext,
    stage: string
  ): ChatResponse {
    const stageConfig = (this.framework as any)[stage] as PRECISIONStage;
    const psychTriggers = this.identifyPsychologicalTriggers(intent, context);
    
    let message = '';
    let confidence = intent.confidence;
    let nextStage: string | undefined;
    let suggestedActions: string[] = [];

    switch (stage) {
      case 'value_first_discovery':
        message = this.buildValueFirstDiscovery(intent, context, psychTriggers);
        nextStage = 'strategic_needs_architecture';
        suggestedActions = ['Share Occasion Details', 'Discuss Budget', 'Explore Options'];
        break;
        
      case 'strategic_needs_architecture':
        message = this.buildStrategicNeeds(intent, context, psychTriggers);
        nextStage = 'invisible_objection_preemption';
        suggestedActions = ['Review Recommendations', 'Discuss Customization', 'Compare Options'];
        break;
        
      case 'invisible_objection_preemption':
        message = this.buildObjectionPreemption(intent, context, psychTriggers);
        nextStage = 'value_stacking_presentation';
        suggestedActions = ['Address Concerns', 'Request Details', 'Explore Alternatives'];
        break;
        
      case 'value_stacking_presentation':
        message = this.buildValueStacking(intent, context, psychTriggers);
        nextStage = 'assumptive_completion';
        suggestedActions = ['Review Total Value', 'Ask Questions', 'Request Consultation'];
        break;
        
      case 'assumptive_completion':
        message = this.buildAssumptiveCompletion(intent, context, psychTriggers);
        suggestedActions = ['Complete Purchase', 'Schedule Fitting', 'Request Follow-up'];
        break;
        
      default:
        message = this.buildDefaultPrecisionResponse(intent, context);
        nextStage = 'value_first_discovery';
    }

    // Apply psychological trigger multipliers
    if (psychTriggers.length > 0) {
      const multiplier = psychTriggers.reduce((acc, trigger) =>
        acc * (this.PSYCHOLOGICAL_TRIGGERS as any)[trigger]?.response_multiplier || 1, 1
      );
      confidence = Math.min(confidence * multiplier, 1.0);
    }

    return {
      message,
      confidence,
      layer: 3, // PRECISION responses are typically comprehensive
      framework: 'precision',
      stage,
      nextStage,
      suggestedActions,
      metadata: {
        stageConfig: stageConfig.name,
        conversionTarget: `${stageConfig.conversionTarget}%`,
        psychologicalTriggers: psychTriggers,
        estimatedDuration: `${stageConfig.duration.min}-${stageConfig.duration.max} seconds`
      }
    };
  }

  private buildValueFirstDiscovery(
    intent: Intent,
    context: ConversationContext,
    psychTriggers: string[]
  ): string {
    let response = "I'm excited to help you find the perfect pieces that will elevate your style and confidence. ";

    // Identify primary value driver
    if (psychTriggers.includes('urgency')) {
      response += "I understand you're working with a timeline, so let's focus on solutions that deliver maximum impact efficiently. ";
    } else if (psychTriggers.includes('authority')) {
      response += "Professional success often starts with the confidence that comes from impeccable style. ";
    } else {
      response += "Smart style investments pay dividends in confidence and professional success. ";
    }

    // Add value-first positioning
    response += "\n\nHere's how I approach finding your ideal pieces:\n\n";
    response += "• **Quality Investment**: Each piece is selected for longevity and versatility\n";
    response += "• **Cost-Per-Wear Value**: We maximize your investment across multiple occasions\n";
    response += "• **Professional Impact**: Style choices that enhance your personal brand\n";
    response += "• **Perfect Fit Guarantee**: Alterations ensure every piece looks custom-made\n\n";

    // Discover specific needs
    if (intent.entities?.occasion) {
      response += `For ${intent.entities.occasion}, I'll ensure every element works together perfectly. `;
    }
    
    response += "What's the primary goal we're working toward - a specific event, professional enhancement, or complete wardrobe elevation?";

    return response;
  }

  private buildStrategicNeeds(
    intent: Intent,
    context: ConversationContext,
    psychTriggers: string[]
  ): string {
    let response = "Excellent! Based on what you've shared, I'm developing a strategic approach that maximizes both your investment and impact.\n\n";

    // Needs architecture framework
    response += "**Your Strategic Style Plan:**\n\n";
    response += "1. **Foundation Pieces**: Core items that work across multiple occasions\n";
    response += "2. **Occasion-Specific Elements**: Targeted pieces for your immediate needs\n";
    response += "3. **Versatility Multipliers**: Accessories and layers that expand options\n";
    response += "4. **Future-Proofing**: Timeless selections that evolve with your success\n\n";

    // Address psychological triggers
    if (psychTriggers.includes('scarcity')) {
      response += "Several of these pieces are from limited collections that align perfectly with your requirements. ";
    }
    
    if (psychTriggers.includes('social_proof')) {
      response += "These selections are consistently chosen by our most successful clients. ";
    }

    // Specific recommendations based on context
    if (context.sessionContext?.occasion) {
      response += `For your ${context.sessionContext.occasion}, I recommend:\n\n`;
      response += this.generateOccasionRecommendations(context.sessionContext.occasion);
    }

    response += "\n\nThis approach ensures every piece works together while giving you maximum flexibility. What aspects of this plan resonate most with your vision?";

    return response;
  }

  private buildObjectionPreemption(
    intent: Intent,
    context: ConversationContext,
    psychTriggers: string[]
  ): string {
    let response = "I want to address some considerations that many successful professionals think about when making these investments.\n\n";

    // Preempt common objections
    response += "**Investment Perspective:**\n";
    response += "• Quality pieces typically cost 60% less per wear over 5 years than frequent replacements\n";
    response += "• Professional appearance studies show 23% higher perceived competence with proper attire\n";
    response += "• Our alteration service ensures perfect fit, eliminating the #1 reason for wardrobe dissatisfaction\n\n";

    response += "**Quality Assurance:**\n";
    response += "• Each piece undergoes rigorous quality control\n";
    response += "• Satisfaction guarantee with hassle-free exchanges\n";
    response += "• Lifetime support for fit adjustments and care guidance\n\n";

    // Address timing concerns
    if (psychTriggers.includes('urgency')) {
      response += "**Timeline Confidence:**\n";
      response += "• Express alterations available for urgent needs\n";
      response += "• Rush delivery ensures you're prepared on time\n";
      response += "• Backup options available if adjustments are needed\n\n";
    }

    // Address budget considerations
    response += "**Value Protection:**\n";
    response += this.buildValueProtectionMessage(context);

    response += "\n\nMost importantly, you're not just buying clothing - you're investing in your confidence and professional success. What questions can I answer to ensure you feel completely confident?";

    return response;
  }

  private buildValueStacking(
    intent: Intent,
    context: ConversationContext,
    psychTriggers: string[]
  ): string {
    let response = "Let me show you the complete value of what you're receiving with these selections:\n\n";

    // Core value stack
    response += "**Your Complete Package Includes:**\n\n";
    response += "✓ Premium quality garments with exceptional construction\n";
    response += "✓ Professional alteration service for perfect fit\n";
    response += "✓ Personal styling consultation and ongoing support\n";
    response += "✓ Lifetime care guidance and maintenance tips\n";
    response += "✓ Satisfaction guarantee with flexible exchange policy\n";
    response += "✓ Priority customer service for all future needs\n\n";

    // Calculate total value
    response += "**Investment Analysis:**\n";
    response += this.calculateValueStack(context);

    // Exclusive benefits
    response += "\n**Exclusive Advantages:**\n";
    response += "• Access to limited collections not available elsewhere\n";
    response += "• First priority on new arrivals and special pieces\n";
    response += "• Invitation to private styling events and trunk shows\n";
    response += "• Relationships with the industry's finest craftspeople\n\n";

    // Future value
    if (psychTriggers.includes('authority')) {
      response += "**Career Investment Value:**\n";
      response += "• Professional image enhancement for advancement opportunities\n";
      response += "• Confidence boost that translates to performance improvement\n";
      response += "• Network impact - quality style opens doors and creates connections\n\n";
    }

    response += "When you consider everything included, plus the long-term benefits to your confidence and success, this represents exceptional value. Ready to move forward with these selections?";

    return response;
  }

  private buildAssumptiveCompletion(
    intent: Intent,
    context: ConversationContext,
    psychTriggers: string[]
  ): string {
    let response = "Perfect! I can see you recognize the value and impact these pieces will have. Let's get everything set up for your success.\n\n";

    // Implementation plan
    response += "**Next Steps:**\n";
    response += "1. **Secure Your Selections**: I'll reserve these pieces immediately\n";
    response += "2. **Fitting Coordination**: Schedule your alteration appointment\n";
    response += "3. **Delivery Planning**: Arrange timing that works perfectly for you\n";
    response += "4. **Success Preparation**: Ensure everything is ready when you need it\n\n";

    // Urgency handling
    if (psychTriggers.includes('urgency')) {
      response += "**Express Service Activated:**\n";
      response += "• Priority processing for immediate attention\n";
      response += "• Expedited alterations to meet your deadline\n";
      response += "• Rush delivery coordination\n";
      response += "• Personal oversight to ensure perfect timing\n\n";
    }

    // Remove decision friction
    response += "**Everything Handled:**\n";
    response += "• No complex decisions remaining\n";
    response += "• All details managed by our team\n";
    response += "• Satisfaction guaranteed every step\n";
    response += "• Full support until you're completely satisfied\n\n";

    response += "I'll take care of processing everything right now. What's the best way to coordinate delivery and fitting - would you prefer to handle everything in one visit or spread it across a couple of appointments?";

    return response;
  }

  private buildDefaultPrecisionResponse(intent: Intent, context: ConversationContext): string {
    return "I'm here to help you find exactly what you need for success. What's driving your search today - a specific occasion, professional enhancement, or a complete style upgrade?";
  }

  private identifyPsychologicalTriggers(intent: Intent, context: ConversationContext): string[] {
    const triggers: string[] = [];
    
    // Check message content for trigger patterns
    const messageContent = context.conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.toLowerCase())
      .join(' ');

    for (const [trigger, config] of Object.entries(this.PSYCHOLOGICAL_TRIGGERS)) {
      const hasPattern = config.patterns.some(pattern => 
        messageContent.includes(pattern.toLowerCase())
      );
      
      if (hasPattern) {
        triggers.push(trigger);
      }
    }

    // Check context for triggers
    if (context.sessionContext?.urgency === 'high') triggers.push('urgency');
    if (context.customerPreferences?.role === 'executive') triggers.push('authority');
    if (context.pageContext?.currentPage?.includes('bestseller')) triggers.push('social_proof');

    return triggers;
  }

  private generateOccasionRecommendations(occasion: string): string {
    const recommendations = {
      wedding: "• Navy or charcoal formal suit with silk tie\n• Crisp white dress shirt with French cuffs\n• Leather dress shoes with matching belt\n• Pocket square for elegant finishing touch",
      business: "• Versatile navy or charcoal business suit\n• Selection of quality dress shirts\n• Conservative silk ties and leather accessories\n• Professional shoes that work across occasions",
      cocktail: "• Sophisticated blazer with dress trousers\n• Premium dress shirt with subtle pattern\n• Silk pocket square for personality\n• Leather loafers or dress shoes",
      interview: "• Conservative navy suit for authority\n• Classic white or light blue dress shirt\n• Understated silk tie in complementary color\n• Polished leather shoes and belt"
    };

    return (recommendations as any)[occasion] || "• Versatile pieces that work across multiple occasions\n• Quality basics that form a strong foundation\n• Statement pieces that reflect your personality\n• Accessories that elevate the overall look";
  }

  private buildValueProtectionMessage(context: ConversationContext): string {
    return "• Payment plans available for immediate access\n" +
           "• Price protection - if you find identical quality for less, we'll match it\n" +
           "• Trade-in program for future upgrades\n" +
           "• Lifetime alteration service maintains perfect fit as you evolve";
  }

  private calculateValueStack(context: ConversationContext): string {
    return "• Garments: Premium quality construction (20-year lifespan)\n" +
           "• Alterations: Professional fitting service ($200+ value)\n" +
           "• Consultation: Personal styling expertise ($150+ value)\n" +
           "• Ongoing Support: Lifetime care guidance ($100+ value)\n" +
           "• Guarantees: Risk-free satisfaction protection\n" +
           "• **Total Added Value: $450+ beyond the garments themselves**";
  }

  async getHealthCheck(): Promise<{ status: string; stages: number; triggers: number; timestamp: string }> {
    return {
      status: 'healthy',
      stages: Object.keys(this.framework).length,
      triggers: Object.keys(this.PSYCHOLOGICAL_TRIGGERS).length,
      timestamp: new Date().toISOString()
    };
  }
}

export const precisionFrameworkService = new PrecisionFrameworkService();