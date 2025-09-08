import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import * as weatherController from '../controllers/weatherController';
import { weatherConfig } from '../config/weather';
import { ErrorHandler, WeatherError } from '../errors/weatherErrors';

const router = Router();

// Rate limiting middleware
const weatherRateLimit = rateLimit({
  windowMs: weatherConfig.RATE_LIMIT_WINDOW_MS,
  max: weatherConfig.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(weatherConfig.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(weatherConfig.RATE_LIMIT_WINDOW_MS / 1000)
    });
  }
});

// Authentication middleware stub
// TODO: Implement proper JWT authentication
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // For now, just pass through
  // In production, validate JWT token from Authorization header
  next();
};

// Admin authentication middleware stub
// TODO: Implement admin role validation
const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // For now, just pass through
  // In production, validate JWT token and check admin role
  next();
};

// Request ID middleware for tracing
const requestIdMiddleware = (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  req.requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Apply global middleware
router.use(requestIdMiddleware);
router.use(weatherRateLimit);

// Public routes (with rate limiting)
router.get('/health', weatherController.health);
router.get('/stations', authMiddleware, weatherController.getStations);
router.get('/station/:id', authMiddleware, weatherController.getStationWeather);
router.get('/alerts', authMiddleware, weatherController.getAlerts);
router.get('/traffic-impact/:stationId', authMiddleware, weatherController.getTrafficImpact);

// Admin-only routes
router.post('/refresh', adminAuthMiddleware, weatherController.postRefresh);

// Error handling middleware
router.use((error: Error, req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  const weatherError = ErrorHandler.isWeatherError(error) 
    ? error 
    : ErrorHandler.toWeatherError(error, req.requestId);
  
  res.status(weatherError.statusCode).json(weatherError.toJSON());
});

// 404 handler for unmatched routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;
export { weatherRateLimit, authMiddleware, adminAuthMiddleware };