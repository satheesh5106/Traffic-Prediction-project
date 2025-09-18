const express = require('express');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const NodeCache = require('node-cache');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const redis = require('redis');
const promClient = require('prom-client');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('./middleware/auth');
require('dotenv').config();

// Input validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', errors.array());
    return res.status(400).json({
      error: 'Invalid input data',
      details: errors.array()
    });
  }
  next();
};

// Enhanced retry logic with exponential backoff (2^n * 1000ms)
const retryWithExponentialBackoff = async (fn, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // 2^n * 1000ms
      logger.info(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// ML Traffic Prediction Service Configuration
const ML_TRAFFIC_SERVICE_URL = process.env.ML_TRAFFIC_SERVICE_URL || 'http://localhost:5001';

// Configure Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'traffic-prediction-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Prometheus Metrics
const register = new promClient.Registry();
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const trafficPredictionAccuracy = new promClient.Gauge({
  name: 'traffic_prediction_accuracy',
  help: 'Current traffic prediction model accuracy'
});

const incidentPredictionAccuracy = new promClient.Gauge({
  name: 'incident_prediction_accuracy',
  help: 'Current incident prediction model accuracy'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(trafficPredictionAccuracy);
register.registerMetric(incidentPredictionAccuracy);

// Initialize Redis client
let redisClient = null;
try {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  redisClient.connect();
  logger.info('Redis client connected successfully');
} catch (error) {
  logger.warn('Redis connection failed, using in-memory cache:', error.message);
}

const app = express();
const prisma = new PrismaClient();
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Advanced SpatialCache with TTL and hash-based O(1) lookup
class SpatialCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttl = 60000) { // Default 60 seconds TTL
    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set value with hash-based O(1) lookup
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      return null;
    }

    return item.value;
  }

  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }

  size() {
    return this.cache.size;
  }
}

const spatialCache = new SpatialCache();

// Security Middleware
if (process.env.HELMET_ENABLED === 'true') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
}

// Prometheus Monitoring Middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
});

// CORS Middleware
app.use((req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authentication middleware is now centralized in ./middleware/auth.js

// Import and mount routes
const trafficRoutes = require('./routes/traffic');

const optimizationRoutes = require('./routes/optimization');
const routesRoutes = require('./routes/routes');
const weatherRoutes = require('./routes/weather');

// Mount routes with JWT authentication
app.use('/api/traffic', authenticateToken, trafficRoutes);

app.use('/api/optimization', authenticateToken, optimizationRoutes);
app.use('/api/routes', authenticateToken, routesRoutes);
app.use('/api/weather', authenticateToken, weatherRoutes);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating Prometheus metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// Enhanced incident prediction endpoint with validation
// Incident prediction routes are handled in routes/incident.js
const incidentRoutes = require('./routes/incident');
app.use('/api/incident', authenticateToken, incidentRoutes);

// Constants
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Vehicle efficiency mapping (L/100km)
const VEHICLE_EFFICIENCY = {
  car: 6.0,
  motorcycle: 3.5,
  bus: 25.0,
  truck: 35.0
};

// Priority mapping for TomTom API
const PRIORITY_MAPPING = {
  fastest: 'fastest',
  shortest: 'shortest',
  'eco-friendly': 'eco',
  scenic: 'thrilling'
};

// Utility function for retry logic with exponential backoff
const retryWithBackoff = async (fn, retries = MAX_RETRIES) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (error.response?.status >= 500 || error.code === 'ECONNRESET')) {
      console.log(`Retrying... ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)));
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
};

// DSA: Haversine distance calculation for route validation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// DSA: Priority queue implementation for route optimization
class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(element, priority) {
    const queueElement = { element, priority };
    let added = false;
    
    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority < this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }
    
    if (!added) {
      this.items.push(queueElement);
    }
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

// POST /api/geocode - Geocoding endpoint
app.post('/api/geocode', async (req, res) => {
  try {
    const { location, country } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Check cache first
    const cacheKey = `geocode_${location}_${country || 'global'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const geocodeRequest = async () => {
      const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json`;
      const params = {
        key: TOMTOM_API_KEY,
        limit: 1
      };
      
      if (country) {
        params.countrySet = country;
      }
      
      const response = await axios.get(url, { params });
      return response.data;
    };

    const data = await retryWithBackoff(geocodeRequest);
    
    if (!data.results || data.results.length === 0) {
      return res.status(400).json({ error: 'Location not found' });
    }

    const result = {
      lat: data.results[0].position.lat,
      lon: data.results[0].position.lon,
      address: data.results[0].address.freeformAddress
    };

    // Cache the result
    cache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    } else if (error.response?.status >= 500) {
      return res.status(503).json({ error: 'Geocoding service temporarily unavailable' });
    }
    
    res.status(500).json({ error: 'Internal server error during geocoding' });
  }
});

// POST /api/optimize - Route optimization endpoint
app.post('/api/optimize', async (req, res) => {
  try {
    const { start, destination, country, priority, vehicle_type } = req.body;
    
    // Validation
    if (!start || !destination) {
      return res.status(400).json({ error: 'Start and destination locations are required' });
    }
    
    if (!priority || !Object.keys(PRIORITY_MAPPING).includes(priority)) {
      return res.status(400).json({ error: 'Valid priority required: fastest, shortest, eco-friendly, scenic' });
    }
    
    if (!vehicle_type || !Object.keys(VEHICLE_EFFICIENCY).includes(vehicle_type)) {
      return res.status(400).json({ error: 'Valid vehicle_type required: car, motorcycle, bus, truck' });
    }

    // Check cache for complete route
    const routeCacheKey = `route_${start}_${destination}_${priority}_${vehicle_type}_${country || 'global'}`;
    const cachedRoute = cache.get(routeCacheKey);
    if (cachedRoute) {
      return res.json(cachedRoute);
    }

    // Geocode start location
    const geocodeStart = async () => {
      const response = await axios.post(`http://localhost:${PORT}/api/geocode`, {
        location: start,
        country
      });
      return response.data;
    };

    // Geocode destination location
    const geocodeDestination = async () => {
      const response = await axios.post(`http://localhost:${PORT}/api/geocode`, {
        location: destination,
        country
      });
      return response.data;
    };

    const [startCoords, destCoords] = await Promise.all([
      retryWithBackoff(geocodeStart),
      retryWithBackoff(geocodeDestination)
    ]);

    // Calculate straight-line distance for validation
    const straightDistance = calculateDistance(
      startCoords.lat, startCoords.lon,
      destCoords.lat, destCoords.lon
    );

    // TomTom Routing API call
    const routingRequest = async () => {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords.lat},${startCoords.lon}:${destCoords.lat},${destCoords.lon}/json`;
      const params = {
        key: TOMTOM_API_KEY,
        routeType: PRIORITY_MAPPING[priority],
        travelMode: vehicle_type === 'motorcycle' ? 'motorcycle' : 'car',
        maxAlternatives: 3,
        traffic: true,
        departAt: 'now'
      };
      
      const response = await axios.get(url, { params });
      return response.data;
    };

    const routeData = await retryWithBackoff(routingRequest);
    
    if (!routeData.routes || routeData.routes.length === 0) {
      return res.status(404).json({ error: 'No route available' });
    }

    // DSA: Process routes using priority queue for optimization
    const routeQueue = new PriorityQueue();
    const processedRoutes = [];
    
    routeData.routes.forEach((route, index) => {
      const summary = route.summary;
      const travelTimeMinutes = summary.travelTimeInSeconds / 60;
      const distanceKm = summary.lengthInMeters / 1000;
      const fuelConsumption = (distanceKm * VEHICLE_EFFICIENCY[vehicle_type]) / 100;
      
      // Priority calculation for DSA (lower is better)
      let routePriority;
      switch (priority) {
        case 'fastest':
          routePriority = travelTimeMinutes;
          break;
        case 'shortest':
          routePriority = distanceKm;
          break;
        case 'eco-friendly':
          routePriority = fuelConsumption;
          break;
        case 'scenic':
          routePriority = -summary.trafficDelayInSeconds; // Negative for scenic (less traffic delay)
          break;
        default:
          routePriority = travelTimeMinutes;
      }
      
      // Extract and format route points for frontend
      let routePoints = [];
      if (route.legs && route.legs[0] && route.legs[0].points) {
        routePoints = route.legs[0].points.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude
        }));
      }
      
      const processedRoute = {
        id: index,
        points: routePoints,
        distance: distanceKm,
        travelTime: travelTimeMinutes,
        fuelConsumption,
        trafficDelay: summary.trafficDelayInSeconds / 60,
        polyline: route.guidance?.instructionGroups?.[0]?.instructions || []
      };
      
      routeQueue.enqueue(processedRoute, routePriority);
    });

    // Extract optimized routes from priority queue
    while (!routeQueue.isEmpty()) {
      const { element } = routeQueue.dequeue();
      processedRoutes.push(element);
    }

    const mainRoute = processedRoutes[0];
    const alternativeRoute = processedRoutes[1];

    // Calculate savings (time and fuel)
    let timeSaved = 0;
    let fuelSaved = 0;
    
    if (alternativeRoute) {
      timeSaved = Math.max(0, alternativeRoute.travelTime - mainRoute.travelTime);
      fuelSaved = Math.max(0, alternativeRoute.fuelConsumption - mainRoute.fuelConsumption);
    }

    // Save to database
    const savedRoute = await prisma.route.create({
      data: {
        startLocation: start,
        endLocation: destination,
        priority,
        vehicleType: vehicle_type,
        routeData: {
          routes: processedRoutes,
          straightDistance,
          startCoords,
          destCoords
        },
        timeSaved,
        fuelSaved,
        trafficImpact: mainRoute.trafficDelay > 5 ? 'high' : mainRoute.trafficDelay > 2 ? 'medium' : 'low'
      }
    });

    const result = {
      routeId: savedRoute.id,
      routes: processedRoutes,
      optimization: {
        priority,
        vehicleType: vehicle_type,
        timeSaved: `${timeSaved.toFixed(1)} minutes`,
        fuelSaved: `${fuelSaved.toFixed(2)} liters`,
        straightDistance: `${straightDistance.toFixed(1)} km`
      },
      metadata: {
        timestamp: new Date().toISOString(),
        apiVersion: '1.0.0'
      }
    };

    // Cache the result
    cache.set(routeCacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Route optimization error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    } else if (error.response?.status >= 500) {
      return res.status(503).json({ error: 'Routing service temporarily unavailable' });
    }
    
    res.status(500).json({ error: 'Internal server error during route optimization' });
  }
});

// Real-time metrics endpoint for dashboard
app.get('/api/metrics', async (req, res) => {
  try {
    // Get current timestamp for real-time updates
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Query database for route statistics
    const totalRoutes = await prisma.route.count();
    const recentRoutes = await prisma.route.count({
      where: {
        createdAt: {
          gte: last24Hours
        }
      }
    });
    
    // Get active routes (routes created in the last hour)
    const activeRoutes = await prisma.route.count({
      where: {
        createdAt: {
          gte: lastHour
        }
      }
    });
    
    // Calculate aggregate savings from all routes
    const routeAggregates = await prisma.route.aggregate({
      _sum: {
        timeSaved: true,
        fuelSaved: true
      },
      _avg: {
        timeSaved: true,
        fuelSaved: true
      }
    });
    
    // Calculate total time and fuel saved
    const totalTimeSaved = routeAggregates._sum.timeSaved || 0;
    const totalFuelSaved = routeAggregates._sum.fuelSaved || 0;
    const avgTimeSaved = routeAggregates._avg.timeSaved || 0;
    const avgFuelSaved = routeAggregates._avg.fuelSaved || 0;
    
    // Get recent performance metrics
    const recentRoutesData = await prisma.route.findMany({
      where: {
        createdAt: {
          gte: last24Hours
        }
      },
      select: {
        timeSaved: true,
        fuelSaved: true,
        createdAt: true,
        priority: true,
        vehicleType: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });
    
    // Calculate performance trends
    const performanceByHour = {};
    recentRoutesData.forEach(route => {
      const hour = route.createdAt.getHours();
      if (!performanceByHour[hour]) {
        performanceByHour[hour] = {
          routes: 0,
          timeSaved: 0,
          fuelSaved: 0
        };
      }
      performanceByHour[hour].routes += 1;
      performanceByHour[hour].timeSaved += route.timeSaved || 0;
      performanceByHour[hour].fuelSaved += route.fuelSaved || 0;
    });
    
    // Calculate efficiency metrics
    const efficiencyScore = Math.min(100, Math.max(0, 
      (avgTimeSaved * 0.6 + avgFuelSaved * 0.4) * 10
    ));
    
    // Calculate growth rate (compared to previous 24 hours)
    const previous24Hours = new Date(last24Hours.getTime() - 24 * 60 * 60 * 1000);
    const previousRoutes = await prisma.route.count({
      where: {
        createdAt: {
          gte: previous24Hours,
          lt: last24Hours
        }
      }
    });
    
    const growthRate = previousRoutes > 0 
      ? ((recentRoutes - previousRoutes) / previousRoutes * 100).toFixed(1)
      : '0.0';
    
    // Format response data
    const metricsData = {
      // Main dashboard metrics
      routesOptimized: totalRoutes.toString(),
      timeSaved: totalTimeSaved > 60 
        ? `${Math.round(totalTimeSaved / 60)} hrs` 
        : `${Math.round(totalTimeSaved)} mins`,
      fuelSaved: `${totalFuelSaved.toFixed(1)} L`,
      activeRoutes: activeRoutes.toString(),
      
      // Additional performance metrics
      performance: {
        efficiencyScore: Math.round(efficiencyScore),
        avgTimeSaved: Math.round(avgTimeSaved),
        avgFuelSaved: avgFuelSaved.toFixed(2),
        growthRate: `${growthRate}%`,
        recentRoutes: recentRoutes
      },
      
      // Real-time statistics
      realTime: {
        timestamp: now.toISOString(),
        lastUpdate: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        activeInLastHour: activeRoutes,
        totalToday: recentRoutes,
        systemStatus: 'operational'
      },
      
      // Hourly performance breakdown
      hourlyPerformance: Object.keys(performanceByHour).map(hour => ({
        hour: parseInt(hour),
        routes: performanceByHour[hour].routes,
        timeSaved: Math.round(performanceByHour[hour].timeSaved),
        fuelSaved: performanceByHour[hour].fuelSaved.toFixed(1)
      })).sort((a, b) => a.hour - b.hour),
      
      // Vehicle type breakdown
      vehicleStats: await getVehicleTypeStats(recentRoutesData),
      
      // Priority breakdown
      priorityStats: await getPriorityStats(recentRoutesData)
    };
    
    // Cache the response for 30 seconds
    res.set('Cache-Control', 'public, max-age=30');
    res.json(metricsData);
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to calculate vehicle type statistics
async function getVehicleTypeStats(routesData) {
  const vehicleStats = {};
  routesData.forEach(route => {
    const vehicle = route.vehicleType || 'unknown';
    if (!vehicleStats[vehicle]) {
      vehicleStats[vehicle] = {
        count: 0,
        timeSaved: 0,
        fuelSaved: 0
      };
    }
    vehicleStats[vehicle].count += 1;
    vehicleStats[vehicle].timeSaved += route.timeSaved || 0;
    vehicleStats[vehicle].fuelSaved += route.fuelSaved || 0;
  });
  
  return Object.keys(vehicleStats).map(vehicle => ({
    vehicle,
    count: vehicleStats[vehicle].count,
    avgTimeSaved: (vehicleStats[vehicle].timeSaved / vehicleStats[vehicle].count).toFixed(1),
    avgFuelSaved: (vehicleStats[vehicle].fuelSaved / vehicleStats[vehicle].count).toFixed(2)
  }));
}

// Helper function to calculate priority statistics
async function getPriorityStats(routesData) {
  const priorityStats = {};
  routesData.forEach(route => {
    const priority = route.priority || 'unknown';
    if (!priorityStats[priority]) {
      priorityStats[priority] = {
        count: 0,
        timeSaved: 0,
        fuelSaved: 0
      };
    }
    priorityStats[priority].count += 1;
    priorityStats[priority].timeSaved += route.timeSaved || 0;
    priorityStats[priority].fuelSaved += route.fuelSaved || 0;
  });
  
  return Object.keys(priorityStats).map(priority => ({
    priority,
    count: priorityStats[priority].count,
    avgTimeSaved: (priorityStats[priority].timeSaved / priorityStats[priority].count).toFixed(1),
    avgFuelSaved: (priorityStats[priority].fuelSaved / priorityStats[priority].count).toFixed(2)
  }));
}

// Live metrics endpoint for real-time updates
app.get('/api/metrics/live', async (req, res) => {
  try {
    const now = new Date();
    const lastMinute = new Date(now.getTime() - 60 * 1000);
    
    // Get very recent activity
    const liveRoutes = await prisma.route.count({
      where: {
        createdAt: {
          gte: lastMinute
        }
      }
    });
    
    // Get latest route for live updates
    const latestRoute = await prisma.route.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        timeSaved: true,
        fuelSaved: true,
        priority: true,
        vehicleType: true,
        createdAt: true
      }
    });
    
    res.json({
      timestamp: now.toISOString(),
      liveActivity: {
        routesInLastMinute: liveRoutes,
        latestRoute: latestRoute,
        systemLoad: 'normal',
        responseTime: '< 200ms'
      },
      status: 'live'
    });
    
  } catch (error) {
    console.error('Error fetching live metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch live metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Route Optimization server live at port ${PORT} on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗺️  TomTom API: ${TOMTOM_API_KEY ? 'Configured' : 'Missing'}`);
});

module.exports = app;