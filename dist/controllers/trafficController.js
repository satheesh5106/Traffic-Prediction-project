"use strict";
/**
 * Traffic Controller
 *
 * Handles API endpoints for traffic prediction and data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrafficAlerts = exports.getTrafficStats = exports.getTrafficIncidents = exports.getHistoricalTraffic = exports.getLiveTraffic = exports.getPrediction = void 0;
const trafficDataService_1 = require("../services/trafficDataService");
const logger_1 = require("../utils/logger");
const cache_1 = require("../utils/cache");
/**
 * Get traffic prediction for a location
 * @param req Request
 * @param res Response
 */
async function getPrediction(req, res) {
    try {
        const { lat, lng, radius } = req.body;
        if (!lat || !lng) {
            res.status(400).json({ error: 'Latitude and longitude are required' });
            return;
        }
        const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const searchRadius = radius ? parseFloat(radius) : 500; // Default 500m radius
        // Check cache first
        const cacheKey = `prediction:${lat}:${lng}:${searchRadius}`;
        const cachedPrediction = cache_1.cache.get(cacheKey);
        if (cachedPrediction) {
            logger_1.logger.info(`Returning cached prediction for ${lat},${lng}`);
            res.json(cachedPrediction);
            return;
        }
        // Get prediction from service
        const prediction = trafficDataService_1.trafficDataService.getTrafficPredictionAtLocation(location, searchRadius);
        if (!prediction) {
            res.status(404).json({ error: 'No traffic prediction available for this location' });
            return;
        }
        // Cache the result
        cache_1.cache.set(cacheKey, prediction, 5 * 60 * 1000); // 5 minutes
        logger_1.logger.info(`Traffic prediction retrieved for ${lat},${lng}`);
        res.json(prediction);
    }
    catch (error) {
        logger_1.logger.error('Error getting traffic prediction', error);
        res.status(500).json({ error: 'Failed to get traffic prediction' });
    }
}
exports.getPrediction = getPrediction;
/**
 * Get live traffic data for a location
 * @param req Request
 * @param res Response
 */
async function getLiveTraffic(req, res) {
    try {
        const { lat, lng, radius } = req.params;
        if (!lat || !lng) {
            res.status(400).json({ error: 'Latitude and longitude are required' });
            return;
        }
        const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const searchRadius = radius ? parseFloat(radius) : 500; // Default 500m radius
        // Check cache first
        const cacheKey = `liveTraffic:${lat}:${lng}:${searchRadius}`;
        const cachedTraffic = cache_1.cache.get(cacheKey);
        if (cachedTraffic) {
            logger_1.logger.info(`Returning cached live traffic for ${lat},${lng}`);
            res.json(cachedTraffic);
            return;
        }
        // Get traffic data from service
        const trafficData = trafficDataService_1.trafficDataService.getTrafficDataAtLocation(location, searchRadius);
        if (!trafficData) {
            res.status(404).json({ error: 'No traffic data available for this location' });
            return;
        }
        // Cache the result
        cache_1.cache.set(cacheKey, trafficData, 60 * 1000); // 1 minute
        logger_1.logger.info(`Live traffic data retrieved for ${lat},${lng}`);
        res.json(trafficData);
    }
    catch (error) {
        logger_1.logger.error('Error getting live traffic data', error);
        res.status(500).json({ error: 'Failed to get live traffic data' });
    }
}
exports.getLiveTraffic = getLiveTraffic;
/**
 * Get historical traffic data for a location
 * @param req Request
 * @param res Response
 */
async function getHistoricalTraffic(req, res) {
    try {
        const { lat, lng, timeframe } = req.params;
        if (!lat || !lng) {
            res.status(400).json({ error: 'Latitude and longitude are required' });
            return;
        }
        const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const historyTimeframe = timeframe ? parseInt(timeframe) : 24; // Default 24 hours
        // Check cache first
        const cacheKey = `historicalTraffic:${lat}:${lng}:${historyTimeframe}`;
        const cachedHistory = cache_1.cache.get(cacheKey);
        if (cachedHistory) {
            logger_1.logger.info(`Returning cached historical traffic for ${lat},${lng}`);
            res.json(cachedHistory);
            return;
        }
        // Get historical data from service
        const historicalData = trafficDataService_1.trafficDataService.getHistoricalTrafficData(location, historyTimeframe);
        if (!historicalData || historicalData.length === 0) {
            res.status(404).json({ error: 'No historical traffic data available for this location' });
            return;
        }
        // Cache the result
        cache_1.cache.set(cacheKey, historicalData, 30 * 60 * 1000); // 30 minutes
        logger_1.logger.info(`Historical traffic data retrieved for ${lat},${lng}`);
        res.json({
            location,
            timeframe: historyTimeframe,
            data: historicalData,
            count: historicalData.length,
            timestamp: Date.now()
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting historical traffic data', error);
        res.status(500).json({ error: 'Failed to get historical traffic data' });
    }
}
exports.getHistoricalTraffic = getHistoricalTraffic;
/**
 * Get traffic incidents
 * @param req Request
 * @param res Response
 */
async function getTrafficIncidents(req, res) {
    try {
        const incidents = trafficDataService_1.trafficDataService.getAllTrafficIncidents();
        logger_1.logger.info(`Retrieved ${incidents.length} traffic incidents`);
        res.json(incidents);
    }
    catch (error) {
        logger_1.logger.error('Error getting traffic incidents', error);
        res.status(500).json({ error: 'Failed to get traffic incidents' });
    }
}
exports.getTrafficIncidents = getTrafficIncidents;
/**
 * Get traffic statistics
 * @param req Request
 * @param res Response
 */
async function getTrafficStats(req, res) {
    try {
        // Get current time
        const now = Date.now();
        // Get active predictions count
        const activePredictions = trafficDataService_1.trafficDataService.getActivePredictionsCount();
        // Get accuracy metrics
        const accuracyMetrics = trafficDataService_1.trafficDataService.getAccuracyMetrics();
        // Get response time metrics
        const responseTimeMetrics = trafficDataService_1.trafficDataService.getResponseTimeMetrics();
        // Get critical alerts count
        const criticalAlerts = trafficDataService_1.trafficDataService.getCriticalAlertsCount();
        const stats = {
            lastUpdated: now,
            activePredictions,
            accuracy: accuracyMetrics.accuracy,
            responseTime: responseTimeMetrics.averageResponseTime,
            criticalAlerts
        };
        logger_1.logger.info('Traffic statistics retrieved');
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error getting traffic statistics', error);
        res.status(500).json({ error: 'Failed to get traffic statistics' });
    }
}
exports.getTrafficStats = getTrafficStats;
/**
 * Get traffic alerts
 * @param req Request
 * @param res Response
 */
async function getTrafficAlerts(req, res) {
    try {
        const alerts = trafficDataService_1.trafficDataService.getTrafficAlerts();
        logger_1.logger.info(`Retrieved ${alerts.length} traffic alerts`);
        res.json({
            alerts,
            count: alerts.length,
            timestamp: Date.now()
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting traffic alerts', error);
        res.status(500).json({ error: 'Failed to get traffic alerts' });
    }
}
exports.getTrafficAlerts = getTrafficAlerts;
