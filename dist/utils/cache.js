"use strict";
/**
 * Cache Utility
 *
 * Implements a high-performance LRU cache with TTL support.
 * Used for caching route calculations and API responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.Cache = void 0;
class Cache {
    /**
     * Create a new cache
     * @param options Cache configuration options
     */
    constructor(options = {}) {
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || null;
    }
    /**
     * Set a value in the cache
     * @param key Cache key
     * @param value Value to store
     * @param ttl Time-to-live in milliseconds, overrides defaultTTL
     */
    set(key, value, ttl) {
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
    get(key) {
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
        return entry.value;
    }
    /**
     * Check if a key exists in the cache and is not expired
     * @param key Cache key
     * @returns True if key exists and is not expired
     */
    has(key) {
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
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all entries from the cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get the number of entries in the cache
     */
    size() {
        return this.cache.size;
    }
    /**
     * Get cache hit rate
     * @returns Hit rate as a percentage (0-100)
     */
    getHitRate() {
        const total = this.hits + this.misses;
        if (total === 0)
            return 0;
        return (this.hits / total) * 100;
    }
    /**
     * Get cache statistics
     */
    getStats() {
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
    resetStats() {
        this.hits = 0;
        this.misses = 0;
    }
    /**
     * Evict expired entries
     * @returns Number of entries evicted
     */
    evictExpired() {
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
    evictOldest() {
        let oldestKey = null;
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
exports.Cache = Cache;
// Export singleton instance
exports.cache = new Cache({
    maxSize: 10000,
    defaultTTL: 5 * 60 * 1000 // 5 minutes
});
