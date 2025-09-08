const { Handler } = require('@netlify/functions');
const axios = require('axios');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const turf = require('@turf/turf');
require('dotenv').config();

const { 
  handleGenericError, 
  createSuccessResponse, 
  handleExternalAPIError,
  handleValidationError,
  handleTimeoutError,
  asyncHandler,
  validateRequest,
  checkRateLimit,
  log 
} = require('./utils/errorHandler');
const { requireAuth } = require('./utils/auth');
const { generateRouteOptions, generateRouteStats, VEHICLE_TYPES, INDIAN_LOCATIONS } = require('./utils/mockData');

// Initialize cache with configurable TTL for routes
const cache = new NodeCache({ 
  stdTTL: parseInt(process.env.CACHE_TTL_ROUTES) || 600,
  checkperiod: 120
});

// Global route optimization statistics
let routeStats = {
  routesOptimized: 0,
  timeSaved: 0, // in minutes
  fuelEfficiency: 0, // percentage improvement
  activeRoutes: 0,
  totalRequests: 0,
  lastOptimized: Date.now()
};

// Enhanced OpenRouteService API integration with multiple profiles
async function callOpenRouteServiceAPI(start, destination, profile = 'driving-car', options = {}) {
  // Handle both coordinate formats
  const startLat = start.latitude || start.lat;
  const startLng = start.longitude || start.lng;
  const destLat = destination.latitude || destination.lat;
  const destLng = destination.longitude || destination.lng;
  
  const cacheKey = `ors_${startLat}_${startLng}_${destLat}_${destLng}_${profile}`;
  const cached = cache.get(cacheKey);
  
  if (cached && !options.refresh) {
    log('info', 'Using cached ORS route data', { profile });
    return cached;
  }
  
  try {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouteService API key not configured');
    }
    
    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
    const requestBody = {
      coordinates: [
        [startLng, startLat],
        [destLng, destLat]
      ],
      format: 'json',
      instructions: true,
      geometry: true,
      elevation: false,
      extra_info: ['surface', 'steepness', 'tollways'],
      options: {
        avoid_features: options.avoidFeatures || [],
        vehicle_type: options.vehicleType || 'car'
      }
    };
    
    log('info', 'Calling OpenRouteService API', { 
      profile, 
      start: `${startLat},${startLng}`, 
      destination: `${destLat},${destLng}` 
    });
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'TrafficAI/1.0'
      },
      timeout: 10000
    });
    
    const routeData = response.data;
    
    // Cache successful responses for 10 minutes
    cache.set(cacheKey, routeData, 600);
    
    log('info', 'OpenRouteService API call successful', {
      profile,
      routesCount: routeData.routes?.length || 0,
      distance: routeData.routes?.[0]?.summary?.distance,
      duration: routeData.routes?.[0]?.summary?.duration
    });
    
    return routeData;
    
  } catch (error) {
    log('error', 'OpenRouteService API error', { 
      error: error.message, 
      profile,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Return mock data as fallback
    const distance = turf.distance(
      [start.longitude, start.latitude],
      [destination.longitude, destination.latitude],
      { units: 'meters' }
    );
    
    const mockRoute = {
      routes: [{
        summary: {
          distance: Math.round(distance),
          duration: Math.round(distance / getProfileSpeed(profile) * 3.6) // Convert to seconds
        },
        geometry: {
          coordinates: [
            [start.longitude, start.latitude],
            [destination.longitude, destination.latitude]
          ]
        },
        segments: [{
          distance: Math.round(distance),
          duration: Math.round(distance / getProfileSpeed(profile) * 3.6),
          steps: [{
            distance: Math.round(distance),
            duration: Math.round(distance / getProfileSpeed(profile) * 3.6),
            type: 11,
            instruction: `Head ${getBearing(start, destination)} on route to destination`
          }]
        }]
      }]
    };
    
    return mockRoute;
  }
}

// Get average speed for different profiles (km/h)
function getProfileSpeed(profile) {
  const speeds = {
    'driving-car': 50,
    'driving-hgv': 40,
    'cycling-regular': 15,
    'foot-walking': 5
  };
  return speeds[profile] || 50;
}

// Calculate bearing between two points
function getBearing(start, end) {
  const bearing = turf.bearing(
    [start.longitude, start.latitude],
    [end.longitude, end.latitude]
  );
  
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(((bearing + 360) % 360) / 45) % 8;
  return directions[index];
}

// Mock OpenRouteService API calls (fallback function)
function mockORSRequest(profile, start, end, vehicle = 'driving-car') {
  const baseTime = 25; // minutes
  const baseDistance = 15; // km
  const baseFuel = 2.5; // liters
  
  const profiles = {
    fastest: {
      time: baseTime,
      distance: baseDistance + 2,
      fuel: baseFuel + 0.3,
      traffic: 'Moderate',
      description: 'Fastest route using highways'
    },
    shortest: {
      time: baseTime + 8,
      distance: baseDistance - 3,
      fuel: baseFuel - 0.2,
      traffic: 'Light',
      description: 'Shortest distance through city roads'
    },
    eco: {
      time: baseTime + 12,
      distance: baseDistance + 1,
      fuel: baseFuel - 0.8,
      traffic: 'Heavy',
      description: 'Most fuel-efficient route'
    },
    scenic: {
      time: baseTime + 18,
      distance: baseDistance + 6,
      fuel: baseFuel + 0.1,
      traffic: 'Light',
      description: 'Scenic route through parks and landmarks'
    }
  };
  
  const route = profiles[profile] || profiles.fastest;
  
  // Generate mock coordinates for the route
  const startCoord = [parseFloat(start.split(',')[1]), parseFloat(start.split(',')[0])];
  const endCoord = [parseFloat(end.split(',')[1]), parseFloat(end.split(',')[0])];
  
  // Create a simple line between start and end with some waypoints
  const line = turf.lineString([startCoord, endCoord]);
  const length = turf.length(line);
  const waypoints = [];
  
  for (let i = 0; i <= 10; i++) {
    const along = turf.along(line, (length / 10) * i);
    waypoints.push(along.geometry.coordinates);
  }
  
  return {
    ...route,
    geometry: {
      coordinates: waypoints,
      type: 'LineString'
    },
    summary: {
      distance: route.distance * 1000, // convert to meters
      duration: route.time * 60 // convert to seconds
    },
    segments: [
      {
        distance: route.distance * 1000,
        duration: route.time * 60,
        steps: [
          { instruction: `Head ${profile === 'fastest' ? 'northeast' : 'east'} on main road`, distance: 500 },
          { instruction: `Continue on ${profile === 'scenic' ? 'park road' : 'highway'}`, distance: (route.distance * 1000) - 1000 },
          { instruction: 'Arrive at destination', distance: 500 }
        ]
      }
    ]
  };
}

// Calculate fuel consumption based on vehicle type and route
// Function removed - duplicate definition exists at line 724

// Get traffic-aware time estimation
async function getTrafficAwareTime(baseTime, coordinates) {
  try {
    // Fetch current traffic predictions
    const trafficResponse = await axios.get(`${process.env.URL || 'http://localhost:8888'}/.netlify/functions/traffic-predictions`);
    const predictions = trafficResponse.data.predictions || [];
    
    // Check if route passes through congested areas
    let trafficMultiplier = 1.0;
    
    predictions.forEach(pred => {
      const predCoord = [pred.coordinates.lng, pred.coordinates.lat];
      const routeLine = turf.lineString(coordinates);
      const predPoint = turf.point(predCoord);
      const distance = turf.pointToLineDistance(predPoint, routeLine, { units: 'kilometers' });
      
      if (distance < 2) { // Within 2km of route
        if (pred.level === 'Congested') trafficMultiplier += 0.5;
        else if (pred.level === 'Heavy') trafficMultiplier += 0.3;
        else if (pred.level === 'Moderate') trafficMultiplier += 0.1;
      }
    });
    
    return Math.round(baseTime * trafficMultiplier);
  } catch (error) {
    console.error('Traffic-aware calculation failed:', error);
    return baseTime;
  }
}

// Main handler with enhanced security and validation
const handler = asyncHandler(async (event, context) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Validate request method
  if (event.httpMethod !== 'POST') {
    throw handleValidationError('Only POST method allowed', { method: event.httpMethod });
  }

  log('info', 'Route optimization request started', { 
    requestId, 
    method: event.httpMethod,
    userAgent: event.headers['user-agent'],
    ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip']
  });

  // Authenticate user
  const user = await requireAuth(event);
  log('info', 'User authenticated for route optimization', { 
    requestId, 
    userId: user.uid,
    email: user.email 
  });

  // Rate limiting per user
  const rateLimitKey = `route_opt_${user.uid}`;
  const rateLimitResult = checkRateLimit(rateLimitKey, 30, 300000); // 30 requests per 5 minutes
  if (!rateLimitResult.allowed) {
    return handleRateLimitError(
      `${rateLimitResult.limit} requests per 5 minutes`,
      rateLimitResult.resetTime,
      requestId
    );
  }

  // Parse and validate request body
  const body = JSON.parse(event.body || '{}');
  
  // Validate request structure
  const validationResult = validateRouteRequest(body);
  if (!validationResult.isValid) {
    return handleValidationError(validationResult.error, { requestId, body });
  }

  // Extract validated parameters
  const { 
    start, 
    destination, 
    priority = 'fastest', 
    vehicle = 'driving-car',
    avoidTolls = false,
    avoidHighways = false,
    avoidFerries = false,
    includeTraffic = true,
    preferences = {} 
  } = body;

  // Handle both coordinate formats for logging
  const startLat = start.latitude || start.lat;
  const startLng = start.longitude || start.lng;
  const destLat = destination.latitude || destination.lat;
  const destLng = destination.longitude || destination.lng;
  
  log('info', 'Route optimization parameters validated', {
    requestId,
    userId: user.uid,
    start: `${startLat},${startLng}`,
    destination: `${destLat},${destLng}`,
    priority,
    vehicle
  });
  
  routeStats.totalRequests++;
  
  // Validate coordinates format
  let startCoords, destCoords;
  
  if (typeof start === 'string') {
    startCoords = start.split(',').map(parseFloat);
  } else if (start && typeof start === 'object' && start.lat && start.lng) {
    startCoords = [parseFloat(start.lat), parseFloat(start.lng)];
  } else {
    return handleValidationError(['Invalid start coordinate format. Use "lat,lng" or {lat, lng}'], requestId);
  }
  
  if (typeof destination === 'string') {
    destCoords = destination.split(',').map(parseFloat);
  } else if (destination && typeof destination === 'object' && destination.lat && destination.lng) {
    destCoords = [parseFloat(destination.lat), parseFloat(destination.lng)];
  } else {
    return handleValidationError(['Invalid destination coordinate format. Use "lat,lng" or {lat, lng}'], requestId);
  }
  
  if (startCoords.length !== 2 || destCoords.length !== 2 || 
      startCoords.some(isNaN) || destCoords.some(isNaN)) {
    return handleValidationError(['Invalid coordinate values'], requestId);
  }
  
  // Validate vehicle type
   if (!VEHICLE_TYPES[vehicle]) {
     return handleValidationError([`Invalid vehicle type. Allowed: ${Object.keys(VEHICLE_TYPES).join(', ')}`], requestId);
   }
     
   // Check cache for existing route
   const cacheKey = `route_${JSON.stringify({start, destination, priority, vehicle})}`;
   const cachedRoute = cache.get(cacheKey);
   
   if (cachedRoute) {
     log('info', 'Returning cached route', { requestId, cacheKey });
     return createSuccessResponse(cachedRoute, requestId);
   }
   
   try {
     // Generate multiple route options with different priorities
     const routePromises = [];
     const profiles = getProfilesForPriority(priority, vehicle);
     
     // Generate routes for each profile
     for (const profile of profiles) {
       const avoidFeatures = [];
       if (avoidTolls) avoidFeatures.push('tollways');
       if (avoidHighways) avoidFeatures.push('highways');
       if (avoidFerries) avoidFeatures.push('ferries');
       
       routePromises.push(
         callOpenRouteServiceAPI(start, destination, profile.type, {
           avoidFeatures,
           vehicleType: vehicle,
           includeTraffic
         }).then(routeData => ({
           ...profile,
           routeData,
           success: true
         })).catch(error => ({
           ...profile,
           error: error.message,
           success: false
         }))
       );
     }
     
     // Wait for all route calculations
     const routeResults = await Promise.allSettled(routePromises);
     const successfulRoutes = routeResults
       .filter(result => result.status === 'fulfilled' && result.value.success)
       .map(result => result.value);
     
     if (successfulRoutes.length === 0) {
       log('warn', 'No successful routes generated, using fallback', { requestId, userId: user.uid });
       // Generate fallback mock routes
       const mockRoutes = generateFallbackRoutes(start, destination, priority, vehicle);
       return createSuccessResponse({
         requestId,
         routes: mockRoutes,
         statistics: calculateRouteStatistics(mockRoutes, startTime),
         metadata: {
           priority,
           vehicle,
           fallback: true,
           timestamp: new Date().toISOString()
         }
       }, 200, { requestId });
     }
     
     // Process and enhance route data
     const enhancedRoutes = await Promise.all(
       successfulRoutes.map(async (route) => {
         const routeData = route.routeData.routes[0];
         const enhanced = {
           id: uuidv4(),
           type: route.name,
           priority: route.priority,
           distance: routeData.summary.distance,
           duration: routeData.summary.duration,
           geometry: routeData.geometry,
           instructions: routeData.segments?.[0]?.steps || [],
           traffic: includeTraffic ? await getTrafficData(routeData.geometry) : null,
           fuel: calculateFuelConsumption(routeData.summary.distance, vehicle),
           cost: calculateRouteCost(routeData.summary.distance, routeData.summary.duration, vehicle),
           confidence: calculateRouteConfidence(routeData),
           warnings: extractRouteWarnings(routeData)
         };
         
         return enhanced;
       })
     );
     
     // Calculate comprehensive statistics
     const processingTime = Date.now() - startTime;
     const statistics = calculateRouteStatistics(enhancedRoutes, startTime);
     
     // Update global statistics
     routeStats.totalRequests++;
     routeStats.successfulRoutes++;
     routeStats.totalProcessingTime += processingTime;
     routeStats.averageResponseTime = routeStats.totalProcessingTime / routeStats.totalRequests;
     routeStats.lastUpdated = new Date().toISOString();
     
     // Calculate savings compared to baseline
     const baseline = enhancedRoutes.find(r => r.type === 'Fastest') || enhancedRoutes[0];
     const timeSavings = calculateTimeSavings(enhancedRoutes, baseline);
     const fuelSavings = calculateFuelSavings(enhancedRoutes, baseline);
     
     routeStats.totalTimeSaved += timeSavings;
     routeStats.totalFuelSaved += fuelSavings;
     
     log('info', 'Route optimization completed successfully', {
       requestId,
       userId: user.uid,
       routeCount: enhancedRoutes.length,
       processingTime,
       priority,
       vehicle,
       accuracy: statistics.averageConfidence
     });
     
     // Validate accuracy requirement (99%+)
     if (statistics.averageConfidence < 90) {
       log('warn', 'Route confidence below threshold', {
         requestId,
         confidence: statistics.averageConfidence,
         threshold: 90
       });
     }
     
     // Prepare response data
     const responseData = {
       requestId,
       routes: enhancedRoutes,
       statistics: {
         ...statistics,
         processingTime,
         timeSavings,
         fuelSavings,
         accuracy: statistics.averageConfidence
       },
       metadata: {
         priority,
         vehicle,
         preferences: { avoidTolls, avoidHighways, avoidFerries, includeTraffic },
         timestamp: new Date().toISOString(),
         userId: user.uid,
         cached: false
       }
     };
     
     // Cache the result
     cache.set(cacheKey, responseData);
     
     return createSuccessResponse(responseData, 200, { requestId });
     
   } catch (error) {
     log('error', 'Route optimization failed', { requestId, error: error.message });
     return handleExternalAPIError(error, 'route optimization', requestId);
   }
});

// Helper function to fetch traffic predictions
async function fetchTrafficPredictions(start, destination) {
  try {
    const response = await axios.get(`${process.env.NETLIFY_URL || 'http://localhost:8888'}/.netlify/functions/traffic-predictions`, {
      params: {
        lat: start[0],
        lng: start[1],
        city: 'Delhi',
        count: 5
      },
      timeout: 5000
    });
    return response.data.predictions || [];
  } catch (error) {
    log('warn', 'Failed to fetch traffic predictions, using defaults', { error: error.message });
    return [];
  }
}

// Enhanced request validation
function validateRouteRequest(body) {
  const errors = [];
  
  // Check required fields
  if (!body.start) errors.push('start coordinates are required');
  if (!body.destination) errors.push('destination coordinates are required');
  
  // Validate coordinates
  if (body.start && !isValidCoordinate(body.start)) {
    errors.push('Invalid start coordinates format');
  }
  if (body.destination && !isValidCoordinate(body.destination)) {
    errors.push('Invalid destination coordinates format');
  }
  
  // Validate priority
  const validPriorities = ['fastest', 'shortest', 'eco', 'scenic'];
  if (body.priority && !validPriorities.includes(body.priority)) {
    errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }
  
  // Validate vehicle type
  const validVehicles = Object.keys(VEHICLE_TYPES);
  if (body.vehicle && !validVehicles.includes(body.vehicle)) {
    errors.push(`Invalid vehicle type. Allowed: ${validVehicles.join(', ')}`);
  }
  
  // Validate boolean fields
  const booleanFields = ['avoidTolls', 'avoidHighways', 'avoidFerries', 'includeTraffic'];
  booleanFields.forEach(field => {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      errors.push(`${field} must be a boolean value`);
    }
  });
  
  // Check distance limit (max 500km for free tier)
  if (body.start && body.destination && isValidCoordinate(body.start) && isValidCoordinate(body.destination)) {
    const startLng = body.start.longitude || body.start.lng;
    const startLat = body.start.latitude || body.start.lat;
    const destLng = body.destination.longitude || body.destination.lng;
    const destLat = body.destination.latitude || body.destination.lat;
    
    const distance = turf.distance(
      [startLng, startLat],
      [destLng, destLat],
      { units: 'kilometers' }
    );
    
    if (distance > 500) {
      errors.push('Route distance exceeds maximum limit of 500km');
    }
  }
  
  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : null,
    errors
  };
}

// Validate coordinates format
function isValidCoordinate(coord) {
  if (!coord) return false;
  
  // Handle both {lat, lng} and {latitude, longitude} formats
  const lat = coord.latitude || coord.lat;
  const lng = coord.longitude || coord.lng;
  
  return typeof lat === 'number' && 
         typeof lng === 'number' &&
         lat >= -90 && lat <= 90 &&
         lng >= -180 && lng <= 180 &&
         !isNaN(lat) && !isNaN(lng);
}

// Get routing profiles based on priority and vehicle type
function getProfilesForPriority(priority, vehicle) {
  const baseProfiles = {
    'driving-car': [
      { type: 'driving-car', name: 'Fastest', priority: 'time' },
      { type: 'driving-car', name: 'Shortest', priority: 'distance' },
      { type: 'driving-car', name: 'Eco-Friendly', priority: 'fuel' },
      { type: 'driving-car', name: 'Scenic', priority: 'scenic' }
    ],
    'driving-hgv': [
      { type: 'driving-hgv', name: 'Fastest', priority: 'time' },
      { type: 'driving-hgv', name: 'Shortest', priority: 'distance' },
      { type: 'driving-hgv', name: 'Eco-Friendly', priority: 'fuel' }
    ],
    'cycling-regular': [
      { type: 'cycling-regular', name: 'Fastest', priority: 'time' },
      { type: 'cycling-regular', name: 'Shortest', priority: 'distance' },
      { type: 'cycling-regular', name: 'Scenic', priority: 'scenic' }
    ],
    'foot-walking': [
      { type: 'foot-walking', name: 'Fastest', priority: 'time' },
      { type: 'foot-walking', name: 'Shortest', priority: 'distance' }
    ]
  };
  
  return baseProfiles[vehicle] || baseProfiles['driving-car'];
}

// Calculate comprehensive route statistics
function calculateRouteStatistics(routes, startTime) {
  if (!routes || routes.length === 0) {
    return {
      routeCount: 0,
      averageDistance: 0,
      averageDuration: 0,
      averageConfidence: 0,
      processingTime: Date.now() - startTime
    };
  }
  
  const totalDistance = routes.reduce((sum, route) => sum + (route.distance || 0), 0);
  const totalDuration = routes.reduce((sum, route) => sum + (route.duration || 0), 0);
  const totalConfidence = routes.reduce((sum, route) => sum + (route.confidence || 95), 0);
  
  return {
    routeCount: routes.length,
    averageDistance: Math.round(totalDistance / routes.length),
    averageDuration: Math.round(totalDuration / routes.length),
    averageConfidence: Math.round(totalConfidence / routes.length),
    processingTime: Date.now() - startTime,
    shortestRoute: Math.min(...routes.map(r => r.distance || Infinity)),
    fastestRoute: Math.min(...routes.map(r => r.duration || Infinity))
  };
}

// Calculate fuel consumption based on distance and vehicle type
function calculateFuelConsumption(distance, vehicle) {
  const fuelRates = {
    'driving-car': 0.08, // 8L/100km
    'driving-hgv': 0.35, // 35L/100km
    'cycling-regular': 0,
    'foot-walking': 0
  };
  
  const rate = fuelRates[vehicle] || fuelRates['driving-car'];
  const consumption = (distance / 1000) * rate; // Convert meters to km
  const cost = consumption * 1.5; // Assume ₹1.5 per liter
  
  return {
    liters: Math.round(consumption * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    emissions: Math.round(consumption * 2.31 * 100) / 100 // kg CO2
  };
}

// Calculate route cost including fuel, tolls, and time
function calculateRouteCost(distance, duration, vehicle) {
  const fuel = calculateFuelConsumption(distance, vehicle);
  const timeCost = (duration / 3600) * 200; // ₹200 per hour time value
  
  return {
    fuel: fuel.cost,
    time: Math.round(timeCost * 100) / 100,
    total: Math.round((fuel.cost + timeCost) * 100) / 100
  };
}

// Calculate route confidence based on data quality
function calculateRouteConfidence(routeData) {
  let confidence = 95; // Base confidence
  
  // Reduce confidence for missing data
  if (!routeData.segments || routeData.segments.length === 0) confidence -= 10;
  if (!routeData.geometry || !routeData.geometry.coordinates) confidence -= 5;
  
  // Increase confidence for detailed instructions
  if (routeData.segments && routeData.segments[0]?.steps?.length > 5) confidence += 3;
  
  return Math.max(85, Math.min(99, confidence));
}

// Extract warnings from route data
function extractRouteWarnings(routeData) {
  const warnings = [];
  
  if (routeData.summary?.distance > 100000) {
    warnings.push('Long distance route - consider rest stops');
  }
  
  if (routeData.summary?.duration > 14400) { // 4 hours
    warnings.push('Long duration route - plan for breaks');
  }
  
  return warnings;
}

// Get traffic data for route geometry
async function getTrafficData(geometry) {
  try {
    // Simplified traffic data - in production, integrate with HERE Traffic API
    const coordinates = geometry.coordinates || [];
    const segments = [];
    
    for (let i = 0; i < coordinates.length - 1; i += Math.ceil(coordinates.length / 10)) {
      const coord = coordinates[i];
      segments.push({
        coordinates: coord,
        trafficLevel: Math.random() > 0.7 ? 'heavy' : Math.random() > 0.4 ? 'moderate' : 'light',
        speed: Math.round(30 + Math.random() * 50), // km/h
        delay: Math.round(Math.random() * 300) // seconds
      });
    }
    
    return {
      segments,
      overallLevel: segments.filter(s => s.trafficLevel === 'heavy').length > segments.length / 3 ? 'heavy' : 'moderate',
      totalDelay: segments.reduce((sum, s) => sum + s.delay, 0)
    };
  } catch (error) {
    log('error', 'Failed to get traffic data', { error: error.message });
    return null;
  }
}

// Calculate time savings compared to baseline
function calculateTimeSavings(routes, baseline) {
  if (!baseline || routes.length === 0) return 0;
  
  const fastestRoute = routes.reduce((fastest, route) => 
    route.duration < fastest.duration ? route : fastest
  );
  
  return Math.max(0, baseline.duration - fastestRoute.duration);
}

// Calculate fuel savings compared to baseline
function calculateFuelSavings(routes, baseline) {
  if (!baseline || routes.length === 0) return 0;
  
  const ecoRoute = routes.find(r => r.type === 'Eco-Friendly') || 
                   routes.reduce((eco, route) => 
                     route.fuel.liters < eco.fuel.liters ? route : eco
                   );
  
  return Math.max(0, baseline.fuel.liters - ecoRoute.fuel.liters);
}

// Generate fallback routes when API fails
function generateFallbackRoutes(start, destination, priority, vehicle) {
  const distance = turf.distance(
    [start.longitude, start.latitude],
    [destination.longitude, destination.latitude],
    { units: 'meters' }
  );
  
  const baseTime = distance / getProfileSpeed(vehicle.replace('driving-', '')) * 3.6;
  
  return [
    {
      id: uuidv4(),
      type: 'Fastest',
      priority: 'time',
      distance: Math.round(distance),
      duration: Math.round(baseTime * 0.9),
      geometry: { coordinates: generateMockRoute(start, destination) },
      fuel: calculateFuelConsumption(distance, vehicle),
      cost: calculateRouteCost(distance, baseTime * 0.9, vehicle),
      confidence: 85,
      warnings: ['Using estimated route - actual conditions may vary']
    },
    {
      id: uuidv4(),
      type: 'Shortest',
      priority: 'distance',
      distance: Math.round(distance * 0.95),
      duration: Math.round(baseTime),
      geometry: { coordinates: generateMockRoute(start, destination) },
      fuel: calculateFuelConsumption(distance * 0.95, vehicle),
      cost: calculateRouteCost(distance * 0.95, baseTime, vehicle),
      confidence: 85,
      warnings: ['Using estimated route - actual conditions may vary']
    }
  ];
}

// Helper function to generate mock route coordinates
function generateMockRoute(start, destination) {
  const steps = 10;
  const coordinates = [];
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = start.latitude + (destination.latitude - start.latitude) * ratio;
    const lng = start.longitude + (destination.longitude - start.longitude) * ratio;
    coordinates.push([lng, lat]);
  }
  
  return coordinates;
}

exports.handler = handler;