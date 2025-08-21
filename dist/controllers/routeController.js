"use strict";
/**
 * Route Controller
 *
 * Handles API endpoints for route optimization and traffic data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrafficIncidents = exports.getPopularRoutes = exports.batchOptimizeRoutes = exports.getOptimizationMetrics = exports.getRouteTraffic = exports.getRouteDetails = exports.optimizeRoute = void 0;
const routeOptimizationService_1 = require("../services/routeOptimizationService");
const trafficDataService_1 = require("../services/trafficDataService");
const logger_1 = require("../utils/logger");
const cache_1 = require("../utils/cache");
// Use the exported service instance
const routeService = routeOptimizationService_1.routeOptimizationService;
// Route request validation
function validateRouteRequest(req) {
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
async function optimizeRoute(req, res) {
    try {
        const startTime = Date.now();
        // Validate request
        const validation = validateRouteRequest(req);
        if (!validation.isValid) {
            res.status(400).json({ error: validation.message });
            return;
        }
        const { start, end, priority = 'fastest', vehicleType = 'car', avoidTolls = false, avoidHighways = false, departureTime, alternatives = false, requestedAlgorithm } = req.body;
        // Check cache
        const cacheKey = `route:${JSON.stringify(req.body)}`;
        const cachedResult = cache_1.cache.get(cacheKey);
        if (cachedResult) {
            logger_1.logger.info(`Route optimization cache hit for ${start.lat},${start.lng} to ${end.lat},${end.lng}`);
            res.json(cachedResult);
            return;
        }
        // Get traffic data for start and end points
        const startTraffic = trafficDataService_1.trafficDataService.getTrafficDataAtLocation(start);
        const endTraffic = trafficDataService_1.trafficDataService.getTrafficDataAtLocation(end);
        // Optimize route
        const result = await routeService.optimizeRoute({
            start,
            end,
            priority,
            vehicleType,
            avoidTolls,
            avoidHighways,
            departureTime: departureTime ? new Date(departureTime) : new Date(),
            alternatives,
            requestedAlgorithm
        });
        // Add traffic information
        if (startTraffic) {
            result.startPointTraffic = {
                severity: startTraffic.severity,
                speed: startTraffic.speed,
                confidence: startTraffic.confidence
            };
        }
        if (endTraffic) {
            result.endPointTraffic = {
                severity: endTraffic.severity,
                speed: endTraffic.speed,
                confidence: endTraffic.confidence
            };
        }
        // Add execution time
        const executionTime = Date.now() - startTime;
        result.executionTime = executionTime;
        // Cache result
        cache_1.cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
        logger_1.logger.info(`Route optimized from ${start.lat},${start.lng} to ${end.lat},${end.lng} in ${executionTime}ms`);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error optimizing route', error);
        res.status(500).json({ error: 'Failed to optimize route' });
    }
}
exports.optimizeRoute = optimizeRoute;
/**
 * Get route details by ID
 * @param req Request
 * @param res Response
 */
async function getRouteDetails(req, res) {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'Route ID is required' });
            return;
        }
        // Check cache
        const cacheKey = `route-details:${id}`;
        const cachedResult = cache_1.cache.get(cacheKey);
        if (cachedResult) {
            logger_1.logger.info(`Route details cache hit for ${id}`);
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
        cache_1.cache.set(cacheKey, result, 30 * 60 * 1000); // 30 minutes
        logger_1.logger.info(`Route details retrieved for ${id}`);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error getting route details', error);
        res.status(500).json({ error: 'Failed to get route details' });
    }
}
exports.getRouteDetails = getRouteDetails;
/**
 * Get traffic data for a route
 * @param req Request
 * @param res Response
 */
async function getRouteTraffic(req, res) {
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
        // Get traffic data for each segment
        const trafficData = [];
        for (const segment of route.segments || []) {
            const midpoint = {
                lat: (segment.start.lat + segment.end.lat) / 2,
                lng: (segment.start.lng + segment.end.lng) / 2
            };
            const traffic = trafficDataService_1.trafficDataService.getTrafficDataAtLocation(midpoint);
            const prediction = trafficDataService_1.trafficDataService.getTrafficPredictionAtLocation(midpoint);
            trafficData.push({
                segmentId: segment.id,
                currentTraffic: traffic ? {
                    severity: traffic.severity,
                    speed: traffic.speed,
                    confidence: traffic.confidence
                } : {
                    severity: trafficDataService_1.TrafficSeverity.NONE,
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
        logger_1.logger.info(`Traffic data retrieved for route ${id}`);
        res.json({
            routeId: id,
            timestamp: Date.now(),
            trafficData
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting route traffic', error);
        res.status(500).json({ error: 'Failed to get route traffic' });
    }
}
exports.getRouteTraffic = getRouteTraffic;
/**
 * Get optimization metrics
 * @param req Request
 * @param res Response
 */
async function getOptimizationMetrics(req, res) {
    try {
        const routeMetrics = routeService.getMetrics();
        const trafficStats = trafficDataService_1.trafficDataService.getStatistics();
        const cacheStats = cache_1.cache.getStats();
        const metrics = {
            ...routeMetrics,
            trafficDataPoints: trafficStats.dataPoints,
            trafficPredictions: trafficStats.predictions,
            trafficIncidents: trafficStats.incidents,
            cacheHitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100 || 0,
            lastPolledTime: trafficStats.lastUpdated
        };
        logger_1.logger.info('Optimization metrics retrieved');
        res.json(metrics);
    }
    catch (error) {
        logger_1.logger.error('Error getting optimization metrics', error);
        res.status(500).json({ error: 'Failed to get optimization metrics' });
    }
}
exports.getOptimizationMetrics = getOptimizationMetrics;
/**
 * Batch optimize multiple routes
 * @param req Request
 * @param res Response
 */
async function batchOptimizeRoutes(req, res) {
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
            const validation = validateRouteRequest({ body: routeRequest });
            if (!validation.isValid) {
                results.push({
                    error: validation.message,
                    request: routeRequest
                });
                continue;
            }
            const { start, end, priority = 'fastest', vehicleType = 'car', avoidTolls = false, avoidHighways = false, departureTime, alternatives = false, requestedAlgorithm } = routeRequest;
            // Check cache
            const cacheKey = `route:${JSON.stringify(routeRequest)}`;
            const cachedResult = cache_1.cache.get(cacheKey);
            if (cachedResult) {
                results.push({
                    ...cachedResult,
                    fromCache: true
                });
                continue;
            }
            // Optimize route
            try {
                const result = await routeService.optimizeRoute({
                    start,
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
                cache_1.cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
                results.push(result);
            }
            catch (error) {
                results.push({
                    error: 'Failed to optimize route',
                    request: routeRequest
                });
            }
        }
        const executionTime = Date.now() - startTime;
        logger_1.logger.info(`Batch optimized ${routes.length} routes in ${executionTime}ms`);
        res.json({
            results,
            count: results.length,
            executionTime
        });
    }
    catch (error) {
        logger_1.logger.error('Error batch optimizing routes', error);
        res.status(500).json({ error: 'Failed to batch optimize routes' });
    }
}
exports.batchOptimizeRoutes = batchOptimizeRoutes;
/**
 * Get popular routes
 * @param req Request
 * @param res Response
 */
async function getPopularRoutes(req, res) {
    try {
        const popularRoutes = routeService.getPopularRoutes();
        logger_1.logger.info(`Retrieved ${popularRoutes.length} popular routes`);
        res.json(popularRoutes);
    }
    catch (error) {
        logger_1.logger.error('Error getting popular routes', error);
        res.status(500).json({ error: 'Failed to get popular routes' });
    }
}
exports.getPopularRoutes = getPopularRoutes;
/**
 * Get traffic incidents
 * @param req Request
 * @param res Response
 */
async function getTrafficIncidents(req, res) {
    try {
        const incidents = trafficDataService_1.trafficDataService.getAllTrafficIncidents();
        logger_1.logger.info(`Retrieved ${incidents.length} traffic incidents`);
        res.json(incidents);
    }
    catch (error) {
        logger_1.logger.error('Error getting traffic incidents', error);
        res.status(500).json({ error: 'Failed to get traffic incidents' });
    }
}
exports.getTrafficIncidents = getTrafficIncidents;
