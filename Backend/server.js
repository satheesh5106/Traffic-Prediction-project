const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const promClient = require('prom-client');

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Winston Logger Configuration
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

// Prometheus Metrics Configuration
const register = promClient.register;
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// Prometheus metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );
    httpRequestsTotal.inc(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode }
    );
  });
  next();
});

// Winston logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting - More permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://trafficai.netlify.app', 'https://your-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};
app.use(cors(corsOptions));

// Add CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});



// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Generate JWT token endpoint (for testing)
app.post('/api/auth/token', (req, res) => {
  const { username, password } = req.body;
  
  // Simple authentication (in production, use proper user validation)
  if (username === 'admin' && password === 'traffic2025') {
    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    logger.info(`JWT token generated for user: ${username}`);
    res.json({ token, expiresIn: '24h' });
  } else {
    logger.warn(`Failed login attempt for username: ${username}`);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Geocoding endpoint
app.post('/api/geocode', async (req, res) => {
  try {
    const { location, country } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
    if (!TOMTOM_API_KEY) {
      return res.status(500).json({ error: 'TomTom API key not configured' });
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

    const data = await geocodeRequest();
    
    if (!data.results || data.results.length === 0) {
      return res.status(400).json({ error: 'Location not found' });
    }

    const result = {
      lat: data.results[0].position.lat,
      lon: data.results[0].position.lon,
      address: data.results[0].address.freeformAddress
    };
    
    logger.info(`Geocoded location: ${location} -> ${result.lat}, ${result.lon}`);
    res.json(result);
  } catch (error) {
    logger.error('Geocoding error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    } else if (error.response?.status >= 500) {
      return res.status(503).json({ error: 'Geocoding service temporarily unavailable' });
    }
    
    res.status(500).json({ error: 'Internal server error during geocoding' });
  }
});

// Import routes
const trafficRoutes = require('./routes/traffic');
const routeRoutes = require('./routes/routes');

const weatherRoutes = require('./routes/weather');
const optimizationRoutes = require('./routes/optimization');
const dashboardRoutes = require('./routes/dashboard');
const incidentRoutes = require('./routes/incident');
const settingsRoutes = require('./routes/settings');

// Use routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/routes', routeRoutes);

app.use('/api/weather', weatherRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/incident', incidentRoutes);
app.use('/api/settings', settingsRoutes);

// Add direct /api/optimize route for frontend compatibility
app.use('/api/optimize', (req, res, next) => {
  // Forward to /api/optimization/optimize
  req.url = '/optimize';
  optimizationRoutes(req, res, next);
});

// Route metrics endpoint for dashboard - REAL DATA
app.get('/api/metrics', async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Get real metrics from database
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
    
    // Calculate efficiency score
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
    
    // Format real metrics for dashboard
    const metrics = {
      routesOptimized: totalRoutes.toString(),
      timeSaved: totalTimeSaved > 60 
        ? `${Math.round(totalTimeSaved / 60)}hrs` 
        : `${Math.round(totalTimeSaved)}mins`,
      fuelSaved: `${totalFuelSaved.toFixed(1)}L`,
      activeRoutes: activeRoutes.toString(),
      timestamp: new Date().toISOString(),
      performance: {
        efficiencyScore: Math.round(efficiencyScore),
        growthRate: parseFloat(growthRate),
        avgTimeSaved: Math.round(avgTimeSaved),
        avgFuelSaved: parseFloat(avgFuelSaved.toFixed(2))
      },
      realTime: {
        lastUpdate: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        status: 'active',
        totalToday: recentRoutes,
        activeInLastHour: activeRoutes
      }
    };
    
    res.json(metrics);
    logger.info('Real-time route metrics served successfully:', {
      totalRoutes,
      activeRoutes,
      totalTimeSaved: `${totalTimeSaved} mins`,
      totalFuelSaved: `${totalFuelSaved} L`
    });
  } catch (error) {
    logger.error('Error generating route metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error.message
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end(error.message);
  }
});

// Authentication middleware is now centralized in ./middleware/auth.js

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    metrics_endpoint: '/metrics'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Traffic Prediction & Route Optimization API',
    version: '1.0.0',
    endpoints: {
      traffic: '/api/traffic',
      routes: '/api/routes',
      analytics: '/api/analytics',
      weather: '/api/weather',
      alerts: '/api/alerts',
      refresh: '/api/refresh',
      trafficImpact: '/api/traffic-impact',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Traffic Prediction Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;