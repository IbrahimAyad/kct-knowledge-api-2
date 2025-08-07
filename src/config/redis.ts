/**
 * Redis Configuration
 * Handles Redis connection setup, retry logic, and environment configuration
 */

import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  retryDelayOnClusterDown: number;
  retryDelayOnSlowDown: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

const createRedisConfig = (): RedisConfig | string | null => {
  // If REDIS_URL is provided (Railway format), use it directly
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  // If REDIS_ENABLED is explicitly false, disable Redis
  if (process.env.REDIS_ENABLED === 'false') {
    return null;
  }

  // Otherwise use individual config
  const config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
    retryDelayOnSlowDown: 1000,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };

  return config;
};

export class RedisConnection {
  private static instance: Redis | null = null;
  private static config: RedisConfig | string | null;
  private static isConnected = false;
  private static connectionAttempts = 0;
  private static maxConnectionAttempts = 5;
  private static isDisabled = false;

  static getInstance(): Redis | null {
    if (!this.instance) {
      this.config = createRedisConfig();
      if (this.config === null) {
        console.log('🔌 Redis is disabled (REDIS_ENABLED=false or no configuration)');
        this.isDisabled = true;
        return null;
      }
      this.instance = this.createConnection();
    }
    return this.instance;
  }

  private static createConnection(): Redis {
    const redisOptions = typeof this.config === 'string' 
      ? this.config // Use Redis URL directly
      : {
          ...this.config,
          enableOfflineQueue: false,
        };
    
    console.log('🔌 Attempting to connect to Redis...');
    const redis = new Redis(redisOptions);

    redis.on('connect', () => {
      console.log('🔌 Redis connected successfully');
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    redis.on('ready', () => {
      console.log('✅ Redis ready for operations');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      this.isConnected = false;
      
      this.connectionAttempts++;
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error(`🚨 Redis connection failed after ${this.maxConnectionAttempts} attempts`);
      }
    });

    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });

    redis.on('reconnecting', (ms: number) => {
      console.log(`🔄 Redis reconnecting in ${ms}ms...`);
    });

    return redis;
  }

  static async ping(): Promise<boolean> {
    try {
      const redis = this.getInstance();
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  static isReady(): boolean {
    return this.isConnected && this.instance?.status === 'ready';
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
    }
  }

  static async flushCache(): Promise<void> {
    try {
      const redis = this.getInstance();
      await redis.flushdb();
      console.log('🗑️ Redis cache flushed successfully');
    } catch (error) {
      console.error('Failed to flush Redis cache:', error);
      throw error;
    }
  }

  static getConnectionInfo(): {
    isConnected: boolean;
    host: string;
    port: number;
    db: number;
    status?: string;
  } {
    return {
      isConnected: this.isConnected,
      host: this.config?.host || 'unknown',
      port: this.config?.port || 0,
      db: this.config?.db || 0,
      status: this.instance?.status,
    };
  }
}

export default RedisConnection;