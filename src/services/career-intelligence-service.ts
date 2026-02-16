/**
 * Career Intelligence Service
 * Handles professional trajectory tracking, wardrobe timing optimization, and career-based recommendations
 */

import { cacheService } from './cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  CareerTrajectoryData,
  CareerStage,
  Timeline,
  InvestmentPattern,
  PromotionSignal,
  WardrobeRecommendation,
  InvestmentStrategy,
  CareerTrajectoryRequest,
  CareerTrajectoryResponse,
  BehaviorData,
  BodyLanguageFitPreferences,
  ProfessionalType,
  CareerAdvancementStage
} from '../types/enhanced-knowledge-bank';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { logger } from '../utils/logger';

export class CareerIntelligenceService {
  private careerData: any[] | null = null;
  private bodyLanguageData: BodyLanguageFitPreferences | null = null;
  private industryData: Map<string, any> = new Map();

  // Section 1.4: CSV data from career trajectory research
  private careerStageWardrobe: any[] = [];
  private ageCareerProgression: any[] = [];
  private promotionSignals: any[] = [];
  private wardrobeUpgradeTiming: any[] = [];

  /**
   * Initialize the service with career trajectory data
   */
  async initialize(): Promise<void> {
    try {
      // Load career data with cache-aside pattern
      this.careerData = await cacheService.getOrSet(
        'career:trajectory_data',
        () => enhancedDataLoader.loadCareerTrajectoryData(),
        {
          ttl: 4 * 60 * 60, // 4 hours
          tags: ['career', 'trajectory'],
          compress: true
        }
      );

      this.bodyLanguageData = await cacheService.getOrSet(
        'career:body_language_preferences',
        () => enhancedDataLoader.loadBodyLanguageFitPreferences(),
        {
          ttl: 4 * 60 * 60, // 4 hours
          tags: ['career', 'preferences'],
          compress: true
        }
      );

      // Build industry-specific data cache
      await this.buildIndustryDataCache();

      // Section 1.4: Load career CSV data
      try {
        this.careerStageWardrobe = await this.loadCSV('research/career/career_stage_wardrobe.csv');
        this.ageCareerProgression = await this.loadCSV('research/career/age_career_progression.csv');
        this.promotionSignals = await this.loadCSV('research/career/promotion_signals.csv');
        this.wardrobeUpgradeTiming = await this.loadCSV('research/career/wardrobe_upgrade_timing.csv');
        logger.info('Career CSV data loaded successfully');
      } catch (error) {
        logger.warn('Failed to load career CSV data:', { error: error instanceof Error ? error.message : String(error) });
      }
    } catch (error) {
      console.warn('Failed to initialize CareerIntelligenceService:', error);
      // Initialize with empty data to prevent service failure
      this.careerData = [];
      this.bodyLanguageData = {
        professional_preferences: {},
        personality_preferences: {},
        age_preferences: {},
        generational_trends: {}
      };
    }
  }

  /**
   * Load and parse CSV file
   */
  private async loadCSV(relativePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const filePath = path.join(__dirname, '../data', relativePath);

      if (!fs.existsSync(filePath)) {
        reject(new Error(`CSV file not found: ${filePath}`));
        return;
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }

  /**
   * Analyze career trajectory and provide wardrobe recommendations
   */
  async analyzeCareerTrajectory(request: CareerTrajectoryRequest): Promise<CareerTrajectoryResponse> {
    const cacheKey = `career:analysis:${request.customer_id}:${JSON.stringify(request)}`;
    
    // Try cache first
    const cached = await cacheService.get<CareerTrajectoryResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.careerData || !this.bodyLanguageData) {
      await this.initialize();
    }

    // Analyze advancement probability
    const advancementProbability = await this.calculateAdvancementProbability(request);
    
    // Generate predicted timeline
    const predictedTimeline = await this.generatePredictedTimeline(request, advancementProbability);
    
    // Create wardrobe recommendations
    const wardrobeRecommendations = await this.generateWardrobeRecommendations(request, advancementProbability);
    
    // Develop investment strategy
    const investmentStrategy = await this.createInvestmentStrategy(request, advancementProbability);
    
    // Identify promotion signals
    const promotionSignals = await this.identifyPromotionSignals(request);

    const response: CareerTrajectoryResponse = {
      advancement_probability: advancementProbability,
      predicted_timeline: predictedTimeline,
      wardrobe_recommendations: wardrobeRecommendations,
      investment_strategy: investmentStrategy,
      promotion_signals: promotionSignals
    };

    // Cache the response
    await cacheService.set(cacheKey, response, {
      ttl: 2 * 60 * 60, // 2 hours
      tags: ['career', 'analysis'],
    });

    return response;
  }

  /**
   * Get career stage information and styling preferences
   */
  async getCareerStagePreferences(stage: CareerAdvancementStage, industry: string): Promise<{
    stage_info: CareerStage;
    professional_preferences: any;
    wardrobe_focus: string[];
    investment_priorities: string[];
  }> {
    const cacheKey = `career:stage_preferences:${stage}:${industry}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const stageInfo = this.getCareerStageInfo(stage);
        const professionalPrefs = await this.getProfessionalPreferences(industry);
        
        return {
          stage_info: stageInfo,
          professional_preferences: professionalPrefs,
          wardrobe_focus: this.getWardrobeFocusForStage(stage),
          investment_priorities: this.getInvestmentPrioritiesForStage(stage)
        };
      },
      {
        ttl: 6 * 60 * 60, // 6 hours
        tags: ['career', 'preferences'],
      }
    );
  }

  /**
   * Get industry-specific styling recommendations
   */
  async getIndustryRecommendations(industry: string, roleLevel: string): Promise<{
    colors: string[];
    styles: string[];
    avoid: string[];
    key_principles: string[];
    body_language_goals: string[];
  }> {
    const cacheKey = `career:industry:${industry}:${roleLevel}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        if (!this.bodyLanguageData) {
          await this.initialize();
        }

        const industryKey = this.mapIndustryToDataKey(industry);
        const preferences = this.bodyLanguageData?.professional_preferences?.[industryKey];
        
        if (!preferences) {
          return this.getDefaultIndustryRecommendations();
        }

        return {
          colors: preferences.colors || ['Navy', 'Charcoal', 'Gray'],
          styles: [preferences.preferred_cut, preferences.fit_style],
          avoid: preferences.avoid || [],
          key_principles: [preferences.key_principle],
          body_language_goals: preferences.body_language_signals || []
        };
      },
      {
        ttl: 4 * 60 * 60, // 4 hours
        tags: ['career', 'industry'],
      }
    );
  }

  /**
   * Optimize wardrobe timing based on career trajectory
   */
  async optimizeWardrobeTiming(customerId: string, currentTrajectory: CareerTrajectoryData): Promise<{
    immediate_needs: WardrobeRecommendation[];
    upcoming_needs: WardrobeRecommendation[];
    future_planning: WardrobeRecommendation[];
    budget_timeline: { [timeframe: string]: number };
  }> {
    const cacheKey = `career:timing:${customerId}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const immediateNeeds = await this.getImmediateWardrobeNeeds(currentTrajectory);
        const upcomingNeeds = await this.getUpcomingWardrobeNeeds(currentTrajectory);
        const futurePlanning = await this.getFutureWardrobePlanning(currentTrajectory);
        const budgetTimeline = this.createBudgetTimeline(currentTrajectory);

        return {
          immediate_needs: immediateNeeds,
          upcoming_needs: upcomingNeeds,
          future_planning: futurePlanning,
          budget_timeline: budgetTimeline
        };
      },
      {
        ttl: 1 * 60 * 60, // 1 hour
        tags: ['career', 'timing'],
      }
    );
  }

  /**
   * Calculate advancement probability based on various factors
   */
  private async calculateAdvancementProbability(request: CareerTrajectoryRequest): Promise<number> {
    let probability = 50; // Base probability

    // Age factor
    const ageRange = request.age_range.toLowerCase();
    if (ageRange.includes('25-35') || ageRange.includes('30-40')) {
      probability += 15; // Prime advancement years
    } else if (ageRange.includes('40-50')) {
      probability += 5; // Still good advancement potential
    }

    // Industry factor
    const growingIndustries = ['technology', 'healthcare', 'finance', 'consulting'];
    if (growingIndustries.some(ind => request.industry.toLowerCase().includes(ind))) {
      probability += 10;
    }

    // Behavior analysis
    const wardrobeUpgradeBehaviors = request.recent_behaviors.filter(b => 
      b.behavior_type.includes('wardrobe') || b.behavior_type.includes('professional')
    );
    
    if (wardrobeUpgradeBehaviors.length > 0) {
      probability += 20; // Wardrobe investment indicates career ambition
    }

    // Networking indicators
    const networkingBehaviors = request.recent_behaviors.filter(b =>
      b.behavior_type.includes('networking') || b.behavior_type.includes('events')
    );
    
    if (networkingBehaviors.length > 0) {
      probability += 15;
    }

    return Math.min(Math.max(probability, 10), 95); // Cap between 10-95%
  }

  /**
   * Generate predicted timeline for career advancement
   */
  private async generatePredictedTimeline(request: CareerTrajectoryRequest, probability: number): Promise<Timeline> {
    const baseMonths = 18; // Default timeline
    let estimatedMonths = baseMonths;

    // Adjust based on probability
    if (probability > 80) {
      estimatedMonths = 12;
    } else if (probability > 60) {
      estimatedMonths = 15;
    } else if (probability < 40) {
      estimatedMonths = 24;
    }

    // Industry-specific adjustments
    const fastAdvancementIndustries = ['technology', 'startup', 'consulting'];
    if (fastAdvancementIndustries.some(ind => request.industry.toLowerCase().includes(ind))) {
      estimatedMonths *= 0.8;
    }

    const keyIndicators = this.generateKeyIndicators(request, probability);

    return {
      next_milestone: this.determineNextMilestone(request.current_role),
      estimated_months: Math.round(estimatedMonths),
      confidence_level: probability,
      key_indicators: keyIndicators
    };
  }

  /**
   * Generate wardrobe recommendations based on career analysis
   */
  private async generateWardrobeRecommendations(request: CareerTrajectoryRequest, probability: number): Promise<WardrobeRecommendation[]> {
    const recommendations: WardrobeRecommendation[] = [];
    const industryRecommendations = await this.getIndustryRecommendations(request.industry, 'mid');

    // High probability = prepare for advancement
    if (probability > 70) {
      recommendations.push({
        item_type: 'Executive Business Suit',
        priority: 9,
        timing: 'Next 3 months',
        reasoning: 'High advancement probability requires elevated professional image',
        budget_range: '$800-2000'
      });

      recommendations.push({
        item_type: 'Premium Dress Shirts',
        priority: 8,
        timing: 'Next 2 months',
        reasoning: 'Quality foundation pieces for executive presence',
        budget_range: '$150-300 each'
      });
    }

    // Medium probability = strategic upgrades
    if (probability > 40 && probability <= 70) {
      recommendations.push({
        item_type: 'Modern Business Suit',
        priority: 7,
        timing: 'Next 6 months',
        reasoning: 'Solid advancement potential warrants professional upgrade',
        budget_range: '$500-1200'
      });
    }

    // Industry-specific recommendations
    const industryColors = industryRecommendations.colors;
    recommendations.push({
      item_type: `${industryColors[0]} Business Suit`,
      priority: 8,
      timing: 'Next 4 months',
      reasoning: `${industryColors[0]} aligns with ${request.industry} industry standards`,
      budget_range: '$600-1500'
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create investment strategy based on career trajectory
   */
  private async createInvestmentStrategy(request: CareerTrajectoryRequest, probability: number): Promise<InvestmentStrategy> {
    const strategy: InvestmentStrategy = {
      immediate_needs: [],
      medium_term_goals: [],
      long_term_vision: '',
      budget_allocation: {}
    };

    // High advancement probability strategy
    if (probability > 70) {
      strategy.immediate_needs = [
        'Executive-level business suits',
        'Premium accessories collection',
        'Professional alterations consultation'
      ];
      strategy.medium_term_goals = [
        'Build complete C-suite wardrobe',
        'Develop signature professional style',
        'Invest in luxury quality pieces'
      ];
      strategy.long_term_vision = 'Complete executive wardrobe that projects authority and success';
      strategy.budget_allocation = {
        'suits': 60,
        'shirts': 20,
        'accessories': 15,
        'shoes': 5
      };
    } else {
      strategy.immediate_needs = [
        'Quality business fundamentals',
        'Versatile professional pieces',
        'Proper fit consultation'
      ];
      strategy.medium_term_goals = [
        'Build comprehensive professional wardrobe',
        'Establish personal style preferences'
      ];
      strategy.long_term_vision = 'Professional wardrobe that supports career growth';
      strategy.budget_allocation = {
        'suits': 50,
        'shirts': 25,
        'accessories': 15,
        'shoes': 10
      };
    }

    return strategy;
  }

  /**
   * Identify promotion signals in behavior data
   */
  private async identifyPromotionSignals(request: CareerTrajectoryRequest): Promise<PromotionSignal[]> {
    const signals: PromotionSignal[] = [];

    // Analyze recent behaviors for promotion indicators
    request.recent_behaviors.forEach(behavior => {
      if (behavior.behavior_type.includes('wardrobe_upgrade')) {
        signals.push({
          signal_type: 'wardrobe_upgrade',
          strength: 8,
          time_horizon: '3-6 months',
          recommended_actions: ['Complete professional wardrobe assessment', 'Invest in executive-level pieces']
        });
      }

      if (behavior.behavior_type.includes('networking')) {
        signals.push({
          signal_type: 'networking_increase',
          strength: 7,
          time_horizon: '6-12 months',
          recommended_actions: ['Ensure consistent professional image', 'Invest in memorable signature pieces']
        });
      }

      if (behavior.behavior_type.includes('role_change')) {
        signals.push({
          signal_type: 'role_change',
          strength: 9,
          time_horizon: '1-3 months',
          recommended_actions: ['Immediate wardrobe upgrade required', 'Schedule professional styling consultation']
        });
      }
    });

    // Add default signal if none detected
    if (signals.length === 0) {
      signals.push({
        signal_type: 'wardrobe_upgrade',
        strength: 5,
        time_horizon: '12-18 months',
        recommended_actions: ['Monitor career progression', 'Build quality foundation pieces']
      });
    }

    return signals;
  }

  /**
   * Section 1.4: Query methods for career CSV data
   */

  /**
   * Get career stage wardrobe investment data
   */
  async getCareerStageData(careerStage: string): Promise<{
    investment: number;
    quality_level: string;
    formality_score: number;
    tailoring_frequency: string;
  } | null> {
    if (this.careerStageWardrobe.length === 0) {
      await this.initialize();
    }

    const normalized = careerStage.toLowerCase().trim();
    const match = this.careerStageWardrobe.find(row =>
      row.Career_Stage?.toLowerCase().includes(normalized) ||
      normalized.includes(row.Career_Stage?.toLowerCase())
    );

    if (!match) return null;

    return {
      investment: parseFloat(match.Average_Wardrobe_Investment?.replace(/[$,]/g, '')) || 0,
      quality_level: match.Suit_Quality_Level || 'Mid-Range',
      formality_score: parseInt(match.Style_Formality_Score) || 7,
      tailoring_frequency: match.Tailoring_Frequency || 'Quarterly'
    };
  }

  /**
   * Get age-based career progression data
   */
  async getAgeCareerData(age: number): Promise<{
    typical_stage: string;
    years_experience: number;
    promotion_likelihood: number;
    investment_trend: string;
  } | null> {
    if (this.ageCareerProgression.length === 0) {
      await this.initialize();
    }

    const match = this.ageCareerProgression.find(row => {
      const ageRange = row.Age_Range || '';
      const [min, max] = ageRange.split('-').map((n: string) => parseInt(n.replace('+', '')));
      if (ageRange.includes('+')) {
        return age >= min;
      }
      return age >= min && age <= max;
    });

    if (!match) return null;

    return {
      typical_stage: match.Typical_Career_Stage || 'Mid-Level',
      years_experience: parseInt(match.Average_Years_Experience) || 5,
      promotion_likelihood: parseFloat(match.Promotion_Likelihood?.replace('%', '')) || 50,
      investment_trend: match.Wardrobe_Investment_Trend || 'Moderate'
    };
  }

  /**
   * Get promotion signal reliability data
   */
  async getPromotionSignalData(signalType?: string): Promise<Array<{
    signal: string;
    timing: string;
    reliability: number;
    spend_increase: number;
  }>> {
    if (this.promotionSignals.length === 0) {
      await this.initialize();
    }

    let signals = this.promotionSignals;

    if (signalType) {
      const normalized = signalType.toLowerCase().trim();
      signals = signals.filter(row =>
        row.Signal_Type?.toLowerCase().includes(normalized)
      );
    }

    return signals.map(row => ({
      signal: row.Signal_Type || 'Unknown',
      timing: row.Timing_Relative_to_Promotion || '3-6 months before',
      reliability: parseFloat(row.Reliability_Score?.replace('%', '')) || 0,
      spend_increase: parseFloat(row.Average_Spend_Increase?.replace(/[$,%]/g, '')) || 0
    }));
  }

  /**
   * Get wardrobe upgrade timing by event type
   */
  async getWardrobeUpgradeTimingData(eventType?: string): Promise<{
    event: string;
    average_spend: number;
    urgency: number;
    lead_time_days: number;
  } | null> {
    if (this.wardrobeUpgradeTiming.length === 0) {
      await this.initialize();
    }

    if (!eventType) {
      // Return generic wardrobe upgrade data if no event specified
      const generic = this.wardrobeUpgradeTiming.find(row =>
        row.Event_Type?.toLowerCase().includes('wardrobe upgrade')
      );

      if (generic) {
        return {
          event: generic.Event_Type || 'Wardrobe Upgrade',
          average_spend: parseFloat(generic.Average_Spend?.replace(/[$,]/g, '')) || 1000,
          urgency: parseInt(generic.Purchase_Urgency) || 5,
          lead_time_days: parseInt(generic.Lead_Time_Days) || 30
        };
      }
    }

    const normalized = eventType?.toLowerCase().trim() || '';
    const match = this.wardrobeUpgradeTiming.find(row =>
      row.Event_Type?.toLowerCase().includes(normalized)
    );

    if (!match) return null;

    return {
      event: match.Event_Type || 'Unknown Event',
      average_spend: parseFloat(match.Average_Spend?.replace(/[$,]/g, '')) || 0,
      urgency: parseInt(match.Purchase_Urgency) || 5,
      lead_time_days: parseInt(match.Lead_Time_Days) || 30
    };
  }

  /**
   * Get comprehensive career context for recommendations
   */
  async getCareerContext(params: {
    age?: number;
    careerStage?: string;
    eventType?: string;
  }): Promise<{
    stage_data: any;
    age_data: any;
    timing_data: any;
    insights: string[];
  }> {
    const insights: string[] = [];
    let stage_data = null;
    let age_data = null;
    let timing_data = null;

    if (params.careerStage) {
      stage_data = await this.getCareerStageData(params.careerStage);
      if (stage_data) {
        insights.push(`${params.careerStage} professionals typically invest $${stage_data.investment.toLocaleString()} in their wardrobe`);
        insights.push(`${stage_data.quality_level} quality suits recommended for this career stage`);
      }
    }

    if (params.age) {
      age_data = await this.getAgeCareerData(params.age);
      if (age_data) {
        insights.push(`At age ${params.age}, typical career stage is ${age_data.typical_stage}`);
        if (age_data.promotion_likelihood > 60) {
          insights.push(`High promotion likelihood (${age_data.promotion_likelihood}%) - consider wardrobe upgrade`);
        }
      }
    }

    if (params.eventType) {
      timing_data = await this.getWardrobeUpgradeTimingData(params.eventType);
      if (timing_data) {
        insights.push(`${timing_data.event} typically requires $${timing_data.average_spend.toLocaleString()} investment`);
        if (timing_data.urgency >= 8) {
          insights.push(`High urgency event - recommend purchase within ${timing_data.lead_time_days} days`);
        }
      }
    }

    return { stage_data, age_data, timing_data, insights };
  }

  /**
   * Helper methods for career stage and industry analysis
   */
  private getCareerStageInfo(stage: CareerAdvancementStage): CareerStage {
    const stageMap: { [key in CareerAdvancementStage]: CareerStage } = {
      entry_level: {
        stage: 'entry_level',
        age_range: '22-28',
        typical_wardrobe_needs: ['Basic business suits', 'Professional shirts', 'Quality shoes'],
        investment_focus: ['Foundation pieces', 'Proper fit', 'Versatile colors'],
        style_evolution: 'Building professional identity'
      },
      establishing: {
        stage: 'establishing',
        age_range: '26-35',
        typical_wardrobe_needs: ['Quality business suits', 'Diverse shirt collection', 'Professional accessories'],
        investment_focus: ['Quality upgrades', 'Personal style development', 'Signature pieces'],
        style_evolution: 'Developing personal brand'
      },
      advancing: {
        stage: 'advancing',
        age_range: '32-45',
        typical_wardrobe_needs: ['Premium suits', 'Executive shirts', 'Luxury accessories'],
        investment_focus: ['Status signaling', 'Industry leadership', 'Premium quality'],
        style_evolution: 'Establishing authority'
      },
      leadership: {
        stage: 'leadership',
        age_range: '38-55',
        typical_wardrobe_needs: ['Executive wardrobe', 'Signature style', 'Premium everything'],
        investment_focus: ['Authority projection', 'Unique positioning', 'Timeless quality'],
        style_evolution: 'Commanding presence'
      },
      executive: {
        stage: 'executive',
        age_range: '45+',
        typical_wardrobe_needs: ['C-suite appropriate', 'Bespoke options', 'Luxury standards'],
        investment_focus: ['Ultimate quality', 'Personal branding', 'Legacy pieces'],
        style_evolution: 'Iconic professional image'
      }
    };

    return stageMap[stage];
  }

  private async getProfessionalPreferences(industry: string): Promise<any> {
    if (!this.bodyLanguageData) {
      await this.initialize();
    }

    const industryKey = this.mapIndustryToDataKey(industry);
    return this.bodyLanguageData?.professional_preferences?.[industryKey] || this.getDefaultProfessionalPreferences();
  }

  private mapIndustryToDataKey(industry: string): string {
    const industryLower = industry.toLowerCase();
    if (industryLower.includes('law') || industryLower.includes('legal')) return 'Lawyers';
    if (industryLower.includes('finance') || industryLower.includes('investment') || industryLower.includes('banking')) return 'Investment_Bankers';
    if (industryLower.includes('consult')) return 'Consultants';
    if (industryLower.includes('creative') || industryLower.includes('design') || industryLower.includes('media')) return 'Creative_Industries';
    return 'Consultants'; // Default fallback
  }

  private getDefaultProfessionalPreferences(): any {
    return {
      preferred_cut: 'Modern fit',
      fit_style: 'Professional contemporary',
      colors: ['Navy', 'Charcoal', 'Gray'],
      avoid: ['Overly trendy pieces'],
      body_language_signals: ['Competence', 'Reliability'],
      key_principle: 'Professional competence and reliability'
    };
  }

  private getDefaultIndustryRecommendations(): any {
    return {
      colors: ['Navy', 'Charcoal', 'Gray'],
      styles: ['Modern fit', 'Classic contemporary'],
      avoid: ['Overly casual', 'Extremely trendy'],
      key_principles: ['Professional appearance', 'Quality focus'],
      body_language_goals: ['Competence', 'Trustworthiness']
    };
  }

  private async buildIndustryDataCache(): Promise<void> {
    // Build industry-specific caches for faster access
    const industries = ['technology', 'finance', 'consulting', 'legal', 'healthcare', 'creative'];
    
    for (const industry of industries) {
      const data = await this.getIndustryRecommendations(industry, 'mid');
      this.industryData.set(industry, data);
    }
  }

  private getWardrobeFocusForStage(stage: CareerAdvancementStage): string[] {
    const focusMap: { [key in CareerAdvancementStage]: string[] } = {
      entry_level: ['Basic foundations', 'Proper fit', 'Professional appropriateness'],
      establishing: ['Quality upgrades', 'Personal style', 'Versatility'],
      advancing: ['Authority signaling', 'Premium quality', 'Industry leadership'],
      leadership: ['Executive presence', 'Signature style', 'Premium standards'],
      executive: ['C-suite appropriateness', 'Personal branding', 'Luxury standards']
    };

    return focusMap[stage];
  }

  private getInvestmentPrioritiesForStage(stage: CareerAdvancementStage): string[] {
    const priorityMap: { [key in CareerAdvancementStage]: string[] } = {
      entry_level: ['Foundational pieces', 'Proper alterations', 'Basic accessories'],
      establishing: ['Quality suits', 'Shirt variety', 'Professional accessories'],
      advancing: ['Premium suits', 'Executive accessories', 'Signature pieces'],
      leadership: ['Luxury pieces', 'Bespoke options', 'Authority signaling'],
      executive: ['Ultimate quality', 'Bespoke wardrobe', 'Legacy investments']
    };

    return priorityMap[stage];
  }

  private async getImmediateWardrobeNeeds(trajectory: CareerTrajectoryData): Promise<WardrobeRecommendation[]> {
    return [
      {
        item_type: 'Primary Business Suit',
        priority: 10,
        timing: 'Within 2 weeks',
        reasoning: 'Immediate professional image requirements',
        budget_range: trajectory.wardrobe_investment_pattern.budget_range
      }
    ];
  }

  private async getUpcomingWardrobeNeeds(trajectory: CareerTrajectoryData): Promise<WardrobeRecommendation[]> {
    return [
      {
        item_type: 'Secondary Business Suit',
        priority: 8,
        timing: 'Next 2-3 months',
        reasoning: 'Building professional wardrobe foundation',
        budget_range: trajectory.wardrobe_investment_pattern.budget_range
      }
    ];
  }

  private async getFutureWardrobePlanning(trajectory: CareerTrajectoryData): Promise<WardrobeRecommendation[]> {
    return [
      {
        item_type: 'Executive Upgrade Package',
        priority: 6,
        timing: 'Next 6-12 months',
        reasoning: 'Preparing for career advancement',
        budget_range: 'Premium tier'
      }
    ];
  }

  private createBudgetTimeline(trajectory: CareerTrajectoryData): { [timeframe: string]: number } {
    // Parse budget range and create timeline
    const budgetRange = trajectory.wardrobe_investment_pattern.budget_range;
    const baseBudget = this.parseBudgetRange(budgetRange);

    return {
      'immediate': baseBudget * 0.4,
      '3_months': baseBudget * 0.3,
      '6_months': baseBudget * 0.2,
      '12_months': baseBudget * 0.1
    };
  }

  private parseBudgetRange(range: string): number {
    // Extract average from budget range like "$500-2000"
    const matches = range.match(/\$?(\d+)(?:-\$?(\d+))?/);
    if (!matches) return 1000; // Default

    const min = parseInt(matches[1]);
    const max = matches[2] ? parseInt(matches[2]) : min;
    return (min + max) / 2;
  }

  private determineNextMilestone(currentRole: string): string {
    const role = currentRole.toLowerCase();
    if (role.includes('analyst') || role.includes('associate')) return 'Senior role promotion';
    if (role.includes('senior')) return 'Management position';
    if (role.includes('manager')) return 'Director level';
    if (role.includes('director')) return 'VP/Executive level';
    return 'Career advancement';
  }

  private generateKeyIndicators(request: CareerTrajectoryRequest, probability: number): string[] {
    const indicators = ['Professional development activities'];
    
    if (probability > 70) {
      indicators.push('Strong advancement signals detected');
    }
    
    if (request.recent_behaviors.some(b => b.behavior_type.includes('wardrobe'))) {
      indicators.push('Investment in professional image');
    }

    return indicators;
  }

  /**
   * Clear career-related caches
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateByTags(['career']);
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    data_loaded: boolean;
    cache_status: string;
    last_update: string;
  }> {
    const dataLoaded = this.careerData !== null && this.bodyLanguageData !== null;
    const cacheStats = await cacheService.getStats();
    
    return {
      status: dataLoaded ? 'healthy' : 'degraded',
      data_loaded: dataLoaded,
      cache_status: `${(cacheStats as any)?.keys_count || 0} keys cached`,
      last_update: new Date().toISOString()
    };
  }
}

export const careerIntelligenceService = new CareerIntelligenceService();