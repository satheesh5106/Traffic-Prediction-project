import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  WeatherStationsResponseZ,
  WeatherDataResponseZ,
  WeatherAlertsResponseZ,
  TrafficImpactResponseZ,
  RefreshRequestZ,
  HealthResponseZ,
  StationIdParamZ,
  IMDStationZ,
  IMDWeatherDataZ
} from '../schemas/weatherSchemas';
import {
  ValidationError,
  NotFoundError,
  ThirdPartyError,
  AuthError,
  InternalServerError
} from '../errors/weatherErrors';
import { weatherService } from '../services/weatherService';

/**
 * Weather Controller
 * Handles all weather-related API endpoints with proper error handling and validation
 */
export class WeatherController {
  /**
   * GET /api/weather/stations
   * Retrieves all available weather stations
   */
  static async getStations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string;
      
      // Get stations from weather service
      const stations = await weatherService.getStations(requestId);
      
      const response = {
        success: true,
        data: stations,
        total: stations.length,
        timestamp: new Date().toISOString()
      };

      // Validate response against schema
      const validatedResponse = WeatherStationsResponseZ.parse(response);
      
      res.status(200).json(validatedResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/weather/station/:id
   * Retrieves weather data for a specific station
   */
  static async getStationWeather(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate station ID parameter
      const { id } = StationIdParamZ.parse(req.params);
      const requestId = req.headers['x-request-id'] as string;
      
      // Get weather data from weather service
      const weatherData = await weatherService.getStationWeather(id, requestId);
      
      const response = {
        success: true,
        data: weatherData,
        timestamp: new Date().toISOString()
      };

      // Validate response against schema
      const validatedResponse = WeatherDataResponseZ.parse(response);
      
      res.status(200).json(validatedResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ValidationError.fromZodError(error, req.headers['x-request-id'] as string));
      } else {
        next(error);
      }
    }
  }

  /**
   * GET /api/weather/alerts
   * Retrieves current weather alerts
   */
  static async getAlerts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string;
      
      // Get alerts from weather service
      const alerts = await weatherService.getAlerts(requestId);
      
      const response = {
        success: true,
        data: alerts,
        total: alerts.length,
        timestamp: new Date().toISOString()
      };

      // Validate response against schema
      const validatedResponse = WeatherAlertsResponseZ.parse(response);
      
      res.status(200).json(validatedResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/weather/traffic-impact/:stationId
   * Retrieves traffic impact analysis for a specific weather station
   */
  static async getTrafficImpact(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate station ID parameter
      const { id: stationId } = StationIdParamZ.parse({ id: req.params.stationId });
      const requestId = req.headers['x-request-id'] as string;
      
      // Get traffic impact analysis from weather service
      const trafficImpact = await weatherService.getTrafficImpact(stationId, requestId);
      
      const response = {
        success: true,
        data: trafficImpact,
        timestamp: new Date().toISOString()
      };

      // Validate response against schema
      const validatedResponse = TrafficImpactResponseZ.parse(response);
      
      res.status(200).json(validatedResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ValidationError.fromZodError(error, req.headers['x-request-id'] as string));
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /api/weather/refresh
   * Triggers immediate refresh of weather data (admin only)
   */
  static async postRefresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request body
      const refreshRequest = RefreshRequestZ.parse(req.body);
      const requestId = req.headers['x-request-id'] as string;
      
      // Trigger cache refresh via weather service
      const refreshOptions: { force?: boolean; stationIds?: number[] } = {
        force: refreshRequest.force || false
      };
      
      if (refreshRequest.stationIds) {
        refreshOptions.stationIds = refreshRequest.stationIds;
      }
      
      await weatherService.refreshCache(refreshOptions, requestId);
      
      const response = {
        success: true,
        message: 'Weather data refresh completed',
        refreshId: `refresh_${Date.now()}`,
        scope: refreshRequest.stationIds ? 'stations' : 'all',
        initiatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(ValidationError.fromZodError(error, req.headers['x-request-id'] as string));
      } else {
        next(error);
      }
    }
  }

  /**
   * GET /api/weather/health
   * Health check endpoint for weather service
   */
  static async health(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get health status from weather service
      const healthData = await weatherService.getHealthStatus();
      
      const healthStatus = {
        status: healthData.status,
        timestamp: new Date().toISOString(),
        services: {
          imdApi: healthData.services.imdApi,
          openWeatherMap: healthData.services.openWeatherMap,
          database: 'up' as const, // Assuming database is always up for now
          redis: healthData.services.cache === 'up' ? 'up' as const : 'down' as const
        },
        uptime: process.uptime(),
        version: '1.0.0',
        metrics: healthData.metrics
      };

      // Validate response against schema
      const validatedResponse = HealthResponseZ.parse(healthStatus);
      
      const statusCode = healthData.status === 'ok' ? 200 : healthData.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(validatedResponse);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Error handling middleware for weather controller
   */
  static errorHandler(
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Log error for debugging
    console.error('Weather Controller Error:', {
      error: error.message,
      stack: error.stack,
      requestId: req.headers['x-request-id'],
      path: req.path,
      method: req.method
    });

    // Handle different error types
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json(error.toJSON());
    } else if (error instanceof NotFoundError) {
      res.status(error.statusCode).json(error.toJSON());
    } else if (error instanceof ThirdPartyError) {
      res.status(error.statusCode).json(error.toJSON());
    } else if (error instanceof AuthError) {
      res.status(error.statusCode).json(error.toJSON());
    } else {
      // Default to internal server error
      const internalError = new InternalServerError(
        'An unexpected error occurred',
        error,
        undefined,
        req.headers['x-request-id'] as string
      );
      res.status(internalError.statusCode).json(internalError.toJSON());
    }
  }
}

// Export individual controller methods for easier testing
export const {
  getStations,
  getStationWeather,
  getAlerts,
  getTrafficImpact,
  postRefresh,
  health,
  errorHandler
} = WeatherController;