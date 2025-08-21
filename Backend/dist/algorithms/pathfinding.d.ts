/**
 * Advanced Pathfinding Algorithms
 * Implements Dijkstra's and A* algorithms for optimal route finding
 */
export interface GraphNode {
    id: string;
    lat: number;
    lng: number;
    connections: Map<string, GraphEdge>;
}
export interface GraphEdge {
    to: string;
    weight: number;
    distance: number;
    trafficMultiplier: number;
    roadType: 'highway' | 'arterial' | 'local' | 'residential';
}
export interface PathResult {
    path: string[];
    totalDistance: number;
    totalTime: number;
    coordinates: Array<[number, number]>;
}
/**
 * Priority Queue implementation using binary heap
 * Essential for Dijkstra's and A* algorithms
 */
export declare class PriorityQueue<T> {
    private heap;
    enqueue(item: T, priority: number): void;
    dequeue(): T | null;
    isEmpty(): boolean;
    private heapifyUp;
    private heapifyDown;
}
/**
 * Advanced Graph class for route optimization
 */
export declare class RouteGraph {
    private nodes;
    private nodeCount;
    private edgeCount;
    constructor();
    /**
     * Initialize graph with sample nodes for demonstration
     */
    private initializeGraph;
    addNode(id: string, lat: number, lng: number): void;
    addEdge(from: string, to: string, distance: number, baseTime: number, trafficMultiplier: number, roadType: GraphEdge['roadType']): void;
    /**
     * Dijkstra's algorithm for shortest path
     */
    dijkstra(startId: string, endId: string): PathResult | null;
    /**
     * A* algorithm with heuristic for faster pathfinding
     */
    aStar(startId: string, endId: string): PathResult | null;
    /**
     * Heuristic function for A* (Haversine distance)
     */
    private heuristic;
    /**
     * Calculate Haversine distance between two points
     */
    private haversineDistance;
    private toRadians;
    /**
     * Reconstruct path from previous nodes map
     */
    private reconstructPath;
    /**
     * Find nearest node to given coordinates
     */
    findNearestNode(lat: number, lng: number): string | null;
    getNodes(): Map<string, GraphNode>;
}
