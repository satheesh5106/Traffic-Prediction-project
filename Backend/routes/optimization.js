const express = require('express');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const winston = require('winston');
const NodeCache = require('node-cache');
const router = express.Router();

const prisma = new PrismaClient();
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/optimization.log' }),
    new winston.transports.Console()
  ]
});

// TomTom API configuration
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_ROUTING_BASE = 'https://api.tomtom.com/routing/1/calculateRoute';
const TOMTOM_SEARCH_BASE = 'https://api.tomtom.com/search/2/geocode';

// Hash map for caching routes (DSA implementation)
const routeCache = new Map();

// Removed cityCoordinates mock data - using only TomTom API

// Geocoding function to convert city names to coordinates using only TomTom API
async function geocodeLocation(location) {
  // If already coordinates, return as is
  if (typeof location === 'object' && location.lat && location.lon) {
    return location;
  }
  
  // If string, try to geocode using TomTom API only
  if (typeof location === 'string') {
    if (TOMTOM_API_KEY && TOMTOM_API_KEY.length > 10) {
      try {
        const geocodeUrl = `${TOMTOM_SEARCH_BASE}/${encodeURIComponent(location)}.json`;
        const response = await axios.get(geocodeUrl, {
          params: { key: TOMTOM_API_KEY, limit: 1 },
          timeout: 5000
        });
        
        if (response.data && response.data.results && response.data.results.length > 0) {
          const result = response.data.results[0];
          return {
            lat: result.position.lat,
            lon: result.position.lon
          };
        }
      } catch (error) {
        logger.warn(`Geocoding failed for ${location}: ${error.message}`);
      }
    }
    
    // Return null if geocoding fails
    return null;
  }
  
  return null;
}

// A* Algorithm implementation for route optimization (DSA)
class AStarNode {
  constructor(lat, lon, g = 0, h = 0, parent = null) {
    this.lat = lat;
    this.lon = lon;
    this.g = g; // Cost from start
    this.h = h; // Heuristic cost to goal
    this.f = g + h; // Total cost
    this.parent = parent;
  }
  
  getId() {
    return `${this.lat.toFixed(6)}_${this.lon.toFixed(6)}`;
  }
}

// Haversine distance calculation for A* heuristic
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// A* pathfinding simulation (simplified for demonstration)
function simulateAStarPathfinding(startLat, startLon, endLat, endLon, waypoints = []) {
  const start = new AStarNode(startLat, startLon);
  const goal = new AStarNode(endLat, endLon);
  
  // Simulate A* algorithm with waypoints
  const path = [start];
  
  // Add waypoints to path
  waypoints.forEach(wp => {
    path.push(new AStarNode(wp.lat, wp.lon));
  });
  
  path.push(goal);
  
  // Calculate total distance and estimated time
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += calculateDistance(
      path[i].lat, path[i].lon,
      path[i + 1].lat, path[i + 1].lon
    );
  }
  
  return {
    path: path.map(node => ({ lat: node.lat, lon: node.lon })),
    distance: totalDistance,
    estimatedTime: Math.round(totalDistance / 50 * 60), // Assuming 50 km/h average
    algorithm: 'A*'
  };
}

// Helper function to get cache key
function getCacheKey(start, destination, options = {}) {
  return `route_${start.lat}_${start.lon}_${destination.lat}_${destination.lon}_${JSON.stringify(options)}`;
}

// Helper function to validate coordinates
function validateCoordinates(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  return !isNaN(latitude) && !isNaN(longitude) && 
         latitude >= -90 && latitude <= 90 && 
         longitude >= -180 && longitude <= 180;
}

// Route: Optimize routes using TomTom API with A* simulation
router.post('/optimize', async (req, res) => {
  try {
    const { 
      start, 
      destination, 
      vehicleType = 'car',
      vehicle_type = 'car',
      priority = 'fastest',
      avoidTolls = false,
      avoidHighways = false,
      maxAlternatives = 5
    } = req.body;
    
    // Handle both vehicleType and vehicle_type for compatibility
    const finalVehicleType = vehicleType !== 'car' ? vehicleType : vehicle_type;
    
    // Validate input
    if (!start || !destination) {
      logger.warn('Missing start or destination in request body');
      return res.status(400).json({
        success: false,
        error: 'Start and destination are required'
      });
    }
    
    logger.info(`Route optimization request: start="${start}", destination="${destination}", vehicleType="${finalVehicleType}", priority="${priority}"`);
    
    // Geocode locations (convert city names to coordinates if needed)
    logger.info(`Geocoding start location: "${start}"`);
    const startCoords = await geocodeLocation(start);
    logger.info(`Start coordinates result:`, startCoords);
    
    logger.info(`Geocoding destination location: "${destination}"`);
    const destCoords = await geocodeLocation(destination);
    logger.info(`Destination coordinates result:`, destCoords);
    
    if (!startCoords || !destCoords) {
      logger.warn(`Geocoding failed - startCoords: ${JSON.stringify(startCoords)}, destCoords: ${JSON.stringify(destCoords)}`);
      return res.status(400).json({
        success: false,
        error: 'Could not find coordinates for the specified locations',
        details: {
          start: start,
          destination: destination,
          startFound: !!startCoords,
          destFound: !!destCoords
        }
      });
    }
    
    if (!validateCoordinates(startCoords.lat, startCoords.lon) || !validateCoordinates(destCoords.lat, destCoords.lon)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided'
      });
    }
    
    const cacheKey = getCacheKey(startCoords, destCoords, { vehicleType: finalVehicleType, priority, avoidTolls, avoidHighways });
    
    // Check cache first (DSA hash map implementation)
    if (routeCache.has(cacheKey)) {
      const cachedData = routeCache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < 600000) { // 10 minutes
        logger.info(`Returning cached route data for ${startCoords.lat},${startCoords.lon} to ${destCoords.lat},${destCoords.lon}`);
        return res.json(cachedData.data);
      } else {
        routeCache.delete(cacheKey);
      }
    }
    
    logger.info(`Optimizing route from ${startCoords.lat},${startCoords.lon} to ${destCoords.lat},${destCoords.lon}`);
    
    // Check if TomTom API key is available
    if (!TOMTOM_API_KEY || TOMTOM_API_KEY.length < 10) {
      logger.error('TomTom API key not configured');
       return res.status(503).json({
         success: false,
         error: 'Route optimization service temporarily unavailable',
         message: 'TomTom API key not configured'
       });
    }
    
    // Build TomTom routing request
    const routeUrl = `${TOMTOM_ROUTING_BASE}/${startCoords.lat},${startCoords.lon}:${destCoords.lat},${destCoords.lon}/json`;
    
    const params = {
      key: TOMTOM_API_KEY,
      maxAlternatives: Math.min(maxAlternatives, 5),
      traffic: true,
      travelMode: finalVehicleType === 'motorcycle' ? 'motorcycle' : 'car',
      routeType: priority === 'fastest' ? 'fastest' : priority === 'shortest' ? 'shortest' : 'eco',
      avoid: []
    };
    
    if (avoidTolls) params.avoid.push('tollRoads');
    if (avoidHighways) params.avoid.push('motorways');
    if (params.avoid.length > 0) {
      params.avoid = params.avoid.join(',');
    } else {
      delete params.avoid;
    }
    
    const response = await axios.get(routeUrl, {
      params,
      timeout: 15000
    });
    
    const routeData = response.data;
    
    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No routes found for the specified locations'
      });
    }
    
    // Process routes
    const processedRoutes = routeData.routes.map((route, index) => {
      const summary = route.summary;
      const legs = route.legs || [];
      
      // Extract polyline points
      const polylinePoints = [];
      legs.forEach(leg => {
        if (leg.points) {
          leg.points.forEach(point => {
            polylinePoints.push({
              lat: point.latitude,
              lng: point.longitude  // Use lng instead of lon for frontend compatibility
            });
          });
        }
      });
      
      // If no points from API, create basic polyline
      if (polylinePoints.length === 0) {
        polylinePoints.push(
          { lat: startCoords.lat, lng: startCoords.lon },
          { lat: destCoords.lat, lng: destCoords.lon }
        );
      }
      
      return {
        id: `route_${index}`,
        name: `Route ${index + 1}`,
        type: priority || 'fastest',
        distance: Math.round((summary.lengthInMeters || 0) / 1000 * 100) / 100, // km
        time: Math.round((summary.travelTimeInSeconds || 0) / 60), // minutes
        traffic: summary.trafficDelayInSeconds > 300 ? 'heavy' : summary.trafficDelayInSeconds > 120 ? 'moderate' : 'light',
        fuelConsumption: summary.fuelConsumptionInLiters || 0,
        coordinates: polylinePoints, // Frontend expects 'coordinates' field
        summary: {
          distance: summary.lengthInMeters || 0,
          distanceKm: Math.round((summary.lengthInMeters || 0) / 1000 * 100) / 100,
          duration: summary.travelTimeInSeconds || 0,
          durationMinutes: Math.round((summary.travelTimeInSeconds || 0) / 60),
          trafficDelay: summary.trafficDelayInSeconds || 0,
          fuelConsumption: summary.fuelConsumptionInLiters || 0
        },
        polyline: polylinePoints,
        instructions: legs.flatMap(leg => 
          (leg.guidance?.instructions || []).map(instruction => ({
            text: instruction.message || instruction.instructionText || 'Continue',
            distance: instruction.routeOffsetInMeters || 0,
            time: instruction.travelTimeInSeconds || 0,
            maneuver: instruction.maneuver || 'straight'
          }))
        ),
        trafficInfo: {
          hasTrafficData: summary.trafficDelayInSeconds > 0,
          delayMinutes: Math.round((summary.trafficDelayInSeconds || 0) / 60),
          congestionLevel: summary.trafficDelayInSeconds > 300 ? 'high' : 
                         summary.trafficDelayInSeconds > 120 ? 'medium' : 'low'
        },
        source: 'tomtom'
      };
    });
    
    // Add A* algorithm simulation for comparison
    const astarResult = simulateAStarPathfinding(
      start.lat, start.lon, 
      destination.lat, destination.lon
    );
    
    const astarPolyline = astarResult.path.map(point => ({
      lat: point.lat,
      lng: point.lon  // Convert lon to lng for frontend compatibility
    }));
    
    processedRoutes.push({
      id: 'route_astar',
      name: 'A* Simulation Route',
      type: 'simulation',
      distance: Math.round(astarResult.distance * 100) / 100, // km
      time: astarResult.estimatedTime, // minutes
      traffic: 'light',
      fuelConsumption: 0,
      coordinates: astarPolyline, // Frontend expects 'coordinates' field
      summary: {
        distance: Math.round(astarResult.distance * 1000),
        distanceKm: Math.round(astarResult.distance * 100) / 100,
        duration: astarResult.estimatedTime * 60,
        durationMinutes: astarResult.estimatedTime,
        trafficDelay: 0,
        fuelConsumption: 0
      },
      polyline: astarPolyline,
      instructions: [
        { text: 'Start your journey', distance: 0, time: 0, maneuver: 'depart' },
        { text: 'Continue to destination', distance: astarResult.distance * 1000, time: astarResult.estimatedTime * 60, maneuver: 'straight' },
        { text: 'Arrive at destination', distance: astarResult.distance * 1000, time: astarResult.estimatedTime * 60, maneuver: 'arrive' }
      ],
      trafficInfo: {
        hasTrafficData: false,
        delayMinutes: 0,
        congestionLevel: 'low'
      },
      source: 'astar_simulation'
    });
    
    // Calculate route metrics
    const metrics = {
      totalRoutes: processedRoutes.length,
      fastestRoute: processedRoutes.reduce((fastest, current) => 
        current.summary.duration < fastest.summary.duration ? current : fastest
      ),
      shortestRoute: processedRoutes.reduce((shortest, current) => 
        current.summary.distance < shortest.summary.distance ? current : shortest
      ),
      averageDistance: Math.round(processedRoutes.reduce((sum, route) => 
        sum + route.summary.distance, 0) / processedRoutes.length / 1000 * 100) / 100,
      averageDuration: Math.round(processedRoutes.reduce((sum, route) => 
        sum + route.summary.duration, 0) / processedRoutes.length / 60)
    };
    
    const result = {
      success: true,
      routes: processedRoutes,
      metrics,
      mapCenter: {
        lat: (start.lat + destination.lat) / 2,
        lng: (start.lon + destination.lon) / 2  // Use lng for frontend compatibility
      },
      mapZoom: 12,
      request: {
        start,
        destination,
        vehicleType,
        priority,
        options: { avoidTolls, avoidHighways, maxAlternatives }
      },
      timestamp: new Date().toISOString()
    };
    
    // Cache the result (DSA hash map implementation)
    routeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // Store in database for analytics
    try {
      await prisma.routeOptimization.create({
        data: {
          startLatitude: start.lat,
          startLongitude: start.lon,
          endLatitude: destination.lat,
          endLongitude: destination.lon,
          vehicleType,
          priority,
          totalRoutes: processedRoutes.length,
          bestDistance: metrics.shortestRoute.summary.distance,
          bestDuration: metrics.fastestRoute.summary.duration,
          source: 'tomtom',
          timestamp: new Date()
        }
      });
    } catch (dbError) {
      logger.error('Error storing route optimization in database:', dbError.message);
    }
    
    res.json(result);
    
  } catch (error) {
    logger.error('Error optimizing route:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      request: {
         start: req.body.start,
         destination: req.body.destination,
         vehicleType: req.body.vehicleType,
         vehicle_type: req.body.vehicle_type,
         priority: req.body.priority
       }
    });
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: `TomTom API error: ${error.response.data?.error?.description || error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to optimize route',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route: Get navigation instructions for a specific route
router.post('/navigate', async (req, res) => {
  try {
    const { start, destination, routeId } = req.body;
    
    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Start and destination coordinates are required'
      });
    }
    
    if (!validateCoordinates(start.lat, start.lon) || !validateCoordinates(destination.lat, destination.lon)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided'
      });
    }
    
    logger.info(`Getting navigation instructions from ${start.lat},${start.lon} to ${destination.lat},${destination.lon}`);
    
    if (!TOMTOM_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'TomTom API key not configured'
      });
    }
    
    // Get detailed navigation instructions
    const routeUrl = `${TOMTOM_ROUTING_BASE}/${start.lat},${start.lon}:${destination.lat},${destination.lon}/json`;
    
    const response = await axios.get(routeUrl, {
      params: {
        key: TOMTOM_API_KEY,
        traffic: true,
        instructionsType: 'text',
        language: 'en-US',
        computeBestOrder: false
      },
      timeout: 10000
    });
    
    const routeData = response.data;
    
    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No navigation route found'
      });
    }
    
    const route = routeData.routes[0];
    const legs = route.legs || [];
    
    // Process navigation instructions
    const instructions = [];
    let totalDistance = 0;
    let totalTime = 0;
    
    legs.forEach((leg, legIndex) => {
      if (leg.guidance && leg.guidance.instructions) {
        leg.guidance.instructions.forEach((instruction, instrIndex) => {
          const distance = instruction.routeOffsetInMeters || 0;
          const time = instruction.travelTimeInSeconds || 0;
          
          instructions.push({
            id: `${legIndex}_${instrIndex}`,
            text: instruction.message || instruction.instructionText || 'Continue straight',
            maneuver: instruction.maneuver || 'straight',
            distance: distance,
            distanceText: distance > 1000 ? 
              `${Math.round(distance / 1000 * 10) / 10} km` : 
              `${Math.round(distance)} m`,
            time: time,
            timeText: time > 3600 ? 
              `${Math.floor(time / 3600)}h ${Math.floor((time % 3600) / 60)}m` :
              `${Math.floor(time / 60)}m`,
            coordinates: instruction.point ? {
              lat: instruction.point.latitude,
              lon: instruction.point.longitude
            } : null,
            streetName: instruction.street || '',
            exitNumber: instruction.exitNumber || null
          });
          
          totalDistance = Math.max(totalDistance, distance);
          totalTime = Math.max(totalTime, time);
        });
      }
    });
    
    // Add final arrival instruction
    instructions.push({
      id: 'arrival',
      text: 'You have arrived at your destination',
      maneuver: 'arrive',
      distance: totalDistance,
      distanceText: totalDistance > 1000 ? 
        `${Math.round(totalDistance / 1000 * 10) / 10} km` : 
        `${Math.round(totalDistance)} m`,
      time: totalTime,
      timeText: totalTime > 3600 ? 
        `${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m` :
        `${Math.floor(totalTime / 60)}m`,
      coordinates: {
        lat: destination.lat,
        lon: destination.lon
      },
      streetName: '',
      exitNumber: null
    });
    
    const navigationData = {
      success: true,
      navigation: {
        routeId: routeId || 'default',
        instructions: instructions,
        summary: {
          totalDistance: totalDistance,
          totalDistanceText: totalDistance > 1000 ? 
            `${Math.round(totalDistance / 1000 * 10) / 10} km` : 
            `${Math.round(totalDistance)} m`,
          totalTime: totalTime,
          totalTimeText: totalTime > 3600 ? 
            `${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m` :
            `${Math.floor(totalTime / 60)}m`,
          instructionCount: instructions.length
        },
        start: start,
        destination: destination
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(navigationData);
    
  } catch (error) {
    logger.error('Error getting navigation instructions:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: `TomTom API error: ${error.response.data?.error?.description || error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get navigation instructions'
    });
  }
});

// Route: Get route history for analytics
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, vehicleType, priority } = req.query;
    
    const where = {};
    if (vehicleType) where.vehicleType = vehicleType;
    if (priority) where.priority = priority;
    
    logger.info('Fetching route optimization history');
    
    const routeHistory = await prisma.routeOptimization.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: Math.min(parseInt(limit) || 50, 100)
    });
    
    res.json({
      success: true,
      history: routeHistory,
      count: routeHistory.length,
      filters: { vehicleType, priority }
    });
    
  } catch (error) {
    logger.error('Error fetching route history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route history'
    });
  }
});

// Route: Get route cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      cache: {
        size: routeCache.size,
        keys: Array.from(routeCache.keys()).slice(0, 10), // Show first 10 keys
        nodeCache: {
          keys: cache.keys().length,
          stats: cache.getStats()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

module.exports = router;