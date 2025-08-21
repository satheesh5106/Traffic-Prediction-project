/**
 * KD-Tree Implementation for Spatial Queries
 * Optimizes nearest neighbor searches and range queries for geographic data
 */

import { logger } from '../utils/logger';

export interface Point {
  id: string;
  lat: number;
  lng: number;
  data?: any;
}

export interface KDNode {
  point: Point;
  left: KDNode | null;
  right: KDNode | null;
  axis: number; // 0 for latitude, 1 for longitude
}

export interface NearestResult {
  point: Point;
  distance: number;
}

export interface RangeQueryResult {
  points: Point[];
  count: number;
}

/**
 * KD-Tree for efficient 2D spatial queries
 */
export class KDTree {
  private root: KDNode | null = null;
  private dimensions = 2; // lat, lng
  private nodeCount = 0;

  constructor(points?: Point[]) {
    if (points && points.length > 0) {
      this.buildTree(points);
    }
    logger.info('TrafficAI: Spatial index initialized');
  }

  /**
   * Build KD-tree from array of points
   */
  buildTree(points: Point[]): void {
    this.root = this.buildNode(points, 0);
    this.nodeCount = points.length;
    logger.info(`TrafficAI: KD-tree built with ${this.nodeCount} points`);
  }

  /**
   * Recursively build KD-tree nodes
   */
  private buildNode(points: Point[], depth: number): KDNode | null {
    if (points.length === 0) return null;

    const axis = depth % this.dimensions;
    
    // Sort points by current axis
    points.sort((a, b) => {
      const aVal = axis === 0 ? a.lat : a.lng;
      const bVal = axis === 0 ? b.lat : b.lng;
      return aVal - bVal;
    });

    const medianIndex = Math.floor(points.length / 2);
    const medianPoint = points[medianIndex];

    const node: KDNode = {
      point: medianPoint,
      axis,
      left: this.buildNode(points.slice(0, medianIndex), depth + 1),
      right: this.buildNode(points.slice(medianIndex + 1), depth + 1)
    };

    return node;
  }

  /**
   * Insert a new point into the tree
   */
  insert(point: Point): void {
    this.root = this.insertNode(this.root, point, 0);
    this.nodeCount++;
  }

  private insertNode(node: KDNode | null, point: Point, depth: number): KDNode {
    if (!node) {
      return {
        point,
        axis: depth % this.dimensions,
        left: null,
        right: null
      };
    }

    const axis = depth % this.dimensions;
    const nodeVal = axis === 0 ? node.point.lat : node.point.lng;
    const pointVal = axis === 0 ? point.lat : point.lng;

    if (pointVal < nodeVal) {
      node.left = this.insertNode(node.left, point, depth + 1);
    } else {
      node.right = this.insertNode(node.right, point, depth + 1);
    }

    return node;
  }

  /**
   * Find nearest neighbor to given coordinates
   */
  findNearest(lat: number, lng: number): NearestResult | null {
    if (!this.root) return null;

    const target = { id: 'target', lat, lng };
    let best: NearestResult | null = null;

    this.searchNearest(this.root, target, best);
    return best;
  }

  private searchNearest(node: KDNode | null, target: Point, best: NearestResult | null): NearestResult | null {
    if (!node) return best;

    const distance = this.euclideanDistance(node.point, target);
    
    if (!best || distance < best.distance) {
      best = { point: node.point, distance };
    }

    const axis = node.axis;
    const nodeVal = axis === 0 ? node.point.lat : node.point.lng;
    const targetVal = axis === 0 ? target.lat : target.lng;
    
    const diff = targetVal - nodeVal;
    const primarySide = diff < 0 ? node.left : node.right;
    const secondarySide = diff < 0 ? node.right : node.left;

    // Search primary side first
    best = this.searchNearest(primarySide, target, best);

    // Check if we need to search secondary side
    if (!best || Math.abs(diff) < best.distance) {
      best = this.searchNearest(secondarySide, target, best);
    }

    return best;
  }

  /**
   * Find k nearest neighbors
   */
  findKNearest(lat: number, lng: number, k: number): NearestResult[] {
    if (!this.root || k <= 0) return [];

    const target = { id: 'target', lat, lng };
    const results: NearestResult[] = [];

    this.searchKNearest(this.root, target, k, results);
    
    return results.sort((a, b) => a.distance - b.distance).slice(0, k);
  }

  private searchKNearest(node: KDNode | null, target: Point, k: number, results: NearestResult[]): void {
    if (!node) return;

    const distance = this.euclideanDistance(node.point, target);
    
    if (results.length < k) {
      results.push({ point: node.point, distance });
      results.sort((a, b) => a.distance - b.distance);
    } else if (distance < results[results.length - 1].distance) {
      results[results.length - 1] = { point: node.point, distance };
      results.sort((a, b) => a.distance - b.distance);
    }

    const axis = node.axis;
    const nodeVal = axis === 0 ? node.point.lat : node.point.lng;
    const targetVal = axis === 0 ? target.lat : target.lng;
    
    const diff = targetVal - nodeVal;
    const primarySide = diff < 0 ? node.left : node.right;
    const secondarySide = diff < 0 ? node.right : node.left;

    this.searchKNearest(primarySide, target, k, results);

    if (results.length < k || Math.abs(diff) < results[results.length - 1].distance) {
      this.searchKNearest(secondarySide, target, k, results);
    }
  }

  /**
   * Range query - find all points within a rectangular area
   */
  rangeQuery(minLat: number, maxLat: number, minLng: number, maxLng: number): RangeQueryResult {
    const points: Point[] = [];
    
    if (this.root) {
      this.searchRange(this.root, minLat, maxLat, minLng, maxLng, points);
    }

    return {
      points,
      count: points.length
    };
  }

  private searchRange(
    node: KDNode | null,
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    results: Point[]
  ): void {
    if (!node) return;

    const { lat, lng } = node.point;
    
    // Check if point is within range
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      results.push(node.point);
    }

    const axis = node.axis;
    const nodeVal = axis === 0 ? lat : lng;
    const minVal = axis === 0 ? minLat : minLng;
    const maxVal = axis === 0 ? maxLat : maxLng;

    // Recursively search relevant subtrees
    if (minVal <= nodeVal && node.left) {
      this.searchRange(node.left, minLat, maxLat, minLng, maxLng, results);
    }
    
    if (maxVal >= nodeVal && node.right) {
      this.searchRange(node.right, minLat, maxLat, minLng, maxLng, results);
    }
  }

  /**
   * Radius query - find all points within a circular area
   */
  radiusQuery(centerLat: number, centerLng: number, radiusKm: number): RangeQueryResult {
    const points: Point[] = [];
    
    if (this.root) {
      const center = { id: 'center', lat: centerLat, lng: centerLng };
      this.searchRadius(this.root, center, radiusKm, points);
    }

    return {
      points,
      count: points.length
    };
  }

  private searchRadius(node: KDNode | null, center: Point, radiusKm: number, results: Point[]): void {
    if (!node) return;

    const distance = this.haversineDistance(node.point, center);
    
    if (distance <= radiusKm) {
      results.push(node.point);
    }

    const axis = node.axis;
    const nodeVal = axis === 0 ? node.point.lat : node.point.lng;
    const centerVal = axis === 0 ? center.lat : center.lng;
    
    // Convert radius to approximate degrees for pruning
    const radiusDegrees = radiusKm / 111.32; // Rough conversion
    
    if (centerVal - radiusDegrees <= nodeVal && node.left) {
      this.searchRadius(node.left, center, radiusKm, results);
    }
    
    if (centerVal + radiusDegrees >= nodeVal && node.right) {
      this.searchRadius(node.right, center, radiusKm, results);
    }
  }

  /**
   * Calculate Euclidean distance between two points (for tree operations)
   */
  private euclideanDistance(p1: Point, p2: Point): number {
    const dLat = p1.lat - p2.lat;
    const dLng = p1.lng - p2.lng;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }

  /**
   * Calculate Haversine distance between two points (for geographic accuracy)
   */
  private haversineDistance(p1: Point, p2: Point): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(p2.lat - p1.lat);
    const dLng = this.toRadians(p2.lng - p1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(p1.lat)) * Math.cos(this.toRadians(p2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get tree statistics
   */
  getStats(): { nodeCount: number; height: number } {
    return {
      nodeCount: this.nodeCount,
      height: this.calculateHeight(this.root)
    };
  }

  private calculateHeight(node: KDNode | null): number {
    if (!node) return 0;
    
    const leftHeight = this.calculateHeight(node.left);
    const rightHeight = this.calculateHeight(node.right);
    
    return 1 + Math.max(leftHeight, rightHeight);
  }

  /**
   * Clear the tree
   */
  clear(): void {
    this.root = null;
    this.nodeCount = 0;
  }
}

/**
 * Spatial Index Manager for traffic and route data
 */
export class SpatialIndex {
  private trafficPoints: KDTree;
  private routeNodes: KDTree;
  private incidents: KDTree;

  constructor() {
    this.trafficPoints = new KDTree();
    this.routeNodes = new KDTree();
    this.incidents = new KDTree();
  }

  /**
   * Add traffic monitoring point
   */
  addTrafficPoint(id: string, lat: number, lng: number, data: any): void {
    this.trafficPoints.insert({ id, lat, lng, data });
  }

  /**
   * Add route node
   */
  addRouteNode(id: string, lat: number, lng: number, data: any): void {
    this.routeNodes.insert({ id, lat, lng, data });
  }

  /**
   * Add traffic incident
   */
  addIncident(id: string, lat: number, lng: number, data: any): void {
    this.incidents.insert({ id, lat, lng, data });
  }

  /**
   * Find nearest traffic monitoring points
   */
  findNearestTrafficPoints(lat: number, lng: number, count: number = 5): NearestResult[] {
    return this.trafficPoints.findKNearest(lat, lng, count);
  }

  /**
   * Find nearest route nodes
   */
  findNearestRouteNodes(lat: number, lng: number, count: number = 3): NearestResult[] {
    return this.routeNodes.findKNearest(lat, lng, count);
  }

  /**
   * Find incidents within radius
   */
  findIncidentsInRadius(lat: number, lng: number, radiusKm: number): RangeQueryResult {
    return this.incidents.radiusQuery(lat, lng, radiusKm);
  }

  /**
   * Find traffic points in area
   */
  findTrafficInArea(minLat: number, maxLat: number, minLng: number, maxLng: number): RangeQueryResult {
    return this.trafficPoints.rangeQuery(minLat, maxLat, minLng, maxLng);
  }
}