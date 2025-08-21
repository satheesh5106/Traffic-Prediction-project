/**
 * Traffic API Routes
 * 
 * Defines API endpoints for traffic prediction and data.
 */

import express from 'express';
import * as trafficController from '../controllers/trafficController';

const router = express.Router();

/**
 * @route   POST /api/traffic/predict
 * @desc    Get traffic prediction for a location
 * @access  Private
 */
router.post('/predict', trafficController.getPrediction);

/**
 * @route   GET /api/traffic/live/:lat/:lng/:radius?
 * @desc    Get live traffic data for a location
 * @access  Private
 */
router.get('/live/:lat/:lng/:radius?', trafficController.getLiveTraffic);

/**
 * @route   GET /api/traffic/historical/:lat/:lng/:timeframe?
 * @desc    Get historical traffic data for a location
 * @access  Private
 */
router.get('/historical/:lat/:lng/:timeframe?', trafficController.getHistoricalTraffic);

/**
 * @route   GET /api/traffic/incidents
 * @desc    Get traffic incidents
 * @access  Private
 */
router.get('/incidents', trafficController.getTrafficIncidents);

/**
 * @route   GET /api/traffic/stats
 * @desc    Get traffic statistics
 * @access  Private
 */
router.get('/stats', trafficController.getTrafficStats);

/**
 * @route   GET /api/traffic/alerts
 * @desc    Get traffic alerts
 * @access  Private
 */
router.get('/alerts', trafficController.getTrafficAlerts);

export default router;