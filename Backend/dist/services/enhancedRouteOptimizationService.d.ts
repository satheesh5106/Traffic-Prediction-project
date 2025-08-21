/**
 * Enhanced Route Optimization Service
 * Integrates advanced DSA algorithms for optimal performance
 */
interface Coordinates {
    latitude: number;
    longitude: number;
}
interface EnhancedRouteOption {
    name: string;
    algorithm: 'dijkstra' | 'astar' | 'hybrid';
    path: Array<[number, number]>;
    distance: number;
    duration: number;
    trafficDelay: number;
    fuelConsumption: number;
    timeSaved: number;
    fuelEfficiency: number;
    confidence: number;
    alternativeRoutes?: EnhancedRouteOption[];
}
interface TrafficIncident {
    id: string;
    lat: number;
    lng: number;
    type: 'accident' | 'construction' | 'weather' | 'event';
    severity: 'minor' | 'moderate' | 'major';
    impact: number;
    estimatedClearTime?: number;
}
interface RouteStats {
    routesOptimized: number;
    timeSaved: number;
    fuelEfficiency: number;
    activeRoutes: number;
}
export declare class EnhancedRouteOptimizationService {
    private routeGraph;
    private spatialIndex;
    private performanceCache;
    private stats;
    private realTimeData;
    constructor();
    /**
     * Optimize route with multiple algorithms and return best option
     */
    optimizeRoute(start: Coordinates, destination: Coordinates, priority?: 'fastest' | 'shortest' | 'eco' | 'scenic', vehicleType?: string, realTimeTraffic?: boolean): Promise<EnhancedRouteOption>;
    /**
     * Get multiple route options (fastest, shortest, eco, scenic)
     */
    getRouteOptions(start: Coordinates, destination: Coordinates, vehicleType?: string): Promise<{
        [key: string]: EnhancedRouteOption;
    }>;
    /**
     * Get route statistics
     */
    getRouteStats(): RouteStats;
    /**
     * Find incidents within radius using spatial indexing
     */
    findIncidentsInRadius(lat: number, lng: number, radiusKm: number): Promise<TrafficIncident[]>;
    /**
     * Get active routes for monitoring
     */
    getActiveRoutes(): number;
    private generateCacheKey;
    private selectOptimalAlgorithms;
    private runPathfindingAlgorithm;
    private runTrafficAwareAStar;
    private convertToRouteOption;
    private selectBestRoute;
    private getRealTimeTrafficConditions;
    private calculateRouteRadius;
    private assessCongestionLevel;
    private calculateAverageSpeed;
    private calculateTrafficMultiplier;
    private calculateTrafficDelay;
    private calculateFuelConsumption;
    private calculateTimeSaved;
    private calculateFuelEfficiency;
    private calculateRouteConfidence;
    private getRouteName;
    private getCacheTTL;
    private updateStats;
    private initializeRealTimeData;
}
export declare const enhancedRouteOptimizationService: EnhancedRouteOptimizationService;
export {};
