const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { initializeFirebase } = require('./utils/firebase-init');
const logger = require('./utils/logger');
const { isDev, apiConfig, trafficConfig } = require('./utils/config');
const { authenticateUser } = require('./middleware/auth-middleware');
const { asyncHandler, notFound, badRequest } = require('./utils/error-handler');
const db = require('./utils/database');
const mapUtils = require('./utils/map-utils');
const { validateTrafficIncident, isValidCityId, validateTimeParams } = require('./utils/map-validation');

// Initialize Firebase Admin SDK
const firebaseApp = initializeFirebase();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for development
const mockCities = [
  { id: 'mumbai', name: 'Mumbai', center: [19.0760, 72.8777] },
  { id: 'delhi', name: 'Delhi', center: [28.7041, 77.1025] },
  { id: 'bangalore', name: 'Bangalore', center: [12.9716, 77.5946] },
  { id: 'chennai', name: 'Chennai', center: [13.0827, 80.2707] },
  { id: 'hyderabad', name: 'Hyderabad', center: [17.3850, 78.4867] },
  { id: 'kolkata', name: 'Kolkata', center: [22.5726, 88.3639] },
  { id: 'pune', name: 'Pune', center: [18.5204, 73.8567] },
  { id: 'ahmedabad', name: 'Ahmedabad', center: [23.0225, 72.5714] }
];

const mockTrafficLevels = ['low', 'medium', 'high'];
const mockTrafficDetails = [
  'Heavy congestion due to accident',
  'Moderate traffic due to construction',
  'Slight delay due to peak hours',
  'Severe congestion due to roadwork',
  'Moderate traffic due to event nearby',
  'Heavy traffic due to weather conditions',
  'Road closure causing delays',
  'Normal traffic flow'
];

// Helper function to generate random traffic data
const generateTrafficData = (cityId, count = 5) => {
  const city = mockCities.find(c => c.id === cityId) || mockCities[0];
  const result = [];
  
  for (let i = 0; i < count; i++) {
    // Generate coordinates near the city center
    const lat = city.center[0] + (Math.random() * 0.1 - 0.05);
    const lng = city.center[1] + (Math.random() * 0.1 - 0.05);
    
    // Generate random traffic level
    const levelIndex = Math.floor(Math.random() * mockTrafficLevels.length);
    const level = mockTrafficLevels[levelIndex];
    
    // Generate random details
    const detailsIndex = Math.floor(Math.random() * mockTrafficDetails.length);
    const details = mockTrafficDetails[detailsIndex];
    
    // Generate random confidence and ETA based on traffic level
    let confidence, eta;
    switch (level) {
      case 'high':
        confidence = Math.floor(Math.random() * 10) + 90; // 90-99%
        eta = Math.floor(Math.random() * 20) + 25; // 25-45 mins
        break;
      case 'medium':
        confidence = Math.floor(Math.random() * 15) + 80; // 80-94%
        eta = Math.floor(Math.random() * 15) + 10; // 10-25 mins
        break;
      case 'low':
        confidence = Math.floor(Math.random() * 10) + 85; // 85-94%
        eta = Math.floor(Math.random() * 10) + 5; // 5-15 mins
        break;
      default:
        confidence = 90;
        eta = 15;
    }
    
    // Generate a random location name
    const locations = [
      'Main Street', 'Highway Junction', 'Central Avenue', 'Market Road',
      'Business District', 'Tech Park', 'University Road', 'Mall Entrance',
      'Railway Station', 'Airport Road', 'Hospital Lane', 'Stadium Approach'
    ];
    const locationIndex = Math.floor(Math.random() * locations.length);
    const location = `${city.name} ${locations[locationIndex]}`;
    
    result.push({
      id: uuidv4(),
      location,
      coordinates: [lat, lng],
      level,
      confidence: `${confidence}%`,
      eta: `${eta} mins`,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  return result;
};

// Routes

// Get all supported cities
app.get('/api/cities', asyncHandler(async (req, res) => {
  // In production, fetch from Firestore
  if (process.env.NODE_ENV === 'production') {
    const cities = await db.queryDocuments('cities');
    return res.json({ cities });
  }
  
  // In development, return mock data
  logger.info('Returning mock cities data');
  res.json({ cities: mockCities });
}));

// Get live traffic data for a city
app.get('/api/traffic/live/:cityId', asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  
  if (!cityId) {
    throw badRequest('City ID is required');
  }
  
  if (!isValidCityId(cityId)) {
    throw badRequest(`Invalid city ID: ${cityId}`);
  }
  
  // In production, fetch from Firestore
  if (process.env.NODE_ENV === 'production') {
    const trafficData = await db.getTrafficData(cityId, 'live');
    
    // Enhance traffic data with colors
    if (trafficData && Array.isArray(trafficData)) {
      trafficData = trafficData.map(item => ({
        ...item,
        color: mapUtils.getTrafficLevelColor(item.level)
      }));
    }
    
    logger.info(`Retrieved live traffic data for city: ${cityId}`);
    return res.json({ trafficData });
  }
  
  // In development, return mock data with colors
  const trafficData = generateTrafficData(cityId, 8).map(item => ({
    ...item,
    color: mapUtils.getTrafficLevelColor(item.level)
  }));
  
  logger.info(`Generated mock live traffic data for city: ${cityId}`);
  res.json({ trafficData });
}));

// Get predicted traffic data for a city
app.get('/api/traffic/predicted/:cityId', asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  const { hours } = req.query;
  const hoursAhead = parseInt(hours) || 1;
  
  // Validate parameters
  if (!cityId) {
    throw badRequest('City ID is required');
  }
  
  if (!isValidCityId(cityId)) {
    throw badRequest(`Invalid city ID: ${cityId}`);
  }
  
  // Validate hoursAhead
  const timeErrors = validateTimeParams({ hoursAhead });
  if (timeErrors.length > 0) {
    throw badRequest(timeErrors.join(', '));
  }
  
  // In production, fetch from Firestore
  if (process.env.NODE_ENV === 'production') {
    const trafficData = await db.getTrafficData(cityId, 'predicted', { hoursAhead });
    
    // Enhance traffic data with colors and ETAs
    if (trafficData && Array.isArray(trafficData)) {
      trafficData = trafficData.map(item => {
        const eta = item.distance ? mapUtils.calculateETA(item.distance, item.level) : item.eta;
        
        return {
          ...item,
          color: mapUtils.getTrafficLevelColor(item.level),
          eta: eta
        };
      });
    }
    
    logger.info(`Retrieved predicted traffic data for city: ${cityId}, hours ahead: ${hoursAhead}`);
    return res.json({ trafficData });
  }
  
  // In development, return mock data with colors, ETAs and slightly lower confidence
  const trafficData = generateTrafficData(cityId, 8).map(item => {
    const eta = `${parseInt(item.eta) + 5} mins`;
    
    return {
      ...item,
      confidence: `${parseInt(item.confidence) - 5}%`,
      eta: eta,
      color: mapUtils.getTrafficLevelColor(item.level),
      predictedFor: new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString()
    };
  });
  
  logger.info(`Generated mock predicted traffic data for city: ${cityId}, hours ahead: ${hoursAhead}`);
  res.json({ trafficData });
}));

// Get historical traffic data for a city
app.get('/api/traffic/historical/:cityId', asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  const { days } = req.query;
  const daysBack = parseInt(days) || 1;
  
  // Validate parameters
  if (!cityId) {
    throw badRequest('City ID is required');
  }
  
  if (!isValidCityId(cityId)) {
    throw badRequest(`Invalid city ID: ${cityId}`);
  }
  
  // Validate daysBack
  const timeErrors = validateTimeParams({ daysBack });
  if (timeErrors.length > 0) {
    throw badRequest(timeErrors.join(', '));
  }
  
  // In production, fetch from Firestore
  if (process.env.NODE_ENV === 'production') {
    const trafficData = await db.getTrafficData(cityId, 'historical', { daysBack });
    
    // Enhance traffic data with colors
    if (trafficData && Array.isArray(trafficData)) {
      trafficData = trafficData.map(item => ({
        ...item,
        color: mapUtils.getTrafficLevelColor(item.level)
      }));
    }
    
    logger.info(`Retrieved historical traffic data for city: ${cityId}, days back: ${daysBack}`);
    return res.json({ trafficData });
  }
  
  // In development, return mock data with historical timestamps and colors
  const trafficData = generateTrafficData(cityId, 15).map(item => {
    const hoursAgo = Math.floor(Math.random() * 24 * daysBack);
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    const duration = Math.floor(Math.random() * 30) + 10;
    
    return {
      ...item,
      timestamp,
      color: mapUtils.getTrafficLevelColor(item.level),
      duration: `${duration} mins`,
      actualTime: `${parseInt(item.eta.split(' ')[0]) + Math.floor(Math.random() * 10 - 5)} mins`
    };
  });
  
  logger.info(`Generated mock historical traffic data for city: ${cityId}, days back: ${daysBack}`);
  res.json({ trafficData });
}));

// Get traffic metrics
app.get('/api/traffic/metrics', asyncHandler(async (req, res) => {
  // In production, fetch from Firestore
  if (process.env.NODE_ENV === 'production') {
    const metrics = await db.getTrafficMetrics();
    
    if (metrics) {
      logger.info('Retrieved traffic metrics from database');
      return res.json({ metrics });
    }
    
    throw notFound('Traffic metrics');
  }
  
  // In development, return mock metrics
  const metrics = {
    lastUpdated: new Date().toISOString(),
    systemStatus: 'Active',
    activePredictions: 1247,
    activeCities: mockCities.length,
    accuracyRate: '94.7%',
    responseTime: '0.8s',
    criticalAlerts: 3
  };
  
  logger.info('Generated mock traffic metrics');
  res.json({ metrics });
}));

// Create a new traffic incident report
app.post('/api/traffic/report', asyncHandler(async (req, res) => {
  const { cityId, location, coordinates, level, details, type = 'congestion', severity = 'moderate' } = req.body;
  
  // Validate request body
  const validationErrors = validateTrafficIncident(req.body);
  if (validationErrors.length > 0) {
    throw badRequest(validationErrors.join(', '));
  }
  
  // Determine traffic impact based on incident type and severity
  let trafficImpact = 'moderate';
  if (type === 'accident' || type === 'roadClosure') {
    trafficImpact = severity === 'high' || severity === 'severe' ? 'severe' : 'heavy';
  } else if (type === 'construction') {
    trafficImpact = 'heavy';
  } else if (type === 'event') {
    trafficImpact = 'moderate';
  }
  
  const report = {
    id: uuidv4(),
    cityId,
    location,
    coordinates,
    level,
    type,
    severity,
    trafficImpact,
    impactColor: mapUtils.getTrafficLevelColor(trafficImpact),
    details: details || 'No details provided',
    timestamp: new Date().toISOString(),
    status: 'pending',
    reportedBy: req.headers['x-user-id'] || 'anonymous'
  };
  
  // In production, save to Firestore
  if (process.env.NODE_ENV === 'production') {
    await db.reportTrafficIncident(report);
    logger.info(`Created new traffic report with ID: ${report.id}`);
  } else {
    logger.info(`Created mock traffic report with ID: ${report.id}`);
  }
  
  res.status(201).json({ report });
}));

// Handle 404
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

// Export the serverless function
module.exports.handler = serverless(app);