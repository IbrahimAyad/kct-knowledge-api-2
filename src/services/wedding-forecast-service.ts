/**
 * Wedding 2026 Color Forecast Service
 * Section 3.1: Maps 2026 wedding color trends to KCT products
 * Loads wedding-2026-color-forecast.json and provides trend-driven color recommendations
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface WeddingColor {
  rank: number;
  color: string;
  aliases: string[];
  market_share_pct: string;
  trend_driver: string;
  kct_suit_colors: string[];
  kct_tie_matches: string[];
  formality: string;
  best_seasons: string[];
  best_venues: string[];
  styling_formula: StylingFormula;
  pairs_with_bride: string[];
}

export interface WeddingColorDetail extends WeddingColor {}

export interface StylingFormula {
  suit: string;
  shirt: string;
  tie: string;
  shoes: string;
  accessories?: string;
}

class WeddingForecastService {
  private forecast: any = null;

  constructor() {
    this.loadForecast();
  }

  /**
   * Load wedding 2026 color forecast from JSON
   */
  private loadForecast(): void {
    try {
      const forecastPath = path.join(__dirname, '../data/intelligence/wedding-2026-color-forecast.json');
      const raw = fs.readFileSync(forecastPath, 'utf8');
      this.forecast = JSON.parse(raw);
      logger.info('💍 Wedding 2026 color forecast loaded successfully');
    } catch (error) {
      logger.warn('Wedding 2026 color forecast not loaded', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get top N wedding colors sorted by market share
   */
  getTopWeddingColors(limit?: number): WeddingColor[] {
    if (!this.forecast?.top_colors) return [];

    const colors = this.forecast.top_colors;
    const sortedColors = colors.sort((a: any, b: any) => a.rank - b.rank);

    if (limit) {
      return sortedColors.slice(0, limit);
    }

    return sortedColors;
  }

  /**
   * Get full detail for one color by name
   */
  getColorForecast(colorName: string): WeddingColorDetail | null {
    if (!this.forecast?.top_colors) return null;

    const normalizedColor = colorName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    for (const colorData of this.forecast.top_colors) {
      const colorMatch = colorData.color.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const aliasMatch = colorData.aliases.some((alias: string) =>
        alias.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalizedColor
      );

      if (colorMatch === normalizedColor || aliasMatch) {
        return colorData;
      }
    }

    return null;
  }

  /**
   * Get styling formula for a color
   */
  getStylingFormula(colorName: string): StylingFormula | null {
    const colorData = this.getColorForecast(colorName);
    return colorData?.styling_formula || null;
  }

  /**
   * Get Bridgerton effect trend data
   */
  getBridgertonEffect(): {
    yoy_growth: number;
    wedding_share: string;
    key_colors: string[];
  } | null {
    if (!this.forecast?.key_themes?.bridgerton_effect) return null;

    const bridgertonData = this.forecast.key_themes.bridgerton_effect;

    return {
      yoy_growth: bridgertonData.yoy_growth || 0,
      wedding_share: bridgertonData.wedding_share || '0%',
      key_colors: bridgertonData.key_colors || []
    };
  }

  /**
   * Get wedding colors filtered by season
   */
  getSeasonalWeddingColors(season: string): WeddingColor[] {
    if (!this.forecast?.top_colors) return [];

    const normalizedSeason = season.toLowerCase();

    return this.forecast.top_colors.filter((color: WeddingColor) =>
      color.best_seasons.some(s => s.toLowerCase() === normalizedSeason)
    );
  }

  /**
   * Get all available colors (for diagnostics)
   */
  getAllColors(): string[] {
    if (!this.forecast?.top_colors) return [];
    return this.forecast.top_colors.map((c: WeddingColor) => c.color);
  }

  /**
   * Get market context data
   */
  getMarketContext(): any {
    return this.forecast?.market_context || null;
  }
}

export const weddingForecastService = new WeddingForecastService();
