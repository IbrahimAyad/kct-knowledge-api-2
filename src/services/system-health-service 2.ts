/**
 * System Health Service for KCT Knowledge API
 * Comprehensive health monitoring and alerting system
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { trendingAnalysisService } from './trending-analysis-service';
import { getErrorHandlingHealth, serviceHealthMonitor } from '../middleware/error-handler';
import os from 'os';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage_percentage: number;
    heap_used: number;
    heap_total: number;
  };
  disk: {
    free: number;
    total: number;
    usage_percentage: number;
  };
  network: {
    connections: number;
    bytes_sent: number;
    bytes_received: number;
  };
}

export interface ServiceHealth {
  cache: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    hit_rate: number;
    memory_usage: number;
    connections: number;
  };
  trending_analysis: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    last_update: string;
    data_freshness: number;
    processing_time: number;
  };
  knowledge_bank: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    data_loaded: boolean;
    last_refresh: string;
    total_records: number;
  };
  external_services: {
    [service: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      last_check: string;
      response_time: number;
      error_rate: number;
    };
  };
}

export interface PerformanceMetrics {
  api: {
    requests_per_minute: number;
    average_response_time: number;
    error_rate: number;
    slowest_endpoints: Array<{
      endpoint: string;
      average_time: number;
      request_count: number;
    }>;
  };
  trending: {
    cache_hit_rate: number;
    analysis_time: number;
    predictions_accuracy: number;
    data_points_processed: number;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_io: number;
  };
}

export interface HealthAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  component: string;
  message: string;
  timestamp: string;
  severity: number;
  resolved: boolean;
  metadata?: Record<string, any>;
}

class SystemHealthService {
  private initialized = false;
  private alerts: HealthAlert[] = [];
  private metrics: {
    requests: Map<string, { count: number; totalTime: number; errors: number }>;
    system: SystemMetrics | null;
  } = {
    requests: new Map(),
    system: null
  };

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing System Health Service...');
      
      // Start metrics collection
      this.startMetricsCollection();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.initialized = true;
      logger.info('System Health Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize System Health Service:', error);
      throw error;
    }
  }

  /**
   * Get overall system health status
   */
  async getSystemHealth(): Promise<{
    overall: HealthStatus;
    system: SystemMetrics;
    services: ServiceHealth;
    performance: PerformanceMetrics;
    alerts: HealthAlert[];
  }> {
    const systemMetrics = await this.collectSystemMetrics();
    const serviceHealth = await this.checkServiceHealth();
    const performanceMetrics = await this.collectPerformanceMetrics();
    const overallStatus = this.determineOverallHealth(systemMetrics, serviceHealth, performanceMetrics);

    return {
      overall: overallStatus,
      system: systemMetrics,
      services: serviceHealth,
      performance: performanceMetrics,
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Get simplified health check for load balancers
   */
  async getHealthCheck(): Promise<{
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
  }> {
    try {
      const health = await this.getSystemHealth();
      
      return {
        status: health.overall.status === 'unhealthy' ? 'error' : 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0'
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0'
      };
    }
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(endpoint: string, method: string, responseTime: number, statusCode: number): void {
    const key = `${method}:${endpoint}`;
    const current = this.metrics.requests.get(key) || { count: 0, totalTime: 0, errors: 0 };
    
    current.count++;
    current.totalTime += responseTime;
    if (statusCode >= 400) {
      current.errors++;
    }
    
    this.metrics.requests.set(key, current);

    // Alert on slow responses
    if (responseTime > 10000) { // 10 seconds
      this.createAlert(
        'critical',
        'api',
        `Slow API response detected: ${method} ${endpoint} took ${responseTime}ms`,
        { endpoint, method, responseTime, statusCode }
      );
    }

    // Alert on high error rates
    const errorRate = current.errors / current.count;
    if (current.count >= 10 && errorRate > 0.5) {
      this.createAlert(
        'warning',
        'api',
        `High error rate detected: ${endpoint} has ${(errorRate * 100).toFixed(1)}% error rate`,
        { endpoint, method, errorRate, totalRequests: current.count }
      );
    }
  }

  /**
   * Get trending system health
   */
  async getTrendingHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    cache_performance: {
      hit_rate: number;
      average_latency: number;
      memory_usage: number;
    };
    analysis_performance: {
      average_processing_time: number;
      data_freshness_minutes: number;
      predictions_generated: number;
    };
    data_quality: {
      completeness: number;
      accuracy: number;
      timeliness: number;
    };
  }> {
    try {
      // Check trending service health
      const cacheHealth = await cacheService.getHealthInfo();
      const analysisHealth = await this.checkTrendingAnalysisHealth();
      
      return {
        status: analysisHealth.status,
        cache_performance: {
          hit_rate: cacheHealth.hitRate || 0,
          average_latency: cacheHealth.averageLatency || 0,
          memory_usage: cacheHealth.memoryUsage || 0
        },
        analysis_performance: {
          average_processing_time: analysisHealth.processing_time,
          data_freshness_minutes: analysisHealth.data_freshness,
          predictions_generated: analysisHealth.predictions_count || 0
        },
        data_quality: {
          completeness: 0.95, // Mock data - in production, calculate from actual data
          accuracy: 0.92,
          timeliness: 0.88
        }
      };
    } catch (error) {
      logger.error('Error getting trending health:', error);
      return {
        status: 'unhealthy',
        cache_performance: { hit_rate: 0, average_latency: 0, memory_usage: 0 },
        analysis_performance: { average_processing_time: 0, data_freshness_minutes: 0, predictions_generated: 0 },
        data_quality: { completeness: 0, accuracy: 0, timeliness: 0 }
      };
    }
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = await this.getCpuUsage();
    const diskUsage = await this.getDiskUsage();
    
    const metrics: SystemMetrics = {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        total: os.totalmem(),
        usage_percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal
      },
      disk: diskUsage,
      network: {
        connections: 0, // Would need system-specific implementation
        bytes_sent: 0,
        bytes_received: 0
      }
    };

    // Store for alerting
    this.metrics.system = metrics;

    // Check for alerts
    this.checkSystemAlerts(metrics);

    return metrics;
  }

  private async checkServiceHealth(): Promise<ServiceHealth> {
    const cacheHealth = await this.checkCacheHealth();
    const trendingHealth = await this.checkTrendingAnalysisHealth();
    const knowledgeHealth = await this.checkKnowledgeBankHealth();
    const externalHealth = serviceHealthMonitor.getServiceHealth();

    return {
      cache: cacheHealth,
      trending_analysis: trendingHealth,
      knowledge_bank: knowledgeHealth,
      external_services: externalHealth
    };
  }

  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const apiMetrics = this.calculateApiMetrics();
    const trendingMetrics = await this.calculateTrendingMetrics();
    const systemMetrics = this.metrics.system;

    return {
      api: apiMetrics,
      trending: trendingMetrics,
      system: {
        cpu_usage: systemMetrics?.cpu.usage || 0,
        memory_usage: systemMetrics?.memory.usage_percentage || 0,
        disk_usage: systemMetrics?.disk.usage_percentage || 0,
        network_io: (systemMetrics?.network.bytes_sent || 0) + (systemMetrics?.network.bytes_received || 0)
      }
    };
  }

  private async checkCacheHealth(): Promise<ServiceHealth['cache']> {
    try {
      const startTime = Date.now();
      const health = await cacheService.getHealthInfo();
      const latency = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (latency > 1000 || !health.connected) {
        status = 'unhealthy';
      } else if (latency > 500 || health.hitRate < 0.5) {
        status = 'degraded';
      }

      return {
        status,
        latency,
        hit_rate: health.hitRate || 0,
        memory_usage: health.memoryUsage || 0,
        connections: health.connections || 0
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        latency: 0,
        hit_rate: 0,
        memory_usage: 0,
        connections: 0
      };
    }
  }

  private async checkTrendingAnalysisHealth(): Promise<ServiceHealth['trending_analysis']> {
    try {
      const startTime = Date.now();
      
      // Test trending service
      await trendingAnalysisService.getTrendingCombinations(1);
      
      const processingTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (processingTime > 5000) {
        status = 'unhealthy';
      } else if (processingTime > 2000) {
        status = 'degraded';
      }

      return {
        status,
        last_update: new Date().toISOString(),
        data_freshness: 5, // 5 minutes - mock data
        processing_time: processingTime
      };
    } catch (error) {
      logger.error('Trending analysis health check failed:', error);
      return {
        status: 'unhealthy',
        last_update: new Date().toISOString(),
        data_freshness: 0,
        processing_time: 0
      };
    }
  }

  private async checkKnowledgeBankHealth(): Promise<ServiceHealth['knowledge_bank']> {
    // Mock implementation - in production, check actual knowledge bank service
    return {
      status: 'healthy',
      data_loaded: true,
      last_refresh: new Date().toISOString(),
      total_records: 15847
    };
  }

  private determineOverallHealth(
    system: SystemMetrics,
    services: ServiceHealth,
    performance: PerformanceMetrics
  ): HealthStatus {
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check system metrics
    if (system.memory.usage_percentage > 90 || system.cpu.usage > 90) {
      status = 'unhealthy';
    } else if (system.memory.usage_percentage > 80 || system.cpu.usage > 80) {
      status = 'degraded';
    }

    // Check service health
    const serviceStatuses = [
      services.cache.status,
      services.trending_analysis.status,
      services.knowledge_bank.status
    ];

    if (serviceStatuses.includes('unhealthy')) {
      status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      status = 'degraded';
    }

    // Check performance metrics
    if (performance.api.error_rate > 0.1 || performance.api.average_response_time > 5000) {
      status = 'unhealthy';
    } else if (performance.api.error_rate > 0.05 || performance.api.average_response_time > 2000) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  private calculateApiMetrics(): PerformanceMetrics['api'] {
    let totalRequests = 0;
    let totalTime = 0;
    let totalErrors = 0;
    const endpointStats: Array<{ endpoint: string; average_time: number; request_count: number }> = [];

    for (const [endpoint, stats] of this.metrics.requests.entries()) {
      totalRequests += stats.count;
      totalTime += stats.totalTime;
      totalErrors += stats.errors;
      
      endpointStats.push({
        endpoint,
        average_time: stats.totalTime / stats.count,
        request_count: stats.count
      });
    }

    const requestsPerMinute = this.calculateRequestsPerMinute();
    const averageResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    const slowestEndpoints = endpointStats
      .sort((a, b) => b.average_time - a.average_time)
      .slice(0, 5);

    return {
      requests_per_minute: requestsPerMinute,
      average_response_time: averageResponseTime,
      error_rate: errorRate,
      slowest_endpoints: slowestEndpoints
    };
  }

  private async calculateTrendingMetrics(): Promise<PerformanceMetrics['trending']> {
    // Mock implementation - in production, get actual metrics from trending service
    return {
      cache_hit_rate: 0.85,
      analysis_time: 150,
      predictions_accuracy: 0.78,
      data_points_processed: 25000
    };
  }

  private calculateRequestsPerMinute(): number {
    // Simple implementation - in production, use proper time windowing
    const totalRequests = Array.from(this.metrics.requests.values())
      .reduce((sum, stats) => sum + stats.count, 0);
    
    const uptimeMinutes = process.uptime() / 60;
    return uptimeMinutes > 0 ? totalRequests / uptimeMinutes : 0;
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const usage = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(usage, 100));
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<{ free: number; total: number; usage_percentage: number }> {
    // Mock implementation - in production, use proper disk usage library
    const total = 100 * 1024 * 1024 * 1024; // 100GB
    const free = 60 * 1024 * 1024 * 1024;   // 60GB free
    const used = total - free;
    const usage_percentage = (used / total) * 100;

    return {
      free,
      total,
      usage_percentage
    };
  }

  private checkSystemAlerts(metrics: SystemMetrics): void {
    // Memory usage alerts
    if (metrics.memory.usage_percentage > 90) {
      this.createAlert(
        'critical',
        'system',
        `Critical memory usage: ${metrics.memory.usage_percentage.toFixed(1)}%`,
        { memory_usage: metrics.memory.usage_percentage }
      );
    } else if (metrics.memory.usage_percentage > 80) {
      this.createAlert(
        'warning',
        'system',
        `High memory usage: ${metrics.memory.usage_percentage.toFixed(1)}%`,
        { memory_usage: metrics.memory.usage_percentage }
      );
    }

    // CPU usage alerts
    if (metrics.cpu.usage > 90) {
      this.createAlert(
        'critical',
        'system',
        `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        { cpu_usage: metrics.cpu.usage }
      );
    } else if (metrics.cpu.usage > 80) {
      this.createAlert(
        'warning',
        'system',
        `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        { cpu_usage: metrics.cpu.usage }
      );
    }

    // Disk usage alerts
    if (metrics.disk.usage_percentage > 90) {
      this.createAlert(
        'critical',
        'system',
        `Critical disk usage: ${metrics.disk.usage_percentage.toFixed(1)}%`,
        { disk_usage: metrics.disk.usage_percentage }
      );
    } else if (metrics.disk.usage_percentage > 80) {
      this.createAlert(
        'warning',
        'system',
        `High disk usage: ${metrics.disk.usage_percentage.toFixed(1)}%`,
        { disk_usage: metrics.disk.usage_percentage }
      );
    }
  }

  private createAlert(
    type: 'critical' | 'warning' | 'info',
    component: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alert: HealthAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      component,
      message,
      timestamp: new Date().toISOString(),
      severity: type === 'critical' ? 1 : type === 'warning' ? 2 : 3,
      resolved: false,
      metadata
    };

    this.alerts.push(alert);

    // Log the alert
    logger.warn(`HEALTH ALERT [${type.toUpperCase()}]: ${message}`, {
      component,
      type,
      metadata,
      alertId: alert.id
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved).slice(-20);
  }

  private startMetricsCollection(): void {
    // Clear old metrics every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      // In production, implement proper time-windowed metrics
      logger.debug('Cleaning old metrics', { metricsCount: this.metrics.requests.size });
    }, 5 * 60 * 1000);
  }

  private startHealthMonitoring(): void {
    // Run health checks every 30 seconds
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        logger.error('Health monitoring error:', error);
      }
    }, 30000);
  }
}

export const systemHealthService = new SystemHealthService();