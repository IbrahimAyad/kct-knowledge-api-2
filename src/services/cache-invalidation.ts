/**
 * Cache Invalidation Service
 * Provides intelligent cache invalidation strategies with dependency tracking
 * Handles versioning, cache warming, and strategic invalidation patterns
 */

import { cacheService } from './cache-service';
import { dataLoader } from '../utils/data-loader';

export interface InvalidationRule {
  trigger: string; // What triggers the invalidation
  patterns: string[]; // Cache patterns to invalidate
  tags?: string[]; // Cache tags to invalidate
  cascade?: boolean; // Whether to cascade invalidation
  delay?: number; // Delay before invalidation (ms)
}

export interface CacheVersion {
  version: string;
  timestamp: number;
  description: string;
}

export class CacheInvalidationService {
  private readonly invalidationRules: InvalidationRule[] = [
    // Color data changes
    {
      trigger: 'color_data_update',
      patterns: ['*color*', '*relationship*', '*complementary*'],
      tags: ['colors', 'relationships'],
      cascade: true,
    },
    // Trending data changes
    {
      trigger: 'trending_update',
      patterns: ['*trending*', '*intelligence*'],
      tags: ['trending', 'intelligence'],
      cascade: false,
    },
    // Style profile changes
    {
      trigger: 'style_profile_update',  
      patterns: ['*style*', '*profile*'],
      tags: ['styles', 'profiles'],
      cascade: true,
    },
    // Venue data changes
    {
      trigger: 'venue_update',
      patterns: ['*venue*', '*recommendation*'],
      tags: ['venues'],
      cascade: false,
    },
    // Validation rules changes
    {
      trigger: 'validation_rules_update',
      patterns: ['*validation*', '*rules*', '*never_combine*'],
      tags: ['validation', 'rules'],
      cascade: true,
    },
    // Seasonal data changes
    {
      trigger: 'seasonal_update',
      patterns: ['*seasonal*', '*fabric*', '*winter*', '*summer*'],
      tags: ['seasonal'],
      cascade: false,
    },
    // Full data refresh
    {
      trigger: 'full_refresh',
      patterns: ['*'],
      tags: ['colors', 'trending', 'styles', 'venues', 'intelligence', 'validation'],
      cascade: true,
    },
  ];

  private currentVersion: string = '1.0.0';
  private versionHistory: CacheVersion[] = [];

  /**
   * Invalidate cache based on trigger event
   */
  async invalidate(trigger: string, options: {
    immediate?: boolean;
    warmCache?: boolean;
    customPatterns?: string[];
    customTags?: string[];
  } = {}): Promise<{
    patternsInvalidated: number;
    tagsInvalidated: number;
    totalKeysDeleted: number;
    version: string;
  }> {
    console.log(`🔄 Starting cache invalidation for trigger: ${trigger}`);
    
    const rule = this.invalidationRules.find(r => r.trigger === trigger);
    if (!rule && !options.customPatterns && !options.customTags) {
      throw new Error(`No invalidation rule found for trigger: ${trigger}`);
    }

    const patterns = options.customPatterns || rule?.patterns || [];
    const tags = options.customTags || rule?.tags || [];
    const delay = rule?.delay || 0;

    if (delay > 0 && !options.immediate) {
      console.log(`⏱️ Delaying invalidation by ${delay}ms`);
      setTimeout(() => this.performInvalidation(patterns, tags, trigger), delay);
      return {
        patternsInvalidated: 0,
        tagsInvalidated: 0,
        totalKeysDeleted: 0,
        version: this.currentVersion,
      };
    }

    const result = await this.performInvalidation(patterns, tags, trigger);
    
    // Cache warming if requested
    if (options.warmCache) {
      await this.warmCache(trigger);
    }

    return result;
  }

  /**
   * Version-based cache invalidation
   */
  async invalidateByVersion(newVersion: string, description: string = ''): Promise<void> {
    console.log(`📦 Version-based cache invalidation: ${this.currentVersion} -> ${newVersion}`);
    
    // Store version history
    this.versionHistory.push({
      version: this.currentVersion,
      timestamp: Date.now(),
      description: `Invalidated for version ${newVersion}`,
    });

    // Update current version
    const oldVersion = this.currentVersion;
    this.currentVersion = newVersion;

    // Invalidate all caches with old version
    await this.invalidateVersionedCache(oldVersion);
    
    // Store new version in cache
    await cacheService.set('cache:version', {
      version: newVersion,
      timestamp: Date.now(),
      description,
    }, { ttl: 24 * 60 * 60 }); // 24 hours
  }

  /**
   * Smart cache warming after invalidation
   */
  async warmCache(trigger: string): Promise<void> {
    console.log(`🔥 Starting cache warming for trigger: ${trigger}`);

    try {
      const warmingTasks: Promise<any>[] = [];

      // Warm based on trigger type
      switch (trigger) {
        case 'color_data_update':
          warmingTasks.push(this.warmColorData());
          break;
        case 'trending_update':
          warmingTasks.push(this.warmTrendingData());
          break;
        case 'style_profile_update':
          warmingTasks.push(this.warmStyleProfiles());
          break;
        case 'venue_update':
          warmingTasks.push(this.warmVenueData());
          break;
        case 'full_refresh':
          warmingTasks.push(
            this.warmColorData(),
            this.warmTrendingData(),
            this.warmStyleProfiles(),
            this.warmVenueData()
          );
          break;
      }

      await Promise.allSettled(warmingTasks);
      console.log(`✅ Cache warming completed for trigger: ${trigger}`);
    } catch (error) {
      console.error(`❌ Cache warming failed for trigger ${trigger}:`, error);
    }
  }

  /**
   * Schedule periodic cache refresh
   */
  schedulePeriodicRefresh(): void {
    // Refresh trending data every hour
    setInterval(async () => {
      try {
        await this.invalidate('trending_update', { warmCache: true });
      } catch (error) {
        console.error('Scheduled trending refresh failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Refresh color relationships daily
    setInterval(async () => {
      try {
        await this.invalidate('color_data_update', { warmCache: true });
      } catch (error) {
        console.error('Scheduled color data refresh failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Refresh style profiles weekly
    setInterval(async () => {
      try {
        await this.invalidate('style_profile_update', { warmCache: true });
      } catch (error) {
        console.error('Scheduled style profile refresh failed:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // 7 days

    console.log('📅 Periodic cache refresh scheduled');
  }

  /**
   * Get invalidation statistics
   */
  getInvalidationStats(): {
    currentVersion: string;
    versionHistory: CacheVersion[];
    availableRules: string[];
    lastInvalidation?: Date;
  } {
    return {
      currentVersion: this.currentVersion,
      versionHistory: [...this.versionHistory],
      availableRules: this.invalidationRules.map(r => r.trigger),
      lastInvalidation: this.versionHistory.length > 0 
        ? new Date(this.versionHistory[this.versionHistory.length - 1].timestamp)
        : undefined,
    };
  }

  /**
   * Manual cache cleanup
   */
  async cleanup(options: {
    removeExpired?: boolean;
    removeOldVersions?: boolean;
    compactMemory?: boolean;
  } = {}): Promise<{
    expiredKeysRemoved?: number;
    oldVersionsRemoved?: number;
    memoryCompacted?: boolean;
  }> {
    const result: any = {};

    try {
      if (options.removeExpired) {
        // Redis handles expired key removal automatically
        // But we can trigger cleanup manually if needed
        result.expiredKeysRemoved = 0;
      }

      if (options.removeOldVersions) {
        // Remove old version entries
        const oldVersions = this.versionHistory.filter(
          v => Date.now() - v.timestamp > 7 * 24 * 60 * 60 * 1000 // Older than 7 days
        );
        
        result.oldVersionsRemoved = oldVersions.length;
        this.versionHistory = this.versionHistory.filter(
          v => Date.now() - v.timestamp <= 7 * 24 * 60 * 60 * 1000
        );
      }

      if (options.compactMemory) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          result.memoryCompacted = true;
        }
      }

      console.log('🧹 Cache cleanup completed:', result);
      return result;
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private async performInvalidation(
    patterns: string[],
    tags: string[],
    trigger: string
  ): Promise<{
    patternsInvalidated: number;
    tagsInvalidated: number;
    totalKeysDeleted: number;
    version: string;
  }> {
    let totalKeysDeleted = 0;
    let patternsInvalidated = 0;
    let tagsInvalidated = 0;

    // Invalidate by patterns
    for (const pattern of patterns) {
      const deleted = await cacheService.invalidateByPattern(pattern);
      totalKeysDeleted += deleted;
      if (deleted > 0) patternsInvalidated++;
    }

    // Invalidate by tags
    if (tags.length > 0) {
      const deleted = await cacheService.invalidateByTags(tags);
      totalKeysDeleted += deleted;
      tagsInvalidated = tags.length;
    }

    console.log(`✅ Cache invalidation completed for ${trigger}: ${totalKeysDeleted} keys deleted`);

    return {
      patternsInvalidated,
      tagsInvalidated,
      totalKeysDeleted,
      version: this.currentVersion,
    };
  }

  private async invalidateVersionedCache(version: string): Promise<void> {
    await cacheService.invalidateByPattern(`*:v${version}:*`);
    await cacheService.invalidateByTags([`v${version}`]);
  }

  private async warmColorData(): Promise<void> {
    try {
      const colorData = await dataLoader.loadColorRelationships();
      await cacheService.set('color:relationships', colorData, {
        ttl: 24 * 60 * 60,
        tags: ['colors', 'relationships'],
        version: this.currentVersion,
      });

      const formalityData = await dataLoader.loadFormalityIndex();
      await cacheService.set('color:formality', formalityData, {
        ttl: 24 * 60 * 60,
        tags: ['colors', 'formality'],
        version: this.currentVersion,
      });
    } catch (error) {
      console.error('Failed to warm color data:', error);
    }
  }

  private async warmTrendingData(): Promise<void> {
    try {
      const trendingData = await dataLoader.loadIntelligenceData('trending-now.json');
      await cacheService.set('trending:now', trendingData, {
        ttl: 60 * 60, // 1 hour
        tags: ['trending', 'intelligence'],
        version: this.currentVersion,
      });
    } catch (error) {
      console.error('Failed to warm trending data:', error);
    }
  }

  private async warmStyleProfiles(): Promise<void> {
    try {
      const styleProfiles = await dataLoader.loadTrainingData('style-profiles.json');
      await cacheService.set('styles:profiles', styleProfiles, {
        ttl: 7 * 24 * 60 * 60, // 7 days
        tags: ['styles', 'profiles'],
        version: this.currentVersion,
      });
    } catch (error) {
      console.error('Failed to warm style profiles:', error);
    }
  }

  private async warmVenueData(): Promise<void> {
    try {
      const venueData = await dataLoader.loadCoreData('venue-compatibility.json');
      await cacheService.set('venues:compatibility', venueData, {
        ttl: 4 * 60 * 60, // 4 hours
        tags: ['venues', 'compatibility'],
        version: this.currentVersion,
      });
    } catch (error) {
      console.error('Failed to warm venue data:', error);
    }
  }
}

// Singleton instance
export const cacheInvalidationService = new CacheInvalidationService();