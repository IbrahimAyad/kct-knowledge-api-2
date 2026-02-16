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
  private tieColorInventory: any = null;

  async initialize(): Promise<void> {
    // Load tie color inventory
    try {
      const tieInventoryPath = path.join(__dirname, '../data/intelligence/tie-color-inventory.json');
      const tieRaw = fs.readFileSync(tieInventoryPath, 'utf8');
      this.tieColorInventory = JSON.parse(tieRaw);
    } catch (error) {
      logger.warn('Tie color inventory not loaded', { error: error instanceof Error ? error.message : String(error) });
    }

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
   * Section 2.0: Get all available colors with their inventory tiers
   */
  getAvailableColors(): Array<{
    color: string;
    product_count: number;
    tier: 'core' | 'strong' | 'available' | 'limited' | 'rare';
    categories: string[];
  }> {
    if (!this.catalog?.color_to_products) return [];

    return Object.entries(this.catalog.color_to_products).map(([color, data]: [string, any]) => ({
      color,
      product_count: data.product_count,
      tier: data.tier,
      categories: data.categories
    }));
  }

  /**
   * Section 2.0: Get colors by inventory tier
   */
  getColorsByTier(tier: 'core' | 'strong' | 'available' | 'limited' | 'rare'): string[] {
    if (!this.catalog?.color_to_products) return [];

    return Object.entries(this.catalog.color_to_products)
      .filter(([_, data]: [string, any]) => data.tier === tier)
      .map(([color, _]) => color);
  }

  /**
   * Section 2.0: Check if a color is in core or strong tier (default recommendations)
   */
  isDefaultRecommendationColor(color: string): boolean {
    if (!this.catalog?.color_to_products) return false;

    const normalized = color.toLowerCase().replace(/[\s-]+/g, '_');
    const colorData = this.catalog.color_to_products[normalized];
    return colorData && (colorData.tier === 'core' || colorData.tier === 'strong');
  }

  /**
   * Section 2.0: Get inventory tier for a color
   */
  getColorTier(color: string): 'core' | 'strong' | 'available' | 'limited' | 'rare' | null {
    if (!this.catalog?.color_to_products) return null;

    const normalized = color.toLowerCase().replace(/[\s-]+/g, '_');
    const colorData = this.catalog.color_to_products[normalized];
    return colorData?.tier || null;
  }

  /**
   * Section 2.1: Check if a tie color has a matching suspender+bowtie set
   */
  upsellSuspenderSet(tieColor: string): {
    hasSet: boolean;
    upsellMessage?: string;
    category?: string;
  } | null {
    if (!this.tieColorInventory?.tie_colors) return null;

    const normalized = tieColor.toLowerCase().replace(/[\s-]+/g, '_');
    const colorData = this.tieColorInventory.tie_colors[normalized];

    if (!colorData) return null;

    if (colorData.has_suspender_set) {
      return {
        hasSet: true,
        upsellMessage: `Complete your look with our ${tieColor} suspender & bowtie set — perfect match for your tie!`,
        category: colorData.category
      };
    }

    return {
      hasSet: false,
      category: colorData.category
    };
  }

  /**
   * Section 2.1: Get all tie colors with suspender sets
   */
  getTieColorsWithSuspenderSets(): string[] {
    if (!this.tieColorInventory?.tie_colors) return [];

    return Object.entries(this.tieColorInventory.tie_colors)
      .filter(([_, data]: [string, any]) => data.has_suspender_set)
      .map(([color, _]) => color);
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
    // Section 2.1: Expanded to cover 69 tie colors (from 16 families)
    const aliasMap: { [key: string]: string[] } = {
      // Original 16 families
      'burgundy': ['wine', 'dark_red', 'maroon', 'burgundy_wine', 'chianti', 'chianti_red', 'dark_wine', 'wine_red', 'dark_burgundy'],
      'sage_green': ['sage', 'dusty_sage', 'muted_green', 'muted_sage'],
      'chocolate_brown': ['chocolate', 'dark_chocolate', 'cinnamon', 'cinnamon_brown', 'warm_brown', 'nutmeg', 'spice_brown', 'warm_spice'],
      'emerald_green': ['emerald'],
      'light_blue': ['dusty_blue', 'sky_blue', 'baby_blue', 'slate_blue', 'ocean_blue', 'light_baby_blue', 'carolina_blue', 'carolina', 'tar_heel_blue', 'french_blue', 'french', 'parisian_blue', 'tiffany_blue', 'tiffany', 'robin_egg_blue', 'aqua', 'aqua_blue'],
      'powder_blue': ['powdered_blue', 'ice_blue'],
      'royal_blue': ['bright_blue', 'sapphire_blue', 'sapphire', 'deep_blue'],
      'navy': ['navy_blue', 'dark_navy', 'midnight_blue', 'denim_blue', 'denim', 'jean_blue'],
      'charcoal': ['dark_grey', 'charcoal_grey', 'dark_silver', 'gunmetal', 'dark_grey_silver'],
      'light_grey': ['silver', 'light_gray', 'pale_grey', 'taupe', 'grey_brown', 'warm_grey'],
      'black': ['jet_black'],
      'tan': ['khaki', 'beige', 'sand', 'champagne', 'champagne_gold', 'medium_brown', 'mid_brown', 'camel'],
      'hunter_green': ['forest_green', 'dark_green', 'forest', 'deep_green', 'dark_olive', 'olive_dark'],
      'midnight_blue': ['dark_blue', 'cobalt', 'cobalt_blue'],
      'white': ['ivory', 'cream', 'off_white', 'off_white_tie'],
      'terracotta': ['rust', 'burnt_orange', 'terra_cotta', 'burnt', 'rust_orange', 'medium_orange', 'mid_orange'],

      // Section 2.1: NEW tie color families (53 additional colors)
      'apple_red': ['apple', 'bright_red', 'true_red', 'classic_red', 'fire_red'],
      'banana_yellow': ['yellow', 'bright_yellow', 'canary', 'canary_yellow'],
      'blush': ['blush_pink', 'light_blush', 'dusty_pink', 'mauve_pink', 'muted_pink'],
      'coral': ['coral_pink', 'salmon_pink', 'peach', 'peach_pink', 'apricot', 'salmon', 'salmon_orange', 'coral_salmon'],
      'dusty_rose': ['dusty', 'antique_rose', 'french_rose', 'french_pink', 'rose_gold', 'rose', 'pink_gold'],
      'fuchsia': ['hot_pink', 'magenta_pink', 'magenta', 'bright_magenta'],
      'gold': ['gold_tie', 'metallic_gold'],
      'lavender': ['light_purple', 'lavender_purple', 'light_lilac', 'pale_lilac', 'lilac', 'lilac_purple', 'pastel_purple', 'soft_purple', 'wisteria'],
      'lettuce_green': ['lettuce', 'bright_green', 'lime', 'lime_green', 'neon_green'],
      'light_pink': ['pastel_pink', 'soft_pink'],
      'mauve': ['dusty_mauve', 'medium_purple', 'mid_purple', 'plum', 'plum_purple', 'dark_plum', 'deep_purple', 'deep_violet', 'eggplant'],
      'mermaid_green': ['mermaid', 'sea_green', 'teal_green', 'teal', 'teal_blue', 'dark_teal', 'turquoise', 'turquoise_blue', 'aqua_green'],
      'mint_green': ['mint', 'pastel_green', 'soft_green'],
      'olive_green': ['olive', 'military_green'],
      'orange': ['bright_orange']
    };

    return aliasMap[color] || [];
  }
}

export const productCatalogService = new ProductCatalogService();
