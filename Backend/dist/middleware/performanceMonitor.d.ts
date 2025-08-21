/**
 * Performance Monitoring Middleware
 * Ensures <500ms response times and tracks system performance
 */
import { Request, Response, NextFunction } from 'express';
interface PerformanceMetrics {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    cacheStats: any;
    timestamp: number;
}
interface RequestWithTiming extends Request {
    startTime: number;
    startCpuUsage: NodeJS.CpuUsage;
}
declare class PerformanceMonitor {
    private metrics;
    private readonly MAX_METRICS;
    private readonly RESPONSE_TIME_THRESHOLD;
    private alertCount;
    /**
     * Middleware to track request performance
     */
    trackPerformance(req: Request, res: Response, next: NextFunction): void;
    /**
     * Add metrics to the collection
     */
    private addMetrics;
    /**
     * Handle slow response times
     */
    private handleSlowResponse;
    /**
     * Trigger performance optimization
     */
    private triggerOptimization;
    /**
     * Get performance statistics
     */
    getStats(): any;
    /**
     * Get recent performance trends
     */
    getTrends(minutes?: number): any;
    /**
     * Health check endpoint data
     */
    getHealthCheck(): any;
    /**
     * Reset metrics and alerts
     */
    reset(): void;
}
export declare const performanceMonitor: PerformanceMonitor;
export declare const trackPerformance: (req: Request, res: Response, next: NextFunction) => void;
export { PerformanceMetrics, RequestWithTiming };
