/**
 * Product Tag Service
 * Section 2.3: Maps occasions, venues, seasons, and styles to product tags
 * for filtering and surfacing relevant products.
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface TagMatch {
  tags: string[];
  boost: number; // Priority multiplier for these tags
  reasoning: string;
}

class ProductTagService {
  private tagMapping: any = null;

  constructor() {
    this.loadTagMapping();
  }

  /**
   * Load product tag mappings from JSON
   */
  private loadTagMapping(): void {
    try {
      const mappingPath = path.join(__dirname, '../data/intelligence/product-tag-mapping.json');
      const raw = fs.readFileSync(mappingPath, 'utf8');
      this.tagMapping = JSON.parse(raw);
      logger.info('🏷️  Product tag mappings loaded successfully');
    } catch (error) {
      logger.warn('Product tag mappings not loaded', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Section 2.3.1: Get tags for an occasion
   * "wedding" returns: wedding, groom, groomsmen, spring-wedding, outdoor-wedding, etc.
   */
  getTagsForOccasion(occasion: string, season?: string, venue?: string): TagMatch {
    if (!this.tagMapping?.tag_mappings?.occasion_tags) {
      return { tags: [], boost: 1.0, reasoning: 'Tag mapping not loaded' };
    }

    const normalizedOccasion = occasion.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tags: string[] = [];
    let reasoning = '';

    // Find matching occasion
    const occasionData = this.tagMapping.tag_mappings.occasion_tags[normalizedOccasion];
    if (occasionData) {
      // Add primary tags
      if (occasionData.primary_tags) {
        tags.push(...occasionData.primary_tags);
      }

      // Add seasonal tags if season provided
      if (season && occasionData.seasonal_tags) {
        const seasonalTag = `${season.toLowerCase()}-${normalizedOccasion}`;
        const matchingSeasonal = occasionData.seasonal_tags.filter((t: string) =>
          t.includes(season.toLowerCase())
        );
        tags.push(...matchingSeasonal);
      }

      // Add venue tags if venue provided
      if (venue && occasionData.venue_tags) {
        const venueTag = `${venue.toLowerCase()}-${normalizedOccasion}`;
        const matchingVenue = occasionData.venue_tags.filter((t: string) =>
          t.includes(venue.toLowerCase())
        );
        tags.push(...matchingVenue);
      }

      // Add style tags
      if (occasionData.style_tags) {
        tags.push(...occasionData.style_tags);
      }

      reasoning = `${occasion} occasion matched ${tags.length} product tags`;
    } else {
      // Try partial match
      for (const [key, value] of Object.entries(this.tagMapping.tag_mappings.occasion_tags)) {
        if (normalizedOccasion.includes(key) || key.includes(normalizedOccasion)) {
          const data = value as any;
          if (data.primary_tags) {
            tags.push(...data.primary_tags);
          }
          reasoning = `Partial match for ${occasion} found ${key}`;
          break;
        }
      }
    }

    const boost = this.tagMapping.tag_priority_rules?.exact_match_boost || 2.0;
    return { tags: [...new Set(tags)], boost, reasoning };
  }

  /**
   * Section 2.3.2: Get tags for a venue
   * "outdoor" returns: outdoor-wedding, garden-wedding, vineyard-wedding, barn-wedding
   */
  getTagsForVenue(venue: string): TagMatch {
    if (!this.tagMapping?.tag_mappings?.venue_tags) {
      return { tags: [], boost: 1.0, reasoning: 'Tag mapping not loaded' };
    }

    const normalizedVenue = venue.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tags: string[] = [];
    let reasoning = '';

    // Find matching venue
    const venueData = this.tagMapping.tag_mappings.venue_tags[normalizedVenue];
    if (venueData) {
      tags.push(...venueData);
      reasoning = `${venue} venue matched ${tags.length} product tags`;
    } else {
      // Try partial match
      for (const [key, value] of Object.entries(this.tagMapping.tag_mappings.venue_tags)) {
        if (normalizedVenue.includes(key) || key.includes(normalizedVenue)) {
          tags.push(...(value as string[]));
          reasoning = `Partial match for ${venue} found ${key}`;
          break;
        }
      }
    }

    const boost = this.tagMapping.tag_priority_rules?.venue_match_boost || 1.3;
    return { tags: [...new Set(tags)], boost, reasoning };
  }

  /**
   * Section 2.3.3: Get tags for a season
   * "winter" returns: winter-wedding, velvet, holiday-event
   */
  getTagsForSeason(season: string): TagMatch {
    if (!this.tagMapping?.tag_mappings?.season_tags) {
      return { tags: [], boost: 1.0, reasoning: 'Tag mapping not loaded' };
    }

    const normalizedSeason = season.toLowerCase();
    const tags: string[] = [];
    let reasoning = '';

    // Find matching season
    const seasonData = this.tagMapping.tag_mappings.season_tags[normalizedSeason];
    if (seasonData) {
      // Add season-specific event tags
      if (seasonData.tags) {
        tags.push(...seasonData.tags);
      }

      // Add fabric tags for the season
      if (seasonData.fabrics) {
        tags.push(...seasonData.fabrics);
      }

      reasoning = `${season} season matched ${tags.length} product tags`;
    }

    const boost = this.tagMapping.tag_priority_rules?.seasonal_match_boost || 1.5;
    return { tags: [...new Set(tags)], boost, reasoning };
  }

  /**
   * Section 2.3.4: Get tags for a style
   * "bold" returns: shiny, sequin, satin, metallic, statement
   */
  getTagsForStyle(style: string): TagMatch {
    if (!this.tagMapping?.tag_mappings?.style_tags) {
      return { tags: [], boost: 1.0, reasoning: 'Tag mapping not loaded' };
    }

    const normalizedStyle = style.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tags: string[] = [];
    let reasoning = '';

    // Find matching style
    const styleData = this.tagMapping.tag_mappings.style_tags[normalizedStyle];
    if (styleData) {
      tags.push(...styleData);
      reasoning = `${style} style matched ${tags.length} product tags`;
    } else {
      // Try partial match
      for (const [key, value] of Object.entries(this.tagMapping.tag_mappings.style_tags)) {
        if (normalizedStyle.includes(key) || key.includes(normalizedStyle)) {
          tags.push(...(value as string[]));
          reasoning = `Partial match for ${style} found ${key}`;
          break;
        }
      }
    }

    const boost = this.tagMapping.tag_priority_rules?.style_match_boost || 1.2;
    return { tags: [...new Set(tags)], boost, reasoning };
  }

  /**
   * Get tags for a fabric preference
   */
  getTagsForFabric(fabric: string): TagMatch {
    if (!this.tagMapping?.tag_mappings?.fabric_tags) {
      return { tags: [], boost: 1.0, reasoning: 'Tag mapping not loaded' };
    }

    const normalizedFabric = fabric.toLowerCase();
    const tags: string[] = [];
    let reasoning = '';

    // Find matching fabric
    const fabricData = this.tagMapping.tag_mappings.fabric_tags[normalizedFabric];
    if (fabricData && fabricData.tags) {
      tags.push(...fabricData.tags);
      reasoning = `${fabric} fabric matched ${tags.length} product tags`;
    }

    return { tags: [...new Set(tags)], boost: 1.2, reasoning };
  }

  /**
   * Get tags for fit preference
   */
  getTagsForFit(fit: string): TagMatch {
    if (!this.tagMapping?.tag_mappings?.fit_tags) {
      return { tags: [], boost: 1.0, reasoning: 'Tag mapping not loaded' };
    }

    const normalizedFit = fit.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const tags: string[] = [];
    let reasoning = '';

    // Find matching fit
    const fitData = this.tagMapping.tag_mappings.fit_tags[normalizedFit];
    if (fitData && fitData.tags) {
      tags.push(...fitData.tags);
      reasoning = `${fit} fit matched ${tags.length} product tags`;
    }

    return { tags: [...new Set(tags)], boost: 1.1, reasoning };
  }

  /**
   * Combine multiple tag sources into a unified tag filter
   */
  combineTagFilters(
    occasion?: string,
    venue?: string,
    season?: string,
    style?: string
  ): {
    all_tags: string[];
    prioritized_tags: Array<{ tag: string; boost: number }>;
    reasoning: string[];
  } {
    const allTags: string[] = [];
    const prioritizedTags: Array<{ tag: string; boost: number }> = [];
    const reasoning: string[] = [];

    // Collect tags from each source
    if (occasion) {
      const occasionMatch = this.getTagsForOccasion(occasion, season, venue);
      occasionMatch.tags.forEach(tag => {
        allTags.push(tag);
        prioritizedTags.push({ tag, boost: occasionMatch.boost });
      });
      if (occasionMatch.reasoning) reasoning.push(occasionMatch.reasoning);
    }

    if (venue) {
      const venueMatch = this.getTagsForVenue(venue);
      venueMatch.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
          prioritizedTags.push({ tag, boost: venueMatch.boost });
        }
      });
      if (venueMatch.reasoning) reasoning.push(venueMatch.reasoning);
    }

    if (season) {
      const seasonMatch = this.getTagsForSeason(season);
      seasonMatch.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
          prioritizedTags.push({ tag, boost: seasonMatch.boost });
        }
      });
      if (seasonMatch.reasoning) reasoning.push(seasonMatch.reasoning);
    }

    if (style) {
      const styleMatch = this.getTagsForStyle(style);
      styleMatch.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
          prioritizedTags.push({ tag, boost: styleMatch.boost });
        }
      });
      if (styleMatch.reasoning) reasoning.push(styleMatch.reasoning);
    }

    return {
      all_tags: [...new Set(allTags)],
      prioritized_tags: prioritizedTags,
      reasoning
    };
  }

  /**
   * Get all available tags (for diagnostics)
   */
  getAllTags(): {
    occasions: string[];
    venues: string[];
    seasons: string[];
    styles: string[];
    fabrics: string[];
    fits: string[];
  } {
    if (!this.tagMapping?.tag_mappings) {
      return { occasions: [], venues: [], seasons: [], styles: [], fabrics: [], fits: [] };
    }

    return {
      occasions: Object.keys(this.tagMapping.tag_mappings.occasion_tags || {}),
      venues: Object.keys(this.tagMapping.tag_mappings.venue_tags || {}),
      seasons: Object.keys(this.tagMapping.tag_mappings.season_tags || {}),
      styles: Object.keys(this.tagMapping.tag_mappings.style_tags || {}),
      fabrics: Object.keys(this.tagMapping.tag_mappings.fabric_tags || {}),
      fits: Object.keys(this.tagMapping.tag_mappings.fit_tags || {})
    };
  }
}

export const productTagService = new ProductTagService();
