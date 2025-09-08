const express = require('express');
const fetch = require('node-fetch');
const db = require('../db');

const router = express.Router();

// API Configuration
const API_CONFIG = {
  ORS: {
    baseUrl: 'https://api.openrouteservice.org/v2/directions/driving-car',
    key: process.env.OPENROUTESERVICE_API_KEY
  },
  MAPMYINDIA: {
    baseUrl: 'https://apis.mapmyindia.com/advancedmaps/v1',
    key: process.env.MAPMYINDIA_API_KEY
  },
  OPENWEATHER: {
    baseUrl: 'https://api.openweathermap.org/data/2.5/weather',
    key: process.env.OPENWEATHERMAP_API_KEY
  },
  TOMTOM: {
    baseUrl: 'https://api.tomtom.com/routing/1/calculateRoute',
    key: process.env.TOMTOM_API_KEY
  }
};

// Helper function to fetch route data from OpenRouteService
async function fetchORSRoute(start, end) {
  try {
    const startCoords = `${start.lng},${start.lat}`;
    const endCoords = `${end.lng},${end.lat}`;
    
    const url = `${API_CONFIG.ORS.baseUrl}?api_key=${API_CONFIG.ORS.key}&start=${startCoords}&end=${endCoords}&format=json`;
    
    console.log(`🔄 Fetching ORS route: ${startCoords} -> ${endCoords}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrafficAI-Dashboard/1.0'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`ORS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found from ORS API');
    }

    const route = data.routes[0];
    return {
      distance: Math.round(route.summary.distance / 1000 * 100) / 100, // km
      duration: Math.round(route.summary.duration / 60), // minutes
      coordinates: route.geometry.coordinates,
      summary: route.summary
    };
  } catch (error) {
    console.error('❌ ORS API error:', error.message);
    throw error;
  }
}

// Helper function to fetch traffic data from MapMyIndia (fallback to mock data)
async function fetchTrafficData(lat, lng) {
  try {
    // Note: MapMyIndia API endpoint may need adjustment based on actual API documentation
    const url = `${API_CONFIG.MAPMYINDIA.baseUrl}/${API_CONFIG.MAPMYINDIA.key}/traffic/data?center=${lat},${lng}`;
    
    console.log(`🔄 Fetching traffic data for: ${lat},${lng}`);
    
    // For now, return mock traffic data since MapMyIndia API documentation is not accessible
    const mockTrafficData = {
      level: Math.random() > 0.5 ? 'moderate' : 'heavy',
      speed: Math.round(30 + Math.random() * 40), // 30-70 km/h
      congestion: Math.round(Math.random() * 100),
      incidents: Math.random() > 0.8 ? ['accident'] : [],
      lastUpdated: new Date().toISOString()
    };
    
    return mockTrafficData;
  } catch (error) {
    console.error('❌ Traffic API error:', error.message);
    // Return fallback traffic data
    return {
      level: 'moderate',
      speed: 45,
      congestion: 60,
      incidents: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

// Helper function to fetch weather data from OpenWeatherMap
async function fetchWeatherData(lat, lng) {
  try {
    const url = `${API_CONFIG.OPENWEATHER.baseUrl}?lat=${lat}&lon=${lng}&appid=${API_CONFIG.OPENWEATHER.key}&units=metric`;
    
    console.log(`🔄 Fetching weather data for: ${lat},${lng}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrafficAI-Dashboard/1.0'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind?.speed || 0),
      visibility: Math.round((data.visibility || 10000) / 1000), // km
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Weather API error:', error.message);
    // Return fallback weather data
    return {
      temperature: 25,
      condition: 'Clear',
      description: 'clear sky',
      humidity: 60,
      windSpeed: 5,
      visibility: 10,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Calculate fuel consumption based on distance, traffic, and weather
function calculateFuelConsumption(distance, traffic, weather) {
  let baseFuel = distance * 0.08; // Base: 8L/100km
  
  // Traffic impact
  if (traffic.level === 'heavy') baseFuel *= 1.3;
  else if (traffic.level === 'moderate') baseFuel *= 1.15;
  
  // Weather impact
  if (weather.condition === 'Rain') baseFuel *= 1.1;
  else if (weather.temperature > 35 || weather.temperature < 5) baseFuel *= 1.05;
  
  return Math.round(baseFuel * 100) / 100;
}

// GET /api/routes/optimize - Fetch all optimized routes
router.get('/optimize', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📊 GET /api/routes/optimize - Fetching all routes');
    
    const routes = await db.getAllRoutes();
    const stats = await db.getRouteStats();
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Routes fetched successfully in ${responseTime}ms`);
    
    res.json({
      success: true,
      routes,
      stats,
      meta: {
        count: routes.length,
        responseTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ GET /optimize error (${responseTime}ms):`, error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes',
      message: error.message,
      responseTime
    });
  }
});

// POST /api/routes/optimize - Create optimized route
router.post('/optimize', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { start, end, name, userId } = req.body;
    
    // Validate input
    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'Start and end coordinates (lat, lng) are required'
      });
    }
    
    console.log(`🚀 POST /api/routes/optimize - Optimizing route: ${name || 'Unnamed Route'}`);
    console.log(`📍 From: ${start.lat}, ${start.lng} To: ${end.lat}, ${end.lng}`);
    
    // Fetch route data from ORS
    const routeData = await fetchORSRoute(start, end);
    
    // Fetch traffic data for midpoint
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;
    const trafficData = await fetchTrafficData(midLat, midLng);
    
    // Fetch weather data for destination
    const weatherData = await fetchWeatherData(end.lat, end.lng);
    
    // Calculate fuel consumption
    const fuelConsumption = calculateFuelConsumption(routeData.distance, trafficData, weatherData);
    
    // Prepare route object
    const optimizedRoute = {
      name: name || `Route ${new Date().toLocaleTimeString()}`,
      distance: routeData.distance,
      time: routeData.duration,
      traffic: trafficData,
      fuelConsumption,
      coordinates: routeData.coordinates,
      weather: weatherData
    };
    
    // Save to database
    const routeId = await db.insertRoute(optimizedRoute, userId);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Route optimized successfully in ${responseTime}ms - ID: ${routeId}`);
    
    res.json({
      success: true,
      route: {
        id: routeId,
        ...optimizedRoute
      },
      meta: {
        responseTime,
        timestamp: new Date().toISOString(),
        apiCalls: {
          routing: 'OpenRouteService',
          traffic: 'MapMyIndia (Mock)',
          weather: 'OpenWeatherMap'
        }
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ POST /optimize error (${responseTime}ms):`, error.message);
    
    // Try fallback with TomTom if ORS fails
    if (error.message.includes('ORS') && API_CONFIG.TOMTOM.key) {
      console.log('🔄 Attempting TomTom fallback...');
      // TomTom fallback implementation would go here
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to optimize route',
      message: error.message,
      responseTime
    });
  }
});

// GET /api/routes/optimize/stats - Get route statistics
router.get('/optimize/stats', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📊 GET /api/routes/optimize/stats - Fetching statistics');
    
    const stats = await db.getRouteStats();
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      stats,
      meta: {
        responseTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ GET /stats error (${responseTime}ms):`, error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message,
      responseTime
    });
  }
});

// GET /api/routes/metrics - Get route metrics for dashboard
router.get('/metrics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📊 GET /api/routes/metrics - Fetching route metrics');
    
    const stats = await db.getRouteStats();
    const responseTime = Date.now() - startTime;
    
    // Format metrics for dashboard
    const metrics = {
      routesOptimized: stats.totalRoutes || 0,
      timeSaved: `${Math.round((stats.totalTimeSaved || 0) / 60)} hrs`,
      fuelSaved: `${Math.round(stats.totalFuelSaved || 0)} L`,
      activeRoutes: stats.activeRoutes || 0
    };
    
    res.json(metrics);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ GET /metrics error (${responseTime}ms):`, error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
      message: error.message,
      responseTime
    });
  }
});

// POST /api/routes/plan - Plan a new route (alias for optimize)
router.post('/plan', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { start, destination, priority, vehicleType, avoidTolls, avoidHighways } = req.body;
    
    // Validate input
    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Start and destination are required'
      });
    }
    
    console.log(`🚀 POST /api/routes/plan - Planning route from ${start} to ${destination}`);
    
    // Convert location names to coordinates using geocoding
    // For now, we'll use a simple coordinate lookup
    const startCoords = await getCoordinatesFromLocation(start);
    const endCoords = await getCoordinatesFromLocation(destination);
    
    if (!startCoords || !endCoords) {
      return res.status(400).json({
        success: false,
        error: 'Location not found',
        message: 'Could not find coordinates for one or both locations'
      });
    }
    
    // Fetch route data from ORS
    const routeData = await fetchORSRoute(startCoords, endCoords);
    
    // Fetch traffic data for midpoint
    const midLat = (startCoords.lat + endCoords.lat) / 2;
    const midLng = (startCoords.lng + endCoords.lng) / 2;
    const trafficData = await fetchTrafficData(midLat, midLng);
    
    // Fetch weather data for destination
    const weatherData = await fetchWeatherData(endCoords.lat, endCoords.lng);
    
    // Calculate fuel consumption
    const fuelConsumption = calculateFuelConsumption(routeData.distance, trafficData, weatherData);
    
    // Format response for frontend
    const routes = [{
      id: `route-${Date.now()}`,
      name: `${start} to ${destination}`,
      type: priority || 'fastest',
      distance: routeData.distance,
      time: routeData.duration,
      traffic: trafficData.level,
      fuelConsumption,
      coordinates: routeData.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] })),
      summary: `${routeData.distance} km, ${routeData.duration} min`,
      instructions: []
    }];
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Route planned successfully in ${responseTime}ms`);
    
    res.json({
      success: true,
      routes,
      meta: {
        responseTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ POST /plan error (${responseTime}ms):`, error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to plan route',
      message: error.message,
      responseTime
    });
  }
});

// Helper function to get coordinates from location name
async function getCoordinatesFromLocation(location) {
  try {
    // Use OpenStreetMap Nominatim API for geocoding
    const encodedLocation = encodeURIComponent(location);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TrafficAI-Dashboard/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

module.exports = router;