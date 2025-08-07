/**
 * Comprehensive Unit Tests for Customer Psychology Service
 */

import { customerPsychologyService } from '../services/customer-psychology-service';
import { cacheService } from '../services/cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  PsychologyAnalysisRequest,
  CustomerPsychologyProfile,
  PersonalityType,
  DecisionFatigueRisk
} from '../types/enhanced-knowledge-bank';

// Mock dependencies
jest.mock('../services/cache-service');
jest.mock('../utils/enhanced-data-loader');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockEnhancedDataLoader = enhancedDataLoader as jest.Mocked<typeof enhancedDataLoader>;

describe('CustomerPsychologyService', () => {
  const mockPsychologyData = [
    {
      customer_id: 'test-customer-1',
      behavioral_patterns: ['methodical_comparison', 'price_conscious'],
      emotional_triggers: ['quality', 'confidence'],
      decision_fatigue_indicators: ['extended_browsing', 'multiple_returns']
    }
  ];

  const mockBodyLanguageData = {
    professional_preferences: {
      Lawyers: {
        preferred_cut: 'Conservative',
        fit_style: 'Traditional',
        colors: ['Navy', 'Charcoal'],
        key_principle: 'Authority and trustworthiness'
      }
    },
    personality_preferences: {
      analytical: {
        style_philosophy: 'Quality and precision',
        fit_preference: 'Tailored fit',
        key_characteristics: ['Detail-oriented', 'Quality-focused']
      }
    },
    age_preferences: {},
    generational_trends: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.getOrSet.mockImplementation(async (key, factory) => {
      if (key.includes('psychology:data')) {
        return mockPsychologyData;
      }
      if (key.includes('psychology:body_language')) {
        return mockBodyLanguageData;
      }
      return await factory();
    });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.getStats.mockResolvedValue({ keys_count: 10 });
    mockCacheService.invalidateByTags.mockResolvedValue(undefined);

    mockEnhancedDataLoader.loadCustomerPsychologyData.mockResolvedValue(mockPsychologyData);
    mockEnhancedDataLoader.loadBodyLanguageFitPreferences.mockResolvedValue(mockBodyLanguageData);
    mockEnhancedDataLoader.transformToPsychologyProfiles.mockReturnValue([
      {
        customer_id: 'test-customer-1',
        decision_fatigue_score: 45,
        optimal_choice_count: 7,
        emotional_triggers: [
          {
            trigger_type: 'quality',
            intensity: 8,
            context: ['durability', 'craftsmanship'],
            messaging_approach: 'Emphasize superior materials and construction'
          }
        ],
        behavioral_patterns: [
          {
            pattern_type: 'browsing',
            frequency: 'methodical',
            indicators: ['detailed_comparison'],
            optimization_strategy: 'provide_comprehensive_information'
          }
        ],
        recovery_timing: 5,
        risk_level: 'low',
        last_updated: new Date().toISOString()
      }
    ]);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid data', async () => {
      await customerPsychologyService.initialize();

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'psychology:data',
        expect.any(Function),
        expect.objectContaining({ ttl: 2 * 60 * 60, tags: ['psychology', 'customer_data'] })
      );

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'psychology:body_language',
        expect.any(Function),
        expect.objectContaining({ ttl: 4 * 60 * 60, tags: ['psychology', 'body_language'] })
      );
    });

    it('should handle initialization failure gracefully', async () => {
      mockCacheService.getOrSet.mockRejectedValue(new Error('Cache failure'));

      await customerPsychologyService.initialize();

      const healthStatus = await customerPsychologyService.getHealthStatus();
      expect(healthStatus.status).toBe('degraded');
    });
  });

  describe('Decision Fatigue Analysis', () => {
    const mockAnalysisRequest: PsychologyAnalysisRequest = {
      customer_id: 'test-customer-1',
      session_duration: 15 * 60 * 1000, // 15 minutes
      choices_viewed: 25,
      page_views: 12,
      previous_sessions: [
        {
          duration: 10 * 60 * 1000,
          choices_made: 3,
          abandonment_point: null
        }
      ]
    };

    it('should analyze decision fatigue correctly', async () => {
      const result = await customerPsychologyService.analyzeDecisionFatigue(mockAnalysisRequest);

      expect(result).toMatchObject({
        fatigue_score: expect.any(Number),
        risk_level: expect.any(String),
        recommended_actions: expect.any(Array),
        optimal_choice_count: expect.any(Number),
        recovery_timing: expect.any(Number),
        emotional_triggers: expect.any(Array),
        personalization_adjustments: expect.any(Array)
      });

      expect(result.fatigue_score).toBeGreaterThan(0);
      expect(result.fatigue_score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.risk_level);
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        fatigue_score: 65,
        risk_level: 'medium' as DecisionFatigueRisk,
        recommended_actions: ['reduce_choices'],
        optimal_choice_count: 5,
        recovery_timing: 7,
        emotional_triggers: [],
        personalization_adjustments: []
      };

      mockCacheService.get.mockResolvedValueOnce(cachedResult);

      const result = await customerPsychologyService.analyzeDecisionFatigue(mockAnalysisRequest);

      expect(result).toEqual(cachedResult);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('psychology:analysis:test-customer-1')
      );
    });

    it('should calculate higher fatigue score for longer sessions', async () => {
      const longSessionRequest = {
        ...mockAnalysisRequest,
        session_duration: 30 * 60 * 1000, // 30 minutes
        choices_viewed: 50
      };

      const result = await customerPsychologyService.analyzeDecisionFatigue(longSessionRequest);

      expect(result.fatigue_score).toBeGreaterThan(70);
      expect(['high', 'critical']).toContain(result.risk_level);
    });

    it('should provide appropriate recommendations for high fatigue', async () => {
      const highFatigueRequest = {
        ...mockAnalysisRequest,
        session_duration: 35 * 60 * 1000,
        choices_viewed: 60
      };

      const result = await customerPsychologyService.analyzeDecisionFatigue(highFatigueRequest);

      expect(result.recommended_actions).toContain(
        expect.stringMatching(/intervention|break|simplified/i)
      );
      expect(result.optimal_choice_count).toBeLessThanOrEqual(5);
    });
  });

  describe('Customer Profile Management', () => {
    it('should get customer profile successfully', async () => {
      const profile = await customerPsychologyService.getCustomerProfile('test-customer-1');

      expect(profile).toMatchObject({
        customer_id: 'test-customer-1',
        decision_fatigue_score: expect.any(Number),
        optimal_choice_count: expect.any(Number),
        emotional_triggers: expect.any(Array),
        behavioral_patterns: expect.any(Array),
        recovery_timing: expect.any(Number),
        risk_level: expect.any(String),
        last_updated: expect.any(String)
      });
    });

    it('should create default profile for unknown customer', async () => {
      mockEnhancedDataLoader.transformToPsychologyProfiles.mockReturnValue([]);

      const profile = await customerPsychologyService.getCustomerProfile('unknown-customer');

      expect(profile).toMatchObject({
        customer_id: 'unknown-customer',
        decision_fatigue_score: 30,
        optimal_choice_count: 7,
        emotional_triggers: expect.any(Array),
        behavioral_patterns: expect.any(Array),
        recovery_timing: 5,
        risk_level: 'low'
      });
    });

    it('should update customer profile correctly', async () => {
      const existingProfile: CustomerPsychologyProfile = {
        customer_id: 'test-customer-1',
        decision_fatigue_score: 45,
        optimal_choice_count: 7,
        emotional_triggers: [],
        behavioral_patterns: [],
        recovery_timing: 5,
        risk_level: 'low',
        last_updated: new Date().toISOString()
      };

      mockCacheService.getOrSet.mockResolvedValueOnce(existingProfile);

      const updates = {
        decision_fatigue_score: 60,
        risk_level: 'medium' as DecisionFatigueRisk
      };

      const updatedProfile = await customerPsychologyService.updateCustomerProfile(
        'test-customer-1',
        updates
      );

      expect(updatedProfile.decision_fatigue_score).toBe(60);
      expect(updatedProfile.risk_level).toBe('medium');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'psychology:profile:test-customer-1',
        expect.objectContaining(updates),
        expect.any(Object)
      );
    });

    it('should throw error when updating non-existent profile', async () => {
      mockCacheService.getOrSet.mockResolvedValueOnce(null);

      await expect(
        customerPsychologyService.updateCustomerProfile('non-existent', { decision_fatigue_score: 50 })
      ).rejects.toThrow('Customer profile not found: non-existent');
    });
  });

  describe('Personalization Recommendations', () => {
    const mockProfile: CustomerPsychologyProfile = {
      customer_id: 'test-customer-1',
      decision_fatigue_score: 75,
      optimal_choice_count: 5,
      emotional_triggers: [
        {
          trigger_type: 'confidence',
          intensity: 9,
          context: ['professional'],
          messaging_approach: 'Emphasize professional confidence'
        }
      ],
      behavioral_patterns: [],
      recovery_timing: 10,
      risk_level: 'high',
      last_updated: new Date().toISOString()
    };

    it('should provide appropriate personalization recommendations', async () => {
      mockCacheService.getOrSet.mockResolvedValueOnce(mockProfile);

      const recommendations = await customerPsychologyService.getPersonalizationRecommendations(
        'test-customer-1',
        { session_duration: 20 * 60 * 1000, choices_viewed: 30 }
      );

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            adjustment_type: 'choice_reduction',
            specific_action: expect.stringContaining('5'),
            expected_impact: expect.any(String)
          }),
          expect.objectContaining({
            adjustment_type: 'messaging_change',
            specific_action: expect.stringContaining('confidence'),
            expected_impact: expect.any(String)
          })
        ])
      );
    });

    it('should recommend timing delay for extended sessions', async () => {
      const extendedProfile = { ...mockProfile, recovery_timing: 5 };
      mockCacheService.getOrSet.mockResolvedValueOnce(extendedProfile);

      const recommendations = await customerPsychologyService.getPersonalizationRecommendations(
        'test-customer-1',
        { session_duration: 25 * 60 * 1000 }
      );

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            adjustment_type: 'timing_delay',
            specific_action: expect.stringContaining('break'),
            expected_impact: expect.any(String)
          })
        ])
      );
    });

    it('should return default recommendations for unknown customer', async () => {
      mockCacheService.getOrSet.mockResolvedValueOnce(null);

      const recommendations = await customerPsychologyService.getPersonalizationRecommendations(
        'unknown-customer',
        {}
      );

      expect(recommendations).toEqual([
        expect.objectContaining({
          adjustment_type: 'messaging_change',
          specific_action: 'Use balanced quality and value messaging',
          expected_impact: 'Appeal to common motivators'
        })
      ]);
    });
  });

  describe('Personality Preferences', () => {
    it('should get personality preferences correctly', async () => {
      const preferences = await customerPsychologyService.getPersonalityPreferences('analytical');

      expect(preferences).toEqual(mockBodyLanguageData.personality_preferences.analytical);
    });

    it('should return default preferences for unknown personality type', async () => {
      const preferences = await customerPsychologyService.getPersonalityPreferences('unknown' as PersonalityType);

      expect(preferences).toMatchObject({
        style_philosophy: 'Balanced approach',
        fit_preference: 'Modern fit',
        key_characteristics: ['Quality focused'],
        suit_style: 'Classic business',
        body_language: 'Professional confidence'
      });
    });
  });

  describe('Service Health and Cache Management', () => {
    it('should return healthy status when data is loaded', async () => {
      await customerPsychologyService.initialize();

      const healthStatus = await customerPsychologyService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: 'healthy',
        data_loaded: true,
        cache_status: expect.stringContaining('keys cached'),
        last_update: expect.any(String)
      });
    });

    it('should clear cache successfully', async () => {
      await customerPsychologyService.clearCache();

      expect(mockCacheService.invalidateByTags).toHaveBeenCalledWith(['psychology']);
    });

    it('should return degraded status when data is not loaded', async () => {
      const service = new (customerPsychologyService.constructor as any)();

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.data_loaded).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme session duration gracefully', async () => {
      const extremeRequest: PsychologyAnalysisRequest = {
        customer_id: 'test-customer-1',
        session_duration: 120 * 60 * 1000, // 2 hours
        choices_viewed: 200,
        page_views: 100,
        previous_sessions: []
      };

      const result = await customerPsychologyService.analyzeDecisionFatigue(extremeRequest);

      expect(result.fatigue_score).toBeLessThanOrEqual(100);
      expect(result.risk_level).toBe('critical');
    });

    it('should handle zero session duration', async () => {
      const zeroRequest: PsychologyAnalysisRequest = {
        customer_id: 'test-customer-1',
        session_duration: 0,
        choices_viewed: 0,
        page_views: 0,
        previous_sessions: []
      };

      const result = await customerPsychologyService.analyzeDecisionFatigue(zeroRequest);

      expect(result.fatigue_score).toBeGreaterThanOrEqual(20); // Base score
      expect(result.risk_level).toBe('low');
    });

    it('should handle missing previous sessions', async () => {
      const request: PsychologyAnalysisRequest = {
        customer_id: 'test-customer-1',
        session_duration: 10 * 60 * 1000,
        choices_viewed: 15,
        page_views: 8,
        previous_sessions: undefined as any
      };

      const result = await customerPsychologyService.analyzeDecisionFatigue(request);

      expect(result).toMatchObject({
        fatigue_score: expect.any(Number),
        risk_level: expect.any(String)
      });
    });

    it('should handle cache service failures gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service down'));
      mockCacheService.set.mockRejectedValue(new Error('Cache service down'));

      const request: PsychologyAnalysisRequest = {
        customer_id: 'test-customer-1',
        session_duration: 10 * 60 * 1000,
        choices_viewed: 15,
        page_views: 8,
        previous_sessions: []
      };

      // Should still complete the analysis without caching
      const result = await customerPsychologyService.analyzeDecisionFatigue(request);

      expect(result).toMatchObject({
        fatigue_score: expect.any(Number),
        risk_level: expect.any(String)
      });
    });
  });
});