/**
 * Advanced Caching System with Hash Tables and LRU Eviction
 * Optimized for high-performance traffic data caching
 */

import { logger } from '../utils/logger';

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
 * Doubly Linked List Node for LRU implementation
 */
class LRUNode<T> {
  key: string;
  value: T;
  prev: LRUNode<T> | null = null;
  next: LRUNode<T> | null = null;
  timestamp: number;
  ttl?: number;

  constructor(key: string, value: T, ttl?: number) {
    this.key = key;
    this.value = value;
    this.timestamp = Date.now();
    this.ttl = ttl;
  }

  isExpired(): boolean {
    if (!this.ttl) return false;
    return Date.now() - this.timestamp > this.ttl;
  }
}

/**
 * High-Performance LRU Cache with Hash Table
 */
export class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, LRUNode<T>>;
  private head: LRUNode<T>;
  private tail: LRUNode<T>;
  private stats: CacheStats;

  constructor(capacity: number = 1000) {
    this.capacity = capacity;
    this.cache = new Map();
    
    // Create dummy head and tail nodes
    this.head = new LRUNode('head', null as any);
    this.tail = new LRUNode('tail', null as any);
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
  get(key: string): T | null {
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
  set(key: string, value: T, ttl?: number): void {
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
  delete(key: string): boolean {
    const node = this.cache.get(key);
    
    if (!node) return false;
    
    this.removeNode(node);
    this.cache.delete(key);
    this.stats.size = this.cache.size;
    
    return true;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const node = this.cache.get(key);
    
    if (!node) return false;
    
    if (node.isExpired()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.stats.size = 0;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let cleaned = 0;
    const keysToDelete: string[] = [];
    
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
  private addToHead(node: LRUNode<T>): void {
    node.prev = this.head;
    node.next = this.head.next;
    
    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  private removeNode(node: LRUNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
  }

  private moveToHead(node: LRUNode<T>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): void {
    const lastNode = this.tail.prev;
    if (lastNode && lastNode !== this.head) {
      this.removeNode(lastNode);
      this.cache.delete(lastNode.key);
      this.stats.evictions++;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Multi-Level Cache System
 */
export class MultiLevelCache {
  private l1Cache: LRUCache<any>; // Fast, small cache
  private l2Cache: LRUCache<any>; // Larger, slower cache
  private l3Cache: Map<string, any>; // Persistent cache
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    l1Size: number = 100,
    l2Size: number = 1000,
    cleanupIntervalMs: number = 60000
  ) {
    this.l1Cache = new LRUCache(l1Size);
    this.l2Cache = new LRUCache(l2Size);
    this.l3Cache = new Map();
    
    // Periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
    
    logger.info('TrafficAI: Multi-level cache system initialized');
  }

  /**
   * Get value from multi-level cache
   */
  get(key: string): any {
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
  set(key: string, value: any, ttl?: number): void {
    this.l1Cache.set(key, value, ttl);
    this.l2Cache.set(key, value, ttl);
    this.l3Cache.set(key, value);
  }

  /**
   * Delete from all cache levels
   */
  delete(key: string): void {
    this.l1Cache.delete(key);
    this.l2Cache.delete(key);
    this.l3Cache.delete(key);
  }

  /**
   * Check if key exists in any cache level
   */
  has(key: string): boolean {
    return this.l1Cache.has(key) || 
           this.l2Cache.has(key) || 
           this.l3Cache.has(key);
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): { l1: CacheStats; l2: CacheStats; l3: { size: number } } {
    return {
      l1: this.l1Cache.getStats(),
      l2: this.l2Cache.getStats(),
      l3: { size: this.l3Cache.size }
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const l1Cleaned = this.l1Cache.cleanExpired();
    const l2Cleaned = this.l2Cache.cleanExpired();
    
    if (l1Cleaned > 0 || l2Cleaned > 0) {
      logger.debug(`TrafficAI: Cache cleanup - L1: ${l1Cleaned}, L2: ${l2Cleaned} entries removed`);
    }
  }

  /**
   * Clear all cache levels
   */
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();
  }

  /**
   * Destroy cache system
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

/**
 * Specialized Traffic Data Cache
 */
export class TrafficDataCache {
  private routeCache: LRUCache<any>;
  private predictionCache: LRUCache<any>;
  private incidentCache: LRUCache<any>;
  private statsCache: LRUCache<any>;

  constructor() {
    this.routeCache = new LRUCache(500);
    this.predictionCache = new LRUCache(1000);
    this.incidentCache = new LRUCache(200);
    this.statsCache = new LRUCache(100);
  }

  // Route caching
  getRoute(key: string): any {
    return this.routeCache.get(key);
  }

  setRoute(key: string, route: any, ttl: number = 300000): void { // 5 minutes
    this.routeCache.set(key, route, ttl);
  }

  // Prediction caching
  getPrediction(key: string): any {
    return this.predictionCache.get(key);
  }

  setPrediction(key: string, prediction: any, ttl: number = 60000): void { // 1 minute
    this.predictionCache.set(key, prediction, ttl);
  }

  // Incident caching
  getIncident(key: string): any {
    return this.incidentCache.get(key);
  }

  setIncident(key: string, incident: any, ttl: number = 30000): void { // 30 seconds
    this.incidentCache.set(key, incident, ttl);
  }

  // Stats caching
  getStats(key: string): any {
    return this.statsCache.get(key);
  }

  setStats(key: string, stats: any, ttl: number = 120000): void { // 2 minutes
    this.statsCache.set(key, stats, ttl);
  }

  /**
   * Get comprehensive cache statistics
   */
  getAllStats(): {
    routes: CacheStats;
    predictions: CacheStats;
    incidents: CacheStats;
    stats: CacheStats;
  } {
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
  clearAll(): void {
    this.routeCache.clear();
    this.predictionCache.clear();
    this.incidentCache.clear();
    this.statsCache.clear();
  }
}

// Export singleton instance
export const trafficDataCache = new TrafficDataCache();