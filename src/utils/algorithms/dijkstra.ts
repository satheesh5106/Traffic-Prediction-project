/**
 * Dijkstra's Algorithm Implementation
 * 
 * Finds the shortest path between nodes in a graph.
 * Optimized for distance-based routing.
 */

import { PriorityQueue } from '../dataStructures/priorityQueue';

type Graph = Record<string, Record<string, number>>;

interface DijkstraResult {
  path: string[];
  distance: number;
}

/**
 * Find the shortest path between start and end nodes using Dijkstra's algorithm
 * @param graph Adjacency list representation of the graph
 * @param start Starting node
 * @param end Ending node
 * @returns Object containing the path and total distance
 */
export function dijkstra(graph: Graph, start: string, end: string): DijkstraResult {
  // Initialize data structures
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visited: Set<string> = new Set();
  const queue = new PriorityQueue<string>(true); // Min heap
  
  // Initialize all distances to Infinity except start
  Object.keys(graph).forEach(node => {
    distances[node] = node === start ? 0 : Infinity;
    previous[node] = null;
  });
  
  // Add start node to queue
  queue.enqueue(start, 0);
  
  // Process nodes
  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    
    if (!current) break;
    if (current === end) break; // Found destination
    if (visited.has(current)) continue; // Skip if already visited
    
    visited.add(current);
    
    // Process neighbors
    const neighbors = graph[current] || {};
    Object.entries(neighbors).forEach(([neighbor, weight]) => {
      if (visited.has(neighbor)) return; // Skip visited neighbors
      
      const distance = distances[current] + weight;
      
      // Update if we found a shorter path
      if (distance < distances[neighbor]) {
        distances[neighbor] = distance;
        previous[neighbor] = current;
        
        // Add or update in queue
        queue.enqueue(neighbor, distance);
      }
    });
  }
  
  // Reconstruct path
  const path: string[] = [];
  let current: string | null = end;
  
  // Check if end is reachable
  if (distances[end] === Infinity) {
    return { path: [], distance: Infinity };
  }
  
  // Build path from end to start
  while (current) {
    path.unshift(current);
    current = previous[current];
  }
  
  return {
    path,
    distance: distances[end]
  };
}

/**
 * Find multiple shortest paths from start to all other nodes
 * @param graph Adjacency list representation of the graph
 * @param start Starting node
 * @returns Object mapping each node to its shortest path and distance
 */
export function dijkstraAll(graph: Graph, start: string): Record<string, DijkstraResult> {
  // Initialize data structures
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visited: Set<string> = new Set();
  const queue = new PriorityQueue<string>(true); // Min heap
  
  // Initialize all distances to Infinity except start
  Object.keys(graph).forEach(node => {
    distances[node] = node === start ? 0 : Infinity;
    previous[node] = null;
  });
  
  // Add start node to queue
  queue.enqueue(start, 0);
  
  // Process nodes
  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    
    if (!current) break;
    if (visited.has(current)) continue; // Skip if already visited
    
    visited.add(current);
    
    // Process neighbors
    const neighbors = graph[current] || {};
    Object.entries(neighbors).forEach(([neighbor, weight]) => {
      if (visited.has(neighbor)) return; // Skip visited neighbors
      
      const distance = distances[current] + weight;
      
      // Update if we found a shorter path
      if (distance < distances[neighbor]) {
        distances[neighbor] = distance;
        previous[neighbor] = current;
        
        // Add or update in queue
        queue.enqueue(neighbor, distance);
      }
    });
  }
  
  // Build result for each node
  const result: Record<string, DijkstraResult> = {};
  
  Object.keys(graph).forEach(node => {
    if (distances[node] === Infinity) {
      result[node] = { path: [], distance: Infinity };
      return;
    }
    
    const path: string[] = [];
    let current: string | null = node;
    
    // Build path from node to start
    while (current) {
      path.unshift(current);
      current = previous[current];
    }
    
    result[node] = {
      path,
      distance: distances[node]
    };
  });
  
  return result;
}