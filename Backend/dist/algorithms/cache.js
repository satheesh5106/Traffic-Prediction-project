"use strict";
/**
 * Advanced Caching System with Hash Tables and LRU Eviction
 * Optimized for high-performance traffic data caching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trafficDataCache = exports.TrafficDataCache = exports.MultiLevelCache = exports.LRUCache = void 0;
const logger_1 = require("../utils/logger");
/**
 * Doubly Linked List Node for LRU implementation
 */
class LRUNode {
    constructor(key, value, ttl) {
        this.prev = null;
        this.next = null;
        this.key = key;
        this.value = value;
        this.timestamp = Date.now();
        this.ttl = ttl;
    }
    isExpired() {
        if (!this.ttl)
            return false;
        return Date.now() - this.timestamp > this.ttl;
    }
}
/**
 * High-Performance LRU Cache with Hash Table
 */
class LRUCache {
    constructor(capacity = 1000) {
        this.capacity = capacity;
        this.cache = new Map();
        // Create dummy head and tail nodes
        this.head = new LRUNode('head', null);
        this.tail = new LRUNode('tail', null);
        this.head.next = this.tail;
        this.tail.prev = this.head;
        this.stats = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            size: 0,
            maxSize: capacity,
            evictions: 0
        };
    }
    /**
     * Get value from cache
     */
    get(key) {
        const node = this.cache.get(key);
        if (!node) {
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
        // Check if expired
        if (node.isExpired()) {
            this.delete(key);
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
        // Move to head (most recently used)
        this.moveToHead(node);
        this.stats.hits++;
        this.updateHitRate();
        return node.value;
    }
    /**
     * Set value in cache
     */
    set(key, value, ttl) {
        const existingNode = this.cache.get(key);
        if (existingNode) {
            // Update existing node
            existingNode.value = value;
            existingNode.timestamp = Date.now();
            existingNode.ttl = ttl;
            this.moveToHead(existingNode);
            return;
        }
        // Create new node
        const newNode = new LRUNode(key, value, ttl);
        if (this.cache.size >= this.capacity) {
            // Remove least recently used
            this.removeTail();
        }
        this.cache.set(key, newNode);
        this.addToHead(newNode);
        this.stats.size = this.cache.size;
    }
    /**
     * Delete key from cache
     */
    delete(key) {
        const node = this.cache.get(key);
        if (!node)
            return false;
        this.removeNode(node);
        this.cache.delete(key);
        this.stats.size = this.cache.size;
        return true;
    }
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        const node = this.cache.get(key);
        if (!node)
            return false;
        if (node.isExpired()) {
            this.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
        this.head.next = this.tail;
        this.tail.prev = this.head;
        this.stats.size = 0;
    }
    /**
     * Get all keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Clean expired entries
     */
    cleanExpired() {
        let cleaned = 0;
        const keysToDelete = [];
        for (const [key, node] of this.cache) {
            if (node.isExpired()) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => {
            this.delete(key);
            cleaned++;
        });
        return cleaned;
    }
    // Private helper methods
    addToHead(node) {
        node.prev = this.head;
        node.next = this.head.next;
        if (this.head.next) {
            this.head.next.prev = node;
        }
        this.head.next = node;
    }
    removeNode(node) {
        if (node.prev) {
            node.prev.next = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
    }
    moveToHead(node) {
        this.removeNode(node);
        this.addToHead(node);
    }
    removeTail() {
        const lastNode = this.tail.prev;
        if (lastNode && lastNode !== this.head) {
            this.removeNode(lastNode);
            this.cache.delete(lastNode.key);
            this.stats.evictions++;
        }
    }
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }
}
exports.LRUCache = LRUCache;
/**
 * Multi-Level Cache System
 */
class MultiLevelCache {
    constructor(l1Size = 100, l2Size = 1000, cleanupIntervalMs = 60000) {
        this.l1Cache = new LRUCache(l1Size);
        this.l2Cache = new LRUCache(l2Size);
        this.l3Cache = new Map();
        // Periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, cleanupIntervalMs);
        logger_1.logger.info('TrafficAI: Multi-level cache system initialized');
    }
    /**
     * Get value from multi-level cache
     */
    get(key) {
        // Try L1 cache first
        let value = this.l1Cache.get(key);
        if (value !== null) {
            return value;
        }
        // Try L2 cache
        value = this.l2Cache.get(key);
        if (value !== null) {
            // Promote to L1
            this.l1Cache.set(key, value);
            return value;
        }
        // Try L3 cache
        value = this.l3Cache.get(key);
        if (value !== undefined) {
            // Promote to L2 and L1
            this.l2Cache.set(key, value);
            this.l1Cache.set(key, value);
            return value;
        }
        return null;
    }
    /**
     * Set value in multi-level cache
     */
    set(key, value, ttl) {
        this.l1Cache.set(key, value, ttl);
        this.l2Cache.set(key, value, ttl);
        this.l3Cache.set(key, value);
    }
    /**
     * Delete from all cache levels
     */
    delete(key) {
        this.l1Cache.delete(key);
        this.l2Cache.delete(key);
        this.l3Cache.delete(key);
    }
    /**
     * Check if key exists in any cache level
     */
    has(key) {
        return this.l1Cache.has(key) ||
            this.l2Cache.has(key) ||
            this.l3Cache.has(key);
    }
    /**
     * Get comprehensive cache statistics
     */
    getStats() {
        return {
            l1: this.l1Cache.getStats(),
            l2: this.l2Cache.getStats(),
            l3: { size: this.l3Cache.size }
        };
    }
    /**
     * Cleanup expired entries
     */
    cleanup() {
        const l1Cleaned = this.l1Cache.cleanExpired();
        const l2Cleaned = this.l2Cache.cleanExpired();
        if (l1Cleaned > 0 || l2Cleaned > 0) {
            logger_1.logger.debug(`TrafficAI: Cache cleanup - L1: ${l1Cleaned}, L2: ${l2Cleaned} entries removed`);
        }
    }
    /**
     * Clear all cache levels
     */
    clear() {
        this.l1Cache.clear();
        this.l2Cache.clear();
        this.l3Cache.clear();
    }
    /**
     * Destroy cache system
     */
    destroy() {
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}
exports.MultiLevelCache = MultiLevelCache;
/**
 * Specialized Traffic Data Cache
 */
class TrafficDataCache {
    constructor() {
        this.routeCache = new LRUCache(500);
        this.predictionCache = new LRUCache(1000);
        this.incidentCache = new LRUCache(200);
        this.statsCache = new LRUCache(100);
    }
    // Route caching
    getRoute(key) {
        return this.routeCache.get(key);
    }
    setRoute(key, route, ttl = 300000) {
        this.routeCache.set(key, route, ttl);
    }
    // Prediction caching
    getPrediction(key) {
        return this.predictionCache.get(key);
    }
    setPrediction(key, prediction, ttl = 60000) {
        this.predictionCache.set(key, prediction, ttl);
    }
    // Incident caching
    getIncident(key) {
        return this.incidentCache.get(key);
    }
    setIncident(key, incident, ttl = 30000) {
        this.incidentCache.set(key, incident, ttl);
    }
    // Stats caching
    getStats(key) {
        return this.statsCache.get(key);
    }
    setStats(key, stats, ttl = 120000) {
        this.statsCache.set(key, stats, ttl);
    }
    /**
     * Get comprehensive cache statistics
     */
    getAllStats() {
        return {
            routes: this.routeCache.getStats(),
            predictions: this.predictionCache.getStats(),
            incidents: this.incidentCache.getStats(),
            stats: this.statsCache.getStats()
        };
    }
    /**
     * Clear all caches
     */
    clearAll() {
        this.routeCache.clear();
        this.predictionCache.clear();
        this.incidentCache.clear();
        this.statsCache.clear();
    }
}
exports.TrafficDataCache = TrafficDataCache;
// Export singleton instance
exports.trafficDataCache = new TrafficDataCache();
//# sourceMappingURL=cache.js.map