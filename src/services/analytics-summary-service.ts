/**
 * Analytics Summary Service
 * Provides aggregated metrics for dashboard widgets and analytics displays
 */

import { trendingAnalysisService } from './trending-analysis-service';
import { colorService } from './color-service';
import { conversionService } from './conversion-service';
import { logger } from '../utils/logger';

interface AnalyticsSummary {
  overview: {
    total_trending_combinations: number;
    total_colors_tracked: number;
    average_conversion_rate: number;
    top_performing_category: string;
    last_updated: string;
  };
  trending_highlights: {
    top_combination: any;
    fastest_growing_color: any;
    top_venue_type: string;
    top_demographic: string;
  };
  color_performance: {
    most_popular_suit_color: any;
    most_popular_shirt_color: any;
    most_popular_tie_color: any;
    trending_count: number;
  };
  conversion_metrics: {
    average_rate: number;
    best_performing_occasion: string;
    best_performing_combination: any;
    total_tracked_combinations: number;
  };
  alerts: {
    stock_warnings: number;
    trend_shifts: number;
    opportunities: number;
  };
  cache_info: {
    cached: boolean;
    ttl: number;
    generated_at: string;
  };
}

class AnalyticsSummaryService {
  private cache: AnalyticsSummary | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  /**
   * Get comprehensive analytics summary
   */
  async getSummary(): Promise<AnalyticsSummary> {
    try {
      // Check cache
      if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
        logger.info('Analytics summary served from cache');
        return {
          ...this.cache,
          cache_info: {
            cached: true,
            ttl: Math.floor((this.CACHE_TTL - (Date.now() - this.cacheTimestamp)) / 1000),
            generated_at: new Date(this.cacheTimestamp).toISOString()
          }
        };
      }

      logger.info('Generating fresh analytics summary');

      // Fetch data in parallel
      const [
        trendingCombinations,
        trendingColors,
        colorFamilies,
        topCombinations,
        trendingAlerts
      ] = await Promise.all([
        trendingAnalysisService.getTrendingCombinations(10, '7d'),
        trendingAnalysisService.getTrendingColors(),
        colorService.getColorFamilies(),
        conversionService.getTopConvertingCombinations(10),
        trendingAnalysisService.getTrendingAlerts()
      ]);

      // Calculate metrics
      const avgConversionRate = this.calculateAverageConversion(trendingCombinations);
      const topPerformingCategory = this.getTopCategory(trendingCombinations);
      const colorsByCategory = this.groupColorsByCategory(trendingColors);

      const summary: AnalyticsSummary = {
        overview: {
          total_trending_combinations: trendingCombinations.length,
          total_colors_tracked: trendingColors.length,
          average_conversion_rate: avgConversionRate,
          top_performing_category: topPerformingCategory,
          last_updated: new Date().toISOString()
        },
        trending_highlights: {
          top_combination: trendingCombinations[0] || null,
          fastest_growing_color: this.getFastestGrowingColor(trendingColors),
          top_venue_type: this.getTopVenueType(trendingCombinations),
          top_demographic: this.getTopDemographic(trendingCombinations)
        },
        color_performance: {
          most_popular_suit_color: colorsByCategory.suits?.[0] || null,
          most_popular_shirt_color: colorsByCategory.shirts?.[0] || null,
          most_popular_tie_color: colorsByCategory.ties?.[0] || null,
          trending_count: trendingColors.length
        },
        conversion_metrics: {
          average_rate: avgConversionRate,
          best_performing_occasion: this.getBestOccasion(topCombinations),
          best_performing_combination: topCombinations[0] || null,
          total_tracked_combinations: topCombinations.length
        },
        alerts: {
          stock_warnings: trendingAlerts.stock_warnings?.length || 0,
          trend_shifts: trendingAlerts.market_shifts?.length || 0,
          opportunities: trendingAlerts.opportunity_alerts?.length || 0
        },
        cache_info: {
          cached: false,
          ttl: this.CACHE_TTL / 1000,
          generated_at: new Date().toISOString()
        }
      };

      // Cache the result
      this.cache = summary;
      this.cacheTimestamp = Date.now();

      logger.info('Analytics summary generated and cached', {
        metadata: {
          combinations: summary.overview.total_trending_combinations,
          colors: summary.overview.total_colors_tracked
        }
      });

      return summary;
    } catch (error) {
      logger.error('Failed to generate analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get quick stats for lightweight requests
   */
  async getQuickStats() {
    try {
      const summary = await this.getSummary();
      return {
        trending_count: summary.overview.total_trending_combinations,
        avg_conversion: summary.overview.average_conversion_rate,
        alerts_count: summary.alerts.stock_warnings + summary.alerts.trend_shifts,
        last_updated: summary.overview.last_updated
      };
    } catch (error) {
      logger.error('Failed to get quick stats:', error);
      throw error;
    }
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = 0;
    logger.info('Analytics cache cleared');
  }

  // Helper methods
  private calculateAverageConversion(combinations: any[]): number {
    if (!combinations.length) return 0;
    const sum = combinations.reduce((acc, combo) => acc + (combo.conversion_rate || 0), 0);
    return Math.round((sum / combinations.length) * 1000) / 1000;
  }

  private getTopCategory(combinations: any[]): string {
    if (!combinations.length) return 'suits';
    // Simple logic - could be enhanced
    return 'suits';
  }

  private groupColorsByCategory(colors: any[]) {
    return colors.reduce((acc, color) => {
      const category = color.category || 'suits';
      if (!acc[category]) acc[category] = [];
      acc[category].push(color);
      return acc;
    }, {} as Record<string, any[]>);
  }

  private getFastestGrowingColor(colors: any[]) {
    if (!colors.length) return null;
    return colors.sort((a, b) => {
      const aGrowth = parseFloat(a.growth_rate?.replace('%', '') || '0');
      const bGrowth = parseFloat(b.growth_rate?.replace('%', '') || '0');
      return bGrowth - aGrowth;
    })[0];
  }

  private getTopVenueType(combinations: any[]): string {
    // Extract from target demographics
    const venues = combinations.flatMap(c =>
      c.target_demographics?.filter((d: string) =>
        ['church', 'beach', 'garden', 'ballroom'].some(v => d.includes(v))
      ) || []
    );
    return venues[0] || 'mixed';
  }

  private getTopDemographic(combinations: any[]): string {
    const demographics = combinations.flatMap(c => c.target_demographics || []);
    const counts = demographics.reduce((acc, demo) => {
      acc[demo] = (acc[demo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
    return sorted[0]?.[0] || '25-35 professionals';
  }

  private getBestOccasion(combinations: any[]): string {
    if (!combinations.length) return 'wedding';

    // Extract occasions from combinations
    const occasions: Record<string, number> = {};
    combinations.forEach((combo: any) => {
      if (combo.occasion) {
        occasions[combo.occasion] = (occasions[combo.occasion] || 0) + 1;
      }
    });

    // Find most common occasion
    const sorted = Object.entries(occasions).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'wedding';
  }
}

export const analyticsSummaryService = new AnalyticsSummaryService();
