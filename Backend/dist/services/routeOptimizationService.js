"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteOptimizationService = void 0;
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const turf = __importStar(require("@turf/turf"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class RouteOptimizationService {
    constructor() {
        this.CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        this.graphHopperPath = process.env.GRAPHHOPPER_PATH || path.join(__dirname, '../../models/graphhopper');
        this.routeCache = new Map();
        logger_1.logger.info('Route Optimization Service initialized');
    }
    /**
     * Optimize route between two points
     */
    async optimizeRoute(start, destination, priority = 'fastest', vehicleType = 'car', trafficData, weatherData) {
        const cacheKey = `${start.latitude},${start.longitude}-${destination.latitude},${destination.longitude}-${priority}-${vehicleType}`;
        // Check cache
        const cachedRoute = this.routeCache.get(cacheKey);
        if (cachedRoute && Date.now() - cachedRoute.timestamp < this.CACHE_EXPIRY) {
            logger_1.logger.debug('Using cached route');
            return cachedRoute.route;
        }
        try {
            // Try using GraphHopper Java library via subprocess
            const route = await this.callGraphHopper(start, destination, priority, vehicleType, trafficData, weatherData);
            // Cache the result
            this.routeCache.set(cacheKey, { route, timestamp: Date.now() });
            return route;
        }
        catch (error) {
            logger_1.logger.error('GraphHopper optimization failed:', error);
            // Fallback to direct API call if available
            try {
                if (process.env.GRAPHHOPPER_API_KEY) {
                    const route = await this.callGraphHopperAPI(start, destination, priority, vehicleType);
                    this.routeCache.set(cacheKey, { route, timestamp: Date.now() });
                    return route;
                }
            }
            catch (apiError) {
                logger_1.logger.error('GraphHopper API call failed:', apiError);
            }
            // Final fallback to simulated route
            return this.getFallbackRoute(start, destination, priority);
        }
    }
    /**
     * Get route options (fastest, shortest, eco, scenic)
     */
    async getRouteOptions(start, destination, vehicleType = 'car', trafficData, weatherData) {
        const priorities = ['fastest', 'shortest', 'eco', 'scenic'];
        const options = {};
        // Get routes for each priority in parallel
        await Promise.all(priorities.map(async (priority) => {
            try {
                options[priority] = await this.optimizeRoute(start, destination, priority, vehicleType, trafficData, weatherData);
            }
            catch (error) {
                logger_1.logger.error(`Failed to get ${priority} route:`, error);
                options[priority] = await this.getFallbackRoute(start, destination, priority);
            }
        }));
        return options;
    }
    /**
     * Get fallback route when optimization fails
     */
    async getFallbackRoute(start, destination, priority) {
        logger_1.logger.info('Using fallback route generation');
        // Create a straight line route as absolute fallback
        const startPoint = turf.point([start.longitude, start.latitude]);
        const endPoint = turf.point([destination.longitude, destination.latitude]);
        // Calculate distance in meters
        // Fix the units parameter type
        const distance = turf.distance(startPoint, endPoint, 'kilometers') * 1000;
        // Generate path with intermediate points
        const line = turf.lineString([
            [start.longitude, start.latitude],
            [destination.longitude, destination.latitude]
        ]);
        // Add some intermediate points
        // Use a simple line instead of bezierSpline since it's not available in the current turf version
        const pathFeature = line; // Fallback to using the original line
        const path = pathFeature.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
        // Estimate duration based on priority and distance
        let speed = 50; // km/h
        let fuelConsumption = distance / 10; // Simplified calculation
        let trafficDelay = 0;
        switch (priority) {
            case 'fastest':
                speed = 60;
                trafficDelay = distance * 0.0001; // Small delay
                break;
            case 'shortest':
                speed = 40;
                trafficDelay = distance * 0.0002;
                break;
            case 'eco':
                speed = 45;
                fuelConsumption = distance / 12; // Better fuel efficiency
                trafficDelay = distance * 0.0003;
                break;
            case 'scenic':
                speed = 35;
                fuelConsumption = distance / 8; // Worse fuel efficiency
                trafficDelay = distance * 0.0001;
                break;
        }
        // Calculate duration in seconds
        const duration = (distance / 1000 / speed * 3600) + trafficDelay;
        // Create route option
        const routeOption = {
            name: `${priority} route`,
            path,
            distance,
            duration,
            trafficDelay,
            fuelConsumption,
            timeSaved: 5, // Simplified
            fuelEfficiency: 10 // Simplified
        };
        return routeOption;
    }
    /**
     * Call GraphHopper Java library via subprocess
     */
    async callGraphHopper(start, destination, priority, vehicleType, trafficData, weatherData) {
        return new Promise((resolve, reject) => {
            try {
                // Prepare input data
                const inputData = {
                    start,
                    destination,
                    priority,
                    vehicleType,
                    trafficData: trafficData || null,
                    weatherData: weatherData || null
                };
                // Spawn Java process
                const process = (0, child_process_1.spawn)('java', [
                    '-jar',
                    path.join(this.graphHopperPath, 'graphhopper-web.jar'),
                    'route',
                    '--profile',
                    vehicleType,
                    '--weighting',
                    this.mapPriorityToWeighting(priority),
                    '--point',
                    `${start.latitude},${start.longitude}`,
                    '--point',
                    `${destination.latitude},${destination.longitude}`,
                    '--instructions',
                    'true',
                    '--calc-points',
                    'true',
                    '--points-encoded',
                    'false'
                ]);
                let outputData = '';
                let errorData = '';
                process.stdout.on('data', (data) => {
                    outputData += data.toString();
                });
                process.stderr.on('data', (data) => {
                    errorData += data.toString();
                });
                process.on('close', (code) => {
                    if (code !== 0) {
                        logger_1.logger.error(`GraphHopper process exited with code ${code}`);
                        logger_1.logger.error(`GraphHopper error: ${errorData}`);
                        return reject(new Error(`GraphHopper process failed with code ${code}`));
                    }
                    try {
                        // Parse the output
                        const result = JSON.parse(outputData);
                        // Extract route data
                        const path = result.paths[0].points.coordinates.map((coord) => [coord[1], coord[0]]);
                        const distance = result.paths[0].distance;
                        const duration = result.paths[0].time / 1000; // Convert to seconds
                        // Apply traffic and weather adjustments
                        const { adjustedDuration, trafficDelay } = this.applyTrafficAdjustment(duration, distance, trafficData, weatherData);
                        // Calculate fuel consumption
                        const fuelConsumption = this.calculateFuelConsumption(distance, priority, vehicleType, trafficData, weatherData);
                        // Calculate time saved and fuel efficiency
                        const timeSaved = this.calculateTimeSaved(duration, adjustedDuration, priority);
                        const fuelEfficiency = this.calculateFuelEfficiency(fuelConsumption, distance, priority);
                        const route = {
                            name: `${priority} route`,
                            path,
                            distance,
                            duration: adjustedDuration,
                            trafficDelay,
                            fuelConsumption,
                            timeSaved,
                            fuelEfficiency
                        };
                        resolve(route);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to parse GraphHopper output:', error);
                        reject(error);
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to spawn GraphHopper process:', error);
                reject(error);
            }
        });
    }
    /**
     * Call GraphHopper API directly
     */
    async callGraphHopperAPI(start, destination, priority, vehicleType) {
        try {
            const apiKey = process.env.GRAPHHOPPER_API_KEY;
            if (!apiKey) {
                throw new Error('GraphHopper API key not found');
            }
            const response = await axios_1.default.get('https://graphhopper.com/api/1/route', {
                params: {
                    point: [
                        `${start.latitude},${start.longitude}`,
                        `${destination.latitude},${destination.longitude}`
                    ],
                    profile: vehicleType,
                    weighting: this.mapPriorityToWeighting(priority),
                    instructions: true,
                    calc_points: true,
                    points_encoded: false,
                    key: apiKey
                }
            });
            const result = response.data;
            // Extract route data
            const path = result.paths[0].points.coordinates.map((coord) => [coord[1], coord[0]]);
            const distance = result.paths[0].distance;
            const duration = result.paths[0].time / 1000; // Convert to seconds
            // Simplified traffic delay
            const trafficDelay = distance * 0.0002;
            // Calculate fuel consumption
            const fuelConsumption = this.calculateFuelConsumption(distance, priority, vehicleType);
            // Calculate time saved and fuel efficiency
            const timeSaved = this.calculateTimeSaved(duration, duration + trafficDelay, priority);
            const fuelEfficiency = this.calculateFuelEfficiency(fuelConsumption, distance, priority);
            const route = {
                name: `${priority} route`,
                path,
                distance,
                duration: duration + trafficDelay,
                trafficDelay,
                fuelConsumption,
                timeSaved,
                fuelEfficiency
            };
            return route;
        }
        catch (error) {
            logger_1.logger.error('GraphHopper API call failed:', error);
            throw error;
        }
    }
    /**
     * Map priority to GraphHopper weighting
     */
    mapPriorityToWeighting(priority) {
        switch (priority) {
            case 'fastest':
                return 'fastest';
            case 'shortest':
                return 'shortest';
            case 'eco':
                return 'short_fastest';
            case 'scenic':
                return 'curvature';
            default:
                return 'fastest';
        }
    }
    /**
     * Apply traffic and weather adjustments to route duration
     */
    applyTrafficAdjustment(baseDuration, distance, trafficData, weatherData) {
        let trafficMultiplier = 1.0;
        let weatherMultiplier = 1.0;
        // Apply traffic congestion factor
        if (trafficData) {
            switch (trafficData.congestionLevel) {
                case 'heavy':
                    trafficMultiplier = 1.5;
                    break;
                case 'moderate':
                    trafficMultiplier = 1.3;
                    break;
                case 'light':
                    trafficMultiplier = 1.1;
                    break;
                default:
                    trafficMultiplier = 1.0;
            }
        }
        // Apply weather factor
        if (weatherData) {
            if (weatherData.condition === 'rain' && weatherData.precipitation > 5) {
                weatherMultiplier = 1.2;
            }
            else if (weatherData.condition === 'snow') {
                weatherMultiplier = 1.5;
            }
            else if (weatherData.condition === 'fog') {
                weatherMultiplier = 1.3;
            }
            else if (weatherData.windSpeed > 50) {
                weatherMultiplier = 1.2;
            }
            // Check for weather alerts
            if (weatherData.alerts && weatherData.alerts.length > 0) {
                weatherMultiplier += 0.2;
            }
        }
        const combinedMultiplier = trafficMultiplier * weatherMultiplier;
        const adjustedDuration = baseDuration * combinedMultiplier;
        const trafficDelay = adjustedDuration - baseDuration;
        return { adjustedDuration, trafficDelay };
    }
    /**
     * Calculate fuel consumption based on distance, priority, and vehicle type
     */
    calculateFuelConsumption(distance, priority, vehicleType, trafficData, weatherData) {
        // Base consumption rates per 100km
        const baseConsumptionRates = {
            car: 7.5,
            bike: 0,
            foot: 0,
            motorcycle: 4.0,
            truck: 30.0,
            bus: 25.0
        };
        // Priority factors
        const priorityFactors = {
            fastest: 1.1,
            shortest: 1.0,
            eco: 0.8,
            scenic: 1.2
        };
        // Get base consumption
        const baseConsumption = baseConsumptionRates[vehicleType] || baseConsumptionRates.car;
        // Apply priority factor
        const priorityFactor = priorityFactors[priority] || priorityFactors.fastest;
        // Calculate base fuel consumption
        let fuelConsumption = (distance / 1000 / 100) * baseConsumption * priorityFactor;
        // Apply traffic factor
        if (trafficData) {
            switch (trafficData.congestionLevel) {
                case 'heavy':
                    fuelConsumption *= 1.4;
                    break;
                case 'moderate':
                    fuelConsumption *= 1.2;
                    break;
                case 'light':
                    fuelConsumption *= 1.1;
                    break;
            }
        }
        // Apply weather factor
        if (weatherData) {
            if (weatherData.condition === 'rain' && weatherData.precipitation > 5) {
                fuelConsumption *= 1.1;
            }
            else if (weatherData.condition === 'snow') {
                fuelConsumption *= 1.2;
            }
            else if (weatherData.windSpeed > 50) {
                fuelConsumption *= 1.15;
            }
        }
        return fuelConsumption;
    }
    /**
     * Calculate time saved compared to standard route
     */
    calculateTimeSaved(standardDuration, actualDuration, priority) {
        if (priority === 'fastest') {
            // For fastest route, compare with a theoretical standard route
            const theoreticalStandardDuration = standardDuration * 1.2;
            return Math.max(0, (theoreticalStandardDuration - actualDuration) / 60); // Convert to minutes
        }
        else {
            // For other priorities, compare with fastest route
            return 0; // Simplified
        }
    }
    /**
     * Calculate fuel efficiency percentage
     */
    calculateFuelEfficiency(fuelConsumption, distance, priority) {
        if (priority === 'eco') {
            // For eco route, compare with a theoretical standard consumption
            const standardConsumption = (distance / 1000 / 100) * 7.5 * 1.1;
            return Math.min(100, Math.max(0, ((standardConsumption - fuelConsumption) / standardConsumption) * 100));
        }
        else {
            // For other priorities, use a simplified approach
            const efficiencyFactors = {
                fastest: 5,
                shortest: 8,
                scenic: 3
            };
            return efficiencyFactors[priority] || 5;
        }
    }
}
exports.RouteOptimizationService = RouteOptimizationService;
//# sourceMappingURL=routeOptimizationService.js.map