/**
 * Recommendation Analytics Service
 * Tracks recommendation engagement, clicks, and conversions
 */

import RedisConnection from '../config/redis';

export interface RecommendationEvent {
  eventType: 'view' | 'click' | 'add_to_cart' | 'purchase';
  productId: string;
  productTitle?: string;
  occasion?: string;
  source: 'trending' | 'ai' | 'similar' | 'color' | 'style';
  sessionId?: string;
  timestamp: number;
}

export interface RecommendationMetrics {
  totalViews: number;
  totalClicks: number;
  totalAddToCarts: number;
  totalPurchases: number;
  clickThroughRate: number;
  addToCartRate: number;
  conversionRate: number;
}

export interface ProductPerformance {
  productId: string;
  productTitle: string;
  views: number;
  clicks: number;
  addToCarts: number;
  purchases: number;
  ctr: number; // Click-through rate
  conversionRate: number;
}

export interface OccasionPerformance {
  occasion: string;
  views: number;
  clicks: number;
  topProducts: string[];
}

export class RecommendationAnalyticsService {
  private get redis() {
    const client = RedisConnection.getInstance();
    if (!client) {
      throw new Error('Redis connection not available');
    }
    return client;
  }
  private readonly ANALYTICS_TTL = 90 * 24 * 60 * 60; // 90 days

  /**
   * Track a recommendation event
   */
  async trackEvent(event: RecommendationEvent): Promise<void> {
    try {
      const redis = this.redis;
      const now = Date.now();
      const dateKey = this.getDateKey();

      // Increment global counters
      await redis.incr(`analytics:recommendations:${event.eventType}:total`);
      await redis.incr(`analytics:recommendations:${event.eventType}:${dateKey}`);

      // Track by product
      await redis.zincrby(
        `analytics:products:${event.eventType}`,
        1,
        event.productId
      );

      // Track by occasion
      if (event.occasion) {
        await redis.zincrby(
          `analytics:occasions:${event.occasion}:${event.eventType}`,
          1,
          event.productId
        );
        await redis.incr(
          `analytics:occasions:${event.occasion}:${event.eventType}:count`
        );
      }

      // Track by source
      await redis.incr(
        `analytics:source:${event.source}:${event.eventType}`
      );

      // Store product title for later retrieval
      if (event.productTitle) {
        await redis.hset(
          'analytics:products:titles',
          event.productId,
          event.productTitle
        );
      }

      // Track session attribution if provided
      if (event.sessionId) {
        await this.trackSessionAttribution(event.sessionId, event);
      }

      // Set TTL on time-based keys
      await redis.expire(
        `analytics:recommendations:${event.eventType}:${dateKey}`,
        this.ANALYTICS_TTL
      );
    } catch (error) {
      console.error('Error tracking recommendation event:', error);
      // Don't throw - tracking failures shouldn't break API
    }
  }

  /**
   * Track session attribution (which recommendations led to which actions)
   */
  private async trackSessionAttribution(
    sessionId: string,
    event: RecommendationEvent
  ): Promise<void> {
    const redis = this.redis;
    const sessionKey = `analytics:session:${sessionId}`;

    // Store event in session timeline
    await redis.zadd(sessionKey, event.timestamp, JSON.stringify(event));

    // Set session TTL to 24 hours
    await redis.expire(sessionKey, 24 * 60 * 60);
  }

  /**
   * Get overall recommendation metrics
   */
  async getMetrics(days: number = 7): Promise<RecommendationMetrics> {
    try {
      const [views, clicks, addToCarts, purchases] = await Promise.all([
        this.getEventCountForPeriod('view', days),
        this.getEventCountForPeriod('click', days),
        this.getEventCountForPeriod('add_to_cart', days),
        this.getEventCountForPeriod('purchase', days),
      ]);

      const clickThroughRate = views > 0 ? (clicks / views) * 100 : 0;
      const addToCartRate = clicks > 0 ? (addToCarts / clicks) * 100 : 0;
      const conversionRate = views > 0 ? (purchases / views) * 100 : 0;

      return {
        totalViews: views,
        totalClicks: clicks,
        totalAddToCarts: addToCarts,
        totalPurchases: purchases,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        addToCartRate: Math.round(addToCartRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error fetching recommendation metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get top performing products
   */
  async getTopProducts(
    eventType: 'view' | 'click' | 'add_to_cart' | 'purchase' = 'click',
    limit: number = 10
  ): Promise<ProductPerformance[]> {
    try {
      // Get top products by event type
      const topProductIds = await this.redis.zrevrange(
        `analytics:products:${eventType}`,
        0,
        limit - 1,
        'WITHSCORES'
      );

      const products: ProductPerformance[] = [];

      // Process pairs of [productId, score]
      for (let i = 0; i < topProductIds.length; i += 2) {
        const productId = topProductIds[i];
        const eventCount = parseInt(topProductIds[i + 1]);

        // Get counts for all event types for this product
        const [views, clicks, addToCarts, purchases, title] = await Promise.all([
          this.redis.zscore('analytics:products:view', productId),
          this.redis.zscore('analytics:products:click', productId),
          this.redis.zscore('analytics:products:add_to_cart', productId),
          this.redis.zscore('analytics:products:purchase', productId),
          this.redis.hget('analytics:products:titles', productId),
        ]);

        const viewCount = parseInt(views || '0');
        const clickCount = parseInt(clicks || '0');
        const addToCartCount = parseInt(addToCarts || '0');
        const purchaseCount = parseInt(purchases || '0');

        const ctr = viewCount > 0 ? (clickCount / viewCount) * 100 : 0;
        const conversionRate = viewCount > 0 ? (purchaseCount / viewCount) * 100 : 0;

        products.push({
          productId,
          productTitle: title || 'Unknown Product',
          views: viewCount,
          clicks: clickCount,
          addToCarts: addToCartCount,
          purchases: purchaseCount,
          ctr: Math.round(ctr * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
        });
      }

      return products;
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  /**
   * Get performance by occasion
   */
  async getOccasionPerformance(limit: number = 10): Promise<OccasionPerformance[]> {
    try {
      // Get all occasion keys
      const occasionKeys = await this.redis.keys('analytics:occasions:*:view:count');

      const occasions: OccasionPerformance[] = [];

      for (const key of occasionKeys) {
        const occasion = key.split(':')[2]; // Extract occasion name

        const [views, clicks, topProducts] = await Promise.all([
          this.redis.get(`analytics:occasions:${occasion}:view:count`),
          this.redis.get(`analytics:occasions:${occasion}:click:count`),
          this.redis.zrevrange(`analytics:occasions:${occasion}:click`, 0, 4),
        ]);

        occasions.push({
          occasion,
          views: parseInt(views || '0'),
          clicks: parseInt(clicks || '0'),
          topProducts,
        });
      }

      // Sort by views descending
      occasions.sort((a, b) => b.views - a.views);

      return occasions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching occasion performance:', error);
      return [];
    }
  }

  /**
   * Get performance by source (trending, ai, similar, etc.)
   */
  async getSourcePerformance() {
    try {
      const sources = ['trending', 'ai', 'similar', 'color', 'style'];

      const performance = await Promise.all(
        sources.map(async (source) => {
          const [views, clicks, addToCarts, purchases] = await Promise.all([
            this.redis.get(`analytics:source:${source}:view`),
            this.redis.get(`analytics:source:${source}:click`),
            this.redis.get(`analytics:source:${source}:add_to_cart`),
            this.redis.get(`analytics:source:${source}:purchase`),
          ]);

          const viewCount = parseInt(views || '0');
          const clickCount = parseInt(clicks || '0');
          const ctr = viewCount > 0 ? (clickCount / viewCount) * 100 : 0;

          return {
            source,
            views: viewCount,
            clicks: clickCount,
            addToCarts: parseInt(addToCarts || '0'),
            purchases: parseInt(purchases || '0'),
            ctr: Math.round(ctr * 100) / 100,
          };
        })
      );

      return performance.sort((a, b) => b.views - a.views);
    } catch (error) {
      console.error('Error fetching source performance:', error);
      return [];
    }
  }

  /**
   * Get session journey (attribution path)
   */
  async getSessionJourney(sessionId: string): Promise<RecommendationEvent[]> {
    try {
      const sessionKey = `analytics:session:${sessionId}`;
      const events = await this.redis.zrange(sessionKey, 0, -1);

      return events.map((eventStr: string) => JSON.parse(eventStr));
    } catch (error) {
      console.error('Error fetching session journey:', error);
      return [];
    }
  }

  /**
   * Get trending products (most viewed/clicked recently)
   */
  async getTrendingProducts(hours: number = 24, limit: number = 10) {
    try {
      // This would require time-windowed data
      // For now, return top clicked products from all-time data
      return this.getTopProducts('click', limit);
    } catch (error) {
      console.error('Error fetching trending products:', error);
      return [];
    }
  }

  /**
   * Clear analytics data (for testing or reset)
   */
  async clearAnalytics(): Promise<void> {
    try {
      const keys = await this.redis.keys('analytics:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error clearing analytics:', error);
      throw error;
    }
  }

  // Helper methods

  private async getEventCountForPeriod(
    eventType: string,
    days: number
  ): Promise<number> {
    const counts: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = this.formatDateKey(date);

      const count = await this.redis.get(
        `analytics:recommendations:${eventType}:${dateKey}`
      );
      counts.push(parseInt(count || '0'));
    }

    return counts.reduce((sum, count) => sum + count, 0);
  }

  private getDateKey(): string {
    return this.formatDateKey(new Date());
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getEmptyMetrics(): RecommendationMetrics {
    return {
      totalViews: 0,
      totalClicks: 0,
      totalAddToCarts: 0,
      totalPurchases: 0,
      clickThroughRate: 0,
      addToCartRate: 0,
      conversionRate: 0,
    };
  }
}

// Singleton instance
export const recommendationAnalyticsService = new RecommendationAnalyticsService();
