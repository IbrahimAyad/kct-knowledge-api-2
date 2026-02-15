/**
 * Health Monitoring Service
 * Monitors system health, cache status, memory usage, and performance metrics
 */

import { cacheService } from './cache-service';
import { performanceMonitor } from '../middleware/performance';
import RedisConnection from '../config/redis';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: MemoryStatus;
  cache: CacheStatus;
  performance: PerformanceStatus;
  services: ServiceStatus[];
  issues: HealthIssue[];
}

export interface MemoryStatus {
  usage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  limits: {
    maxHeapSize: number;
    warningThreshold: number;
    criticalThreshold: number;
  };
  status: 'normal' | 'warning' | 'critical';
  gcInfo?: {
    lastGC?: number;
    gcCount?: number;
  };
}

export interface CacheStatus {
  connected: boolean;
  hitRate: number;
  memoryUsage?: string;
  keyCount?: number;
  responseTime: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: any;
}

export interface PerformanceStatus {
  averageResponseTime: number;
  requestsPerSecond: number;
  slowRequestCount: number;
  errorRate: number;
  status: 'good' | 'degraded' | 'poor';
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  message?: string;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'memory' | 'cache' | 'performance' | 'service';
  message: string;
  timestamp: string;
  resolved?: boolean;
}

export class HealthMonitorService {
  private issues: HealthIssue[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private readonly MAX_ISSUES = 200;

  // Memory thresholds in MB
  private readonly memoryThresholds = {
    warning: 512, // 512MB
    critical: 1024, // 1GB
  };

  // Performance thresholds
  private readonly performanceThresholds = {
    maxAverageResponseTime: 2000, // 2 seconds
    maxErrorRate: 0.05, // 5%
    maxSlowRequestRatio: 0.1, // 10% of requests
  };

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.checkInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        this.processHealthData(health);
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, intervalMs);

    console.log('🏥 Health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('🏥 Health monitoring stopped');
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const timestamp = new Date().toISOString();
    const memory = await this.getMemoryStatus();
    const cache = await this.getCacheStatus();
    const performance = this.getPerformanceStatus();
    const services = await this.getServiceStatuses();
    
    // Determine overall system status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (memory.status === 'critical' || cache.status === 'unhealthy' || performance.status === 'poor') {
      status = 'unhealthy';
    } else if (memory.status === 'warning' || cache.status === 'degraded' || performance.status === 'degraded') {
      status = 'degraded';
    }

    return {
      status,
      timestamp,
      uptime: process.uptime(),
      memory,
      cache,
      performance,
      services,
      issues: this.getActiveIssues(),
    };
  }

  /**
   * Get memory usage status
   */
  async getMemoryStatus(): Promise<MemoryStatus> {
    const memUsage = process.memoryUsage();
    const usage = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    };

    const maxHeapSize = this.getMaxHeapSize();
    const limits = {
      maxHeapSize,
      warningThreshold: this.memoryThresholds.warning,
      criticalThreshold: this.memoryThresholds.critical,
    };

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (usage.heapUsed >= this.memoryThresholds.critical) {
      status = 'critical';
    } else if (usage.heapUsed >= this.memoryThresholds.warning) {
      status = 'warning';
    }

    return {
      usage,
      limits,
      status,
      gcInfo: this.getGCInfo(),
    };
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<CacheStatus> {
    const startTime = Date.now();
    
    try {
      const healthInfo = await cacheService.getHealthInfo();
      const responseTime = Date.now() - startTime;
      const metrics = cacheService.getMetrics();
      
      const hitRate = metrics.hits + metrics.misses > 0 
        ? metrics.hits / (metrics.hits + metrics.misses) 
        : 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!healthInfo.connected) {
        status = 'unhealthy';
      } else if (responseTime > 1000 || hitRate < 0.5) { // 1 second or less than 50% hit rate
        status = 'degraded';
      }

      return {
        connected: healthInfo.connected,
        hitRate: Math.round(hitRate * 100) / 100,
        memoryUsage: healthInfo.memoryUsage,
        keyCount: healthInfo.keyCount,
        responseTime,
        status,
        metrics,
      };
    } catch (error) {
      return {
        connected: false,
        hitRate: 0,
        responseTime: Date.now() - startTime,
        status: 'unhealthy',
        metrics: null,
      };
    }
  }

  /**
   * Get performance status
   */
  getPerformanceStatus(): PerformanceStatus {
    const metrics = performanceMonitor.getMetrics();
    const totalRequests = metrics.requestCount;
    const uptimeSeconds = process.uptime();
    
    const requestsPerSecond = totalRequests > 0 ? totalRequests / uptimeSeconds : 0;
    const errorRate = totalRequests > 0 ? metrics.errorCount / totalRequests : 0;
    const slowRequestRatio = totalRequests > 0 ? metrics.slowRequestCount / totalRequests : 0;

    let status: 'good' | 'degraded' | 'poor' = 'good';
    
    if (metrics.averageResponseTime > this.performanceThresholds.maxAverageResponseTime ||
        errorRate > this.performanceThresholds.maxErrorRate ||
        slowRequestRatio > this.performanceThresholds.maxSlowRequestRatio) {
      status = 'poor';
    } else if (metrics.averageResponseTime > this.performanceThresholds.maxAverageResponseTime / 2 ||
               errorRate > this.performanceThresholds.maxErrorRate / 2) {
      status = 'degraded';
    }

    return {
      averageResponseTime: Math.round(metrics.averageResponseTime * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      slowRequestCount: metrics.slowRequestCount,
      errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimal places
      status,
    };
  }

  /**
   * Get individual service statuses
   */
  async getServiceStatuses(): Promise<ServiceStatus[]> {
    const services: ServiceStatus[] = [];
    const timestamp = new Date().toISOString();

    // Redis service
    try {
      const startTime = Date.now();
      const connected = await RedisConnection.ping();
      const responseTime = Date.now() - startTime;
      
      services.push({
        name: 'Redis Cache',
        status: connected ? 'up' : 'down',
        responseTime,
        lastCheck: timestamp,
        message: connected ? 'Connected' : 'Connection failed',
      });
    } catch (error) {
      services.push({
        name: 'Redis Cache',
        status: 'down',
        lastCheck: timestamp,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Data Loader service (check if data files are accessible)
    try {
      const { dataLoader } = await import('../utils/data-loader');
      const startTime = Date.now();
      await dataLoader.loadIndex();
      const responseTime = Date.now() - startTime;
      
      services.push({
        name: 'Data Loader',
        status: 'up',
        responseTime,
        lastCheck: timestamp,
        message: 'Data files accessible',
      });
    } catch (error) {
      services.push({
        name: 'Data Loader',
        status: 'down',
        lastCheck: timestamp,
        message: error instanceof Error ? error.message : 'Data files not accessible',
      });
    }

    return services;
  }

  /**
   * Cleanup expired issues and perform garbage collection if needed
   */
  async performCleanup(): Promise<{
    issuesCleared: number;
    gcTriggered: boolean;
    cacheCleanup?: any;
  }> {
    const result: { issuesCleared: number; gcTriggered: boolean; cacheCleanup?: any } = { 
      issuesCleared: 0, 
      gcTriggered: false 
    };

    // Clear old issues (older than 24 hours)
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    const originalIssueCount = this.issues.length;
    this.issues = this.issues.filter(issue => 
      new Date(issue.timestamp).getTime() > cutoffTime || !issue.resolved
    );
    result.issuesCleared = originalIssueCount - this.issues.length;

    // Trigger garbage collection if memory usage is high
    const memory = await this.getMemoryStatus();
    if (memory.status === 'warning' || memory.status === 'critical') {
      if (global.gc) {
        global.gc();
        result.gcTriggered = true;
        console.log('🗑️ Garbage collection triggered due to high memory usage');
      }
    }

    // Perform cache cleanup if needed
    try {
      result.cacheCleanup = await cacheService.getHealthInfo();
    } catch (error) {
      console.warn('Cache cleanup check failed:', error);
    }

    if (result.issuesCleared > 0) {
      console.log(`🧹 Cleanup completed: ${result.issuesCleared} old issues cleared`);
    }

    return result;
  }

  /**
   * Get active (unresolved) health issues
   */
  getActiveIssues(): HealthIssue[] {
    return this.issues.filter(issue => !issue.resolved);
  }

  /**
   * Add a health issue
   */
  addIssue(issue: Omit<HealthIssue, 'timestamp'>): void {
    // Check for duplicate active issue before adding
    const isDuplicate = this.issues.some(i =>
      i.category === issue.category &&
      i.message === issue.message &&
      !i.resolved
    );
    if (isDuplicate) return;

    this.issues.push({
      ...issue,
      timestamp: new Date().toISOString(),
    });

    // Enforce cap — drop oldest resolved issues first
    if (this.issues.length > this.MAX_ISSUES) {
      const unresolved = this.issues.filter(i => !i.resolved);
      const resolved = this.issues.filter(i => i.resolved);
      const keepResolved = resolved.slice(-Math.max(0, this.MAX_ISSUES - unresolved.length));
      this.issues = [...keepResolved, ...unresolved].slice(-this.MAX_ISSUES);
    }

    // Log critical issues immediately
    if (issue.severity === 'critical') {
      console.error(`🚨 Critical health issue: ${issue.message}`);
    }
  }

  /**
   * Resolve a health issue
   */
  resolveIssue(category: string, message: string): void {
    const issue = this.issues.find(i => 
      i.category === category && i.message === message && !i.resolved
    );
    
    if (issue) {
      issue.resolved = true;
      console.log(`✅ Health issue resolved: ${message}`);
    }
  }

  // Private helper methods

  private processHealthData(health: SystemHealth): void {
    // Process memory issues
    if (health.memory.status === 'critical') {
      this.addIssue({
        severity: 'critical',
        category: 'memory',
        message: `Critical memory usage: ${health.memory.usage.heapUsed}MB`,
      });
    } else if (health.memory.status === 'warning') {
      this.addIssue({
        severity: 'medium',
        category: 'memory',
        message: `High memory usage: ${health.memory.usage.heapUsed}MB`,
      });
    }

    // Process cache issues
    if (health.cache.status === 'unhealthy') {
      this.addIssue({
        severity: 'high',
        category: 'cache',
        message: `Cache unhealthy: ${health.cache.connected ? 'Poor performance' : 'Disconnected'}`,
      });
    }

    // Process performance issues
    if (health.performance.status === 'poor') {
      this.addIssue({
        severity: 'medium',
        category: 'performance',
        message: `Poor performance: ${health.performance.averageResponseTime}ms avg response time`,
      });
    }

    // Process service issues
    const downServices = health.services.filter(s => s.status === 'down');
    for (const service of downServices) {
      this.addIssue({
        severity: 'high',
        category: 'service',
        message: `Service down: ${service.name} - ${service.message}`,
      });
    }
  }

  private getMaxHeapSize(): number {
    // Try to get max heap size from V8
    try {
      const v8 = require('v8');
      const heapStats = v8.getHeapStatistics();
      return Math.round(heapStats.heap_size_limit / 1024 / 1024); // MB
    } catch {
      return 1024; // Default 1GB
    }
  }

  private getGCInfo(): { lastGC?: number; gcCount?: number } | undefined {
    try {
      const v8 = require('v8');
      const heapStats = v8.getHeapStatistics();
      return {
        gcCount: heapStats.number_of_native_contexts,
      };
    } catch {
      return undefined;
    }
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitorService();