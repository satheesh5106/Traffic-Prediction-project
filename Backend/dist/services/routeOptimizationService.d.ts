interface Coordinates {
    latitude: number;
    longitude: number;
}
interface RouteOption {
    name: string;
    path: Array<[number, number]>;
    distance: number;
    duration: number;
    trafficDelay: number;
    fuelConsumption: number;
    timeSaved?: number;
    fuelEfficiency?: number;
}
interface TrafficData {
    congestionLevel: string;
    averageSpeed: number;
    incidents: any[];
    segments: any[];
}
interface WeatherData {
    condition: string;
    temperature: number;
    precipitation: number;
    windSpeed: number;
    alerts: any[];
}
export declare class RouteOptimizationService {
    private graphHopperPath;
    private routeCache;
    private readonly CACHE_EXPIRY;
    constructor();
    /**
     * Optimize route between two points
     */
    optimizeRoute(start: Coordinates, destination: Coordinates, priority?: string, vehicleType?: string, trafficData?: TrafficData, weatherData?: WeatherData): Promise<RouteOption>;
    /**
     * Get route options (fastest, shortest, eco, scenic)
     */
    getRouteOptions(start: Coordinates, destination: Coordinates, vehicleType?: string, trafficData?: TrafficData, weatherData?: WeatherData): Promise<{
        [key: string]: RouteOption;
    }>;
    /**
     * Get fallback route when optimization fails
     */
    getFallbackRoute(start: Coordinates, destination: Coordinates, priority: string): Promise<RouteOption>;
    /**
     * Call GraphHopper Java library via subprocess
     */
    private callGraphHopper;
    /**
     * Call GraphHopper API directly
     */
    private callGraphHopperAPI;
    /**
     * Map priority to GraphHopper weighting
     */
    private mapPriorityToWeighting;
    /**
     * Apply traffic and weather adjustments to route duration
     */
    private applyTrafficAdjustment;
    /**
     * Calculate fuel consumption based on distance, priority, and vehicle type
     */
    private calculateFuelConsumption;
    /**
     * Calculate time saved compared to standard route
     */
    private calculateTimeSaved;
    /**
     * Calculate fuel efficiency percentage
     */
    private calculateFuelEfficiency;
}
export {};
