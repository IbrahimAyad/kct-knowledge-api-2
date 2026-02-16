/**
 * Prom Aura Service
 * Section 3.0: Maps prom personality auras to product tags, colors, and styling
 * Loads prom-aura-system.json and provides aura detection + product tag filtering
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface AuraDetails {
  display_name: string;
  emoji: string;
  route: string;
  vibe: string;
  product_tags: string[];
  recommended_colors: string[];
  best_for: string;
  styling_notes: string;
  tie_color_matches?: string[];
}

export interface AuraResult {
  aura_name: string;
  aura_details: AuraDetails;
  confidence: number;
  reasoning: string;
}

class PromAuraService {
  private auraSystem: any = null;

  constructor() {
    this.loadAuraSystem();
  }

  /**
   * Load prom aura system from JSON
   */
  private loadAuraSystem(): void {
    try {
      const auraPath = path.join(__dirname, '../data/intelligence/prom-aura-system.json');
      const raw = fs.readFileSync(auraPath, 'utf8');
      this.auraSystem = JSON.parse(raw);
      logger.info('🔥 Prom aura system loaded successfully');
    } catch (error) {
      logger.warn('Prom aura system not loaded', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Detect best-matching aura based on input signals
   * Returns null if no signals provided or no match found
   */
  detectAura(signals: {
    style_preference?: string;
    color_preference?: string;
    personality?: string;
  }): AuraResult | null {
    if (!this.auraSystem?.auras || !signals) return null;

    // If no signals provided, return null
    if (!signals.style_preference && !signals.color_preference && !signals.personality) {
      return null;
    }

    const auras = this.auraSystem.auras;
    const scores: { [key: string]: { score: number; matches: string[] } } = {};

    // Initialize scores
    for (const auraName of Object.keys(auras)) {
      scores[auraName] = { score: 0, matches: [] };
    }

    // Score based on style preference
    if (signals.style_preference) {
      const styleLower = signals.style_preference.toLowerCase();
      for (const [auraName, auraData] of Object.entries<any>(auras)) {
        const vibe = auraData.vibe.toLowerCase();
        const bestFor = auraData.best_for.toLowerCase();

        if (vibe.includes(styleLower) || bestFor.includes(styleLower)) {
          scores[auraName].score += 3;
          scores[auraName].matches.push(`style: ${styleLower}`);
        }

        // Check product tags
        if (auraData.product_tags.some((tag: string) => tag.toLowerCase().includes(styleLower))) {
          scores[auraName].score += 2;
          scores[auraName].matches.push(`tag: ${styleLower}`);
        }
      }
    }

    // Score based on color preference
    if (signals.color_preference) {
      const colorLower = signals.color_preference.toLowerCase().replace(/[^a-z0-9]/g, '_');
      for (const [auraName, auraData] of Object.entries<any>(auras)) {
        if (auraData.recommended_colors.some((c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '_') === colorLower)) {
          scores[auraName].score += 5;
          scores[auraName].matches.push(`color: ${signals.color_preference}`);
        }
      }
    }

    // Score based on personality
    if (signals.personality) {
      const personalityLower = signals.personality.toLowerCase();
      for (const [auraName, auraData] of Object.entries<any>(auras)) {
        const vibe = auraData.vibe.toLowerCase();
        if (vibe.includes(personalityLower)) {
          scores[auraName].score += 4;
          scores[auraName].matches.push(`personality: ${personalityLower}`);
        }
      }
    }

    // Find best match
    let bestAura = '';
    let bestScore = 0;
    let bestMatches: string[] = [];

    for (const [auraName, data] of Object.entries(scores)) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestAura = auraName;
        bestMatches = data.matches;
      }
    }

    // No match if score is 0
    if (bestScore === 0) return null;

    const auraDetails = auras[bestAura];
    const confidence = Math.min(bestScore / 10, 1.0); // Normalize to 0-1

    return {
      aura_name: bestAura,
      aura_details: {
        display_name: auraDetails.display_name,
        emoji: auraDetails.emoji,
        route: auraDetails.route,
        vibe: auraDetails.vibe,
        product_tags: auraDetails.product_tags,
        recommended_colors: auraDetails.recommended_colors,
        best_for: auraDetails.best_for,
        styling_notes: auraDetails.styling_notes,
        tie_color_matches: auraDetails.tie_color_matches
      },
      confidence,
      reasoning: `Matched based on: ${bestMatches.join(', ')}`
    };
  }

  /**
   * Get full details for a specific aura by name
   */
  getAuraDetails(auraName: string): AuraDetails | null {
    if (!this.auraSystem?.auras) return null;

    const normalizedName = auraName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const auraData = this.auraSystem.auras[normalizedName];

    if (!auraData) return null;

    return {
      display_name: auraData.display_name,
      emoji: auraData.emoji,
      route: auraData.route,
      vibe: auraData.vibe,
      product_tags: auraData.product_tags,
      recommended_colors: auraData.recommended_colors,
      best_for: auraData.best_for,
      styling_notes: auraData.styling_notes,
      tie_color_matches: auraData.tie_color_matches
    };
  }

  /**
   * Get product tags for an aura (for filtering)
   */
  getAuraProductTags(auraName: string): string[] {
    if (!this.auraSystem?.auras) return [];

    const normalizedName = auraName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const auraData = this.auraSystem.auras[normalizedName];

    return auraData?.product_tags || [];
  }

  /**
   * Get all aura names
   */
  getAllAuras(): string[] {
    if (!this.auraSystem?.auras) return [];
    return Object.keys(this.auraSystem.auras);
  }
}

export const promAuraService = new PromAuraService();
