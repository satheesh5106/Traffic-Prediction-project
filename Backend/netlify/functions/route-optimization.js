const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { initializeFirebase } = require('./utils/firebase-init');
const { 
  generateCoordinatesNear, 
  calculateDistance, 
  calculateRouteDistance,
  randomInt,
  formatNumber
} = require('./utils/helpers');
const logger = require('./utils/logger');
const { isDev, apiConfig, routeConfig } = require('./utils/config');
const { authenticateUser, authorizeRoles } = require('./middleware/auth-middleware');
const { asyncHandler, notFound, badRequest } = require('./utils/error-handler');
const db = require('./utils/database');
const mapUtils = require('./utils/map-utils');
const { validateRouteParams, areValidCoordinates } = require('./utils/map-validation');

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

// Helper function to generate random coordinates near a center point
const generateCoordinatesNear = (center, count = 5) => {
  const result = [center];
  
  for (let i = 1; i < count; i++) {
    // Generate coordinates with slight variation
    const lat = center[0] + (Math.random() * 0.05 - 0.025);
    const lng = center[1] + (Math.random() * 0.05 - 0.025);
    result.push([lat, lng]);
  }
  
  return result;
};

// Helper function to calculate route distance in km
const calculateDistance = (coordinates) => {
  let totalDistance = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const lat1 = coordinates[i-1][0];
    const lon1 = coordinates[i-1][1];
    const lat2 = coordinates[i][0];
    const lon2 = coordinates[i][1];
    
    // Haversine formula to calculate distance between two points
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    
    totalDistance += distance;
  }
  
  return totalDistance;
};

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Helper function to generate route options
const generateRouteOptions = (start, end, routePriority, vehicleType) => {
  // Find city based on start coordinates
  const nearestCity = mockCities.reduce((nearest, city) => {
    const distToStart = Math.sqrt(
      Math.pow(city.center[0] - start[0], 2) + 
      Math.pow(city.center[1] - start[1], 2)
    );
    
    if (!nearest || distToStart < nearest.distance) {
      return { city, distance: distToStart };
    }
    return nearest;
  }, null).city;
  
  // Generate different route options
  const routeTypes = ['fastest', 'shortest', 'eco', 'scenic'];
  const routes = [];
  
  routeTypes.forEach(type => {
    // Generate waypoints between start and end
    let waypoints;
    let coordinates;
    
    switch (type) {
      case 'fastest':
        // Fewer waypoints for fastest route
        waypoints = 3;
        coordinates = [start];
        for (let i = 0; i < waypoints; i++) {
          const progress = (i + 1) / (waypoints + 1);
          coordinates.push([
            start[0] + (end[0] - start[0]) * progress + (Math.random() * 0.01 - 0.005),
            start[1] + (end[1] - start[1]) * progress + (Math.random() * 0.01 - 0.005)
          ]);
        }
        coordinates.push(end);
        break;
        
      case 'shortest':
        // Direct route with minimal deviation
        waypoints = 2;
        coordinates = [start];
        for (let i = 0; i < waypoints; i++) {
          const progress = (i + 1) / (waypoints + 1);
          coordinates.push([
            start[0] + (end[0] - start[0]) * progress + (Math.random() * 0.005 - 0.0025),
            start[1] + (end[1] - start[1]) * progress + (Math.random() * 0.005 - 0.0025)
          ]);
        }
        coordinates.push(end);
        break;
        
      case 'eco':
        // Route optimized for fuel efficiency
        waypoints = 4;
        coordinates = [start];
        for (let i = 0; i < waypoints; i++) {
          const progress = (i + 1) / (waypoints + 1);
          coordinates.push([
            start[0] + (end[0] - start[0]) * progress + (Math.random() * 0.015 - 0.0075),
            start[1] + (end[1] - start[1]) * progress + (Math.random() * 0.015 - 0.0075)
          ]);
        }
        coordinates.push(end);
        break;
        
      case 'scenic':
        // More waypoints with larger deviations for scenic route
        waypoints = 5;
        coordinates = [start];
        for (let i = 0; i < waypoints; i++) {
          const progress = (i + 1) / (waypoints + 1);
          coordinates.push([
            start[0] + (end[0] - start[0]) * progress + (Math.random() * 0.02 - 0.01),
            start[1] + (end[1] - start[1]) * progress + (Math.random() * 0.02 - 0.01)
          ]);
        }
        coordinates.push(end);
        break;
    }
    
    // Calculate distance
    const distance = calculateDistance(coordinates);
    
    // Calculate time based on route type and vehicle
    let avgSpeed;
    switch (vehicleType) {
      case 'car':
        avgSpeed = type === 'fastest' ? 50 : type === 'shortest' ? 40 : type === 'eco' ? 45 : 35;
        break;
      case 'bike':
        avgSpeed = type === 'fastest' ? 30 : type === 'shortest' ? 25 : type === 'eco' ? 20 : 15;
        break;
      case 'truck':
        avgSpeed = type === 'fastest' ? 40 : type === 'shortest' ? 35 : type === 'eco' ? 30 : 25;
        break;
      case 'bus':
        avgSpeed = type === 'fastest' ? 35 : type === 'shortest' ? 30 : type === 'eco' ? 25 : 20;
        break;
      default:
        avgSpeed = 40;
    }
    
    // Adjust for traffic conditions
    const trafficFactor = type === 'fastest' ? 1.2 : type === 'shortest' ? 1.5 : type === 'eco' ? 1.1 : 1.0;
    const timeInMinutes = Math.round((distance / avgSpeed) * 60 * trafficFactor);
    
    // Calculate fuel consumption based on vehicle and route type
    let fuelConsumptionRate;
    switch (vehicleType) {
      case 'car':
        fuelConsumptionRate = type === 'eco' ? 0.06 : 0.08;
        break;
      case 'bike':
        fuelConsumptionRate = type === 'eco' ? 0.03 : 0.04;
        break;
      case 'truck':
        fuelConsumptionRate = type === 'eco' ? 0.15 : 0.2;
        break;
      case 'bus':
        fuelConsumptionRate = type === 'eco' ? 0.12 : 0.18;
        break;
      default:
        fuelConsumptionRate = 0.08;
    }
    
    const fuelConsumption = (distance * fuelConsumptionRate).toFixed(1);
    
    // Determine traffic level
    let traffic;
    if (type === 'fastest') traffic = 'Moderate';
    else if (type === 'shortest') traffic = 'Heavy';
    else if (type === 'eco') traffic = 'Light';
    else traffic = 'Light';
    
    // Create route object
    routes.push({
      id: uuidv4(),
      name: type === 'fastest' ? 'Fastest Route' : 
            type === 'shortest' ? 'Shortest Route' : 
            type === 'eco' ? 'Eco-Friendly Route' : 'Scenic Route',
      type,
      distance: `${distance.toFixed(1)} km`,
      time: `${timeInMinutes} mins`,
      traffic,
      fuelConsumption: `${fuelConsumption} L`,
      coordinates,
      color: type === 'fastest' ? '#3b82f6' : 
             type === 'shortest' ? '#10b981' : 
             type === 'eco' ? '#22c55e' : '#f59e0b'
    });
  });
  
  // Sort routes based on priority
  routes.sort((a, b) => {
    if (a.type === routePriority) return -1;
    if (b.type === routePriority) return 1;
    return 0;
  });
  
  return routes;
};

// Routes

// Get route options
app.post('/api/routes/optimize', asyncHandler(async (req, res) => {
  const { startLocation, endLocation, routePriority, vehicleType } = req.body;
  
  // Validate request body
  const validationResult = validateRouteParams(req.body);
  if (validationResult.error) {
    throw badRequest(validationResult.error.message, { details: validationResult.error.details });
  }
  
  // In production, we would use a real routing service
  // For development, generate mock routes
  
  // Convert location names to coordinates (mock implementation)
  const getCoordinates = async (locationName) => {
    // In production, use a geocoding service
    if (process.env.NODE_ENV === 'production') {
      // Implement geocoding logic here
    }
    
    // For development, return mock coordinates
    const city = mockCities.find(c => 
      locationName.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (city) {
      // Add slight randomness to coordinates
      return [
        city.center[0] + (Math.random() * 0.02 - 0.01),
        city.center[1] + (Math.random() * 0.02 - 0.01)
      ];
    }
    
    // Default to Mumbai if no match
    return [19.0760 + (Math.random() * 0.02 - 0.01), 72.8777 + (Math.random() * 0.02 - 0.01)];
  };
  
  const startCoordinates = await getCoordinates(startLocation);
  const endCoordinates = await getCoordinates(endLocation);
  
  // Generate route options
  const routes = generateRouteOptions(
    startCoordinates,
    endCoordinates,
    routePriority,
    vehicleType
  );
  
  // Create route request record
  const routeRequest = {
    id: uuidv4(),
    startLocation,
    endLocation,
    startCoordinates,
    endCoordinates,
    routePriority,
    vehicleType,
    timestamp: new Date().toISOString(),
    userId: req.headers['x-user-id'] || 'anonymous'
  };
  
  // In production, save to Firestore
  if (process.env.NODE_ENV === 'production') {
    await db.collection('routeRequests').doc(routeRequest.id).set(routeRequest);
    logger.info(`Created route request with ID: ${routeRequest.id}`);
  } else {
    logger.info(`Generated mock route options from ${startLocation} to ${endLocation}`);
  }
  
  res.json({ routes, request: routeRequest });
}));

// Get route metrics
app.get('/api/routes/metrics', asyncHandler(async (req, res) => {
  // In production, fetch from Firestore
  if (process.env.NODE_ENV === 'production') {
    const metrics = await db.getRouteMetrics();
    
    if (metrics) {
      logger.info('Retrieved route metrics from database');
      return res.json({ metrics });
    }
    
    throw notFound('Route metrics');
  }
  
  // In development, return mock metrics
  const metrics = {
    routesOptimized: 2547,
    timeSaved: '1,230 hrs',
    fuelSaved: '4,560 L',
    activeRoutes: 78
  };
  
  logger.info('Generated mock route metrics');
  res.json({ metrics });
}));

// Get active routes
app.get('/api/routes/active', asyncHandler(async (req, res) => {
  const { userId } = req.query;
  
  // In production, fetch from Firestore
  if (process.env.NODE_ENV === 'production') {
    const routes = await db.getActiveRoutes(userId);
    
    logger.info(`Retrieved ${routes.length} active routes${userId ? ' for user: ' + userId : ''}`);
    return res.json({ routes });
  }
  
  // In development, return mock active routes
  const routes = [
    {
      id: uuidv4(),
      startLocation: 'Mumbai Central',
      endLocation: 'Powai',
      startCoordinates: [19.0760, 72.8777],
      endCoordinates: [19.1000, 72.9000],
      routeType: 'fastest',
      vehicleType: 'car',
      distance: '12.5 km',
      estimatedTime: '25 mins',
      remainingTime: '18 mins',
      progress: 28,
      timestamp: new Date().toISOString()
    },
    {
      id: uuidv4(),
      startLocation: 'Andheri',
      endLocation: 'Bandra',
      startCoordinates: [19.1136, 72.8697],
      endCoordinates: [19.0596, 72.8295],
      routeType: 'eco',
      vehicleType: 'bike',
      distance: '8.3 km',
      estimatedTime: '20 mins',
      remainingTime: '12 mins',
      progress: 40,
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      startLocation: 'Dadar',
      endLocation: 'Worli',
      startCoordinates: [19.0178, 72.8478],
      endCoordinates: [19.0096, 72.8150],
      routeType: 'shortest',
      vehicleType: 'car',
      distance: '5.2 km',
      estimatedTime: '15 mins',
      remainingTime: '5 mins',
      progress: 67,
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    }
  ];
  
  logger.info('Generated mock active routes');
  res.json({ routes });
}));

// Save selected route
app.post('/api/routes/select', asyncHandler(async (req, res) => {
  const { routeId, requestId } = req.body;
  
  // Validate required fields
  if (!routeId || !requestId) {
    throw badRequest('Route ID and Request ID are required');
  }
  
  // Validate route type if provided
  const validRouteTypes = ['fastest', 'shortest', 'eco', 'scenic'];
  const routeType = req.body.routeType;
  if (routeType && !validRouteTypes.includes(routeType)) {
    throw badRequest(`Invalid route type: ${routeType}. Must be one of: ${validRouteTypes.join(', ')}`);
  }
  
  // In production, save to Firestore
  if (process.env.NODE_ENV === 'production') {
    // Get the route request
    const request = await db.getRouteRequest(requestId);
    
    if (!request) {
      throw notFound('Route request');
    }
    
    // Calculate estimated arrival time based on route data
    const now = new Date();
    let estimatedArrival = now;
    if (request.routes && request.routes[routeType]) {
      const duration = request.routes[routeType].duration || 30; // default 30 mins
      estimatedArrival = new Date(now.getTime() + duration * 60 * 1000);
    }
    
    // Save the selected route
    const selectedRoute = {
      id: uuidv4(),
      routeId,
      requestId,
      startLocation: request.startLocation,
      endLocation: request.endLocation,
      startCoordinates: request.startCoordinates,
      endCoordinates: request.endCoordinates,
      routeType: routeType || request.routePriority,
      vehicleType: request.vehicleType,
      timestamp: now.toISOString(),
      estimatedArrival: estimatedArrival.toISOString(),
      userId: request.userId,
      status: 'active'
    };
    
    await db.saveSelectedRoute(selectedRoute);
    logger.info(`Route selected with ID: ${selectedRoute.id}`);
    
    return res.json({ success: true, selectedRoute });
  }
  
  // In development, return success
  const selectedRouteId = uuidv4();
  logger.info(`Mock route selected with ID: ${selectedRouteId}`);
  res.json({ 
    success: true, 
    message: 'Route selected successfully',
    selectedRouteId,
    estimatedArrival: new Date(Date.now() + 30 * 60 * 1000).toISOString() // Mock 30 minutes from now
  });
}));

// Handle 404
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

// Export the serverless function
module.exports.handler = serverless(app);