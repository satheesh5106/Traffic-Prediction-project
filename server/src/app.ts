import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { weatherConfig } from './config/weather';
import weatherRoutes from './routes/weather';
import { ErrorHandler, WeatherError } from './errors/weatherErrors';

// Create Express application
const app = express();

// Configure Pino logger
const loggerConfig: any = {
  level: weatherConfig.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.token',
      'ENCRYPTION_KEY',
      'JWT_SECRET',
      'TWILIO_AUTH_TOKEN',
      'OPENWEATHERMAP_API_KEY'
    ],
    censor: '[REDACTED]'
  },
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-request-id': req.headers['x-request-id']
      }
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type'),
        'x-request-id': res.getHeader('x-request-id')
      }
    })
  }
};

// Add transport for pretty printing in development
if (weatherConfig.LOG_PRETTY && weatherConfig.NODE_ENV === 'development') {
  loggerConfig.transport = { target: 'pino-pretty' };
}

const logger = pino(loggerConfig);

// HTTP request logging middleware
const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err?.message || 'Unknown error'}`;
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: weatherConfig.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // TODO: Replace with actual production domains
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(httpLogger);

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: weatherConfig.NODE_ENV,
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/weather', weatherRoutes);

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: Error, req: express.Request & { requestId?: string }, res: express.Response, next: express.NextFunction) => {
  const weatherError = ErrorHandler.isWeatherError(error) 
    ? error 
    : ErrorHandler.toWeatherError(error, req.requestId);
  
  // Log error
  logger.error({
    error: weatherError.toSanitizedJSON(),
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  }, `Error: ${weatherError.message}`);
  
  // Send error response
  res.status(weatherError.statusCode).json(
    weatherConfig.NODE_ENV === 'production' 
      ? weatherError.toSanitizedJSON() 
      : weatherError.toJSON()
  );
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

export { app, logger };
export default app;