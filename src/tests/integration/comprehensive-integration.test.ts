/**
 * Comprehensive Integration Tests - Phase 4
 * Testing integration between all services and APIs
 */

import { logger } from '../../utils/logger';
import { setupTestApp } from '../helpers/test-app-factory';
import request from 'supertest';
import WebSocket from 'ws';

interface ServiceHealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  dependencies: string[];
  lastCheck: Date;
}

interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  errors: string[];
  warnings: string[];
  serviceInteractions: Array<{
    service: string;
    operation: string;
    success: boolean;
    responseTime: number;
  }>;
}

class IntegrationTestRunner {
  private app: any;
  private server: any;
  private testResults: IntegrationTestResult[] = [];
  private serviceHealthChecks: Map<string, ServiceHealthCheck> = new Map();

  constructor(app: any, server: any) {
    this.app = app;
    this.server = server;
  }

  async runComprehensiveIntegrationTests(): Promise<{
    overallSuccess: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: IntegrationTestResult[];
    serviceHealth: ServiceHealthCheck[];
  }> {
    logger.info('🚀 Starting comprehensive integration tests...');

    // Test categories
    const testCategories = [
      { name: 'API Endpoints Integration', tests: this.testApiEndpointsIntegration.bind(this) },
      { name: 'Chat Service Integration', tests: this.testChatServiceIntegration.bind(this) },
      { name: 'Real-time WebSocket Integration', tests: this.testWebSocketIntegration.bind(this) },
      { name: 'Database Integration', tests: this.testDatabaseIntegration.bind(this) },
      { name: 'Cache Service Integration', tests: this.testCacheServiceIntegration.bind(this) },
      { name: 'Framework Integration', tests: this.testFrameworkIntegration.bind(this) },
      { name: 'Analytics Integration', tests: this.testAnalyticsIntegration.bind(this) },
      { name: 'Error Handling Integration', tests: this.testErrorHandlingIntegration.bind(this) },
      { name: 'Performance Integration', tests: this.testPerformanceIntegration.bind(this) },
      { name: 'Security Integration', tests: this.testSecurityIntegration.bind(this) }
    ];

    // Run all test categories
    for (const category of testCategories) {
      logger.info(`🧪 Running ${category.name}...`);
      try {
        await category.tests();
        logger.info(`✅ ${category.name} completed successfully`);
      } catch (error) {
        logger.error(`❌ ${category.name} failed:`, error);
      }
    }

    // Perform service health checks
    await this.performServiceHealthChecks();

    // Calculate results
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const overallSuccess = failedTests === 0;

    logger.info(`🏁 Integration tests completed`, {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      success: overallSuccess
    });

    return {
      overallSuccess,
      totalTests,
      passedTests,
      failedTests,
      results: this.testResults,
      serviceHealth: Array.from(this.serviceHealthChecks.values())
    };
  }

  private async testApiEndpointsIntegration(): Promise<void> {
    // Test core API endpoints and their integration
    const tests = [
      {
        name: 'Health Check Endpoint',
        test: async () => {
          const response = await request(this.app).get('/api/health').expect(200);
          return { success: true, responseTime: 0, data: response.body };
        }
      },
      {
        name: 'Knowledge API Integration',
        test: async () => {
          const startTime = Date.now();
          const response = await request(this.app)
            .get('/api/v2/knowledge/collections')
            .expect(200);
          return { 
            success: true, 
            responseTime: Date.now() - startTime, 
            data: response.body 
          };
        }
      },
      {
        name: 'Intelligence API Integration',
        test: async () => {
          const startTime = Date.now();
          const response = await request(this.app)
            .post('/api/v2/intelligence/style-profile')
            .send({
              preferences: {
                fit: 'slim',
                occasion: 'business',
                budget: 'premium'
              }
            })
            .expect(200);
          return { 
            success: true, 
            responseTime: Date.now() - startTime, 
            data: response.body 
          };
        }
      },
      {
        name: 'Chat API Integration',
        test: async () => {
          const startTime = Date.now();
          const startResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: 'integration_test' })
            .expect(201);

          const messageResponse = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: startResponse.body.sessionId,
              message: 'Hello, I need help with a suit'
            })
            .expect(200);

          return { 
            success: true, 
            responseTime: Date.now() - startTime, 
            data: { startResponse: startResponse.body, messageResponse: messageResponse.body }
          };
        }
      }
    ];

    await this.runTestSuite('API Endpoints Integration', tests);
  }

  private async testChatServiceIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Chat Service Dependencies',
        test: async () => {
          // Test that chat service properly integrates with its dependencies
          const response = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({
              customer_id: 'dependency_test',
              context: { test_dependencies: true }
            })
            .expect(201);

          const sessionId = response.body.sessionId;

          // Send message to test NLP integration
          const nlpResponse = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: sessionId,
              message: 'I need a tuxedo for my wedding'
            })
            .expect(200);

          // Validate NLP analysis was performed
          const hasIntent = nlpResponse.body.intent && nlpResponse.body.intent.category;
          const hasFramework = nlpResponse.body.framework_used;
          const hasConfidence = typeof nlpResponse.body.confidence === 'number';

          return {
            success: hasIntent && hasFramework && hasConfidence,
            responseTime: 0,
            data: { intent: hasIntent, framework: hasFramework, confidence: hasConfidence }
          };
        }
      },
      {
        name: 'Context Awareness Integration',
        test: async () => {
          const startResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: 'context_test' });

          const sessionId = startResponse.body.sessionId;

          // Send multiple messages to test context building
          const messages = [
            'I need a suit for my wedding',
            'It\'s a beach wedding in July',
            'What colors would you recommend?'
          ];

          let contextBuilt = true;
          for (const message of messages) {
            const response = await request(this.app)
              .post('/api/v3/chat/conversation/message')
              .send({ session_id: sessionId, message });

            if (!response.body.context || !response.body.context.conversation_history_length) {
              contextBuilt = false;
            }
          }

          return { success: contextBuilt, responseTime: 0, data: { contextBuilt } };
        }
      },
      {
        name: 'Framework Selection Integration',
        test: async () => {
          const frameworks = ['atelier', 'restore', 'precision'];
          const frameworkTests = [];

          for (const expectedFramework of frameworks) {
            const response = await request(this.app)
              .post('/api/v3/chat/conversation/start')
              .send({
                customer_id: `framework_${expectedFramework}_test`,
                context: { preferred_framework: expectedFramework }
              });

            const sessionId = response.body.sessionId;

            const messageMap = {
              'atelier': 'I need help choosing a wedding suit',
              'restore': 'I\'m having issues with my order',
              'precision': 'Show me your most expensive suits'
            };

            const messageResponse = await request(this.app)
              .post('/api/v3/chat/conversation/message')
              .send({
                session_id: sessionId,
                message: messageMap[expectedFramework as keyof typeof messageMap]
              });

            frameworkTests.push({
              expected: expectedFramework,
              actual: messageResponse.body.framework_used,
              matched: messageResponse.body.framework_used === expectedFramework
            });
          }

          const allMatched = frameworkTests.every(test => test.matched);
          return { success: allMatched, responseTime: 0, data: frameworkTests };
        }
      }
    ];

    await this.runTestSuite('Chat Service Integration', tests);
  }

  private async testWebSocketIntegration(): Promise<void> {
    const tests = [
      {
        name: 'WebSocket Connection and Authentication',
        test: async () => {
          return new Promise<{ success: boolean; responseTime: number; data: any }>((resolve) => {
            const ws = new WebSocket('ws://localhost:8080');
            const startTime = Date.now();
            let authenticated = false;

            ws.on('open', () => {
              ws.send(JSON.stringify({
                type: 'authenticate',
                sessionId: 'integration_test_session',
                customerId: 'integration_test_customer'
              }));
            });

            ws.on('message', (data) => {
              const message = JSON.parse(data.toString());
              if (message.type === 'authenticated') {
                authenticated = true;
                ws.close();
                resolve({
                  success: true,
                  responseTime: Date.now() - startTime,
                  data: { authenticated: true }
                });
              }
            });

            ws.on('error', () => {
              resolve({ success: false, responseTime: Date.now() - startTime, data: { error: 'WebSocket connection failed' } });
            });

            setTimeout(() => {
              if (!authenticated) {
                ws.close();
                resolve({ success: false, responseTime: Date.now() - startTime, data: { error: 'Authentication timeout' } });
              }
            }, 5000);
          });
        }
      },
      {
        name: 'WebSocket Chat Integration',
        test: async () => {
          return new Promise<{ success: boolean; responseTime: number; data: any }>((resolve) => {
            const ws = new WebSocket('ws://localhost:8080');
            const startTime = Date.now();
            let messageReceived = false;

            ws.on('open', () => {
              // Authenticate first
              ws.send(JSON.stringify({
                type: 'authenticate',
                sessionId: 'ws_chat_test_session',
                customerId: 'ws_chat_test_customer'
              }));
            });

            ws.on('message', (data) => {
              const message = JSON.parse(data.toString());
              
              if (message.type === 'authenticated') {
                // Send chat message
                ws.send(JSON.stringify({
                  type: 'chat_message',
                  content: 'Hello via WebSocket',
                  metadata: { integration_test: true }
                }));
              } else if (message.type === 'chat_response') {
                messageReceived = true;
                ws.close();
                resolve({
                  success: true,
                  responseTime: Date.now() - startTime,
                  data: { messageReceived: true, response: message }
                });
              }
            });

            ws.on('error', () => {
              resolve({ success: false, responseTime: Date.now() - startTime, data: { error: 'WebSocket chat failed' } });
            });

            setTimeout(() => {
              if (!messageReceived) {
                ws.close();
                resolve({ success: false, responseTime: Date.now() - startTime, data: { error: 'Chat response timeout' } });
              }
            }, 10000);
          });
        }
      }
    ];

    await this.runTestSuite('WebSocket Integration', tests);
  }

  private async testDatabaseIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Database Connection Health',
        test: async () => {
          const response = await request(this.app)
            .get('/api/health/database')
            .expect(200);
          
          return {
            success: response.body.status === 'healthy',
            responseTime: 0,
            data: response.body
          };
        }
      },
      {
        name: 'Conversation Persistence',
        test: async () => {
          const startResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: 'persistence_test' });

          const sessionId = startResponse.body.sessionId;

          // Send message
          await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: sessionId,
              message: 'Test message for persistence'
            });

          // Retrieve conversation history
          const historyResponse = await request(this.app)
            .get(`/api/v3/chat/conversation/history/${sessionId}`)
            .expect(200);

          const hasPersistence = historyResponse.body.messages && 
                                historyResponse.body.messages.length > 0;

          return {
            success: hasPersistence,
            responseTime: 0,
            data: { messageCount: historyResponse.body.messages?.length || 0 }
          };
        }
      },
      {
        name: 'Analytics Data Storage',
        test: async () => {
          // Test that analytics data is being stored
          const response = await request(this.app)
            .post('/api/v2/intelligence/trending-analysis')
            .send({
              timeframe: 'last_24_hours',
              categories: ['suits', 'accessories']
            })
            .expect(200);

          return {
            success: response.body.trending_items && Array.isArray(response.body.trending_items),
            responseTime: 0,
            data: response.body
          };
        }
      }
    ];

    await this.runTestSuite('Database Integration', tests);
  }

  private async testCacheServiceIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Cache Service Health',
        test: async () => {
          const response = await request(this.app)
            .get('/api/health/cache')
            .expect(200);
          
          return {
            success: response.body.status === 'healthy',
            responseTime: 0,
            data: response.body
          };
        }
      },
      {
        name: 'API Response Caching',
        test: async () => {
          const startTime1 = Date.now();
          const firstResponse = await request(this.app)
            .get('/api/v2/knowledge/collections')
            .expect(200);
          const firstResponseTime = Date.now() - startTime1;

          const startTime2 = Date.now();
          const secondResponse = await request(this.app)
            .get('/api/v2/knowledge/collections')
            .expect(200);
          const secondResponseTime = Date.now() - startTime2;

          // Second response should be faster (cached)
          const isCached = secondResponseTime < firstResponseTime;

          return {
            success: isCached,
            responseTime: secondResponseTime,
            data: { 
              firstResponseTime, 
              secondResponseTime, 
              improvement: firstResponseTime - secondResponseTime 
            }
          };
        }
      }
    ];

    await this.runTestSuite('Cache Service Integration', tests);
  }

  private async testFrameworkIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Multi-Framework Workflow',
        test: async () => {
          // Start with a complaint (should use RESTORE)
          const startResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: 'multi_framework_test' });

          const sessionId = startResponse.body.sessionId;

          // Complaint message
          const complaintResponse = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: sessionId,
              message: 'I\'m having issues with my order'
            });

          // Transition to sales inquiry (should switch to PRECISION or Atelier)
          const salesResponse = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: sessionId,
              message: 'Thanks for resolving that. Now I\'m looking for a new tuxedo'
            });

          const usedRestore = complaintResponse.body.framework_used === 'restore';
          const switchedFramework = salesResponse.body.framework_used !== 'restore';
          const hasTransition = salesResponse.body.context?.framework_transition;

          return {
            success: usedRestore && switchedFramework && hasTransition,
            responseTime: 0,
            data: {
              complaintFramework: complaintResponse.body.framework_used,
              salesFramework: salesResponse.body.framework_used,
              hasTransition
            }
          };
        }
      },
      {
        name: 'Framework-Specific Features',
        test: async () => {
          const frameworkFeatures = [];

          // Test RESTORE empathy features
          const restoreResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ 
              customer_id: 'restore_features_test',
              context: { preferred_framework: 'restore' }
            });

          const restoreMessage = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: restoreResponse.body.sessionId,
              message: 'I\'m extremely frustrated with this situation!'
            });

          frameworkFeatures.push({
            framework: 'restore',
            hasEmpathy: /understand|sorry|apologize|frustrating/.test(restoreMessage.body.message.toLowerCase())
          });

          // Test PRECISION luxury features
          const precisionResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ 
              customer_id: 'precision_features_test',
              context: { preferred_framework: 'precision' }
            });

          const precisionMessage = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: precisionResponse.body.sessionId,
              message: 'Show me your most exclusive and expensive options'
            });

          frameworkFeatures.push({
            framework: 'precision',
            hasLuxuryFocus: /exclusive|premium|luxury|bespoke|finest/.test(precisionMessage.body.message.toLowerCase())
          });

          const allFeaturesWork = frameworkFeatures.every(f => f.hasEmpathy || f.hasLuxuryFocus);

          return {
            success: allFeaturesWork,
            responseTime: 0,
            data: frameworkFeatures
          };
        }
      }
    ];

    await this.runTestSuite('Framework Integration', tests);
  }

  private async testAnalyticsIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Analytics Data Collection',
        test: async () => {
          // Send a message that should generate analytics
          const startResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: 'analytics_test' });

          await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: startResponse.body.sessionId,
              message: 'I need a tuxedo for prom'
            });

          // Check if analytics endpoint has data
          const analyticsResponse = await request(this.app)
            .get('/api/v2/intelligence/trending-analysis')
            .query({ timeframe: 'last_24_hours' })
            .expect(200);

          return {
            success: analyticsResponse.body.trending_items && analyticsResponse.body.trending_items.length > 0,
            responseTime: 0,
            data: analyticsResponse.body
          };
        }
      },
      {
        name: 'Real-time Metrics Integration',
        test: async () => {
          const metricsResponse = await request(this.app)
            .get('/api/health/metrics')
            .expect(200);

          const hasMetrics = metricsResponse.body.metrics && 
                           typeof metricsResponse.body.metrics.totalRequests === 'number';

          return {
            success: hasMetrics,
            responseTime: 0,
            data: metricsResponse.body.metrics
          };
        }
      }
    ];

    await this.runTestSuite('Analytics Integration', tests);
  }

  private async testErrorHandlingIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Graceful Error Recovery',
        test: async () => {
          // Test invalid session ID
          const invalidResponse = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: 'invalid_session_id',
              message: 'This should fail gracefully'
            })
            .expect(400);

          const hasErrorHandling = invalidResponse.body.error && 
                                  invalidResponse.body.error.includes('Invalid session');

          return {
            success: hasErrorHandling,
            responseTime: 0,
            data: invalidResponse.body
          };
        }
      },
      {
        name: 'Service Failure Recovery',
        test: async () => {
          // Test behavior when sending malformed data
          const malformedResponse = await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ invalid_field: 'should_be_handled' })
            .expect(400);

          return {
            success: malformedResponse.body.error !== undefined,
            responseTime: 0,
            data: malformedResponse.body
          };
        }
      }
    ];

    await this.runTestSuite('Error Handling Integration', tests);
  }

  private async testPerformanceIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Response Time Integration',
        test: async () => {
          const startTime = Date.now();
          await request(this.app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: 'performance_test' });
          const responseTime = Date.now() - startTime;

          return {
            success: responseTime < 1000, // Should respond within 1 second
            responseTime,
            data: { responseTime }
          };
        }
      },
      {
        name: 'Concurrent Request Handling',
        test: async () => {
          const concurrentRequests = 10;
          const promises = [];

          for (let i = 0; i < concurrentRequests; i++) {
            promises.push(
              request(this.app)
                .post('/api/v3/chat/conversation/start')
                .send({ customer_id: `concurrent_test_${i}` })
            );
          }

          const startTime = Date.now();
          const responses = await Promise.all(promises);
          const totalTime = Date.now() - startTime;

          const allSuccessful = responses.every(r => r.status === 201);
          const averageTime = totalTime / concurrentRequests;

          return {
            success: allSuccessful && averageTime < 500,
            responseTime: averageTime,
            data: { totalTime, averageTime, successfulRequests: responses.length }
          };
        }
      }
    ];

    await this.runTestSuite('Performance Integration', tests);
  }

  private async testSecurityIntegration(): Promise<void> {
    const tests = [
      {
        name: 'Input Validation Integration',
        test: async () => {
          // Test SQL injection prevention
          const maliciousInput = "'; DROP TABLE conversations; --";
          
          const response = await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: 'test_session',
              message: maliciousInput
            })
            .expect(400); // Should reject malicious input

          return {
            success: response.status === 400,
            responseTime: 0,
            data: { rejected: true }
          };
        }
      },
      {
        name: 'Rate Limiting Integration',
        test: async () => {
          const rapidRequests = [];
          
          // Send many requests rapidly
          for (let i = 0; i < 20; i++) {
            rapidRequests.push(
              request(this.app)
                .get('/api/health')
            );
          }

          const responses = await Promise.all(rapidRequests);
          const rateLimitedResponses = responses.filter(r => r.status === 429);

          return {
            success: rateLimitedResponses.length > 0, // Should have some rate limited
            responseTime: 0,
            data: { rateLimitedCount: rateLimitedResponses.length }
          };
        }
      }
    ];

    await this.runTestSuite('Security Integration', tests);
  }

  private async runTestSuite(suiteName: string, tests: Array<{ name: string; test: () => Promise<{ success: boolean; responseTime: number; data: any }> }>): Promise<void> {
    for (const testCase of tests) {
      const startTime = Date.now();
      const result: IntegrationTestResult = {
        testName: `${suiteName} - ${testCase.name}`,
        passed: false,
        duration: 0,
        errors: [],
        warnings: [],
        serviceInteractions: []
      };

      try {
        const testResult = await testCase.test();
        result.passed = testResult.success;
        result.duration = Date.now() - startTime;
        
        if (!testResult.success) {
          result.errors.push(`Test failed: ${JSON.stringify(testResult.data)}`);
        }

        result.serviceInteractions.push({
          service: suiteName,
          operation: testCase.name,
          success: testResult.success,
          responseTime: testResult.responseTime
        });

      } catch (error) {
        result.passed = false;
        result.duration = Date.now() - startTime;
        result.errors.push(`Test execution error: ${error}`);
      }

      this.testResults.push(result);
      
      if (result.passed) {
        logger.info(`✅ ${result.testName} passed (${result.duration}ms)`);
      } else {
        logger.error(`❌ ${result.testName} failed`, { errors: result.errors });
      }
    }
  }

  private async performServiceHealthChecks(): Promise<void> {
    const services = [
      { name: 'API Server', endpoint: '/api/health' },
      { name: 'Database', endpoint: '/api/health/database' },
      { name: 'Cache', endpoint: '/api/health/cache' },
      { name: 'WebSocket', endpoint: '/api/health/websocket' },
      { name: 'Chat Service', endpoint: '/api/health/chat' }
    ];

    for (const service of services) {
      const startTime = Date.now();
      try {
        const response = await request(this.app)
          .get(service.endpoint)
          .timeout(5000);

        const responseTime = Date.now() - startTime;
        
        this.serviceHealthChecks.set(service.name, {
          service: service.name,
          status: response.status === 200 ? 'healthy' : 'degraded',
          responseTime,
          dependencies: response.body.dependencies || [],
          lastCheck: new Date()
        });

      } catch (error) {
        this.serviceHealthChecks.set(service.name, {
          service: service.name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          dependencies: [],
          lastCheck: new Date()
        });
      }
    }
  }
}

describe('Comprehensive Integration Testing', () => {
  let app: any;
  let server: any;
  let integrationRunner: IntegrationTestRunner;

  beforeAll(async () => {
    ({ app, server } = await setupTestApp());
    integrationRunner = new IntegrationTestRunner(app, server);
    
    // Wait for all services to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Full System Integration', () => {
    it('should pass all integration tests', async () => {
      const results = await integrationRunner.runComprehensiveIntegrationTests();

      // Validate overall success
      expect(results.overallSuccess).toBe(true);
      expect(results.passedTests).toBeGreaterThan(0);
      expect(results.failedTests).toBe(0);

      // Validate service health
      const healthyServices = results.serviceHealth.filter(s => s.status === 'healthy');
      expect(healthyServices.length).toBeGreaterThan(0);

      // Validate response times
      const fastResponses = results.results.filter(r => r.duration < 5000);
      expect(fastResponses.length).toBeGreaterThanOrEqual(results.totalTests * 0.8); // 80% should be fast

      logger.info('🎉 All integration tests completed successfully', {
        totalTests: results.totalTests,
        passedTests: results.passedTests,
        healthyServices: healthyServices.length,
        averageResponseTime: results.results.reduce((sum, r) => sum + r.duration, 0) / results.totalTests
      });

    }, 300000); // 5 minute timeout for full integration test suite
  });

  describe('Service Interdependency Validation', () => {
    it('should validate correct service interaction patterns', async () => {
      // Test that services interact correctly with each other
      
      // 1. Chat -> NLP -> Context -> Response Generation chain
      const startResponse = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({ customer_id: 'interdependency_test' });

      const messageResponse = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: startResponse.body.sessionId,
          message: 'I need a wedding suit for my beach ceremony'
        });

      // Validate that the response shows evidence of proper service integration
      expect(messageResponse.body.intent).toBeDefined(); // NLP service integration
      expect(messageResponse.body.framework_used).toBeDefined(); // Framework selection service
      expect(messageResponse.body.confidence).toBeGreaterThan(0); // Response generation service
      expect(messageResponse.body.context).toBeDefined(); // Context awareness service

      // 2. Analytics -> Database -> Cache chain
      const analyticsResponse = await request(app)
        .get('/api/v2/intelligence/trending-analysis')
        .query({ timeframe: 'last_24_hours' });

      expect(analyticsResponse.body.trending_items).toBeDefined();
      expect(Array.isArray(analyticsResponse.body.trending_items)).toBe(true);
    });

    it('should handle service failure gracefully', async () => {
      // Test behavior when individual services might be unavailable
      // This would require more sophisticated service mocking in a real scenario
      
      // For now, test that the system continues to function with degraded service
      const response = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({ 
          customer_id: 'degraded_service_test',
          context: { simulate_service_degradation: true }
        });

      // Should still create a session even if some services are degraded
      expect(response.status).toBe(201);
      expect(response.body.sessionId).toBeDefined();
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across services', async () => {
      const customerId = 'data_flow_test';
      
      // Create a conversation
      const startResponse = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({ customer_id: customerId });

      const sessionId = startResponse.body.sessionId;

      // Send multiple messages
      const messages = [
        'I need a tuxedo',
        'It\'s for a formal gala',
        'What would you recommend?'
      ];

      for (const message of messages) {
        await request(app)
          .post('/api/v3/chat/conversation/message')
          .send({ session_id: sessionId, message });
      }

      // Verify data consistency
      const historyResponse = await request(app)
        .get(`/api/v3/chat/conversation/history/${sessionId}`);

      expect(historyResponse.body.messages).toBeDefined();
      expect(historyResponse.body.messages.length).toBeGreaterThanOrEqual(messages.length * 2); // User + AI messages

      // Verify context preservation
      const contextResponse = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: 'What did I just ask about?'
        });

      // Should reference previous context
      const responseMessage = contextResponse.body.message.toLowerCase();
      expect(responseMessage).toMatch(/tuxedo|gala|formal|recommend/);
    });
  });

  describe('Performance Integration Under Load', () => {
    it('should maintain integration quality under concurrent load', async () => {
      const concurrentTests = 50;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentTests; i++) {
        promises.push((async () => {
          const startTime = Date.now();
          
          // Full conversation flow
          const startResponse = await request(app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: `load_test_${i}` });

          const messageResponse = await request(app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: startResponse.body.sessionId,
              message: `Test message ${i} for load testing`
            });

          return {
            success: startResponse.status === 201 && messageResponse.status === 200,
            duration: Date.now() - startTime,
            sessionId: startResponse.body.sessionId
          };
        })());
      }

      const results = await Promise.all(promises);
      
      const successfulTests = results.filter(r => r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      // At least 95% should succeed under load
      expect(successfulTests.length).toBeGreaterThanOrEqual(concurrentTests * 0.95);
      
      // Average response time should be reasonable
      expect(averageResponseTime).toBeLessThan(5000);

      logger.info('✅ Integration performance under load validated', {
        totalTests: concurrentTests,
        successful: successfulTests.length,
        averageResponseTime: averageResponseTime.toFixed(2) + 'ms'
      });
    }, 60000); // 1 minute timeout
  });
});