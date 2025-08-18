"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveRoutes = exports.getRouteStats = exports.getRouteOptions = exports.optimizeRoute = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
// Fix import path - TypeScript doesn't allow .ts extension in imports
const routeOptimizationService_1 = require("../services/routeOptimizationService");
const trafficPredictionService_1 = require("../services/trafficPredictionService");
const trafficAPIService_1 = require("../services/trafficAPIService");
const weatherService_1 = require("../services/weatherService");
// Initialize services
const routeService = new routeOptimizationService_1.RouteOptimizationService();
const trafficService = new trafficPredictionService_1.TrafficPredictionService();
const trafficAPIService = new trafficAPIService_1.TrafficAPIService();
const weatherService = new weatherService_1.WeatherService();
/**
 * Optimize route between two points
 * @route POST /api/optimize-route
 * @access Private
 */
const optimizeRoute = async (req, res) => {
    const { start, destination, priority, vehicleType } = req.body;
    if (!start || !destination) {
        throw new errorHandler_1.ApiError(400, 'Start and destination coordinates are required');
    }
    try {
        // Get traffic data for the route area
        const midLat = (start.latitude + destination.latitude) / 2;
        const midLng = (start.longitude + destination.longitude) / 2;
        const liveTrafficData = await trafficAPIService.getLiveTraffic(midLat, midLng, 5000);
        // Get weather data
        const weatherData = await weatherService.getWeatherData(midLat, midLng);
        // Optimize route
        const optimizedRoute = await routeService.optimizeRoute(start, destination, priority || 'fastest', vehicleType || 'car', liveTrafficData, weatherData);
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
        await database_1.dbHelpers.create('routes', routeRecord);
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
    }
    catch (error) {
        logger_1.logger.error('Route optimization error:', error);
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
        }
        catch (fallbackError) {
            logger_1.logger.error('Fallback route error:', fallbackError);
            throw new errorHandler_1.ApiError(500, 'Failed to optimize route');
        }
    }
};
exports.optimizeRoute = optimizeRoute;
/**
 * Get route options (fastest, shortest, eco, scenic)
 * @route POST /api/route-options
 * @access Private
 */
const getRouteOptions = async (req, res) => {
    const { start, destination, vehicleType } = req.body;
    if (!start || !destination) {
        throw new errorHandler_1.ApiError(400, 'Start and destination coordinates are required');
    }
    try {
        // Get traffic data for the route area
        const midLat = (start.latitude + destination.latitude) / 2;
        const midLng = (start.longitude + destination.longitude) / 2;
        const liveTrafficData = await trafficAPIService.getLiveTraffic(midLat, midLng, 5000);
        // Get weather data
        const weatherData = await weatherService.getWeatherData(midLat, midLng);
        // Get route options
        const routeOptions = await routeService.getRouteOptions(start, destination, vehicleType || 'car', liveTrafficData, weatherData);
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
    }
    catch (error) {
        logger_1.logger.error('Route options error:', error);
        throw new errorHandler_1.ApiError(500, 'Failed to get route options');
    }
};
exports.getRouteOptions = getRouteOptions;
/**
 * Get route statistics
 * @route GET /api/route-stats
 * @access Private
 */
const getRouteStats = async (req, res) => {
    try {
        // Get user-specific stats
        const userStats = await database_1.dbHelpers.getById('routeStats', req.user.uid);
        // Get global stats
        const globalStats = await database_1.dbHelpers.getById('routeStats', 'global');
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
    }
    catch (error) {
        logger_1.logger.error('Get route stats error:', error);
        throw new errorHandler_1.ApiError(500, 'Failed to retrieve route statistics');
    }
};
exports.getRouteStats = getRouteStats;
/**
 * Get active routes for user
 * @route GET /api/active-routes
 * @access Private
 */
const getActiveRoutes = async (req, res) => {
    try {
        // Get user's active routes
        // First query for userId
        const userRoutes = await database_1.dbHelpers.query('routes', 'userId', '==', req.user.uid);
        // Then filter for active routes
        const activeRoutes = userRoutes.filter((route) => {
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
    }
    catch (error) {
        logger_1.logger.error('Get active routes error:', error);
        throw new errorHandler_1.ApiError(500, 'Failed to retrieve active routes');
    }
};
exports.getActiveRoutes = getActiveRoutes;
/**
 * Update route statistics
 * @private
 */
async function updateRouteStats(userId, optimizedRoute) {
    try {
        // Get user stats
        let userStats = await database_1.dbHelpers.getById('routeStats', userId);
        // Get active routes count
        // First query for userId
        const userRoutes = await database_1.dbHelpers.query('routes', 'userId', '==', userId);
        // Then filter for active routes
        const activeRoutes = userRoutes.filter((route) => {
            return route.expiresAt && new Date(route.expiresAt) > new Date();
        });
        // Calculate time saved (simplified)
        const timeSaved = optimizedRoute.timeSaved || 5; // Minutes
        // Calculate fuel efficiency (simplified)
        const fuelEfficiency = optimizedRoute.fuelEfficiency || 10; // Percentage
        // Update user stats with type assertion to avoid TypeScript errors
        const typedUserStats = userStats;
        const updatedUserStats = {
            userId,
            routesOptimized: userStats ? typedUserStats.routesOptimized + 1 : 1,
            timeSaved: userStats ? typedUserStats.timeSaved + timeSaved : timeSaved,
            fuelEfficiency: userStats ? (typedUserStats.fuelEfficiency + fuelEfficiency) / 2 : fuelEfficiency,
            activeRoutes: activeRoutes.length,
            lastUpdated: new Date(),
        };
        if (userStats) {
            await database_1.dbHelpers.update('routeStats', userId, updatedUserStats);
        }
        else {
            await database_1.dbHelpers.create('routeStats', updatedUserStats);
        }
        // Update global stats (simplified)
        let globalStats = await database_1.dbHelpers.getById('routeStats', 'global');
        if (globalStats) {
            // Type assertion to avoid TypeScript errors
            const typedGlobalStats = globalStats;
            typedGlobalStats.routesOptimized += 1;
            typedGlobalStats.timeSaved += timeSaved;
            typedGlobalStats.fuelEfficiency = (typedGlobalStats.fuelEfficiency + fuelEfficiency) / 2;
            typedGlobalStats.activeRoutes += 1;
            typedGlobalStats.lastUpdated = new Date();
            await database_1.dbHelpers.update('routeStats', 'global', typedGlobalStats);
        }
        else {
            // Create global stats if not exists
            await database_1.dbHelpers.create('routeStats', {
                id: 'global',
                routesOptimized: 1,
                timeSaved: timeSaved,
                fuelEfficiency: fuelEfficiency,
                activeRoutes: 1,
                lastUpdated: new Date(),
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Update route stats error:', error);
    }
}
//# sourceMappingURL=routeController.js.map