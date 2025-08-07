/**
 * Comprehensive Unit Tests for Cultural Adaptation Service
 */

import { CulturalAdaptationService } from '../services/cultural-adaptation-service';
import { cacheService } from '../services/cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  CulturalAdaptationRequest,
  CulturalContext,
  CulturalSensitivityLevel,
  EnhancedRecommendation
} from '../types/enhanced-knowledge-bank';

// Mock dependencies
jest.mock('../services/cache-service');
jest.mock('../utils/enhanced-data-loader');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockEnhancedDataLoader = enhancedDataLoader as jest.Mocked<typeof enhancedDataLoader>;

describe('CulturalAdaptationService', () => {
  let culturalAdaptationService: CulturalAdaptationService;

  const mockCulturalData = {
    regional_nuances: {
      Detroit: {
        color_preferences: {
          preferred_colors: ['Navy', 'Charcoal', 'Deep_Blue'],
          avoid_colors: ['Bright_Pink', 'Neon_Colors'],
          cultural_significance: {
            'Blue': 'Trust and stability - Detroit automotive heritage',
            'Red': 'Passion but use sparingly - sports team associations'
          }
        },
        style_variations: {
          business_casual: 'More relaxed than coastal cities',
          formal_wear: 'Classic American business style',
          seasonal_adaptations: {
            winter: 'Heavy emphasis on warmth and practicality',
            summer: 'Breathable fabrics essential due to humidity'
          }
        },
        formality_expectations: {
          business_meetings: 'Conservative business attire',
          social_events: 'Smart casual acceptable',
          formal_events: 'Traditional formal wear'
        },
        religious_considerations: {
          common_faiths: ['Christianity', 'Islam', 'Judaism'],
          general_guidelines: ['Conservative styling for religious venues', 'Respect for diverse traditions']
        },
        business_culture: {
          industry_focus: 'Automotive, manufacturing, healthcare',
          networking_style: 'Direct and practical',
          dress_expectations: 'Professional but not overly flashy'
        }
      },
      Southeast_US: {
        color_preferences: {
          preferred_colors: ['Pastels', 'Earth_Tones', 'Classic_Navy'],
          avoid_colors: ['All_Black_Summer', 'Heavy_Dark_Colors_Summer'],
          cultural_significance: {
            'Seersucker': 'Traditional summer fabric',
            'White': 'Acceptable year-round in formal contexts'
          }
        },
        style_variations: {
          seasonal_importance: 'High - distinct summer and winter wardrobes',
          fabric_priorities: ['Breathability', 'Natural_Fibers'],
          traditional_elements: ['Seersucker', 'Bow_Ties', 'Classic_Cuts']
        }
      }
    },
    color_significance: {
      Western_Business: {
        'Navy': { meaning: 'Trust, authority, professionalism', context: 'Universal business standard' },
        'Black': { meaning: 'Formality, sophistication', context: 'Evening events, formal occasions' },
        'White': { meaning: 'Purity, cleanliness', context: 'Shirts, summer events' },
        'Red': { meaning: 'Power, confidence', context: 'Accent color, use sparingly' }
      },
      Middle_Eastern: {
        'Green': { meaning: 'Peace, nature, Islam', context: 'Positive associations' },
        'Blue': { meaning: 'Trust, security', context: 'Safe business choice' },
        'Red': { meaning: 'Celebration, joy', context: 'Festive occasions' }
      },
      East_Asian: {
        'Red': { meaning: 'Good fortune, prosperity', context: 'Celebratory events' },
        'Gold': { meaning: 'Wealth, prosperity', context: 'Special occasions' },
        'Black': { meaning: 'Elegance, formality', context: 'Business settings' }
      }
    },
    business_cultures: {
      Automotive_Detroit: {
        values: ['Practicality', 'Durability', 'American_Heritage'],
        dress_philosophy: 'Function over flash',
        seasonal_considerations: ['Winter_Ready', 'Quality_Materials'],
        networking_approach: 'Straightforward and honest'
      },
      Finance_NYC: {
        values: ['Excellence', 'Success', 'Tradition'],
        dress_philosophy: 'Impeccable presentation required',
        seasonal_considerations: ['Four_Season_Wardrobe', 'Premium_Quality'],
        networking_approach: 'Polished and professional'
      }
    }
  };

  const mockBaseRecommendations: EnhancedRecommendation[] = [
    {
      item_type: 'Business Suit',
      color: 'Charcoal Gray',
      fabric: 'Wool',
      style_details: 'Modern fit, two-button',
      seasonal_appropriateness: 'Fall/Winter',
      formality_level: 'Business Professional',
      confidence_score: 85,
      reasoning: ['Versatile business color', 'Professional appearance']
    },
    {
      item_type: 'Dress Shirt',
      color: 'Light Blue',
      fabric: 'Cotton',
      style_details: 'Spread collar, French cuffs',
      seasonal_appropriateness: 'Year-round',
      formality_level: 'Business Professional',
      confidence_score: 90,
      reasoning: ['Classic business choice', 'Universally flattering']
    }
  ];

  const mockCulturalRequest: CulturalAdaptationRequest = {
    base_recommendations: mockBaseRecommendations,
    cultural_context: {
      primary_culture: 'American_Midwest',
      business_context: 'Automotive_Industry',
      religious_considerations: ['Christianity'],
      regional_preferences: 'Detroit_Area',
      generation: 'Millennial'
    },
    specific_region: 'Detroit',
    sensitivity_level: 'high' as CulturalSensitivityLevel,
    occasion_type: 'business_meeting'
  };

  beforeEach(() => {
    culturalAdaptationService = new CulturalAdaptationService();
    jest.clearAllMocks();

    mockCacheService.getOrSet.mockImplementation(async (key, factory) => {
      if (key.includes('cultural:nuances_data')) {
        return mockCulturalData;
      }
      return await factory();
    });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.getStats.mockResolvedValue({ keys_count: 25 });
    mockCacheService.invalidateByTags.mockResolvedValue(undefined);

    mockEnhancedDataLoader.loadCulturalNuances.mockResolvedValue(mockCulturalData);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid data', async () => {
      await culturalAdaptationService.initialize();

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'cultural:nuances_data',
        expect.any(Function),
        expect.objectContaining({ ttl: 8 * 60 * 60, tags: ['cultural', 'nuances'] })
      );
    });

    it('should handle initialization failure gracefully', async () => {
      mockCacheService.getOrSet.mockRejectedValue(new Error('Cultural data loading failed'));

      await culturalAdaptationService.initialize();

      const healthStatus = await culturalAdaptationService.getHealthStatus();
      expect(healthStatus.status).toBe('degraded');
    });

    it('should build specialized caches during initialization', async () => {
      await culturalAdaptationService.initialize();

      const healthStatus = await culturalAdaptationService.getHealthStatus();
      expect(healthStatus.data_loaded).toBe(true);
    });
  });

  describe('Cultural Adaptation', () => {
    it('should adapt recommendations successfully', async () => {
      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      expect(result).toMatchObject({
        adapted_recommendations: expect.any(Array),
        cultural_insights: expect.any(Array),
        sensitivity_warnings: expect.any(Array),
        local_preferences: expect.any(Object),
        adaptation_confidence: expect.any(Number)
      });

      expect(result.adapted_recommendations).toHaveLength(mockBaseRecommendations.length);
      expect(result.adaptation_confidence).toBeGreaterThanOrEqual(0);
      expect(result.adaptation_confidence).toBeLessThanOrEqual(100);
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        adapted_recommendations: mockBaseRecommendations,
        cultural_insights: ['Detroit prefers practical styling'],
        sensitivity_warnings: [],
        local_preferences: mockCulturalData.regional_nuances.Detroit,
        adaptation_confidence: 85
      };

      mockCacheService.get.mockResolvedValueOnce(cachedResult);

      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      expect(result).toEqual(cachedResult);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('cultural:adaptation:')
      );
    });

    it('should adapt colors based on regional preferences', async () => {
      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      const adaptedSuit = result.adapted_recommendations.find(rec => rec.item_type === 'Business Suit');
      expect(adaptedSuit).toBeDefined();
      
      // Should maintain professional colors that align with Detroit preferences
      expect(['Navy', 'Charcoal', 'Deep_Blue', 'Charcoal Gray']).toContain(adaptedSuit?.color);
    });

    it('should provide cultural insights', async () => {
      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Detroit|automotive|practical|Midwest/i)
        ])
      );
    });
  });

  describe('Regional Adaptations', () => {
    it('should adapt for Detroit regional preferences', async () => {
      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      expect(result.local_preferences).toMatchObject({
        color_preferences: expect.objectContaining({
          preferred_colors: expect.arrayContaining(['Navy', 'Charcoal', 'Deep_Blue'])
        }),
        business_culture: expect.objectContaining({
          industry_focus: expect.stringContaining('Automotive')
        })
      });
    });

    it('should adapt for different regions appropriately', async () => {
      const southeastRequest = {
        ...mockCulturalRequest,
        specific_region: 'Southeast_US',
        cultural_context: {
          ...mockCulturalRequest.cultural_context,
          regional_preferences: 'Southeast_Traditional'
        }
      };

      const result = await culturalAdaptationService.adaptRecommendations(southeastRequest);

      expect(result.local_preferences.color_preferences.preferred_colors).toEqual(
        expect.arrayContaining(['Pastels', 'Earth_Tones', 'Classic_Navy'])
      );
      
      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/southern|traditional|seasonal|seersucker/i)
        ])
      );
    });

    it('should handle unknown regions gracefully', async () => {
      const unknownRegionRequest = {
        ...mockCulturalRequest,
        specific_region: 'Unknown_Region'
      };

      const result = await culturalAdaptationService.adaptRecommendations(unknownRegionRequest);

      expect(result.adaptation_confidence).toBeLessThan(70);
      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/general|standard|universal/i)
        ])
      );
    });
  });

  describe('Sensitivity Level Handling', () => {
    it('should provide detailed adaptations for high sensitivity', async () => {
      const highSensitivityRequest = {
        ...mockCulturalRequest,
        sensitivity_level: 'high' as CulturalSensitivityLevel
      };

      const result = await culturalAdaptationService.adaptRecommendations(highSensitivityRequest);

      expect(result.sensitivity_warnings).toHaveLength(0); // No warnings for appropriate recommendations
      expect(result.cultural_insights).toHaveLength(3); // Detailed insights
      expect(result.adaptation_confidence).toBeGreaterThanOrEqual(80);
    });

    it('should provide basic adaptations for low sensitivity', async () => {
      const lowSensitivityRequest = {
        ...mockCulturalRequest,
        sensitivity_level: 'low' as CulturalSensitivityLevel
      };

      const result = await culturalAdaptationService.adaptRecommendations(lowSensitivityRequest);

      expect(result.cultural_insights).toHaveLength(1); // Basic insights
      expect(result.adapted_recommendations).toHaveLength(mockBaseRecommendations.length);
    });

    it('should identify sensitivity warnings for inappropriate recommendations', async () => {
      const problematicRecommendations: EnhancedRecommendation[] = [
        {
          item_type: 'Business Suit',
          color: 'Bright Pink',
          fabric: 'Synthetic Shiny',
          style_details: 'Ultra-slim fit',
          seasonal_appropriateness: 'Summer',
          formality_level: 'Business Casual',
          confidence_score: 60,
          reasoning: ['Fashion forward', 'Attention grabbing']
        }
      ];

      const problematicRequest = {
        ...mockCulturalRequest,
        base_recommendations: problematicRecommendations
      };

      const result = await culturalAdaptationService.adaptRecommendations(problematicRequest);

      expect(result.sensitivity_warnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/bright.*pink|inappropriate|avoid/i)
        ])
      );
    });
  });

  describe('Business Culture Adaptations', () => {
    it('should adapt for automotive industry culture', async () => {
      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/automotive|practical|durability|function/i)
        ])
      );

      const adaptedRecommendations = result.adapted_recommendations;
      expect(adaptedRecommendations.every(rec => rec.confidence_score >= 70)).toBe(true);
    });

    it('should adapt for different business cultures', async () => {
      const financeRequest = {
        ...mockCulturalRequest,
        cultural_context: {
          ...mockCulturalRequest.cultural_context,
          business_context: 'Finance_Industry',
          regional_preferences: 'NYC_Financial_District'
        }
      };

      const result = await culturalAdaptationService.adaptRecommendations(financeRequest);

      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/finance|excellence|premium|professional/i)
        ])
      );
    });
  });

  describe('Religious Considerations', () => {
    it('should consider religious context in adaptations', async () => {
      const religiousRequest = {
        ...mockCulturalRequest,
        cultural_context: {
          ...mockCulturalRequest.cultural_context,
          religious_considerations: ['Christianity', 'Islam']
        },
        occasion_type: 'religious_ceremony'
      };

      const result = await culturalAdaptationService.adaptRecommendations(religiousRequest);

      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/conservative|religious|respect|modest/i)
        ])
      );

      const adaptedRecommendations = result.adapted_recommendations;
      expect(adaptedRecommendations.every(rec => 
        !rec.reasoning.some(reason => reason.includes('flashy') || reason.includes('attention-grabbing'))
      )).toBe(true);
    });

    it('should provide appropriate warnings for religious contexts', async () => {
      const inappropriateForReligiousContext: EnhancedRecommendation[] = [
        {
          item_type: 'Business Suit',
          color: 'Flashy Silver',
          fabric: 'Metallic',
          style_details: 'Ultra-modern cut',
          seasonal_appropriateness: 'Year-round',
          formality_level: 'Fashion Forward',
          confidence_score: 70,
          reasoning: ['Attention-grabbing', 'Modern style']
        }
      ];

      const religiousRequest = {
        ...mockCulturalRequest,
        base_recommendations: inappropriateForReligiousContext,
        occasion_type: 'religious_ceremony'
      };

      const result = await culturalAdaptationService.adaptRecommendations(religiousRequest);

      expect(result.sensitivity_warnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/metallic|flashy|inappropriate.*religious/i)
        ])
      );
    });
  });

  describe('Seasonal and Climate Adaptations', () => {
    it('should adapt for seasonal requirements', async () => {
      const summerRequest = {
        ...mockCulturalRequest,
        specific_region: 'Southeast_US'  // Hot, humid climate
      };

      const result = await culturalAdaptationService.adaptRecommendations(summerRequest);

      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/breathable|summer|humidity|natural.*fiber/i)
        ])
      );

      const adaptedShirt = result.adapted_recommendations.find(rec => rec.item_type === 'Dress Shirt');
      expect(adaptedShirt?.fabric).toMatch(/Cotton|Linen|Breathable/i);
    });

    it('should adapt for winter climate requirements', async () => {
      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/winter|warmth|practical|quality.*material/i)
        ])
      );
    });
  });

  describe('Color Significance Analysis', () => {
    it('should analyze color significance correctly', async () => {
      const colorAnalysis = await culturalAdaptationService.analyzeColorSignificance(
        'Red',
        mockCulturalRequest.cultural_context
      );

      expect(colorAnalysis).toMatchObject({
        color: 'Red',
        cultural_meanings: expect.any(Array),
        appropriateness_score: expect.any(Number),
        usage_recommendations: expect.any(Array),
        potential_issues: expect.any(Array)
      });

      expect(colorAnalysis.appropriateness_score).toBeGreaterThanOrEqual(0);
      expect(colorAnalysis.appropriateness_score).toBeLessThanOrEqual(100);
    });

    it('should identify culturally significant colors', async () => {
      const blueAnalysis = await culturalAdaptationService.analyzeColorSignificance(
        'Navy',
        mockCulturalRequest.cultural_context
      );

      expect(blueAnalysis.cultural_meanings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/trust|professional|business|Detroit.*automotive/i)
        ])
      );
      expect(blueAnalysis.appropriateness_score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Service Health and Cache Management', () => {
    it('should return healthy status when data is loaded', async () => {
      await culturalAdaptationService.initialize();

      const healthStatus = await culturalAdaptationService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: 'healthy',
        data_loaded: true,
        cache_status: expect.stringContaining('keys cached'),
        last_update: expect.any(String)
      });
    });

    it('should clear cache successfully', async () => {
      await culturalAdaptationService.clearCache();

      expect(mockCacheService.invalidateByTags).toHaveBeenCalledWith(['cultural']);
    });

    it('should return degraded status when data is not loaded', async () => {
      const service = new CulturalAdaptationService();

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.data_loaded).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty base recommendations', async () => {
      const emptyRequest = {
        ...mockCulturalRequest,
        base_recommendations: []
      };

      const result = await culturalAdaptationService.adaptRecommendations(emptyRequest);

      expect(result.adapted_recommendations).toHaveLength(0);
      expect(result.cultural_insights).toHaveLength(1); // At least general insights
      expect(result.adaptation_confidence).toBeLessThan(50);
    });

    it('should handle missing cultural context gracefully', async () => {
      const incompleteCulturalContext: CulturalContext = {
        primary_culture: undefined as any,
        business_context: undefined as any,
        religious_considerations: [],
        regional_preferences: undefined as any,
        generation: undefined as any
      };

      const incompleteRequest = {
        ...mockCulturalRequest,
        cultural_context: incompleteCulturalContext
      };

      const result = await culturalAdaptationService.adaptRecommendations(incompleteRequest);

      expect(result.adaptation_confidence).toBeLessThan(60);
      expect(result.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/general|universal|standard/i)
        ])
      );
    });

    it('should handle cache failures gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service failure'));
      mockCacheService.set.mockRejectedValue(new Error('Cache service failure'));

      const result = await culturalAdaptationService.adaptRecommendations(mockCulturalRequest);

      expect(result).toMatchObject({
        adapted_recommendations: expect.any(Array),
        cultural_insights: expect.any(Array),
        adaptation_confidence: expect.any(Number)
      });
    });

    it('should validate sensitivity level values', async () => {
      const invalidSensitivityRequest = {
        ...mockCulturalRequest,
        sensitivity_level: 'invalid_level' as any
      };

      const result = await culturalAdaptationService.adaptRecommendations(invalidSensitivityRequest);

      // Should default to medium sensitivity
      expect(result.cultural_insights).toHaveLength(2);
      expect(result.adaptation_confidence).toBeGreaterThan(50);
    });

    it('should handle conflicting cultural requirements', async () => {
      const conflictingRequest = {
        ...mockCulturalRequest,
        cultural_context: {
          primary_culture: 'Conservative_Traditional',
          business_context: 'Creative_Industry',
          religious_considerations: ['Christianity'],
          regional_preferences: 'Urban_Progressive',
          generation: 'Gen_Z'
        }
      };

      const result = await culturalAdaptationService.adaptRecommendations(conflictingRequest);

      expect(result.sensitivity_warnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/conflicting|balance|consider.*multiple/i)
        ])
      );
      expect(result.adaptation_confidence).toBeLessThan(75);
    });
  });
});