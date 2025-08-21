import express from 'express';
import { Request, Response } from 'express';
import { incidentPredictionService } from '../services/incidentPredictionService';
import { smsService } from '../services/smsService';
import { WeatherService } from '../services/weatherService';
import { logger } from '../utils/logger';

const router = express.Router();
const weatherService = new WeatherService();

// Interface for prediction request
interface PredictionRequest {
  policeAttendance: string;
  driverAge: string;
  vehicleType: string;
  vehicleAge: string;
  engineCC: string;
  dayOfWeek: string;
  weather: string;
  lightConditions: string;
  roadSurface: string;
  gender: string;
  speedLimit: string;
  latitude: string;
  longitude: string;
}

// Interface for SMS request
interface SMSRequest {
  phoneNumber: string;
  severity: number;
  confidence: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

// Store for recent predictions (in production, use database)
let recentPredictions: any[] = [];
let predictionStats = {
  totalPredictions: 0,
  highRiskIncidents: 0,
  averageAccuracy: 95.7,
  responseTime: 245
};

// POST /api/incidents/predict - Predict incident severity
router.post('/predict', async (req: Request, res: Response) => {
  try {
    const predictionData: PredictionRequest = req.body;
    
    logger.info('Received prediction request', { data: predictionData });
    
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
    
    logger.info('Incident prediction request received', { factors });
    
    // Get prediction from service
    const prediction = incidentPredictionService.predictIncident(factors);
    
    logger.info('Incident prediction completed', { prediction });
    
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
    
  } catch (error) {
    logger.error('Error in incident prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict incident'
    });
  }
});

// GET /api/incidents/history - Get recent predictions
router.get('/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const limitedPredictions = recentPredictions.slice(0, limit);
    
    logger.info('Retrieved prediction history', { count: limitedPredictions.length });
    
    res.json(limitedPredictions);
  } catch (error) {
    logger.error('Error retrieving prediction history', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve prediction history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/incidents/stats - Get prediction statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    logger.info('Retrieved prediction stats', { stats: predictionStats });
    res.json(predictionStats);
  } catch (error) {
    logger.error('Error retrieving prediction stats', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve prediction stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/incidents/sms - Send SMS alert
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const smsData: SMSRequest = req.body;
    
    logger.info('SMS alert request received', { phoneNumber: req.body.phoneNumber?.substring(0, 3) + '***' });
    
    // Map numeric severity to string severity
     const severityMap: { [key: number]: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } = {
       1: 'LOW',
       2: 'MEDIUM', 
       3: 'HIGH',
       4: 'CRITICAL'
     };
     
     const smsResponse = await smsService.sendIncidentAlert({
        phoneNumber: smsData.phoneNumber,
        message: `Incident Alert - Severity: ${smsData.severity}, Confidence: ${smsData.confidence}%`,
        severity: severityMap[smsData.severity] || 'MEDIUM',
        location: {
          latitude: smsData.location.latitude,
          longitude: smsData.location.longitude
        }
      });
    
    logger.info('SMS alert processed', { success: smsResponse.success });
    
    res.json({
      success: true,
      message: 'SMS alert sent successfully',
      messageId: smsResponse.messageId
    });
    
  } catch (error) {
    logger.error('Error sending SMS alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS alert'
    });
  }
});

// GET /api/incidents/weather - Get weather data for location
router.get('/weather', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    const weatherData = await weatherService.getWeatherData(
      parseFloat(latitude as string),
      parseFloat(longitude as string)
    );
    
    res.json({
      success: true,
      data: weatherData
    });
    
  } catch (error) {
    logger.error('Error fetching weather data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data'
    });
  }
});

export default router;