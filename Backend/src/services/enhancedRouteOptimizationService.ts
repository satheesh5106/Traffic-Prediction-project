/**
 * Enhanced Route Optimization Service
 * Integrates advanced DSA algorithms for optimal performance
 */

import { RouteGraph, PathResult } from '../algorithms/pathfinding';
import { SpatialIndex, Point, NearestResult } from '../algorithms/kdtree';
import { trafficDataCache, LRUCache } from '../algorithms/cache';
import { logger } from '../utils/logger';
import * as turf from '@turf/turf';

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

interface TrafficCondition {
  congestionLevel: 'low' | 'medium' | 'high' | 'severe';
  averageSpeed: number;
  incidents: TrafficIncident[];
  roadClosures: RoadClosure[];
}

interface TrafficIncident {
  id: string;
  lat: number;
  lng: number;
  type: 'accident' | 'construction' | 'weather' | 'event';
  severity: 'minor' | 'moderate' | 'major';
  impact: number; // 0-1 scale
  estimatedClearTime?: number;
}

interface RoadClosure {
  id: string;
  coordinates: Array<[number, number]>;
  startTime: number;
  endTime?: number;
  reason: string;
}

interface RouteStats {
  routesOptimized: number;
  timeSaved: number;
  fuelEfficiency: number;
  activeRoutes: number;
}

export class EnhancedRouteOptimizationService {
  private routeGraph: RouteGraph;
  private spatialIndex: SpatialIndex;
  private performanceCache: LRUCache<PathResult>;
  private stats: RouteStats;
  private realTimeData: Map<string, any>;

  constructor() {
    this.routeGraph = new RouteGraph();
    this.spatialIndex = new SpatialIndex();
    this.performanceCache = new LRUCache(1000);
    this.realTimeData = new Map();
    
    this.stats = {
      routesOptimized: 0,
      timeSaved: 0,
      fuelEfficiency: 0,
      activeRoutes: 0
    };

    this.initializeRealTimeData();
    logger.info('Enhanced Route Optimization Service initialized with advanced DSA algorithms');
  }

  /**
   * Optimize route with multiple algorithms and return best option
   */
  async optimizeRoute(
    start: Coordinates,
    destination: Coordinates,
    priority: 'fastest' | 'shortest' | 'eco' | 'scenic' = 'fastest',
    vehicleType: string = 'car',
    realTimeTraffic: boolean = true
  ): Promise<EnhancedRouteOption> {
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(start, destination, priority, vehicleType, realTimeTraffic);
      
      // Check cache first
      const cachedResult = trafficDataCache.getRoute(cacheKey);
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
      const routeOptions: EnhancedRouteOption[] = [];

      for (const algorithm of algorithms) {
        const pathResult = await this.runPathfindingAlgorithm(
          algorithm,
          startNodeId,
          endNodeId,
          trafficConditions
        );

        if (pathResult) {
          const routeOption = await this.convertToRouteOption(
            pathResult,
            algorithm,
            priority,
            vehicleType,
            trafficConditions
          );
          routeOptions.push(routeOption);
        }
      }

      // Select best route based on priority
      const bestRoute = this.selectBestRoute(routeOptions, priority);
      
      // Add alternative routes
      bestRoute.alternativeRoutes = routeOptions.filter(r => r !== bestRoute).slice(0, 2);

      // Cache result
      trafficDataCache.setRoute(cacheKey, bestRoute, this.getCacheTTL(priority));
      
      // Update statistics
      this.updateStats('route_optimized', Date.now() - startTime);
      
      return bestRoute;

    } catch (error) {
      logger.error('Enhanced route optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get multiple route options (fastest, shortest, eco, scenic)
   */
  async getRouteOptions(
    start: Coordinates,
    destination: Coordinates,
    vehicleType: string = 'car'
  ): Promise<{ [key: string]: EnhancedRouteOption }> {
    const priorities: Array<'fastest' | 'shortest' | 'eco' | 'scenic'> = 
      ['fastest', 'shortest', 'eco', 'scenic'];
    
    const options: { [key: string]: EnhancedRouteOption } = {};
    
    // Optimize routes in parallel
    const routePromises = priorities.map(async (priority) => {
      try {
        const route = await this.optimizeRoute(start, destination, priority, vehicleType);
        return { priority, route };
      } catch (error) {
        logger.error(`Failed to optimize ${priority} route:`, error);
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
  getRouteStats(): RouteStats {
    return this.stats;
  }

  /**
   * Find incidents within radius using spatial indexing
   */
  async findIncidentsInRadius(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<TrafficIncident[]> {
    const result = this.spatialIndex.findIncidentsInRadius(lat, lng, radiusKm);
    return result.points.map(point => point.data as TrafficIncident);
  }

  /**
   * Get active routes for monitoring
   */
  getActiveRoutes(): number {
    return this.stats.activeRoutes;
  }

  // Private helper methods

  private generateCacheKey(
    start: Coordinates,
    destination: Coordinates,
    priority: string,
    vehicleType: string,
    realTimeTraffic: boolean
  ): string {
    const startStr = `${start.latitude.toFixed(4)},${start.longitude.toFixed(4)}`;
    const destStr = `${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
    const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute windows
    
    return `route:${startStr}:${destStr}:${priority}:${vehicleType}:${realTimeTraffic}:${timeWindow}`;
  }

  private selectOptimalAlgorithms(
    priority: string,
    trafficConditions: TrafficCondition | null
  ): Array<'dijkstra' | 'astar' | 'hybrid'> {
    const algorithms: Array<'dijkstra' | 'astar' | 'hybrid'> = [];
    
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

  private async runPathfindingAlgorithm(
    algorithm: 'dijkstra' | 'astar' | 'hybrid',
    startNodeId: string,
    endNodeId: string,
    trafficConditions: TrafficCondition | null
  ): Promise<PathResult | null> {
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
    } catch (error) {
      logger.error(`Pathfinding algorithm ${algorithm} failed:`, error);
      return null;
    }
  }

  private async runTrafficAwareAStar(
    startNodeId: string,
    endNodeId: string,
    trafficConditions: TrafficCondition | null
  ): Promise<PathResult | null> {
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

  private async convertToRouteOption(
    pathResult: PathResult,
    algorithm: 'dijkstra' | 'astar' | 'hybrid',
    priority: string,
    vehicleType: string,
    trafficConditions: TrafficCondition | null
  ): Promise<EnhancedRouteOption> {
    const baseTime = pathResult.totalTime;
    const trafficDelay = trafficConditions ? 
      this.calculateTrafficDelay(pathResult, trafficConditions) : 0;
    
    const fuelConsumption = this.calculateFuelConsumption(
      pathResult.totalDistance,
      priority,
      vehicleType,
      trafficConditions
    );

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

  private selectBestRoute(
    routes: EnhancedRouteOption[],
    priority: string
  ): EnhancedRouteOption {
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

  private async getRealTimeTrafficConditions(
    start: Coordinates,
    destination: Coordinates
  ): Promise<TrafficCondition | null> {
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
    } catch (error) {
      logger.error('Failed to get real-time traffic conditions:', error);
      return null;
    }
  }

  private calculateRouteRadius(start: Coordinates, destination: Coordinates): number {
    const distance = turf.distance(
      turf.point([start.longitude, start.latitude]),
      turf.point([destination.longitude, destination.latitude])
    );
    return Math.max(5, distance * 0.3); // 30% of route distance, minimum 5km
  }

  private assessCongestionLevel(incidents: TrafficIncident[]): 'low' | 'medium' | 'high' | 'severe' {
    const totalImpact = incidents.reduce((sum, incident) => sum + incident.impact, 0);
    
    if (totalImpact < 0.2) return 'low';
    if (totalImpact < 0.5) return 'medium';
    if (totalImpact < 0.8) return 'high';
    return 'severe';
  }

  private calculateAverageSpeed(incidents: TrafficIncident[]): number {
    const baseSpeed = 50; // km/h
    const totalImpact = incidents.reduce((sum, incident) => sum + incident.impact, 0);
    return Math.max(10, baseSpeed * (1 - totalImpact * 0.5));
  }

  private calculateTrafficMultiplier(trafficConditions: TrafficCondition): number {
    const congestionMultipliers = {
      low: 1.1,
      medium: 1.3,
      high: 1.6,
      severe: 2.0
    };
    return congestionMultipliers[trafficConditions.congestionLevel];
  }

  private calculateTrafficDelay(
    pathResult: PathResult,
    trafficConditions: TrafficCondition
  ): number {
    const baseTime = pathResult.totalTime;
    const multiplier = this.calculateTrafficMultiplier(trafficConditions);
    return baseTime * (multiplier - 1);
  }

  private calculateFuelConsumption(
    distance: number,
    priority: string,
    vehicleType: string,
    trafficConditions: TrafficCondition | null
  ): number {
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

  private calculateTimeSaved(baseTime: number, actualTime: number, priority: string): number {
    const standardTime = baseTime * 1.2; // Assume 20% longer for standard route
    return Math.max(0, standardTime - actualTime);
  }

  private calculateFuelEfficiency(fuelConsumption: number, distance: number): number {
    if (distance === 0) return 0;
    return distance / fuelConsumption; // km per unit of fuel
  }

  private calculateRouteConfidence(
    pathResult: PathResult,
    trafficConditions: TrafficCondition | null
  ): number {
    let confidence = 0.9; // Base confidence
    
    // Reduce confidence based on traffic incidents
    if (trafficConditions) {
      const incidentImpact = trafficConditions.incidents.reduce(
        (sum, incident) => sum + incident.impact,
        0
      );
      confidence *= (1 - incidentImpact * 0.3);
    }
    
    // Reduce confidence for very long routes (more uncertainty)
    if (pathResult.totalDistance > 100) {
      confidence *= 0.95;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private getRouteName(priority: string, algorithm: string): string {
    const priorityNames: Record<string, string> = {
      fastest: 'Fastest Route',
      shortest: 'Shortest Route',
      eco: 'Eco-Friendly Route',
      scenic: 'Scenic Route'
    };
    
    return `${priorityNames[priority] || 'Optimized Route'} (${algorithm.toUpperCase()})`;
  }

  private getCacheTTL(priority: string): number {
    // Different cache durations based on route type
    const ttls: Record<string, number> = {
      fastest: 300000, // 5 minutes - traffic changes quickly
      shortest: 900000, // 15 minutes - distance doesn't change often
      eco: 600000, // 10 minutes - fuel prices and conditions change
      scenic: 1800000 // 30 minutes - scenic routes are more stable
    };
    
    return ttls[priority] || 300000;
  }

  private updateStats(operation: string, responseTime?: number): void {
    switch (operation) {
      case 'route_optimized':
        this.stats.routesOptimized++;
        break;
      case 'cache_hit':
        // Cache hit recorded
        break;
    }
  }

  private initializeRealTimeData(): void {
    // Initialize with sample traffic incidents for demonstration
    const sampleIncidents: TrafficIncident[] = [
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

// Export singleton instance
export const enhancedRouteOptimizationService = new EnhancedRouteOptimizationService();