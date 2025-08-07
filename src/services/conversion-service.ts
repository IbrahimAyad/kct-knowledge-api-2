/**
 * Conversion Optimization Service
 * Provides conversion analytics and optimization insights based on knowledge bank data
 */

import { dataLoader } from '../utils/data-loader';
import {
  ConversionRates,
  ConversionOptimizationRequest,
  ConversionOptimizationResponse,
  CustomerProfile
} from '../types/knowledge-bank';

export class ConversionService {
  private conversionData: ConversionRates | null = null;
  private trendingData: any = null;
  private seasonalData: any = null;

  /**
   * Initialize the service with data
   */
  async initialize(): Promise<void> {
    this.conversionData = await dataLoader.loadConversionRates();
    this.trendingData = await dataLoader.loadTrendingData();
    this.seasonalData = await dataLoader.loadSeasonalChampions();
  }

  /**
   * Get conversion optimization recommendations
   */
  async getConversionOptimization(request: ConversionOptimizationRequest): Promise<ConversionOptimizationResponse> {
    if (!this.conversionData) {
      await this.initialize();
    }

    // Find matching combination data
    const combinationData = this.findCombinationData(request.combination);
    
    // Calculate predicted conversion rate
    const predictedRate = this.calculatePredictedConversionRate(request);

    // Identify factors affecting conversion
    const factors = this.identifyConversionFactors(request);

    // Generate optimization suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(request, factors);

    // Identify upsell opportunities
    const upsellOpportunities = this.identifyUpsellOpportunities(request);

    return {
      predicted_conversion_rate: predictedRate,
      factors_affecting_conversion: factors,
      optimization_suggestions: optimizationSuggestions,
      upsell_opportunities: upsellOpportunities
    };
  }

  /**
   * Get top converting combinations
   */
  async getTopConvertingCombinations(limit: number = 10): Promise<any[]> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.top_converting_combinations.all_time_best.slice(0, limit);
  }

  /**
   * Get conversion data by occasion
   */
  async getConversionByOccasion(occasion: string): Promise<any> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.conversion_by_category.occasion_based[occasion] || null;
  }

  /**
   * Get conversion data by price tier
   */
  async getConversionByPriceTier(priceTier: string): Promise<any> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.conversion_by_category.price_tiers[priceTier] || null;
  }

  /**
   * Get device performance data
   */
  async getDevicePerformance(): Promise<any> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.device_performance;
  }

  /**
   * Get seasonal conversion patterns
   */
  async getSeasonalPatterns(): Promise<any> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.time_based_patterns.seasonal_trends;
  }

  /**
   * Get AI optimization insights
   */
  async getAIOptimizationInsights(): Promise<any> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.ai_optimization_insights;
  }

  /**
   * Get conversion factors (positive and negative)
   */
  async getConversionFactors(): Promise<{
    positive: any;
    negative: any;
  }> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return {
      positive: this.conversionData!.conversion_factors.positive_drivers,
      negative: this.conversionData!.conversion_factors.negative_factors
    };
  }

  /**
   * Get customer journey conversion data
   */
  async getCustomerJourneyConversions(): Promise<any> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.customer_journey_conversions;
  }

  /**
   * Get A/B testing insights
   */
  async getTestingInsights(): Promise<any> {
    if (!this.conversionData) {
      await this.initialize();
    }

    return this.conversionData!.testing_insights;
  }

  /**
   * Predict conversion rate for a specific scenario
   */
  async predictConversionRate(
    combination: string,
    customerProfile?: string,
    occasion?: string,
    device?: string,
    season?: string
  ): Promise<{
    predicted_rate: number;
    confidence: number;
    factors_considered: string[];
    benchmark_comparison: {
      above_average: boolean;
      percentage_difference: number;
    };
  }> {
    if (!this.conversionData) {
      await this.initialize();
    }

    let baseRate = 18.0; // Default conversion rate
    const factorsConsidered: string[] = [];
    let confidence = 50;

    // Check if we have specific data for this combination
    const combinationData = this.findCombinationData(combination);
    if (combinationData) {
      baseRate = parseFloat(combinationData.conversion_rate.replace('%', ''));
      confidence += 30;
      factorsConsidered.push('Historical combination data');
    }

    // Apply customer profile adjustments
    if (customerProfile) {
      const profileAdjustment = this.getProfileConversionAdjustment(customerProfile);
      baseRate *= profileAdjustment;
      confidence += 10;
      factorsConsidered.push('Customer profile analysis');
    }

    // Apply occasion adjustments
    if (occasion) {
      const occasionData = this.conversionData!.conversion_by_category.occasion_based[occasion];
      if (occasionData) {
        const occasionRate = parseFloat(occasionData.conversion_rate.replace('%', ''));
        baseRate = (baseRate + occasionRate) / 2; // Average with occasion rate
        confidence += 15;
        factorsConsidered.push('Occasion-specific data');
      }
    }

    // Apply device adjustments
    if (device) {
      const deviceData = this.conversionData!.device_performance[device];
      if (deviceData) {
        const deviceRate = parseFloat(deviceData.conversion_rate.replace('%', ''));
        baseRate = (baseRate + deviceRate) / 2;
        confidence += 10;
        factorsConsidered.push('Device performance data');
      }
    }

    // Apply seasonal adjustments
    if (season) {
      const seasonalData = this.conversionData!.time_based_patterns.seasonal_trends[season];
      if (seasonalData) {
        const seasonalRate = parseFloat(seasonalData.conversion_rate.replace('%', ''));
        baseRate = (baseRate + seasonalRate) / 2;
        confidence += 10;
        factorsConsidered.push('Seasonal trends');
      }
    }

    const averageRate = 19.2; // Overall average from data
    const benchmarkComparison = {
      above_average: baseRate > averageRate,
      percentage_difference: Math.round(((baseRate - averageRate) / averageRate) * 100)
    };

    return {
      predicted_rate: Math.round(baseRate * 10) / 10,
      confidence: Math.min(95, confidence),
      factors_considered: factorsConsidered,
      benchmark_comparison: benchmarkComparison
    };
  }

  /**
   * Get optimization recommendations for low-converting combinations
   */
  async getOptimizationRecommendations(
    combination: string,
    currentRate: number
  ): Promise<{
    quick_wins: string[];
    medium_term_improvements: string[];
    long_term_strategies: string[];
    expected_impact: { [key: string]: string };
  }> {
    if (!this.conversionData) {
      await this.initialize();
    }

    const quickWins: string[] = [];
    const mediumTerm: string[] = [];
    const longTerm: string[] = [];
    const expectedImpact: { [key: string]: string } = {};

    const factors = this.conversionData!.conversion_factors;

    // Quick wins (immediate impact)
    if (currentRate < 15) {
      quickWins.push('Add bundle discount (15% off recommended)');
      expectedImpact['Bundle discount'] = '+8.9%';
      
      quickWins.push('Implement size guarantee');
      expectedImpact['Size guarantee'] = '+5.6%';
      
      quickWins.push('Show shipping cost early in checkout');
      expectedImpact['Transparent shipping'] = '+12.7%';
    }

    // Medium-term improvements
    if (currentRate < 20) {
      mediumTerm.push('Add virtual try-on feature');
      expectedImpact['Virtual try-on'] = '+7.8%';
      
      mediumTerm.push('Implement style quiz');
      expectedImpact['Style quiz'] = '+12.4%';
      
      mediumTerm.push('Improve product images with 360° view');
      expectedImpact['Better images'] = '+15.2%';
    }

    // Long-term strategies
    longTerm.push('Develop AI-powered recommendations');
    expectedImpact['AI recommendations'] = '+42% vs self-selected';
    
    longTerm.push('Implement chat support');
    expectedImpact['Chat support'] = '+17.4%';
    
    longTerm.push('Create personalized experiences');
    expectedImpact['Personalization'] = '+67% email performance';

    return {
      quick_wins: quickWins,
      medium_term_improvements: mediumTerm,
      long_term_strategies: longTerm,
      expected_impact: expectedImpact
    };
  }

  // Private helper methods

  private findCombinationData(combination: string): any {
    if (!this.conversionData) return null;

    const normalizedCombination = combination.toLowerCase().replace(/\s+/g, '_');
    
    return this.conversionData!.top_converting_combinations.all_time_best.find(
      item => item.combination.includes(normalizedCombination) || 
              normalizedCombination.includes(item.combination)
    );
  }

  private calculatePredictedConversionRate(request: ConversionOptimizationRequest): number {
    let baseRate = 18.0; // Default base rate

    // Apply adjustments based on various factors
    if (request.customer_profile) {
      baseRate *= this.getProfileConversionAdjustment(request.customer_profile);
    }

    if (request.occasion) {
      baseRate *= this.getOccasionConversionAdjustment(request.occasion);
    }

    if (request.price_tier) {
      baseRate *= this.getPriceTierConversionAdjustment(request.price_tier);
    }

    if (request.device_type) {
      baseRate *= this.getDeviceConversionAdjustment(request.device_type);
    }

    return Math.round(baseRate * 10) / 10;
  }

  private identifyConversionFactors(request: ConversionOptimizationRequest): {
    positive: string[];
    negative: string[];
  } {
    const positive: string[] = [];
    const negative: string[] = [];

    // Analyze based on request parameters
    if (request.customer_profile === 'luxury_connoisseur') {
      positive.push('High-value customer segment');
      positive.push('Low price sensitivity');
    }

    if (request.occasion === 'wedding_groom') {
      positive.push('High-stakes purchase motivation');
      positive.push('Willing to invest in quality');
    }

    if (request.device_type === 'mobile') {
      negative.push('Mobile checkout friction');
      negative.push('Smaller screen for product details');
    }

    // Add general factors from data
    positive.push('Free shipping available');
    positive.push('Size guarantee offered');
    negative.push('Potential out-of-stock sizes');

    return { positive, negative };
  }

  private generateOptimizationSuggestions(
    request: ConversionOptimizationRequest,
    factors: { positive: string[]; negative: string[] }
  ): string[] {
    const suggestions: string[] = [];

    // General suggestions
    suggestions.push('Implement virtual try-on feature');
    suggestions.push('Add customer reviews and testimonials');
    suggestions.push('Show recently purchased notifications');

    // Device-specific suggestions
    if (request.device_type === 'mobile') {
      suggestions.push('Optimize mobile checkout flow');
      suggestions.push('Implement one-tap purchasing');
      suggestions.push('Improve mobile image zoom functionality');
    }

    // Profile-specific suggestions
    if (request.customer_profile === 'practical_value_seeker') {
      suggestions.push('Highlight bundle savings prominently');
      suggestions.push('Show cost-per-wear calculations');
    }

    if (request.customer_profile === 'modern_adventurous') {
      suggestions.push('Add urgency messaging for limited items');
      suggestions.push('Show Instagram-worthy styling photos');
    }

    return suggestions;
  }

  private identifyUpsellOpportunities(request: ConversionOptimizationRequest): string[] {
    const opportunities: string[] = [];

    // Based on combination data
    const combinationData = this.findCombinationData(request.combination);
    if (combinationData && combinationData.bundle_configuration) {
      opportunities.push(...combinationData.bundle_configuration.common_additions);
    }

    // General upsell opportunities
    opportunities.push('Pocket square (73% attach rate)');
    opportunities.push('Leather belt');
    opportunities.push('Dress shoes');
    opportunities.push('Cufflinks');
    opportunities.push('Tie clip');

    return opportunities;
  }

  private getProfileConversionAdjustment(profile: string): number {
    const adjustments: { [key: string]: number } = {
      'classic_conservative': 1.15,
      'modern_adventurous': 0.95,
      'practical_value_seeker': 0.85,
      'occasion_driven': 1.35,
      'luxury_connoisseur': 1.75
    };

    return adjustments[profile] || 1.0;
  }

  private getOccasionConversionAdjustment(occasion: string): number {
    const adjustments: { [key: string]: number } = {
      'wedding_groom': 1.25,
      'wedding_guest': 0.9,
      'business_professional': 1.1,
      'special_event': 0.95
    };

    return adjustments[occasion] || 1.0;
  }

  private getPriceTierConversionAdjustment(priceTier: string): number {
    const adjustments: { [key: string]: number } = {
      'budget': 0.85,
      'mid_range': 1.15,
      'premium': 1.05,
      'luxury': 1.35
    };

    return adjustments[priceTier] || 1.0;
  }

  private getDeviceConversionAdjustment(device: string): number {
    const adjustments: { [key: string]: number } = {
      'desktop': 1.2,
      'mobile': 0.75,
      'tablet': 0.95
    };

    return adjustments[device] || 1.0;
  }
}

export const conversionService = new ConversionService();