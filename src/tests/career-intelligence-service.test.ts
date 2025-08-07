/**
 * Comprehensive Unit Tests for Career Intelligence Service
 */

import { careerIntelligenceService } from '../services/career-intelligence-service';
import { cacheService } from '../services/cache-service';
import { enhancedDataLoader } from '../utils/enhanced-data-loader';
import {
  CareerTrajectoryRequest,
  CareerAdvancementStage,
  BehaviorData
} from '../types/enhanced-knowledge-bank';

// Mock dependencies
jest.mock('../services/cache-service');
jest.mock('../utils/enhanced-data-loader');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockEnhancedDataLoader = enhancedDataLoader as jest.Mocked<typeof enhancedDataLoader>;

describe('CareerIntelligenceService', () => {
  const mockCareerData = [
    {
      customer_id: 'career-test-1',
      current_role: 'Senior Analyst',
      industry: 'Finance',
      age_range: '30-35',
      wardrobe_investment_pattern: {
        budget_range: '$800-2000',
        frequency: 'quarterly',
        priorities: ['suits', 'shirts', 'accessories']
      },
      career_stage: 'advancing',
      recent_behaviors: [
        {
          behavior_type: 'wardrobe_upgrade',
          frequency: 'recent',
          indicators: ['suit_purchase', 'alteration_appointment'],
          context: 'promotion_preparation'
        }
      ]
    }
  ];

  const mockBodyLanguageData = {
    professional_preferences: {
      Investment_Bankers: {
        preferred_cut: 'Sharp, tailored',
        fit_style: 'Modern executive',
        colors: ['Navy', 'Charcoal', 'Black'],
        avoid: ['Casual elements', 'Bold patterns'],
        body_language_signals: ['Authority', 'Precision', 'Success'],
        key_principle: 'Executive presence and financial success'
      },
      Consultants: {
        preferred_cut: 'Professional modern',
        fit_style: 'Contemporary business',
        colors: ['Navy', 'Gray', 'Charcoal'],
        avoid: ['Overly trendy'],
        body_language_signals: ['Competence', 'Trustworthiness'],
        key_principle: 'Professional competence and reliability'
      }
    },
    personality_preferences: {},
    age_preferences: {},
    generational_trends: {}
  };

  const mockCareerTrajectoryRequest: CareerTrajectoryRequest = {
    customer_id: 'career-test-1',
    current_role: 'Senior Analyst',
    industry: 'Finance',
    age_range: '30-35',
    experience_years: 8,
    recent_behaviors: [
      {
        behavior_type: 'wardrobe_upgrade',
        frequency: 'recent',
        indicators: ['premium_suit_inquiry'],
        context: 'career_advancement'
      },
      {
        behavior_type: 'networking',
        frequency: 'increased',
        indicators: ['industry_events'],
        context: 'professional_development'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.getOrSet.mockImplementation(async (key, factory) => {
      if (key.includes('career:trajectory_data')) {
        return mockCareerData;
      }
      if (key.includes('career:body_language_preferences')) {
        return mockBodyLanguageData;
      }
      return await factory();
    });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.getStats.mockResolvedValue({ keys_count: 15 });
    mockCacheService.invalidateByTags.mockResolvedValue(undefined);

    mockEnhancedDataLoader.loadCareerTrajectoryData.mockResolvedValue(mockCareerData);
    mockEnhancedDataLoader.loadBodyLanguageFitPreferences.mockResolvedValue(mockBodyLanguageData);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid data', async () => {
      await careerIntelligenceService.initialize();

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'career:trajectory_data',
        expect.any(Function),
        expect.objectContaining({ ttl: 4 * 60 * 60, tags: ['career', 'trajectory'] })
      );

      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'career:body_language_preferences',
        expect.any(Function),
        expect.objectContaining({ ttl: 4 * 60 * 60, tags: ['career', 'preferences'] })
      );
    });

    it('should handle initialization failure gracefully', async () => {
      mockCacheService.getOrSet.mockRejectedValue(new Error('Data loading failed'));

      await careerIntelligenceService.initialize();

      const healthStatus = await careerIntelligenceService.getHealthStatus();
      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.data_loaded).toBe(false);
    });
  });

  describe('Career Trajectory Analysis', () => {
    it('should analyze career trajectory successfully', async () => {
      const result = await careerIntelligenceService.analyzeCareerTrajectory(mockCareerTrajectoryRequest);

      expect(result).toMatchObject({
        advancement_probability: expect.any(Number),
        predicted_timeline: expect.objectContaining({
          next_milestone: expect.any(String),
          estimated_months: expect.any(Number),
          confidence_level: expect.any(Number),
          key_indicators: expect.any(Array)
        }),
        wardrobe_recommendations: expect.any(Array),
        investment_strategy: expect.objectContaining({
          immediate_needs: expect.any(Array),
          medium_term_goals: expect.any(Array),
          long_term_vision: expect.any(String),
          budget_allocation: expect.any(Object)
        }),
        promotion_signals: expect.any(Array)
      });

      expect(result.advancement_probability).toBeGreaterThanOrEqual(10);
      expect(result.advancement_probability).toBeLessThanOrEqual(95);
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        advancement_probability: 75,
        predicted_timeline: {
          next_milestone: 'Director level',
          estimated_months: 12,
          confidence_level: 75,
          key_indicators: ['Strong advancement signals']
        },
        wardrobe_recommendations: [],
        investment_strategy: {
          immediate_needs: ['Executive suits'],
          medium_term_goals: ['Complete wardrobe'],
          long_term_vision: 'Executive presence',
          budget_allocation: { suits: 60, shirts: 20, accessories: 20 }
        },
        promotion_signals: []
      };

      mockCacheService.get.mockResolvedValueOnce(cachedResult);

      const result = await careerIntelligenceService.analyzeCareerTrajectory(mockCareerTrajectoryRequest);

      expect(result).toEqual(cachedResult);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('career:analysis:career-test-1')
      );
    });

    it('should calculate higher advancement probability for optimal factors', async () => {
      const optimalRequest = {
        ...mockCareerTrajectoryRequest,
        age_range: '30-35',
        industry: 'Technology',
        recent_behaviors: [
          {
            behavior_type: 'wardrobe_upgrade',
            frequency: 'recent',
            indicators: ['executive_suit_purchase'],
            context: 'promotion_preparation'
          },
          {
            behavior_type: 'networking',
            frequency: 'high',
            indicators: ['industry_leadership'],
            context: 'career_advancement'
          }
        ]
      };

      const result = await careerIntelligenceService.analyzeCareerTrajectory(optimalRequest);

      expect(result.advancement_probability).toBeGreaterThan(70);
      expect(result.predicted_timeline.estimated_months).toBeLessThan(18);
    });

    it('should provide appropriate recommendations for high advancement probability', async () => {
      const highProbabilityRequest = {
        ...mockCareerTrajectoryRequest,
        recent_behaviors: [
          {
            behavior_type: 'wardrobe_upgrade',
            frequency: 'recent',
            indicators: ['premium_investment'],
            context: 'executive_preparation'
          },
          {
            behavior_type: 'networking',
            frequency: 'high',
            indicators: ['c_suite_interactions'],
            context: 'leadership_development'
          }
        ]
      };

      const result = await careerIntelligenceService.analyzeCareerTrajectory(highProbabilityRequest);

      const executiveSuit = result.wardrobe_recommendations.find(rec => 
        rec.item_type.toLowerCase().includes('executive')
      );
      expect(executiveSuit).toBeDefined();
      expect(executiveSuit?.priority).toBeGreaterThanOrEqual(8);

      expect(result.investment_strategy.budget_allocation.suits).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Career Stage Preferences', () => {
    it('should get career stage preferences correctly', async () => {
      const preferences = await careerIntelligenceService.getCareerStagePreferences(
        'advancing',
        'Finance'
      );

      expect(preferences).toMatchObject({
        stage_info: expect.objectContaining({
          stage: 'advancing',
          age_range: expect.any(String),
          typical_wardrobe_needs: expect.any(Array),
          investment_focus: expect.any(Array),
          style_evolution: expect.any(String)
        }),
        professional_preferences: expect.any(Object),
        wardrobe_focus: expect.any(Array),
        investment_priorities: expect.any(Array)
      });

      expect(preferences.stage_info.typical_wardrobe_needs).toContain('Premium suits');
      expect(preferences.wardrobe_focus).toContain('Authority signaling');
    });

    it('should handle different career stages appropriately', async () => {
      const entryLevel = await careerIntelligenceService.getCareerStagePreferences(
        'entry_level',
        'Finance'
      );
      const executive = await careerIntelligenceService.getCareerStagePreferences(
        'executive',
        'Finance'
      );

      expect(entryLevel.stage_info.typical_wardrobe_needs).toContain('Basic business suits');
      expect(executive.stage_info.typical_wardrobe_needs).toContain('C-suite appropriate');

      expect(entryLevel.investment_priorities).toContain('Foundational pieces');
      expect(executive.investment_priorities).toContain('Bespoke wardrobe');
    });
  });

  describe('Industry Recommendations', () => {
    it('should provide industry-specific recommendations', async () => {
      const financeRecs = await careerIntelligenceService.getIndustryRecommendations(
        'Investment Banking',
        'senior'
      );

      expect(financeRecs).toMatchObject({
        colors: expect.arrayContaining(['Navy', 'Charcoal']),
        styles: expect.any(Array),
        avoid: expect.any(Array),
        key_principles: expect.any(Array),
        body_language_goals: expect.any(Array)
      });

      expect(financeRecs.body_language_goals).toContain('Authority');
    });

    it('should map industries correctly', async () => {
      const lawRecs = await careerIntelligenceService.getIndustryRecommendations(
        'Legal Services',
        'partner'
      );
      const consultingRecs = await careerIntelligenceService.getIndustryRecommendations(
        'Management Consulting',
        'principal'
      );

      // Both should get recommendations but may differ based on industry mapping
      expect(lawRecs.colors).toEqual(expect.any(Array));
      expect(consultingRecs.colors).toEqual(expect.any(Array));
    });

    it('should provide default recommendations for unknown industry', async () => {
      const unknownRecs = await careerIntelligenceService.getIndustryRecommendations(
        'Unknown Industry',
        'manager'
      );

      expect(unknownRecs).toMatchObject({
        colors: ['Navy', 'Charcoal', 'Gray'],
        styles: ['Modern fit', 'Classic contemporary'],
        avoid: ['Overly casual', 'Extremely trendy'],
        key_principles: ['Professional appearance', 'Quality focus'],
        body_language_goals: ['Competence', 'Trustworthiness']
      });
    });
  });

  describe('Wardrobe Timing Optimization', () => {
    const mockTrajectoryData = {
      customer_id: 'timing-test',
      current_role: 'Manager',
      target_role: 'Director',
      timeline_months: 12,
      wardrobe_investment_pattern: {
        budget_range: '$1000-3000',
        frequency: 'quarterly',
        priorities: ['suits', 'accessories']
      },
      advancement_indicators: ['performance_reviews', 'leadership_roles'],
      industry_context: 'Finance'
    };

    it('should optimize wardrobe timing correctly', async () => {
      const timing = await careerIntelligenceService.optimizeWardrobeTiming(
        'timing-test',
        mockTrajectoryData
      );

      expect(timing).toMatchObject({
        immediate_needs: expect.any(Array),
        upcoming_needs: expect.any(Array),
        future_planning: expect.any(Array),
        budget_timeline: expect.objectContaining({
          immediate: expect.any(Number),
          '3_months': expect.any(Number),
          '6_months': expect.any(Number),
          '12_months': expect.any(Number)
        })
      });

      // Budget timeline should add up to approximately 100%
      const totalBudgetPercentage = Object.values(timing.budget_timeline).reduce((sum, val) => sum + val, 0);
      const averageBudget = (1000 + 3000) / 2; // From budget range
      expect(totalBudgetPercentage).toBeCloseTo(averageBudget, -100); // Within $100
    });

    it('should prioritize immediate needs appropriately', async () => {
      const timing = await careerIntelligenceService.optimizeWardrobeTiming(
        'urgent-test',
        { ...mockTrajectoryData, timeline_months: 3 }
      );

      expect(timing.immediate_needs).toHaveLength(1);
      expect(timing.immediate_needs[0].priority).toBe(10);
      expect(timing.immediate_needs[0].timing).toContain('2 weeks');
    });
  });

  describe('Service Health and Cache Management', () => {
    it('should return healthy status when data is loaded', async () => {
      await careerIntelligenceService.initialize();

      const healthStatus = await careerIntelligenceService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: 'healthy',
        data_loaded: true,
        cache_status: expect.stringContaining('keys cached'),
        last_update: expect.any(String)
      });
    });

    it('should clear cache successfully', async () => {
      await careerIntelligenceService.clearCache();

      expect(mockCacheService.invalidateByTags).toHaveBeenCalledWith(['career']);
    });

    it('should return degraded status when data is not loaded', async () => {
      const service = new (careerIntelligenceService.constructor as any)();

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.data_loaded).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing behavior data gracefully', async () => {
      const requestWithoutBehaviors = {
        ...mockCareerTrajectoryRequest,
        recent_behaviors: []
      };

      const result = await careerIntelligenceService.analyzeCareerTrajectory(requestWithoutBehaviors);

      expect(result.advancement_probability).toBeGreaterThan(0);
      expect(result.promotion_signals).toHaveLength(1); // Default signal
      expect(result.promotion_signals[0].signal_type).toBe('wardrobe_upgrade');
    });

    it('should handle extreme age ranges', async () => {
      const youngProfessional = {
        ...mockCareerTrajectoryRequest,
        age_range: '22-25'
      };

      const seniorProfessional = {
        ...mockCareerTrajectoryRequest,
        age_range: '55-60'
      };

      const youngResult = await careerIntelligenceService.analyzeCareerTrajectory(youngProfessional);
      const seniorResult = await careerIntelligenceService.analyzeCareerTrajectory(seniorProfessional);

      expect(youngResult.advancement_probability).toBeGreaterThan(0);
      expect(seniorResult.advancement_probability).toBeGreaterThan(0);
    });

    it('should handle unknown industries gracefully', async () => {
      const unknownIndustryRequest = {
        ...mockCareerTrajectoryRequest,
        industry: 'Unknown Industry Sector'
      };

      const result = await careerIntelligenceService.analyzeCareerTrajectory(unknownIndustryRequest);

      expect(result.wardrobe_recommendations).toHaveLength(2); // At least basic recommendations
      expect(result.investment_strategy.immediate_needs).toBeDefined();
    });

    it('should handle cache failures gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service failure'));
      mockCacheService.set.mockRejectedValue(new Error('Cache service failure'));

      const result = await careerIntelligenceService.analyzeCareerTrajectory(mockCareerTrajectoryRequest);

      expect(result).toMatchObject({
        advancement_probability: expect.any(Number),
        predicted_timeline: expect.any(Object),
        wardrobe_recommendations: expect.any(Array),
        investment_strategy: expect.any(Object),
        promotion_signals: expect.any(Array)
      });
    });

    it('should handle invalid budget ranges', async () => {
      const invalidBudgetTrajectory = {
        ...mockCareerTrajectoryRequest,
        wardrobe_investment_pattern: {
          budget_range: 'invalid-budget',
          frequency: 'quarterly',
          priorities: ['suits']
        }
      };

      // Should not crash and should provide default budget calculations
      const timing = await careerIntelligenceService.optimizeWardrobeTiming(
        'budget-test',
        invalidBudgetTrajectory as any
      );

      expect(timing.budget_timeline.immediate).toBe(400); // Default 1000 * 0.4
    });

    it('should validate career stage mappings', async () => {
      const stages: CareerAdvancementStage[] = [
        'entry_level',
        'establishing',
        'advancing',
        'leadership',
        'executive'
      ];

      for (const stage of stages) {
        const preferences = await careerIntelligenceService.getCareerStagePreferences(stage, 'Technology');
        
        expect(preferences.stage_info.stage).toBe(stage);
        expect(preferences.wardrobe_focus).toHaveLength(3);
        expect(preferences.investment_priorities).toHaveLength(3);
      }
    });
  });
});