"use strict";
/**
 * Enhanced Route Optimization Service
 * Integrates advanced DSA algorithms for optimal performance
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedRouteOptimizationService = exports.EnhancedRouteOptimizationService = void 0;
const pathfinding_1 = require("../algorithms/pathfinding");
const kdtree_1 = require("../algorithms/kdtree");
const cache_1 = require("../algorithms/cache");
const logger_1 = require("../utils/logger");
const turf = __importStar(require("@turf/turf"));
class EnhancedRouteOptimizationService {
    constructor() {
        this.routeGraph = new pathfinding_1.RouteGraph();
        this.spatialIndex = new kdtree_1.SpatialIndex();
        this.performanceCache = new cache_1.LRUCache(1000);
        this.realTimeData = new Map();
        this.stats = {
            routesOptimized: 0,
            timeSaved: 0,
            fuelEfficiency: 0,
            activeRoutes: 0
        };
        this.initializeRealTimeData();
        logger_1.logger.info('Enhanced Route Optimization Service initialized with advanced DSA algorithms');
    }
    /**
     * Optimize route with multiple algorithms and return best option
     */
    async optimizeRoute(start, destination, priority = 'fastest', vehicleType = 'car', realTimeTraffic = true) {
        const startTime = Date.now();
        try {
            // Generate cache key
            const cacheKey = this.generateCacheKey(start, destination, priority, vehicleType, realTimeTraffic);
            // Check cache first
            const cachedResult = cache_1.trafficDataCache.getRoute(cacheKey);
            if (cachedResult) {
                this.updateStats('cache_hit', Date.now() - startTime);
                return cachedResult;
            }
            // Find nearest nodes in graph
            const startNodeId = this.routeGraph.findNearestNode(start.latitude, start.longitude);
            const endNodeId = this.routeGraph.findNearestNode(destination.latitude, destination.longitude);
            if (!startNodeId || !endNodeId) {
                throw new Error('Unable to find route nodes for given coordinates');
            }
            // Get real-time traffic conditions
            const trafficConditions = realTimeTraffic ?
                await this.getRealTimeTrafficConditions(start, destination) : null;
            // Run multiple algorithms and compare
            const algorithms = this.selectOptimalAlgorithms(priority, trafficConditions);
            const routeOptions = [];
            for (const algorithm of algorithms) {
                const pathResult = await this.runPathfindingAlgorithm(algorithm, startNodeId, endNodeId, trafficConditions);
                if (pathResult) {
                    const routeOption = await this.convertToRouteOption(pathResult, algorithm, priority, vehicleType, trafficConditions);
                    routeOptions.push(routeOption);
                }
            }
            // Select best route based on priority
            const bestRoute = this.selectBestRoute(routeOptions, priority);
            // Add alternative routes
            bestRoute.alternativeRoutes = routeOptions.filter(r => r !== bestRoute).slice(0, 2);
            // Cache result
            cache_1.trafficDataCache.setRoute(cacheKey, bestRoute, this.getCacheTTL(priority));
            // Update statistics
            this.updateStats('route_optimized', Date.now() - startTime);
            return bestRoute;
        }
        catch (error) {
            logger_1.logger.error('Enhanced route optimization failed:', error);
            throw error;
        }
    }
    /**
     * Get multiple route options (fastest, shortest, eco, scenic)
     */
    async getRouteOptions(start, destination, vehicleType = 'car') {
        const priorities = ['fastest', 'shortest', 'eco', 'scenic'];
        const options = {};
        // Optimize routes in parallel
        const routePromises = priorities.map(async (priority) => {
            try {
                const route = await this.optimizeRoute(start, destination, priority, vehicleType);
                return { priority, route };
            }
            catch (error) {
                logger_1.logger.error(`Failed to optimize ${priority} route:`, error);
                return null;
            }
        });
        const results = await Promise.allSettled(routePromises);
        results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
                options[result.value.priority] = result.value.route;
            }
        });
        return options;
    }
    /**
     * Get route statistics
     */
    getRouteStats() {
        return this.stats;
    }
    /**
     * Find incidents within radius using spatial indexing
     */
    async findIncidentsInRadius(lat, lng, radiusKm) {
        const result = this.spatialIndex.findIncidentsInRadius(lat, lng, radiusKm);
        return result.points.map(point => point.data);
    }
    /**
     * Get active routes for monitoring
     */
    getActiveRoutes() {
        return this.stats.activeRoutes;
    }
    // Private helper methods
    generateCacheKey(start, destination, priority, vehicleType, realTimeTraffic) {
        const startStr = `${start.latitude.toFixed(4)},${start.longitude.toFixed(4)}`;
        const destStr = `${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
        const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute windows
        return `route:${startStr}:${destStr}:${priority}:${vehicleType}:${realTimeTraffic}:${timeWindow}`;
    }
    selectOptimalAlgorithms(priority, trafficConditions) {
        const algorithms = [];
        switch (priority) {
            case 'fastest':
                algorithms.push('astar', 'dijkstra'); // A* is generally faster
                break;
            case 'shortest':
                algorithms.push('dijkstra', 'astar'); // Dijkstra guarantees shortest path
                break;
            case 'eco':
            case 'scenic':
                algorithms.push('hybrid', 'astar'); // Custom algorithms for special cases
                break;
            default:
                algorithms.push('astar');
        }
        // Add hybrid algorithm for complex traffic conditions
        if (trafficConditions && trafficConditions.incidents.length > 0) {
            algorithms.unshift('hybrid');
        }
        return algorithms;
    }
    async runPathfindingAlgorithm(algorithm, startNodeId, endNodeId, trafficConditions) {
        try {
            switch (algorithm) {
                case 'dijkstra':
                    return this.routeGraph.dijkstra(startNodeId, endNodeId);
                case 'astar':
                    return this.routeGraph.aStar(startNodeId, endNodeId);
                case 'hybrid':
                    // Use A* with traffic-aware heuristic
                    return this.runTrafficAwareAStar(startNodeId, endNodeId, trafficConditions);
                default:
                    return null;
            }
        }
        catch (error) {
            logger_1.logger.error(`Pathfinding algorithm ${algorithm} failed:`, error);
            return null;
        }
    }
    async runTrafficAwareAStar(startNodeId, endNodeId, trafficConditions) {
        // Enhanced A* that considers real-time traffic
        // This is a simplified implementation - in production, you'd modify the graph weights
        const result = this.routeGraph.aStar(startNodeId, endNodeId);
        if (result && trafficConditions) {
            // Adjust time based on traffic conditions
            const trafficMultiplier = this.calculateTrafficMultiplier(trafficConditions);
            result.totalTime *= trafficMultiplier;
        }
        return result;
    }
    async convertToRouteOption(pathResult, algorithm, priority, vehicleType, trafficConditions) {
        const baseTime = pathResult.totalTime;
        const trafficDelay = trafficConditions ?
            this.calculateTrafficDelay(pathResult, trafficConditions) : 0;
        const fuelConsumption = this.calculateFuelConsumption(pathResult.totalDistance, priority, vehicleType, trafficConditions);
        const confidence = this.calculateRouteConfidence(pathResult, trafficConditions);
        return {
            name: this.getRouteName(priority, algorithm),
            algorithm,
            path: pathResult.coordinates,
            distance: pathResult.totalDistance,
            duration: baseTime + trafficDelay,
            trafficDelay,
            fuelConsumption,
            timeSaved: this.calculateTimeSaved(baseTime, baseTime + trafficDelay, priority),
            fuelEfficiency: this.calculateFuelEfficiency(fuelConsumption, pathResult.totalDistance),
            confidence
        };
    }
    selectBestRoute(routes, priority) {
        if (routes.length === 0) {
            throw new Error('No valid routes found');
        }
        return routes.reduce((best, current) => {
            switch (priority) {
                case 'fastest':
                    return current.duration < best.duration ? current : best;
                case 'shortest':
                    return current.distance < best.distance ? current : best;
                case 'eco':
                    return current.fuelConsumption < best.fuelConsumption ? current : best;
                case 'scenic':
                    return current.confidence > best.confidence ? current : best;
                default:
                    return current.duration < best.duration ? current : best;
            }
        });
    }
    async getRealTimeTrafficConditions(start, destination) {
        try {
            // Find incidents along the route corridor
            const midLat = (start.latitude + destination.latitude) / 2;
            const midLng = (start.longitude + destination.longitude) / 2;
            const radius = this.calculateRouteRadius(start, destination);
            const incidents = await this.findIncidentsInRadius(midLat, midLng, radius);
            return {
                congestionLevel: this.assessCongestionLevel(incidents),
                averageSpeed: this.calculateAverageSpeed(incidents),
                incidents,
                roadClosures: [] // Would be populated from real data source
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get real-time traffic conditions:', error);
            return null;
        }
    }
    calculateRouteRadius(start, destination) {
        const distance = turf.distance(turf.point([start.longitude, start.latitude]), turf.point([destination.longitude, destination.latitude]));
        return Math.max(5, distance * 0.3); // 30% of route distance, minimum 5km
    }
    assessCongestionLevel(incidents) {
        const totalImpact = incidents.reduce((sum, incident) => sum + incident.impact, 0);
        if (totalImpact < 0.2)
            return 'low';
        if (totalImpact < 0.5)
            return 'medium';
        if (totalImpact < 0.8)
            return 'high';
        return 'severe';
    }
    calculateAverageSpeed(incidents) {
        const baseSpeed = 50; // km/h
        const totalImpact = incidents.reduce((sum, incident) => sum + incident.impact, 0);
        return Math.max(10, baseSpeed * (1 - totalImpact * 0.5));
    }
    calculateTrafficMultiplier(trafficConditions) {
        const congestionMultipliers = {
            low: 1.1,
            medium: 1.3,
            high: 1.6,
            severe: 2.0
        };
        return congestionMultipliers[trafficConditions.congestionLevel];
    }
    calculateTrafficDelay(pathResult, trafficConditions) {
        const baseTime = pathResult.totalTime;
        const multiplier = this.calculateTrafficMultiplier(trafficConditions);
        return baseTime * (multiplier - 1);
    }
    calculateFuelConsumption(distance, priority, vehicleType, trafficConditions) {
        const baseConsumption = {
            car: 0.08, // L/km
            truck: 0.25,
            motorcycle: 0.04,
            electric: 0.15 // kWh/km equivalent
        }[vehicleType] || 0.08;
        let multiplier = 1.0;
        // Adjust for priority
        switch (priority) {
            case 'fastest':
                multiplier *= 1.2; // Higher speed = more fuel
                break;
            case 'eco':
                multiplier *= 0.8; // Eco-friendly route
                break;
            case 'scenic':
                multiplier *= 1.1; // Slightly longer routes
                break;
        }
        // Adjust for traffic
        if (trafficConditions) {
            const trafficMultiplier = this.calculateTrafficMultiplier(trafficConditions);
            multiplier *= (1 + (trafficMultiplier - 1) * 0.3); // Traffic increases fuel consumption
        }
        return distance * baseConsumption * multiplier;
    }
    calculateTimeSaved(baseTime, actualTime, priority) {
        const standardTime = baseTime * 1.2; // Assume 20% longer for standard route
        return Math.max(0, standardTime - actualTime);
    }
    calculateFuelEfficiency(fuelConsumption, distance) {
        if (distance === 0)
            return 0;
        return distance / fuelConsumption; // km per unit of fuel
    }
    calculateRouteConfidence(pathResult, trafficConditions) {
        let confidence = 0.9; // Base confidence
        // Reduce confidence based on traffic incidents
        if (trafficConditions) {
            const incidentImpact = trafficConditions.incidents.reduce((sum, incident) => sum + incident.impact, 0);
            confidence *= (1 - incidentImpact * 0.3);
        }
        // Reduce confidence for very long routes (more uncertainty)
        if (pathResult.totalDistance > 100) {
            confidence *= 0.95;
        }
        return Math.max(0.1, Math.min(1.0, confidence));
    }
    getRouteName(priority, algorithm) {
        const priorityNames = {
            fastest: 'Fastest Route',
            shortest: 'Shortest Route',
            eco: 'Eco-Friendly Route',
            scenic: 'Scenic Route'
        };
        return `${priorityNames[priority] || 'Optimized Route'} (${algorithm.toUpperCase()})`;
    }
    getCacheTTL(priority) {
        // Different cache durations based on route type
        const ttls = {
            fastest: 300000, // 5 minutes - traffic changes quickly
            shortest: 900000, // 15 minutes - distance doesn't change often
            eco: 600000, // 10 minutes - fuel prices and conditions change
            scenic: 1800000 // 30 minutes - scenic routes are more stable
        };
        return ttls[priority] || 300000;
    }
    updateStats(operation, responseTime) {
        switch (operation) {
            case 'route_optimized':
                this.stats.routesOptimized++;
                break;
            case 'cache_hit':
                // Cache hit recorded
                break;
        }
    }
    initializeRealTimeData() {
        // Initialize with sample traffic incidents for demonstration
        const sampleIncidents = [
            {
                id: 'inc_001',
                lat: 40.7589,
                lng: -73.9851,
                type: 'accident',
                severity: 'moderate',
                impact: 0.4,
                estimatedClearTime: Date.now() + 1800000 // 30 minutes
            },
            {
                id: 'inc_002',
                lat: 40.7505,
                lng: -73.9934,
                type: 'construction',
                severity: 'major',
                impact: 0.7
            }
        ];
        sampleIncidents.forEach(incident => {
            this.spatialIndex.addIncident(incident.id, incident.lat, incident.lng, incident);
        });
    }
}
exports.EnhancedRouteOptimizationService = EnhancedRouteOptimizationService;
// Export singleton instance
exports.enhancedRouteOptimizationService = new EnhancedRouteOptimizationService();
//# sourceMappingURL=enhancedRouteOptimizationService.js.map