"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrafficAlerts = exports.getHistoricalTraffic = exports.getTrafficStats = exports.getTrafficPrediction = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const trafficPredictionService_1 = require("../services/trafficPredictionService");
const weatherService_1 = require("../services/weatherService");
const trafficAPIService_1 = require("../services/trafficAPIService");
// Initialize services
const trafficPredictionService = new trafficPredictionService_1.TrafficPredictionService();
const weatherService = new weatherService_1.WeatherService();
const trafficAPIService = new trafficAPIService_1.TrafficAPIService();
/**
 * Get traffic prediction for a location
 * @route POST /api/traffic-prediction
 * @access Private
 */
const getTrafficPrediction = async (req, res) => {
    const { latitude, longitude, radius, timeframe } = req.body;
    if (!latitude || !longitude) {
        throw new errorHandler_1.ApiError(400, 'Latitude and longitude are required');
    }
    try {
        // Get current traffic data from API
        const liveTrafficData = await trafficAPIService.getLiveTraffic(latitude, longitude, radius || 2000);
        // Get weather data for the location
        const weatherData = await weatherService.getWeatherData(latitude, longitude);
        // Fuse data and make prediction using GNN model
        const prediction = await trafficPredictionService.predictTraffic(latitude, longitude, liveTrafficData, weatherData, timeframe || 30 // Default 30 minutes ahead
        );
        // Save prediction to database
        const predictionRecord = {
            userId: req.user.uid,
            location: { latitude, longitude },
            prediction: prediction.flowData,
            confidence: prediction.confidence,
            eta: prediction.eta,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + timeframe * 60 * 1000),
        };
        await database_1.dbHelpers.create('predictions', predictionRecord);
        // Update stats
        await updatePredictionStats(req.user.uid);
        res.status(200).json({
            success: true,
            data: {
                prediction: prediction.flowData,
                confidence: prediction.confidence,
                eta: prediction.eta,
                liveTraffic: liveTrafficData,
                weather: weatherData,
                lastUpdated: new Date(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Traffic prediction error:', error);
        // Try fallback prediction if GNN model fails
        try {
            const fallbackPrediction = await trafficPredictionService.getFallbackPrediction(latitude, longitude);
            res.status(200).json({
                success: true,
                data: {
                    prediction: fallbackPrediction.flowData,
                    confidence: fallbackPrediction.confidence,
                    eta: fallbackPrediction.eta,
                    lastUpdated: new Date(),
                    isFallback: true,
                },
            });
        }
        catch (fallbackError) {
            logger_1.logger.error('Fallback prediction error:', fallbackError);
            throw new errorHandler_1.ApiError(500, 'Failed to generate traffic prediction');
        }
    }
};
exports.getTrafficPrediction = getTrafficPrediction;
/**
 * Get traffic statistics
 * @route GET /api/traffic-stats
 * @access Private
 */
const getTrafficStats = async (req, res) => {
    try {
        // Get user-specific stats
        const userStats = await database_1.dbHelpers.getById('stats', req.user.uid);
        // Get global stats
        const globalStats = await database_1.dbHelpers.getById('stats', 'global');
        res.status(200).json({
            success: true,
            data: {
                userStats: userStats || {
                    activePredictions: 0,
                    totalPredictions: 0,
                    accuracyRate: 0,
                    averageResponseTime: 0,
                },
                globalStats: globalStats || {
                    activePredictions: 0,
                    totalPredictions: 0,
                    accuracyRate: 0,
                    averageResponseTime: 0,
                },
                lastUpdated: new Date(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get traffic stats error:', error);
        throw new errorHandler_1.ApiError(500, 'Failed to retrieve traffic statistics');
    }
};
exports.getTrafficStats = getTrafficStats;
/**
 * Get historical traffic data
 * @route GET /api/traffic-history
 * @access Private
 */
const getHistoricalTraffic = async (req, res) => {
    const { latitude, longitude, startDate, endDate } = req.query;
    if (!latitude || !longitude) {
        throw new errorHandler_1.ApiError(400, 'Latitude and longitude are required');
    }
    try {
        // Convert string dates to Date objects
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 1 week ago
        const end = endDate ? new Date(endDate) : new Date();
        // Get historical data from service
        const historicalData = await trafficPredictionService.getHistoricalTraffic(parseFloat(latitude), parseFloat(longitude), start, end);
        res.status(200).json({
            success: true,
            data: {
                historicalData,
                location: { latitude, longitude },
                period: { start, end },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get historical traffic error:', error);
        throw new errorHandler_1.ApiError(500, 'Failed to retrieve historical traffic data');
    }
};
exports.getHistoricalTraffic = getHistoricalTraffic;
/**
 * Get traffic alerts
 * @route GET /api/traffic-alerts
 * @access Private
 */
const getTrafficAlerts = async (req, res) => {
    try {
        // Get user's active predictions
        // Query predictions by userId first
        const userPredictions = await database_1.dbHelpers.query('predictions', 'userId', '==', req.user.uid);
        // Then filter for active predictions in JavaScript
        const activePredictions = userPredictions.filter((pred) => {
            return pred.expiresAt && pred.expiresAt.toDate() > new Date();
        });
        // Get alerts from traffic API for each prediction location
        const alerts = [];
        for (const prediction of activePredictions) {
            const { latitude, longitude } = prediction.location;
            // Get traffic incidents from API
            const incidents = await trafficAPIService.getTrafficIncidents(latitude, longitude);
            // Get weather alerts
            const weatherAlerts = await weatherService.getWeatherAlerts(latitude, longitude);
            // Combine alerts
            if (incidents.length > 0 || weatherAlerts.length > 0) {
                alerts.push({
                    location: { latitude, longitude },
                    trafficIncidents: incidents,
                    weatherAlerts,
                    timestamp: new Date(),
                });
            }
        }
        // Get IMD nowcast warnings if available
        try {
            const imdWarnings = await weatherService.getIMDNowcastWarnings();
            if (imdWarnings.length > 0) {
                alerts.push({
                    type: 'IMD_NOWCAST',
                    warnings: imdWarnings,
                    timestamp: new Date(),
                });
            }
        }
        catch (imdError) {
            logger_1.logger.warn('Failed to get IMD warnings:', imdError);
        }
        res.status(200).json({
            success: true,
            data: {
                alerts,
                count: alerts.length,
                lastUpdated: new Date(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get traffic alerts error:', error);
        throw new errorHandler_1.ApiError(500, 'Failed to retrieve traffic alerts');
    }
};
exports.getTrafficAlerts = getTrafficAlerts;
/**
 * Update prediction statistics
 * @private
 */
async function updatePredictionStats(userId) {
    try {
        // Get user stats
        let userStats = await database_1.dbHelpers.getById('stats', userId);
        // Get active predictions count
        // First query for userId
        const userPredictions = await database_1.dbHelpers.query('predictions', 'userId', '==', userId);
        // Then filter for active predictions
        const activePredictions = userPredictions.filter((pred) => {
            return pred.expiresAt && new Date(pred.expiresAt) > new Date();
        });
        // Get total predictions count
        const totalPredictions = await database_1.dbHelpers.query('predictions', 'userId', '==', userId);
        // Calculate accuracy rate (simplified for now)
        const accuracyRate = 0.95; // Placeholder - would be calculated based on actual vs predicted
        // Calculate average response time (simplified for now)
        const averageResponseTime = 0.8; // Placeholder - would be calculated from actual response times
        // Update user stats
        const updatedUserStats = {
            userId,
            activePredictions: activePredictions.length,
            totalPredictions: totalPredictions.length,
            accuracyRate,
            averageResponseTime,
            lastUpdated: new Date(),
        };
        await database_1.dbHelpers.update('stats', userId, updatedUserStats);
        // Update global stats (simplified)
        let globalStats = await database_1.dbHelpers.getById('stats', 'global');
        if (globalStats) {
            // Type assertion to avoid TypeScript errors
            const typedGlobalStats = globalStats;
            typedGlobalStats.activePredictions += 1;
            typedGlobalStats.totalPredictions += 1;
            typedGlobalStats.lastUpdated = new Date();
            await database_1.dbHelpers.update('stats', 'global', typedGlobalStats);
        }
        else {
            // Create global stats if not exists
            await database_1.dbHelpers.create('stats', {
                id: 'global',
                activePredictions: 1,
                totalPredictions: 1,
                accuracyRate: 0.95,
                averageResponseTime: 0.8,
                lastUpdated: new Date(),
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Update prediction stats error:', error);
    }
}
//# sourceMappingURL=trafficController.js.map