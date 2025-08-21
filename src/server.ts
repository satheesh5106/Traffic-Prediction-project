/**
 * TrafficAI Backend Server
 * 
 * Express server for TrafficAI route optimization and traffic prediction.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import morgan from 'morgan';
import path from 'path';

// Import routes
import routeRoutes from './routes/routeRoutes';
import trafficRoutes from './routes/trafficRoutes';
import incidentRoutes from './routes/incidentRoutes';

// Import services
import { trafficDataService } from './services/trafficDataService';
import { logger, LogLevel } from './utils/logger';

// Create Express app
const app = express();

// Set environment variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS
app.use(json({ limit: '10mb' })); // Parse JSON bodies
app.use(urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Set logger level based on environment
logger.setLevel(NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG);

// Routes
app.use('/api/routes', routeRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/incidents', incidentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// Serve static files in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error', err);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  
  // Start traffic data service
  trafficDataService.startUpdates();
  logger.info('Traffic data service started');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Stop traffic data service
    trafficDataService.stopUpdates();
    logger.info('Traffic data service stopped');
    
    process.exit(0);
  });
});

export default app;