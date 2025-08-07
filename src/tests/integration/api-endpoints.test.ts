import request from 'supertest';
import app from '../../server';
import { cacheService } from '../../services/cache-service';
import { knowledgeBankService } from '../../services/knowledge-bank-service';

// Mock dependencies
jest.mock('../../services/cache-service');
jest.mock('../../services/knowledge-bank-service');
jest.mock('../../utils/logger');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockKnowledgeBankService = knowledgeBankService as jest.Mocked<typeof knowledgeBankService>;

describe('API Endpoints Integration Tests', () => {
  const validApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KCT_API_KEYS = validApiKey;
    
    // Mock cache service methods
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.getHealthInfo.mockResolvedValue({
      status: 'healthy',
      connected: true,
      keys_count: 100,
      memory_usage: '50MB'
    });

    // Mock knowledge bank service initialization
    mockKnowledgeBankService.initialize.mockResolvedValue(undefined);
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .get('/api/v1/colors')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('API key')
      });
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', 'invalid-key')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid API key')
      });
    });

    it('should accept requests with valid API key', async () => {
      mockKnowledgeBankService.getComprehensiveRecommendations.mockResolvedValue({
        recommendations: []
      });

      const response = await request(app)
        .post('/api/v1/recommendations')
        .set('X-API-Key', validApiKey)
        .send({ occasion: 'business' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow health endpoints without authentication', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should allow documentation endpoints without authentication', async () => {
      const response = await request(app)
        .get('/docs')
        .expect(302); // Redirect to Swagger UI

      expect(response.headers.location).toContain('swagger');
    });
  });

  describe('Color Service Endpoints', () => {
    beforeEach(() => {
      // Mock color service responses
      jest.doMock('../../services/color-service', () => ({
        colorService: {
          getColorFamilies: jest.fn().mockResolvedValue([
            { family: 'blue', colors: ['navy', 'royal', 'sky'] }
          ]),
          getUniversalRules: jest.fn().mockResolvedValue([
            { rule: 'Navy pairs well with white' }
          ]),
          getTrendingColors: jest.fn().mockResolvedValue([
            { color: 'forest_green', trend_score: 0.8 }
          ]),
          getColorRecommendations: jest.fn().mockResolvedValue({
            primary_recommendations: ['white', 'light_blue'],
            alternative_options: ['gray', 'burgundy']
          }),
          findComplementaryColors: jest.fn().mockResolvedValue([
            'white', 'light_gray', 'burgundy'
          ])
        }
      }));
    });

    it('should get color families successfully', async () => {
      const response = await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          color_families: expect.any(Array),
          universal_rules: expect.any(Array),
          trending: expect.any(Array)
        }
      });
    });

    it('should get color recommendations with valid request', async () => {
      const response = await request(app)
        .post('/api/v1/colors/recommendations')
        .set('X-API-Key', validApiKey)
        .send({
          suit_color: 'navy',
          occasion: 'business',
          customer_profile: {
            age: 30,
            style_preference: 'classic'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          primary_recommendations: expect.any(Array),
          alternative_options: expect.any(Array)
        })
      });
    });

    it('should validate required parameters for color recommendations', async () => {
      const response = await request(app)
        .post('/api/v1/colors/recommendations')
        .set('X-API-Key', validApiKey)
        .send({
          // Missing suit_color
          occasion: 'business'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('suit_color is required')
      });
    });

    it('should get complementary colors for specific color', async () => {
      const response = await request(app)
        .get('/api/colors/navy/relationships')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should handle non-existent color lookup', async () => {
      jest.doMock('../../services/color-service', () => ({
        colorService: {
          findComplementaryColors: jest.fn().mockRejectedValue(new Error('Color not found'))
        }
      }));

      const response = await request(app)
        .get('/api/colors/nonexistent/relationships')
        .set('X-API-Key', validApiKey)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Color not found')
      });
    });
  });

  describe('Style Profile Endpoints', () => {
    beforeEach(() => {
      jest.doMock('../../services/style-profile-service', () => ({
        styleProfileService: {
          identifyProfile: jest.fn().mockResolvedValue({
            profile_name: 'classic_professional',
            confidence: 0.9,
            key_characteristics: ['conservative', 'polished', 'timeless']
          }),
          getAllProfiles: jest.fn().mockResolvedValue([
            { name: 'classic_professional', description: 'Timeless business style' },
            { name: 'modern_creative', description: 'Contemporary with flair' }
          ]),
          getProfile: jest.fn().mockResolvedValue({
            name: 'classic_professional',
            description: 'Timeless business style',
            key_pieces: ['navy_suit', 'white_shirt', 'silk_tie'],
            color_palette: ['navy', 'white', 'gray', 'burgundy']
          }),
          getQuizQuestions: jest.fn().mockResolvedValue([
            {
              question: 'What is your work environment?',
              options: ['Corporate office', 'Creative studio', 'Remote work']
            }
          ])
        }
      }));
    });

    it('should identify style profile from preferences', async () => {
      const response = await request(app)
        .post('/api/v1/profiles/identify')
        .set('X-API-Key', validApiKey)
        .send({
          work_environment: 'corporate',
          preferred_colors: ['navy', 'white', 'gray'],
          lifestyle: 'professional',
          age_range: '25-35'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          profile_name: expect.any(String),
          confidence: expect.any(Number),
          key_characteristics: expect.any(Array)
        })
      });
    });

    it('should get all available style profiles', async () => {
      const response = await request(app)
        .get('/api/v1/profiles')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String)
          })
        ])
      });
    });

    it('should get specific style profile', async () => {
      const response = await request(app)
        .get('/api/v1/profiles/classic_professional')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          name: 'classic_professional',
          key_pieces: expect.any(Array),
          color_palette: expect.any(Array)
        })
      });
    });

    it('should return 404 for non-existent profile', async () => {
      jest.doMock('../../services/style-profile-service', () => ({
        styleProfileService: {
          getProfile: jest.fn().mockResolvedValue(null)
        }
      }));

      const response = await request(app)
        .get('/api/v1/profiles/nonexistent')
        .set('X-API-Key', validApiKey)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Profile not found'
      });
    });

    it('should get style quiz questions', async () => {
      const response = await request(app)
        .get('/api/v1/profiles/quiz/questions')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            question: expect.any(String),
            options: expect.any(Array)
          })
        ])
      });
    });
  });

  describe('Conversion Optimization Endpoints', () => {
    beforeEach(() => {
      jest.doMock('../../services/conversion-service', () => ({
        conversionService: {
          getConversionOptimization: jest.fn().mockResolvedValue({
            optimization_score: 0.85,
            recommendations: [
              'Consider adding a complementary pocket square',
              'Offer alternative tie patterns for variety'
            ],
            expected_conversion_lift: 0.12
          }),
          getTopConvertingCombinations: jest.fn().mockResolvedValue([
            {
              combination: 'navy_suit_white_shirt_burgundy_tie',
              conversion_rate: 0.18,
              confidence: 0.9
            }
          ]),
          getConversionByOccasion: jest.fn().mockResolvedValue({
            occasion: 'business_formal',
            average_conversion: 0.15,
            top_combinations: ['navy_suit_white_shirt']
          }),
          predictConversionRate: jest.fn().mockResolvedValue({
            predicted_rate: 0.16,
            confidence: 0.8,
            factors: [
              { factor: 'color_harmony', impact: 0.3 },
              { factor: 'price_point', impact: 0.25 }
            ]
          })
        }
      }));
    });

    it('should get conversion optimization recommendations', async () => {
      const response = await request(app)
        .post('/api/v1/conversion/optimize')
        .set('X-API-Key', validApiKey)
        .send({
          current_combination: {
            suit: 'navy',
            shirt: 'white',
            tie: 'navy'
          },
          target_customer: {
            age: 30,
            budget_range: { min: 400, max: 800 }
          },
          business_context: {
            season: 'fall',
            inventory_priorities: ['suits', 'ties']
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          optimization_score: expect.any(Number),
          recommendations: expect.any(Array),
          expected_conversion_lift: expect.any(Number)
        })
      });
    });

    it('should get top converting combinations', async () => {
      const response = await request(app)
        .get('/api/v1/conversion/top-combinations?limit=5')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            combination: expect.any(String),
            conversion_rate: expect.any(Number),
            confidence: expect.any(Number)
          })
        ])
      });
    });

    it('should get conversion data by occasion', async () => {
      const response = await request(app)
        .get('/api/v1/conversion/occasion/business_formal')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          occasion: 'business_formal',
          average_conversion: expect.any(Number)
        })
      });
    });

    it('should predict conversion rate for combination', async () => {
      const response = await request(app)
        .post('/api/v1/conversion/predict')
        .set('X-API-Key', validApiKey)
        .send({
          combination: {
            suit_color: 'navy',
            shirt_color: 'white',
            tie_color: 'burgundy'
          },
          customer_profile: {
            age: 35,
            style_preference: 'classic'
          },
          occasion: 'business_formal',
          device: 'desktop',
          season: 'fall'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          predicted_rate: expect.any(Number),
          confidence: expect.any(Number),
          factors: expect.any(Array)
        })
      });
    });

    it('should validate required combination for prediction', async () => {
      const response = await request(app)
        .post('/api/v1/conversion/predict')
        .set('X-API-Key', validApiKey)
        .send({
          // Missing combination
          customer_profile: { age: 35 }
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('combination is required')
      });
    });
  });

  describe('Outfit Validation Endpoints', () => {
    beforeEach(() => {
      mockKnowledgeBankService.validateAndOptimizeOutfit.mockResolvedValue({
        is_valid: true,
        validation_score: 0.88,
        issues: [],
        suggestions: [
          'Consider a silk pocket square for added elegance',
          'Brown leather shoes would complement this combination'
        ],
        optimized_combination: {
          suit_color: 'navy',
          shirt_color: 'white',
          tie_color: 'burgundy',
          accessories: ['brown_belt', 'brown_shoes']
        }
      });
    });

    it('should validate outfit combination successfully', async () => {
      const response = await request(app)
        .post('/api/v1/validation/outfit')
        .set('X-API-Key', validApiKey)
        .send({
          suit_color: 'navy',
          shirt_color: 'white',
          tie_color: 'burgundy',
          occasion: 'business_formal',
          customer_profile: {
            age: 30,
            body_type: 'athletic',
            style_preference: 'classic'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          is_valid: expect.any(Boolean),
          validation_score: expect.any(Number),
          suggestions: expect.any(Array)
        })
      });
    });

    it('should validate required outfit parameters', async () => {
      const response = await request(app)
        .post('/api/v1/validation/outfit')
        .set('X-API-Key', validApiKey)
        .send({
          suit_color: 'navy',
          shirt_color: 'white'
          // Missing tie_color
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('tie_color')
      });
    });

    it('should handle outfit validation service errors', async () => {
      mockKnowledgeBankService.validateAndOptimizeOutfit.mockRejectedValue(
        new Error('Validation service unavailable')
      );

      const response = await request(app)
        .post('/api/v1/validation/outfit')
        .set('X-API-Key', validApiKey)
        .send({
          suit_color: 'navy',
          shirt_color: 'white',
          tie_color: 'burgundy'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to validate outfit')
      });
    });
  });

  describe('Fashion Intelligence Endpoints', () => {
    beforeEach(() => {
      mockKnowledgeBankService.getFashionIntelligence.mockResolvedValue({
        trending_combinations: [
          { combination: 'navy_charcoal_burgundy', trend_score: 0.9 }
        ],
        seasonal_insights: {
          current_season: 'fall',
          recommended_colors: ['burgundy', 'forest_green', 'charcoal'],
          fabric_suggestions: ['wool', 'flannel', 'tweed']
        },
        style_evolution: {
          emerging_trends: ['sustainable_fabrics', 'relaxed_business_attire'],
          declining_trends: ['ultra_formal_dress_codes']
        },
        market_analysis: {
          popular_occasions: ['business_casual', 'smart_casual'],
          growth_segments: ['sustainable_fashion', 'custom_fit']
        }
      });

      mockKnowledgeBankService.getPersonalizedExperience.mockResolvedValue({
        personalized_recommendations: [
          {
            item_type: 'suit',
            recommended_colors: ['navy', 'charcoal'],
            styling_notes: ['Classic cut for professional appearance']
          }
        ],
        shopping_behavior: {
          preferred_price_range: { min: 300, max: 700 },
          frequent_occasions: ['business_formal', 'wedding_guest'],
          style_evolution: 'consistent_classic'
        },
        customization_opportunities: [
          'Monogrammed shirts',
          'Custom suit alterations',
          'Seasonal color updates'
        ]
      });

      mockKnowledgeBankService.getKnowledgeBankInfo.mockResolvedValue({
        knowledge_base: {
          total_combinations: 15420,
          validated_rules: 1247,
          trending_insights: 89,
          customer_profiles: 7
        },
        data_freshness: {
          last_update: '2024-01-15T10:30:00Z',
          trend_data_age_hours: 6,
          validation_coverage: 0.94
        },
        performance_metrics: {
          recommendation_accuracy: 0.91,
          customer_satisfaction: 0.87,
          conversion_improvement: 0.23
        }
      });
    });

    it('should get fashion intelligence insights', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          trending_combinations: expect.any(Array),
          seasonal_insights: expect.any(Object),
          style_evolution: expect.any(Object),
          market_analysis: expect.any(Object)
        })
      });
    });

    it('should get personalized experience recommendations', async () => {
      const response = await request(app)
        .post('/api/v1/personalization')
        .set('X-API-Key', validApiKey)
        .send({
          customer_id: 'customer_123',
          purchase_history: [
            { item: 'navy_suit', date: '2023-09-15' },
            { item: 'white_shirt', date: '2023-10-01' }
          ],
          preferences: {
            preferred_colors: ['navy', 'white', 'gray'],
            style_preference: 'classic',
            budget_range: { min: 300, max: 800 }
          },
          context: {
            upcoming_occasions: ['business_meeting', 'wedding'],
            season: 'winter'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          personalized_recommendations: expect.any(Array),
          shopping_behavior: expect.any(Object),
          customization_opportunities: expect.any(Array)
        })
      });
    });

    it('should get knowledge bank information', async () => {
      const response = await request(app)
        .get('/api/v1/info')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          knowledge_base: expect.objectContaining({
            total_combinations: expect.any(Number),
            validated_rules: expect.any(Number)
          }),
          data_freshness: expect.any(Object),
          performance_metrics: expect.any(Object)
        })
      });
    });
  });

  describe('Health and Monitoring Endpoints', () => {
    beforeEach(() => {
      jest.doMock('../../services/system-health-service', () => ({
        systemHealthService: {
          getHealthCheck: jest.fn().mockResolvedValue({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            uptime: 86400,
            services: {
              cache: 'healthy',
              knowledge_bank: 'healthy',
              validation_engine: 'healthy'
            }
          }),
          getSystemHealth: jest.fn().mockResolvedValue({
            overall_status: 'healthy',
            services: {
              cache: { status: 'healthy', response_time: 5 },
              database: { status: 'healthy', response_time: 12 },
              external_apis: { status: 'degraded', response_time: 150 }
            },
            performance: {
              cpu_usage: 0.45,
              memory_usage: 0.67,
              disk_usage: 0.23
            }
          }),
          getTrendingHealth: jest.fn().mockResolvedValue({
            trending_service_status: 'healthy',
            data_freshness: 'current',
            last_update: new Date().toISOString(),
            trending_accuracy: 0.92
          })
        }
      }));

      jest.doMock('../../services/metrics-collector', () => ({
        metricsCollector: {
          getMetricsSnapshot: jest.fn().mockResolvedValue({
            requests: {
              total: 15420,
              successful: 14987,
              failed: 433,
              rate_limited: 12
            },
            performance: {
              average_response_time: 145,
              p95_response_time: 320,
              p99_response_time: 650
            },
            cache: {
              hit_ratio: 0.78,
              total_keys: 5420,
              memory_usage: '125MB'
            }
          })
        }
      }));
    });

    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it('should return comprehensive system health', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          overall_status: expect.any(String),
          services: expect.any(Object),
          performance: expect.any(Object)
        })
      });
    });

    it('should return cache health information', async () => {
      const response = await request(app)
        .get('/health/cache')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          status: expect.any(String),
          connected: expect.any(Boolean)
        })
      });
    });

    it('should return performance metrics', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          requests: expect.any(Object),
          performance: expect.any(Object),
          cache: expect.any(Object)
        })
      });
    });

    it('should return trending service health', async () => {
      const response = await request(app)
        .get('/health/trending')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          trending_service_status: expect.any(String),
          data_freshness: expect.any(String),
          trending_accuracy: expect.any(Number)
        })
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .set('X-API-Key', validApiKey)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Not Found')
      });
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/colors/recommendations')
        .set('X-API-Key', validApiKey)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should handle service timeouts gracefully', async () => {
      mockKnowledgeBankService.getComprehensiveRecommendations.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 35000)) // Longer than timeout
      );

      const response = await request(app)
        .post('/api/v1/recommendations')
        .set('X-API-Key', validApiKey)
        .send({ occasion: 'business' })
        .expect(408); // Request timeout

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('timeout')
      });
    });

    it('should handle rate limiting', async () => {
      // Make many requests quickly to trigger rate limiting
      const requests = Array.from({ length: 1001 }, () =>
        request(app)
          .get('/api/v1/colors')
          .set('X-API-Key', validApiKey)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].body).toMatchObject({
        success: false,
        error: expect.stringContaining('Too many requests')
      });
    });

    it('should handle internal server errors gracefully', async () => {
      mockKnowledgeBankService.getComprehensiveRecommendations.mockRejectedValue(
        new Error('Internal service error')
      );

      const response = await request(app)
        .post('/api/v1/recommendations')
        .set('X-API-Key', validApiKey)
        .send({ occasion: 'business' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should validate request schemas', async () => {
      const response = await request(app)
        .post('/api/v1/profiles/identify')
        .set('X-API-Key', validApiKey)
        .send({
          invalid_field: 'invalid_value'
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('validation')
      });
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/colors')
        .set('Origin', 'https://kctmenswear.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'X-API-Key')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('X-API-Key');
    });
  });

  describe('Performance and Caching', () => {
    it('should use caching for color endpoints', async () => {
      // First request
      await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);

      // Second request should use cache
      mockCacheService.get.mockResolvedValueOnce({
        color_families: ['cached_data'],
        universal_rules: ['cached_rules'],
        trending: ['cached_trending']
      });

      const response = await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.data).toMatchObject({
        color_families: ['cached_data'],
        universal_rules: ['cached_rules'],
        trending: ['cached_trending']
      });
    });

    it('should set appropriate cache headers', async () => {
      const response = await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.headers['cache-control']).toBeDefined();
      expect(response.headers['etag']).toBeDefined();
    });

    it('should compress responses', async () => {
      const response = await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should include performance timing headers', async () => {
      const response = await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-cache-status']).toBeDefined();
    });
  });
});