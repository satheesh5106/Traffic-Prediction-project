/**
 * API Endpoints for Traffic Prediction and Route Optimization
 * 
 * This file contains the implementation of all API endpoints for the Traffic Prediction
 * and Route Optimization features of the application.
 */

const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { initializeFirebase } = require('./utils/firebase-init');
const logger = require('./utils/logger');
const { isDev, apiConfig, trafficConfig, routeConfig } = require('./utils/config');
const { authenticateUser } = require('./middleware/auth-middleware');
const { asyncHandler, notFound, badRequest } = require('./utils/error-handler');
const db = require('./utils/database');
const mapUtils = require('./utils/map-utils');
const { 
  validateTrafficIncident, 
  isValidCityId, 
  validateTimeParams,
  validateRouteParams, 
  areValidCoordinates 
} = require('./utils/map-validation');

// Initialize Firebase Admin SDK
initializeFirebase();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: apiConfig.rateLimit.windowMs,
  max: apiConfig.rateLimit.max,
  message: { error: 'Too many requests, please try again later.' }
});

app.use(limiter);

// Mock data for development
const mockCities = [
  { id: 'blr', name: 'Bangalore', coordinates: { lat: 12.9716, lng: 77.5946 } },
  { id: 'mum', name: 'Mumbai', coordinates: { lat: 19.0760, lng: 72.8777 } },
  { id: 'del', name: 'Delhi', coordinates: { lat: 28.7041, lng: 77.1025 } },
  { id: 'chn', name: 'Chennai', coordinates: { lat: 13.0827, lng: 80.2707 } },
  { id: 'hyd', name: 'Hyderabad', coordinates: { lat: 17.3850, lng: 78.4867 } },
  { id: 'kol', name: 'Kolkata', coordinates: { lat: 22.5726, lng: 88.3639 } },
  { id: 'pun', name: 'Pune', coordinates: { lat: 18.5204, lng: 73.8567 } },
  { id: 'ahm', name: 'Ahmedabad', coordinates: { lat: 23.0225, lng: 72.5714 } }
];

// Generate mock traffic data
function generateTrafficData(cityId, segments) {
  const city = mockCities.find(c => c.id === cityId);
  if (!city) return [];
  
  const data = [];
  const trafficLevels = ['light', 'moderate', 'heavy', 'severe'];
  
  for (let i = 0; i < segments; i++) {
    // Generate coordinates near the city center
    const lat = city.coordinates.lat + (Math.random() - 0.5) * 0.1;
    const lng = city.coordinates.lng + (Math.random() - 0.5) * 0.1;
    
    // Random traffic level
    const level = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
    
    // Generate segment data
    data.push({
      id: `${cityId}-seg-${i}`,
      coordinates: { lat, lng },
      level,
      color: mapUtils.getTrafficLevelColor(level),
      speed: Math.floor(Math.random() * 60) + 10, // 10-70 km/h
      distance: Math.floor(Math.random() * 5) + 1, // 1-5 km
      eta: `${Math.floor(Math.random() * 20) + 5} mins`, // 5-25 mins
      confidence: `${Math.floor(Math.random() * 10) + 90}%`, // 90-99%
      timestamp: new Date().toISOString()
    });
  }
  
  return data;
}

// Mock traffic data
const mockLiveTrafficData = generateTrafficData('blr', 10);
const mockPredictedTrafficData = generateTrafficData('blr', 10).map(item => ({
  ...item,
  confidence: `${parseInt(item.confidence) - 5}%` // Slightly lower confidence
}));

// Mock historical traffic data
const mockHistoricalTrafficData = [];
for (let i = 0; i < 7; i++) { // Past 7 days
  const date = new Date();
  date.setDate(date.getDate() - i);
  
  mockHistoricalTrafficData.push({
    date: date.toISOString().split('T')[0],
    data: generateTrafficData('blr', 8)
  });
}

// Mock traffic metrics
const mockTrafficMetrics = {
  lastUpdated: new Date().toISOString(),
  activePredictions: Math.floor(Math.random() * 50) + 100, // 100-150
  accuracy: `${Math.floor(Math.random() * 5) + 95}%`, // 95-99%
  responseTime: `${Math.floor(Math.random() * 100) + 100}ms`, // 100-200ms
  criticalAlerts: Math.floor(Math.random() * 3) // 0-2
};

// Mock route metrics
const mockRouteMetrics = {
  routesOptimized: Math.floor(Math.random() * 1000) + 5000, // 5000-6000
  timeSaved: `${Math.floor(Math.random() * 500) + 1000} hours`, // 1000-1500 hours
  fuelEfficiency: `${Math.floor(Math.random() * 10) + 20}%`, // 20-30%
  activeRoutes: Math.floor(Math.random() * 50) + 100 // 100-150
};

// Mock active routes
const mockActiveRoutes = [];
for (let i = 0; i < 5; i++) {
  const startCity = mockCities[Math.floor(Math.random() * mockCities.length)];
  const endCity = mockCities[Math.floor(Math.random() * mockCities.length)];
  
  if (startCity.id !== endCity.id) {
    mockActiveRoutes.push({
      id: `route-${i}`,
      startLocation: startCity.name,
      endLocation: endCity.name,
      startCoordinates: startCity.coordinates,
      endCoordinates: endCity.coordinates,
      distance: Math.floor(Math.random() * 500) + 50, // 50-550 km
      duration: Math.floor(Math.random() * 300) + 60, // 60-360 minutes
      trafficLevel: ['light', 'moderate', 'heavy'][Math.floor(Math.random() * 3)],
      departureTime: new Date(Date.now() - Math.floor(Math.random() * 60) * 60000).toISOString(),
      estimatedArrival: new Date(Date.now() + Math.floor(Math.random() * 300) * 60000).toISOString(),
      status: ['active', 'completed', 'delayed'][Math.floor(Math.random() * 3)]
    });
  }
}

// Helper function to generate route options
function generateRouteOptions(start, destination, priority, vehicleType) {
  // Calculate base distance in kilometers using Haversine formula
  const baseDistance = mapUtils.calculateDistance(start, destination);
  
  // Calculate base duration in minutes
  const baseDuration = baseDistance * 2; // Roughly 30 km/h average speed
  
  // Determine traffic levels for different routes
  const trafficLevels = {
    fastest: Math.random() < 0.3 ? 'moderate' : 'light',
    shortest: Math.random() < 0.5 ? 'heavy' : 'moderate',
    eco: Math.random() < 0.4 ? 'moderate' : 'light',
    scenic: Math.random() < 0.2 ? 'moderate' : 'light'
  };
  
  // Generate route options
  const routes = {
    fastest: {
      type: 'fastest',
      distance: baseDistance * 1.1,
      duration: mapUtils.calculateETA(baseDistance * 1.1, trafficLevels.fastest),
      trafficLevel: trafficLevels.fastest,
      trafficColor: mapUtils.getTrafficLevelColor(trafficLevels.fastest),
      fuelConsumption: mapUtils.calculateFuelConsumption(baseDistance * 1.1, vehicleType, trafficLevels.fastest),
      polyline: generateMockPolyline(start, destination, 10),
      startLocation: start,
      endLocation: destination,
      boundingBox: mapUtils.calculateBoundingBox([start, destination])
    },
    shortest: {
      type: 'shortest',
      distance: baseDistance,
      duration: mapUtils.calculateETA(baseDistance, trafficLevels.shortest),
      trafficLevel: trafficLevels.shortest,
      trafficColor: mapUtils.getTrafficLevelColor(trafficLevels.shortest),
      fuelConsumption: mapUtils.calculateFuelConsumption(baseDistance, vehicleType, trafficLevels.shortest),
      polyline: generateMockPolyline(start, destination, 8),
      startLocation: start,
      endLocation: destination,
      boundingBox: mapUtils.calculateBoundingBox([start, destination])
    },
    eco: {
      type: 'eco',
      distance: baseDistance * 1.05,
      duration: mapUtils.calculateETA(baseDistance * 1.05, trafficLevels.eco),
      trafficLevel: trafficLevels.eco,
      trafficColor: mapUtils.getTrafficLevelColor(trafficLevels.eco),
      fuelConsumption: mapUtils.calculateFuelConsumption(baseDistance * 1.05, vehicleType, trafficLevels.eco) * 0.85,
      polyline: generateMockPolyline(start, destination, 12),
      startLocation: start,
      endLocation: destination,
      boundingBox: mapUtils.calculateBoundingBox([start, destination])
    },
    scenic: {
      type: 'scenic',
      distance: baseDistance * 1.3,
      duration: mapUtils.calculateETA(baseDistance * 1.3, trafficLevels.scenic),
      trafficLevel: trafficLevels.scenic,
      trafficColor: mapUtils.getTrafficLevelColor(trafficLevels.scenic),
      fuelConsumption: mapUtils.calculateFuelConsumption(baseDistance * 1.3, vehicleType, trafficLevels.scenic),
      polyline: generateMockPolyline(start, destination, 15),
      startLocation: start,
      endLocation: destination,
      boundingBox: mapUtils.calculateBoundingBox([start, destination])
    }
  };
  
  // Format distance and duration for display
  Object.values(routes).forEach(route => {
    route.distanceText = `${route.distance.toFixed(1)} km`;
    route.durationText = `${Math.round(route.duration)} mins`;
    route.fuelText = `${route.fuelConsumption.toFixed(2)} L`;
  });
  
  // Adjust based on priority
  if (priority === 'time') {
    routes.fastest.recommended = true;
  } else if (priority === 'distance') {
    routes.shortest.recommended = true;
  } else if (priority === 'fuel') {
    routes.eco.recommended = true;
  } else if (priority === 'scenery') {
    routes.scenic.recommended = true;
  } else {
    // Default to fastest
    routes.fastest.recommended = true;
  }
  
  return routes;
}

// Helper function to generate mock polyline
function generateMockPolyline(start, end, points) {
  const polyline = [start];
  
  // Generate intermediate points
  for (let i = 1; i < points - 1; i++) {
    const ratio = i / points;
    
    // Add some randomness to make it look like a real route
    const jitter = 0.01; // About 1km jitter
    const lat = start.lat + (end.lat - start.lat) * ratio + (Math.random() - 0.5) * jitter;
    const lng = start.lng + (end.lng - start.lng) * ratio + (Math.random() - 0.5) * jitter;
    
    polyline.push({ lat, lng });
  }
  
  polyline.push(end);
  
  // Simplify the polyline to reduce data size
  return mapUtils.simplifyPolyline(polyline, 0.0001);
}

// API Routes

// Get available cities
app.get('/api/cities', asyncHandler(async (req, res) => {
  if (isDev) {
    logger.info('Returning mock cities data');
    return res.json({ cities: mockCities });
  }
  
  // In production, fetch from Firestore
  const cities = await db.queryDocuments('cities');
  logger.info(`Fetched ${cities.length} cities from database`);
  res.json({ cities });
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
  
  if (isDev) {
    logger.info(`Returning mock live traffic data for city: ${cityId}`);
    
    // Find the city in mock data
    const city = mockCities.find(c => c.id === cityId);
    
    if (!city) {
      throw notFound(`City with ID: ${cityId}`);
    }
    
    // Add traffic level colors to the mock data
    const enhancedTrafficData = mockLiveTrafficData.map(item => ({
      ...item,
      color: mapUtils.getTrafficLevelColor(item.level)
    }));
    
    // Return mock traffic data for the city
    return res.json({
      cityId,
      cityName: city.name,
      timestamp: new Date().toISOString(),
      trafficData: enhancedTrafficData
    });
  }
  
  // In production, fetch from Firestore
  const trafficData = await db.getTrafficData(cityId, 'live');
  
  if (!trafficData) {
    throw notFound(`Traffic data for city: ${cityId}`);
  }
  
  // Enhance traffic data with colors
  if (trafficData.trafficData && Array.isArray(trafficData.trafficData)) {
    trafficData.trafficData = trafficData.trafficData.map(item => ({
      ...item,
      color: mapUtils.getTrafficLevelColor(item.level)
    }));
  }
  
  logger.info(`Fetched live traffic data for city: ${cityId}`);
  res.json(trafficData);
}));

// Get predicted traffic data for a city
app.get('/api/traffic/predicted/:cityId', asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  const { hoursAhead = 1 } = req.query;
  
  if (!cityId) {
    throw badRequest('City ID is required');
  }
  
  if (!isValidCityId(cityId)) {
    throw badRequest(`Invalid city ID: ${cityId}`);
  }
  
  // Validate hoursAhead
  const hours = parseInt(hoursAhead, 10);
  const timeErrors = validateTimeParams({ hoursAhead: hours });
  if (timeErrors.length > 0) {
    throw badRequest(timeErrors.join(', '));
  }
  
  if (isDev) {
    logger.info(`Returning mock predicted traffic data for city: ${cityId}, hours ahead: ${hours}`);
    
    // Find the city in mock data
    const city = mockCities.find(c => c.id === cityId);
    
    if (!city) {
      throw notFound(`City with ID: ${cityId}`);
    }
    
    // Add traffic level colors and ETAs to the mock data
    const enhancedTrafficData = mockPredictedTrafficData.map(item => {
      // Calculate ETA for each segment based on distance and traffic level
      const eta = item.distance ? mapUtils.calculateETA(item.distance, item.level) : null;
      
      return {
        ...item,
        color: mapUtils.getTrafficLevelColor(item.level),
        eta: eta
      };
    });
    
    // Return mock predicted traffic data for the city
    return res.json({
      cityId,
      cityName: city.name,
      predictedFor: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString(),
      trafficData: enhancedTrafficData
    });
  }
  
  // In production, fetch from Firestore
  const trafficData = await db.getTrafficData(cityId, 'predicted', { hoursAhead: hours });
  
  if (!trafficData) {
    throw notFound(`Predicted traffic data for city: ${cityId}`);
  }
  
  // Enhance traffic data with colors and ETAs
  if (trafficData.trafficData && Array.isArray(trafficData.trafficData)) {
    trafficData.trafficData = trafficData.trafficData.map(item => {
      const eta = item.distance ? mapUtils.calculateETA(item.distance, item.level) : null;
      
      return {
        ...item,
        color: mapUtils.getTrafficLevelColor(item.level),
        eta: eta
      };
    });
  }
  
  logger.info(`Fetched predicted traffic data for city: ${cityId}, hours ahead: ${hours}`);
  res.json(trafficData);
}));

// Get historical traffic data for a city
app.get('/api/traffic/historical/:cityId', asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  const { daysBack = 7 } = req.query;
  
  if (!cityId) {
    throw badRequest('City ID is required');
  }
  
  if (!isValidCityId(cityId)) {
    throw badRequest(`Invalid city ID: ${cityId}`);
  }
  
  // Validate daysBack
  const days = parseInt(daysBack, 10);
  const timeErrors = validateTimeParams({ daysBack: days });
  if (timeErrors.length > 0) {
    throw badRequest(timeErrors.join(', '));
  }
  
  if (isDev) {
    logger.info(`Returning mock historical traffic data for city: ${cityId}, days back: ${days}`);
    
    // Find the city in mock data
    const city = mockCities.find(c => c.id === cityId);
    
    if (!city) {
      throw notFound(`City with ID: ${cityId}`);
    }
    
    // Add traffic level colors to the mock data
    const enhancedTrafficData = mockHistoricalTrafficData.map(day => ({
      ...day,
      data: day.data.map(item => ({
        ...item,
        color: mapUtils.getTrafficLevelColor(item.level)
      }))
    }));
    
    // Return mock historical traffic data for the city
    return res.json({
      cityId,
      cityName: city.name,
      fromDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      toDate: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      trafficData: enhancedTrafficData
    });
  }
  
  // In production, fetch from Firestore
  const trafficData = await db.getTrafficData(cityId, 'historical', { daysBack: days });
  
  if (!trafficData) {
    throw notFound(`Historical traffic data for city: ${cityId}`);
  }
  
  // Enhance traffic data with colors
  if (trafficData.trafficData && Array.isArray(trafficData.trafficData)) {
    trafficData.trafficData = trafficData.trafficData.map(day => ({
      ...day,
      data: Array.isArray(day.data) ? day.data.map(item => ({
        ...item,
        color: mapUtils.getTrafficLevelColor(item.level)
      })) : day.data
    }));
  }
  
  logger.info(`Fetched historical traffic data for city: ${cityId}, days back: ${days}`);
  res.json(trafficData);
}));

// Get traffic metrics
app.get('/api/traffic/metrics', asyncHandler(async (req, res) => {
  if (isDev) {
    logger.info('Returning mock traffic metrics');
    return res.json(mockTrafficMetrics);
  }
  
  // In production, fetch from Firestore
  const metrics = await db.getTrafficMetrics();
  
  if (!metrics) {
    throw notFound('Traffic metrics');
  }
  
  logger.info('Fetched traffic metrics');
  res.json(metrics);
}));

// Report traffic incident
app.post('/api/traffic/incidents/report', authenticateUser, asyncHandler(async (req, res) => {
  const { location, type, description, severity = 'moderate' } = req.body;
  
  // Validate incident report
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
  
  const incident = {
    id: uuidv4(),
    location,
    type,
    description,
    severity,
    trafficImpact,
    impactColor: mapUtils.getTrafficLevelColor(trafficImpact),
    reportedBy: req.user.uid,
    reportedAt: new Date().toISOString(),
    status: 'pending',
    verified: false
  };
  
  if (isDev) {
    logger.info(`Mock incident reported: ${incident.id}`);
    
    return res.status(201).json({
      message: 'Incident reported successfully',
      incident
    });
  }
  
  // In production, save to Firestore
  const savedIncident = await db.reportTrafficIncident(incident);
  
  logger.info(`Incident reported: ${savedIncident.id}`);
  res.status(201).json({
    message: 'Incident reported successfully',
    incident: savedIncident
  });
}));

// Route optimization endpoint
app.post('/api/routes/optimize', asyncHandler(async (req, res) => {
  const { start, destination, priority = 'time', vehicleType = 'car' } = req.body;
  
  // Validate request parameters
  const validationErrors = validateRouteParams(req.body);
  if (validationErrors.length > 0) {
    throw badRequest(validationErrors.join(', '));
  }
  
  // Additional validation for coordinates
  if (!areValidCoordinates([start, destination])) {
    throw badRequest('Invalid coordinates provided');
  }
  
  if (isDev) {
    logger.info('Generating mock route options');
    
    // Generate mock route options
    const routeOptions = generateRouteOptions(start, destination, priority, vehicleType);
    
    // Format coordinates for display
    const startFormatted = mapUtils.formatCoordinates(start);
    const destinationFormatted = mapUtils.formatCoordinates(destination);
    
    return res.json({
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      start,
      destination,
      startFormatted,
      destinationFormatted,
      priority,
      vehicleType,
      routes: routeOptions
    });
  }
  
  // In production, use real routing service
  try {
    const routeData = await db.getRouteData({
      start,
      destination,
      priority,
      vehicleType
    });
    
    // Enhance route data with formatted coordinates and colors
    if (routeData && routeData.routes) {
      routeData.startFormatted = mapUtils.formatCoordinates(start);
      routeData.destinationFormatted = mapUtils.formatCoordinates(destination);
      
      // Add traffic colors and format text values
      Object.values(routeData.routes).forEach(route => {
        route.trafficColor = mapUtils.getTrafficLevelColor(route.trafficLevel);
        route.distanceText = `${route.distance.toFixed(1)} km`;
        route.durationText = `${Math.round(route.duration)} mins`;
        route.fuelText = `${route.fuelConsumption.toFixed(2)} L`;
        
        // Calculate bounding box if not present
        if (!route.boundingBox && route.polyline) {
          route.boundingBox = mapUtils.calculateBoundingBox(route.polyline);
        }
      });
    }
    
    logger.info('Route optimization completed successfully');
    res.json(routeData);
  } catch (error) {
    logger.error('Error optimizing route:', error);
    throw error;
  }
}));

// Get route metrics
app.get('/api/routes/metrics', asyncHandler(async (req, res) => {
  if (isDev) {
    logger.info('Returning mock route metrics');
    return res.json(mockRouteMetrics);
  }
  
  // In production, fetch from Firestore
  const metrics = await db.getRouteMetrics();
  
  if (!metrics) {
    throw notFound('Route metrics');
  }
  
  logger.info('Fetched route metrics');
  res.json(metrics);
}));

// Get active routes
app.get('/api/routes/active', authenticateUser, asyncHandler(async (req, res) => {
  if (isDev) {
    logger.info('Returning mock active routes');
    return res.json({ routes: mockActiveRoutes });
  }
  
  // In production, fetch from Firestore
  const userId = req.user.uid;
  const routes = await db.queryDocuments('activeRoutes', { userId });
  
  // Enhance routes with traffic colors
  const enhancedRoutes = routes.map(route => ({
    ...route,
    trafficColor: mapUtils.getTrafficLevelColor(route.trafficLevel)
  }));
  
  logger.info(`Fetched ${routes.length} active routes for user: ${userId}`);
  res.json({ routes: enhancedRoutes });
}));

// Save selected route
app.post('/api/routes/select', authenticateUser, asyncHandler(async (req, res) => {
  const { routeId, routeType } = req.body;
  
  if (!routeId || !routeType) {
    throw badRequest('Route ID and route type are required');
  }
  
  // Validate route type
  const validRouteTypes = ['fastest', 'shortest', 'eco', 'scenic'];
  if (!validRouteTypes.includes(routeType)) {
    throw badRequest(`Invalid route type: ${routeType}. Must be one of: ${validRouteTypes.join(', ')}`);
  }
  
  if (isDev) {
    logger.info(`Mock saving selected route: ${routeType} (${routeId})`);
    
    return res.json({
      message: 'Route selection saved successfully',
      routeId,
      routeType,
      timestamp: new Date().toISOString(),
      estimatedArrival: new Date(Date.now() + 30 * 60 * 1000).toISOString() // Mock 30 minutes from now
    });
  }
  
  // In production, save to Firestore
  try {
    // First, get the route details
    const routeDetails = await db.getDocumentById('routes', routeId);
    
    if (!routeDetails) {
      throw notFound(`Route with ID: ${routeId}`);
    }
    
    const selectedRoute = routeDetails.routes[routeType];
    if (!selectedRoute) {
      throw notFound(`Route type ${routeType} not found in route options`);
    }
    
    // Calculate estimated arrival time
    const now = new Date();
    const estimatedArrival = new Date(now.getTime() + selectedRoute.duration * 60 * 1000);
    
    // Save the selected route
    const savedRoute = await db.saveRoute({
      userId: req.user.uid,
      routeId,
      routeType,
      routeDetails: selectedRoute,
      timestamp: now.toISOString(),
      estimatedArrival: estimatedArrival.toISOString(),
      status: 'active'
    });
    
    logger.info(`Route selection saved: ${routeType} (${routeId})`);
    res.json({
      message: 'Route selection saved successfully',
      selection: savedRoute
    });
  } catch (error) {
    logger.error('Error saving route selection:', error);
    throw error;
  }
}));

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// Export the serverless function
module.exports.handler = serverless(app);