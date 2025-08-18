import { Request, Response } from 'express';
import { collections, dbHelpers } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
// Fix import path - TypeScript doesn't allow .ts extension in imports
import { RouteOptimizationService } from '../services/routeOptimizationService';
import { TrafficPredictionService } from '../services/trafficPredictionService';
import { TrafficAPIService } from '../services/trafficAPIService';
import { WeatherService } from '../services/weatherService';

// Initialize services
const routeService = new RouteOptimizationService();
const trafficService = new TrafficPredictionService();
const trafficAPIService = new TrafficAPIService();
const weatherService = new WeatherService();

/**
 * Optimize route between two points
 * @route POST /api/optimize-route
 * @access Private
 */
export const optimizeRoute = async (req: Request, res: Response) => {
  const { start, destination, priority, vehicleType } = req.body;

  if (!start || !destination) {
    throw new ApiError(400, 'Start and destination coordinates are required');
  }

  try {
    // Get traffic data for the route area
    const midLat = (start.latitude + destination.latitude) / 2;
    const midLng = (start.longitude + destination.longitude) / 2;
    
    const liveTrafficData = await trafficAPIService.getLiveTraffic(midLat, midLng, 5000);
    
    // Get weather data
    const weatherData = await weatherService.getWeatherData(midLat, midLng);
    
    // Optimize route
    const optimizedRoute = await routeService.optimizeRoute(
      start,
      destination,
      priority || 'fastest',
      vehicleType || 'car',
      liveTrafficData,
      weatherData
    );

    // Save route to database
    const routeRecord = {
      userId: req.user.uid,
      start,
      destination,
      priority: priority || 'fastest',
      vehicleType: vehicleType || 'car',
      route: optimizedRoute.path,
      distance: optimizedRoute.distance,
      duration: optimizedRoute.duration,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    await dbHelpers.create('routes', routeRecord);

    // Update stats
    await updateRouteStats(req.user.uid, optimizedRoute);

    res.status(200).json({
      success: true,
      data: {
        route: optimizedRoute,
        traffic: liveTrafficData,
        weather: weatherData,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    logger.error('Route optimization error:', error);
    
    // Try fallback route if optimization fails
    try {
      const fallbackRoute = await routeService.getFallbackRoute(start, destination, priority || 'fastest');
      
      res.status(200).json({
        success: true,
        data: {
          route: fallbackRoute,
          lastUpdated: new Date(),
          isFallback: true,
        },
      });
    } catch (fallbackError) {
      logger.error('Fallback route error:', fallbackError);
      throw new ApiError(500, 'Failed to optimize route');
    }
  }
};

/**
 * Get route options (fastest, shortest, eco, scenic)
 * @route POST /api/route-options
 * @access Private
 */
export const getRouteOptions = async (req: Request, res: Response) => {
  const { start, destination, vehicleType } = req.body;

  if (!start || !destination) {
    throw new ApiError(400, 'Start and destination coordinates are required');
  }

  try {
    // Get traffic data for the route area
    const midLat = (start.latitude + destination.latitude) / 2;
    const midLng = (start.longitude + destination.longitude) / 2;
    
    const liveTrafficData = await trafficAPIService.getLiveTraffic(midLat, midLng, 5000);
    
    // Get weather data
    const weatherData = await weatherService.getWeatherData(midLat, midLng);
    
    // Get route options
    const routeOptions = await routeService.getRouteOptions(
      start,
      destination,
      vehicleType || 'car',
      liveTrafficData,
      weatherData
    );

    res.status(200).json({
      success: true,
      data: {
        options: routeOptions,
        traffic: {
          congestionLevel: liveTrafficData.congestionLevel,
          averageSpeed: liveTrafficData.averageSpeed
        },
        weather: {
          condition: weatherData.condition,
          precipitation: weatherData.precipitation
        },
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    logger.error('Route options error:', error);
    throw new ApiError(500, 'Failed to get route options');
  }
};

/**
 * Get route statistics
 * @route GET /api/route-stats
 * @access Private
 */
export const getRouteStats = async (req: Request, res: Response) => {
  try {
    // Get user-specific stats
    const userStats = await dbHelpers.getById('routeStats', req.user.uid);
    
    // Get global stats
    const globalStats = await dbHelpers.getById('routeStats', 'global');
    
    res.status(200).json({
      success: true,
      data: {
        userStats: userStats || {
          routesOptimized: 0,
          timeSaved: 0,
          fuelEfficiency: 0,
          activeRoutes: 0,
        },
        globalStats: globalStats || {
          routesOptimized: 0,
          timeSaved: 0,
          fuelEfficiency: 0,
          activeRoutes: 0,
        },
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    logger.error('Get route stats error:', error);
    throw new ApiError(500, 'Failed to retrieve route statistics');
  }
};

/**
 * Get active routes for user
 * @route GET /api/active-routes
 * @access Private
 */
export const getActiveRoutes = async (req: Request, res: Response) => {
  try {
    // Get user's active routes
    // First query for userId
    const userRoutes = await dbHelpers.query('routes', 'userId', '==', req.user.uid);
    
    // Then filter for active routes
    const activeRoutes = userRoutes.filter((route: any) => {
      return route.expiresAt && new Date(route.expiresAt) > new Date();
    });
    
    res.status(200).json({
      success: true,
      data: {
        routes: activeRoutes,
        count: activeRoutes.length,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    logger.error('Get active routes error:', error);
    throw new ApiError(500, 'Failed to retrieve active routes');
  }
};

/**
 * Update route statistics
 * @private
 */
async function updateRouteStats(userId: string, optimizedRoute: any) {
  try {
    // Get user stats
    let userStats = await dbHelpers.getById('routeStats', userId);
    
    // Get active routes count
    // First query for userId
    const userRoutes = await dbHelpers.query('routes', 'userId', '==', userId);
    
    // Then filter for active routes
    const activeRoutes = userRoutes.filter((route: any) => {
      return route.expiresAt && new Date(route.expiresAt) > new Date();
    });
    
    // Calculate time saved (simplified)
    const timeSaved = optimizedRoute.timeSaved || 5; // Minutes
    
    // Calculate fuel efficiency (simplified)
    const fuelEfficiency = optimizedRoute.fuelEfficiency || 10; // Percentage
    
    // Update user stats with type assertion to avoid TypeScript errors
    const typedUserStats = userStats as any;
    const updatedUserStats = {
      userId,
      routesOptimized: userStats ? typedUserStats.routesOptimized + 1 : 1,
      timeSaved: userStats ? typedUserStats.timeSaved + timeSaved : timeSaved,
      fuelEfficiency: userStats ? (typedUserStats.fuelEfficiency + fuelEfficiency) / 2 : fuelEfficiency,
      activeRoutes: activeRoutes.length,
      lastUpdated: new Date(),
    };
    
    if (userStats) {
      await dbHelpers.update('routeStats', userId, updatedUserStats);
    } else {
      await dbHelpers.create('routeStats', updatedUserStats);
    }
    
    // Update global stats (simplified)
    let globalStats = await dbHelpers.getById('routeStats', 'global');
    
    if (globalStats) {
      // Type assertion to avoid TypeScript errors
      const typedGlobalStats = globalStats as any;
      typedGlobalStats.routesOptimized += 1;
      typedGlobalStats.timeSaved += timeSaved;
      typedGlobalStats.fuelEfficiency = (typedGlobalStats.fuelEfficiency + fuelEfficiency) / 2;
      typedGlobalStats.activeRoutes += 1;
      typedGlobalStats.lastUpdated = new Date();
      
      await dbHelpers.update('routeStats', 'global', typedGlobalStats);
    } else {
      // Create global stats if not exists
      await dbHelpers.create('routeStats', {
        id: 'global',
        routesOptimized: 1,
        timeSaved: timeSaved,
        fuelEfficiency: fuelEfficiency,
        activeRoutes: 1,
        lastUpdated: new Date(),
      });
    }
  } catch (error) {
    logger.error('Update route stats error:', error);
  }
}