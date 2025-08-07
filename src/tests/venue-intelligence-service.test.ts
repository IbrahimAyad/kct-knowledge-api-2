/**
 * Comprehensive Unit Tests for Venue Intelligence Service
 */

import { VenueIntelligenceService } from '../services/venue-intelligence-service';
import { cacheService } from '../services/cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  VenueOptimizationRequest,
  LightingConditions,
  VenueIntelligence
} from '../types/enhanced-knowledge-bank';

// Mock dependencies
jest.mock('../services/cache-service');
jest.mock('../utils/enhanced-data-loader');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockEnhancedDataLoader = enhancedDataLoader as jest.Mocked<typeof enhancedDataLoader>;

describe('VenueIntelligenceService', () => {
  let venueIntelligenceService: VenueIntelligenceService;

  const mockVenueData = {
    church_venues: {
      lighting_conditions: {
        natural_light: 'stained_glass_filtered',
        artificial_light: 'warm_tungsten',
        color_temperature: '2700K',
        intensity: 'medium_low'
      },
      color_preferences: {
        recommended: ['Navy', 'Charcoal', 'Deep_Gray'],
        avoid: ['Bright_Colors', 'Flashy_Patterns'],
        cultural_significance: {
          'Navy': 'Respect and solemnity',
          'Black': 'Traditional formal'
        }
      },
      fabric_recommendations: {
        preferred: ['Wool', 'Cotton_Blend'],
        avoid: ['Shiny_Materials', 'Loud_Textures'],
        seasonal_adjustments: {
          winter: 'Heavier_Wools',
          summer: 'Breathable_Cottons'
        }
      },
      photography_considerations: {
        flash_restrictions: true,
        ideal_positions: ['Natural_light_sources'],
        color_challenges: ['Stained_glass_color_cast']
      },
      unspoken_rules: [
        {
          rule_category: 'Respect',
          specific_guideline: 'Conservative styling required',
          violation_risk: 'high',
          cultural_context: 'Religious reverence'
        }
      ]
    },
    outdoor_garden: {
      lighting_conditions: {
        natural_light: 'variable_daylight',
        golden_hour: 'optimal_photography',
        color_temperature: '5600K',
        intensity: 'high_variable'
      },
      seasonal_variations: {
        spring: {
          color_harmony: ['Pastels', 'Light_Colors'],
          fabric_adjustments: ['Light_Layers']
        },
        fall: {
          color_harmony: ['Earth_Tones', 'Rich_Colors'],
          fabric_adjustments: ['Medium_Weight']
        }
      }
    }
  };

  const mockOptimizationRequest: VenueOptimizationRequest = {
    venue_type: 'church',
    lighting_conditions: {
      natural_light: 'stained_glass_filtered',
      artificial_light: 'warm_tungsten',
      color_temperature: '2700K',
      intensity: 'medium_low'
    },
    season: 'fall',
    time_of_day: 'afternoon',
    photography_requirements: {
      flash_allowed: false,
      key_shots: ['ceremony', 'group_photos'],
      lighting_priority: 'natural_preference'
    }
  };

  beforeEach(() => {
    venueIntelligenceService = new VenueIntelligenceService();
    jest.clearAllMocks();

    mockCacheService.getOrSet.mockImplementation(async (key, factory) => {
      if (key.includes('venue:intelligence_data')) {
        return mockVenueData;
      }
      return await factory();
    });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.getStats.mockResolvedValue({ keys_count: 20 });
    mockCacheService.invalidateByTags.mockResolvedValue(undefined);

    mockEnhancedDataLoader.loadVenueIntelligence.mockResolvedValue(mockVenueData);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid data', async () => {
      await venueIntelligenceService.initialize();

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'venue:intelligence_data',
        expect.any(Function),
        expect.objectContaining({ ttl: 6 * 60 * 60, tags: ['venue', 'intelligence'] })
      );
    });

    it('should handle initialization failure gracefully', async () => {
      mockCacheService.getOrSet.mockRejectedValue(new Error('Venue data loading failed'));

      await venueIntelligenceService.initialize();

      const healthStatus = await venueIntelligenceService.getHealthStatus();
      expect(healthStatus.status).toBe('degraded');
    });

    it('should build specialized caches during initialization', async () => {
      await venueIntelligenceService.initialize();

      // Verify that the service doesn't crash and initializes properly
      const healthStatus = await venueIntelligenceService.getHealthStatus();
      expect(healthStatus.data_loaded).toBe(true);
    });
  });

  describe('Venue Optimization', () => {
    it('should optimize for venue conditions successfully', async () => {
      const result = await venueIntelligenceService.optimizeForVenue(mockOptimizationRequest);

      expect(result).toMatchObject({
        venue_intelligence: expect.any(Object),
        color_recommendations: expect.objectContaining({
          recommended_colors: expect.any(Array),
          avoid_colors: expect.any(Array),
          reasoning: expect.any(Array)
        }),
        fabric_recommendations: expect.objectContaining({
          recommended_fabrics: expect.any(Array),
          avoid_fabrics: expect.any(Array),
          seasonal_adjustments: expect.any(Array)
        }),
        style_adjustments: expect.any(Array),
        confidence_score: expect.any(Number),
        potential_issues: expect.any(Array),
        photography_tips: expect.any(Array)
      });

      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(100);
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        venue_intelligence: mockVenueData.church_venues,
        color_recommendations: {
          recommended_colors: ['Navy', 'Charcoal'],
          avoid_colors: ['Bright_Red'],
          reasoning: ['Conservative venue requirements']
        },
        fabric_recommendations: {
          recommended_fabrics: ['Wool'],
          avoid_fabrics: ['Shiny_Materials'],
          seasonal_adjustments: ['Fall_appropriate_weights']
        },
        style_adjustments: ['Conservative_styling'],
        confidence_score: 85,
        potential_issues: [],
        photography_tips: ['Use_natural_light']
      };

      mockCacheService.get.mockResolvedValueOnce(cachedResult);

      const result = await venueIntelligenceService.optimizeForVenue(mockOptimizationRequest);

      expect(result).toEqual(cachedResult);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('venue:optimization:')
      );
    });

    it('should handle different venue types appropriately', async () => {
      const outdoorRequest = {
        ...mockOptimizationRequest,
        venue_type: 'outdoor_garden',
        lighting_conditions: {
          natural_light: 'variable_daylight',
          artificial_light: 'none',
          color_temperature: '5600K',
          intensity: 'high_variable'
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(outdoorRequest);

      expect(result.venue_intelligence).toBeDefined();
      expect(result.color_recommendations.recommended_colors).toEqual(expect.any(Array));
    });

    it('should provide appropriate recommendations for religious venues', async () => {
      const result = await venueIntelligenceService.optimizeForVenue(mockOptimizationRequest);

      expect(result.color_recommendations.recommended_colors).toEqual(
        expect.arrayContaining(['Navy', 'Charcoal', 'Deep_Gray'])
      );
      expect(result.color_recommendations.avoid_colors).toEqual(
        expect.arrayContaining(['Bright_Colors', 'Flashy_Patterns'])
      );
      expect(result.fabric_recommendations.avoid_fabrics).toEqual(
        expect.arrayContaining(['Shiny_Materials', 'Loud_Textures'])
      );
    });
  });

  describe('Lighting Analysis', () => {
    it('should analyze lighting conditions correctly', async () => {
      const lightingConditions: LightingConditions = {
        natural_light: 'stained_glass_filtered',
        artificial_light: 'warm_tungsten',
        color_temperature: '2700K',
        intensity: 'medium_low'
      };

      const result = await venueIntelligenceService.optimizeForVenue({
        ...mockOptimizationRequest,
        lighting_conditions: lightingConditions
      });

      expect(result.color_recommendations.reasoning).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/lighting|warm|tungsten/i)
        ])
      );
    });

    it('should handle various color temperatures', async () => {
      const coolLightingRequest = {
        ...mockOptimizationRequest,
        lighting_conditions: {
          natural_light: 'direct_sunlight',
          artificial_light: 'LED_cool',
          color_temperature: '6500K',
          intensity: 'high'
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(coolLightingRequest);

      expect(result.color_recommendations).toBeDefined();
      expect(result.photography_tips).toEqual(expect.any(Array));
    });

    it('should adjust recommendations based on lighting intensity', async () => {
      const lowLightRequest = {
        ...mockOptimizationRequest,
        lighting_conditions: {
          natural_light: 'minimal',
          artificial_light: 'dim_ambient',
          color_temperature: '2200K',
          intensity: 'very_low'
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(lowLightRequest);

      expect(result.fabric_recommendations.recommended_fabrics).not.toContain('Matte_Black');
      expect(result.potential_issues).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/low.*light|visibility/i)
        ])
      );
    });
  });

  describe('Seasonal Adaptations', () => {
    it('should provide season-appropriate recommendations', async () => {
      const winterRequest = {
        ...mockOptimizationRequest,
        season: 'winter' as const
      };

      const summerRequest = {
        ...mockOptimizationRequest,
        season: 'summer' as const
      };

      const winterResult = await venueIntelligenceService.optimizeForVenue(winterRequest);
      const summerResult = await venueIntelligenceService.optimizeForVenue(summerRequest);

      expect(winterResult.fabric_recommendations.seasonal_adjustments).toEqual(
        expect.arrayContaining([expect.stringMatching(/winter|heavy|wool/i)])
      );
      expect(summerResult.fabric_recommendations.seasonal_adjustments).toEqual(
        expect.arrayContaining([expect.stringMatching(/summer|light|breathable/i)])
      );
    });

    it('should adjust color recommendations by season', async () => {
      const springRequest = {
        ...mockOptimizationRequest,
        venue_type: 'outdoor_garden',
        season: 'spring' as const
      };

      const result = await venueIntelligenceService.optimizeForVenue(springRequest);

      expect(result.color_recommendations.recommended_colors).toEqual(
        expect.arrayContaining([expect.stringMatching(/pastel|light/i)])
      );
    });
  });

  describe('Photography Considerations', () => {
    it('should provide flash-aware recommendations', async () => {
      const noFlashRequest = {
        ...mockOptimizationRequest,
        photography_requirements: {
          flash_allowed: false,
          key_shots: ['ceremony'],
          lighting_priority: 'natural_preference'
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(noFlashRequest);

      expect(result.photography_tips).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/natural.*light|no.*flash/i)
        ])
      );
      expect(result.color_recommendations.recommended_colors).not.toContain('Reflective_Materials');
    });

    it('should consider key shot requirements', async () => {
      const portraitRequest = {
        ...mockOptimizationRequest,
        photography_requirements: {
          flash_allowed: true,
          key_shots: ['portraits', 'detail_shots'],
          lighting_priority: 'flash_optimization'
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(portraitRequest);

      expect(result.photography_tips).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/portrait|detail|flash/i)
        ])
      );
    });
  });

  describe('Cultural and Religious Sensitivity', () => {
    it('should identify cultural sensitivity issues', async () => {
      const result = await venueIntelligenceService.optimizeForVenue(mockOptimizationRequest);

      expect(result.potential_issues).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/conservative|respect|religious/i)
        ])
      );
    });

    it('should provide unspoken rules guidance', async () => {
      const result = await venueIntelligenceService.optimizeForVenue(mockOptimizationRequest);

      expect(result.venue_intelligence.unspoken_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_category: 'Respect',
            specific_guideline: expect.any(String),
            violation_risk: expect.any(String)
          })
        ])
      );
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate appropriate confidence scores', async () => {
      const wellKnownVenueRequest = {
        ...mockOptimizationRequest,
        venue_type: 'church' // Well-documented venue type
      };

      const unknownVenueRequest = {
        ...mockOptimizationRequest,
        venue_type: 'unknown_venue_type'
      };

      const knownResult = await venueIntelligenceService.optimizeForVenue(wellKnownVenueRequest);
      const unknownResult = await venueIntelligenceService.optimizeForVenue(unknownVenueRequest);

      expect(knownResult.confidence_score).toBeGreaterThan(unknownResult.confidence_score);
      expect(knownResult.confidence_score).toBeGreaterThanOrEqual(70);
      expect(unknownResult.confidence_score).toBeLessThan(70);
    });

    it('should factor lighting familiarity into confidence', async () => {
      const standardLightingRequest = {
        ...mockOptimizationRequest,
        lighting_conditions: {
          natural_light: 'window_light',
          artificial_light: 'standard_tungsten',
          color_temperature: '3000K',
          intensity: 'medium'
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(standardLightingRequest);

      expect(result.confidence_score).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Service Health and Cache Management', () => {
    it('should return healthy status when data is loaded', async () => {
      await venueIntelligenceService.initialize();

      const healthStatus = await venueIntelligenceService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: 'healthy',
        data_loaded: true,
        cache_status: expect.stringContaining('keys cached'),
        last_update: expect.any(String)
      });
    });

    it('should clear cache successfully', async () => {
      await venueIntelligenceService.clearCache();

      expect(mockCacheService.invalidateByTags).toHaveBeenCalledWith(['venue']);
    });

    it('should return degraded status when data is not loaded', async () => {
      const service = new VenueIntelligenceService();

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.data_loaded).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing venue type gracefully', async () => {
      const invalidRequest = {
        ...mockOptimizationRequest,
        venue_type: 'nonexistent_venue_type'
      };

      const result = await venueIntelligenceService.optimizeForVenue(invalidRequest);

      expect(result.confidence_score).toBeLessThan(50);
      expect(result.potential_issues).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/unknown.*venue|limited.*data/i)
        ])
      );
    });

    it('should handle extreme lighting conditions', async () => {
      const extremeLightingRequest = {
        ...mockOptimizationRequest,
        lighting_conditions: {
          natural_light: 'none',
          artificial_light: 'strobe_lights',
          color_temperature: '10000K',
          intensity: 'extreme'
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(extremeLightingRequest);

      expect(result.potential_issues).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/extreme|challenging|unusual/i)
        ])
      );
    });

    it('should handle cache failures gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache failure'));
      mockCacheService.set.mockRejectedValue(new Error('Cache failure'));

      const result = await venueIntelligenceService.optimizeForVenue(mockOptimizationRequest);

      expect(result).toMatchObject({
        venue_intelligence: expect.any(Object),
        color_recommendations: expect.any(Object),
        fabric_recommendations: expect.any(Object),
        confidence_score: expect.any(Number)
      });
    });

    it('should validate required photography parameters', async () => {
      const incompletePhotoRequest = {
        ...mockOptimizationRequest,
        photography_requirements: {
          flash_allowed: undefined as any,
          key_shots: [],
          lighting_priority: undefined as any
        }
      };

      const result = await venueIntelligenceService.optimizeForVenue(incompletePhotoRequest);

      expect(result.photography_tips).toHaveLength(0);
      expect(result.potential_issues).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/photography.*requirements|incomplete.*photo/i)
        ])
      );
    });

    it('should handle time of day variations', async () => {
      const eveningRequest = {
        ...mockOptimizationRequest,
        time_of_day: 'evening'
      };

      const morningRequest = {
        ...mockOptimizationRequest,
        time_of_day: 'morning'
      };

      const eveningResult = await venueIntelligenceService.optimizeForVenue(eveningRequest);
      const morningResult = await venueIntelligenceService.optimizeForVenue(morningRequest);

      expect(eveningResult.fabric_recommendations).toBeDefined();
      expect(morningResult.fabric_recommendations).toBeDefined();
    });
  });
});