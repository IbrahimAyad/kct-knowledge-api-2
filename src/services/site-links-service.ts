/**
 * Site Links Service
 * Section 3.2: Maps categories, occasions, and resources to KCT URLs
 * Enables "shop this look" links in API responses
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

class SiteLinksService {
  private siteLinks: any = null;
  private baseUrl: string = 'https://kctmenswear.com';

  constructor() {
    this.loadSiteLinks();
  }

  /**
   * Load site links from JSON
   */
  private loadSiteLinks(): void {
    try {
      const linksPath = path.join(__dirname, '../data/intelligence/kct-site-links.json');
      const raw = fs.readFileSync(linksPath, 'utf8');
      this.siteLinks = JSON.parse(raw);
      this.baseUrl = this.siteLinks.base_url || 'https://kctmenswear.com';
      logger.info('🔗 KCT site links loaded successfully');
    } catch (error) {
      logger.warn('KCT site links not loaded', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get collection URL by category name
   */
  getCollectionUrl(category: string): string | null {
    if (!this.siteLinks?.collections) return null;

    const normalizedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const path = this.siteLinks.collections[normalizedCategory];

    return path ? `${this.baseUrl}${path}` : null;
  }

  /**
   * Get occasion URL by occasion name
   */
  getOccasionUrl(occasion: string): string | null {
    if (!this.siteLinks?.occasions) return null;

    const normalizedOccasion = occasion.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check direct occasion match
    if (this.siteLinks.occasions[normalizedOccasion]) {
      return `${this.baseUrl}${this.siteLinks.occasions[normalizedOccasion]}`;
    }

    // Check wedding-specific
    if (occasion.toLowerCase() === 'wedding' && this.siteLinks.wedding?.hub) {
      return `${this.baseUrl}${this.siteLinks.wedding.hub}`;
    }

    // Check prom-specific
    if (occasion.toLowerCase() === 'prom' && this.siteLinks.prom?.hub) {
      return `${this.baseUrl}${this.siteLinks.prom.hub}`;
    }

    return null;
  }

  /**
   * Get wedding-specific URL by role or style
   */
  getWeddingUrl(role: string): string | null {
    if (!this.siteLinks?.wedding) return null;

    const normalizedRole = role.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check wedding styles
    if (this.siteLinks.wedding.styles?.[normalizedRole]) {
      return `${this.baseUrl}${this.siteLinks.wedding.styles[normalizedRole]}`;
    }

    // Check if it's a top-level wedding key
    if (this.siteLinks.wedding[normalizedRole]) {
      return `${this.baseUrl}${this.siteLinks.wedding[normalizedRole]}`;
    }

    // Default to wedding hub
    return this.siteLinks.wedding.hub ? `${this.baseUrl}${this.siteLinks.wedding.hub}` : null;
  }

  /**
   * Get prom collection URL
   */
  getPromUrl(): string {
    if (!this.siteLinks?.prom?.hub) {
      return `${this.baseUrl}/prom`;
    }
    return `${this.baseUrl}${this.siteLinks.prom.hub}`;
  }

  /**
   * Get prom aura collection URL by aura name
   */
  getPromAuraUrl(auraName: string): string | null {
    if (!this.siteLinks?.prom?.collections) return null;

    const normalizedAura = auraName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const path = this.siteLinks.prom.collections[normalizedAura];

    return path ? `${this.baseUrl}${path}` : null;
  }

  /**
   * Get resource URL by topic
   */
  getResourceUrl(topic: string): string | null {
    if (!this.siteLinks?.resources) return null;

    const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const path = this.siteLinks.resources[normalizedTopic];

    return path ? `${this.baseUrl}${path}` : null;
  }

  /**
   * Enrich response with relevant links based on context
   */
  enrichResponseWithLinks(context: {
    occasion?: string;
    category?: string;
    season?: string;
  }): {
    shop_url?: string;
    guide_url?: string;
    occasion_url?: string;
  } {
    const links: any = {};

    // Add occasion URL
    if (context.occasion) {
      const occasionUrl = this.getOccasionUrl(context.occasion);
      if (occasionUrl) {
        links.occasion_url = occasionUrl;
        links.shop_url = occasionUrl; // Primary shop URL
      }
    }

    // Add category URL
    if (context.category) {
      const categoryUrl = this.getCollectionUrl(context.category);
      if (categoryUrl && !links.shop_url) {
        links.shop_url = categoryUrl;
      }
    }

    // Add guide URL based on occasion
    if (context.occasion) {
      const occasion = context.occasion.toLowerCase();
      if (occasion === 'wedding') {
        links.guide_url = this.getResourceUrl('wedding_guide');
      } else if (occasion === 'prom') {
        links.guide_url = this.getResourceUrl('prom_guide');
      }
    }

    // Add size guide as fallback
    if (!links.guide_url) {
      links.guide_url = this.getResourceUrl('size_guide');
    }

    return links;
  }

  /**
   * Get all available collections (for diagnostics)
   */
  getAllCollections(): string[] {
    if (!this.siteLinks?.collections) return [];
    return Object.keys(this.siteLinks.collections);
  }

  /**
   * Get all available occasions (for diagnostics)
   */
  getAllOccasions(): string[] {
    if (!this.siteLinks?.occasions) return [];
    return Object.keys(this.siteLinks.occasions);
  }
}

export const siteLinksService = new SiteLinksService();
