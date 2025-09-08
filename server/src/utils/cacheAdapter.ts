import { logger } from '../app';
import { weatherConfig } from '../config/weather';

// Cache entry interface
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

// Cache adapter interface
export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
  getStats(): Promise<CacheStats>;
}

// Cache statistics
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

// In-memory LRU cache implementation
export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder = new Map<string, number>(); // Track access order for LRU
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  private maxSize: number;
  private defaultTtlMs: number;
  private accessCounter = 0;

  constructor(maxSize: number = 1000, defaultTtlMs: number = 300000) { // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs || this.defaultTtlMs;
    const expiresAt = Date.now() + ttl;
    
    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      createdAt: Date.now()
    };

    // If at max capacity and key doesn't exist, remove LRU item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.sets++;
  }

  async delete(key: string): Promise<void> {
    if (this.cache.delete(key)) {
      this.accessOrder.delete(key);
      this.stats.deletes++;
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }
    
    return true;
  }

  async size(): Promise<number> {
    // Clean up expired entries first
    await this.cleanupExpired();
    return this.cache.size;
  }

  async getStats(): Promise<CacheStats> {
    const size = await this.size();
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      ...this.stats,
      size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }
}

// Redis cache adapter (optional)
export class RedisCacheAdapter implements CacheAdapter {
  private redis: any; // Redis client
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  private defaultTtlMs: number;

  constructor(redisClient: any, defaultTtlMs: number = 300000) {
    this.redis = redisClient;
    this.defaultTtlMs = defaultTtlMs;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key }, 'Redis get error');
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const ttl = ttlMs || this.defaultTtlMs;
      const serialized = JSON.stringify(value);
      
      await this.redis.setex(key, Math.ceil(ttl / 1000), serialized);
      this.stats.sets++;
    } catch (error) {
      logger.error({ error, key }, 'Redis set error');
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const result = await this.redis.del(key);
      if (result > 0) {
        this.stats.deletes++;
      }
    } catch (error) {
      logger.error({ error, key }, 'Redis delete error');
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error({ error }, 'Redis clear error');
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error({ error, key }, 'Redis exists error');
      return false;
    }
  }

  async size(): Promise<number> {
    try {
      return await this.redis.dbsize();
    } catch (error) {
      logger.error({ error }, 'Redis size error');
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    const size = await this.size();
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      ...this.stats,
      size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0
    };
  }
}

// Cache factory function
export function createCacheAdapter(): CacheAdapter {
  // Check if Redis URL is configured
  if (weatherConfig.REDIS_URL) {
    try {
      // Dynamic import of Redis (optional dependency)
      const Redis = require('redis');
      const client = Redis.createClient({ url: weatherConfig.REDIS_URL });
      
      client.on('error', (error: Error) => {
        logger.error({ error }, 'Redis connection error, falling back to memory cache');
      });
      
      client.on('connect', () => {
        logger.info('Redis cache adapter connected');
      });
      
      return new RedisCacheAdapter(client, weatherConfig.WEATHER_CACHE_TTL_MS);
    } catch (error) {
      logger.warn({ error }, 'Redis not available, using memory cache');
    }
  }
  
  // Default to memory cache
  logger.info('Using in-memory cache adapter');
  return new MemoryCacheAdapter(1000, weatherConfig.WEATHER_CACHE_TTL_MS);
}

// Cache key utilities
export const CacheKeys = {
  stations: () => 'weather:stations',
  stationWeather: (stationId: string) => `weather:station:${stationId}`,
  owmWeather: (lat: number, lng: number) => `weather:owm:${lat}:${lng}`,
  alerts: () => 'weather:alerts',
  trafficImpact: (stationId: string) => `weather:traffic:${stationId}`
};

// Export default cache instance
export const cacheAdapter = createCacheAdapter();