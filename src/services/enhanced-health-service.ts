/**
 * Enhanced Health Check Service
 * Provides comprehensive health checks with readiness/liveness probes
 * Compatible with Kubernetes, Railway, and other orchestration platforms
 */

import { healthMonitor } from './health-monitor';
import { cacheService } from './cache-service';
import { performanceMonitor } from '../middleware/performance';
import RedisConnection from '../config/redis';
import * as fs from 'fs';
import * as path from 'path';

export interface HealthCheckResponse {
  status: 'pass' | 'fail' | 'warn';
  version: string;
  releaseId?: string;
  notes?: string[];
  output?: string;
  serviceId?: string;
  description?: string;
  checks?: { [key: string]: HealthCheck };
  links?: { [key: string]: string };
  details?: ComponentDetails;
}

export interface HealthCheck {
  componentId?: string;
  componentType?: string;
  observedValue?: any;
  observedUnit?: string;
  status: 'pass' | 'fail' | 'warn';
  affectsServiceHealth?: boolean;
  time?: string;
  output?: string;
  links?: { [key: string]: string };
}

export interface ComponentDetails {
  uptime: number;
  startTime: string;
  environment: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  memory: MemoryDetails;
  cpu: CPUDetails;
  dependencies: DependencyStatus;
}

export interface MemoryDetails {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  heapLimit: number;
  usage: number; // percentage
}

export interface CPUDetails {
  model: string;
  cores: number;
  usage: number;
}

export interface DependencyStatus {
  redis: DependencyHealth;
  dataLoader: DependencyHealth;
  cache: DependencyHealth;
}

export interface DependencyHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  metadata?: any;
}

export class EnhancedHealthService {
  private startTime: Date;
  private appVersion: string;
  private servicesReady = false;

  constructor() {
    this.startTime = new Date();
    this.appVersion = this.getAppVersion();
  }

  /**
   * Mark services as ready (called after initialization)
   */
  setServicesReady(ready: boolean): void {
    this.servicesReady = ready;
  }

  /**
   * Comprehensive health check (for monitoring dashboards)
   */
  async getComprehensiveHealth(): Promise<HealthCheckResponse> {
    const [
      redisHealth,
      cacheHealth,
      dataLoaderHealth,
      memoryDetails,
      cpuDetails
    ] = await Promise.all([
      this.checkRedis(),
      this.checkCache(),
      this.checkDataLoader(),
      this.getMemoryDetails(),
      this.getCPUDetails()
    ]);

    const systemHealth = await healthMonitor.getSystemHealth();
    const performanceMetrics = performanceMonitor.getMetrics();

    // Determine overall status
    const criticalServices = [redisHealth, dataLoaderHealth];
    const hasCriticalFailure = criticalServices.some(s => s.status === 'unhealthy');
    const hasDegradation = criticalServices.some(s => s.status === 'degraded') ||
                           systemHealth.status === 'degraded';

    let status: 'pass' | 'fail' | 'warn' = 'pass';
    if (hasCriticalFailure) {
      status = 'fail';
    } else if (hasDegradation) {
      status = 'warn';
    }

    const checks: { [key: string]: HealthCheck } = {
      'redis:connection': {
        componentId: 'redis',
        componentType: 'datastore',
        status: this.mapHealthStatus(redisHealth.status),
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        output: redisHealth.message,
        observedValue: redisHealth.responseTime,
        observedUnit: 'ms'
      },
      'cache:performance': {
        componentId: 'cache',
        componentType: 'system',
        status: this.mapHealthStatus(cacheHealth.status),
        affectsServiceHealth: false,
        time: new Date().toISOString(),
        output: cacheHealth.message,
        observedValue: cacheHealth.metadata?.hitRate,
        observedUnit: 'percentage'
      },
      'data:loader': {
        componentId: 'dataLoader',
        componentType: 'component',
        status: this.mapHealthStatus(dataLoaderHealth.status),
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        output: dataLoaderHealth.message
      },
      'memory:usage': {
        componentId: 'system',
        componentType: 'system',
        status: memoryDetails.usage > 90 ? 'warn' : 'pass',
        affectsServiceHealth: false,
        time: new Date().toISOString(),
        observedValue: memoryDetails.usage,
        observedUnit: 'percent',
        output: `Heap: ${memoryDetails.heapUsed}MB / ${memoryDetails.heapTotal}MB`
      },
      'performance:responseTime': {
        componentId: 'api',
        componentType: 'system',
        status: performanceMetrics.averageResponseTime > 1000 ? 'warn' : 'pass',
        affectsServiceHealth: false,
        time: new Date().toISOString(),
        observedValue: Math.round(performanceMetrics.averageResponseTime),
        observedUnit: 'ms',
        output: `Average response time: ${Math.round(performanceMetrics.averageResponseTime)}ms`
      }
    };

    const notes: string[] = [];
    if (status === 'warn') {
      notes.push('Some components are experiencing degraded performance');
    }
    if (systemHealth.issues.length > 0) {
      notes.push(`${systemHealth.issues.length} active health issues`);
    }

    return {
      status,
      version: this.appVersion,
      releaseId: process.env.RAILWAY_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA,
      notes: notes.length > 0 ? notes : undefined,
      serviceId: 'kct-knowledge-api',
      description: 'KCT Menswear Fashion Knowledge API',
      checks,
      links: {
        about: '/docs',
        metrics: '/health/metrics',
        performance: '/health/performance'
      },
      details: {
        uptime: Math.round(process.uptime()),
        startTime: this.startTime.toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: memoryDetails,
        cpu: cpuDetails,
        dependencies: {
          redis: redisHealth,
          dataLoader: dataLoaderHealth,
          cache: cacheHealth
        }
      }
    };
  }

  /**
   * Readiness probe - is the service ready to receive traffic?
   */
  async getReadinessProbe(): Promise<HealthCheckResponse> {
    const [redisHealth, dataLoaderHealth] = await Promise.all([
      this.checkRedis(),
      this.checkDataLoader()
    ]);

    // Service is ready if critical dependencies are available and services are initialized
    const isReady = this.servicesReady &&
                    redisHealth.status !== 'unhealthy' &&
                    dataLoaderHealth.status !== 'unhealthy';

    const checks: { [key: string]: HealthCheck } = {
      'services:initialized': {
        componentId: 'initialization',
        componentType: 'system',
        status: this.servicesReady ? 'pass' : 'fail',
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        output: this.servicesReady ? 'All services initialized' : 'Services not ready'
      },
      'redis:connection': {
        componentId: 'redis',
        componentType: 'datastore',
        status: this.mapHealthStatus(redisHealth.status),
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        output: redisHealth.message
      },
      'data:loader': {
        componentId: 'dataLoader',
        componentType: 'component',
        status: this.mapHealthStatus(dataLoaderHealth.status),
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        output: dataLoaderHealth.message
      }
    };

    return {
      status: isReady ? 'pass' : 'fail',
      version: this.appVersion,
      checks,
      description: 'Readiness probe - ready to accept traffic'
    };
  }

  /**
   * Liveness probe - is the service alive and running?
   */
  async getLivenessProbe(): Promise<HealthCheckResponse> {
    // Liveness is simple - can we respond to requests?
    // Check basic process health
    const memUsage = process.memoryUsage();
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Service is alive if it can respond and hasn't exhausted memory
    const isAlive = heapUsagePercent < 98; // Critical threshold

    const checks: { [key: string]: HealthCheck } = {
      'process:responsive': {
        componentId: 'process',
        componentType: 'system',
        status: 'pass',
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        output: 'Process is responsive'
      },
      'memory:available': {
        componentId: 'memory',
        componentType: 'system',
        status: heapUsagePercent < 98 ? 'pass' : 'fail',
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        observedValue: Math.round(heapUsagePercent),
        observedUnit: 'percent',
        output: `Heap usage: ${Math.round(heapUsagePercent)}%`
      }
    };

    return {
      status: isAlive ? 'pass' : 'fail',
      version: this.appVersion,
      checks,
      description: 'Liveness probe - service is alive'
    };
  }

  /**
   * Startup probe - has the service completed startup?
   */
  async getStartupProbe(): Promise<HealthCheckResponse> {
    // Similar to readiness but more lenient during startup
    const uptimeSeconds = process.uptime();
    const isStarting = uptimeSeconds < 60; // First minute is startup

    const checks: { [key: string]: HealthCheck } = {
      'startup:complete': {
        componentId: 'startup',
        componentType: 'system',
        status: this.servicesReady ? 'pass' : (isStarting ? 'warn' : 'fail'),
        affectsServiceHealth: true,
        time: new Date().toISOString(),
        observedValue: Math.round(uptimeSeconds),
        observedUnit: 'seconds',
        output: this.servicesReady
          ? 'Startup complete'
          : `Starting up (${Math.round(uptimeSeconds)}s)`
      }
    };

    return {
      status: this.servicesReady ? 'pass' : (isStarting ? 'warn' : 'fail'),
      version: this.appVersion,
      checks,
      description: 'Startup probe - startup sequence status'
    };
  }

  // Private helper methods

  private async checkRedis(): Promise<DependencyHealth> {
    const startTime = Date.now();
    try {
      const connected = await RedisConnection.ping();
      const responseTime = Date.now() - startTime;

      if (!connected) {
        return {
          status: 'unhealthy',
          responseTime,
          message: 'Redis connection failed'
        };
      }

      if (responseTime > 500) {
        return {
          status: 'degraded',
          responseTime,
          message: `Slow response (${responseTime}ms)`
        };
      }

      return {
        status: 'healthy',
        responseTime,
        message: 'Connected and responsive'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Connection error'
      };
    }
  }

  private async checkCache(): Promise<DependencyHealth> {
    try {
      const metrics = cacheService.getMetrics();
      const hitRate = metrics.hits + metrics.misses > 0
        ? metrics.hits / (metrics.hits + metrics.misses)
        : 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (hitRate < 0.3) {
        status = 'degraded';
      }

      return {
        status,
        message: `Hit rate: ${Math.round(hitRate * 100)}%`,
        metadata: {
          hitRate: Math.round(hitRate * 100),
          hits: metrics.hits,
          misses: metrics.misses
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Cache error'
      };
    }
  }

  private async checkDataLoader(): Promise<DependencyHealth> {
    const startTime = Date.now();
    try {
      // Try to load the index file to verify data files are accessible
      const dataPath = path.join(__dirname, '../data/core/index.json');

      if (fs.existsSync(dataPath)) {
        const responseTime = Date.now() - startTime;
        return {
          status: 'healthy',
          responseTime,
          message: 'Data files accessible'
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Data files not found'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Data loader error'
      };
    }
  }

  private async getMemoryDetails(): Promise<MemoryDetails> {
    const memUsage = process.memoryUsage();
    const v8 = require('v8');
    const heapStats = v8.getHeapStatistics();

    return {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024),
      heapLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024),
      usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };
  }

  private async getCPUDetails(): Promise<CPUDetails> {
    const os = require('os');
    const cpus = os.cpus();

    // Calculate CPU usage (simplified)
    const usage = await this.calculateCPUUsage();

    return {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      usage: Math.round(usage)
    };
  }

  private calculateCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000; // microseconds to milliseconds
        const usage = (totalUsage / 100) * 100; // percentage approximation
        resolve(Math.min(usage, 100));
      }, 100);
    });
  }

  private mapHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): 'pass' | 'fail' | 'warn' {
    switch (status) {
      case 'healthy':
        return 'pass';
      case 'degraded':
        return 'warn';
      case 'unhealthy':
        return 'fail';
    }
  }

  private getAppVersion(): string {
    try {
      const packageJson = require('../../package.json');
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}

// Singleton instance
export const enhancedHealthService = new EnhancedHealthService();
