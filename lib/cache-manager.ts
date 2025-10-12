/**
 * Cache Management Utilities for Vercel Deployment
 * Prevents cache-related errors and optimizes performance
 */

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size in bytes
  strategy?: 'lru' | 'fifo' | 'ttl';
  compress?: boolean;
  namespace?: string;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
}

/**
 * In-memory cache with LRU eviction and size limits
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private config: Required<CacheConfig>;
  private stats = { hits: 0, misses: 0 };
  private accessCounter = 0;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 300, // 5 minutes default
      maxSize: config.maxSize || 10 * 1024 * 1024, // 10MB default
      strategy: config.strategy || 'lru',
      compress: config.compress || false,
      namespace: config.namespace || 'default'
    };
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | null {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(fullKey, ++this.accessCounter);
    entry.hits++;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set<T = any>(key: string, value: T, ttl?: number): boolean {
    try {
      const fullKey = this.getFullKey(key);
      const size = this.calculateSize(value);
      const entryTtl = ttl || this.config.ttl;

      // Check if single entry exceeds max size
      if (size > this.config.maxSize) {
        console.warn(`Cache entry too large: ${size} bytes exceeds ${this.config.maxSize} bytes`);
        return false;
      }

      // Ensure we have space
      this.ensureSpace(size);

      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: entryTtl,
        size,
        hits: 0
      };

      this.cache.set(fullKey, entry);
      this.accessOrder.set(fullKey, ++this.accessCounter);

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const fullKey = this.getFullKey(key);
    const deleted = this.cache.delete(fullKey);
    this.accessOrder.delete(fullKey);
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);
    
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = { hits: 0, misses: 0 };
    this.accessCounter = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: totalSize,
      entries: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  private getFullKey(key: string): string {
    return `${this.config.namespace}:${key}`;
  }

  private isExpired(entry: CacheEntry, now = Date.now()): boolean {
    return (now - entry.timestamp) > (entry.ttl * 1000);
  }

  private calculateSize(value: any): number {
    try {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
      return 1000; // Fallback size estimate
    }
  }

  private ensureSpace(requiredSize: number): void {
    let currentSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    // If we're within limits, no need to evict
    if (currentSize + requiredSize <= this.config.maxSize) {
      return;
    }

    // Clean expired entries first
    this.cleanup();
    
    // Recalculate size after cleanup
    currentSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    // If still over limit, evict based on strategy
    if (currentSize + requiredSize > this.config.maxSize) {
      this.evictEntries(requiredSize);
    }
  }

  private evictEntries(requiredSize: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access order (LRU)
    entries.sort(([keyA], [keyB]) => {
      const accessA = this.accessOrder.get(keyA) || 0;
      const accessB = this.accessOrder.get(keyB) || 0;
      return accessA - accessB;
    });

    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      freedSize += entry.size;
      
      if (freedSize >= requiredSize) {
        break;
      }
    }
  }
}

/**
 * HTTP Response Cache Headers Manager
 */
export class ResponseCacheManager {
  /**
   * Set cache headers for static content
   */
  static setStaticCache(res: any, maxAge = 31536000): void { // 1 year default
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
    res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
  }

  /**
   * Set cache headers for dynamic content
   */
  static setDynamicCache(res: any, maxAge = 300, staleWhileRevalidate = 60): void {
    res.setHeader('Cache-Control', 
      `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
  }

  /**
   * Set no-cache headers
   */
  static setNoCache(res: any): void {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  /**
   * Set ETag for conditional requests
   */
  static setETag(res: any, data: any): string {
    const etag = this.generateETag(data);
    res.setHeader('ETag', etag);
    return etag;
  }

  /**
   * Check if content is modified based on ETag
   */
  static isNotModified(req: any, etag: string): boolean {
    const ifNoneMatch = req.headers['if-none-match'];
    return ifNoneMatch === etag;
  }

  private static generateETag(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    // Simple hash function for ETag
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }
}

/**
 * Cache middleware for API routes
 */
export function withCache(config: CacheConfig & { 
  keyGenerator?: (req: any) => string;
  shouldCache?: (req: any, res: any) => boolean;
} = {}) {
  const cache = new MemoryCache(config);
  
  return function cacheMiddleware(handler: Function) {
    return async (req: any, res: any) => {
      try {
        // Generate cache key
        const cacheKey = config.keyGenerator 
          ? config.keyGenerator(req)
          : `${req.method}:${req.url}:${JSON.stringify(req.query)}`;

        // Check if we should cache this request
        const shouldCache = config.shouldCache 
          ? config.shouldCache(req, res)
          : req.method === 'GET';

        if (!shouldCache) {
          return await handler(req, res);
        }

        // Try to get from cache
        const cached = cache.get(cacheKey);
        if (cached) {
          // Set cache headers
          ResponseCacheManager.setDynamicCache(res);
          res.setHeader('X-Cache', 'HIT');
          
          // Check ETag
          const etag = ResponseCacheManager.setETag(res, cached);
          if (ResponseCacheManager.isNotModified(req, etag)) {
            return res.status(304).end();
          }
          
          return res.json(cached);
        }

        // Execute handler and capture response
        let responseData: any;
        const originalJson = res.json;
        
        res.json = function(data: any) {
          responseData = data;
          
          // Cache the response
          if (res.statusCode === 200) {
            cache.set(cacheKey, data, config.ttl);
            res.setHeader('X-Cache', 'MISS');
          }
          
          // Set cache headers
          ResponseCacheManager.setDynamicCache(res);
          ResponseCacheManager.setETag(res, data);
          
          return originalJson.call(this, data);
        };

        return await handler(req, res);
        
      } catch (error) {
        console.error('Cache middleware error:', error);
        return await handler(req, res);
      }
    };
  };
}

/**
 * Global cache instances
 */
export const globalCache = new MemoryCache({
  ttl: 300, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  namespace: 'global'
});

export const apiCache = new MemoryCache({
  ttl: 60, // 1 minute
  maxSize: 10 * 1024 * 1024, // 10MB
  namespace: 'api'
});

/**
 * Cache cleanup scheduler
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startCacheCleanup(intervalMs = 60000): void { // 1 minute default
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  cleanupInterval = setInterval(() => {
    try {
      const globalCleaned = globalCache.cleanup();
      const apiCleaned = apiCache.cleanup();
      
      if (globalCleaned > 0 || apiCleaned > 0) {
        console.log(`Cache cleanup: removed ${globalCleaned + apiCleaned} expired entries`);
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }, intervalMs);
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Auto-start cleanup in production
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  startCacheCleanup();
}