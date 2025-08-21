/**
 * Route Controller
 * 
 * Handles API endpoints for route optimization and traffic data.
 */

import { Request, Response } from 'express';
import { routeOptimizationService } from '../services/routeOptimizationService';
import { trafficDataService } from '../services/trafficDataService';
import { TrafficSeverity } from '../types/trafficTypes';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { GeoPoint } from '../utils/geo';
import { RouteRequest, RouteResult } from '../types/routeTypes';

// Use the exported service instance
const routeService = routeOptimizationService;

// Route request validation
function validateRouteRequest(req: Request): { isValid: boolean; message?: string } {
  const { start, end, priority, vehicleType } = req.body;
  
  if (!start || !end) {
    return { isValid: false, message: 'Start and end locations are required' };
  }
  
  if (!start.lat || !start.lng || !end.lat || !end.lng) {
    return { isValid: false, message: 'Start and end locations must include lat and lng coordinates' };
  }
  
  if (isNaN(parseFloat(start.lat)) || isNaN(parseFloat(start.lng)) || 
      isNaN(parseFloat(end.lat)) || isNaN(parseFloat(end.lng))) {
    return { isValid: false, message: 'Coordinates must be valid numbers' };
  }
  
  if (priority && !['fastest', 'shortest', 'eco', 'scenic'].includes(priority)) {
    return { isValid: false, message: 'Priority must be one of: fastest, shortest, eco, scenic' };
  }
  
  if (vehicleType && !['car', 'motorcycle', 'truck', 'bicycle'].includes(vehicleType)) {
    return { isValid: false, message: 'Vehicle type must be one of: car, motorcycle, truck, bicycle' };
  }
  
  return { isValid: true };
}

/**
 * Optimize a route between two points
 * @param req Request
 * @param res Response
 */
export async function optimizeRoute(req: Request, res: Response): Promise<void> {
  try {
    const startTime = Date.now();
    
    // Validate request
    const validation = validateRouteRequest(req);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.message });
      return;
    }
    
    const { 
      start, 
      end, 
      priority = 'fastest', 
      vehicleType = 'car',
      avoidTolls = false,
      avoidHighways = false,
      departureTime,
      alternatives = false,
      requestedAlgorithm
    } = req.body;
    
    // Check cache
    const cacheKey = `route:${JSON.stringify(req.body)}`;
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      logger.info(`Route optimization cache hit for ${start.lat},${start.lng} to ${end.lat},${end.lng}`);
      res.json(cachedResult);
      return;
    }
    
    // Get traffic data for start and end points
    const startTraffic = trafficDataService.getTrafficDataAtLocation(start);
    const endTraffic = trafficDataService.getTrafficDataAtLocation(end);
    
    // Optimize route
    const routeRequest: RouteRequest = {
      start,
      destination: end,
      end,
      priority,
      vehicleType,
      avoidTolls,
      avoidHighways,
      departureTime: departureTime ? new Date(departureTime) : new Date(),
      alternatives,
      requestedAlgorithm
    };
    
    const result: RouteResult = await routeService.optimizeRoute(routeRequest);
    
    // Add traffic information (these properties already exist in RouteResult interface)
    if (startTraffic) {
      result.startPointTraffic = {
        severity: startTraffic.severity as unknown as TrafficSeverity,
        speed: startTraffic.speed,
        confidence: startTraffic.confidence
      };
    }
    
    if (endTraffic) {
      result.endPointTraffic = {
        severity: endTraffic.severity as unknown as TrafficSeverity,
        speed: endTraffic.speed,
        confidence: endTraffic.confidence
      };
    }
    
    // Add execution time
    const executionTime = Date.now() - startTime;
    result.executionTime = executionTime;
    
    // Cache result
    cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
    
    logger.info(`Route optimized from ${start.lat},${start.lng} to ${end.lat},${end.lng} in ${executionTime}ms`);
    res.json(result);
  } catch (error) {
    logger.error('Error optimizing route', error);
    res.status(500).json({ error: 'Failed to optimize route' });
  }
}

/**
 * Get route details by ID
 * @param req Request
 * @param res Response
 */
export async function getRouteDetails(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Route ID is required' });
      return;
    }
    
    // Check cache
    const cacheKey = `route-details:${id}`;
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      logger.info(`Route details cache hit for ${id}`);
      res.json(cachedResult);
      return;
    }
    
    // Get route details
    const result = await routeService.getRouteById(id);
    
    if (!result) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }
    
    // Cache result
    cache.set(cacheKey, result, 30 * 60 * 1000); // 30 minutes
    
    logger.info(`Route details retrieved for ${id}`);
    res.json(result);
  } catch (error) {
    logger.error('Error getting route details', error);
    res.status(500).json({ error: 'Failed to get route details' });
  }
}

/**
 * Get traffic data for a route
 * @param req Request
 * @param res Response
 */
export async function getRouteTraffic(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Route ID is required' });
      return;
    }
    
    // Get route details
    const route = await routeService.getRouteById(id);
    
    if (!route) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }
    
    // Get traffic data for route options
    const trafficData = [];
    
    for (const option of route.options || []) {
      // Get traffic data for the route option using first coordinate
      const firstCoord = option.coordinates && option.coordinates.length > 0 ? option.coordinates[0] : { lat: 0, lng: 0 };
      const traffic = trafficDataService.getTrafficDataAtLocation({
        lat: firstCoord.lat,
        lng: firstCoord.lng
      });
      const prediction = trafficDataService.getTrafficPredictionAtLocation({
        lat: firstCoord.lat,
        lng: firstCoord.lng
      });
      
      trafficData.push({
        routeId: option.id,
        currentTraffic: traffic ? {
          severity: traffic.severity,
          speed: traffic.speed,
          confidence: traffic.confidence
        } : {
          severity: TrafficSeverity.LOW,
          speed: 60,
          confidence: 0.5
        },
        predictedTraffic: prediction ? {
          severity: prediction.predictedSeverity,
          speed: prediction.predictedSpeed,
          confidence: prediction.confidence,
          factors: prediction.factors
        } : null
      });
    }
    
    logger.info(`Traffic data retrieved for route ${id}`);
    res.json({
      routeId: id,
      timestamp: Date.now(),
      trafficData
    });
  } catch (error) {
    logger.error('Error getting route traffic', error);
    res.status(500).json({ error: 'Failed to get route traffic' });
  }
}

/**
 * Get optimization metrics
 * @param req Request
 * @param res Response
 */
export async function getOptimizationMetrics(req: Request, res: Response): Promise<void> {
  try {
    const routeMetrics = routeService.getMetrics();
    const trafficStats = trafficDataService.getStatistics();
    const cacheStats = cache.getStats();
    
    const metrics = {
      ...routeMetrics,
      trafficDataPoints: trafficStats.dataPoints,
      trafficPredictions: trafficStats.predictions,
      trafficIncidents: trafficStats.incidents,
      cacheHitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100 || 0,
      lastPolledTime: trafficStats.lastUpdated
    };
    
    logger.info('Optimization metrics retrieved');
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting optimization metrics', error);
    res.status(500).json({ error: 'Failed to get optimization metrics' });
  }
}

/**
 * Batch optimize multiple routes
 * @param req Request
 * @param res Response
 */
export async function batchOptimizeRoutes(req: Request, res: Response): Promise<void> {
  try {
    const { routes } = req.body;
    
    if (!Array.isArray(routes) || routes.length === 0) {
      res.status(400).json({ error: 'Routes array is required' });
      return;
    }
    
    if (routes.length > 10) {
      res.status(400).json({ error: 'Maximum 10 routes allowed per batch' });
      return;
    }
    
    const startTime = Date.now();
    const results = [];
    
    for (const routeRequest of routes) {
      // Validate each route request
      const validation = validateRouteRequest({ body: routeRequest } as Request);
      
      if (!validation.isValid) {
        results.push({
          error: validation.message,
          request: routeRequest
        });
        continue;
      }
      
      const { 
        start, 
        end, 
        priority = 'fastest', 
        vehicleType = 'car',
        avoidTolls = false,
        avoidHighways = false,
        departureTime,
        alternatives = false,
        requestedAlgorithm
      } = routeRequest;
      
      // Check cache
      const cacheKey = `route:${JSON.stringify(routeRequest)}`;
      const cachedResult = cache.get(cacheKey);
      
      if (cachedResult) {
        results.push({
          ...cachedResult,
          fromCache: true
        });
        continue;
      }
      
      // Optimize route
        const result = await routeService.optimizeRoute({
          start,
          destination: end,
          end,
          priority,
          vehicleType,
          avoidTolls,
          avoidHighways,
          departureTime: departureTime ? new Date(departureTime) : new Date(),
          alternatives,
          requestedAlgorithm
        });
        
        // Cache result
        cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
        
        results.push(result);
    try {
      } catch (error) {
        results.push({
          error: 'Failed to optimize route',
          request: routes[routes.length - 1]
        });
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    logger.info(`Batch optimized ${routes.length} routes in ${executionTime}ms`);
    res.json({
      results,
      count: results.length,
      executionTime
    });
  } catch (error) {
    logger.error('Error batch optimizing routes', error);
    res.status(500).json({ error: 'Failed to batch optimize routes' });
  }
}

/**
 * Get popular routes
 * @param req Request
 * @param res Response
 */
export async function getPopularRoutes(req: Request, res: Response): Promise<void> {
  try {
    const popularRoutes = routeService.getPopularRoutes();
    
    logger.info(`Retrieved ${popularRoutes.length} popular routes`);
    res.json(popularRoutes);
  } catch (error) {
    logger.error('Error getting popular routes', error);
    res.status(500).json({ error: 'Failed to get popular routes' });
  }
}

/**
 * Get traffic incidents
 * @param req Request
 * @param res Response
 */
export async function getTrafficIncidents(req: Request, res: Response): Promise<void> {
  try {
    const incidents = trafficDataService.getAllTrafficIncidents();
    
    logger.info(`Retrieved ${incidents.length} traffic incidents`);
    res.json(incidents);
  } catch (error) {
    logger.error('Error getting traffic incidents', error);
    res.status(500).json({ error: 'Failed to get traffic incidents' });
  }
}