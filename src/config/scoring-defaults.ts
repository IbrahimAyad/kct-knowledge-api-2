/**
 * Centralized Scoring Defaults for KCT Knowledge API
 *
 * All "confidence" and "scoring" values in API responses are deterministic defaults,
 * NOT machine-learned predictions. They represent curated quality tiers based on
 * the knowledge bank's rule-based matching system.
 *
 * Tuning guide:
 * - Values closer to 1.0 = higher confidence in the match quality
 * - Primary recommendations should score higher than alternatives
 * - Decrease scores for less certain or more generic matches
 *
 * To add real ML scoring in the future, replace individual values here
 * with calls to a scoring service while keeping the same interface.
 */

export const SCORING_DEFAULTS = {
  /** Color relationship matching */
  colorRelationships: {
    shirtMatches: 0.85,
    tieMatches: 0.85,
    overallConfidence: 0.90
  },

  /** Outfit combination compatibility */
  compatibility: {
    suitShirt: 0.90,
    shirtTie: 0.85,
    suitTie: 0.80
  },

  /** Occasion & seasonal appropriateness */
  appropriateness: {
    occasionValid: 0.95,
    occasionInvalid: 0.60,
    seasonalFit: 0.85
  },

  /** Recommendation ranking — primary picks */
  recommendations: {
    /** Base confidence for top-ranked recommendation */
    baseConfidence: 0.95,
    /** How much confidence drops per rank position */
    rankDecay: 0.05,
    personalizationScore: 0.90,
    trendingFactor: 0.85
  },

  /** Alternative / secondary recommendations */
  alternatives: {
    baseConfidence: 0.80,
    rankDecay: 0.03
  },

  /** Style profile detection */
  styleInsights: {
    detectionConfidence: 0.88,
    personalizationScore: 0.92,
    profileConfidence: 0.88
  },

  /** Trending analytics */
  trending: {
    confidenceLevel: 0.92
  },

  /** Venue-based outfit suggestions */
  venueOutfits: {
    baseConfidence: 0.90,
    rankDecay: 0.05
  },

  /** Fashion rules validation */
  rulesValidation: {
    perfectScore: 0.95,
    penaltyPerViolation: 0.15,
    minimumScore: 0.30
  }
} as const;
