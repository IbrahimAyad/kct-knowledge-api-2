/**
 * Metrics Collection Service
 * Collects, aggregates, and provides performance metrics for caching and API operations
 */

import { cacheService } from './cache-service';
import { performanceMonitor } from '../middleware/performance';

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDeletes: number;
  totalErrors: number;
  averageResponseTime: number;
  topKeys: KeyMetric[];
  keyspaceInfo: KeyspaceInfo;
}

export interface KeyMetric {
  key: string;
  hits: number;
  lastAccessed: string;
  size?: number;
  ttl?: number;
}

export interface KeyspaceInfo {
  totalKeys: number;
  keysByPattern: { [pattern: string]: number };
  memoryUsage: string;
  avgTTL: number;
}

export interface APIMetrics {
  totalRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRate: number;
  endpointStats: EndpointStats[];
  statusCodeDistribution: { [code: string]: number };
}

export interface EndpointStats {
  endpoint: string;
  requests: number;
  averageResponseTime: number;
  errorCount: number;
  cacheHitRate?: number;
  lastAccessed: string;
}

export interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  cpu: {
    usage: number;
  };
  disk?: {
    used: number;
    total: number;
    usage: number;
  };
}

export interface MetricsSnapshot {
  timestamp: string;
  cache: CacheMetrics;
  api: APIMetrics;
  system: SystemMetrics;
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  category: 'cache' | 'performance' | 'memory' | 'disk' | 'error';
  resolved?: boolean;
}

export class MetricsCollector {
  private keyMetrics: Map<string, KeyMetric> = new Map();
  private endpointMetrics: Map<string, EndpointStats> = new Map();
  private statusCodes: Map<string, number> = new Map();
  private alerts: Alert[] = [];
  private collectionInterval: NodeJS.Timeout | null = null;
  private isCollecting = false;

  // Alert thresholds
  private readonly thresholds = {
    cacheHitRateWarning: 0.7, // 70%
    cacheHitRateCritical: 0.5, // 50%
    responseTimeWarning: 1000, // 1s
    responseTimeCritical: 3000, // 3s
    errorRateWarning: 0.05, // 5%
    errorRateCritical: 0.1, // 10%
    memoryUsageWarning: 0.95, // 95% (adjusted for 32GB RAM allocation)
    memoryUsageCritical: 0.98, // 98%
  };

  constructor() {
    this.startCollection();
  }

  /**
   * Start metrics collection
   */
  startCollection(intervalMs: number = 60000): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        this.checkAlerts();
      } catch (error) {
        console.error('Metrics collection error:', error);
      }
    }, intervalMs);

    console.log('📊 Metrics collection started');
  }

  /**
   * Stop metrics collection
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    console.log('📊 Metrics collection stopped');
  }

  /**
   * Record a cache operation
   */
  recordCacheOperation(
    key: string,
    operation: 'hit' | 'miss' | 'set' | 'delete',
    responseTime?: number,
    size?: number
  ): void {
    const existing = this.keyMetrics.get(key) || {
      key,
      hits: 0,
      lastAccessed: new Date().toISOString(),
    };

    if (operation === 'hit') {
      existing.hits++;
    }

    existing.lastAccessed = new Date().toISOString();
    if (size !== undefined) {
      existing.size = size;
    }

    this.keyMetrics.set(key, existing);
  }

  /**
   * Record an API request
   */
  recordAPIRequest(
    endpoint: string,
    responseTime: number,
    statusCode: number,
    cacheHit?: boolean
  ): void {
    // Update endpoint metrics
    const existing = this.endpointMetrics.get(endpoint) || {
      endpoint,
      requests: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastAccessed: new Date().toISOString(),
    };

    existing.requests++;
    existing.averageResponseTime = 
      (existing.averageResponseTime * (existing.requests - 1) + responseTime) / existing.requests;
    
    if (statusCode >= 400) {
      existing.errorCount++;
    }

    if (cacheHit !== undefined) {
      // Calculate cache hit rate for this endpoint
      // This is a simplified calculation - in production, you'd want more sophisticated tracking
      existing.cacheHitRate = cacheHit ? 
        ((existing.cacheHitRate || 0) * 0.9 + 0.1) : 
        ((existing.cacheHitRate || 0) * 0.9);
    }

    existing.lastAccessed = new Date().toISOString();
    this.endpointMetrics.set(endpoint, existing);

    // Update status code distribution
    const statusString = statusCode.toString();
    this.statusCodes.set(statusString, (this.statusCodes.get(statusString) || 0) + 1);
  }

  /**
   * Get current metrics snapshot
   */
  async getMetricsSnapshot(): Promise<MetricsSnapshot> {
    const timestamp = new Date().toISOString();
    const cache = await this.getCacheMetrics();
    const api = this.getAPIMetrics();
    const system = await this.getSystemMetrics();

    return {
      timestamp,
      cache,
      api,
      system,
      alerts: this.getActiveAlerts(),
    };
  }

  /**
   * Get cache metrics
   */
  async getCacheMetrics(): Promise<CacheMetrics> {
    const cacheServiceMetrics = cacheService.getMetrics();
    const totalOperations = cacheServiceMetrics.hits + cacheServiceMetrics.misses;
    
    const hitRate = totalOperations > 0 ? cacheServiceMetrics.hits / totalOperations : 0;
    const missRate = 1 - hitRate;

    // Get top accessed keys
    const topKeys = Array.from(this.keyMetrics.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 20);

    // Get keyspace info
    const keyspaceInfo = await this.getKeyspaceInfo();

    return {
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimal places
      missRate: Math.round(missRate * 10000) / 100,
      totalHits: cacheServiceMetrics.hits,
      totalMisses: cacheServiceMetrics.misses,
      totalSets: cacheServiceMetrics.sets,
      totalDeletes: cacheServiceMetrics.deletes,
      totalErrors: cacheServiceMetrics.errors,
      averageResponseTime: Math.round(cacheServiceMetrics.averageResponseTime * 100) / 100,
      topKeys,
      keyspaceInfo,
    };
  }

  /**
   * Get API metrics
   */
  getAPIMetrics(): APIMetrics {
    const performanceMetrics = performanceMonitor.getMetrics();
    const totalRequests = performanceMetrics.requestCount;
    const uptime = process.uptime();
    const requestsPerSecond = totalRequests > 0 ? totalRequests / uptime : 0;
    const errorRate = totalRequests > 0 ? performanceMetrics.errorCount / totalRequests : 0;

    // Get endpoint stats
    const endpointStats = Array.from(this.endpointMetrics.values())
      .sort((a, b) => b.requests - a.requests);

    // Get status code distribution
    const statusCodeDistribution: { [code: string]: number } = {};
    for (const [code, count] of this.statusCodes.entries()) {
      statusCodeDistribution[code] = count;
    }

    return {
      totalRequests,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      averageResponseTime: Math.round(performanceMetrics.averageResponseTime * 100) / 100,
      slowRequests: performanceMetrics.slowRequestCount,
      errorRate: Math.round(errorRate * 10000) / 100, // Percentage
      endpointStats,
      statusCodeDistribution,
    };
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    
    return {
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) / 100,
      },
      cpu: {
        usage: await this.getCPUUsage(),
      },
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(period: 'hour' | 'day' | 'week' = 'hour'): Promise<{
    summary: string;
    recommendations: string[];
    keyFindings: string[];
    snapshot: MetricsSnapshot;
  }> {
    const snapshot = await this.getMetricsSnapshot();
    const keyFindings: string[] = [];
    const recommendations: string[] = [];

    // Analyze cache performance
    if (snapshot.cache.hitRate < this.thresholds.cacheHitRateWarning * 100) {
      keyFindings.push(`Low cache hit rate: ${snapshot.cache.hitRate}%`);
      recommendations.push('Review caching strategy and TTL values');
    }

    // Analyze API performance
    if (snapshot.api.averageResponseTime > this.thresholds.responseTimeWarning) {
      keyFindings.push(`High average response time: ${snapshot.api.averageResponseTime}ms`);
      recommendations.push('Optimize slow endpoints and increase caching');
    }

    // Analyze memory usage
    if (snapshot.system.memory.usage > this.thresholds.memoryUsageWarning) {
      keyFindings.push(`High memory usage: ${Math.round(snapshot.system.memory.usage * 100)}%`);
      recommendations.push('Monitor for memory leaks and optimize data structures');
    }

    // Generate summary
    const summary = `
Performance Report (${period}):
- Cache Hit Rate: ${snapshot.cache.hitRate}%
- Average Response Time: ${snapshot.api.averageResponseTime}ms
- Total Requests: ${snapshot.api.totalRequests}
- Error Rate: ${snapshot.api.errorRate}%
- Memory Usage: ${Math.round(snapshot.system.memory.usage * 100)}%
`.trim();

    return {
      summary,
      recommendations,
      keyFindings,
      snapshot,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): number {
    const originalCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => !alert.resolved);
    return originalCount - this.alerts.length;
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.keyMetrics.clear();
    this.endpointMetrics.clear();
    this.statusCodes.clear();
    this.alerts = [];
    performanceMonitor.resetMetrics();
    cacheService.resetMetrics();
    console.log('📊 All metrics reset');
  }

  // Private helper methods

  private async collectMetrics(): Promise<void> {
    // This method runs periodically to collect additional metrics
    // For now, it's mainly used to trigger alert checks
    // In a more advanced implementation, you might collect additional system metrics here
  }

  private checkAlerts(): void {
    const now = new Date().toISOString();

    // Check cache hit rate
    const cacheMetrics = cacheService.getMetrics();
    const totalCacheOps = cacheMetrics.hits + cacheMetrics.misses;
    if (totalCacheOps > 0) {
      const hitRate = cacheMetrics.hits / totalCacheOps;
      
      if (hitRate < this.thresholds.cacheHitRateCritical) {
        this.addAlert({
          severity: 'critical',
          category: 'cache',
          message: `Critical: Cache hit rate below ${this.thresholds.cacheHitRateCritical * 100}%`,
        });
      } else if (hitRate < this.thresholds.cacheHitRateWarning) {
        this.addAlert({
          severity: 'warning',
          category: 'cache',
          message: `Warning: Cache hit rate below ${this.thresholds.cacheHitRateWarning * 100}%`,
        });
      }
    }

    // Check response time
    const perfMetrics = performanceMonitor.getMetrics();
    if (perfMetrics.averageResponseTime > this.thresholds.responseTimeCritical) {
      this.addAlert({
        severity: 'critical',
        category: 'performance',
        message: `Critical: Average response time ${perfMetrics.averageResponseTime}ms`,
      });
    } else if (perfMetrics.averageResponseTime > this.thresholds.responseTimeWarning) {
      this.addAlert({
        severity: 'warning',
        category: 'performance',
        message: `Warning: Average response time ${perfMetrics.averageResponseTime}ms`,
      });
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memoryUsageRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    if (memoryUsageRatio > this.thresholds.memoryUsageCritical) {
      this.addAlert({
        severity: 'critical',
        category: 'memory',
        message: `Critical: Memory usage ${Math.round(memoryUsageRatio * 100)}%`,
      });
    } else if (memoryUsageRatio > this.thresholds.memoryUsageWarning) {
      this.addAlert({
        severity: 'warning',
        category: 'memory',
        message: `Warning: Memory usage ${Math.round(memoryUsageRatio * 100)}%`,
      });
    }
  }

  private addAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a => 
      a.category === alert.category && 
      a.message === alert.message && 
      !a.resolved
    );

    if (!existingAlert) {
      const newAlert: Alert = {
        ...alert,
        id: `${alert.category}-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      
      this.alerts.push(newAlert);
      
      if (alert.severity === 'critical') {
        console.error(`🚨 ${newAlert.message}`);
      } else if (alert.severity === 'warning') {
        console.warn(`⚠️ ${newAlert.message}`);
      }
    }
  }

  private async getKeyspaceInfo(): Promise<KeyspaceInfo> {
    try {
      const healthInfo = await cacheService.getHealthInfo();
      
      // Analyze key patterns
      const keysByPattern: { [pattern: string]: number } = {};
      let totalTTL = 0;
      let keysWithTTL = 0;

      for (const [key, metric] of this.keyMetrics.entries()) {
        // Extract pattern from key
        const pattern = key.split(':')[0] || 'unknown';
        keysByPattern[pattern] = (keysByPattern[pattern] || 0) + 1;
        
        if (metric.ttl && metric.ttl > 0) {
          totalTTL += metric.ttl;
          keysWithTTL++;
        }
      }

      return {
        totalKeys: healthInfo.keyCount || this.keyMetrics.size,
        keysByPattern,
        memoryUsage: healthInfo.memoryUsage || '0 MB',
        avgTTL: keysWithTTL > 0 ? Math.round(totalTTL / keysWithTTL) : 0,
      };
    } catch (error) {
      return {
        totalKeys: this.keyMetrics.size,
        keysByPattern: {},
        memoryUsage: '0 MB',
        avgTTL: 0,
      };
    }
  }

  private async getCPUUsage(): Promise<number> {
    // Simple CPU usage calculation
    // In production, you'd want a more sophisticated approach
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const usage = Math.round((totalUsage / 1000000) * 100) / 100; // Convert to percentage
        resolve(Math.min(usage, 100)); // Cap at 100%
      }, 100);
    });
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();