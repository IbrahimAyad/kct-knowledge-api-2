/**
 * Chat Service for Voice Integration
 * Handles message processing and generates AI responses
 */

import { logger } from '../utils/logger';
import { knowledgeBankService } from './knowledge-bank-service';
import { colorService } from './color-service';
import { trendingAnalysisService } from './trending-analysis-service';

export interface ChatMessage {
  sessionId: string;
  message: string;
  framework?: 'atelier_ai' | 'restore' | 'precision';
  context?: {
    inputMethod?: 'voice' | 'text';
    detectedIntent?: string;
    confidence?: number;
  };
}

export interface ChatResponse {
  sessionId: string;
  response: string;
  metadata: {
    intent: string;
    sentiment: string;
    framework: string;
    products?: any[];
    navigation?: {
      action: string;
      destination?: string;
    };
    entities?: Record<string, any>;
  };
}

// Simple in-memory session store
const sessions: Map<string, {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: Record<string, any>;
}> = new Map();

class ChatService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    logger.info('💬 Initializing Chat Service...');
    this.initialized = true;
    logger.info('✅ Chat Service initialized');
  }

  /**
   * Process a chat message and generate response
   */
  async processMessage(request: ChatMessage): Promise<ChatResponse> {
    const { sessionId, message, context } = request;

    // Get or create session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { history: [], context: {} });
    }
    const session = sessions.get(sessionId)!;

    // Add user message to history
    session.history.push({ role: 'user', content: message });

    // Parse intent from message
    const intent = this.parseIntent(message);
    const entities = this.extractEntities(message);

    // Generate response based on intent
    let response: string;
    let products: any[] = [];
    let navigation: { action: string; destination?: string } = { action: 'none' };

    try {
      switch (intent) {
        case 'browse_products':
          const searchResult = await this.handleProductSearch(message, entities);
          response = searchResult.response;
          products = searchResult.products;
          navigation = searchResult.navigation;
          break;

        case 'styling_advice':
          response = await this.handleStylingAdvice(message, entities);
          break;

        case 'sizing_help':
          response = "I can help you find the perfect fit! For accurate sizing, I recommend visiting our size guide. Would you like me to take you there? You can also provide your measurements and I'll suggest the best size for you.";
          navigation = { action: 'navigate', destination: '/pages/size-guide' };
          break;

        case 'price_inquiry':
          response = await this.handlePriceInquiry(message, entities);
          break;

        case 'trending':
          const trendingResult = await this.handleTrendingQuery();
          response = trendingResult.response;
          products = trendingResult.products;
          navigation = { action: 'navigate', destination: '/collections/trending' };
          break;

        case 'greeting':
          response = "Hello! Welcome to KCT Menswear. I'm your personal style assistant. I can help you find the perfect suit, tuxedo, or accessories for any occasion. What brings you in today?";
          break;

        default:
          response = await this.handleGeneralInquiry(message);
      }
    } catch (error) {
      logger.error('Error processing chat message:', error);
      response = "I'd be happy to help you find the perfect look. Could you tell me more about what occasion you're shopping for?";
    }

    // Add assistant response to history
    session.history.push({ role: 'assistant', content: response });

    // Keep history manageable
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    return {
      sessionId,
      response,
      metadata: {
        intent,
        sentiment: this.detectSentiment(message),
        framework: request.framework || 'atelier_ai',
        products,
        navigation,
        entities
      }
    };
  }

  private parseIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Greeting patterns
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(lowerMessage)) {
      return 'greeting';
    }

    // Trending patterns
    if (lowerMessage.includes('trending') || lowerMessage.includes('popular') || lowerMessage.includes('what\'s hot')) {
      return 'trending';
    }

    // Sizing patterns
    if (lowerMessage.includes('size') || lowerMessage.includes('fit') || lowerMessage.includes('measure')) {
      return 'sizing_help';
    }

    // Price patterns
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much') || lowerMessage.includes('$')) {
      return 'price_inquiry';
    }

    // Styling patterns
    if (lowerMessage.includes('match') || lowerMessage.includes('wear with') || lowerMessage.includes('goes with') ||
        lowerMessage.includes('color') || lowerMessage.includes('style')) {
      return 'styling_advice';
    }

    // Product browsing patterns
    if (lowerMessage.includes('show') || lowerMessage.includes('find') || lowerMessage.includes('looking for') ||
        lowerMessage.includes('need') || lowerMessage.includes('want') || lowerMessage.includes('suit') ||
        lowerMessage.includes('tuxedo') || lowerMessage.includes('blazer') || lowerMessage.includes('tie') ||
        lowerMessage.includes('prom') || lowerMessage.includes('wedding')) {
      return 'browse_products';
    }

    return 'general_inquiry';
  }

  private extractEntities(message: string): Record<string, any> {
    const lowerMessage = message.toLowerCase();
    const entities: Record<string, any> = {};

    // Colors
    const colors = ['burgundy', 'wine', 'navy', 'navy blue', 'black', 'charcoal', 'grey', 'gray',
      'sage', 'sage green', 'emerald', 'green', 'brown', 'chocolate', 'blue', 'light blue',
      'royal blue', 'white', 'ivory', 'pink', 'blush', 'gold', 'lavender', 'red'];

    for (const color of colors) {
      if (lowerMessage.includes(color)) {
        entities.color = color;
        break;
      }
    }

    // Product types
    const productTypes = [
      { keywords: ['suit', 'suits'], type: 'suits' },
      { keywords: ['tuxedo', 'tuxedos', 'tux'], type: 'tuxedos' },
      { keywords: ['blazer', 'blazers', 'jacket'], type: 'blazers' },
      { keywords: ['tie', 'ties', 'necktie'], type: 'ties' },
      { keywords: ['bowtie', 'bow tie', 'bowties'], type: 'bowties' },
      { keywords: ['vest', 'vests', 'waistcoat'], type: 'vests' },
      { keywords: ['shoe', 'shoes', 'loafer'], type: 'shoes' },
      { keywords: ['shirt', 'shirts', 'dress shirt'], type: 'shirts' }
    ];

    for (const pt of productTypes) {
      if (pt.keywords.some(k => lowerMessage.includes(k))) {
        entities.productType = pt.type;
        break;
      }
    }

    // Occasions
    const occasions = [
      { keywords: ['prom'], occasion: 'prom' },
      { keywords: ['wedding', 'bride', 'groom'], occasion: 'wedding' },
      { keywords: ['formal', 'black tie', 'gala'], occasion: 'formal' },
      { keywords: ['business', 'work', 'office', 'interview'], occasion: 'business' },
      { keywords: ['casual', 'everyday'], occasion: 'casual' }
    ];

    for (const occ of occasions) {
      if (occ.keywords.some(k => lowerMessage.includes(k))) {
        entities.occasion = occ.occasion;
        break;
      }
    }

    return entities;
  }

  private async handleProductSearch(message: string, entities: Record<string, any>): Promise<{
    response: string;
    products: any[];
    navigation: { action: string; destination?: string };
  }> {
    let basePath = '/collections/';
    let collection = 'all';
    let filters: string[] = [];

    // Determine collection
    if (entities.occasion === 'prom') {
      collection = 'prom';
    } else if (entities.occasion === 'wedding') {
      collection = 'wedding-suits';
    } else if (entities.productType) {
      collection = entities.productType;
    }

    // Add color filter
    if (entities.color) {
      filters.push(`color=${encodeURIComponent(entities.color)}`);
    }

    const destination = basePath + collection + (filters.length ? '?' + filters.join('&') : '');

    // Generate response
    let response = '';
    if (entities.color && entities.productType) {
      response = `I found some great ${entities.color} ${entities.productType} for you! Let me show you our collection.`;
    } else if (entities.color) {
      response = `Excellent choice! ${entities.color.charAt(0).toUpperCase() + entities.color.slice(1)} is very popular right now. Let me show you what we have.`;
    } else if (entities.occasion === 'prom') {
      response = `Looking for prom attire? We have an amazing selection of tuxedos and suits that will make you stand out. Let me show you our prom collection.`;
    } else if (entities.occasion === 'wedding') {
      response = `Wedding season is here! Whether you're the groom, groomsman, or guest, I'll help you find the perfect look. Here's our wedding collection.`;
    } else if (entities.productType) {
      response = `Great! Let me show you our ${entities.productType} collection. We have a wide variety of styles and colors.`;
    } else {
      response = `I'd love to help you find the perfect piece. Let me show you some of our most popular options.`;
    }

    return {
      response,
      products: [], // Would be populated from actual product search
      navigation: { action: 'navigate', destination }
    };
  }

  private async handleStylingAdvice(message: string, entities: Record<string, any>): Promise<string> {
    try {
      if (entities.color) {
        const recommendations = await colorService.getColorRecommendations({
          suit_color: entities.color,
          occasion: entities.occasion,
          season: this.getCurrentSeason()
        } as any);

        if (recommendations) {
          return `Great question! A ${entities.color} suit pairs beautifully with white or light blue shirts. For ties, consider gold, burgundy, or navy to create a sophisticated contrast. Would you like me to show you some specific options?`;
        }
      }

      return `I'd be happy to help with styling advice! What color suit or outfit are you working with? I can suggest the perfect shirt, tie, and accessories to complete your look.`;
    } catch (error) {
      return `I'd be happy to help with styling! Tell me about your suit color and the occasion, and I'll suggest the perfect combinations.`;
    }
  }

  private async handlePriceInquiry(message: string, entities: Record<string, any>): Promise<string> {
    let priceRange = '';

    if (entities.productType === 'suits') {
      priceRange = '$170 to $350';
    } else if (entities.productType === 'tuxedos') {
      priceRange = '$180 to $330';
    } else if (entities.productType === 'blazers') {
      priceRange = '$150 to $250';
    } else if (entities.productType === 'ties' || entities.productType === 'bowties') {
      priceRange = '$20 to $45';
    } else if (entities.productType === 'vests') {
      priceRange = '$40 to $70';
    } else if (entities.productType === 'shoes') {
      priceRange = '$80 to $130';
    } else {
      return `Our prices vary by item. Suits range from $170-$350, tuxedos from $180-$330, and accessories start at just $20. Would you like me to show you options in a specific price range?`;
    }

    return `Our ${entities.productType} range from ${priceRange}. We have options for every budget! Would you like me to show you some specific pieces?`;
  }

  private async handleTrendingQuery(): Promise<{ response: string; products: any[] }> {
    try {
      const trending = await trendingAnalysisService.getTrendingCombinations(5);

      return {
        response: `The hottest trends right now include burgundy suits, sage green for spring weddings, and chocolate brown which is the Pantone color of 2025. Velvet blazers are also making a big comeback for formal events. Would you like to explore any of these trends?`,
        products: trending || []
      };
    } catch (error) {
      return {
        response: `This season, burgundy and sage green are the most popular colors for weddings and formal events. Navy remains a classic choice that never goes out of style. What occasion are you shopping for?`,
        products: []
      };
    }
  }

  private async handleGeneralInquiry(message: string): Promise<string> {
    return `I'm here to help you find the perfect look! You can ask me about suits, tuxedos, blazers, ties, or accessories. I can also help with styling advice, sizing, or show you what's trending. What would you like to explore?`;
  }

  private detectSentiment(message: string): string {
    const lowerMessage = message.toLowerCase();

    const positiveWords = ['love', 'great', 'perfect', 'awesome', 'amazing', 'excellent', 'thanks', 'thank you'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'wrong', 'ugly', 'expensive'];

    const hasPositive = positiveWords.some(w => lowerMessage.includes(w));
    const hasNegative = negativeWords.some(w => lowerMessage.includes(w));

    if (hasPositive && !hasNegative) return 'positive';
    if (hasNegative && !hasPositive) return 'negative';
    return 'neutral';
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
}

export const chatService = new ChatService();
