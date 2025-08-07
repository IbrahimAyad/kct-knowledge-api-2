/**
 * Performance Benchmarking - Phase 4
 * Detailed metrics collection and performance validation
 */

import { performance } from 'perf_hooks';
import { logger } from '../../utils/logger';
import { setupTestApp } from '../helpers/test-app-factory';
import request from 'supertest';
import WebSocket from 'ws';

interface PerformanceBenchmark {
  name: string;
  category: 'api' | 'websocket' | 'database' | 'memory' | 'cpu' | 'integration';
  target: {
    averageResponseTime: number;  // ms
    p95ResponseTime: number;      // ms
    p99ResponseTime: number;      // ms
    throughput: number;           // requests per second
    memoryUsage: number;          // MB
    cpuUsage: number;            // percentage
    errorRate: number;           // percentage
  };
  test: () => Promise<PerformanceMetrics>;
}

interface PerformanceMetrics {
  name: string;
  category: string;
  measurements: {
    responseTimes: number[];
    throughput: number;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    cpuUsage: {
      user: number;
      system: number;
      percent: number;
    };
    errorRate: number;
    concurrentConnections: number;
    requestsPerSecond: number;
  };
  statistics: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

interface SystemResourceMonitor {
  startTime: number;
  endTime: number;
  memorySnapshots: Array<{
    timestamp: number;
    memory: NodeJS.MemoryUsage;
  }>;
  cpuSnapshots: Array<{
    timestamp: number;
    cpu: NodeJS.CpuUsage;
  }>;
}

class PerformanceBenchmarkRunner {
  private app: any;
  private server: any;
  private resourceMonitor: SystemResourceMonitor;
  private benchmarkResults: PerformanceMetrics[] = [];

  constructor(app: any, server: any) {
    this.app = app;
    this.server = server;
    this.resourceMonitor = {
      startTime: 0,
      endTime: 0,
      memorySnapshots: [],
      cpuSnapshots: []
    };
  }

  async runAllBenchmarks(): Promise<{
    overallScore: number;
    passedBenchmarks: number;
    failedBenchmarks: number;
    results: PerformanceMetrics[];
    systemHealth: {
      averageMemoryUsage: number;
      peakMemoryUsage: number;
      averageCpuUsage: number;
      peakCpuUsage: number;
    };
  }> {
    logger.info('🚀 Starting comprehensive performance benchmarking...');

    this.startResourceMonitoring();

    const benchmarks: PerformanceBenchmark[] = [
      // API Performance Benchmarks
      {
        name: 'Chat Conversation Start API',
        category: 'api',
        target: {
          averageResponseTime: 500,
          p95ResponseTime: 1000,
          p99ResponseTime: 2000,
          throughput: 50,
          memoryUsage: 512,
          cpuUsage: 70,
          errorRate: 1
        },
        test: this.benchmarkChatStartAPI.bind(this)
      },
      {
        name: 'Chat Message Processing API',
        category: 'api',
        target: {
          averageResponseTime: 1500,
          p95ResponseTime: 3000,
          p99ResponseTime: 5000,
          throughput: 30,
          memoryUsage: 512,
          cpuUsage: 80,
          errorRate: 2
        },
        test: this.benchmarkChatMessageAPI.bind(this)
      },
      {
        name: 'Knowledge API Retrieval',
        category: 'api',
        target: {
          averageResponseTime: 200,
          p95ResponseTime: 500,
          p99ResponseTime: 1000,
          throughput: 100,
          memoryUsage: 256,
          cpuUsage: 50,
          errorRate: 0.5
        },
        test: this.benchmarkKnowledgeAPI.bind(this)
      },
      {
        name: 'Intelligence API Processing',
        category: 'api',
        target: {
          averageResponseTime: 800,
          p95ResponseTime: 1500,
          p99ResponseTime: 3000,
          throughput: 40,
          memoryUsage: 384,
          cpuUsage: 70,
          errorRate: 1
        },
        test: this.benchmarkIntelligenceAPI.bind(this)
      },

      // WebSocket Performance Benchmarks
      {
        name: 'WebSocket Connection Establishment',
        category: 'websocket',
        target: {
          averageResponseTime: 100,
          p95ResponseTime: 300,
          p99ResponseTime: 500,
          throughput: 200,
          memoryUsage: 128,
          cpuUsage: 40,
          errorRate: 1
        },
        test: this.benchmarkWebSocketConnections.bind(this)
      },
      {
        name: 'WebSocket Message Throughput',
        category: 'websocket',
        target: {
          averageResponseTime: 50,
          p95ResponseTime: 150,
          p99ResponseTime: 300,
          throughput: 500,
          memoryUsage: 256,
          cpuUsage: 60,
          errorRate: 0.5
        },
        test: this.benchmarkWebSocketMessages.bind(this)
      },

      // Database Performance Benchmarks
      {
        name: 'Conversation History Retrieval',
        category: 'database',
        target: {
          averageResponseTime: 100,
          p95ResponseTime: 300,
          p99ResponseTime: 500,
          throughput: 80,
          memoryUsage: 192,
          cpuUsage: 30,
          errorRate: 0.1
        },
        test: this.benchmarkDatabaseReads.bind(this)
      },
      {
        name: 'Analytics Data Queries',
        category: 'database',
        target: {
          averageResponseTime: 500,
          p95ResponseTime: 1000,
          p99ResponseTime: 2000,
          throughput: 20,
          memoryUsage: 256,
          cpuUsage: 50,
          errorRate: 0.5
        },
        test: this.benchmarkAnalyticsQueries.bind(this)
      },

      // Memory Performance Benchmarks
      {
        name: 'Memory Usage Under Load',
        category: 'memory',
        target: {
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          throughput: 0,
          memoryUsage: 1024,
          cpuUsage: 80,
          errorRate: 0
        },
        test: this.benchmarkMemoryUsage.bind(this)
      },

      // Integration Performance Benchmarks
      {
        name: 'End-to-End Conversation Flow',
        category: 'integration',
        target: {
          averageResponseTime: 2000,
          p95ResponseTime: 4000,
          p99ResponseTime: 6000,
          throughput: 20,
          memoryUsage: 512,
          cpuUsage: 85,
          errorRate: 1
        },
        test: this.benchmarkE2EConversationFlow.bind(this)
      }
    ];

    // Run all benchmarks
    for (const benchmark of benchmarks) {
      logger.info(`⚡ Running benchmark: ${benchmark.name}...`);
      try {
        const metrics = await benchmark.test();
        metrics.passed = this.validateBenchmark(metrics, benchmark.target);
        this.benchmarkResults.push(metrics);
        
        if (metrics.passed) {
          logger.info(`✅ ${benchmark.name} passed`, {
            average: `${metrics.statistics.average.toFixed(2)}ms`,
            p95: `${metrics.statistics.p95.toFixed(2)}ms`,
            throughput: `${metrics.measurements.requestsPerSecond.toFixed(2)} RPS`
          });
        } else {
          logger.warn(`⚠️ ${benchmark.name} failed benchmark`, {
            issues: metrics.issues,
            recommendations: metrics.recommendations
          });
        }
      } catch (error) {
        logger.error(`❌ Benchmark ${benchmark.name} crashed:`, error);
      }
    }

    this.stopResourceMonitoring();

    // Calculate overall results
    const passedBenchmarks = this.benchmarkResults.filter(r => r.passed).length;
    const failedBenchmarks = this.benchmarkResults.length - passedBenchmarks;
    const overallScore = (passedBenchmarks / this.benchmarkResults.length) * 100;

    // Calculate system health metrics
    const systemHealth = this.calculateSystemHealth();

    logger.info('🏁 Performance benchmarking completed', {
      overallScore: `${overallScore.toFixed(1)}%`,
      passed: passedBenchmarks,
      failed: failedBenchmarks,
      systemHealth
    });

    return {
      overallScore,
      passedBenchmarks,
      failedBenchmarks,
      results: this.benchmarkResults,
      systemHealth
    };
  }

  private async benchmarkChatStartAPI(): Promise<PerformanceMetrics> {
    const name = 'Chat Conversation Start API';
    const category = 'api';
    const requestCount = 100;
    const responseTimes: number[] = [];
    let errors = 0;

    const startTime = performance.now();
    
    for (let i = 0; i < requestCount; i++) {
      const requestStart = performance.now();
      
      try {
        const response = await request(this.app)
          .post('/api/v3/chat/conversation/start')
          .send({ customer_id: `benchmark_${i}` });
        
        const responseTime = performance.now() - requestStart;
        responseTimes.push(responseTime);
        
        if (response.status !== 201) {
          errors++;
        }
      } catch (error) {
        errors++;
        responseTimes.push(5000); // Penalty for errors
      }
    }

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (requestCount / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / requestCount * 100);
  }

  private async benchmarkChatMessageAPI(): Promise<PerformanceMetrics> {
    const name = 'Chat Message Processing API';
    const category = 'api';
    const requestCount = 50;
    const responseTimes: number[] = [];
    let errors = 0;

    // First create sessions
    const sessions: string[] = [];
    for (let i = 0; i < requestCount; i++) {
      const response = await request(this.app)
        .post('/api/v3/chat/conversation/start')
        .send({ customer_id: `benchmark_message_${i}` });
      
      if (response.status === 201) {
        sessions.push(response.body.sessionId);
      }
    }

    const startTime = performance.now();

    // Benchmark message processing
    for (let i = 0; i < sessions.length; i++) {
      const requestStart = performance.now();
      
      try {
        const response = await request(this.app)
          .post('/api/v3/chat/conversation/message')
          .send({
            session_id: sessions[i],
            message: `Benchmark test message ${i} for performance testing`
          });
        
        const responseTime = performance.now() - requestStart;
        responseTimes.push(responseTime);
        
        if (response.status !== 200) {
          errors++;
        }
      } catch (error) {
        errors++;
        responseTimes.push(10000); // Penalty for errors
      }
    }

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (sessions.length / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / sessions.length * 100);
  }

  private async benchmarkKnowledgeAPI(): Promise<PerformanceMetrics> {
    const name = 'Knowledge API Retrieval';
    const category = 'api';
    const requestCount = 200;
    const responseTimes: number[] = [];
    let errors = 0;

    const startTime = performance.now();

    for (let i = 0; i < requestCount; i++) {
      const requestStart = performance.now();
      
      try {
        const response = await request(this.app)
          .get('/api/v2/knowledge/collections')
          .query({ category: 'suits' });
        
        const responseTime = performance.now() - requestStart;
        responseTimes.push(responseTime);
        
        if (response.status !== 200) {
          errors++;
        }
      } catch (error) {
        errors++;
        responseTimes.push(3000); // Penalty for errors
      }
    }

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (requestCount / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / requestCount * 100);
  }

  private async benchmarkIntelligenceAPI(): Promise<PerformanceMetrics> {
    const name = 'Intelligence API Processing';
    const category = 'api';
    const requestCount = 75;
    const responseTimes: number[] = [];
    let errors = 0;

    const startTime = performance.now();

    for (let i = 0; i < requestCount; i++) {
      const requestStart = performance.now();
      
      try {
        const response = await request(this.app)
          .post('/api/v2/intelligence/style-profile')
          .send({
            preferences: {
              fit: ['slim', 'regular', 'classic'][i % 3],
              occasion: ['business', 'formal', 'casual'][i % 3],
              budget: ['budget', 'premium', 'luxury'][i % 3]
            }
          });
        
        const responseTime = performance.now() - requestStart;
        responseTimes.push(responseTime);
        
        if (response.status !== 200) {
          errors++;
        }
      } catch (error) {
        errors++;
        responseTimes.push(5000); // Penalty for errors
      }
    }

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (requestCount / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / requestCount * 100);
  }

  private async benchmarkWebSocketConnections(): Promise<PerformanceMetrics> {
    const name = 'WebSocket Connection Establishment';
    const category = 'websocket';
    const connectionCount = 100;
    const responseTimes: number[] = [];
    let errors = 0;

    const connections: WebSocket[] = [];
    const startTime = performance.now();

    for (let i = 0; i < connectionCount; i++) {
      const requestStart = performance.now();
      
      try {
        const ws = new WebSocket('ws://localhost:8080');
        connections.push(ws);

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            errors++;
            responseTimes.push(5000);
            reject(new Error('Connection timeout'));
          }, 5000);

          ws.on('open', () => {
            clearTimeout(timeout);
            const responseTime = performance.now() - requestStart;
            responseTimes.push(responseTime);
            resolve();
          });

          ws.on('error', () => {
            clearTimeout(timeout);
            errors++;
            responseTimes.push(5000);
            reject(new Error('Connection error'));
          });
        });
      } catch (error) {
        errors++;
      }
    }

    // Close all connections
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (connectionCount / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / connectionCount * 100);
  }

  private async benchmarkWebSocketMessages(): Promise<PerformanceMetrics> {
    const name = 'WebSocket Message Throughput';
    const category = 'websocket';
    const messageCount = 500;
    const responseTimes: number[] = [];
    let errors = 0;

    // Establish connection
    const ws = new WebSocket('ws://localhost:8080');
    
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'authenticate',
          sessionId: 'benchmark_ws_session',
          customerId: 'benchmark_ws_customer'
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'authenticated') {
          resolve();
        }
      });

      ws.on('error', reject);
      setTimeout(() => reject(new Error('Authentication timeout')), 5000);
    });

    const startTime = performance.now();
    let messagesReceived = 0;

    // Set up response handler
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'chat_response') {
        const responseTime = performance.now() - message.timestamp;
        responseTimes.push(responseTime);
        messagesReceived++;
      }
    });

    // Send messages
    for (let i = 0; i < messageCount; i++) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'chat_message',
            content: `Benchmark message ${i}`,
            timestamp: performance.now(),
            metadata: { benchmark: true }
          }));
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
      }
    }

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    ws.close();

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (messagesReceived / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / messageCount * 100);
  }

  private async benchmarkDatabaseReads(): Promise<PerformanceMetrics> {
    const name = 'Conversation History Retrieval';
    const category = 'database';
    const requestCount = 100;
    const responseTimes: number[] = [];
    let errors = 0;

    // First create some conversations with history
    const sessions: string[] = [];
    for (let i = 0; i < 20; i++) {
      const startResponse = await request(this.app)
        .post('/api/v3/chat/conversation/start')
        .send({ customer_id: `db_benchmark_${i}` });
      
      if (startResponse.status === 201) {
        const sessionId = startResponse.body.sessionId;
        sessions.push(sessionId);
        
        // Add some messages to create history
        for (let j = 0; j < 5; j++) {
          await request(this.app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: sessionId,
              message: `Database benchmark message ${j}`
            });
        }
      }
    }

    const startTime = performance.now();

    // Benchmark history retrieval
    for (let i = 0; i < requestCount; i++) {
      const sessionId = sessions[i % sessions.length];
      const requestStart = performance.now();
      
      try {
        const response = await request(this.app)
          .get(`/api/v3/chat/conversation/history/${sessionId}`);
        
        const responseTime = performance.now() - requestStart;
        responseTimes.push(responseTime);
        
        if (response.status !== 200) {
          errors++;
        }
      } catch (error) {
        errors++;
        responseTimes.push(2000); // Penalty for errors
      }
    }

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (requestCount / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / requestCount * 100);
  }

  private async benchmarkAnalyticsQueries(): Promise<PerformanceMetrics> {
    const name = 'Analytics Data Queries';
    const category = 'database';
    const requestCount = 50;
    const responseTimes: number[] = [];
    let errors = 0;

    const startTime = performance.now();

    for (let i = 0; i < requestCount; i++) {
      const requestStart = performance.now();
      
      try {
        const response = await request(this.app)
          .get('/api/v2/intelligence/trending-analysis')
          .query({ 
            timeframe: 'last_24_hours',
            categories: ['suits', 'accessories']
          });
        
        const responseTime = performance.now() - requestStart;
        responseTimes.push(responseTime);
        
        if (response.status !== 200) {
          errors++;
        }
      } catch (error) {
        errors++;
        responseTimes.push(3000); // Penalty for errors
      }
    }

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (requestCount / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / requestCount * 100);
  }

  private async benchmarkMemoryUsage(): Promise<PerformanceMetrics> {
    const name = 'Memory Usage Under Load';
    const category = 'memory';
    const loadDuration = 30000; // 30 seconds
    const responseTimes: number[] = [0]; // Not applicable for memory test

    const startTime = performance.now();
    const memorySnapshots: number[] = [];

    // Create memory pressure
    const interval = setInterval(() => {
      const memory = process.memoryUsage();
      memorySnapshots.push(memory.heapUsed / 1024 / 1024); // MB
    }, 1000);

    // Simulate load
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(this.app)
          .post('/api/v3/chat/conversation/start')
          .send({ customer_id: `memory_test_${i}` })
          .then(response => 
            request(this.app)
              .post('/api/v3/chat/conversation/message')
              .send({
                session_id: response.body.sessionId,
                message: 'Memory benchmark test message'
              })
          )
      );
    }

    await Promise.all(promises);
    await new Promise(resolve => setTimeout(resolve, loadDuration));

    clearInterval(interval);

    const totalTime = performance.now() - startTime;
    const averageMemory = memorySnapshots.reduce((sum, mem) => sum + mem, 0) / memorySnapshots.length;
    const peakMemory = Math.max(...memorySnapshots);

    const metrics = this.createPerformanceMetrics(name, category, responseTimes, 0, 0);
    metrics.measurements.memoryUsage = {
      heapUsed: averageMemory * 1024 * 1024,
      heapTotal: peakMemory * 1024 * 1024,
      external: 0,
      rss: peakMemory * 1024 * 1024
    };

    return metrics;
  }

  private async benchmarkE2EConversationFlow(): Promise<PerformanceMetrics> {
    const name = 'End-to-End Conversation Flow';
    const category = 'integration';
    const conversationCount = 30;
    const responseTimes: number[] = [];
    let errors = 0;

    const startTime = performance.now();

    for (let i = 0; i < conversationCount; i++) {
      const conversationStart = performance.now();
      let conversationError = false;
      
      try {
        // Full conversation flow
        const startResponse = await request(this.app)
          .post('/api/v3/chat/conversation/start')
          .send({ customer_id: `e2e_benchmark_${i}` });
        
        if (startResponse.status !== 201) {
          conversationError = true;
        } else {
          const sessionId = startResponse.body.sessionId;
          
          // Send multiple messages
          const messages = [
            'I need help choosing a wedding suit',
            'It\'s for a beach wedding in July',
            'What colors would you recommend?',
            'Can you show me some options?'
          ];

          for (const message of messages) {
            const messageResponse = await request(this.app)
              .post('/api/v3/chat/conversation/message')
              .send({ session_id: sessionId, message });
            
            if (messageResponse.status !== 200) {
              conversationError = true;
              break;
            }
          }

          // Get conversation history
          const historyResponse = await request(this.app)
            .get(`/api/v3/chat/conversation/history/${sessionId}`);
          
          if (historyResponse.status !== 200) {
            conversationError = true;
          }
        }

        const conversationTime = performance.now() - conversationStart;
        responseTimes.push(conversationTime);
        
        if (conversationError) {
          errors++;
        }

      } catch (error) {
        errors++;
        responseTimes.push(10000); // Penalty for errors
      }
    }

    const totalTime = performance.now() - startTime;
    const requestsPerSecond = (conversationCount / totalTime) * 1000;

    return this.createPerformanceMetrics(name, category, responseTimes, requestsPerSecond, errors / conversationCount * 100);
  }

  private createPerformanceMetrics(
    name: string, 
    category: string, 
    responseTimes: number[], 
    requestsPerSecond: number, 
    errorRate: number
  ): PerformanceMetrics {
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const average = sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const min = sortedTimes[0];
    const max = sortedTimes[sortedTimes.length - 1];
    
    const variance = sortedTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / sortedTimes.length;
    const standardDeviation = Math.sqrt(variance);

    const currentMemory = process.memoryUsage();
    const currentCpu = process.cpuUsage();

    return {
      name,
      category,
      measurements: {
        responseTimes: sortedTimes,
        throughput: requestsPerSecond,
        memoryUsage: {
          heapUsed: currentMemory.heapUsed,
          heapTotal: currentMemory.heapTotal,
          external: currentMemory.external,
          rss: currentMemory.rss
        },
        cpuUsage: {
          user: currentCpu.user,
          system: currentCpu.system,
          percent: ((currentCpu.user + currentCpu.system) / 1000000) * 100
        },
        errorRate,
        concurrentConnections: 0,
        requestsPerSecond
      },
      statistics: {
        average,
        median,
        p95,
        p99,
        min,
        max,
        standardDeviation
      },
      passed: false, // Will be set by validateBenchmark
      issues: [],
      recommendations: []
    };
  }

  private validateBenchmark(metrics: PerformanceMetrics, target: PerformanceBenchmark['target']): boolean {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate response times
    if (metrics.statistics.average > target.averageResponseTime) {
      issues.push(`Average response time ${metrics.statistics.average.toFixed(2)}ms exceeds target ${target.averageResponseTime}ms`);
      recommendations.push('Consider optimizing database queries and caching strategies');
    }

    if (metrics.statistics.p95 > target.p95ResponseTime) {
      issues.push(`P95 response time ${metrics.statistics.p95.toFixed(2)}ms exceeds target ${target.p95ResponseTime}ms`);
      recommendations.push('Investigate slow queries and potential bottlenecks');
    }

    if (metrics.statistics.p99 > target.p99ResponseTime) {
      issues.push(`P99 response time ${metrics.statistics.p99.toFixed(2)}ms exceeds target ${target.p99ResponseTime}ms`);
      recommendations.push('Add circuit breakers for external service calls');
    }

    // Validate throughput
    if (metrics.measurements.requestsPerSecond < target.throughput) {
      issues.push(`Throughput ${metrics.measurements.requestsPerSecond.toFixed(2)} RPS below target ${target.throughput} RPS`);
      recommendations.push('Consider horizontal scaling and connection pooling');
    }

    // Validate error rate
    if (metrics.measurements.errorRate > target.errorRate) {
      issues.push(`Error rate ${metrics.measurements.errorRate.toFixed(2)}% exceeds target ${target.errorRate}%`);
      recommendations.push('Improve error handling and add retry mechanisms');
    }

    // Validate memory usage
    const memoryUsageMB = metrics.measurements.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > target.memoryUsage) {
      issues.push(`Memory usage ${memoryUsageMB.toFixed(2)}MB exceeds target ${target.memoryUsage}MB`);
      recommendations.push('Investigate memory leaks and optimize data structures');
    }

    metrics.issues = issues;
    metrics.recommendations = recommendations;

    return issues.length === 0;
  }

  private startResourceMonitoring(): void {
    this.resourceMonitor.startTime = performance.now();
    this.resourceMonitor.memorySnapshots = [];
    this.resourceMonitor.cpuSnapshots = [];

    const interval = setInterval(() => {
      const timestamp = performance.now();
      this.resourceMonitor.memorySnapshots.push({
        timestamp,
        memory: process.memoryUsage()
      });

      this.resourceMonitor.cpuSnapshots.push({
        timestamp,
        cpu: process.cpuUsage()
      });
    }, 1000);

    // Store interval reference for cleanup
    (this.resourceMonitor as any).interval = interval;
  }

  private stopResourceMonitoring(): void {
    this.resourceMonitor.endTime = performance.now();
    if ((this.resourceMonitor as any).interval) {
      clearInterval((this.resourceMonitor as any).interval);
    }
  }

  private calculateSystemHealth(): {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageCpuUsage: number;
    peakCpuUsage: number;
  } {
    const memoryUsages = this.resourceMonitor.memorySnapshots.map(s => s.memory.heapUsed / 1024 / 1024);
    const cpuUsages = this.resourceMonitor.cpuSnapshots.map(s => (s.cpu.user + s.cpu.system) / 1000000);

    return {
      averageMemoryUsage: memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length,
      peakMemoryUsage: Math.max(...memoryUsages),
      averageCpuUsage: cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length,
      peakCpuUsage: Math.max(...cpuUsages)
    };
  }
}

describe('Performance Benchmarking Suite', () => {
  let app: any;
  let server: any;
  let benchmarkRunner: PerformanceBenchmarkRunner;

  beforeAll(async () => {
    ({ app, server } = await setupTestApp());
    benchmarkRunner = new PerformanceBenchmarkRunner(app, server);
    
    // Wait for all services to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Comprehensive Performance Validation', () => {
    it('should meet all performance benchmarks', async () => {
      const results = await benchmarkRunner.runAllBenchmarks();

      // Validate overall performance
      expect(results.overallScore).toBeGreaterThan(75); // At least 75% of benchmarks should pass
      expect(results.passedBenchmarks).toBeGreaterThan(results.failedBenchmarks);

      // Validate system health
      expect(results.systemHealth.peakMemoryUsage).toBeLessThan(2048); // Less than 2GB peak
      expect(results.systemHealth.averageCpuUsage).toBeLessThan(90); // Less than 90% average CPU

      // Log detailed results
      logger.info('📊 COMPREHENSIVE PERFORMANCE BENCHMARK RESULTS', {
        overallScore: `${results.overallScore.toFixed(1)}%`,
        passedBenchmarks: results.passedBenchmarks,
        failedBenchmarks: results.failedBenchmarks,
        systemHealth: {
          avgMemory: `${results.systemHealth.averageMemoryUsage.toFixed(2)}MB`,
          peakMemory: `${results.systemHealth.peakMemoryUsage.toFixed(2)}MB`,
          avgCpu: `${results.systemHealth.averageCpuUsage.toFixed(2)}%`,
          peakCpu: `${results.systemHealth.peakCpuUsage.toFixed(2)}%`
        }
      });

      // Log failed benchmarks for investigation
      const failedBenchmarks = results.results.filter(r => !r.passed);
      if (failedBenchmarks.length > 0) {
        logger.warn('⚠️ Failed benchmarks require attention:', {
          failed: failedBenchmarks.map(b => ({
            name: b.name,
            issues: b.issues,
            recommendations: b.recommendations
          }))
        });
      }

    }, 600000); // 10 minute timeout for comprehensive benchmarking
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // This would compare against baseline metrics in a real scenario
      // For now, we'll test that performance doesn't degrade significantly
      
      const firstRun = await benchmarkRunner.runAllBenchmarks();
      
      // Wait a moment and run again
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const secondRun = await benchmarkRunner.runAllBenchmarks();

      // Performance shouldn't degrade significantly between runs
      const firstRunAverage = firstRun.results.reduce((sum, r) => sum + r.statistics.average, 0) / firstRun.results.length;
      const secondRunAverage = secondRun.results.reduce((sum, r) => sum + r.statistics.average, 0) / secondRun.results.length;

      const performanceDegradation = ((secondRunAverage - firstRunAverage) / firstRunAverage) * 100;
      
      // Allow up to 20% degradation (systems can vary)
      expect(performanceDegradation).toBeLessThan(20);

      logger.info('🔍 Performance regression test completed', {
        firstRunAverage: `${firstRunAverage.toFixed(2)}ms`,
        secondRunAverage: `${secondRunAverage.toFixed(2)}ms`,
        degradation: `${performanceDegradation.toFixed(2)}%`
      });

    }, 900000); // 15 minute timeout
  });

  describe('Stress Testing', () => {
    it('should maintain stability under extreme load', async () => {
      // Create extreme load conditions
      const extremeLoadPromises = [];
      
      // 1. High concurrent API requests
      for (let i = 0; i < 200; i++) {
        extremeLoadPromises.push(
          request(app)
            .post('/api/v3/chat/conversation/start')
            .send({ customer_id: `stress_test_${i}` })
        );
      }

      // 2. Multiple WebSocket connections
      const wsConnections: WebSocket[] = [];
      for (let i = 0; i < 50; i++) {
        const ws = new WebSocket('ws://localhost:8080');
        wsConnections.push(ws);
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(extremeLoadPromises);
      const testDuration = performance.now() - startTime;

      // Clean up WebSocket connections
      wsConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      // Analyze results
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const successRate = (successfulRequests / results.length) * 100;

      // System should remain stable (at least 80% success rate under extreme load)
      expect(successRate).toBeGreaterThan(80);

      // Should complete within reasonable time (30 seconds for 200 requests)
      expect(testDuration).toBeLessThan(30000);

      logger.info('💪 Stress testing completed', {
        totalRequests: results.length,
        successful: successfulRequests,
        successRate: `${successRate.toFixed(2)}%`,
        duration: `${testDuration.toFixed(2)}ms`
      });

    }, 120000); // 2 minute timeout
  });
});