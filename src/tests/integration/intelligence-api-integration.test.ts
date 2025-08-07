/**
 * Comprehensive Integration Tests for Intelligence API Endpoints
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/test-app-factory';
import { cacheService } from '../../services/cache-service';
import { customerPsychologyService } from '../../services/customer-psychology-service';
import { careerIntelligenceService } from '../../services/career-intelligence-service';
import { venueIntelligenceService } from '../../services/venue-intelligence-service';
import { culturalAdaptationService } from '../../services/cultural-adaptation-service';

// Mock external dependencies but test real service integration
jest.mock('../../services/cache-service');
jest.mock('../../utils/enhanced-data-loader');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('Intelligence API Integration Tests', () => {
  let app: Express;

  // Mock data for consistent testing
  const mockPsychologyData = [
    {
      customer_id: 'integration-test-1',
      behavioral_patterns: ['methodical_comparison'],
      emotional_triggers: ['quality', 'confidence'],
      decision_fatigue_indicators: []
    }
  ];

  const mockCareerData = [
    {
      customer_id: 'career-integration-1',
      current_role: 'Senior Manager',
      industry: 'Technology',
      advancement_probability: 75
    }
  ];

  const mockVenueData = {
    church_venues: {
      lighting_conditions: { natural_light: 'stained_glass_filtered' },
      color_preferences: { recommended: ['Navy', 'Charcoal'] }
    }
  };

  const mockCulturalData = {
    regional_nuances: {
      Detroit: {
        color_preferences: { preferred_colors: ['Navy', 'Charcoal'] },
        business_culture: { industry_focus: 'Automotive' }
      }
    }
  };

  beforeAll(async () => {
    // Create test app with all routes
    app = await createTestApp();

    // Mock cache service responses
    mockCacheService.getOrSet.mockImplementation(async (key, factory) => {
      if (key.includes('psychology')) return mockPsychologyData;
      if (key.includes('career')) return mockCareerData;
      if (key.includes('venue')) return mockVenueData;
      if (key.includes('cultural')) return mockCulturalData;
      return await factory();
    });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.getStats.mockResolvedValue({ keys_count: 50 });
    mockCacheService.invalidateByTags.mockResolvedValue(undefined);

    // Initialize services
    await customerPsychologyService.initialize();
    await careerIntelligenceService.initialize();
    await venueIntelligenceService.initialize();
    await culturalAdaptationService.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer Psychology API Integration', () => {
    const psychologyAnalysisRequest = {
      customer_id: 'integration-test-1',
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

    it('should analyze customer psychology successfully', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send(psychologyAnalysisRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          fatigue_score: expect.any(Number),
          risk_level: expect.stringMatching(/^(low|medium|high|critical)$/),
          recommended_actions: expect.any(Array),
          optimal_choice_count: expect.any(Number),
          recovery_timing: expect.any(Number),
          emotional_triggers: expect.any(Array),
          personalization_adjustments: expect.any(Array)
        }
      });

      expect(response.body.data.fatigue_score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.fatigue_score).toBeLessThanOrEqual(100);
    });

    it('should get customer psychology profile', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/psychology/profile/integration-test-1')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customer_id: 'integration-test-1',
          decision_fatigue_score: expect.any(Number),
          optimal_choice_count: expect.any(Number),
          emotional_triggers: expect.any(Array),
          behavioral_patterns: expect.any(Array),
          risk_level: expect.any(String),
          last_updated: expect.any(String)
        }
      });
    });

    it('should get personalization recommendations', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/psychology/personalization')
        .send({
          customer_id: 'integration-test-1',
          context: {
            session_duration: 20 * 60 * 1000,
            choices_viewed: 30,
            page_type: 'product_listing'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            adjustment_type: expect.any(String),
            specific_action: expect.any(String),
            expected_impact: expect.any(String)
          })
        ])
      );
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        customer_id: '', // Invalid empty customer_id
        session_duration: -1, // Invalid negative duration
        choices_viewed: 'invalid' // Invalid type
      };

      const response = await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/validation|invalid/i)
      });
    });
  });

  describe('Career Intelligence API Integration', () => {
    const careerAnalysisRequest = {
      customer_id: 'career-integration-1',
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
        }
      ]
    };

    it('should analyze career trajectory successfully', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/career/analyze')
        .send(careerAnalysisRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
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
        }
      });

      expect(response.body.data.advancement_probability).toBeGreaterThanOrEqual(10);
      expect(response.body.data.advancement_probability).toBeLessThanOrEqual(95);
    });

    it('should get career stage preferences', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/career/preferences/advancing/Finance')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          stage_info: expect.objectContaining({
            stage: 'advancing',
            typical_wardrobe_needs: expect.any(Array),
            investment_focus: expect.any(Array)
          }),
          professional_preferences: expect.any(Object),
          wardrobe_focus: expect.any(Array),
          investment_priorities: expect.any(Array)
        }
      });
    });

    it('should get industry recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/career/industry/Technology/senior')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          colors: expect.any(Array),
          styles: expect.any(Array),
          avoid: expect.any(Array),
          key_principles: expect.any(Array),
          body_language_goals: expect.any(Array)
        }
      });
    });

    it('should optimize wardrobe timing', async () => {
      const timingRequest = {
        customer_id: 'career-integration-1',
        current_trajectory: {
          customer_id: 'career-integration-1',
          current_role: 'Manager',
          target_role: 'Director',
          timeline_months: 12,
          wardrobe_investment_pattern: {
            budget_range: '$1000-3000',
            frequency: 'quarterly',
            priorities: ['suits', 'accessories']
          },
          advancement_indicators: ['performance_reviews'],
          industry_context: 'Finance'
        }
      };

      const response = await request(app)
        .post('/api/v1/intelligence/career/timing')
        .send(timingRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          immediate_needs: expect.any(Array),
          upcoming_needs: expect.any(Array),
          future_planning: expect.any(Array),
          budget_timeline: expect.objectContaining({
            immediate: expect.any(Number),
            '3_months': expect.any(Number),
            '6_months': expect.any(Number),
            '12_months': expect.any(Number)
          })
        }
      });
    });
  });

  describe('Venue Intelligence API Integration', () => {
    const venueOptimizationRequest = {
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

    it('should optimize for venue conditions successfully', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/venue/optimize')
        .send(venueOptimizationRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
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
        }
      });

      expect(response.body.data.confidence_score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.confidence_score).toBeLessThanOrEqual(100);
    });

    it('should get venue intelligence for specific venue type', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/venue/info/church')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          lighting_conditions: expect.any(Object),
          color_preferences: expect.any(Object)
        })
      });
    });

    it('should analyze lighting conditions', async () => {
      const lightingRequest = {
        natural_light: 'direct_sunlight',
        artificial_light: 'LED_cool',
        color_temperature: '6500K',
        intensity: 'high'
      };

      const response = await request(app)
        .post('/api/v1/intelligence/venue/lighting/analyze')
        .send(lightingRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          analysis: expect.any(Object),
          recommendations: expect.any(Array),
          color_adjustments: expect.any(Array)
        }
      });
    });
  });

  describe('Cultural Adaptation API Integration', () => {
    const culturalAdaptationRequest = {
      base_recommendations: [
        {
          item_type: 'Business Suit',
          color: 'Charcoal Gray',
          fabric: 'Wool',
          style_details: 'Modern fit, two-button',
          seasonal_appropriateness: 'Fall/Winter',
          formality_level: 'Business Professional',
          confidence_score: 85,
          reasoning: ['Versatile business color', 'Professional appearance']
        }
      ],
      cultural_context: {
        primary_culture: 'American_Midwest',
        business_context: 'Automotive_Industry',
        religious_considerations: ['Christianity'],
        regional_preferences: 'Detroit_Area',
        generation: 'Millennial'
      },
      specific_region: 'Detroit',
      sensitivity_level: 'high',
      occasion_type: 'business_meeting'
    };

    it('should adapt recommendations successfully', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/cultural/adapt')
        .send(culturalAdaptationRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          adapted_recommendations: expect.any(Array),
          cultural_insights: expect.any(Array),
          sensitivity_warnings: expect.any(Array),
          local_preferences: expect.any(Object),
          adaptation_confidence: expect.any(Number)
        }
      });

      expect(response.body.data.adaptation_confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.data.adaptation_confidence).toBeLessThanOrEqual(100);
    });

    it('should get cultural nuances for region', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/cultural/nuances/Detroit')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          color_preferences: expect.any(Object),
          business_culture: expect.any(Object)
        })
      });
    });

    it('should analyze color significance', async () => {
      const colorAnalysisRequest = {
        color: 'Navy',
        cultural_context: {
          primary_culture: 'American_Business',
          business_context: 'Finance',
          regional_preferences: 'Northeast_US'
        }
      };

      const response = await request(app)
        .post('/api/v1/intelligence/cultural/color/analyze')
        .send(colorAnalysisRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          color: 'Navy',
          cultural_meanings: expect.any(Array),
          appropriateness_score: expect.any(Number),
          usage_recommendations: expect.any(Array),
          potential_issues: expect.any(Array)
        }
      });
    });
  });

  describe('Cross-Service Integration', () => {
    it('should combine psychology and career intelligence', async () => {
      // First get psychology analysis
      const psychologyResponse = await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send({
          customer_id: 'combined-test-1',
          session_duration: 20 * 60 * 1000,
          choices_viewed: 40,
          page_views: 15
        })
        .expect(200);

      // Then use psychology insights in career analysis
      const careerResponse = await request(app)
        .post('/api/v1/intelligence/career/analyze')
        .send({
          customer_id: 'combined-test-1',
          current_role: 'Manager',
          industry: 'Technology',
          age_range: '32-38',
          experience_years: 10,
          recent_behaviors: [
            {
              behavior_type: 'wardrobe_upgrade',
              frequency: 'frequent',
              indicators: ['executive_preparation'],
              context: 'promotion_readiness'
            }
          ],
          psychology_profile: psychologyResponse.body.data
        })
        .expect(200);

      expect(careerResponse.body.data.advancement_probability).toBeGreaterThan(60);
      expect(careerResponse.body.data.wardrobe_recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            priority: expect.any(Number),
            reasoning: expect.any(String)
          })
        ])
      );
    });

    it('should combine venue and cultural intelligence', async () => {
      // Get venue optimization
      const venueResponse = await request(app)
        .post('/api/v1/intelligence/venue/optimize')
        .send({
          venue_type: 'outdoor_garden',
          season: 'spring',
          lighting_conditions: {
            natural_light: 'variable_daylight',
            color_temperature: '5600K',
            intensity: 'high_variable'
          }
        })
        .expect(200);

      // Apply cultural adaptation to venue recommendations
      const culturalResponse = await request(app)
        .post('/api/v1/intelligence/cultural/adapt')
        .send({
          base_recommendations: [
            {
              item_type: 'Wedding Suit',
              color: 'Light Gray',
              fabric: 'Linen Blend',
              style_details: 'Destination wedding appropriate',
              seasonal_appropriateness: 'Spring/Summer',
              formality_level: 'Semi-Formal',
              confidence_score: 80,
              reasoning: ['Outdoor venue appropriate', 'Seasonal color']
            }
          ],
          cultural_context: {
            primary_culture: 'American_South',
            regional_preferences: 'Coastal_Southern',
            occasion_type: 'wedding'
          },
          specific_region: 'Southeast_US',
          sensitivity_level: 'medium'
        })
        .expect(200);

      expect(culturalResponse.body.data.adapted_recommendations[0]).toMatchObject({
        item_type: 'Wedding Suit',
        confidence_score: expect.any(Number)
      });

      expect(culturalResponse.body.data.cultural_insights).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/southern|traditional|seasonal/i)
        ])
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/required|validation/i)
      });
    });

    it('should handle service initialization failures gracefully', async () => {
      // Mock service failure
      jest.spyOn(customerPsychologyService, 'analyzeDecisionFatigue')
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'));

      const response = await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send({
          customer_id: 'error-test-1',
          session_duration: 15 * 60 * 1000,
          choices_viewed: 25,
          page_views: 12
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/service.*unavailable|internal.*error/i)
      });
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/v1/intelligence/psychology/analyze')
          .send({
            customer_id: 'rate-limit-test',
            session_duration: 1000,
            choices_viewed: 1,
            page_views: 1
          })
      );

      const responses = await Promise.allSettled(promises);
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate authentication for protected endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send({
          customer_id: 'auth-test-1',
          session_duration: 15 * 60 * 1000,
          choices_viewed: 25,
          page_views: 12
        })
        // Don't include authentication header
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/authentication|unauthorized/i)
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should cache psychology analysis results', async () => {
      const analysisRequest = {
        customer_id: 'cache-test-1',
        session_duration: 15 * 60 * 1000,
        choices_viewed: 25,
        page_views: 12
      };

      // First request
      const startTime1 = Date.now();
      await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send(analysisRequest)
        .expect(200);
      const duration1 = Date.now() - startTime1;

      // Second request (should be faster due to caching)
      const startTime2 = Date.now();
      await request(app)
        .post('/api/v1/intelligence/psychology/analyze')
        .send(analysisRequest)
        .expect(200);
      const duration2 = Date.now() - startTime2;

      expect(duration2).toBeLessThan(duration1 * 0.8); // At least 20% faster
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/v1/intelligence/career/analyze')
          .send({
            customer_id: `concurrent-test-${i}`,
            current_role: 'Analyst',
            industry: 'Finance',
            age_range: '25-30',
            experience_years: 3,
            recent_behaviors: []
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalDuration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (less than 5 seconds for 10 requests)
      expect(totalDuration).toBeLessThan(5000);
    });
  });
});