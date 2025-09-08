require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - Using compiled TypeScript routes
const routeOptimizationRoutes = require('./dist/routes/routeOptimization').default;
const metricsRoutes = require('./dist/routes/metrics').default;
const exportRoutes = require('./dist/routes/export').default;
const trafficRoutes = require('./dist/routes/traffic').default;

// Mount routes in correct order
app.use('/api/routes/metrics', metricsRoutes);
app.use('/api/routes', routeOptimizationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/traffic', trafficRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'TrafficAI Dashboard JS API',
    version: '1.0.0'
  });
});

// Simple test metrics endpoint
app.get('/api/routes/metrics-test', (req, res) => {
  res.json({
    routesOptimized: 0,
    timeSaved: 0,
    fuelSaved: 0,
    activeRoutes: 0,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Initialize database and start server
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 TrafficAI Dashboard JS API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🛣️  Route optimization: http://localhost:${PORT}/api/routes/optimize`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;