/**
 * Route API Routes
 * 
 * Defines API endpoints for route optimization and traffic data.
 */

import express from 'express';
import * as routeController from '../controllers/routeController';

const router = express.Router();

/**
 * @route   POST /api/routes/optimize
 * @desc    Optimize a route between two points
 * @access  Private
 */
router.post('/optimize', routeController.optimizeRoute);

/**
 * @route   POST /api/routes/batch
 * @desc    Batch optimize multiple routes
 * @access  Private
 */
router.post('/batch', routeController.batchOptimizeRoutes);

/**
 * @route   GET /api/routes/:id
 * @desc    Get route details by ID
 * @access  Private
 */
router.get('/:id', routeController.getRouteDetails);

/**
 * @route   GET /api/routes/:id/traffic
 * @desc    Get traffic data for a route
 * @access  Private
 */
router.get('/:id/traffic', routeController.getRouteTraffic);

/**
 * @route   GET /api/routes/metrics
 * @desc    Get optimization metrics
 * @access  Private
 */
router.get('/metrics', routeController.getOptimizationMetrics);

/**
 * @route   GET /api/routes/popular
 * @desc    Get popular routes
 * @access  Private
 */
router.get('/popular', routeController.getPopularRoutes);

/**
 * @route   GET /api/routes/incidents
 * @desc    Get traffic incidents
 * @access  Private
 */
router.get('/incidents', routeController.getTrafficIncidents);

export default router;