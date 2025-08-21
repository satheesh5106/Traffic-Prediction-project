import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import apiRoutes from './routes/apiRoutes';
import trafficRoutes from './routes/trafficRoutes';
import routeRoutes from './routes/routeRoutes';
import incidentRoutes from './routes/incidentRoutes';
import { initializeModels } from './models/modelLoader';
import winston from 'winston';
import { performanceMonitor } from './middleware/performanceMonitor';
import { Request, Response, NextFunction } from 'express';
import { auditLogger, securityHeaders, rateLimiter, securityManager } from './middleware/security';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware (must be first)
app.use(securityHeaders);
app.use(rateLimiter);
app.use(auditLogger);

// Performance monitoring
// Performance tracking middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  performanceMonitor.trackPerformance(req as any, res, next);
});

// Standard middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/incidents', incidentRoutes);

// Health check endpoint with performance and security metrics
app.get('/health', (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: performanceMonitor.getHealthCheck(),
    security: securityManager.getSecurityStats()
  };
  
  res.status(200).json(healthData);
});

// Performance metrics endpoint
app.get('/api/metrics/performance', (req, res) => {
  res.json({
    stats: performanceMonitor.getStats(),
    trends: performanceMonitor.getTrends(parseInt((req.query.minutes as string) || '5') || 5)
  });
});

// Security audit endpoint
app.get('/api/metrics/security', (req, res) => {
  const risk = req.query.risk as string;
  const validRisks = ['low', 'medium', 'high'];
  
  const filters = {
    risk: validRisks.includes(risk) ? risk as 'low' | 'medium' | 'high' : undefined,
    timeRange: parseInt((req.query.hours as string) || '24') || 24,
    limit: parseInt(req.query.limit as string) || 100
  };
  
  res.json({
    stats: securityManager.getSecurityStats(),
    auditLogs: securityManager.getAuditLogs(filters)
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize ML models
    await initializeModels();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

export default app;