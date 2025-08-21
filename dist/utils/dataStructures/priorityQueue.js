"use strict";
/**
 * Priority Queue Implementation
 *
 * Efficient implementation of a priority queue using a binary heap.
 * Used for Dijkstra's and A* algorithms in route optimization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityQueue = void 0;
class PriorityQueue {
    /**
     * Create a new priority queue
     * @param minHeap If true, creates a min heap (lowest priority first), otherwise max heap
     */
    constructor(minHeap = true) {
        this.heap = [];
        this.comparator = minHeap
            ? (a, b) => a < b
            : (a, b) => a > b;
    }
    /**
     * Get the number of items in the queue
     */
    size() {
        return this.heap.length;
    }
    /**
     * Check if the queue is empty
     */
    isEmpty() {
        return this.heap.length === 0;
    }
    /**
     * Add an item to the queue with the given priority
     * @param item The item to add
     * @param priority The priority of the item
     */
    enqueue(item, priority) {
        this.heap.push({ item, priority });
        this.siftUp(this.heap.length - 1);
    }
    /**
     * Remove and return the highest priority item
     * @returns The highest priority item or undefined if queue is empty
     */
    dequeue() {
        if (this.isEmpty()) {
            return undefined;
        }
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0 && bottom) {
            this.heap[0] = bottom;
            this.siftDown(0);
        }
        return top.item;
    }
    /**
     * Look at the highest priority item without removing it
     * @returns The highest priority item or undefined if queue is empty
     */
    peek() {
        return this.isEmpty() ? undefined : this.heap[0].item;
    }
    /**
     * Check if an item exists in the queue
     * @param item The item to check for
     * @param comparator Function to compare items
     * @returns True if the item exists in the queue
     */
    contains(item, comparator) {
        return this.heap.some(node => comparator(node.item, item));
    }
    /**
     * Update the priority of an item
     * @param item The item to update
     * @param newPriority The new priority
     * @param comparator Function to compare items
     * @returns True if the item was found and updated
     */
    updatePriority(item, newPriority, comparator) {
        for (let i = 0; i < this.heap.length; i++) {
            if (comparator(this.heap[i].item, item)) {
                const oldPriority = this.heap[i].priority;
                this.heap[i].priority = newPriority;
                if (this.comparator(newPriority, oldPriority)) {
                    this.siftUp(i);
                }
                else {
                    this.siftDown(i);
                }
                return true;
            }
        }
        return false;
    }
    /**
     * Clear all items from the queue
     */
    clear() {
        this.heap = [];
    }
    /**
     * Move an item up the heap until it's in the correct position
     * @param index The index of the item to sift up
     */
    siftUp(index) {
        let parent = Math.floor((index - 1) / 2);
        while (index > 0 &&
            this.comparator(this.heap[index].priority, this.heap[parent].priority)) {
            [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
            index = parent;
            parent = Math.floor((index - 1) / 2);
        }
    }
    /**
     * Move an item down the heap until it's in the correct position
     * @param index The index of the item to sift down
     */
    siftDown(index) {
        let minIndex = index;
        const length = this.heap.length;
        while (index < length) {
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            if (left < length &&
                this.comparator(this.heap[left].priority, this.heap[minIndex].priority)) {
                minIndex = left;
            }
            if (right < length &&
                this.comparator(this.heap[right].priority, this.heap[minIndex].priority)) {
                minIndex = right;
            }
            if (minIndex === index) {
                break;
            }
            [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
            index = minIndex;
        }
    }
}
exports.PriorityQueue = PriorityQueue;
