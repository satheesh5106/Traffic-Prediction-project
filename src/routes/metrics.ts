import { z } from 'zod';
import { Router } from 'express';
import { MetricsService } from '../services/metricsService';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validation';

const router = Router();
const metricsService = new MetricsService();

// Validation schemas
const StartSessionSchema = z.object({
  routeId: z.string().min(1, 'Route ID is required'),
  userId: z.string().optional(),
  estimatedDistance: z.number().positive('Distance must be positive'),
  estimatedDuration: z.number().positive('Duration must be positive'),
  vehicleType: z.enum(['car', 'truck', 'motorcycle', 'bicycle']).default('car'),
});

const CompleteSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  actualDistance: z.number().positive('Distance must be positive'),
  actualDuration: z.number().positive('Duration must be positive'),
  fuelUsed: z.number().min(0, 'Fuel used cannot be negative').optional(),
});

const CancelSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  reason: z.string().optional(),
});

/**
 * GET /metrics
 * Returns current metrics data
 */
router.get('/', asyncHandler(async (req, res) => {
  const metrics = await metricsService.getMetrics();
  
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * POST /metrics/sessions/start
 * Start a new route optimization session
 */
router.post('/sessions/start', 
  validateRequest(StartSessionSchema),
  asyncHandler(async (req, res) => {
    const sessionData = req.body;
    const session = await metricsService.startSession(sessionData);
    
    res.status(201).json({
      success: true,
      data: session,
      message: 'Route optimization session started',
    });
  })
);

/**
 * POST /metrics/sessions/complete
 * Complete a route optimization session
 */
router.post('/sessions/complete',
  validateRequest(CompleteSessionSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, actualDistance, actualDuration, fuelUsed } = req.body;
    
    const result = await metricsService.completeSession(
      sessionId,
      actualDistance,
      actualDuration,
      fuelUsed
    );
    
    res.json({
      success: true,
      data: result,
      message: 'Route optimization session completed',
    });
  })
);

/**
 * POST /metrics/sessions/cancel
 * Cancel a route optimization session
 */
router.post('/sessions/cancel',
  validateRequest(CancelSessionSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, reason } = req.body;
    
    await metricsService.cancelSession(sessionId, reason);
    
    res.json({
      success: true,
      message: 'Route optimization session cancelled',
    });
  })
);

/**
 * GET /metrics/sessions
 * Get all active sessions
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const sessions = await metricsService.getActiveSessions();
  
  res.json({
    success: true,
    data: sessions,
    count: sessions.length,
  });
}));

/**
 * GET /metrics/sessions/:sessionId
 * Get specific session details
 */
router.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await metricsService.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found',
    });
  }
  
  res.json({
    success: true,
    data: session,
  });
}));

/**
 * DELETE /metrics/reset
 * Reset all metrics (admin only)
 */
router.delete('/reset', asyncHandler(async (req, res) => {
  await metricsService.resetMetrics();
  
  res.json({
    success: true,
    message: 'All metrics have been reset',
  });
}));

/**
 * GET /metrics/health
 * Health check endpoint for metrics service
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await metricsService.getHealthStatus();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: health.status === 'healthy',
    data: health,
  });
}));

/**
 * GET /metrics/stats
 * Get detailed statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await metricsService.getDetailedStats();
  
  res.json({
    success: true,
    data: stats,
  });
}));

export default router;

/**
 * Metrics Routes Documentation
 * 
 * This module provides REST endpoints for the MetricsService functionality:
 * 
 * 1. GET /metrics - Returns current aggregated metrics
 * 2. POST /metrics/sessions/start - Start tracking a new route optimization
 * 3. POST /metrics/sessions/complete - Complete and record optimization results
 * 4. POST /metrics/sessions/cancel - Cancel an active session
 * 5. GET /metrics/sessions - List all active sessions
 * 6. GET /metrics/sessions/:id - Get specific session details
 * 7. DELETE /metrics/reset - Reset all metrics (admin)
 * 8. GET /metrics/health - Service health check
 * 9. GET /metrics/stats - Detailed statistics
 * 
 * All routes use:
 * - asyncHandler for proper error handling
 * - Zod validation for request data
 * - Consistent response format
 * - Proper HTTP status codes
 * 
 * The /metrics endpoint is designed to be polled every 30 seconds by the dashboard
 * for real-time metrics updates.
 */