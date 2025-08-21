"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const incidentPredictionService_1 = require("../services/incidentPredictionService");
const smsService_1 = require("../services/smsService");
const weatherService_1 = require("../services/weatherService");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
const weatherService = new weatherService_1.WeatherService();
// Store for recent predictions (in production, use database)
let recentPredictions = [];
let predictionStats = {
    totalPredictions: 0,
    highRiskIncidents: 0,
    averageAccuracy: 95.7,
    responseTime: 245
};
// POST /api/incidents/predict - Predict incident severity
router.post('/predict', async (req, res) => {
    try {
        const predictionData = req.body;
        logger_1.logger.info('Received prediction request', { data: predictionData });
        // Convert string inputs to numbers for the prediction service
        const factors = {
            age: parseInt(predictionData.driverAge),
            weather: parseInt(predictionData.weather),
            light: parseInt(predictionData.lightConditions),
            roadConditions: parseInt(predictionData.roadSurface),
            speed: parseInt(predictionData.speedLimit),
            vehicleType: parseInt(predictionData.vehicleType),
            vehicleAge: parseInt(predictionData.vehicleAge),
            engineCapacity: parseInt(predictionData.engineCC),
            gender: parseInt(predictionData.gender),
            dayOfWeek: parseInt(predictionData.dayOfWeek),
            policeAttendance: parseInt(predictionData.policeAttendance)
        };
        logger_1.logger.info('Incident prediction request received', { factors });
        // Get prediction from service
        const prediction = incidentPredictionService_1.incidentPredictionService.predictIncident(factors);
        logger_1.logger.info('Incident prediction completed', { prediction });
        // Store prediction for history
        const predictionRecord = {
            ...prediction,
            timestamp: new Date().toISOString(),
            location: {
                latitude: parseFloat(predictionData.latitude),
                longitude: parseFloat(predictionData.longitude)
            },
            factors: predictionData
        };
        recentPredictions.unshift(predictionRecord);
        if (recentPredictions.length > 50) {
            recentPredictions = recentPredictions.slice(0, 50);
        }
        // Update stats
        predictionStats.totalPredictions++;
        if (prediction.severity >= 2) {
            predictionStats.highRiskIncidents++;
        }
        res.json({
            severity: prediction.severity,
            confidence: prediction.confidence,
            risk_level: prediction.riskLevel,
            timestamp: predictionRecord.timestamp
        });
    }
    catch (error) {
        logger_1.logger.error('Error in incident prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to predict incident'
        });
    }
});
// GET /api/incidents/history - Get recent predictions
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const limitedPredictions = recentPredictions.slice(0, limit);
        logger_1.logger.info('Retrieved prediction history', { count: limitedPredictions.length });
        res.json(limitedPredictions);
    }
    catch (error) {
        logger_1.logger.error('Error retrieving prediction history', { error });
        res.status(500).json({
            error: 'Failed to retrieve prediction history',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/incidents/stats - Get prediction statistics
router.get('/stats', (req, res) => {
    try {
        logger_1.logger.info('Retrieved prediction stats', { stats: predictionStats });
        res.json(predictionStats);
    }
    catch (error) {
        logger_1.logger.error('Error retrieving prediction stats', { error });
        res.status(500).json({
            error: 'Failed to retrieve prediction stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/incidents/sms - Send SMS alert
router.post('/sms', async (req, res) => {
    try {
        const smsData = req.body;
        logger_1.logger.info('SMS alert request received', { phoneNumber: req.body.phoneNumber?.substring(0, 3) + '***' });
        // Map numeric severity to string severity
        const severityMap = {
            1: 'LOW',
            2: 'MEDIUM',
            3: 'HIGH',
            4: 'CRITICAL'
        };
        const smsResponse = await smsService_1.smsService.sendIncidentAlert({
            phoneNumber: smsData.phoneNumber,
            message: `Incident Alert - Severity: ${smsData.severity}, Confidence: ${smsData.confidence}%`,
            severity: severityMap[smsData.severity] || 'MEDIUM',
            location: {
                latitude: smsData.location.latitude,
                longitude: smsData.location.longitude
            }
        });
        logger_1.logger.info('SMS alert processed', { success: smsResponse.success });
        res.json({
            success: true,
            message: 'SMS alert sent successfully',
            messageId: smsResponse.messageId
        });
    }
    catch (error) {
        logger_1.logger.error('Error sending SMS alert:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send SMS alert'
        });
    }
});
// GET /api/incidents/weather - Get weather data for location
router.get('/weather', async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }
        const weatherData = await weatherService.getWeatherData(parseFloat(latitude), parseFloat(longitude));
        res.json({
            success: true,
            data: weatherData
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching weather data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch weather data'
        });
    }
});
exports.default = router;
//# sourceMappingURL=incidentRoutes.js.map