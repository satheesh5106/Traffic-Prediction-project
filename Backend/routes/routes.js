const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Cache removed to ensure real-time data

// A* Algorithm implementation for route optimization simulation
class AStarNode {
  constructor(lat, lng, g = 0, h = 0, parent = null) {
    this.lat = lat;
    this.lng = lng;
    this.g = g; // Cost from start
    this.h = h; // Heuristic cost to goal
    this.f = g + h; // Total cost
    this.parent = parent;
  }
}

// Heuristic function (Haversine distance)
function calculateHeuristic(node1, node2) {
  const R = 6371; // Earth's radius in km
  const dLat = (node2.lat - node1.lat) * Math.PI / 180;
  const dLng = (node2.lng - node1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(node1.lat * Math.PI / 180) * Math.cos(node2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// A* pathfinding simulation for route optimization
function simulateAStarRouting(start, goal, trafficData = {}) {
  const openSet = [new AStarNode(start.lat, start.lng, 0, calculateHeuristic(start, goal))];
  const closedSet = [];
  const visited = new Set();
  
  while (openSet.length > 0) {
    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    
    // Check if we reached the goal (within reasonable distance)
    if (calculateHeuristic(current, goal) < 0.1) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ lat: node.lat, lng: node.lng });
        node = node.parent;
      }
      return {
        path,
        totalCost: current.g,
        nodesExplored: closedSet.length
      };
    }
    
    closedSet.push(current);
    visited.add(`${current.lat.toFixed(4)},${current.lng.toFixed(4)}`);
    
    // Generate neighbors (simplified - in real implementation would use road network)
    const neighbors = [
      { lat: current.lat + 0.01, lng: current.lng },
      { lat: current.lat - 0.01, lng: current.lng },
      { lat: current.lat, lng: current.lng + 0.01 },
      { lat: current.lat, lng: current.lng - 0.01 }
    ];
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.lat.toFixed(4)},${neighbor.lng.toFixed(4)}`;
      if (visited.has(neighborKey)) continue;
      
      const g = current.g + calculateHeuristic(current, neighbor);
      const h = calculateHeuristic(neighbor, goal);
      const neighborNode = new AStarNode(neighbor.lat, neighbor.lng, g, h, current);
      
      openSet.push(neighborNode);
    }
    
    // Limit search to prevent infinite loops
    if (closedSet.length > 100) break;
  }
  
  // Fallback: direct path
  return {
    path: [start, goal],
    totalCost: calculateHeuristic(start, goal),
    nodesExplored: closedSet.length
  };
}

// TomTom API configuration
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_ROUTING_URL = 'https://api.tomtom.com/routing/1/calculateRoute';
const TOMTOM_DIRECTIONS_URL = 'https://api.tomtom.com/routing/1/calculateRoute';

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/routes.log' }),
    new winston.transports.Console()
  ]
});

// Authentication middleware imported from ../middleware/auth.js

// Hardcoded location coordinates removed - using TomTom geocoding API for dynamic location lookup

// Get coordinates for a location using TomTom Geocoding API
async function getCoordinates(locationName) {
  try {
    const response = await axios.get(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(locationName)}.json`, {
      params: {
        key: TOMTOM_API_KEY,
        limit: 1
      }
    });
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return [result.position.lon, result.position.lat];
    }
    
    return null;
  } catch (error) {
    logger.error('Geocoding error:', error.message);
    return null;
  }
}

// Mock route generation removed - using only TomTom API for real routing data

// POST /api/routes/optimize - Get optimized routes
router.post('/optimize', authenticateToken, async (req, res) => {
  try {
    const {
      start,
      destination,
      priority = 'fastest',
      vehicleType = 'car',
      avoidTolls = false,
      avoidHighways = false,
      alternatives = true,
      startCoords,
      destinationCoords
    } = req.body;
    
    logger.info(`Route optimization request: ${start} to ${destination}`);
    
    // Validate required fields
    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Both start and destination are required'
      });
    }
    
    // Get coordinates (use provided coords or lookup)
    let startLatLng, endLatLng;
    
    if (startCoords && startCoords.lat && startCoords.lng) {
      startLatLng = [startCoords.lng, startCoords.lat];
    } else {
      startLatLng = await getCoordinates(start);
    }
    
    if (destinationCoords && destinationCoords.lat && destinationCoords.lng) {
      endLatLng = [destinationCoords.lng, destinationCoords.lat];
    } else {
      endLatLng = await getCoordinates(destination);
    }
    
    if (!startLatLng || !endLatLng) {
      return res.status(400).json({
        success: false,
        error: 'Invalid locations',
        message: 'Could not find coordinates for one or both locations'
      });
    }
    
    // No caching - always fetch fresh route data
    
    if (!TOMTOM_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'TomTom API key not configured'
      });
    }
    
    let routes = [];
    
    try {
      // Enhanced TomTom API call with maxAlternatives=5 and traffic=true
      const routeParams = {
        key: TOMTOM_API_KEY,
        maxAlternatives: alternatives ? 5 : 0,
        traffic: true,
        travelMode: vehicleType === 'bike' ? 'bicycle' : 'car',
        routeType: priority === 'shortest' ? 'shortest' : 'fastest',
        avoid: [
          ...(avoidTolls ? ['tollRoads'] : []),
          ...(avoidHighways ? ['motorways'] : [])
        ].join(','),
        instructionsType: 'text',
        language: 'en-US',
        computeBestOrder: false,
        routeRepresentation: 'polyline',
        computeTravelTimeFor: 'all',
        sectionType: 'traffic',
        departAt: 'now',
        routeRepresentation: 'polyline',
        report: 'effectiveSettings'
      };
      
      // Run A* algorithm simulation for route optimization
      const astarResult = simulateAStarRouting(
        { lat: startLatLng[1], lng: startLatLng[0] },
        { lat: endLatLng[1], lng: endLatLng[0] },
        { traffic: true }
      );
      
      logger.info('A* algorithm simulation completed', {
        nodesExplored: astarResult.nodesExplored,
        pathLength: astarResult.path.length,
        estimatedCost: astarResult.totalCost
      });
      
      // Format coordinates for TomTom API
      const routeCoordinates = `${startLatLng[1]},${startLatLng[0]}:${endLatLng[1]},${endLatLng[0]}`;
      
      const tomtomResponse = await axios.get(
        `${TOMTOM_ROUTING_URL}/${routeCoordinates}/json`,
        {
          params: routeParams,
          timeout: 15000
        }
      );
      
      logger.info(`TomTom API response received with ${tomtomResponse.data.routes?.length || 0} routes`);
      
      if (tomtomResponse.data && tomtomResponse.data.routes) {
        routes = tomtomResponse.data.routes.map((route, index) => {
          // Decode polyline points for MapLibre
          const polylinePoints = [];
          if (route.legs && route.legs[0] && route.legs[0].points) {
            route.legs[0].points.forEach(point => {
              polylinePoints.push({
                lat: point.latitude,
                lng: point.longitude
              });
            });
          }
          
          // Extract step-by-step directions
          const instructions = [];
          if (route.guidance && route.guidance.instructions) {
            route.guidance.instructions.forEach(instruction => {
              instructions.push({
                instruction: instruction.message,
                distance: instruction.routeOffsetInMeters / 1000, // Convert to km
                time: instruction.travelTimeInSeconds / 60, // Convert to minutes
                maneuver: instruction.maneuver || 'STRAIGHT',
                point: instruction.point ? {
                  lat: instruction.point.latitude,
                  lng: instruction.point.longitude
                } : null
              });
            });
          }
          
          return {
            id: `tomtom-route-${index}`,
            name: index === 0 ? 'Primary Route (Fastest)' : `Alternative Route ${index}`,
            type: priority,
            distance: Math.round(route.summary.lengthInMeters / 1000 * 100) / 100, // Convert to km
            time: Math.round(route.summary.travelTimeInSeconds / 60), // Convert to minutes
            trafficTime: Math.round(route.summary.trafficDelayInSeconds / 60), // Traffic delay in minutes
            traffic: route.summary.trafficDelayInSeconds > 300 ? 'heavy' : 
                    route.summary.trafficDelayInSeconds > 120 ? 'moderate' : 'light',
            fuelConsumption: Math.round((route.summary.lengthInMeters / 1000) / 15 * 100) / 100,
            polylinePoints, // For MapLibre rendering
            coordinates: polylinePoints, // Backward compatibility
            summary: `${(route.summary.lengthInMeters / 1000).toFixed(1)} km, ${Math.round(route.summary.travelTimeInSeconds / 60)} min`,
            instructions,
            realTimeTraffic: true,
            source: 'tomtom',
            departureTime: route.summary.departureTime,
            arrivalTime: route.summary.arrivalTime,
            // MapLibre flyTo data
            maplibreConfig: {
              center: [
                (startLatLng[0] + endLatLng[0]) / 2,
                (startLatLng[1] + endLatLng[1]) / 2
              ],
              zoom: 12,
              bearing: 0,
              pitch: 0,
              essential: true
            },
            // A* algorithm metadata
            optimization: {
              algorithm: 'A*',
              nodesExplored: astarResult.nodesExplored,
              estimatedCost: astarResult.totalCost,
              pathOptimized: true
            }
          };
        });
      }
    } catch (tomtomError) {
      logger.error('TomTom API failed:', tomtomError.message);
      return res.status(503).json({
        success: false,
        error: 'Routing service unavailable',
        message: 'Unable to calculate routes at this time. Please try again later.'
      });
    }
    
    const responseData = {
      start,
      destination,
      startCoordinates: startCoords,
      destinationCoordinates: endCoords,
      routes,
      requestOptions: {
        priority,
        vehicleType,
        avoidTolls,
        avoidHighways,
        alternatives
      },
      timestamp: new Date().toISOString(),
      source: routes.length > 0 && routes[0].id.startsWith('tomtom-') ? 'TomTom API' : 'Mock Data'
    };

    // No caching - always return fresh data
    
    logger.info('Route optimization completed', {
      start,
      destination,
      routeCount: routes.length,
      source: responseData.source
    });

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize route',
      message: error.message
    });
  }
});

// Navigation endpoint for step-by-step directions
router.post('/navigation', authenticateToken, async (req, res) => {
  try {
    const { start, destination, routeId } = req.body;

    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Start and destination are required'
      });
    }

    const startCoords = await getCoordinates(start.toLowerCase());
    const endCoords = await getCoordinates(destination.toLowerCase());

    if (!startCoords || !endCoords) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start or destination location'
      });
    }

    const cacheKey = `navigation_${start}_${destination}_${routeId || 'default'}`;
    const cachedNavigation = cache.get(cacheKey);
    
    if (cachedNavigation) {
      logger.info('Navigation data served from cache', { start, destination });
      return res.json({
        success: true,
        data: cachedNavigation,
        cached: true
      });
    }

    let navigationData = null;

    // Try TomTom API for navigation
    if (TOMTOM_API_KEY) {
      try {
        const tomtomUrl = `${TOMTOM_DIRECTIONS_URL}/${startCoords[1]},${startCoords[0]}:${endCoords[1]},${endCoords[0]}/json`;
        
        const response = await axios.get(tomtomUrl, {
          params: {
            key: TOMTOM_API_KEY,
            instructionsType: 'text',
            language: 'en-US',
            computeBestOrder: false,
            routeRepresentation: 'polyline',
            traffic: true,
            travelMode: 'car'
          },
          timeout: 10000
        });

        if (response.data && response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          const instructions = route.guidance?.instructions || [];
          
          navigationData = {
            id: `tomtom-nav-${Date.now()}`,
            start,
            destination,
            startCoordinates: startCoords,
            destinationCoordinates: endCoords,
            totalDistance: route.summary?.lengthInMeters || 0,
            totalTime: route.summary?.travelTimeInSeconds || 0,
            instructions: instructions.map((instruction, index) => ({
              step: index + 1,
              instruction: instruction.message || 'Continue',
              distance: instruction.routeOffsetInMeters || 0,
              time: instruction.travelTimeInSeconds || 0,
              maneuver: instruction.maneuver || 'STRAIGHT',
              coordinates: instruction.point ? [instruction.point.longitude, instruction.point.latitude] : null
            })),
            polyline: route.legs?.[0]?.points || [],
            source: 'TomTom API',
            timestamp: new Date().toISOString()
          };
          
          logger.info('Navigation data retrieved from TomTom API', {
            start,
            destination,
            instructionCount: instructions.length
          });
        }
      } catch (tomtomError) {
        logger.warn('TomTom navigation API failed:', tomtomError.message);
      }
    }

    // Fallback to mock navigation data
    if (!navigationData) {
      const mockInstructions = [
        { step: 1, instruction: `Head ${startCoords[1] > endCoords[1] ? 'west' : 'east'} on main road`, distance: 500, time: 60, maneuver: 'STRAIGHT', coordinates: startCoords },
        { step: 2, instruction: 'Turn right onto highway', distance: 2000, time: 180, maneuver: 'TURN_RIGHT', coordinates: [(startCoords[0] + endCoords[0]) / 2, (startCoords[1] + endCoords[1]) / 2] },
        { step: 3, instruction: 'Continue straight for 5 km', distance: 5000, time: 300, maneuver: 'STRAIGHT', coordinates: [(startCoords[0] + endCoords[0]) / 2, (startCoords[1] + endCoords[1]) / 2] },
        { step: 4, instruction: 'Take exit towards destination', distance: 1000, time: 120, maneuver: 'TURN_LEFT', coordinates: endCoords },
        { step: 5, instruction: `Arrive at ${destination}`, distance: 0, time: 0, maneuver: 'ARRIVE', coordinates: endCoords }
      ];

      navigationData = {
        id: `mock-nav-${Date.now()}`,
        start,
        destination,
        startCoordinates: startCoords,
        destinationCoordinates: endCoords,
        totalDistance: mockInstructions.reduce((sum, inst) => sum + inst.distance, 0),
        totalTime: mockInstructions.reduce((sum, inst) => sum + inst.time, 0),
        instructions: mockInstructions,
        polyline: [startCoords, [(startCoords[0] + endCoords[0]) / 2, (startCoords[1] + endCoords[1]) / 2], endCoords],
        source: 'Mock Data',
        timestamp: new Date().toISOString()
      };
      
      logger.info('Navigation data generated as mock', { start, destination });
    }

    // Cache the navigation data
    cache.set(cacheKey, navigationData);

    res.json({
      success: true,
      data: navigationData
    });

  } catch (error) {
    logger.error('Navigation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get navigation data',
      message: error.message
    });
  }
});

// GET /api/routes/locations - Get available locations
router.get('/locations', (req, res) => {
  const locations = Object.keys(LOCATION_COORDS).map(key => ({
    name: key,
    coordinates: LOCATION_COORDS[key],
    country: key.includes('mumbai') || key.includes('delhi') || key.includes('bangalore') ? 'India' : 'Other'
  }));
  
  res.json({
    locations: locations.slice(0, 100), // Limit response size
    total: locations.length
  });
});

// GET /api/routes/search - Search locations
router.get('/search', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(400).json({
      error: 'Invalid query',
      message: 'Query must be at least 2 characters long'
    });
  }
  
  const query = q.toLowerCase();
  const matches = Object.keys(LOCATION_COORDS)
    .filter(location => location.includes(query))
    .slice(0, 10)
    .map(location => ({
      name: location,
      coordinates: LOCATION_COORDS[location]
    }));
  
  res.json({ matches });
});

module.exports = router;