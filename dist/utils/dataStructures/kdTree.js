"use strict";
/**
 * KD-Tree Implementation
 *
 * Efficient spatial data structure for nearest neighbor searches.
 * Used for finding nearest nodes in the route graph.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KDTree = void 0;
class KDTree {
    /**
     * Create a new KD-Tree
     * @param points Array of points with data, where each point is [x, y, ...coords, data]
     * @param distanceFn Function to calculate distance between points
     */
    constructor(points, distanceFn = euclideanDistance) {
        this.root = null;
        this.dimensions = points.length > 0 ? points[0].length - 1 : 0;
        this.distanceFn = distanceFn;
        if (points.length > 0) {
            this.root = this.buildTree(points, 0);
        }
    }
    /**
     * Find the k nearest neighbors to the target point
     * @param target Target point to find neighbors for
     * @param k Number of neighbors to find
     * @returns Array of [point, data] tuples, sorted by distance
     */
    nearest(target, k = 1) {
        if (!this.root || k <= 0) {
            return [];
        }
        const targetPoint = target.slice(0, -1);
        const nearestPoints = new BoundedPriorityQueue(k);
        this.nearestSearch(this.root, targetPoint, 0, nearestPoints);
        return nearestPoints.toSortedArray();
    }
    /**
     * Recursively build the KD-Tree
     * @param points Points to build the tree from
     * @param depth Current depth in the tree
     * @returns Root node of the tree
     */
    buildTree(points, depth) {
        if (points.length === 0) {
            throw new Error('Cannot build KD-Tree with empty points array');
        }
        const axis = depth % this.dimensions;
        // Sort points by the current axis
        points.sort((a, b) => Number(a[axis]) - Number(b[axis]));
        // Select median as pivot
        const medianIndex = Math.floor(points.length / 2);
        const median = points[medianIndex];
        // Create node
        const node = {
            point: median.slice(0, -1),
            data: median[median.length - 1],
            left: null,
            right: null,
            axis
        };
        // Recursively build left and right subtrees
        if (medianIndex > 0) {
            node.left = this.buildTree(points.slice(0, medianIndex), depth + 1);
        }
        if (medianIndex < points.length - 1) {
            node.right = this.buildTree(points.slice(medianIndex + 1), depth + 1);
        }
        return node;
    }
    /**
     * Recursively search for nearest neighbors
     * @param node Current node
     * @param target Target point
     * @param depth Current depth
     * @param nearestPoints Priority queue of nearest points
     */
    nearestSearch(node, target, depth, nearestPoints) {
        if (!node) {
            return;
        }
        const axis = depth % this.dimensions;
        // Calculate distance to current node
        const distance = this.distanceFn(target, node.point);
        // Add current point to results if it's closer than current furthest
        const pointWithData = [...node.point, node.data];
        nearestPoints.add(pointWithData, distance);
        // Determine which subtree to search first
        const firstIsLeft = target[axis] < node.point[axis];
        const firstBranch = firstIsLeft ? node.left : node.right;
        const secondBranch = firstIsLeft ? node.right : node.left;
        // Search first branch
        this.nearestSearch(firstBranch, target, depth + 1, nearestPoints);
        // Check if we need to search the second branch
        // If the distance to the splitting plane is less than the current furthest distance,
        // there could be closer points in the second branch
        const axisDist = Math.abs(target[axis] - node.point[axis]);
        if (axisDist < nearestPoints.maxDistance() || nearestPoints.size() < nearestPoints.capacity()) {
            this.nearestSearch(secondBranch, target, depth + 1, nearestPoints);
        }
    }
}
exports.KDTree = KDTree;
/**
 * Calculate Euclidean distance between two points
 */
function euclideanDistance(a, b) {
    let sum = 0;
    const dimensions = Math.min(a.length, b.length);
    for (let i = 0; i < dimensions; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}
/**
 * Bounded priority queue that maintains the k smallest elements
 */
class BoundedPriorityQueue {
    constructor(capacity) {
        this.items = [];
        this._capacity = capacity;
    }
    /**
     * Add an item to the queue
     * @param item Item to add
     * @param priority Priority (lower is better)
     */
    add(item, priority) {
        if (this.items.length < this._capacity) {
            // Queue not full, add item and maintain heap property
            this.items.push({ item, priority });
            this.bubbleUp(this.items.length - 1);
        }
        else if (priority < this.items[0].priority) {
            // Queue full but new item has higher priority than worst item
            this.items[0] = { item, priority };
            this.bubbleDown(0);
        }
    }
    /**
     * Get the maximum distance in the queue
     */
    maxDistance() {
        return this.items.length > 0 ? this.items[0].priority : Infinity;
    }
    /**
     * Get the current size of the queue
     */
    size() {
        return this.items.length;
    }
    /**
     * Get the capacity of the queue
     */
    capacity() {
        return this._capacity;
    }
    /**
     * Convert the queue to a sorted array
     */
    toSortedArray() {
        return [...this.items]
            .sort((a, b) => a.priority - b.priority)
            .map(item => item.item);
    }
    /**
     * Bubble up an item to maintain heap property
     */
    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.items[index].priority > this.items[parentIndex].priority) {
                [this.items[index], this.items[parentIndex]] =
                    [this.items[parentIndex], this.items[index]];
                index = parentIndex;
            }
            else {
                break;
            }
        }
    }
    /**
     * Bubble down an item to maintain heap property
     */
    bubbleDown(index) {
        const lastIndex = this.items.length - 1;
        while (true) {
            let largest = index;
            const leftIndex = 2 * index + 1;
            const rightIndex = 2 * index + 2;
            if (leftIndex <= lastIndex &&
                this.items[leftIndex].priority > this.items[largest].priority) {
                largest = leftIndex;
            }
            if (rightIndex <= lastIndex &&
                this.items[rightIndex].priority > this.items[largest].priority) {
                largest = rightIndex;
            }
            if (largest !== index) {
                [this.items[index], this.items[largest]] =
                    [this.items[largest], this.items[index]];
                index = largest;
            }
            else {
                break;
            }
        }
    }
}
