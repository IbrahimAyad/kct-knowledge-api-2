import { logger } from '../utils/logger';
import {
  ConversationContext,
  Intent,
  ChatResponse,
  AtelierAIConfig
} from '../types/chat';

export class AtelierAIService {
  private initialized = false;
  private config: AtelierAIConfig = {
    personality: {
      brand: 'Sterling Crown',
      philosophy: 'Luxury is a mindset, not a price tag',
      tone: 'professional',
      knowledgeLevel: 'expert'
    },
    responsePatterns: {
      greeting: [
        "Welcome to Sterling Crown! I'm here to help you discover the perfect menswear that reflects your unique style and sophistication.",
        "Good to see you! As your personal style consultant, I'm excited to help you elevate your wardrobe with pieces that truly represent who you are.",
        "Hello! I'm your Sterling Crown style advisor, ready to help you find exceptional menswear that embodies luxury as a mindset, not just a price point."
      ],
      discovery: [
        "Tell me about the occasion or style you're looking to achieve - I'd love to understand your vision.",
        "What's inspiring your style journey today? Whether it's a special event or updating your everyday look, I'm here to guide you.",
        "Let's explore what makes you feel most confident and sophisticated. What's the story you want your style to tell?"
      ],
      recommendation: [
        "Based on what you've shared, I believe these pieces will perfectly capture your style and the occasion.",
        "Here's what I recommend to bring your vision to life - each piece is carefully selected for your specific needs.",
        "These selections align beautifully with your style preferences and will ensure you look and feel exceptional."
      ],
      objectionHandling: [
        "I understand your concern. Let me share some additional insight that might help clarify the value.",
        "That's a thoughtful consideration. Here's another perspective that many of our discerning clients have found helpful.",
        "I appreciate you bringing that up. Allow me to address that and ensure you have all the information needed."
      ]
    }
  };

  // Style knowledge base
  private readonly STYLE_KNOWLEDGE = {
    occasions: {
      wedding: {
        formality_level: 9,
        color_preferences: ['navy', 'charcoal', 'black'],
        style_notes: 'Timeless elegance with attention to detail',
        key_pieces: ['formal suit', 'dress shirt', 'silk tie', 'leather shoes']
      },
      business: {
        formality_level: 7,
        color_preferences: ['navy', 'charcoal', 'gray'],
        style_notes: 'Professional confidence with modern sophistication',
        key_pieces: ['business suit', 'dress shirt', 'conservative tie', 'oxford shoes']
      },
      cocktail: {
        formality_level: 6,
        color_preferences: ['navy', 'burgundy', 'deep green'],
        style_notes: 'Refined style with personality',
        key_pieces: ['blazer', 'dress shirt', 'pocket square', 'loafers']
      },
      casual: {
        formality_level: 3,
        color_preferences: ['khaki', 'olive', 'cream'],
        style_notes: 'Relaxed sophistication for everyday confidence',
        key_pieces: ['chinos', 'polo', 'casual blazer', 'sneakers']
      }
    },
    body_types: {
      tall: 'Emphasize proportions with horizontal elements and structured tailoring',
      short: 'Create vertical lines and avoid overwhelming proportions',
      athletic: 'Highlight your physique with tailored fits and clean lines',
      slender: 'Add visual weight with layers and textured fabrics',
      fuller: 'Create a streamlined silhouette with strategic tailoring'
    },
    color_psychology: {
      navy: 'Projects trust, reliability, and timeless sophistication',
      charcoal: 'Conveys authority, elegance, and versatility',
      black: 'Represents formality, power, and modern style',
      burgundy: 'Shows confidence, richness, and refined taste',
      cream: 'Suggests approachability, warmth, and classic style'
    }
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.initialized = true;
      logger.info('✅ AtelierAIService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize AtelierAIService:', error);
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
      const response = this.buildResponse(intent, context, stage);
      
      logger.info(`✅ Generated Atelier AI response for ${intent.category}`, {
        sessionId: context.sessionId,
        stage,
        responseLength: response.message.length,
        confidence: response.confidence
      });

      return response;
    } catch (error) {
      logger.error('❌ Failed to generate Atelier AI response:', error);
      
      // Fallback response
      return {
        message: "I'm here to help you with your style needs. Could you tell me more about what you're looking for?",
        confidence: 0.3,
        layer: 1,
        framework: 'atelier_ai',
        metadata: { error: 'fallback_response' }
      };
    }
  }

  private buildResponse(
    intent: Intent,
    context: ConversationContext,
    stage?: string
  ): ChatResponse {
    let message = '';
    let confidence = intent.confidence;
    let suggestedActions: string[] = [];
    let nextStage: string | undefined;

    // Determine response based on current stage
    switch (stage) {
      case 'greeting_discovery':
        message = this.buildGreetingResponse(intent, context);
        nextStage = 'needs_assessment';
        break;
        
      case 'needs_assessment':
        message = this.buildNeedsAssessmentResponse(intent, context);
        nextStage = 'recommendation_generation';
        break;
        
      case 'recommendation_generation':
        message = this.buildRecommendationResponse(intent, context);
        suggestedActions = ['View Products', 'Request Alternatives', 'Ask Questions'];
        nextStage = 'style_refinement';
        break;
        
      case 'style_refinement':
        message = this.buildRefinementResponse(intent, context);
        nextStage = 'final_guidance';
        break;
        
      case 'final_guidance':
        message = this.buildFinalGuidanceResponse(intent, context);
        break;
        
      default:
        message = this.buildDefaultResponse(intent, context);
        nextStage = 'greeting_discovery';
    }

    // Enhance message based on context
    message = this.enhanceWithPersonality(message, context);

    return {
      message,
      confidence,
      layer: this.determineResponseLayer(intent, context),
      framework: 'atelier_ai',
      stage,
      nextStage,
      suggestedActions,
      metadata: {
        philosophy: this.config.personality.philosophy,
        intent: intent.category,
        stage: stage || 'default'
      }
    };
  }

  private buildGreetingResponse(intent: Intent, context: ConversationContext): string {
    const baseGreeting = this.getRandomPattern('greeting');
    
    // Personalize based on context
    if (context.customerId && context.customerPreferences?.name) {
      return `${baseGreeting.replace('Welcome', `Welcome back, ${context.customerPreferences.name}`)}`;
    }
    
    if (context.pageContext?.currentPage) {
      return `${baseGreeting} I see you're interested in ${context.pageContext.currentPage}. How can I assist you today?`;
    }

    return baseGreeting;
  }

  private buildNeedsAssessmentResponse(intent: Intent, context: ConversationContext): string {
    const baseDiscovery = this.getRandomPattern('discovery');
    
    // Tailor questions based on intent
    if (intent.category === 'occasion_guidance') {
      return "That's exciting! What's the special occasion? Knowing the details will help me recommend the perfect pieces that match the formality and your personal style.";
    }
    
    if (intent.category === 'style_advice') {
      return "I'd love to help you develop your signature style. What aspects of your current wardrobe work well for you, and what would you like to enhance or change?";
    }

    return baseDiscovery;
  }

  private buildRecommendationResponse(intent: Intent, context: ConversationContext): string {
    let recommendations = this.generateStyleRecommendations(intent, context);
    const baseRecommendation = this.getRandomPattern('recommendation');
    
    return `${baseRecommendation}\n\n${recommendations}`;
  }

  private buildRefinementResponse(intent: Intent, context: ConversationContext): string {
    if (intent.category === 'comparison_request') {
      return "Let me explain the distinctions between these options and help you understand which aligns best with your needs, style preferences, and the specific occasion.";
    }
    
    if (intent.entities?.concerns) {
      return "I understand your concerns. Let me address those specifically and ensure we find exactly what you're looking for. Your satisfaction and confidence are my top priorities.";
    }

    return "How do these recommendations feel to you? I'm here to refine anything to ensure it perfectly matches your vision and comfort level.";
  }

  private buildFinalGuidanceResponse(intent: Intent, context: ConversationContext): string {
    return `Perfect! You've made excellent choices that reflect sophisticated taste and will serve you beautifully. Remember, true style confidence comes from pieces that make you feel authentically yourself. ${this.config.personality.philosophy}`;
  }

  private buildDefaultResponse(intent: Intent, context: ConversationContext): string {
    // Handle specific intents with expert knowledge
    if (intent.category === 'color_matching') {
      return this.buildColorAdvice(intent, context);
    }
    
    if (intent.category === 'sizing_help') {
      return this.buildSizingAdvice(intent, context);
    }
    
    if (intent.category === 'care_instructions') {
      return this.buildCareAdvice(intent, context);
    }

    return "I'm here to help you with any menswear questions or style guidance you need. What would you like to explore today?";
  }

  private generateStyleRecommendations(intent: Intent, context: ConversationContext): string {
    // Extract occasion from context or intent
    const occasion = intent.entities?.occasion || context.sessionContext?.occasion || 'business';
    const occasionData = (this.STYLE_KNOWLEDGE.occasions as any)[occasion] || this.STYLE_KNOWLEDGE.occasions.business;

    let recommendation = `For ${occasion} occasions, I recommend focusing on ${occasionData.style_notes}.\n\n`;
    recommendation += `Key pieces to consider:\n`;

    occasionData.key_pieces.forEach((piece: any, index: any) => {
      recommendation += `${index + 1}. ${this.capitalizeLetter(piece)}\n`;
    });

    recommendation += `\nColor palette: ${occasionData.color_preferences.join(', ')} work exceptionally well for this level of formality.`;

    return recommendation;
  }

  private buildColorAdvice(intent: Intent, context: ConversationContext): string {
    const colors = Object.keys(this.STYLE_KNOWLEDGE.color_psychology);
    const colorAdvice = colors.map(color =>
      `${this.capitalizeLetter(color)}: ${(this.STYLE_KNOWLEDGE.color_psychology as any)[color]}`
    ).join('\n\n');
    
    return `Here's my expert guidance on color selection:\n\n${colorAdvice}\n\nWhich of these resonates with the image you want to project?`;
  }

  private buildSizingAdvice(intent: Intent, context: ConversationContext): string {
    return `Perfect fit is essential for sophisticated style. Here's my professional guidance:\n\n` +
           `• Suit jacket: Should sit smoothly across your shoulders with about 1/4" of shirt cuff visible\n` +
           `• Trousers: Should sit at your natural waist with a slight break at the shoe\n` +
           `• Shirts: Comfortable around the neck and chest without pulling or excess fabric\n\n` +
           `I recommend scheduling a fitting consultation to ensure everything fits perfectly and reflects your best self.`;
  }

  private buildCareAdvice(intent: Intent, context: ConversationContext): string {
    return `Proper care preserves both the quality and your investment. Here's my expert advice:\n\n` +
           `• Suits: Professional dry cleaning every 6-10 wears, proper hanging between uses\n` +
           `• Dress shirts: Quality laundering with proper pressing maintains crisp presentation\n` +
           `• Leather goods: Regular conditioning and proper storage extend longevity\n\n` +
           `Quality pieces, when cared for properly, become more distinguished with time.`;
  }

  private enhanceWithPersonality(message: string, context: ConversationContext): string {
    // Add Sterling Crown philosophy elements
    const philosophicalTouches = [
      'Remember, luxury is about quality and confidence, not just price.',
      'Your style should reflect your unique sophistication.',
      'True elegance never goes out of style.',
      'Invest in pieces that make you feel authentically yourself.'
    ];

    // Occasionally add philosophical insight
    if (Math.random() > 0.7 && message.length < 200) {
      const touch = philosophicalTouches[Math.floor(Math.random() * philosophicalTouches.length)];
      message += `\n\n${touch}`;
    }

    return message;
  }

  private determineResponseLayer(intent: Intent, context: ConversationContext): 1 | 2 | 3 {
    // Layer 1: Quick, concise responses
    if (intent.category === 'simple_question' || intent.confidence < 0.6) {
      return 1;
    }
    
    // Layer 3: Deep, detailed responses
    if (intent.category === 'comprehensive_consultation' || context.conversationHistory.length > 5) {
      return 3;
    }
    
    // Layer 2: Standard detailed responses
    return 2;
  }

  private getRandomPattern(type: keyof AtelierAIConfig['responsePatterns']): string {
    const patterns = this.config.responsePatterns[type];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private capitalizeLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async getHealthCheck(): Promise<{ status: string; knowledgeAreas: number; timestamp: string }> {
    return {
      status: 'healthy',
      knowledgeAreas: Object.keys(this.STYLE_KNOWLEDGE).length,
      timestamp: new Date().toISOString()
    };
  }
}

export const atelierAIService = new AtelierAIService();