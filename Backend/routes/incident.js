const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const winston = require('winston');
const { authenticateToken } = require('../middleware/auth');
const cheerio = require('cheerio'); // For web scraping

const router = express.Router();
const prisma = new PrismaClient();

// Removed cache - using real-time data only

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/incident.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configuration
const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://localhost:5000';
const PYTHON_INCIDENT_URL = process.env.PYTHON_INCIDENT_URL || 'http://localhost:5001/predict_incident';
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_INCIDENTS_BASE = process.env.TOMTOM_INCIDENTS_BASE || 'https://api.tomtom.com/traffic/services/5';

// Removed incident cache - using real-time data only

// ML Accuracy validation function
const validateMLAccuracy = (prediction) => {
  return prediction && 
         prediction.accuracy_percentage && 
         prediction.accuracy_percentage >= 93 && // >93% accuracy requirement
         prediction.confidence && 
         prediction.confidence >= 0.85;
};

// Removed INDIAN_CITIES mock data - using only geocoding API

// Utility functions
const validateCoordinates = (lat, lon) => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      logger.warn(`Retry attempt ${i + 1} after ${delay}ms delay`);
    }
  }
};

const getCurrentLocation = async () => {
  try {
    // IP-based geolocation only
    const response = await axios.get('http://ipapi.co/json/', { timeout: 3000 });
    if (response.data.latitude && response.data.longitude) {
      return {
        lat: response.data.latitude,
        lon: response.data.longitude,
        city: response.data.city,
        country: response.data.country_name
      };
    }
    throw new Error('No location data available');
  } catch (error) {
    logger.warn('IP geolocation failed');
    return null;
  }
};

const getMLPrediction = async (location, lat, lon, conditions = {}, basicInfo = {}) => {
  try {
    logger.info(`Requesting real-time ML prediction for ${location} at [${lat}, ${lon}]`);

    // Enhanced ML request with accuracy requirements
    const mlPayload = {
      location,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      conditions: {
        weather: conditions.weather || 'clear',
        traffic: conditions.traffic || 'moderate'
      },
      basic_info: {
         time: conditions.time || new Date().toTimeString().slice(0, 5),
         day: conditions.day || new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
       }
    };

    // Use Python ML server for real-time predictions
    const response = await retryWithBackoff(async () => {
      return await axios.post(PYTHON_INCIDENT_URL, mlPayload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': '2.0',
          'User-Agent': 'TrafficAI/1.0'
        }
      });
    });

    const prediction = response.data;
    
    // Validate ML accuracy requirement
    if (!validateMLAccuracy(prediction)) {
      logger.warn('ML prediction below accuracy threshold', {
        accuracy: prediction.accuracy_percentage,
        confidence: prediction.confidence,
        required_accuracy: 93
      });
      throw new Error('Prediction accuracy below 93% threshold');
    }

    logger.info('High-accuracy incident prediction received', {
      accuracy: prediction.accuracy_percentage,
      confidence: prediction.confidence,
      model: prediction.model_info?.name
    });

    return prediction;
  } catch (error) {
    logger.error('High-accuracy ML prediction failed:', error.message);
    
    // Reject prediction if accuracy requirement not met - NO FALLBACKS
    throw new Error(`High-accuracy incident prediction unavailable: ${error.message}`);
  }
};

// Removed fallback prediction - using only real TomTom data

const getTomTomIncidents = async (city) => {
  if (!TOMTOM_API_KEY || TOMTOM_API_KEY === 'your_tomtom_api_key') {
    return [];
  }

  try {
    // Use TomTom geocoding to get city coordinates
    const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(city)}.json?key=${TOMTOM_API_KEY}&countrySet=IN&limit=1`;
    const geocodeResponse = await axios.get(geocodeUrl, { timeout: 5000 });
    
    if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
      logger.warn(`No geocoding results found for city: ${city}`);
      return [];
    }

    const location = geocodeResponse.data.results[0];
    const { lat, lon } = location.position;
    
    // Create a bounding box around the city (approximately 20km radius)
    const offset = 0.18; // roughly 20km
    const boundingBox = `${lat - offset},${lon - offset},${lat + offset},${lon + offset}`;
    
    const incidentUrl = `https://api.tomtom.com/traffic/services/4/incidentDetails/s3/${boundingBox}/10/-1/json?key=${TOMTOM_API_KEY}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory}}}}`;
    
    const response = await axios.get(incidentUrl, { timeout: 5000 });
    return response.data.incidents || [];
  } catch (error) {
    logger.error('TomTom incidents API failed:', error.message);
    return [];
  }
};

// Routes

/**
 * POST /api/incident/predict
 * Predict incident severity using Python ML model
 */
router.post('/predict', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { location, conditions, basic_info, use_current_location = false } = req.body;
    
    let lat, lon, locationName;
    
    // Handle Current Location button functionality
    if (use_current_location) {
      try {
        const currentLoc = await getCurrentLocation();
        lat = currentLoc.lat;
        lon = currentLoc.lon;
        locationName = location || currentLoc.city || 'Current Location';
        logger.info('Using current location for incident prediction', { lat, lon, city: currentLoc.city });
      } catch (locError) {
        return res.status(400).json({
          error: 'Failed to get current location',
          message: 'Please provide coordinates manually or check location services'
        });
      }
    } else {
      // Require location to be provided if not using current location
      if (!location) {
        return res.status(400).json({
          error: 'Location is required',
          message: 'Please provide a location or use current location'
        });
      }
      
      locationName = location;
      
      // Use TomTom geocoding service for location coordinates
      try {
        const geocodeUrl = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json?key=${TOMTOM_API_KEY}&countrySet=IN&limit=1`;
        const geocodeResponse = await axios.get(geocodeUrl, { timeout: 5000 });
        
        if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
          const result = geocodeResponse.data.results[0];
          lat = result.position.lat;
          lon = result.position.lon;
          logger.info(`Geocoded ${location} to coordinates: [${lat}, ${lon}]`);
        } else {
          return res.status(400).json({
            error: 'Location not found',
            message: `Could not find coordinates for location: ${location}`
          });
        }
      } catch (geocodeError) {
        logger.error('Geocoding failed:', geocodeError.message);
        return res.status(400).json({
          error: 'Geocoding failed',
          message: 'Unable to find coordinates for the specified location. Please try a different location or use current location.'
        });
      }
    }
    
    if (!validateCoordinates(lat, lon)) {
      return res.status(400).json({
        error: 'Invalid coordinates obtained',
        message: 'Location coordinates are invalid'
      });
    }
    
    logger.info(`High-accuracy incident prediction request for ${locationName} at [${lat}, ${lon}]`);
    
    // Get high-accuracy ML prediction (>93%)
    let prediction;
    try {
      prediction = await getMLPrediction(locationName, lat, lon, conditions, basic_info);
    } catch (mlError) {
      return res.status(503).json({
        error: 'High-accuracy prediction service unavailable',
        message: 'ML model accuracy must be >93%. Service temporarily unavailable.',
        details: {
          required_accuracy: 0.93,
          service_status: 'unavailable',
          error: mlError.message
        },
        retry_after: 300
      });
    }
    
    // Get real-time incidents from TomTom for context
    const realTimeIncidents = await getTomTomIncidents(locationName);
    
    // Save validated prediction to database
    try {
      await prisma.incidentPrediction.create({
        data: {
          location: locationName,
          lat,
          lon,
          conditions: JSON.stringify(conditions || {}),
          basicInfo: JSON.stringify(basic_info || {}),
          predictedSeverity: prediction.predicted_severity,
          probability: prediction.probability,
          updatedAt: new Date(),
          createdAt: new Date()
        }
      });
    } catch (dbError) {
      logger.warn('Database save failed:', dbError.message);
    }
    
    // Validate prediction object
    if (!prediction || !prediction.predicted_severity) {
      logger.error('Invalid prediction object received:', prediction);
      return res.status(500).json({
        error: 'Prediction processing failed',
        message: 'Invalid prediction data received from ML service'
      });
    }

    const responseData = {
      success: true,
      location: locationName,
      coordinates: { lat, lon },
      prediction: {
        severity: prediction.predicted_severity,
        probability: Math.round((prediction.probability || 0) * 100),
        risk_factors: [],
        description: `${prediction.predicted_severity} risk of traffic incidents at ${locationName} due to current conditions`,
        accuracy_rate: prediction.accuracy_percentage,
        confidence_score: prediction.confidence,
        uncertainty_bounds: prediction.uncertainty || {}
      },
      context: {
        real_time_incidents: realTimeIncidents.length,
        nearby_risks: realTimeIncidents.slice(0, 3).map(incident => ({
          type: incident.properties?.iconCategory || 'unknown',
          severity: incident.properties?.magnitudeOfDelay || 'unknown',
          description: incident.properties?.events?.[0]?.description || 'Traffic incident',
          distance: 'nearby'
        })),
        weather_conditions: conditions || {},
        road_conditions: basic_info || {}
      },
      visualization: {
        risk_level: prediction.predicted_severity,
        confidence_percentage: Math.round(prediction.probability * 100),
        risk_factors: [],
        severity_color: getSeverityColor(prediction.predicted_severity),
        recommendations: generateRecommendations(prediction.predicted_severity, []),
        charts_data: {
            probability_distribution: prediction.class_probabilities || {},
          risk_timeline: prediction.risk_timeline || [],
          factor_importance: prediction.factor_importance || {}
        }
      },
      model_info: {
        model_name: prediction.model_info?.name || 'IncidentNet-v2',
        model_version: prediction.model_info?.version || '2.0',
        algorithm: prediction.model_info?.algorithm || 'Deep Neural Network',
        accuracy: prediction.accuracy_percentage,
        training_data_size: prediction.model_info?.training_size,
        last_trained: prediction.model_info?.last_trained,
        features_used: prediction.model_info?.features || []
      },
      validation: {
        accuracy_verified: prediction.accuracy_percentage >= 93,
        confidence_verified: prediction.confidence >= 0.85,
        real_time_validated: realTimeIncidents.length > 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        response_time: `${Date.now() - startTime}ms`,
        source: 'ML_Model_Validated',
        api_version: '2.0'
      }
    };
    
    res.json(responseData);
    
  } catch (error) {
    logger.error('Incident prediction error:', error);
    res.status(500).json({
      error: 'Incident prediction failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/incident/current
 * Get current location and predict incident risk
 */
router.get('/current', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get current location
    const currentLocation = await getCurrentLocation();
    
    // Get current conditions (simplified)
    const conditions = {
      weather: 'clear', // Could be enhanced with weather API
      traffic: 'moderate',
      time_of_day: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'
    };
    
    const basicInfo = {
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' })
    };
    
    // Get ML prediction for current location
    const prediction = await getMLPrediction(
      currentLocation.city,
      currentLocation.lat,
      currentLocation.lon,
      conditions,
      basicInfo
    );
    
    // Get real-time incidents
    const realTimeIncidents = await getTomTomIncidents(currentLocation.city);
    
    const responseData = {
      currentLocation,
      prediction: {
        severity: prediction.prediction.severity,
        confidence: prediction.confidence,
        description: prediction.prediction.description,
        accuracy: prediction.accuracy_percentage,
        riskFactors: prediction.prediction.risk_factors || []
      },
      conditions,
      realTimeData: {
        incidents: realTimeIncidents.length,
        nearbyRisks: realTimeIncidents.slice(0, 5).map(incident => ({
          type: incident.properties?.iconCategory || 'unknown',
          severity: incident.properties?.magnitudeOfDelay || 'unknown',
          description: incident.properties?.events?.[0]?.description || 'Traffic incident',
          coordinates: incident.geometry?.coordinates || []
        }))
      },
      visualization: {
        riskLevel: prediction.prediction.severity,
        confidenceScore: Math.round(prediction.confidence * 100),
        alertColor: getSeverityColor(prediction.prediction.severity),
        recommendations: generateRecommendations(prediction.prediction.severity, prediction.prediction.risk_factors || [])
      },
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
        source: 'current_location_api'
      }
    };
    
    res.json(responseData);
    
  } catch (error) {
    logger.error('Current location incident prediction error:', error);
    res.status(500).json({
      error: 'Current location prediction failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/incident/history
 * Get historical incident predictions
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, location, severity } = req.query;
    
    const whereClause = {};
    if (location) {
      whereClause.location = {
        contains: location,
        mode: 'insensitive'
      };
    }
    if (severity) {
      whereClause.predictedSeverity = severity;
    }
    
    const predictions = await prisma.incidentPrediction.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit),
      select: {
        location: true,
        lat: true,
        lon: true,
        predictedSeverity: true,
        probability: true,
        conditions: true,
        basicInfo: true,
        updatedAt: true,
        createdAt: true
      }
    });
    
    const analytics = {
      total: predictions.length,
      severityDistribution: {
        low: predictions.filter(p => p.predictedSeverity === 'low').length,
        medium: predictions.filter(p => p.predictedSeverity === 'medium').length,
        high: predictions.filter(p => p.predictedSeverity === 'high').length,
        critical: predictions.filter(p => p.predictedSeverity === 'critical').length
      },
      averageConfidence: predictions.length > 0 
        ? (predictions.reduce((sum, p) => sum + p.probability, 0) / predictions.length).toFixed(2)
        : 0,
      locations: [...new Set(predictions.map(p => p.location))].slice(0, 10)
    };
    
    res.json({
      predictions,
      analytics,
      metadata: {
        timestamp: new Date().toISOString(),
        filters: { location, severity, limit },
        source: 'historical_data'
      }
    });
    
  } catch (error) {
    logger.error('Historical data retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve historical data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/incident/cache/stats
 * Get cache statistics
 */
// Removed cache stats route - no longer using cache

// Helper functions
const generateRecommendations = (severity, riskFactors) => {
  const recommendations = [];
  
  switch (severity) {
    case 'critical':
      recommendations.push('Avoid this route if possible');
      recommendations.push('Consider alternative transportation');
      recommendations.push('Allow extra travel time');
      break;
    case 'high':
      recommendations.push('Exercise extreme caution');
      recommendations.push('Reduce speed and increase following distance');
      recommendations.push('Monitor traffic updates frequently');
      break;
    case 'medium':
      recommendations.push('Drive carefully and stay alert');
      recommendations.push('Check for alternative routes');
      break;
    default: // low
      recommendations.push('Proceed normally but stay alert');
      recommendations.push('Check traffic updates before departure');
  }
  
  // Add specific recommendations based on risk factors
  if (riskFactors.includes('rain weather') || riskFactors.includes('fog weather') || riskFactors.includes('snow weather')) {
    recommendations.push('Use headlights and maintain safe distance');
  }
  
  if (riskFactors.includes('construction nearby')) {
    recommendations.push('Watch for construction zones and workers');
  }
  
  if (riskFactors.includes('special event')) {
    recommendations.push('Expect increased traffic and pedestrians');
  }
  
  if (riskFactors.includes('rush hour')) {
    recommendations.push('Consider adjusting travel time if possible');
  }
  
  return recommendations;
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'critical': return '#dc2626'; // red-600
    case 'high': return '#ea580c'; // orange-600
    case 'medium': return '#d97706'; // amber-600
    case 'low': return '#16a34a'; // green-600
    default: return '#3b82f6'; // blue-500
  }
};

module.exports = router;