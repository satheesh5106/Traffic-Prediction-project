/**
 * Cache Utility
 * 
 * Implements a high-performance LRU cache with TTL support.
 * Used for caching route calculations and API responses.
 */

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number; // Time-to-live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

interface CacheEntry<T> {
  value: T;
  expiry: number | null; // Timestamp when entry expires, null for no expiry
  lastAccessed: number; // Timestamp when entry was last accessed
}

export class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number | null;
  private hits: number = 0;
  private misses: number = 0;
  
  /**
   * Create a new cache
   * @param options Cache configuration options
   */
  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || null;
  }
  
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time-to-live in milliseconds, overrides defaultTTL
   */
  public set<T>(key: string, value: T, ttl?: number): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    // Calculate expiry time
    const now = Date.now();
    const expiry = ttl ? now + ttl : 
                  this.defaultTTL ? now + this.defaultTTL : 
                  null;
    
    // Store entry
    this.cache.set(key, {
      value,
      expiry,
      lastAccessed: now
    });
  }
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    // Check if entry exists
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    // Check if entry has expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    
    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.hits++;
    
    return entry.value as T;
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * @param key Cache key
   * @returns True if key exists and is not expired
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a key from the cache
   * @param key Cache key
   * @returns True if key was deleted
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all entries from the cache
   */
  public clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get the number of entries in the cache
   */
  public size(): number {
    return this.cache.size;
  }
  
  /**
   * Get cache hit rate
   * @returns Hit rate as a percentage (0-100)
   */
  public getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return (this.hits / total) * 100;
  }
  
  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
  
  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Evict expired entries
   * @returns Number of entries evicted
   */
  public evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    return evicted;
  }
  
  /**
   * Evict the oldest entry based on last access time
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Export singleton instance
export const cache = new Cache({
  maxSize: 10000,
  defaultTTL: 5 * 60 * 1000 // 5 minutes
});