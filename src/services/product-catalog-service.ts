/**
 * Product Catalog Service
 * Maps recommendation color outputs to real KCT Menswear Shopify products.
 * Loads product-catalog-mapping.json and provides lookup by color.
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import * as fs from 'fs';
import * as path from 'path';

const STORE_URL = 'https://kctmenswear.com';

export interface ShopifyProduct {
  title: string;
  handle: string;
  price: number;
  type?: string;
  url: string;
}

export interface ProductMatch {
  suits: ShopifyProduct[];
  ties: ShopifyProduct[];
  accessories: ShopifyProduct[];
  shirts: ShopifyProduct[];
}

export interface RecommendationWithProducts {
  suit_color: string;
  shirt_color: string;
  tie_color: string;
  products: {
    suit_options: ShopifyProduct[];
    tie_options: ShopifyProduct[];
    shirt_options: ShopifyProduct[];
    accessory_options: ShopifyProduct[];
    shop_this_look_url: string;
  };
  [key: string]: any; // Preserve other fields from original recommendation
}

class ProductCatalogService {
  private catalog: any = null;
  private colorMap: Map<string, ProductMatch> = new Map();

  async initialize(): Promise<void> {
    try {
      const catalogPath = path.join(__dirname, '../data/intelligence/product-catalog-mapping.json');
      const raw = fs.readFileSync(catalogPath, 'utf8');
      this.catalog = JSON.parse(raw);

      // Build the color → products map from trending_2025_inventory
      const inventory = this.catalog.trending_2025_inventory || {};
      for (const [color, data] of Object.entries<any>(inventory)) {
        const match: ProductMatch = {
          suits: (data.suits || []).map((p: any) => ({
            ...p,
            url: `${STORE_URL}/products/${p.handle}`
          })),
          ties: (data.ties || []).map((p: any) => ({
            ...p,
            url: `${STORE_URL}/products/${p.handle}`
          })),
          accessories: (data.accessories || []).map((p: any) => ({
            ...p,
            url: `${STORE_URL}/products/${p.handle}`
          })),
          shirts: (data.shirts || []).map((p: any) => ({
            ...p,
            url: `${STORE_URL}/products/${p.handle}`
          }))
        };
        this.colorMap.set(color, match);

        // Also register common aliases
        const aliases = this.getColorAliases(color);
        for (const alias of aliases) {
          if (!this.colorMap.has(alias)) {
            this.colorMap.set(alias, match);
          }
        }
      }

      logger.info(`📦 Product catalog loaded: ${this.colorMap.size} colors mapped to Shopify products`);
    } catch (error) {
      logger.warn('Product catalog not loaded — recommendations will not include product links', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Look up products matching a color. Returns null if no products found.
   */
  getProductsByColor(color: string): ProductMatch | null {
    if (!color) return null;

    const normalized = color.toLowerCase().replace(/[\s-]+/g, '_');
    return this.colorMap.get(normalized) || null;
  }

  /**
   * Enrich a recommendation object with real product links.
   * Takes a recommendation with suit_color/shirt_color/tie_color
   * and adds a `products` field with purchasable items.
   */
  enrichRecommendation(recommendation: any): RecommendationWithProducts {
    const suitColor = recommendation.suit_color || recommendation.suit || '';
    const shirtColor = recommendation.shirt_color || recommendation.shirt || '';
    const tieColor = recommendation.tie_color || recommendation.tie || '';

    const suitProducts = this.getProductsByColor(suitColor);
    const tieProducts = this.getProductsByColor(tieColor);
    const shirtProducts = this.getProductsByColor(shirtColor);

    // Build a "shop this look" collection URL using the primary suit color
    const shopUrl = suitProducts?.suits?.[0]
      ? `${STORE_URL}/collections/all?q=${encodeURIComponent(suitColor.replace(/_/g, ' '))}`
      : `${STORE_URL}/collections/all`;

    return {
      ...recommendation,
      products: {
        suit_options: suitProducts?.suits?.slice(0, 3) || [],
        tie_options: tieProducts?.ties?.slice(0, 3) || [],
        shirt_options: shirtProducts?.shirts?.slice(0, 3) || [],
        accessory_options: suitProducts?.accessories?.slice(0, 3) || [],
        shop_this_look_url: shopUrl
      }
    };
  }

  /**
   * Enrich an array of recommendations with product links.
   */
  enrichRecommendations(recommendations: any[]): RecommendationWithProducts[] {
    return recommendations.map(rec => this.enrichRecommendation(rec));
  }

  /**
   * Get all mapped colors (for diagnostics/health check)
   */
  getMappedColors(): string[] {
    return Array.from(this.colorMap.keys());
  }

  /**
   * Common color aliases so "navy" matches "navy_blue", etc.
   */
  private getColorAliases(color: string): string[] {
    const aliasMap: { [key: string]: string[] } = {
      'burgundy': ['wine', 'dark_red', 'maroon', 'burgundy_wine'],
      'sage_green': ['sage', 'dusty_sage', 'muted_green'],
      'chocolate_brown': ['brown', 'dark_brown', 'cocoa'],
      'emerald_green': ['emerald', 'deep_green'],
      'light_blue': ['dusty_blue', 'sky_blue', 'baby_blue', 'slate_blue', 'ocean_blue'],
      'powder_blue': ['powdered_blue'],
      'royal_blue': ['bright_blue', 'cobalt_blue'],
      'navy': ['navy_blue', 'dark_navy', 'midnight_blue'],
      'charcoal': ['dark_grey', 'charcoal_grey'],
      'light_grey': ['silver', 'light_gray', 'pale_grey'],
      'black': ['jet_black'],
      'tan': ['khaki', 'beige', 'sand'],
      'hunter_green': ['forest_green', 'dark_green'],
      'midnight_blue': ['dark_blue'],
      'white': ['ivory', 'cream', 'off_white'],
      'terracotta': ['rust', 'burnt_orange', 'terra_cotta'],
    };

    return aliasMap[color] || [];
  }
}

export const productCatalogService = new ProductCatalogService();
