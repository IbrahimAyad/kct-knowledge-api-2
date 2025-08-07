import request from 'supertest';
import app from '../../server';
import { performance } from 'perf_hooks';

// Mock dependencies for performance testing
jest.mock('../../services/cache-service');
jest.mock('../../services/knowledge-bank-service');
jest.mock('../../utils/logger');

describe('Performance and Load Testing', () => {
  const validApiKey = 'test-api-key';
  
  beforeAll(() => {
    process.env.KCT_API_KEYS = validApiKey;
    
    // Mock fast responses for performance testing
    jest.doMock('../../services/color-service', () => ({
      colorService: {
        getColorFamilies: jest.fn().mockResolvedValue([{ family: 'blue' }]),
        getUniversalRules: jest.fn().mockResolvedValue([{ rule: 'test' }]),
        getTrendingColors: jest.fn().mockResolvedValue([{ color: 'navy' }]),
        getColorRecommendations: jest.fn().mockResolvedValue({ recommendations: [] }),
        findComplementaryColors: jest.fn().mockResolvedValue(['white'])
      }
    }));
  });

  describe('Response Time Performance', () => {
    it('should respond to health check within 100ms', async () => {
      const start = performance.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(100);
    });

    it('should respond to color API within 500ms', async () => {
      const start = performance.now();
      
      await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(500);
    });

    it('should respond to recommendations API within 1000ms', async () => {
      jest.doMock('../../services/knowledge-bank-service', () => ({
        knowledgeBankService: {
          initialize: jest.fn(),
          getComprehensiveRecommendations: jest.fn().mockResolvedValue({
            recommendations: []
          })
        }
      }));

      const start = performance.now();
      
      await request(app)
        .post('/api/v1/recommendations')
        .set('X-API-Key', validApiKey)
        .send({ occasion: 'business' })
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(1000);
    });

    it('should maintain response time under load', async () => {
      const concurrentRequests = 10;
      const maxResponseTime = 1000;
      
      const requests = Array.from({ length: concurrentRequests }, () => {
        const startTime = performance.now();
        return request(app)
          .get('/api/v1/colors')
          .set('X-API-Key', validApiKey)
          .then(response => {
            const endTime = performance.now();
            return {
              status: response.status,
              responseTime: endTime - startTime
            };
          });
      });

      const results = await Promise.all(requests);
      
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.responseTime).toBeLessThan(maxResponseTime);
      });

      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(averageResponseTime).toBeLessThan(maxResponseTime * 0.8);
    });
  });

  describe('Throughput Testing', () => {
    it('should handle burst of requests without failures', async () => {
      const burstSize = 20;
      const timeWindow = 1000; // 1 second
      
      const startTime = performance.now();
      
      const requests = Array.from({ length: burstSize }, () =>
        request(app)
          .get('/health')
          .expect(200)
      );

      const results = await Promise.all(requests);
      const endTime = performance.now();
      
      expect(results).toHaveLength(burstSize);
      expect(endTime - startTime).toBeLessThan(timeWindow);
      
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });

    it('should maintain performance with mixed endpoint requests', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/api/v1/colors', auth: true },
        { method: 'post', path: '/api/v1/colors/recommendations', auth: true, body: { suit_color: 'navy' } }
      ];

      const requestsPerEndpoint = 5;
      const maxResponseTime = 1500;

      const allRequests = endpoints.flatMap(endpoint =>
        Array.from({ length: requestsPerEndpoint }, () => {
          const startTime = performance.now();
          let req = request(app)[endpoint.method](endpoint.path);
          
          if (endpoint.auth) {
            req = req.set('X-API-Key', validApiKey);
          }
          
          if (endpoint.body) {
            req = req.send(endpoint.body);
          }

          return req.then(response => ({
            endpoint: endpoint.path,
            status: response.status,
            responseTime: performance.now() - startTime
          }));
        })
      );

      const results = await Promise.all(allRequests);
      
      results.forEach(result => {
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(500);
        expect(result.responseTime).toBeLessThan(maxResponseTime);
      });
    });

    it('should handle sequential requests efficiently', async () => {
      const sequentialRequests = 10;
      const maxTotalTime = 3000; // 3 seconds for 10 requests
      
      const startTime = performance.now();
      
      for (let i = 0; i < sequentialRequests; i++) {
        await request(app)
          .get('/api/v1/colors')
          .set('X-API-Key', validApiKey)
          .expect(200);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(maxTotalTime);
      
      const averageTimePerRequest = totalTime / sequentialRequests;
      expect(averageTimePerRequest).toBeLessThan(300); // 300ms per request
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .get('/api/v1/colors')
          .set('X-API-Key', validApiKey)
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB for 50 requests)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large request payloads efficiently', async () => {
      const largePayload = {
        suit_color: 'navy',
        customer_profile: {
          purchase_history: Array.from({ length: 100 }, (_, i) => ({
            item: `item_${i}`,
            date: '2023-01-01',
            price: 100 + i,
            rating: 4.5
          })),
          preferences: {
            colors: Array.from({ length: 20 }, (_, i) => `color_${i}`),
            styles: Array.from({ length: 10 }, (_, i) => `style_${i}`)
          }
        }
      };

      const start = performance.now();
      
      await request(app)
        .post('/api/v1/colors/recommendations')
        .set('X-API-Key', validApiKey)
        .send(largePayload)
        .expect(200);
      
      const responseTime = performance.now() - start;
      expect(responseTime).toBeLessThan(2000); // Should handle large payload within 2 seconds
    });

    it('should efficiently handle concurrent large payloads', async () => {
      const largePayload = {
        combinations: Array.from({ length: 50 }, (_, i) => ({
          suit: `suit_${i}`,
          shirt: `shirt_${i}`,
          tie: `tie_${i}`
        }))
      };

      const concurrentRequests = 5;
      const maxResponseTime = 3000;

      const requests = Array.from({ length: concurrentRequests }, () => {
        const startTime = performance.now();
        return request(app)
          .post('/api/combinations/validate')
          .set('X-API-Key', validApiKey)
          .send(largePayload)
          .then(response => ({
            status: response.status,
            responseTime: performance.now() - startTime
          }));
      });

      const results = await Promise.all(requests);
      
      results.forEach(result => {
        expect(result.responseTime).toBeLessThan(maxResponseTime);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle high concurrent load gracefully', async () => {
      const concurrentUsers = 25;
      const requestsPerUser = 3;
      const maxFailureRate = 0.05; // 5% failure rate acceptable

      const allRequests = [];
      
      for (let user = 0; user < concurrentUsers; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          allRequests.push(
            request(app)
              .get('/api/v1/colors')
              .set('X-API-Key', validApiKey)
              .then(response => ({ status: response.status, success: response.status === 200 }))
              .catch(() => ({ status: 500, success: false }))
          );
        }
      }

      const results = await Promise.all(allRequests);
      const failureCount = results.filter(r => !r.success).length;
      const failureRate = failureCount / results.length;
      
      expect(failureRate).toBeLessThan(maxFailureRate);
      expect(results.length).toBe(concurrentUsers * requestsPerUser);
    });

    it('should recover from temporary overload', async () => {
      // Create a temporary overload
      const overloadRequests = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/v1/colors')
          .set('X-API-Key', validApiKey)
          .catch(() => ({ status: 429 })) // May hit rate limits
      );

      await Promise.all(overloadRequests);

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 1000));

      // System should recover and handle normal requests
      const recoveryRequests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/health')
          .expect(200)
      );

      const recoveryResults = await Promise.all(recoveryRequests);
      expect(recoveryResults).toHaveLength(5);
    });

    it('should maintain data consistency under stress', async () => {
      const testData = { suit_color: 'navy' };
      const concurrentRequests = 15;

      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .post('/api/v1/colors/recommendations')
          .set('X-API-Key', validApiKey)
          .send(testData)
          .then(response => response.body)
      );

      const results = await Promise.all(requests);
      
      // All responses should be consistent for the same input
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.success).toBe(firstResult.success);
        if (result.success) {
          expect(result.data).toBeDefined();
        }
      });
    });
  });

  describe('Caching Performance', () => {
    it('should show improved performance with caching', async () => {
      // Mock cache miss and hit scenarios
      const mockCacheService = require('../../services/cache-service').cacheService;
      
      // First request (cache miss)
      mockCacheService.get.mockResolvedValueOnce(null);
      const startCacheMiss = performance.now();
      
      await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);
      
      const cacheMissTime = performance.now() - startCacheMiss;

      // Second request (cache hit)
      mockCacheService.get.mockResolvedValueOnce({
        color_families: [{ family: 'cached' }],
        universal_rules: [{ rule: 'cached' }],
        trending: [{ color: 'cached' }]
      });
      
      const startCacheHit = performance.now();
      
      await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);
      
      const cacheHitTime = performance.now() - startCacheHit;

      // Cache hit should be significantly faster
      expect(cacheHitTime).toBeLessThan(cacheMissTime * 0.5);
      expect(cacheHitTime).toBeLessThan(100); // Cache hits should be very fast
    });

    it('should handle cache failures gracefully without performance degradation', async () => {
      const mockCacheService = require('../../services/cache-service').cacheService;
      
      // Simulate cache failure
      mockCacheService.get.mockRejectedValueOnce(new Error('Cache unavailable'));
      
      const start = performance.now();
      
      await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);
      
      const responseTime = performance.now() - start;
      
      // Should still respond quickly even without cache
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Database and External Service Performance', () => {
    it('should handle external service timeouts gracefully', async () => {
      const mockKnowledgeBankService = require('../../services/knowledge-bank-service').knowledgeBankService;
      
      // Simulate slow external service
      mockKnowledgeBankService.getComprehensiveRecommendations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ recommendations: [] }), 2000))
      );

      const start = performance.now();
      
      const response = await request(app)
        .post('/api/v1/recommendations')
        .set('X-API-Key', validApiKey)
        .send({ occasion: 'business' });
      
      const responseTime = performance.now() - start;
      
      // Should either return quickly with cached data or timeout gracefully
      expect(responseTime).toBeLessThan(5000);
      expect([200, 408, 503]).toContain(response.status);
    });

    it('should batch database operations efficiently', async () => {
      const batchRequests = Array.from({ length: 10 }, (_, i) => ({
        suit_color: 'navy',
        shirt_color: 'white',
        occasion: `occasion_${i}`
      }));

      const start = performance.now();
      
      const requests = batchRequests.map(data =>
        request(app)
          .post('/api/v1/colors/recommendations')
          .set('X-API-Key', validApiKey)
          .send(data)
      );

      const results = await Promise.all(requests);
      const totalTime = performance.now() - start;
      
      // Batched operations should be efficient
      const averageTimePerRequest = totalTime / batchRequests.length;
      expect(averageTimePerRequest).toBeLessThan(200);
      
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    it('should provide performance metrics in response headers', async () => {
      const response = await request(app)
        .get('/api/v1/colors')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.headers['x-response-time']).toBeDefined();
      
      const responseTime = parseFloat(response.headers['x-response-time']);
      expect(responseTime).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should track and report performance degradation', async () => {
      const iterations = 10;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await request(app)
          .get('/api/v1/colors')
          .set('X-API-Key', validApiKey)
          .expect(200);
        
        responseTimes.push(performance.now() - start);
      }

      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      
      // Performance should be consistent
      expect(maxTime - minTime).toBeLessThan(averageTime * 2); // Variance shouldn't be too high
      expect(averageTime).toBeLessThan(500); // Average should be reasonable
    });

    it('should handle performance monitoring endpoint efficiently', async () => {
      const start = performance.now();
      
      const response = await request(app)
        .get('/health/performance')
        .expect(200);
      
      const responseTime = performance.now() - start;
      
      expect(responseTime).toBeLessThan(200); // Monitoring itself should be fast
      expect(response.body).toHaveProperty('performance_metrics');
    });
  });
});