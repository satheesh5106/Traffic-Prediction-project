"use strict";
/**
 * Bellman-Ford Algorithm Implementation
 *
 * Finds the shortest path between nodes in a graph with negative edge weights.
 * Optimized for fuel-efficient routing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bellmanFordAll = exports.bellmanFord = void 0;
/**
 * Find the shortest path between start and end nodes using Bellman-Ford algorithm
 * @param edges Array of edges in the graph
 * @param start Starting node
 * @param end Ending node
 * @returns Object containing the path, total distance, and whether a negative cycle was detected
 */
function bellmanFord(edges, start, end) {
    // Get all unique nodes from edges
    const nodes = new Set();
    edges.forEach(edge => {
        nodes.add(edge.from);
        nodes.add(edge.to);
    });
    // Initialize distances and predecessors
    const distances = {};
    const predecessors = {};
    // Set all initial distances to Infinity except for the start node
    nodes.forEach(node => {
        distances[node] = node === start ? 0 : Infinity;
        predecessors[node] = null;
    });
    const nodeCount = nodes.size;
    // Relax edges repeatedly
    for (let i = 0; i < nodeCount - 1; i++) {
        let updated = false;
        for (const edge of edges) {
            if (distances[edge.from] === Infinity)
                continue;
            const newDistance = distances[edge.from] + edge.weight;
            if (newDistance < distances[edge.to]) {
                distances[edge.to] = newDistance;
                predecessors[edge.to] = edge.from;
                updated = true;
            }
        }
        // Early termination if no updates were made in this iteration
        if (!updated)
            break;
    }
    // Check for negative weight cycles
    let hasNegativeCycle = false;
    for (const edge of edges) {
        if (distances[edge.from] === Infinity)
            continue;
        if (distances[edge.from] + edge.weight < distances[edge.to]) {
            hasNegativeCycle = true;
            break;
        }
    }
    // Reconstruct path
    const path = [];
    let current = end;
    // Check if end is reachable
    if (distances[end] === Infinity) {
        return { path: [], distance: Infinity, hasNegativeCycle };
    }
    // Build path from end to start
    while (current) {
        path.unshift(current);
        current = predecessors[current];
        // Detect cycles in the path
        if (path.indexOf(current) !== -1) {
            return { path: [], distance: Infinity, hasNegativeCycle: true };
        }
    }
    return {
        path,
        distance: distances[end],
        hasNegativeCycle
    };
}
exports.bellmanFord = bellmanFord;
/**
 * Find shortest paths from start to all other nodes
 * @param edges Array of edges in the graph
 * @param start Starting node
 * @returns Object mapping each node to its shortest path and distance
 */
function bellmanFordAll(edges, start) {
    // Get all unique nodes from edges
    const nodes = new Set();
    edges.forEach(edge => {
        nodes.add(edge.from);
        nodes.add(edge.to);
    });
    // Initialize distances and predecessors
    const distances = {};
    const predecessors = {};
    // Set all initial distances to Infinity except for the start node
    nodes.forEach(node => {
        distances[node] = node === start ? 0 : Infinity;
        predecessors[node] = null;
    });
    const nodeCount = nodes.size;
    // Relax edges repeatedly
    for (let i = 0; i < nodeCount - 1; i++) {
        let updated = false;
        for (const edge of edges) {
            if (distances[edge.from] === Infinity)
                continue;
            const newDistance = distances[edge.from] + edge.weight;
            if (newDistance < distances[edge.to]) {
                distances[edge.to] = newDistance;
                predecessors[edge.to] = edge.from;
                updated = true;
            }
        }
        // Early termination if no updates were made in this iteration
        if (!updated)
            break;
    }
    // Check for negative weight cycles
    let hasNegativeCycle = false;
    for (const edge of edges) {
        if (distances[edge.from] === Infinity)
            continue;
        if (distances[edge.from] + edge.weight < distances[edge.to]) {
            hasNegativeCycle = true;
            break;
        }
    }
    // Build result for each node
    const result = {};
    nodes.forEach(node => {
        if (distances[node] === Infinity) {
            result[node] = { path: [], distance: Infinity, hasNegativeCycle };
            return;
        }
        const path = [];
        let current = node;
        let hasCycle = false;
        // Build path from node to start
        while (current) {
            path.unshift(current);
            current = predecessors[current];
            // Detect cycles in the path
            if (path.indexOf(current) !== -1) {
                hasCycle = true;
                break;
            }
        }
        result[node] = {
            path: hasCycle ? [] : path,
            distance: hasCycle ? Infinity : distances[node],
            hasNegativeCycle: hasCycle || hasNegativeCycle
        };
    });
    return result;
}
exports.bellmanFordAll = bellmanFordAll;
