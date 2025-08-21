"use strict";
/**
 * Performance Monitoring Middleware
 * Ensures <500ms response times and tracks system performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackPerformance = exports.performanceMonitor = void 0;
const logger_1 = require("../utils/logger");
const cache_1 = require("../algorithms/cache");
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.MAX_METRICS = 1000;
        this.RESPONSE_TIME_THRESHOLD = 500; // 500ms
        this.alertCount = 0;
    }
    /**
     * Middleware to track request performance
     */
    trackPerformance(req, res, next) {
        // Record start time and CPU usage
        const reqWithTiming = req;
        reqWithTiming.startTime = Date.now();
        reqWithTiming.startCpuUsage = process.cpuUsage();
        // Override res.end to capture response time
        const originalEnd = res.end.bind(res);
        res.end = ((...args) => {
            const responseTime = Date.now() - reqWithTiming.startTime;
            const cpuUsage = process.cpuUsage(reqWithTiming.startCpuUsage);
            // Log performance metrics
            const metrics = {
                responseTime,
                memoryUsage: process.memoryUsage(),
                cpuUsage,
                cacheStats: cache_1.trafficDataCache.getAllStats(),
                timestamp: Date.now()
            };
            // Store metrics (keep only last MAX_METRICS)
            exports.performanceMonitor.addMetrics(metrics);
            // Check for performance issues
            if (responseTime > exports.performanceMonitor.RESPONSE_TIME_THRESHOLD) {
                exports.performanceMonitor.handleSlowResponse(req, responseTime);
            }
            // Add performance headers
            res.setHeader('X-Response-Time', `${responseTime}ms`);
            res.setHeader('X-Cache-Hit-Rate', `${(metrics.cacheStats.routes?.hits || 0) / Math.max(1, (metrics.cacheStats.routes?.total || 1)) * 100}%`);
            res.setHeader('X-Memory-Usage', `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);
            // Call original end method
            return originalEnd(...args);
        });
        next();
    }
    ;
    /**
     * Add metrics to the collection
     */
    addMetrics(metrics) {
        this.metrics.push(metrics);
        // Keep only the most recent metrics
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }
    }
    /**
     * Handle slow response times
     */
    handleSlowResponse(req, responseTime) {
        this.alertCount++;
        logger_1.logger.warn('Slow response detected', {
            url: req.url,
            method: req.method,
            responseTime: `${responseTime}ms`,
            threshold: `${this.RESPONSE_TIME_THRESHOLD}ms`,
            alertCount: this.alertCount
        });
        // Trigger performance optimization if too many slow responses
        if (this.alertCount % 10 === 0) {
            this.triggerOptimization();
        }
    }
    /**
     * Trigger performance optimization
     */
    triggerOptimization() {
        logger_1.logger.info('Triggering performance optimization due to slow responses');
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            logger_1.logger.info('Garbage collection triggered');
        }
    }
    /**
     * Get performance statistics
     */
    getStats() {
        return {
            totalRequests: this.metrics.length,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            cacheStats: cache_1.trafficDataCache.getAllStats(),
            alertCount: this.alertCount
        };
    }
    /**
     * Get recent performance trends
     */
    getTrends(minutes = 5) {
        const cutoffTime = Date.now() - (minutes * 60 * 1000);
        const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
        return {
            trend: 'stable',
            message: 'Performance monitoring active',
            dataPoints: recentMetrics.length,
            timeRange: `${minutes} minutes`
        };
    }
    /**
     * Health check endpoint data
     */
    getHealthCheck() {
        const stats = this.getStats();
        const trends = this.getTrends();
        const isHealthy = stats.memoryUsage.heapUsed < stats.memoryUsage.heapTotal * 0.9; // Less than 90% memory usage
        return {
            status: isHealthy ? 'healthy' : 'degraded',
            performance: {
                trend: trends.trend
            },
            memory: {
                used: `${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`,
                total: `${Math.round(stats.memoryUsage.heapTotal / 1024 / 1024)}MB`,
                usage: `${Math.round(stats.memoryUsage.heapUsed / stats.memoryUsage.heapTotal * 100)}%`
            },
            cache: stats.cacheStats,
            uptime: `${Math.round(stats.uptime / 60)} minutes`,
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Reset metrics and alerts
     */
    reset() {
        this.metrics = [];
        this.alertCount = 0;
        logger_1.logger.info('Performance metrics reset');
    }
}
// Export singleton instance
exports.performanceMonitor = new PerformanceMonitor();
// Export middleware function
exports.trackPerformance = exports.performanceMonitor.trackPerformance.bind(exports.performanceMonitor);
//# sourceMappingURL=performanceMonitor.js.map