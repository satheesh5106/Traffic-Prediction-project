/**
 * Advanced Caching System with Hash Tables and LRU Eviction
 * Optimized for high-performance traffic data caching
 */
export interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    accessCount: number;
    lastAccessed: number;
    ttl?: number;
}
export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
    evictions: number;
}
/**
 * High-Performance LRU Cache with Hash Table
 */
export declare class LRUCache<T> {
    private capacity;
    private cache;
    private head;
    private tail;
    private stats;
    constructor(capacity?: number);
    /**
     * Get value from cache
     */
    get(key: string): T | null;
    /**
     * Set value in cache
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Delete key from cache
     */
    delete(key: string): boolean;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get all keys
     */
    keys(): string[];
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Clean expired entries
     */
    cleanExpired(): number;
    private addToHead;
    private removeNode;
    private moveToHead;
    private removeTail;
    private updateHitRate;
}
/**
 * Multi-Level Cache System
 */
export declare class MultiLevelCache {
    private l1Cache;
    private l2Cache;
    private l3Cache;
    private cleanupInterval;
    constructor(l1Size?: number, l2Size?: number, cleanupIntervalMs?: number);
    /**
     * Get value from multi-level cache
     */
    get(key: string): any;
    /**
     * Set value in multi-level cache
     */
    set(key: string, value: any, ttl?: number): void;
    /**
     * Delete from all cache levels
     */
    delete(key: string): void;
    /**
     * Check if key exists in any cache level
     */
    has(key: string): boolean;
    /**
     * Get comprehensive cache statistics
     */
    getStats(): {
        l1: CacheStats;
        l2: CacheStats;
        l3: {
            size: number;
        };
    };
    /**
     * Cleanup expired entries
     */
    cleanup(): void;
    /**
     * Clear all cache levels
     */
    clear(): void;
    /**
     * Destroy cache system
     */
    destroy(): void;
}
/**
 * Specialized Traffic Data Cache
 */
export declare class TrafficDataCache {
    private routeCache;
    private predictionCache;
    private incidentCache;
    private statsCache;
    constructor();
    getRoute(key: string): any;
    setRoute(key: string, route: any, ttl?: number): void;
    getPrediction(key: string): any;
    setPrediction(key: string, prediction: any, ttl?: number): void;
    getIncident(key: string): any;
    setIncident(key: string, incident: any, ttl?: number): void;
    getStats(key: string): any;
    setStats(key: string, stats: any, ttl?: number): void;
    /**
     * Get comprehensive cache statistics
     */
    getAllStats(): {
        routes: CacheStats;
        predictions: CacheStats;
        incidents: CacheStats;
        stats: CacheStats;
    };
    /**
     * Clear all caches
     */
    clearAll(): void;
}
export declare const trafficDataCache: TrafficDataCache;
