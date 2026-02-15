import { logger } from '../utils/logger';
import {
  ConversationContext,
  Intent,
  ChatResponse,
  RESTOREFramework,
  RESTOREStage
} from '../types/chat';

export class RestoreFrameworkService {
  private initialized = false;
  private framework: RESTOREFramework = {
    empathetic_discovery: {
      name: 'Empathetic Discovery',
      duration: { min: 30, max: 60 },
      satisfactionTarget: 60,
      patterns: [
        "I truly understand how frustrating this must be for you.",
        "Thank you for bringing this to my attention - I'm here to make this right.",
        "I can see why this would be disappointing, and I want to help resolve this completely.",
        "Your experience matters deeply to us, and I'm committed to finding a solution."
      ],
      questions: [
        "Can you help me understand exactly what happened?",
        "When did you first notice this issue?",
        "How has this affected your experience with us?",
        "What outcome would make this right for you?"
      ]
    },
    diagnostic_excellence: {
      name: 'Diagnostic Excellence',
      duration: { min: 60, max: 120 },
      satisfactionTarget: 75,
      patterns: [
        "Let me investigate this thoroughly to identify the root cause.",
        "I'm going to analyze every aspect of this situation to ensure we address it completely.",
        "Based on what you've shared, I'm seeing several areas we need to examine closely.",
        "I want to understand not just what went wrong, but why it happened."
      ],
      questions: [
        "Can you walk me through the exact steps that led to this issue?",
        "Have you experienced anything similar before?",
        "What were your expectations when this situation began?",
        "Are there any details that might help me understand the full picture?"
      ]
    },
    comprehensive_resolution: {
      name: 'Comprehensive Resolution',
      duration: { min: 120, max: 180 },
      satisfactionTarget: 85,
      patterns: [
        "Here's exactly how I'm going to resolve this for you.",
        "I've identified a comprehensive solution that addresses both the immediate issue and prevents future occurrences.",
        "Let me present you with options that will make this situation right.",
        "I'm implementing a solution that goes beyond just fixing the problem."
      ],
      solutions: [
        "immediate_replacement",
        "full_refund_plus_credit",
        "priority_service",
        "custom_solution",
        "escalated_resolution"
      ]
    },
    proactive_value_restoration: {
      name: 'Proactive Value Restoration',
      duration: { min: 60, max: 90 },
      satisfactionTarget: 90,
      patterns: [
        "I want to restore not just the product, but the value of your entire experience.",
        "Let me show you how we're going to exceed your original expectations.",
        "Here's what we're adding to ensure this experience becomes a positive one.",
        "I'm implementing additional benefits to demonstrate how much we value you as a customer."
      ]
    },
    relationship_acceleration: {
      name: 'Relationship Acceleration',
      duration: { min: 45, max: 75 },
      satisfactionTarget: 95,
      patterns: [
        "I want to ensure you feel confident in our commitment to your satisfaction.",
        "Let me show you the additional ways we'll be supporting you going forward.",
        "Your experience today is going to strengthen our relationship moving forward.",
        "I'm setting up special considerations for your future experiences with us."
      ]
    },
    loyalty_acceleration: {
      name: 'Loyalty Acceleration',
      duration: { min: 30, max: 45 },
      satisfactionTarget: 98,
      patterns: [
        "You've shown incredible patience, and I want to recognize that with something special.",
        "Customers like you who provide valuable feedback deserve VIP treatment.",
        "I'm upgrading your experience permanently because you've helped us improve.",
        "Your loyalty means everything to us, and I want to ensure you feel that value."
      ]
    }
  };

  // Problem categorization for targeted responses
  private readonly PROBLEM_CATEGORIES = {
    product_quality: {
      severity: 'high',
      resolution_priority: 1,
      common_solutions: ['replacement', 'full_refund', 'quality_upgrade'],
      recovery_actions: ['quality_audit', 'supplier_review', 'process_improvement']
    },
    shipping_delivery: {
      severity: 'medium',
      resolution_priority: 2,
      common_solutions: ['expedited_replacement', 'shipping_refund', 'credit_compensation'],
      recovery_actions: ['carrier_escalation', 'tracking_improvement', 'communication_enhancement']
    },
    sizing_fit: {
      severity: 'medium',
      resolution_priority: 3,
      common_solutions: ['size_exchange', 'fitting_consultation', 'alteration_credit'],
      recovery_actions: ['size_guide_review', 'fit_consultation_offer', 'virtual_fitting']
    },
    service_experience: {
      severity: 'high',
      resolution_priority: 1,
      common_solutions: ['service_recovery', 'executive_attention', 'relationship_manager'],
      recovery_actions: ['staff_training', 'process_review', 'service_enhancement']
    },
    billing_payment: {
      severity: 'high',
      resolution_priority: 1,
      common_solutions: ['immediate_correction', 'fee_waiver', 'account_credit'],
      recovery_actions: ['system_audit', 'billing_process_review', 'payment_protection']
    }
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.initialized = true;
      logger.info('✅ RestoreFrameworkService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize RestoreFrameworkService:', error);
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
      const currentStage = stage || 'empathetic_discovery';
      const response = this.buildStageResponse(intent, context, currentStage);
      
      logger.info(`✅ Generated RESTORE™ response for stage ${currentStage}`, {
        sessionId: context.sessionId,
        stage: currentStage,
        problemCategory: this.identifyProblemCategory(intent),
        satisfactionTarget: (this.framework as any)[currentStage]?.satisfactionTarget
      });

      return response;
    } catch (error) {
      logger.error('❌ Failed to generate RESTORE™ response:', error);
      
      // Fallback empathetic response
      return {
        message: "I sincerely apologize for the trouble you're experiencing. Let me help make this right for you immediately.",
        confidence: 0.7,
        layer: 2,
        framework: 'restore',
        stage: 'empathetic_discovery',
        metadata: { error: 'fallback_response' }
      };
    }
  }

  private buildStageResponse(
    intent: Intent,
    context: ConversationContext,
    stage: string
  ): ChatResponse {
    const stageConfig = (this.framework as any)[stage] as RESTOREStage;
    const problemCategory = this.identifyProblemCategory(intent);
    
    let message = '';
    let confidence = intent.confidence;
    let nextStage: string | undefined;
    let suggestedActions: string[] = [];

    switch (stage) {
      case 'empathetic_discovery':
        message = this.buildEmpatheticDiscoveryResponse(intent, context, problemCategory);
        nextStage = 'diagnostic_excellence';
        suggestedActions = ['Share Details', 'Explain Impact', 'Request Immediate Help'];
        break;
        
      case 'diagnostic_excellence':
        message = this.buildDiagnosticResponse(intent, context, problemCategory);
        nextStage = 'comprehensive_resolution';
        suggestedActions = ['Provide Timeline', 'Request Updates', 'Escalate Issue'];
        break;
        
      case 'comprehensive_resolution':
        message = this.buildResolutionResponse(intent, context, problemCategory);
        nextStage = 'proactive_value_restoration';
        suggestedActions = ['Accept Solution', 'Request Modification', 'Ask Questions'];
        break;
        
      case 'proactive_value_restoration':
        message = this.buildValueRestorationResponse(intent, context, problemCategory);
        nextStage = 'relationship_acceleration';
        suggestedActions = ['Accept Benefits', 'Share Feedback', 'Continue Discussion'];
        break;
        
      case 'relationship_acceleration':
        message = this.buildRelationshipResponse(intent, context, problemCategory);
        nextStage = 'loyalty_acceleration';
        suggestedActions = ['Confirm Satisfaction', 'Provide Testimonial', 'Request Follow-up'];
        break;
        
      case 'loyalty_acceleration':
        message = this.buildLoyaltyResponse(intent, context, problemCategory);
        suggestedActions = ['Express Gratitude', 'Share Experience', 'Continue Shopping'];
        break;
        
      default:
        message = this.buildDefaultRestoreResponse(intent, context);
        nextStage = 'empathetic_discovery';
    }

    return {
      message,
      confidence,
      layer: 2, // RESTORE responses are typically detailed
      framework: 'restore',
      stage,
      nextStage,
      suggestedActions,
      metadata: {
        stageConfig: stageConfig.name,
        satisfactionTarget: stageConfig.satisfactionTarget,
        problemCategory,
        estimatedDuration: `${stageConfig.duration.min}-${stageConfig.duration.max} seconds`
      }
    };
  }

  private buildEmpatheticDiscoveryResponse(
    intent: Intent,
    context: ConversationContext,
    problemCategory: string
  ): string {
    const basePattern = this.getRandomStagePattern('empathetic_discovery');
    const question = this.getRandomStageQuestion('empathetic_discovery');
    
    let response = basePattern;
    
    // Add problem-specific empathy
    if (problemCategory === 'product_quality') {
      response += " When you invest in quality menswear, you rightfully expect excellence, and I'm sorry we fell short of that standard.";
    } else if (problemCategory === 'shipping_delivery') {
      response += " I know how important timing can be, especially for special occasions or professional needs.";
    } else if (problemCategory === 'service_experience') {
      response += " Your experience should always reflect the same quality as our products, and I'm sorry that wasn't the case.";
    }
    
    response += `\n\n${question}`;
    
    // Add immediate action if high severity
    const categoryInfo = (this.PROBLEM_CATEGORIES as any)[problemCategory];
    if (categoryInfo?.severity === 'high') {
      response += " I'm already beginning to investigate this on my end while we talk.";
    }
    
    return response;
  }

  private buildDiagnosticResponse(
    intent: Intent,
    context: ConversationContext,
    problemCategory: string
  ): string {
    const basePattern = this.getRandomStagePattern('diagnostic_excellence');
    const question = this.getRandomStageQuestion('diagnostic_excellence');
    
    let response = `${basePattern}\n\n`;
    
    // Add diagnostic specifics based on problem category
    const categoryInfo = (this.PROBLEM_CATEGORIES as any)[problemCategory];
    response += this.buildDiagnosticAnalysis(problemCategory, categoryInfo);
    
    response += `\n\n${question}`;
    
    return response;
  }

  private buildResolutionResponse(
    intent: Intent,
    context: ConversationContext,
    problemCategory: string
  ): string {
    const basePattern = this.getRandomStagePattern('comprehensive_resolution');
    const categoryInfo = (this.PROBLEM_CATEGORIES as any)[problemCategory];
    
    let response = `${basePattern}\n\n`;
    
    // Present specific solutions
    response += "Here are the solutions I'm implementing:\n\n";
    
    categoryInfo.common_solutions.forEach((solution: any, index: number) => {
      response += `${index + 1}. ${this.formatSolution(solution)}\n`;
    });

    response += `\nAdditionally, I'm taking these preventive actions:\n`;
    categoryInfo.recovery_actions.forEach((action: any, index: number) => {
      response += `• ${this.formatRecoveryAction(action)}\n`;
    });
    
    response += "\nThis comprehensive approach ensures both immediate resolution and prevents future occurrences.";
    
    return response;
  }

  private buildValueRestorationResponse(
    intent: Intent,
    context: ConversationContext,
    problemCategory: string
  ): string {
    const basePattern = this.getRandomStagePattern('proactive_value_restoration');
    
    let response = `${basePattern}\n\n`;
    
    // Add value restoration specifics
    response += "Here's how I'm enhancing your experience:\n\n";
    response += "• Priority customer status for future orders\n";
    response += "• Complimentary styling consultation with our experts\n";
    response += "• Extended return/exchange window on all purchases\n";
    response += "• Direct access to our customer success team\n\n";
    
    if (problemCategory === 'product_quality') {
      response += "• Quality guarantee on all future purchases\n";
      response += "• Exclusive access to our premium collection previews\n";
    }
    
    response += "These aren't just apologies - they're investments in ensuring your experience exceeds expectations.";
    
    return response;
  }

  private buildRelationshipResponse(
    intent: Intent,
    context: ConversationContext,
    problemCategory: string
  ): string {
    const basePattern = this.getRandomStagePattern('relationship_acceleration');
    
    let response = `${basePattern}\n\n`;
    response += "Moving forward, you'll have:\n\n";
    response += "• A dedicated relationship manager for personalized service\n";
    response += "• Early access to sales and exclusive collections\n";
    response += "• Complimentary alteration services on future purchases\n";
    response += "• Annual styling review to keep your wardrobe current\n\n";
    response += "Your feedback has already improved our service for other customers, and that contribution deserves recognition.";
    
    return response;
  }

  private buildLoyaltyResponse(
    intent: Intent,
    context: ConversationContext,
    problemCategory: string
  ): string {
    const basePattern = this.getRandomStagePattern('loyalty_acceleration');
    
    let response = `${basePattern}\n\n`;
    response += "As a token of appreciation for your patience and valuable feedback:\n\n";
    response += "• VIP membership with lifetime benefits activated\n";
    response += "• Exclusive invitation to private shopping events\n";
    response += "• Special pricing tier on all future purchases\n";
    response += "• Complimentary annual wardrobe consultation\n\n";
    response += "Most importantly, you now have my personal commitment that your experience will always reflect the luxury standards you deserve. ";
    response += "Thank you for giving us the opportunity to turn this situation into a demonstration of our true commitment to customer excellence.";
    
    return response;
  }

  private buildDefaultRestoreResponse(intent: Intent, context: ConversationContext): string {
    return "I'm here to help resolve any concerns you have and ensure your experience with us is exceptional. What can I make right for you today?";
  }

  private identifyProblemCategory(intent: Intent): string {
    const categories = Object.keys(this.PROBLEM_CATEGORIES);
    
    // Check intent category first
    for (const category of categories) {
      if (intent.category.includes(category.replace('_', ''))) {
        return category;
      }
    }
    
    // Check intent entities for problem indicators
    if (intent.entities?.quality_concern) return 'product_quality';
    if (intent.entities?.delivery_issue) return 'shipping_delivery';
    if (intent.entities?.size_problem) return 'sizing_fit';
    if (intent.entities?.service_complaint) return 'service_experience';
    if (intent.entities?.billing_error) return 'billing_payment';
    
    // Default to service experience for unspecified issues
    return 'service_experience';
  }

  private buildDiagnosticAnalysis(problemCategory: string, categoryInfo: any): string {
    switch (problemCategory) {
      case 'product_quality':
        return "I'm examining the manufacturing batch, quality control records, and similar reports to identify the exact cause.";
      case 'shipping_delivery':
        return "I'm tracking your shipment history, carrier performance, and any weather or operational delays that may have occurred.";
      case 'sizing_fit':
        return "I'm reviewing your size profile, the specific measurements of this item, and our fit guide accuracy.";
      case 'service_experience':
        return "I'm analyzing the service touchpoints, communication records, and process flows that led to this experience.";
      case 'billing_payment':
        return "I'm reviewing your account history, payment processing records, and any system errors that may have occurred.";
      default:
        return "I'm conducting a thorough investigation to understand all factors that contributed to this issue.";
    }
  }

  private formatSolution(solution: string): string {
    const solutionMap: { [key: string]: string } = {
      replacement: "Immediate replacement with expedited shipping at no cost",
      full_refund: "Complete refund plus service credit for the inconvenience",
      quality_upgrade: "Upgrade to premium quality item at no additional cost",
      expedited_replacement: "Rush delivery replacement within 24-48 hours",
      shipping_refund: "Full shipping cost refund plus future shipping credits",
      credit_compensation: "Account credit plus bonus for future purchases",
      size_exchange: "Free size exchange with complimentary alterations",
      fitting_consultation: "Personal fitting consultation with style expert",
      alteration_credit: "Complimentary professional alterations",
      service_recovery: "Executive-level service recovery program enrollment",
      executive_attention: "Personal attention from senior management",
      relationship_manager: "Dedicated customer relationship manager assignment",
      immediate_correction: "Instant account correction with verification",
      fee_waiver: "All associated fees waived permanently",
      account_credit: "Account credit with interest compensation"
    };
    
    return solutionMap[solution] || solution.replace(/_/g, ' ');
  }

  private formatRecoveryAction(action: string): string {
    const actionMap: { [key: string]: string } = {
      quality_audit: "Complete quality audit of production processes",
      supplier_review: "Comprehensive supplier performance review",
      process_improvement: "Enhanced quality control implementation",
      carrier_escalation: "Shipping carrier performance escalation",
      tracking_improvement: "Enhanced shipment tracking and communication",
      communication_enhancement: "Improved customer communication protocols",
      size_guide_review: "Size guide accuracy review and updates",
      fit_consultation_offer: "Complimentary fit consultations for all customers",
      virtual_fitting: "Virtual fitting technology implementation",
      staff_training: "Enhanced customer service training program",
      process_review: "Complete service process optimization",
      service_enhancement: "Service quality enhancement initiatives",
      system_audit: "Billing system accuracy audit",
      billing_process_review: "Payment processing review and improvements",
      payment_protection: "Enhanced payment security measures"
    };
    
    return actionMap[action] || action.replace(/_/g, ' ');
  }

  private getRandomStagePattern(stage: string): string {
    const stageConfig = (this.framework as any)[stage] as RESTOREStage;
    const patterns = stageConfig.patterns;
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private getRandomStageQuestion(stage: string): string {
    const stageConfig = (this.framework as any)[stage] as RESTOREStage;
    const questions = stageConfig.questions || [];
    if (questions.length === 0) return '';
    return questions[Math.floor(Math.random() * questions.length)];
  }

  async getHealthCheck(): Promise<{ status: string; stages: number; problemCategories: number; timestamp: string }> {
    return {
      status: 'healthy',
      stages: Object.keys(this.framework).length,
      problemCategories: Object.keys(this.PROBLEM_CATEGORIES).length,
      timestamp: new Date().toISOString()
    };
  }
}

export const restoreFrameworkService = new RestoreFrameworkService();