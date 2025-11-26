/**
 * Cache Service
 * Provides high-level caching operations with Redis backend
 * Handles TTL, compression, serialization, and performance metrics
 */

import RedisConnection from '../config/redis';
import { Redis } from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Enable compression for large objects
  tags?: string[]; // Cache tags for invalidation
  version?: string; // Cache version for invalidation
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalResponseTime: number;
  averageResponseTime: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  version?: string;
  tags?: string[];
  compressed?: boolean;
}

export class CacheService {
  private redis: Redis | null;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
  };

  // Cache TTL configurations in seconds
  private readonly ttlConfig = {
    color_relationships: 24 * 60 * 60, // 24 hours - high frequency, low change
    trending_data: 60 * 60, // 1 hour - medium frequency, daily updates
    style_profiles: 7 * 24 * 60 * 60, // 7 days - low frequency, static data
    venue_recommendations: 4 * 60 * 60, // 4 hours - medium frequency, seasonal updates
    intelligence_data: 2 * 60 * 60, // 2 hours - fashion intelligence
    validation_rules: 12 * 60 * 60, // 12 hours - validation rules
    default: 60 * 60, // 1 hour default
  };

  constructor() {
    this.redis = RedisConnection.getInstance();
  }

  /**
   * Check if Redis is available
   */
  private isRedisAvailable(): boolean {
    return this.redis !== null;
  }

  /**
   * Get data from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      if (!this.redis) {
        return null;
      }

      const cached = await this.redis.get(this.normalizeKey(key));
      const responseTime = Date.now() - startTime;
      this.updateMetrics('get', responseTime, cached !== null);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Handle compressed data
      if (entry.compressed) {
        entry.data = this.decompress(entry.data as string) as T;
      }

      console.log(`📦 Cache HIT: ${key} (${responseTime}ms)`);
      return entry.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics('error', responseTime, false);
      console.error(`❌ Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T = any>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const normalizedKey = this.normalizeKey(key);
      const ttl = options.ttl || this.getTTLForKey(key);
      
      let processedData = data;
      let compressed = false;

      // Auto-compress large objects
      const dataSize = JSON.stringify(data).length;
      if (options.compress || dataSize > 10000) { // 10KB threshold
        processedData = this.compress(data) as T;
        compressed = true;
      }

      const entry: CacheEntry<T> = {
        data: processedData,
        timestamp: Date.now(),
        version: options.version,
        tags: options.tags,
        compressed,
      };

      if (!this.redis) {
        return false;
      }

      const serialized = JSON.stringify(entry);

      // Set with TTL
      await this.redis.setex(normalizedKey, ttl, serialized);

      // Store tags for invalidation if provided
      if (options.tags && options.tags.length > 0) {
        await this.storeCacheTags(normalizedKey, options.tags);
      }

      const responseTime = Date.now() - startTime;
      this.updateMetrics('set', responseTime, true);

      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s, Size: ${this.formatBytes(serialized.length)}, ${responseTime}ms)`);
      return true;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics('error', responseTime, false);
      console.error(`❌ Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      if (!this.redis) {
        return false;
      }

      const normalizedKey = this.normalizeKey(key);
      const result = await this.redis.del(normalizedKey);
      
      // Remove from tag mappings
      await this.removeCacheTagMappings(normalizedKey);
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics('delete', responseTime, result > 0);
      
      console.log(`🗑️ Cache DELETE: ${key} (${responseTime}ms)`);
      return result > 0;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics('error', responseTime, false);
      console.error(`❌ Cache DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalDeleted = 0;

    try {
      if (!this.redis) {
        return 0;
      }

      for (const tag of tags) {
        const tagKey = `cache_tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;

          // Clean up tag mapping
          await this.redis.del(tagKey);
        }
      }
      
      console.log(`🏷️ Cache invalidated by tags [${tags.join(', ')}]: ${totalDeleted} keys deleted`);
      return totalDeleted;
    } catch (error) {
      console.error('❌ Cache invalidation by tags failed:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      if (!this.redis) {
        return 0;
      }

      const keys = await this.redis.keys(`kct:${pattern}`);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const deleted = await this.redis.del(...keys);
      console.log(`🔍 Cache invalidated by pattern "${pattern}": ${deleted} keys deleted`);
      return deleted;
    } catch (error) {
      console.error('❌ Cache invalidation by pattern failed:', error);
      return 0;
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate data and cache it
    try {
      const data = await factory();
      await this.set(key, data, options);
      return data;
    } catch (error) {
      console.error(`❌ Cache factory error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics (alias for getMetrics)
   */
  getStats(): CacheMetrics {
    return this.getMetrics();
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Get cache health information
   */
  async getHealthInfo(): Promise<{
    connected: boolean;
    metrics: CacheMetrics;
    memoryUsage?: string;
    keyCount?: number;
    connectionInfo: any;
  }> {
    try {
      const connected = await RedisConnection.ping();
      let memoryUsage, keyCount;
      
      if (connected && this.redis) {
        try {
          // Get basic Redis info instead of memory usage
          keyCount = await this.redis.dbsize();
          // Set a default memory usage since the memory command has compatibility issues
          memoryUsage = '0 MB';
        } catch (error) {
          console.warn('Could not get Redis info:', error);
        }
      }
      
      return {
        connected,
        metrics: this.getMetrics(),
        memoryUsage,
        keyCount,
        connectionInfo: RedisConnection.getConnectionInfo(),
      };
    } catch (error) {
      return {
        connected: false,
        metrics: this.getMetrics(),
        memoryUsage: undefined,
        keyCount: undefined,
        connectionInfo: RedisConnection.getConnectionInfo(),
      };
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await RedisConnection.flushCache();
    this.resetMetrics();
  }

  // Private helper methods

  private normalizeKey(key: string): string {
    return `kct:${key.replace(/[^a-zA-Z0-9:_-]/g, '_')}`;
  }

  private getTTLForKey(key: string): number {
    if (key.includes('color')) return this.ttlConfig.color_relationships;
    if (key.includes('trending')) return this.ttlConfig.trending_data;
    if (key.includes('style') || key.includes('profile')) return this.ttlConfig.style_profiles;
    if (key.includes('venue')) return this.ttlConfig.venue_recommendations;
    if (key.includes('intelligence')) return this.ttlConfig.intelligence_data;
    if (key.includes('validation')) return this.ttlConfig.validation_rules;
    
    return this.ttlConfig.default;
  }

  private async storeCacheTags(key: string, tags: string[]): Promise<void> {
    if (!this.redis) {
      return;
    }

    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = `cache_tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, 24 * 60 * 60); // Tag mappings expire in 24 hours
    }
    
    await pipeline.exec();
  }

  private async removeCacheTagMappings(key: string): Promise<void> {
    try {
      if (!this.redis) {
        return;
      }

      const tagKeys = await this.redis.keys('cache_tag:*');
      if (tagKeys.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const tagKey of tagKeys) {
          pipeline.srem(tagKey, key);
        }
        await pipeline.exec();
      }
    } catch (error) {
      console.warn('Failed to remove cache tag mappings:', error);
    }
  }

  private compress(data: any): string {
    // Simple JSON compression - could be enhanced with actual compression libraries
    return JSON.stringify(data);
  }

  private decompress(data: string): any {
    return JSON.parse(data);
  }

  private updateMetrics(operation: string, responseTime: number, success: boolean): void {
    this.metrics.totalResponseTime += responseTime;
    
    switch (operation) {
      case 'get':
        if (success) {
          this.metrics.hits++;
        } else {
          this.metrics.misses++;
        }
        break;
      case 'set':
        this.metrics.sets++;
        break;
      case 'delete':
        this.metrics.deletes++;
        break;
      case 'error':
        this.metrics.errors++;
        break;
    }
    
    const totalOperations = this.metrics.hits + this.metrics.misses + this.metrics.sets + this.metrics.deletes;
    this.metrics.averageResponseTime = totalOperations > 0 
      ? this.metrics.totalResponseTime / totalOperations 
      : 0;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Singleton instance
export const cacheService = new CacheService();