const express = require('express');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
// Cache removed to ensure real-time data

// Authentication middleware imported from ../middleware/auth.js

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/dashboard.log' }),
    new winston.transports.Console()
  ]
});

// Cache removed to ensure real-time data

// GET /api/dashboard/overview - Real-time dashboard metrics (JWT Protected)
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    logger.info('Fetching real-time dashboard overview data');
    
    // Real-time metrics from Prisma aggregations - NO MOCKS!
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [trafficFlowResult, activeIncidents, routesOptimized, totalPredictions] = await Promise.all([
      // Total traffic flow from real data - using system metrics or default
      prisma.systemMetrics.findFirst({
        orderBy: { updatedAt: 'desc' }
      }).then(metrics => ({ _sum: { volume: metrics?.totalTrafficFlow || 0 } })).catch(() => ({ _sum: { volume: 0 } })),
      
      // Active incidents count
      prisma.trafficIncident.count({
        where: {
          createdAt: { gte: twentyFourHoursAgo }
        }
      }).catch(() => 0),
      
      // Routes optimized count
      prisma.route.count({
        where: {
          createdAt: { gte: twentyFourHoursAgo }
        }
      }).catch(() => 0),
      
      // Total predictions made
      prisma.incidentPrediction.count().catch(() => 0)
    ]);

    // Calculate system uptime
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const systemUptime = `${uptimeHours}h ${uptimeMinutes}m`;

    const overviewData = {
      total_traffic_flow: trafficFlowResult._sum.volume || 0,
      active_incidents: activeIncidents,
      routes_optimized: routesOptimized,
      total_predictions: totalPredictions,
      system_uptime: systemUptime,
      last_updated: new Date().toISOString(),
      quick_actions: [
        {
          id: 'weather',
          title: 'Weather Dashboard',
          description: 'View current weather conditions and forecasts',
          icon: 'weather',
          route: '/dashboard/weather',
          color: 'blue'
        },
        {
          id: 'traffic',
          title: 'Traffic Analysis', 
          description: 'Analyze traffic patterns and predictions',
          icon: 'traffic',
          route: '/dashboard/traffic-prediction',
          color: 'red'
        },
        {
          id: 'routes',
          title: 'Route Planning',
          description: 'Optimize routes and find best paths',
          icon: 'route',
          route: '/dashboard/route-optimization',
          color: 'green'
        },
        {
          id: 'incidents',
          title: 'Incident Reports',
          description: 'Predict and manage traffic incidents',
          icon: 'incident',
          route: '/dashboard/incident-prediction',
          color: 'orange'
        }
      ],
      performance_metrics: {
          memory_usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
          uptime_seconds: Math.floor(uptimeSeconds)
        }
      };
    
    logger.info('Dashboard overview data fetched successfully');
    res.json(overviewData);
    
  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard overview',
      message: error.message 
    });
  }
});

// GET /api/dashboard/location-weather - Get location and weather data for My Location button
router.get('/location-weather', authenticateToken, async (req, res) => {
  try {
    logger.info('Location and weather data requested');
    
    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Get location from ipapi.co
    const locationResponse = await axios.get(`https://ipapi.co/${clientIP}/json/`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'TrafficAI/1.0'
      }
    });

    const locationData = {
      latitude: locationResponse.data.latitude,
      longitude: locationResponse.data.longitude,
      city: locationResponse.data.city,
      region: locationResponse.data.region,
      country: locationResponse.data.country_name,
      timezone: locationResponse.data.timezone,
      ip: locationResponse.data.ip
    };

    // Get weather data using TomTom API
    const weatherResponse = await axios.get(
      `https://api.tomtom.com/weather/1/current.json?key=${process.env.TOMTOM_API_KEY}&query=${locationData.latitude},${locationData.longitude}`,
      { timeout: 5000 }
    );

    const weatherData = {
      temperature: weatherResponse.data.results[0].temperature.value,
      condition: weatherResponse.data.results[0].summary.phrase,
      humidity: weatherResponse.data.results[0].relativeHumidity,
      windSpeed: weatherResponse.data.results[0].wind.speed.value,
      visibility: weatherResponse.data.results[0].visibility.value,
      timestamp: new Date().toISOString()
    };

    const combinedData = {
      location: locationData,
      weather: weatherData,
      success: true
    };

    logger.info('Location and weather data retrieved successfully', { data: combinedData });
    res.json(combinedData);

  } catch (error) {
    logger.error('Error getting location and weather:', error);
    
    // Fallback data
    const fallbackData = {
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        city: 'Mumbai',
        region: 'Maharashtra',
        country: 'India',
        timezone: 'Asia/Kolkata',
        ip: 'unknown',
        fallback: true
      },
      weather: {
        temperature: 28,
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 12,
        visibility: 10,
        timestamp: new Date().toISOString(),
        fallback: true
      },
      success: false,
      error: 'Using fallback data'
    };
    
    res.json(fallbackData);
  }
});

// GET /api/location/current - Get user's current location using IP geolocation
router.get('/location/current', async (req, res) => {
  try {
    logger.info('Current location requested');
    
    // Get client IP address
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                    req.headers['x-real-ip'] ||
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    let locationData = {};
    
    // Use ipapi.co for better accuracy and more data
    if (clientIP && clientIP !== '127.0.0.1' && clientIP !== '::1' && !clientIP.startsWith('192.168.')) {
      try {
        const ipResponse = await axios.get(`http://ipapi.co/${clientIP}/json/`, {
          timeout: 5000,
          headers: {
            'User-Agent': 'TrafficAI/1.0'
          }
        });
        
        if (ipResponse.data && ipResponse.data.latitude) {
          locationData = {
            latitude: ipResponse.data.latitude,
            longitude: ipResponse.data.longitude,
            city: ipResponse.data.city,
            region: ipResponse.data.region,
            country: ipResponse.data.country_name,
            country_code: ipResponse.data.country_code,
            timezone: ipResponse.data.timezone,
            postal: ipResponse.data.postal,
            org: ipResponse.data.org,
            source: 'ipapi.co'
          };
          
          logger.info('IP-based location detected', { 
            city: locationData.city, 
            country: locationData.country,
            ip: clientIP 
          });
          
          // Get weather data for the detected location
          if (process.env.TOMTOM_API_KEY) {
            try {
              const weatherResponse = await axios.get(
                `https://api.tomtom.com/weather/1/currentWeather?key=${process.env.TOMTOM_API_KEY}&lat=${locationData.latitude}&lon=${locationData.longitude}`,
                { timeout: 5000 }
              );
              
              if (weatherResponse.data && weatherResponse.data.results) {
                const weather = weatherResponse.data.results[0];
                locationData.weather = {
                  temperature: weather.temperature?.value,
                  description: weather.weather?.description,
                  humidity: weather.relativeHumidity?.value,
                  wind_speed: weather.wind?.speed?.value,
                  visibility: weather.visibility?.value
                };
              }
            } catch (weatherError) {
              logger.warn('Weather data fetch failed:', weatherError.message);
            }
          }
        }
      } catch (ipError) {
        logger.warn('IP geolocation failed:', ipError.message);
        
        // Fallback to ip-api.com
        try {
          const fallbackResponse = await axios.get(`http://ip-api.com/json/${clientIP}`, {
            timeout: 3000
          });
          
          if (fallbackResponse.data.status === 'success') {
            locationData = {
              latitude: fallbackResponse.data.lat,
              longitude: fallbackResponse.data.lon,
              city: fallbackResponse.data.city,
              region: fallbackResponse.data.regionName,
              country: fallbackResponse.data.country,
              timezone: fallbackResponse.data.timezone,
              source: 'ip-api.com'
            };
          }
        } catch (fallbackError) {
          logger.warn('Fallback IP geolocation also failed:', fallbackError.message);
        }
      }
    }
    
    // Return error if all IP detection fails
    if (!locationData.latitude) {
      logger.warn('Unable to determine location - no coordinates available');
      return res.status(503).json({
        success: false,
        error: 'Unable to determine location - no coordinates available'
      });
    }
    
    res.json({
      success: true,
      location: locationData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting current location:', error);
    res.status(500).json({
      error: 'Failed to get current location',
      message: error.message
    });
  }
});

// GET /api/dashboard/quick-actions - Get quick action URLs for redirects (JWT Protected)
router.get('/quick-actions', authenticateToken, (req, res) => {
  try {
    const quickActions = {
      weather: '/dashboard/weather',
      traffic_analysis: '/dashboard/traffic-prediction',
      route_planning: '/dashboard/route-optimization',
      incident_reports: '/dashboard/incident-prediction',
      
      settings: '/dashboard/settings'
    };

    logger.info('Quick actions requested');
    res.json(quickActions);

  } catch (error) {
    logger.error('Error fetching quick actions:', error);
    res.status(500).json({
      error: 'Failed to fetch quick actions',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/dashboard/system-health - System health check (JWT Protected)
router.get('/system-health', authenticateToken, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      database: 'connected',
      cache_size: metricsCache.size
    };

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    logger.info('System health check completed');
    res.json(health);

  } catch (error) {
    logger.error('System health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;