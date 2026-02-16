/**
 * Enhanced Data Loader for KCT Knowledge API Enhancement Integration
 * Handles loading, parsing, and transforming enhancement intelligence data
 */

import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import {
  BodyLanguageFitPreferences,
  CulturalNuances,
  FabricPerformanceData,
  CustomerPsychologyProfile,
  CareerTrajectoryData,
  VenueIntelligence,
  EnhancedKnowledgeBankIndex
} from '../types/enhanced-knowledge-bank';

export class EnhancedDataLoader {
  private enhancementDataPath: string;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for enhancement data
  private readonly MAX_CACHE_ENTRIES = 50;

  constructor() {
    this.enhancementDataPath = path.join(__dirname, '../../KCT Knowledge API Enhancement -Update-Info');
    // Periodic cache cleanup every 5 minutes
    setInterval(() => this.evictExpiredEntries(), 5 * 60 * 1000);
  }

  /**
   * Evict expired cache entries and enforce size cap
   */
  private evictExpiredEntries(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry <= now) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
    // Enforce size cap — evict oldest entries first
    if (this.cache.size > this.MAX_CACHE_ENTRIES) {
      const sorted = Array.from(this.cacheExpiry.entries()).sort((a, b) => a[1] - b[1]);
      const toRemove = sorted.slice(0, sorted.length - this.MAX_CACHE_ENTRIES);
      for (const [key] of toRemove) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  /**
   * Load and parse JSON file from enhancement data directory
   */
  public loadEnhancementJsonFile<T>(filePath: string): T {
    const cacheKey = `enhancement_${filePath}`;
    const now = Date.now();

    // Check cache first
    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.cache.get(cacheKey);
    }

    try {
      const fullPath = path.join(this.enhancementDataPath, filePath);
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Cache the data
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

      return data;
    } catch (error) {
      console.warn(`Failed to load enhancement file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Return empty fallback data structure
      return this.createFallbackData<T>(filePath);
    }
  }

  /**
   * Load and parse CSV file from enhancement data directory
   */
  public async loadEnhancementCsvFile<T>(filePath: string): Promise<T[]> {
    const cacheKey = `enhancement_csv_${filePath}`;
    const now = Date.now();

    // Check cache first
    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.cache.get(cacheKey);
    }

    return new Promise((resolve, reject) => {
      try {
        const fullPath = path.join(this.enhancementDataPath, filePath);
        
        if (!fs.existsSync(fullPath)) {
          console.warn(`CSV file not found: ${filePath}, returning empty array`);
          resolve([]);
          return;
        }

        const results: T[] = [];

        fs.createReadStream(fullPath)
          .pipe(csvParser())
          .on('data', (data: T) => results.push(data))
          .on('end', () => {
            // Cache the data
            this.cache.set(cacheKey, results);
            this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
            resolve(results);
          })
          .on('error', (error: Error) => {
            console.warn(`Failed to load CSV file ${filePath}: ${error.message}`);
            resolve([]); // Return empty array on error
          });
      } catch (error) {
        console.warn(`Error processing CSV file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        resolve([]);
      }
    });
  }

  /**
   * Create fallback data for missing files
   */
  private createFallbackData<T>(filePath: string): T {
    const fallbackData: any = {};
    
    // Provide sensible defaults based on file type
    if (filePath.includes('body_language_fit_preferences')) {
      fallbackData.professional_preferences = {};
      fallbackData.personality_preferences = {};
      fallbackData.age_preferences = {};
      fallbackData.generational_trends = {};
    } else if (filePath.includes('cultural_regional_nuances')) {
      fallbackData.region = 'unknown';
      fallbackData.cultural_context = {
        cultural_values: [],
        communication_style: 'mixed',
        hierarchy_importance: 5,
        tradition_vs_modernity: 5,
        social_proof_importance: 5
      };
      fallbackData.color_preferences = [];
      fallbackData.style_variations = [];
    } else if (filePath.includes('venue_microdata_analysis')) {
      fallbackData.venues = {};
    } else if (filePath.includes('untapped_menswear_markets')) {
      fallbackData.suit_purchase_barriers = {};
      fallbackData.underserved_body_types = {};
      fallbackData.accessibility_gaps = {};
    }

    return fallbackData as T;
  }

  /**
   * Load body language and fit preferences data
   */
  async loadBodyLanguageFitPreferences(): Promise<BodyLanguageFitPreferences> {
    return this.loadEnhancementJsonFile<BodyLanguageFitPreferences>(
      'Body Language & Fit Preferences_ The Psychology of/body_language_fit_preferences.json'
    );
  }

  /**
   * Load cultural and regional nuances data
   */
  async loadCulturalNuances(): Promise<any> {
    return this.loadEnhancementJsonFile(
      'Cultural & Regional Nuances_ Navigating the Unspok/cultural_regional_nuances.json'
    );
  }

  /**
   * Load venue microdata analysis
   */
  async loadVenueIntelligence(): Promise<any> {
    return this.loadEnhancementJsonFile(
      'Venue Microdata_ The Hidden Intelligence of Lighti/venue_microdata_analysis.json'
    );
  }

  /**
   * Load untapped markets data
   */
  async loadUntappedMarketsData(): Promise<any> {
    return this.loadEnhancementJsonFile(
      'Untapped Markets_ Breaking Barriers to Expand Mens/untapped_menswear_markets.json'
    );
  }

  /**
   * Load micro-trend detection data
   */
  async loadMicroTrendData(): Promise<any> {
    return this.loadEnhancementJsonFile(
      'Micro-Trend Detection in Menswear Formalwear_ The/micro_trend_detection_data.json'
    );
  }

  /**
   * Load customer psychology data from CSV files
   */
  async loadCustomerPsychologyData(): Promise<any[]> {
    const csvFiles = [
      'Customer Psychology & Behavior - Menswear Formalwe/menswear_decision_fatigue_summary.csv',
      'Emotional Triggers in Menswear Formalwear_ Custome/emotional_triggers_menswear.csv',
      'Emotional Triggers in Menswear Formalwear_ Custome/buying_journey_emotions.csv'
    ];

    const allData = [];
    for (const file of csvFiles) {
      const data = await this.loadEnhancementCsvFile(file);
      allData.push(...data);
    }

    return allData;
  }

  /**
   * Load career trajectory data from CSV files
   */
  async loadCareerTrajectoryData(): Promise<any[]> {
    const csvFiles = [
      'Career Trajectory Patterns_ Advanced Personalizati/career_stage_wardrobe.csv',
      'Career Trajectory Patterns_ Advanced Personalizati/age_career_progression.csv',
      'Career Trajectory Patterns_ Advanced Personalizati/promotion_signals.csv',
      'Career Trajectory Patterns_ Advanced Personalizati/wardrobe_upgrade_timing.csv'
    ];

    const allData = [];
    for (const file of csvFiles) {
      const data = await this.loadEnhancementCsvFile(file);
      allData.push(...data);
    }

    return allData;
  }

  /**
   * Load fabric performance data from CSV files
   */
  async loadFabricPerformanceData(): Promise<any[]> {
    const csvFiles = [
      'Technical Style Details_ Fabric Performance Data/fabric_performance_real_world.csv',
      'Technical Style Details_ Fabric Performance Data/fabric_photography_performance.csv',
      'Technical Style Details_ Fabric Performance Data/suit_construction_lifespan.csv'
    ];

    const allData = [];
    for (const file of csvFiles) {
      const data = await this.loadEnhancementCsvFile(file);
      allData.push(...data);
    }

    return allData;
  }

  /**
   * Load AI training gaps data
   */
  async loadAITrainingGapsData(): Promise<any[]> {
    const csvFiles = [
      'AI Training Gaps in Menswear Customer Service/conversation_dead_ends.csv',
      'AI Training Gaps in Menswear Customer Service/slang_colloquialisms_gaps.csv',
      'AI Training Gaps in Menswear Customer Service/style_terminology_confusion.csv'
    ];

    const allData = [];
    for (const file of csvFiles) {
      const data = await this.loadEnhancementCsvFile(file);
      allData.push(...data);
    }

    return allData;
  }

  /**
   * Load competitor analysis data
   */
  async loadCompetitorAnalysisData(): Promise<any[]> {
    const csvFiles = [
      'Competitor Blind Spots in Menswear Formalwear/customer_questions_blind_spots.csv',
      'Competitor Blind Spots in Menswear Formalwear/sizing_chart_failures.csv',
      'Competitor Blind Spots in Menswear Formalwear/style_combinations_blind_spots.csv'
    ];

    const allData = [];
    for (const file of csvFiles) {
      const data = await this.loadEnhancementCsvFile(file);
      allData.push(...data);
    }

    return allData;
  }

  /**
   * Load color science gaps data
   */
  async loadColorScienceData(): Promise<any[]> {
    const csvFiles = [
      'Color Science Gaps in Menswear Formalwear_ Underst/colorblind_perception_analysis.csv',
      'Color Science Gaps in Menswear Formalwear_ Underst/lighting_color_perception.csv',
      'Color Science Gaps in Menswear Formalwear_ Underst/video_call_undertones.csv'
    ];

    const allData = [];
    for (const file of csvFiles) {
      const data = await this.loadEnhancementCsvFile(file);
      allData.push(...data);
    }

    return allData;
  }

  /**
   * Transform raw enhancement data into structured psychology profiles
   */
  transformToPsychologyProfiles(rawData: any[]): CustomerPsychologyProfile[] {
    return rawData.map((item, index) => ({
      customer_id: `enhanced_${index}`,
      decision_fatigue_score: this.parseNumber(item.fatigue_score || item.decision_fatigue || 50),
      optimal_choice_count: this.parseNumber(item.optimal_choices || item.choice_count || 5),
      emotional_triggers: this.parseEmotionalTriggers(item),
      behavioral_patterns: this.parseBehaviorPatterns(item),
      personality_type: item.personality_type || undefined,
      recovery_timing: this.parseNumber(item.recovery_time || item.break_time || 5),
      risk_level: this.parseRiskLevel(item.risk_level || item.fatigue_level),
      last_updated: new Date().toISOString()
    }));
  }

  /**
   * Transform raw data into career trajectory data
   */
  transformToCareerTrajectoryData(rawData: any[]): CareerTrajectoryData[] {
    return rawData.map((item, index) => ({
      customer_id: `career_${index}`,
      current_stage: this.parseCareerStage(item),
      industry: item.industry || 'general',
      role_level: this.parseRoleLevel(item.role_level || item.level),
      advancement_probability: this.parseNumber(item.advancement_probability || 50),
      predicted_timeline: this.parseTimeline(item),
      wardrobe_investment_pattern: this.parseInvestmentPattern(item),
      promotion_signals: this.parsePromotionSignals(item),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  /**
   * Helper methods for parsing and transforming data
   */
  private parseNumber(value: any): number {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  }

  private parseRiskLevel(value: any): 'low' | 'medium' | 'high' | 'critical' {
    if (!value) return 'low';
    const level = value.toString().toLowerCase();
    if (level.includes('critical') || level.includes('severe')) return 'critical';
    if (level.includes('high')) return 'high';
    if (level.includes('medium') || level.includes('moderate')) return 'medium';
    return 'low';
  }

  private parseEmotionalTriggers(item: any): any[] {
    const triggers = [];
    if (item.confidence_trigger) triggers.push({ trigger_type: 'confidence', intensity: 8, context: ['professional'], messaging_approach: 'confidence-building' });
    if (item.status_trigger) triggers.push({ trigger_type: 'status', intensity: 7, context: ['social'], messaging_approach: 'status-enhancing' });
    if (item.value_trigger) triggers.push({ trigger_type: 'value', intensity: 6, context: ['financial'], messaging_approach: 'value-focused' });
    return triggers.length > 0 ? triggers : [{ trigger_type: 'quality', intensity: 5, context: ['general'], messaging_approach: 'quality-focused' }];
  }

  private parseBehaviorPatterns(item: any): any[] {
    return [{
      pattern_type: 'browsing',
      frequency: 'regular',
      indicators: [item.browsing_pattern || 'standard'],
      optimization_strategy: 'personalized_recommendations'
    }];
  }

  private parseCareerStage(item: any): any {
    return {
      stage: this.parseStageFromData(item.stage || item.career_stage),
      age_range: item.age_range || '25-45',
      typical_wardrobe_needs: [item.wardrobe_need || 'business_professional'],
      investment_focus: [item.investment_focus || 'quality_basics'],
      style_evolution: item.style_evolution || 'progressive'
    };
  }

  private parseStageFromData(stage: any): 'entry_level' | 'establishing' | 'advancing' | 'leadership' | 'executive' {
    if (!stage) return 'establishing';
    const stageStr = stage.toString().toLowerCase();
    if (stageStr.includes('entry') || stageStr.includes('junior')) return 'entry_level';
    if (stageStr.includes('senior') || stageStr.includes('lead')) return 'leadership';
    if (stageStr.includes('executive') || stageStr.includes('director')) return 'executive';
    if (stageStr.includes('advanced') || stageStr.includes('advancing')) return 'advancing';
    return 'establishing';
  }

  private parseRoleLevel(level: any): 'entry' | 'mid' | 'senior' | 'executive' | 'c_level' {
    if (!level) return 'mid';
    const levelStr = level.toString().toLowerCase();
    if (levelStr.includes('entry') || levelStr.includes('junior')) return 'entry';
    if (levelStr.includes('senior')) return 'senior';
    if (levelStr.includes('executive') || levelStr.includes('director')) return 'executive';
    if (levelStr.includes('ceo') || levelStr.includes('cto') || levelStr.includes('c-level')) return 'c_level';
    return 'mid';
  }

  private parseTimeline(item: any): any {
    return {
      next_milestone: item.next_milestone || 'career_advancement',
      estimated_months: this.parseNumber(item.timeline_months || 12),
      confidence_level: this.parseNumber(item.confidence || 70),
      key_indicators: [item.indicator || 'performance_review']
    };
  }

  private parseInvestmentPattern(item: any): any {
    return {
      budget_range: item.budget_range || '$500-2000',
      spending_frequency: item.frequency || 'seasonal',
      quality_vs_quantity: item.approach || 'quality_focused',
      upgrade_triggers: [item.trigger || 'promotion']
    };
  }

  private parsePromotionSignals(item: any): any[] {
    return [{
      signal_type: 'wardrobe_upgrade',
      strength: this.parseNumber(item.signal_strength || 7),
      time_horizon: item.time_horizon || '6-12 months',
      recommended_actions: [item.recommendation || 'invest_in_quality_basics']
    }];
  }

  /**
   * Load all enhancement data in one operation
   */
  async loadAllEnhancementData(): Promise<{
    bodyLanguageFit: BodyLanguageFitPreferences;
    culturalNuances: any;
    venueIntelligence: any;
    untappedMarkets: any;
    microTrends: any;
    psychologyData: any[];
    careerData: any[];
    fabricData: any[];
    aiTrainingGaps: any[];
    competitorAnalysis: any[];
    colorScience: any[];
  }> {
    try {
      const [
        bodyLanguageFit,
        culturalNuances,
        venueIntelligence,
        untappedMarkets,
        microTrends,
        psychologyData,
        careerData,
        fabricData,
        aiTrainingGaps,
        competitorAnalysis,
        colorScience
      ] = await Promise.all([
        this.loadBodyLanguageFitPreferences(),
        this.loadCulturalNuances(),
        this.loadVenueIntelligence(),
        this.loadUntappedMarketsData(),
        this.loadMicroTrendData(),
        this.loadCustomerPsychologyData(),
        this.loadCareerTrajectoryData(),
        this.loadFabricPerformanceData(),
        this.loadAITrainingGapsData(),
        this.loadCompetitorAnalysisData(),
        this.loadColorScienceData()
      ]);

      return {
        bodyLanguageFit,
        culturalNuances,
        venueIntelligence,
        untappedMarkets,
        microTrends,
        psychologyData,
        careerData,
        fabricData,
        aiTrainingGaps,
        competitorAnalysis,
        colorScience
      };
    } catch (error) {
      console.error('Error loading enhancement data:', error);
      throw new Error(`Failed to load enhancement data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Check if enhancement data file exists
   */
  enhancementFileExists(filePath: string): boolean {
    try {
      const fullPath = path.join(this.enhancementDataPath, filePath);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }

  /**
   * Validate enhancement data integrity
   */
  async validateEnhancementDataIntegrity(): Promise<{
    valid: boolean;
    available_files: string[];
    missing_files: string[];
    total_data_points: number;
  }> {
    const expectedFiles = [
      'Body Language & Fit Preferences_ The Psychology of/body_language_fit_preferences.json',
      'Cultural & Regional Nuances_ Navigating the Unspok/cultural_regional_nuances.json',
      'Venue Microdata_ The Hidden Intelligence of Lighti/venue_microdata_analysis.json',
      'Untapped Markets_ Breaking Barriers to Expand Mens/untapped_menswear_markets.json',
      'Micro-Trend Detection in Menswear Formalwear_ The/micro_trend_detection_data.json'
    ];

    const result = {
      valid: true,
      available_files: [] as string[],
      missing_files: [] as string[],
      total_data_points: 0
    };

    for (const file of expectedFiles) {
      if (this.enhancementFileExists(file)) {
        result.available_files.push(file);
        result.total_data_points++;
      } else {
        result.missing_files.push(file);
      }
    }

    // If we have at least some data files, consider it partially valid
    result.valid = result.available_files.length > 0;

    return result;
  }
}

// Singleton instance
export const enhancedDataLoader = new EnhancedDataLoader();