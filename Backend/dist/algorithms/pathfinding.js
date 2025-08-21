"use strict";
/**
 * Advanced Pathfinding Algorithms
 * Implements Dijkstra's and A* algorithms for optimal route finding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteGraph = exports.PriorityQueue = void 0;
const logger_1 = require("../utils/logger");
/**
 * Priority Queue implementation using binary heap
 * Essential for Dijkstra's and A* algorithms
 */
class PriorityQueue {
    constructor() {
        this.heap = [];
    }
    enqueue(item, priority) {
        this.heap.push({ item, priority });
        this.heapifyUp(this.heap.length - 1);
    }
    dequeue() {
        if (this.heap.length === 0)
            return null;
        const result = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.heapifyDown(0);
        }
        return result.item;
    }
    isEmpty() {
        return this.heap.length === 0;
    }
    heapifyUp(index) {
        const parentIndex = Math.floor((index - 1) / 2);
        if (parentIndex >= 0 && this.heap[parentIndex].priority > this.heap[index].priority) {
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            this.heapifyUp(parentIndex);
        }
    }
    heapifyDown(index) {
        const leftChild = 2 * index + 1;
        const rightChild = 2 * index + 2;
        let smallest = index;
        if (leftChild < this.heap.length && this.heap[leftChild].priority < this.heap[smallest].priority) {
            smallest = leftChild;
        }
        if (rightChild < this.heap.length && this.heap[rightChild].priority < this.heap[smallest].priority) {
            smallest = rightChild;
        }
        if (smallest !== index) {
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            this.heapifyDown(smallest);
        }
    }
}
exports.PriorityQueue = PriorityQueue;
/**
 * Advanced Graph class for route optimization
 */
class RouteGraph {
    constructor() {
        this.nodes = new Map();
        this.nodeCount = 0;
        this.edgeCount = 0;
        this.initializeGraph();
    }
    /**
     * Initialize graph with sample nodes for demonstration
     */
    initializeGraph() {
        // Sample nodes for major intersections/landmarks
        const sampleNodes = [
            { id: 'downtown', lat: 40.7589, lng: -73.9851 },
            { id: 'midtown', lat: 40.7505, lng: -73.9934 },
            { id: 'uptown', lat: 40.7831, lng: -73.9712 },
            { id: 'brooklyn', lat: 40.6892, lng: -73.9442 },
            { id: 'queens', lat: 40.7282, lng: -73.7949 },
            { id: 'bronx', lat: 40.8448, lng: -73.8648 },
            { id: 'staten', lat: 40.5795, lng: -74.1502 }
        ];
        sampleNodes.forEach(node => this.addNode(node.id, node.lat, node.lng));
        // Add sample connections with realistic weights
        this.addEdge('downtown', 'midtown', 2.1, 8, 1.2, 'arterial');
        this.addEdge('midtown', 'uptown', 3.5, 12, 1.1, 'highway');
        this.addEdge('downtown', 'brooklyn', 4.2, 15, 1.3, 'highway');
        this.addEdge('downtown', 'queens', 8.7, 25, 1.4, 'highway');
        this.addEdge('uptown', 'bronx', 6.3, 18, 1.2, 'arterial');
        this.addEdge('brooklyn', 'queens', 12.4, 35, 1.1, 'highway');
        this.addEdge('queens', 'bronx', 15.2, 42, 1.3, 'arterial');
        logger_1.logger.info(`TrafficAI: Route graph initialized with ${this.nodeCount} nodes and ${this.edgeCount} edges`);
    }
    addNode(id, lat, lng) {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, {
                id,
                lat,
                lng,
                connections: new Map()
            });
            this.nodeCount++;
        }
    }
    addEdge(from, to, distance, baseTime, trafficMultiplier, roadType) {
        const fromNode = this.nodes.get(from);
        const toNode = this.nodes.get(to);
        if (fromNode && toNode) {
            const weight = baseTime * trafficMultiplier;
            fromNode.connections.set(to, {
                to,
                weight,
                distance,
                trafficMultiplier,
                roadType
            });
            // Add reverse edge for bidirectional roads
            toNode.connections.set(from, {
                to: from,
                weight,
                distance,
                trafficMultiplier,
                roadType
            });
            this.edgeCount += 2;
        }
    }
    /**
     * Dijkstra's algorithm for shortest path
     */
    dijkstra(startId, endId) {
        const distances = new Map();
        const previous = new Map();
        const visited = new Set();
        const pq = new PriorityQueue();
        // Initialize distances
        for (const nodeId of this.nodes.keys()) {
            distances.set(nodeId, nodeId === startId ? 0 : Infinity);
            previous.set(nodeId, null);
        }
        pq.enqueue(startId, 0);
        while (!pq.isEmpty()) {
            const currentId = pq.dequeue();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            if (currentId === endId)
                break;
            const currentNode = this.nodes.get(currentId);
            const currentDistance = distances.get(currentId);
            for (const [neighborId, edge] of currentNode.connections) {
                if (visited.has(neighborId))
                    continue;
                const newDistance = currentDistance + edge.weight;
                if (newDistance < distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    previous.set(neighborId, currentId);
                    pq.enqueue(neighborId, newDistance);
                }
            }
        }
        return this.reconstructPath(startId, endId, previous, distances);
    }
    /**
     * A* algorithm with heuristic for faster pathfinding
     */
    aStar(startId, endId) {
        const gScore = new Map();
        const fScore = new Map();
        const previous = new Map();
        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const endNode = this.nodes.get(endId);
        if (!endNode)
            return null;
        // Initialize scores
        for (const nodeId of this.nodes.keys()) {
            gScore.set(nodeId, nodeId === startId ? 0 : Infinity);
            fScore.set(nodeId, nodeId === startId ? this.heuristic(startId, endId) : Infinity);
            previous.set(nodeId, null);
        }
        openSet.enqueue(startId, fScore.get(startId));
        while (!openSet.isEmpty()) {
            const currentId = openSet.dequeue();
            if (currentId === endId) {
                return this.reconstructPath(startId, endId, previous, gScore);
            }
            closedSet.add(currentId);
            const currentNode = this.nodes.get(currentId);
            for (const [neighborId, edge] of currentNode.connections) {
                if (closedSet.has(neighborId))
                    continue;
                const tentativeGScore = gScore.get(currentId) + edge.weight;
                if (tentativeGScore < gScore.get(neighborId)) {
                    previous.set(neighborId, currentId);
                    gScore.set(neighborId, tentativeGScore);
                    fScore.set(neighborId, tentativeGScore + this.heuristic(neighborId, endId));
                    openSet.enqueue(neighborId, fScore.get(neighborId));
                }
            }
        }
        return null;
    }
    /**
     * Heuristic function for A* (Haversine distance)
     */
    heuristic(nodeId1, nodeId2) {
        const node1 = this.nodes.get(nodeId1);
        const node2 = this.nodes.get(nodeId2);
        return this.haversineDistance(node1.lat, node1.lng, node2.lat, node2.lng) / 50; // Assume 50 km/h average speed
    }
    /**
     * Calculate Haversine distance between two points
     */
    haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Reconstruct path from previous nodes map
     */
    reconstructPath(startId, endId, previous, distances) {
        const path = [];
        let current = endId;
        while (current !== null) {
            path.unshift(current);
            current = previous.get(current) || null;
        }
        if (path[0] !== startId)
            return null;
        // Calculate total distance and coordinates
        let totalDistance = 0;
        const coordinates = [];
        for (let i = 0; i < path.length; i++) {
            const node = this.nodes.get(path[i]);
            coordinates.push([node.lng, node.lat]);
            if (i > 0) {
                const prevNode = this.nodes.get(path[i - 1]);
                const edge = prevNode.connections.get(path[i]);
                if (edge)
                    totalDistance += edge.distance;
            }
        }
        return {
            path,
            totalDistance,
            totalTime: distances.get(endId) || 0,
            coordinates
        };
    }
    /**
     * Find nearest node to given coordinates
     */
    findNearestNode(lat, lng) {
        let nearestId = null;
        let minDistance = Infinity;
        for (const [nodeId, node] of this.nodes) {
            const distance = this.haversineDistance(lat, lng, node.lat, node.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearestId = nodeId;
            }
        }
        return nearestId;
    }
    getNodes() {
        return this.nodes;
    }
}
exports.RouteGraph = RouteGraph;
//# sourceMappingURL=pathfinding.js.map