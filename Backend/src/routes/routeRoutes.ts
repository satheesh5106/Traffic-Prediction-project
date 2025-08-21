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
 * @route   POST /api/routes/options
 * @desc    Get route options (fastest, shortest, eco, scenic)
 * @access  Private
 */
router.post('/options', routeController.getRouteOptions);

/**
 * @route   GET /api/routes/stats
 * @desc    Get route statistics
 * @access  Private
 */
router.get('/stats', routeController.getRouteStats);

/**
 * @route   GET /api/routes/active
 * @desc    Get active routes for user
 * @access  Private
 */
router.get('/active', routeController.getActiveRoutes);

export default router;