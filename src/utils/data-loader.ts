/**
 * Data Loader Utilities for KCT Knowledge Bank
 * Handles loading, caching, and processing of knowledge data
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  KnowledgeBankIndex,
  ColorRelationships,
  FormalityIndex,
  StyleProfiles,
  ConversionRates,
  ApiResponse
} from '../types/knowledge-bank';

class DataLoader {
  private dataPath: string;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.dataPath = path.join(__dirname, '../data');
  }

  /**
   * Load and parse JSON file with error handling
   */
  public loadJsonFile<T>(filePath: string): T {
    const cacheKey = filePath;
    const now = Date.now();

    // Check cache first
    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.cache.get(cacheKey);
    }

    try {
      const fullPath = path.join(this.dataPath, filePath);
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Cache the data
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

      return data;
    } catch (error) {
      throw new Error(`Failed to load ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load the main knowledge bank index
   */
  async loadIndex(): Promise<KnowledgeBankIndex> {
    return this.loadJsonFile<KnowledgeBankIndex>('index.json');
  }

  /**
   * Load color relationships data
   */
  async loadColorRelationships(): Promise<ColorRelationships> {
    return this.loadJsonFile<ColorRelationships>('core/color-relationships.json');
  }

  /**
   * Load formality index data
   */
  async loadFormalityIndex(): Promise<FormalityIndex> {
    return this.loadJsonFile<FormalityIndex>('core/formality-index.json');
  }

  /**
   * Load style profiles data
   */
  async loadStyleProfiles(): Promise<StyleProfiles> {
    return this.loadJsonFile<StyleProfiles>('training/style-profiles.json');
  }

  /**
   * Load conversion rates data
   */
  async loadConversionRates(): Promise<ConversionRates> {
    return this.loadJsonFile<ConversionRates>('intelligence/conversion-rates.json');
  }

  /**
   * Load fabric seasonality data
   */
  async loadFabricSeasonality(): Promise<any> {
    return this.loadJsonFile('core/fabric-seasonality.json');
  }

  /**
   * Load venue compatibility data
   */
  async loadVenueCompatibility(): Promise<any> {
    return this.loadJsonFile('core/venue-compatibility.json');
  }

  /**
   * Load never combine rules
   */
  async loadNeverCombineRules(): Promise<any> {
    return this.loadJsonFile('core/never-combine-rules.json');
  }

  /**
   * Load customer conversations training data
   */
  async loadCustomerConversations(): Promise<any> {
    return this.loadJsonFile('training/customer-conversations.json');
  }

  /**
   * Load successful upsells data
   */
  async loadSuccessfulUpsells(): Promise<any> {
    return this.loadJsonFile('training/successful-upsells.json');
  }

  /**
   * Load trending data
   */
  async loadTrendingData(): Promise<any> {
    return this.loadJsonFile('intelligence/trending-now.json');
  }

  /**
   * Load seasonal champions data
   */
  async loadSeasonalChampions(): Promise<any> {
    return this.loadJsonFile('intelligence/seasonal-champions.json');
  }

  /**
   * Load top 10 all-time combinations
   */
  async loadTop10AllTime(): Promise<any> {
    return this.loadJsonFile('intelligence/top-10-all-time.json');
  }

  /**
   * Load age demographics data
   */
  async loadAgeDemographics(): Promise<any> {
    return this.loadJsonFile('intelligence/age-demographics.json');
  }

  /**
   * Load cart abandonment data
   */
  async loadCartAbandonment(): Promise<any> {
    return this.loadJsonFile('intelligence/cart-abandonment.json');
  }

  /**
   * Load regional preferences data
   */
  async loadRegionalPreferences(): Promise<any> {
    return this.loadJsonFile('intelligence/regional-preferences.json');
  }

  /**
   * Load color hex mapping
   */
  async loadColorHexMapping(): Promise<any> {
    return this.loadJsonFile('visual/color-hex-mapping.json');
  }

  /**
   * Load Instagram winners data
   */
  async loadInstagramWinners(): Promise<any> {
    return this.loadJsonFile('visual/instagram-winners.json');
  }

  /**
   * Load texture compatibility data
   */
  async loadTextureCompatibility(): Promise<any> {
    return this.loadJsonFile('visual/texture-compatibility.json');
  }

  /**
   * Load combination validator rules
   */
  async loadCombinationValidator(): Promise<any> {
    return this.loadJsonFile('validation/combination-validator.json');
  }

  /**
   * Load edge cases data
   */
  async loadEdgeCases(): Promise<any> {
    return this.loadJsonFile('validation/edge-cases.json');
  }

  /**
   * Load all core data at once
   */
  async loadAllCoreData(): Promise<{
    colorRelationships: ColorRelationships;
    formalityIndex: FormalityIndex;
    fabricSeasonality: any;
    venueCompatibility: any;
    neverCombineRules: any;
  }> {
    const [
      colorRelationships,
      formalityIndex,
      fabricSeasonality,
      venueCompatibility,
      neverCombineRules
    ] = await Promise.all([
      this.loadColorRelationships(),
      this.loadFormalityIndex(),
      this.loadFabricSeasonality(),
      this.loadVenueCompatibility(),
      this.loadNeverCombineRules()
    ]);

    return {
      colorRelationships,
      formalityIndex,
      fabricSeasonality,
      venueCompatibility,
      neverCombineRules
    };
  }

  /**
   * Load all training data at once
   */
  async loadAllTrainingData(): Promise<{
    styleProfiles: StyleProfiles;
    customerConversations: any;
    successfulUpsells: any;
  }> {
    const [
      styleProfiles,
      customerConversations,
      successfulUpsells
    ] = await Promise.all([
      this.loadStyleProfiles(),
      this.loadCustomerConversations(),
      this.loadSuccessfulUpsells()
    ]);

    return {
      styleProfiles,
      customerConversations,
      successfulUpsells
    };
  }

  /**
   * Load all intelligence data at once
   */
  async loadAllIntelligenceData(): Promise<{
    conversionRates: ConversionRates;
    trendingData: any;
    seasonalChampions: any;
    top10AllTime: any;
    ageDemographics: any;
    cartAbandonment: any;
    regionalPreferences: any;
  }> {
    const [
      conversionRates,
      trendingData,
      seasonalChampions,
      top10AllTime,
      ageDemographics,
      cartAbandonment,
      regionalPreferences
    ] = await Promise.all([
      this.loadConversionRates(),
      this.loadTrendingData(),
      this.loadSeasonalChampions(),
      this.loadTop10AllTime(),
      this.loadAgeDemographics(),
      this.loadCartAbandonment(),
      this.loadRegionalPreferences()
    ]);

    return {
      conversionRates,
      trendingData,
      seasonalChampions,
      top10AllTime,
      ageDemographics,
      cartAbandonment,
      regionalPreferences
    };
  }

  /**
   * Clear cache (useful for testing or forced refresh)
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
   * Check if data file exists
   */
  fileExists(filePath: string): boolean {
    try {
      const fullPath = path.join(this.dataPath, filePath);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }

  /**
   * Get file modification time for cache invalidation
   */
  getFileModificationTime(filePath: string): Date | null {
    try {
      const fullPath = path.join(this.dataPath, filePath);
      const stats = fs.statSync(fullPath);
      return stats.mtime;
    } catch {
      return null;
    }
  }

  /**
   * Load data from core directory
   */
  async loadCoreData(filename: string): Promise<any> {
    return this.loadJsonFile(`core/${filename}`);
  }

  /**
   * Load data from intelligence directory
   */
  async loadIntelligenceData(filename: string): Promise<any> {
    return this.loadJsonFile(`intelligence/${filename}`);
  }

  /**
   * Load data from training directory
   */
  async loadTrainingData(filename: string): Promise<any> {
    return this.loadJsonFile(`training/${filename}`);
  }

  /**
   * Load data from visual directory
   */
  async loadVisualData(filename: string): Promise<any> {
    return this.loadJsonFile(`visual/${filename}`);
  }

  /**
   * Load data from validation directory
   */
  async loadValidationData(filename: string): Promise<any> {
    return this.loadJsonFile(`validation/${filename}`);
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(): Promise<{
    valid: boolean;
    missing_files: string[];
    corrupted_files: string[];
  }> {
    const result = {
      valid: true,
      missing_files: [] as string[],
      corrupted_files: [] as string[]
    };

    try {
      const index = await this.loadIndex();
      const allFiles = [
        ...index.files.core.map(f => `core/${f}`),
        ...index.files.training.map(f => `training/${f}`),
        ...index.files.intelligence.map(f => `intelligence/${f}`),
        ...index.files.visual.map(f => `visual/${f}`),
        ...index.files.validation.map(f => `validation/${f}`)
      ];

      for (const file of allFiles) {
        if (!this.fileExists(file)) {
          result.missing_files.push(file);
          result.valid = false;
        } else {
          try {
            this.loadJsonFile(file);
          } catch (error) {
            result.corrupted_files.push(file);
            result.valid = false;
          }
        }
      }
    } catch (error) {
      result.missing_files.push('index.json');
      result.valid = false;
    }

    return result;
  }
}

// Singleton instance
export const dataLoader = new DataLoader();

/**
 * Load data file helper for validation engines
 */
export async function loadDataFile(filePath: string): Promise<any> {
  return dataLoader.loadJsonFile(filePath);
}

/**
 * Helper function to create standardized API responses
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString()
  };
}

/**
 * Error handling wrapper for data loading operations
 */
export async function safeLoadData<T>(
  loadFunction: () => Promise<T>
): Promise<ApiResponse<T>> {
  try {
    const data = await loadFunction();
    return createApiResponse(true, data);
  } catch (error) {
    return createApiResponse<T>(
      false,
      undefined,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}