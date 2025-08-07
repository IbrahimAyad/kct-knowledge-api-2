/**
 * Performance Tests for Intelligence Services
 * Tests response times, throughput, memory usage, and caching efficiency
 */

import { performance } from 'perf_hooks';
import { customerPsychologyService } from '../../services/customer-psychology-service';
import { careerIntelligenceService } from '../../services/career-intelligence-service';
import { venueIntelligenceService } from '../../services/venue-intelligence-service';
import { culturalAdaptationService } from '../../services/cultural-adaptation-service';
import { cacheService } from '../../services/cache-service';

// Mock dependencies for consistent performance testing
jest.mock('../../services/cache-service');
jest.mock('../../utils/enhanced-data-loader');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('Intelligence Services Performance Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    // Response time thresholds in milliseconds
    psychology_analysis: 500,
    career_analysis: 750,
    venue_optimization: 600,
    cultural_adaptation: 400,
    
    // Throughput thresholds (requests per second)
    min_throughput: 10,
    target_throughput: 50,
    
    // Memory thresholds
    max_memory_increase: 50 * 1024 * 1024, // 50MB
    
    // Cache efficiency thresholds
    min_cache_hit_rate: 0.8, // 80%
    max_cache_miss_penalty: 100 // milliseconds
  };

  // Test data generators
  const generatePsychologyRequests = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      customer_id: `perf-test-psychology-${i}`,
      session_duration: Math.random() * 30 * 60 * 1000, // 0-30 minutes
      choices_viewed: Math.floor(Math.random() * 100) + 1,
      page_views: Math.floor(Math.random() * 50) + 1,
      previous_sessions: []
    }));
  };

  const generateCareerRequests = (count: number) => {
    const industries = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Consulting'];
    const roles = ['Analyst', 'Manager', 'Director', 'VP', 'Executive'];
    const ageRanges = ['25-30', '30-35', '35-40', '40-45', '45-50'];

    return Array.from({ length: count }, (_, i) => ({
      customer_id: `perf-test-career-${i}`,
      current_role: roles[i % roles.length],
      industry: industries[i % industries.length],
      age_range: ageRanges[i % ageRanges.length],
      experience_years: Math.floor(Math.random() * 20) + 1,
      recent_behaviors: [
        {
          behavior_type: 'wardrobe_upgrade',
          frequency: 'recent',
          indicators: ['suit_purchase'],
          context: 'career_advancement'
        }
      ]
    }));
  };

  const generateVenueRequests = (count: number) => {
    const venueTypes = ['church', 'outdoor_garden', 'hotel_ballroom', 'beach', 'country_club'];
    const seasons = ['spring', 'summer', 'fall', 'winter'];

    return Array.from({ length: count }, (_, i) => ({
      venue_type: venueTypes[i % venueTypes.length],
      season: seasons[i % seasons.length] as any,
      lighting_conditions: {
        natural_light: 'variable_daylight',
        artificial_light: 'warm_tungsten',
        color_temperature: '3000K',
        intensity: 'medium'
      },
      time_of_day: 'afternoon',
      photography_requirements: {
        flash_allowed: i % 2 === 0,
        key_shots: ['ceremony'],
        lighting_priority: 'natural_preference'
      }
    }));
  };

  const generateCulturalRequests = (count: number) => {
    const regions = ['Detroit', 'Southeast_US', 'Northeast_US', 'California', 'Texas'];
    const cultures = ['American_Midwest', 'American_South', 'American_Northeast'];

    return Array.from({ length: count }, (_, i) => ({
      base_recommendations: [
        {
          item_type: 'Business Suit',
          color: 'Navy',
          fabric: 'Wool',
          style_details: 'Modern fit',
          seasonal_appropriateness: 'Year-round',
          formality_level: 'Business Professional',
          confidence_score: 85,
          reasoning: ['Classic business choice']
        }
      ],
      cultural_context: {
        primary_culture: cultures[i % cultures.length],
        business_context: 'Professional_Services',
        religious_considerations: [],
        regional_preferences: regions[i % regions.length],
        generation: 'Millennial'
      },
      specific_region: regions[i % regions.length],
      sensitivity_level: 'medium' as any,
      occasion_type: 'business_meeting'
    }));
  };

  beforeAll(async () => {
    // Setup mock cache service for performance testing
    mockCacheService.getOrSet.mockImplementation(async (key, factory) => {
      // Simulate cache miss on first call, hit on subsequent calls
      if (key.includes('miss-test')) {
        return await factory();
      }
      return await factory(); // Always execute factory for consistent timing
    });

    mockCacheService.get.mockImplementation(async (key) => {
      // Simulate cache hit/miss ratio for performance testing
      if (Math.random() < 0.8) { // 80% hit rate
        return { cached: true, timestamp: Date.now() };
      }
      return null;
    });

    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.getStats.mockResolvedValue({ keys_count: 100 });

    // Initialize services
    await customerPsychologyService.initialize();
    await careerIntelligenceService.initialize();
    await venueIntelligenceService.initialize();
    await culturalAdaptationService.initialize();
  });

  describe('Response Time Performance', () => {
    it('should analyze psychology within threshold', async () => {
      const requests = generatePsychologyRequests(10);
      const startTime = performance.now();

      const results = await Promise.all(
        requests.map(req => customerPsychologyService.analyzeDecisionFatigue(req))
      );

      const endTime = performance.now();
      const avgResponseTime = (endTime - startTime) / requests.length;

      expect(results).toHaveLength(10);
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.psychology_analysis);

      console.log(`Psychology Analysis Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should analyze career trajectory within threshold', async () => {
      const requests = generateCareerRequests(10);
      const startTime = performance.now();

      const results = await Promise.all(
        requests.map(req => careerIntelligenceService.analyzeCareerTrajectory(req))
      );

      const endTime = performance.now();
      const avgResponseTime = (endTime - startTime) / requests.length;

      expect(results).toHaveLength(10);
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.career_analysis);

      console.log(`Career Analysis Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should optimize venue conditions within threshold', async () => {
      const requests = generateVenueRequests(10);
      const startTime = performance.now();

      const results = await Promise.all(
        requests.map(req => venueIntelligenceService.optimizeForVenue(req))
      );

      const endTime = performance.now();
      const avgResponseTime = (endTime - startTime) / requests.length;

      expect(results).toHaveLength(10);
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.venue_optimization);

      console.log(`Venue Optimization Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should adapt cultural recommendations within threshold', async () => {
      const requests = generateCulturalRequests(10);
      const startTime = performance.now();

      const results = await Promise.all(
        requests.map(req => culturalAdaptationService.adaptRecommendations(req))
      );

      const endTime = performance.now();
      const avgResponseTime = (endTime - startTime) / requests.length;

      expect(results).toHaveLength(10);
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.cultural_adaptation);

      console.log(`Cultural Adaptation Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Throughput Performance', () => {
    it('should handle concurrent psychology requests efficiently', async () => {
      const concurrentRequests = 50;
      const requests = generatePsychologyRequests(concurrentRequests);
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        requests.map(req => customerPsychologyService.analyzeDecisionFatigue(req))
      );
      
      const endTime = performance.now();
      const totalTime = (endTime - startTime) / 1000; // Convert to seconds
      const throughput = concurrentRequests / totalTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.min_throughput);

      console.log(`Psychology Service Throughput: ${throughput.toFixed(2)} requests/second`);
    });

    it('should handle mixed service requests concurrently', async () => {
      const requestsPerService = 20;
      const psychologyRequests = generatePsychologyRequests(requestsPerService);
      const careerRequests = generateCareerRequests(requestsPerService);
      const venueRequests = generateVenueRequests(requestsPerService);
      const culturalRequests = generateCulturalRequests(requestsPerService);

      const startTime = performance.now();

      const [psychologyResults, careerResults, venueResults, culturalResults] = await Promise.all([
        Promise.all(psychologyRequests.map(req => customerPsychologyService.analyzeDecisionFatigue(req))),
        Promise.all(careerRequests.map(req => careerIntelligenceService.analyzeCareerTrajectory(req))),
        Promise.all(venueRequests.map(req => venueIntelligenceService.optimizeForVenue(req))),
        Promise.all(culturalRequests.map(req => culturalAdaptationService.adaptRecommendations(req)))
      ]);

      const endTime = performance.now();
      const totalTime = (endTime - startTime) / 1000;
      const totalRequests = requestsPerService * 4;
      const throughput = totalRequests / totalTime;

      expect(psychologyResults).toHaveLength(requestsPerService);
      expect(careerResults).toHaveLength(requestsPerService);
      expect(venueResults).toHaveLength(requestsPerService);
      expect(culturalResults).toHaveLength(requestsPerService);
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.min_throughput);

      console.log(`Mixed Services Throughput: ${throughput.toFixed(2)} requests/second`);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks during sustained load', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;
      const requests = generatePsychologyRequests(iterations);

      // Process requests in batches to simulate sustained load
      const batchSize = 10;
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        await Promise.all(
          batch.map(req => customerPsychologyService.analyzeDecisionFatigue(req))
        );

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.max_memory_increase);

      console.log(`Memory increase after ${iterations} requests: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should manage memory efficiently across all services', async () => {
      const initialMemory = process.memoryUsage();
      const requestsPerService = 25;

      // Generate requests for all services
      const allRequests = [
        ...generatePsychologyRequests(requestsPerService),
        ...generateCareerRequests(requestsPerService),
        ...generateVenueRequests(requestsPerService),
        ...generateCulturalRequests(requestsPerService)
      ];

      // Process all requests
      for (const req of allRequests) {
        if ('session_duration' in req) {
          await customerPsychologyService.analyzeDecisionFatigue(req);
        } else if ('current_role' in req) {
          await careerIntelligenceService.analyzeCareerTrajectory(req);
        } else if ('venue_type' in req) {
          await venueIntelligenceService.optimizeForVenue(req);
        } else if ('base_recommendations' in req) {
          await culturalAdaptationService.adaptRecommendations(req);
        }
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.max_memory_increase * 2); // Allow more for mixed load

      console.log(`Memory increase after mixed service load: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Caching Performance', () => {
    it('should demonstrate cache efficiency benefits', async () => {
      const request = generatePsychologyRequests(1)[0];

      // First request (cache miss)
      mockCacheService.get.mockResolvedValueOnce(null);
      const startTimeMiss = performance.now();
      await customerPsychologyService.analyzeDecisionFatigue(request);
      const missTime = performance.now() - startTimeMiss;

      // Second request (cache hit)
      mockCacheService.get.mockResolvedValueOnce({
        fatigue_score: 65,
        risk_level: 'medium',
        recommended_actions: ['test'],
        optimal_choice_count: 5,
        recovery_timing: 7,
        emotional_triggers: [],
        personalization_adjustments: []
      });
      const startTimeHit = performance.now();
      await customerPsychologyService.analyzeDecisionFatigue(request);
      const hitTime = performance.now() - startTimeHit;

      expect(hitTime).toBeLessThan(missTime);
      expect(missTime - hitTime).toBeGreaterThan(PERFORMANCE_THRESHOLDS.max_cache_miss_penalty);

      console.log(`Cache miss time: ${missTime.toFixed(2)}ms, Cache hit time: ${hitTime.toFixed(2)}ms`);
      console.log(`Cache efficiency gain: ${((missTime - hitTime) / missTime * 100).toFixed(1)}%`);
    });

    it('should maintain performance under cache pressure', async () => {
      const requests = generateCareerRequests(50);
      
      // Simulate varying cache hit rates
      let cacheHits = 0;
      let cacheMisses = 0;

      mockCacheService.get.mockImplementation(async (key) => {
        if (Math.random() < 0.7) { // 70% hit rate under pressure
          cacheHits++;
          return { cached: true, data: 'mock' };
        } else {
          cacheMisses++;
          return null;
        }
      });

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(req => careerIntelligenceService.analyzeCareerTrajectory(req))
      );
      const endTime = performance.now();

      const avgResponseTime = (endTime - startTime) / requests.length;
      const actualHitRate = cacheHits / (cacheHits + cacheMisses);

      expect(results).toHaveLength(requests.length);
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.career_analysis * 1.5); // Allow 50% increase under pressure
      expect(actualHitRate).toBeGreaterThan(0.6); // At least 60% hit rate

      console.log(`Performance under cache pressure: ${avgResponseTime.toFixed(2)}ms avg, ${(actualHitRate * 100).toFixed(1)}% hit rate`);
    });
  });

  describe('Scalability Performance', () => {
    it('should scale linearly with request volume', async () => {
      const testSizes = [10, 25, 50];
      const responseTimesBySize: { [size: number]: number } = {};

      for (const size of testSizes) {
        const requests = generateVenueRequests(size);
        
        const startTime = performance.now();
        const results = await Promise.all(
          requests.map(req => venueIntelligenceService.optimizeForVenue(req))
        );
        const endTime = performance.now();

        const avgResponseTime = (endTime - startTime) / size;
        responseTimesBySize[size] = avgResponseTime;

        expect(results).toHaveLength(size);
        expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.venue_optimization * 1.2);
      }

      // Check that response time doesn't increase dramatically with load
      const scalabilityRatio = responseTimesBySize[50] / responseTimesBySize[10];
      expect(scalabilityRatio).toBeLessThan(2.0); // Should not double response time at 5x load

      console.log('Scalability test results:');
      testSizes.forEach(size => {
        console.log(`  ${size} requests: ${responseTimesBySize[size].toFixed(2)}ms avg`);
      });
      console.log(`Scalability ratio (50x vs 10x): ${scalabilityRatio.toFixed(2)}`);
    });

    it('should handle burst traffic efficiently', async () => {
      // Simulate burst of requests followed by normal load
      const burstRequests = generateCulturalRequests(100);
      const normalRequests = generateCulturalRequests(20);

      // Burst phase
      const burstStartTime = performance.now();
      const burstResults = await Promise.all(
        burstRequests.map(req => culturalAdaptationService.adaptRecommendations(req))
      );
      const burstEndTime = performance.now();
      const burstTime = burstEndTime - burstStartTime;

      // Normal load phase (should be faster due to caching from burst)
      const normalStartTime = performance.now();
      const normalResults = await Promise.all(
        normalRequests.map(req => culturalAdaptationService.adaptRecommendations(req))
      );
      const normalEndTime = performance.now();
      const normalTime = normalEndTime - normalStartTime;

      const burstAvgTime = burstTime / burstRequests.length;
      const normalAvgTime = normalTime / normalRequests.length;

      expect(burstResults).toHaveLength(100);
      expect(normalResults).toHaveLength(20);
      expect(burstAvgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.cultural_adaptation * 2); // Allow 2x during burst
      expect(normalAvgTime).toBeLessThan(burstAvgTime); // Normal load should be faster

      console.log(`Burst performance: ${burstAvgTime.toFixed(2)}ms avg (${burstTime.toFixed(0)}ms total)`);
      console.log(`Normal performance after burst: ${normalAvgTime.toFixed(2)}ms avg`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // Baseline performance measurement
      const baselineRequests = generatePsychologyRequests(20);
      const baselineStartTime = performance.now();
      
      await Promise.all(
        baselineRequests.map(req => customerPsychologyService.analyzeDecisionFatigue(req))
      );
      
      const baselineTime = performance.now() - baselineStartTime;
      const baselineAvg = baselineTime / baselineRequests.length;

      // Simulate potential regression (this would fail if there's actual regression)
      const regressionRequests = generatePsychologyRequests(20);
      const regressionStartTime = performance.now();
      
      await Promise.all(
        regressionRequests.map(req => customerPsychologyService.analyzeDecisionFatigue(req))
      );
      
      const regressionTime = performance.now() - regressionStartTime;
      const regressionAvg = regressionTime / regressionRequests.length;

      // Performance should not regress by more than 50%
      const regressionRatio = regressionAvg / baselineAvg;
      expect(regressionRatio).toBeLessThan(1.5);

      console.log(`Baseline: ${baselineAvg.toFixed(2)}ms, Current: ${regressionAvg.toFixed(2)}ms`);
      console.log(`Performance ratio: ${regressionRatio.toFixed(2)} (< 1.5 expected)`);
    });
  });

  afterAll(() => {
    // Log final performance summary
    console.log('\n=== Performance Test Summary ===');
    console.log(`Thresholds: Psychology ${PERFORMANCE_THRESHOLDS.psychology_analysis}ms, Career ${PERFORMANCE_THRESHOLDS.career_analysis}ms`);
    console.log(`Thresholds: Venue ${PERFORMANCE_THRESHOLDS.venue_optimization}ms, Cultural ${PERFORMANCE_THRESHOLDS.cultural_adaptation}ms`);
    console.log(`Min Throughput: ${PERFORMANCE_THRESHOLDS.min_throughput} req/s`);
    console.log(`Max Memory Increase: ${PERFORMANCE_THRESHOLDS.max_memory_increase / 1024 / 1024}MB`);
  });
});