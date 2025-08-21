"use strict";
/**
 * A* Algorithm Implementation
 *
 * Finds the shortest path between nodes in a graph using heuristic search.
 * Optimized for time-based routing with traffic consideration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aStar = void 0;
const priorityQueue_1 = require("../dataStructures/priorityQueue");
/**
 * Find the shortest path between start and end nodes using A* algorithm
 * @param graph Adjacency list representation of the graph
 * @param coordinates Map of node IDs to their coordinates
 * @param start Starting node
 * @param end Ending node
 * @returns Object containing the path and total distance
 */
function aStar(graph, coordinates, start, end) {
    // Initialize data structures
    const openSet = new priorityQueue_1.PriorityQueue(true); // Min heap
    const closedSet = new Set();
    const gScore = {}; // Cost from start to node
    const fScore = {}; // Estimated total cost from start to end through node
    const cameFrom = {};
    // Initialize scores
    Object.keys(graph).forEach(node => {
        gScore[node] = node === start ? 0 : Infinity;
        fScore[node] = node === start ? heuristic(coordinates, node, end) : Infinity;
        cameFrom[node] = null;
    });
    // Add start node to open set
    openSet.enqueue(start, fScore[start]);
    // Process nodes
    while (!openSet.isEmpty()) {
        const current = openSet.dequeue();
        if (!current)
            break;
        if (current === end) {
            // Found the goal, reconstruct path
            return reconstructPath(cameFrom, current, gScore[current]);
        }
        closedSet.add(current);
        // Process neighbors
        const neighbors = graph[current] || {};
        Object.entries(neighbors).forEach(([neighbor, weight]) => {
            if (closedSet.has(neighbor))
                return; // Skip if in closed set
            // Calculate tentative gScore
            const tentativeGScore = gScore[current] + weight;
            // Check if this path is better
            if (tentativeGScore < gScore[neighbor]) {
                // This path is better, record it
                cameFrom[neighbor] = current;
                gScore[neighbor] = tentativeGScore;
                fScore[neighbor] = gScore[neighbor] + heuristic(coordinates, neighbor, end);
                // Add to open set if not already there
                if (!openSet.contains(neighbor, (a, b) => a === b)) {
                    openSet.enqueue(neighbor, fScore[neighbor]);
                }
            }
        });
    }
    // No path found
    return { path: [], distance: Infinity };
}
exports.aStar = aStar;
/**
 * Calculate heuristic distance between two nodes
 * @param coordinates Map of node IDs to their coordinates
 * @param a First node
 * @param b Second node
 * @returns Estimated distance between nodes
 */
function heuristic(coordinates, a, b) {
    // If coordinates are not available, use 0 as heuristic
    if (!coordinates[a] || !coordinates[b]) {
        return 0;
    }
    // Calculate Haversine distance (great-circle distance on a sphere)
    return haversineDistance(coordinates[a].lat, coordinates[a].lng, coordinates[b].lat, coordinates[b].lng);
}
/**
 * Calculate Haversine distance between two points on Earth
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    // Earth's radius in meters
    const R = 6371000;
    // Convert latitude and longitude from degrees to radians
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    // Haversine formula
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Distance in meters
    return R * c;
}
/**
 * Reconstruct path from start to end
 * @param cameFrom Map of each node to its predecessor
 * @param current End node
 * @param distance Total distance of the path
 * @returns Object containing the path and total distance
 */
function reconstructPath(cameFrom, current, distance) {
    const path = [current];
    while (cameFrom[current]) {
        current = cameFrom[current];
        path.unshift(current);
    }
    return { path, distance };
}
