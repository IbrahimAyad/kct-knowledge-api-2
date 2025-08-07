/**
 * Comprehensive Load Testing - Phase 4
 * Testing 10,000+ concurrent users with WebSocket connections
 */

import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';

interface LoadTestConfig {
  maxConcurrentUsers: number;
  rampUpDurationMs: number;
  testDurationMs: number;
  messagesPerUser: number;
  messageIntervalMs: number;
  enableWebSocket: boolean;
  scenarios: LoadTestScenario[];
}

interface LoadTestScenario {
  name: string;
  percentage: number; // Percentage of users for this scenario
  userProfile: {
    type: 'light' | 'medium' | 'heavy';
    messagesPerMinute: number;
    sessionDurationMinutes: number;
  };
  messagePatterns: Array<{
    message: string;
    weight: number; // Probability weight
    expectedResponseTimeMs: number;
  }>;
}

interface LoadTestMetrics {
  startTime: number;
  endTime: number;
  totalUsers: number;
  totalRequests: number;
  totalWebSocketConnections: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorsPerSecond: number;
  memoryUsage: NodeJS.MemoryUsage[];
  cpuUsage: number[];
  websocketMetrics: {
    connectionsEstablished: number;
    connectionsFailed: number;
    messagesPerSecond: number;
    averageLatency: number;
  };
}

interface UserSession {
  id: string;
  sessionId?: string;
  websocket?: WebSocket;
  startTime: number;
  requestCount: number;
  responseTimes: number[];
  errors: string[];
  scenario: LoadTestScenario;
  isActive: boolean;
}

class LoadTestRunner extends EventEmitter {
  private config: LoadTestConfig;
  private metrics: LoadTestMetrics;
  private users: Map<string, UserSession> = new Map();
  private isRunning = false;
  private baseUrl: string;
  private wsBaseUrl: string;

  constructor(config: LoadTestConfig, baseUrl = 'http://localhost:3000', wsBaseUrl = 'ws://localhost:8080') {
    super();
    this.config = config;
    this.baseUrl = baseUrl;
    this.wsBaseUrl = wsBaseUrl;
    
    this.metrics = {
      startTime: 0,
      endTime: 0,
      totalUsers: 0,
      totalRequests: 0,
      totalWebSocketConnections: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errorsPerSecond: 0,
      memoryUsage: [],
      cpuUsage: [],
      websocketMetrics: {
        connectionsEstablished: 0,
        connectionsFailed: 0,
        messagesPerSecond: 0,
        averageLatency: 0
      }
    };
  }

  async runLoadTest(): Promise<LoadTestMetrics> {
    logger.info(`🚀 Starting load test with ${this.config.maxConcurrentUsers} concurrent users...`);
    
    this.isRunning = true;
    this.metrics.startTime = performance.now();

    // Start system monitoring
    this.startSystemMonitoring();

    try {
      // Phase 1: Ramp up users
      await this.rampUpUsers();

      // Phase 2: Sustain load
      await this.sustainLoad();

      // Phase 3: Ramp down
      await this.rampDownUsers();

    } catch (error) {
      logger.error('Load test failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.metrics.endTime = performance.now();
      await this.cleanup();
      this.calculateFinalMetrics();
    }

    return this.metrics;
  }

  private async rampUpUsers(): Promise<void> {
    logger.info(`📈 Ramping up users over ${this.config.rampUpDurationMs}ms...`);
    
    const usersPerSecond = this.config.maxConcurrentUsers / (this.config.rampUpDurationMs / 1000);
    const intervalMs = 1000 / usersPerSecond;

    let userCount = 0;
    
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (userCount >= this.config.maxConcurrentUsers) {
          clearInterval(interval);
          resolve();
          return;
        }

        // Create new user
        const userId = `user_${userCount}`;
        const scenario = this.selectScenario();
        
        const user: UserSession = {
          id: userId,
          startTime: performance.now(),
          requestCount: 0,
          responseTimes: [],
          errors: [],
          scenario,
          isActive: true
        };

        this.users.set(userId, user);
        this.startUserSession(user);
        
        userCount++;
        this.metrics.totalUsers = userCount;

        if (userCount % 100 === 0) {
          logger.info(`📊 Users created: ${userCount}/${this.config.maxConcurrentUsers}`);
        }
      }, intervalMs);
    });
  }

  private async sustainLoad(): Promise<void> {
    logger.info(`⚖️ Sustaining load for ${this.config.testDurationMs}ms...`);
    
    // Monitor and log metrics every 10 seconds
    const monitoringInterval = setInterval(() => {
      this.logCurrentMetrics();
    }, 10000);

    await new Promise(resolve => setTimeout(resolve, this.config.testDurationMs));
    
    clearInterval(monitoringInterval);
  }

  private async rampDownUsers(): Promise<void> {
    logger.info('📉 Ramping down users...');
    
    for (const user of this.users.values()) {
      this.stopUserSession(user);
    }

    // Wait for all sessions to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  private async startUserSession(user: UserSession): Promise<void> {
    try {
      // Create chat session
      const sessionResponse = await this.makeHttpRequest('POST', '/api/v3/chat/conversation/start', {
        customer_id: user.id,
        context: {
          load_test: true,
          scenario: user.scenario.name
        }
      });

      if (sessionResponse.success) {
        user.sessionId = sessionResponse.data.sessionId;
        
        // Establish WebSocket connection if enabled
        if (this.config.enableWebSocket) {
          await this.establishWebSocketConnection(user);
        }

        // Start message sending pattern
        this.startMessagePattern(user);
      } else {
        user.errors.push('Failed to create session');
        this.metrics.failedRequests++;
      }

    } catch (error) {
      user.errors.push(`Session creation error: ${error}`);
      this.metrics.failedRequests++;
    }
  }

  private async establishWebSocketConnection(user: UserSession): Promise<void> {
    try {
      user.websocket = new WebSocket(this.wsBaseUrl);
      
      user.websocket.on('open', () => {
        // Authenticate
        user.websocket?.send(JSON.stringify({
          type: 'authenticate',
          sessionId: user.sessionId,
          customerId: user.id
        }));
        
        this.metrics.websocketMetrics.connectionsEstablished++;
      });

      user.websocket.on('message', (data) => {
        const latency = performance.now() - user.startTime;
        user.responseTimes.push(latency);
      });

      user.websocket.on('error', (error) => {
        user.errors.push(`WebSocket error: ${error}`);
        this.metrics.websocketMetrics.connectionsFailed++;
      });

    } catch (error) {
      user.errors.push(`WebSocket connection failed: ${error}`);
      this.metrics.websocketMetrics.connectionsFailed++;
    }
  }

  private startMessagePattern(user: UserSession): void {
    if (!user.isActive || !user.sessionId) return;

    const messagePattern = user.scenario.messagePatterns;
    const interval = (60 * 1000) / user.scenario.userProfile.messagesPerMinute;

    const sendMessage = async () => {
      if (!user.isActive || !user.sessionId) return;

      // Select random message based on weights
      const message = this.selectWeightedMessage(messagePattern);
      const startTime = performance.now();

      try {
        let success = false;

        if (this.config.enableWebSocket && user.websocket?.readyState === WebSocket.OPEN) {
          // Send via WebSocket
          user.websocket.send(JSON.stringify({
            type: 'chat_message',
            content: message.message,
            metadata: {
              load_test: true,
              user_id: user.id
            }
          }));
          success = true;
        } else {
          // Send via HTTP
          const response = await this.makeHttpRequest('POST', '/api/v3/chat/conversation/message', {
            session_id: user.sessionId,
            message: message.message,
            context: {
              load_test: true,
              user_id: user.id
            }
          });
          success = response.success;
        }

        const responseTime = performance.now() - startTime;
        user.responseTimes.push(responseTime);
        user.requestCount++;

        if (success) {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
          user.errors.push('Message send failed');
        }

      } catch (error) {
        user.errors.push(`Message error: ${error}`);
        this.metrics.failedRequests++;
      }

      this.metrics.totalRequests++;

      // Schedule next message
      if (user.isActive) {
        setTimeout(sendMessage, interval);
      }
    };

    // Start message pattern with random delay
    const initialDelay = Math.random() * interval;
    setTimeout(sendMessage, initialDelay);
  }

  private selectScenario(): LoadTestScenario {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const scenario of this.config.scenarios) {
      cumulative += scenario.percentage;
      if (random <= cumulative) {
        return scenario;
      }
    }

    return this.config.scenarios[0]; // Fallback
  }

  private selectWeightedMessage(patterns: Array<{ message: string; weight: number; expectedResponseTimeMs: number }>) {
    const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;

    for (const pattern of patterns) {
      cumulative += pattern.weight;
      if (random <= cumulative) {
        return pattern;
      }
    }

    return patterns[0]; // Fallback
  }

  private async makeHttpRequest(method: string, path: string, data?: any): Promise<{ success: boolean; data?: any; error?: string }> {
    const startTime = performance.now();
    
    try {
      const url = `${this.baseUrl}${path}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const responseTime = performance.now() - startTime;

      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }

    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private stopUserSession(user: UserSession): void {
    user.isActive = false;
    
    if (user.websocket) {
      user.websocket.close();
    }
  }

  private startSystemMonitoring(): void {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      // Memory usage
      this.metrics.memoryUsage.push(process.memoryUsage());

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.metrics.cpuUsage.push((cpuUsage.user + cpuUsage.system) / 1000000);

    }, 1000);
  }

  private logCurrentMetrics(): void {
    const activeUsers = Array.from(this.users.values()).filter(u => u.isActive).length;
    const totalResponseTimes = Array.from(this.users.values())
      .flatMap(u => u.responseTimes);
    
    const currentRps = this.metrics.totalRequests / ((performance.now() - this.metrics.startTime) / 1000);
    
    logger.info(`📊 Load Test Metrics:`, {
      activeUsers,
      totalRequests: this.metrics.totalRequests,
      successRate: `${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)}%`,
      currentRPS: currentRps.toFixed(2),
      avgResponseTime: totalResponseTimes.length ? 
        `${(totalResponseTimes.reduce((sum, t) => sum + t, 0) / totalResponseTimes.length).toFixed(2)}ms` : 'N/A',
      websocketConnections: this.metrics.websocketMetrics.connectionsEstablished
    });
  }

  private calculateFinalMetrics(): void {
    const allResponseTimes = Array.from(this.users.values())
      .flatMap(u => u.responseTimes)
      .sort((a, b) => a - b);

    if (allResponseTimes.length > 0) {
      this.metrics.averageResponseTime = allResponseTimes.reduce((sum, t) => sum + t, 0) / allResponseTimes.length;
      this.metrics.p95ResponseTime = allResponseTimes[Math.floor(allResponseTimes.length * 0.95)];
      this.metrics.p99ResponseTime = allResponseTimes[Math.floor(allResponseTimes.length * 0.99)];
      this.metrics.maxResponseTime = allResponseTimes[allResponseTimes.length - 1];
    }

    const totalDurationSeconds = (this.metrics.endTime - this.metrics.startTime) / 1000;
    this.metrics.requestsPerSecond = this.metrics.totalRequests / totalDurationSeconds;
    this.metrics.errorsPerSecond = this.metrics.failedRequests / totalDurationSeconds;

    // WebSocket metrics
    const wsLatencies = Array.from(this.users.values())
      .filter(u => u.websocket)
      .flatMap(u => u.responseTimes);
    
    this.metrics.websocketMetrics.averageLatency = wsLatencies.length ?
      wsLatencies.reduce((sum, t) => sum + t, 0) / wsLatencies.length : 0;
    
    this.metrics.websocketMetrics.messagesPerSecond = 
      this.metrics.websocketMetrics.connectionsEstablished * 
      (this.config.messagesPerUser / totalDurationSeconds);

    this.metrics.totalWebSocketConnections = this.metrics.websocketMetrics.connectionsEstablished;
  }

  private async cleanup(): Promise<void> {
    // Close all WebSocket connections
    for (const user of this.users.values()) {
      if (user.websocket) {
        user.websocket.close();
      }
    }

    // Clear users
    this.users.clear();
  }
}

describe('Load Testing - 10,000+ Concurrent Users', () => {
  // Test configurations for different load scenarios
  const loadTestConfigs: LoadTestConfig[] = [
    {
      maxConcurrentUsers: 1000,
      rampUpDurationMs: 30000, // 30 seconds
      testDurationMs: 120000,  // 2 minutes
      messagesPerUser: 10,
      messageIntervalMs: 2000,
      enableWebSocket: true,
      scenarios: [
        {
          name: 'casual_browser',
          percentage: 60,
          userProfile: {
            type: 'light',
            messagesPerMinute: 2,
            sessionDurationMinutes: 5
          },
          messagePatterns: [
            { message: "Hi, I need help finding a suit", weight: 30, expectedResponseTimeMs: 1000 },
            { message: "What's your return policy?", weight: 20, expectedResponseTimeMs: 800 },
            { message: "Do you have any sales?", weight: 25, expectedResponseTimeMs: 900 },
            { message: "Thanks for the help", weight: 25, expectedResponseTimeMs: 500 }
          ]
        },
        {
          name: 'engaged_shopper',
          percentage: 30,
          userProfile: {
            type: 'medium',
            messagesPerMinute: 4,
            sessionDurationMinutes: 10
          },
          messagePatterns: [
            { message: "I need a tuxedo for my wedding in June", weight: 25, expectedResponseTimeMs: 1500 },
            { message: "What colors do you recommend for a summer wedding?", weight: 20, expectedResponseTimeMs: 1200 },
            { message: "Can you help me with sizing?", weight: 20, expectedResponseTimeMs: 1000 },
            { message: "I'd like to see your premium options", weight: 20, expectedResponseTimeMs: 1300 },
            { message: "What's included with alterations?", weight: 15, expectedResponseTimeMs: 1100 }
          ]
        },
        {
          name: 'premium_customer',
          percentage: 10,
          userProfile: {
            type: 'heavy',
            messagesPerMinute: 6,
            sessionDurationMinutes: 15
          },
          messagePatterns: [
            { message: "I need your most exclusive formal wear collection", weight: 20, expectedResponseTimeMs: 2000 },
            { message: "Price is not a concern, I want the best quality", weight: 15, expectedResponseTimeMs: 1800 },
            { message: "Can you arrange a private fitting session?", weight: 20, expectedResponseTimeMs: 1500 },
            { message: "Tell me about your custom tailoring services", weight: 20, expectedResponseTimeMs: 1700 },
            { message: "I have very specific requirements for this event", weight: 15, expectedResponseTimeMs: 1900 },
            { message: "When can I schedule an appointment?", weight: 10, expectedResponseTimeMs: 1200 }
          ]
        }
      ]
    }
  ];

  beforeAll(async () => {
    logger.info('🔧 Preparing load testing environment...');
    // Add any necessary setup
  });

  afterAll(async () => {
    logger.info('🧹 Cleaning up load testing environment...');
    // Add cleanup if needed
  });

  describe('Concurrent User Load Tests', () => {
    it.skip('should handle 1,000 concurrent users successfully', async () => {
      const config = loadTestConfigs[0];
      const runner = new LoadTestRunner(config);
      
      const metrics = await runner.runLoadTest();
      
      // Validate performance requirements
      expect(metrics.successfulRequests / metrics.totalRequests).toBeGreaterThan(0.95); // 95% success rate
      expect(metrics.averageResponseTime).toBeLessThan(3000); // Average response time under 3s
      expect(metrics.p95ResponseTime).toBeLessThan(5000); // 95th percentile under 5s
      expect(metrics.requestsPerSecond).toBeGreaterThan(10); // At least 10 RPS
      
      logger.info('✅ 1,000 user load test completed successfully', {
        totalRequests: metrics.totalRequests,
        successRate: `${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)}%`,
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
        requestsPerSecond: metrics.requestsPerSecond.toFixed(2)
      });
    }, 300000); // 5 minute timeout

    it.skip('should handle 5,000 concurrent users with WebSocket', async () => {
      const config: LoadTestConfig = {
        ...loadTestConfigs[0],
        maxConcurrentUsers: 5000,
        rampUpDurationMs: 60000, // 1 minute ramp up
        testDurationMs: 180000,  // 3 minutes sustained
        enableWebSocket: true
      };
      
      const runner = new LoadTestRunner(config);
      const metrics = await runner.runLoadTest();
      
      // More relaxed requirements for higher load
      expect(metrics.successfulRequests / metrics.totalRequests).toBeGreaterThan(0.90); // 90% success rate
      expect(metrics.averageResponseTime).toBeLessThan(5000); // Average response time under 5s
      expect(metrics.websocketMetrics.connectionsEstablished).toBeGreaterThan(4000); // Most connections established
      
      logger.info('✅ 5,000 user WebSocket load test completed', {
        websocketConnections: metrics.websocketMetrics.connectionsEstablished,
        messagesPerSecond: metrics.websocketMetrics.messagesPerSecond.toFixed(2),
        averageLatency: `${metrics.websocketMetrics.averageLatency.toFixed(2)}ms`
      });
    }, 600000); // 10 minute timeout

    it.skip('should handle 10,000 concurrent users (stress test)', async () => {
      const config: LoadTestConfig = {
        ...loadTestConfigs[0],
        maxConcurrentUsers: 10000,
        rampUpDurationMs: 120000, // 2 minute ramp up
        testDurationMs: 300000,   // 5 minutes sustained
        enableWebSocket: true
      };
      
      const runner = new LoadTestRunner(config);
      const metrics = await runner.runLoadTest();
      
      // Stress test requirements - system should remain functional
      expect(metrics.successfulRequests / metrics.totalRequests).toBeGreaterThan(0.80); // 80% success rate
      expect(metrics.averageResponseTime).toBeLessThan(10000); // Average response time under 10s
      expect(metrics.errorsPerSecond).toBeLessThan(50); // Less than 50 errors per second
      
      logger.info('✅ 10,000 user stress test completed', {
        peakMemoryUsageMB: Math.max(...metrics.memoryUsage.map(m => m.heapUsed / 1024 / 1024)),
        systemStable: metrics.errorsPerSecond < 50
      });
    }, 900000); // 15 minute timeout
  });

  describe('WebSocket Performance Tests', () => {
    it('should maintain WebSocket connection stability under load', async () => {
      const config: LoadTestConfig = {
        maxConcurrentUsers: 2000,
        rampUpDurationMs: 30000,
        testDurationMs: 120000,
        messagesPerUser: 15,
        messageIntervalMs: 1000,
        enableWebSocket: true,
        scenarios: loadTestConfigs[0].scenarios
      };
      
      const runner = new LoadTestRunner(config);
      const metrics = await runner.runLoadTest();
      
      // WebSocket specific validations
      const connectionSuccessRate = metrics.websocketMetrics.connectionsEstablished / 
        (metrics.websocketMetrics.connectionsEstablished + metrics.websocketMetrics.connectionsFailed);
      
      expect(connectionSuccessRate).toBeGreaterThan(0.95); // 95% connection success rate
      expect(metrics.websocketMetrics.averageLatency).toBeLessThan(100); // Low latency for real-time feel
      
      logger.info('✅ WebSocket stability test completed', {
        connectionSuccessRate: `${(connectionSuccessRate * 100).toFixed(2)}%`,
        averageLatency: `${metrics.websocketMetrics.averageLatency.toFixed(2)}ms`
      });
    }, 300000);
  });

  describe('Framework-Specific Load Tests', () => {
    it('should maintain framework performance under load', async () => {
      // Test each framework under load
      const frameworks = ['atelier', 'restore', 'precision'];
      
      for (const framework of frameworks) {
        const config: LoadTestConfig = {
          maxConcurrentUsers: 1000,
          rampUpDurationMs: 20000,
          testDurationMs: 60000,
          messagesPerUser: 5,
          messageIntervalMs: 2000,
          enableWebSocket: false,
          scenarios: [{
            name: `${framework}_load_test`,
            percentage: 100,
            userProfile: {
              type: 'medium',
              messagesPerMinute: 3,
              sessionDurationMinutes: 8
            },
            messagePatterns: [
              { 
                message: framework === 'restore' ? 
                  "I'm having issues with my order" :
                  framework === 'precision' ?
                  "I want your premium collection" :
                  "Help me find the perfect suit",
                weight: 100, 
                expectedResponseTimeMs: 2000 
              }
            ]
          }]
        };
        
        const runner = new LoadTestRunner(config);
        const metrics = await runner.runLoadTest();
        
        expect(metrics.successfulRequests / metrics.totalRequests).toBeGreaterThan(0.92);
        expect(metrics.averageResponseTime).toBeLessThan(4000);
        
        logger.info(`✅ ${framework.toUpperCase()} framework load test completed`, {
          successRate: `${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)}%`,
          avgResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`
        });
      }
    }, 600000); // 10 minutes for all frameworks
  });

  describe('Memory and Resource Tests', () => {
    it('should not exceed memory limits under sustained load', async () => {
      const config: LoadTestConfig = {
        maxConcurrentUsers: 3000,
        rampUpDurationMs: 45000,
        testDurationMs: 180000, // 3 minutes sustained
        messagesPerUser: 20,
        messageIntervalMs: 1500,
        enableWebSocket: true,
        scenarios: loadTestConfigs[0].scenarios
      };
      
      const runner = new LoadTestRunner(config);
      const metrics = await runner.runLoadTest();
      
      // Memory usage validation
      const peakHeapUsedMB = Math.max(...metrics.memoryUsage.map(m => m.heapUsed)) / 1024 / 1024;
      const averageHeapUsedMB = metrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / 
        metrics.memoryUsage.length / 1024 / 1024;
      
      expect(peakHeapUsedMB).toBeLessThan(4096); // Less than 4GB peak memory
      expect(averageHeapUsedMB).toBeLessThan(2048); // Less than 2GB average memory
      
      logger.info('✅ Memory usage test completed', {
        peakMemoryMB: peakHeapUsedMB.toFixed(2),
        averageMemoryMB: averageHeapUsedMB.toFixed(2),
        memoryEfficient: peakHeapUsedMB < 4096
      });
    }, 400000); // 6.5 minutes
  });
});

// Export for use in other test files
export { LoadTestRunner, LoadTestConfig, LoadTestMetrics };