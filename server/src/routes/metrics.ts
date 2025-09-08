import { Router, Request, Response, NextFunction } from 'express';
import { weatherService } from '../services/weatherService';
import { logger } from '../app';
import { requestIdMiddleware } from '../middleware/requestId';

const router = Router();

// Apply request ID middleware
router.use(requestIdMiddleware);

/**
 * GET /api/metrics/weather
 * Returns weather service metrics for observability
 */
router.get('/weather', async (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  try {
    const requestId = req.requestId || req.headers['x-request-id'] as string;
    
    // Get metrics from weather service
    const metrics = weatherService.getMetrics();
    
    // Log metrics request
    logger.info('Weather metrics requested', {
      requestId,
      totalRequests: metrics.requests.total,
      cacheHitRate: metrics.cache.hitRate,
      avgLatency: metrics.latency.avg
    });
    
    const response = {
      success: true,
      data: {
        service: 'weather',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metrics: {
          requests: {
            total: metrics.requests.total,
            successful: metrics.requests.successful,
            failed: metrics.requests.failed,
            cached: metrics.requests.cached,
            successRate: metrics.requests.total > 0 
              ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) + '%'
              : '0%',
            cacheRate: metrics.requests.total > 0
              ? ((metrics.requests.cached / metrics.requests.total) * 100).toFixed(2) + '%'
              : '0%'
          },
          latency: {
            average: Math.round(metrics.latency.avg) + 'ms',
            p95: Math.round(metrics.latency.p95) + 'ms',
            p99: Math.round(metrics.latency.p99) + 'ms'
          },
          providers: {
            imd: {
              requests: metrics.providers.imd.requests,
              failures: metrics.providers.imd.failures,
              avgLatency: Math.round(metrics.providers.imd.avgLatency) + 'ms',
              successRate: metrics.providers.imd.requests > 0
                ? (((metrics.providers.imd.requests - metrics.providers.imd.failures) / metrics.providers.imd.requests) * 100).toFixed(2) + '%'
                : '0%'
            },
            openWeatherMap: {
              requests: metrics.providers.owm.requests,
              failures: metrics.providers.owm.failures,
              avgLatency: Math.round(metrics.providers.owm.avgLatency) + 'ms',
              successRate: metrics.providers.owm.requests > 0
                ? (((metrics.providers.owm.requests - metrics.providers.owm.failures) / metrics.providers.owm.requests) * 100).toFixed(2) + '%'
                : '0%'
            }
          },
          cache: {
            hits: metrics.cache.hits,
            misses: metrics.cache.misses,
            hitRate: metrics.cache.hitRate.toFixed(2) + '%',
            totalOperations: metrics.cache.hits + metrics.cache.misses
          }
        }
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to retrieve weather metrics', {
      requestId: req.requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    next(error);
  }
});

/**
 * GET /api/metrics/weather/health
 * Returns weather service health status with detailed metrics
 */
router.get('/weather/health', async (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  try {
    const requestId = req.requestId || req.headers['x-request-id'] as string;
    
    // Get health status from weather service
    const healthStatus = await weatherService.getHealthStatus();
    
    // Log health check request
    logger.info('Weather health check requested', {
      requestId,
      status: healthStatus.status,
      services: healthStatus.services
    });
    
    const response = {
      success: healthStatus.status !== 'down',
      data: {
        service: 'weather',
        timestamp: new Date().toISOString(),
        status: healthStatus.status,
        services: healthStatus.services,
        metrics: {
          requests: {
            total: healthStatus.metrics.requests.total,
            successful: healthStatus.metrics.requests.successful,
            failed: healthStatus.metrics.requests.failed,
            successRate: healthStatus.metrics.requests.total > 0 
              ? ((healthStatus.metrics.requests.successful / healthStatus.metrics.requests.total) * 100).toFixed(2) + '%'
              : '0%'
          },
          latency: {
            average: Math.round(healthStatus.metrics.latency.avg) + 'ms',
            p95: Math.round(healthStatus.metrics.latency.p95) + 'ms',
            p99: Math.round(healthStatus.metrics.latency.p99) + 'ms'
          },
          cache: {
            hitRate: healthStatus.metrics.cache.hitRate.toFixed(2) + '%',
            totalOperations: healthStatus.metrics.cache.hits + healthStatus.metrics.cache.misses
          }
        }
      }
    };
    
    // Set appropriate status code based on health
    const statusCode = healthStatus.status === 'ok' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Failed to retrieve weather health status', {
      requestId: req.requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    next(error);
  }
});

/**
 * GET /api/metrics/weather/reset
 * Reset weather service metrics (admin only)
 */
router.post('/weather/reset', async (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  try {
    const requestId = req.requestId || req.headers['x-request-id'] as string;
    
    // Note: This would require implementing a reset method in weatherService
    // For now, we'll return a message indicating the feature is not implemented
    
    logger.warn('Weather metrics reset requested (not implemented)', {
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    const response = {
      success: false,
      message: 'Metrics reset not implemented - metrics are automatically managed by the service',
      data: {
        service: 'weather',
        timestamp: new Date().toISOString(),
        note: 'Weather service metrics are automatically calculated and reset periodically'
      }
    };
    
    res.status(501).json(response);
  } catch (error) {
    logger.error('Failed to process weather metrics reset', {
      requestId: req.requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    next(error);
  }
});

// Error handling middleware for metrics routes
router.use((error: Error, req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  const statusCode = 500;
  const errorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: 'Failed to retrieve metrics',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };
  
  res.status(statusCode).json(errorResponse);
});

export default router;

/**
 * Weather Metrics Routes Documentation
 * 
 * This module provides observability endpoints for the weather service:
 * 
 * 1. GET /api/metrics/weather - Returns comprehensive weather service metrics
 *    - Request statistics (total, successful, failed, cached)
 *    - Latency metrics (average, p95, p99)
 *    - Provider-specific metrics (IMD, OpenWeatherMap)
 *    - Cache performance (hits, misses, hit rate)
 * 
 * 2. GET /api/metrics/weather/health - Returns weather service health status
 *    - Overall service status (ok, degraded, down)
 *    - Individual service status (IMD API, OpenWeatherMap, Cache)
 *    - Key performance metrics
 * 
 * 3. POST /api/metrics/weather/reset - Reset metrics (not implemented)
 *    - Returns 501 Not Implemented
 *    - Metrics are automatically managed by the service
 * 
 * All routes include:
 * - Request ID tracking for observability
 * - Structured logging with context
 * - Consistent response format
 * - Proper error handling
 * - Performance metrics with human-readable formatting
 * 
 * These endpoints are designed for:
 * - Monitoring dashboards
 * - Health checks
 * - Performance analysis
 * - Debugging and troubleshooting
 */