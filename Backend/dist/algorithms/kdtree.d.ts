/**
 * KD-Tree Implementation for Spatial Queries
 * Optimizes nearest neighbor searches and range queries for geographic data
 */
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
    axis: number;
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
export declare class KDTree {
    private root;
    private dimensions;
    private nodeCount;
    constructor(points?: Point[]);
    /**
     * Build KD-tree from array of points
     */
    buildTree(points: Point[]): void;
    /**
     * Recursively build KD-tree nodes
     */
    private buildNode;
    /**
     * Insert a new point into the tree
     */
    insert(point: Point): void;
    private insertNode;
    /**
     * Find nearest neighbor to given coordinates
     */
    findNearest(lat: number, lng: number): NearestResult | null;
    private searchNearest;
    /**
     * Find k nearest neighbors
     */
    findKNearest(lat: number, lng: number, k: number): NearestResult[];
    private searchKNearest;
    /**
     * Range query - find all points within a rectangular area
     */
    rangeQuery(minLat: number, maxLat: number, minLng: number, maxLng: number): RangeQueryResult;
    private searchRange;
    /**
     * Radius query - find all points within a circular area
     */
    radiusQuery(centerLat: number, centerLng: number, radiusKm: number): RangeQueryResult;
    private searchRadius;
    /**
     * Calculate Euclidean distance between two points (for tree operations)
     */
    private euclideanDistance;
    /**
     * Calculate Haversine distance between two points (for geographic accuracy)
     */
    private haversineDistance;
    private toRadians;
    /**
     * Get tree statistics
     */
    getStats(): {
        nodeCount: number;
        height: number;
    };
    private calculateHeight;
    /**
     * Clear the tree
     */
    clear(): void;
}
/**
 * Spatial Index Manager for traffic and route data
 */
export declare class SpatialIndex {
    private trafficPoints;
    private routeNodes;
    private incidents;
    constructor();
    /**
     * Add traffic monitoring point
     */
    addTrafficPoint(id: string, lat: number, lng: number, data: any): void;
    /**
     * Add route node
     */
    addRouteNode(id: string, lat: number, lng: number, data: any): void;
    /**
     * Add traffic incident
     */
    addIncident(id: string, lat: number, lng: number, data: any): void;
    /**
     * Find nearest traffic monitoring points
     */
    findNearestTrafficPoints(lat: number, lng: number, count?: number): NearestResult[];
    /**
     * Find nearest route nodes
     */
    findNearestRouteNodes(lat: number, lng: number, count?: number): NearestResult[];
    /**
     * Find incidents within radius
     */
    findIncidentsInRadius(lat: number, lng: number, radiusKm: number): RangeQueryResult;
    /**
     * Find traffic points in area
     */
    findTrafficInArea(minLat: number, maxLat: number, minLng: number, maxLng: number): RangeQueryResult;
}
