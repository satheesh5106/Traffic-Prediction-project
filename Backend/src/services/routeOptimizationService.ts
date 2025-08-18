import * as path from 'path';
import { spawn } from 'child_process';
import * as turf from 'turf';
import axios from 'axios';
import { logger } from '../utils/logger';

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

export class RouteOptimizationService {
  private graphHopperPath: string;
  private routeCache: Map<string, { route: RouteOption; timestamp: number }>;
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.graphHopperPath = process.env.GRAPHHOPPER_PATH || path.join(__dirname, '../../models/graphhopper');
    this.routeCache = new Map();
    logger.info('Route Optimization Service initialized');
  }

  /**
   * Optimize route between two points
   */
  async optimizeRoute(
    start: Coordinates,
    destination: Coordinates,
    priority: string = 'fastest',
    vehicleType: string = 'car',
    trafficData?: TrafficData,
    weatherData?: WeatherData
  ): Promise<RouteOption> {
    const cacheKey = `${start.latitude},${start.longitude}-${destination.latitude},${destination.longitude}-${priority}-${vehicleType}`;
    
    // Check cache
    const cachedRoute = this.routeCache.get(cacheKey);
    if (cachedRoute && Date.now() - cachedRoute.timestamp < this.CACHE_EXPIRY) {
      logger.debug('Using cached route');
      return cachedRoute.route;
    }

    try {
      // Try using GraphHopper Java library via subprocess
      const route = await this.callGraphHopper(start, destination, priority, vehicleType, trafficData, weatherData);
      
      // Cache the result
      this.routeCache.set(cacheKey, { route, timestamp: Date.now() });
      
      return route;
    } catch (error) {
      logger.error('GraphHopper optimization failed:', error);
      
      // Fallback to direct API call if available
      try {
        if (process.env.GRAPHHOPPER_API_KEY) {
          const route = await this.callGraphHopperAPI(start, destination, priority, vehicleType);
          this.routeCache.set(cacheKey, { route, timestamp: Date.now() });
          return route;
        }
      } catch (apiError) {
        logger.error('GraphHopper API call failed:', apiError);
      }
      
      // Final fallback to simulated route
      return this.getFallbackRoute(start, destination, priority);
    }
  }

  /**
   * Get route options (fastest, shortest, eco, scenic)
   */
  async getRouteOptions(
    start: Coordinates,
    destination: Coordinates,
    vehicleType: string = 'car',
    trafficData?: TrafficData,
    weatherData?: WeatherData
  ): Promise<{ [key: string]: RouteOption }> {
    const priorities = ['fastest', 'shortest', 'eco', 'scenic'];
    const options: { [key: string]: RouteOption } = {};

    // Get routes for each priority in parallel
    await Promise.all(
      priorities.map(async (priority) => {
        try {
          options[priority] = await this.optimizeRoute(
            start,
            destination,
            priority,
            vehicleType,
            trafficData,
            weatherData
          );
        } catch (error) {
          logger.error(`Failed to get ${priority} route:`, error);
          options[priority] = await this.getFallbackRoute(start, destination, priority);
        }
      })
    );

    return options;
  }

  /**
   * Get fallback route when optimization fails
   */
  async getFallbackRoute(start: Coordinates, destination: Coordinates, priority: string): Promise<RouteOption> {
    logger.info('Using fallback route generation');
    
    // Create a straight line route as absolute fallback
    const startPoint = turf.point([start.longitude, start.latitude]);
    const endPoint = turf.point([destination.longitude, destination.latitude]);
    
    // Calculate distance in meters
    // Fix the units parameter type
    const distance = turf.distance(startPoint, endPoint, 'kilometers' as any) * 1000;
    
    // Generate path with intermediate points
    const line = turf.lineString([
      [start.longitude, start.latitude],
      [destination.longitude, destination.latitude]
    ]);
    
    // Add some intermediate points
    // Use a simple line instead of bezierSpline since it's not available in the current turf version
    const pathFeature = line; // Fallback to using the original line
    const path = pathFeature.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
    
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
    const routeOption: RouteOption = {
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
  private async callGraphHopper(
    start: Coordinates,
    destination: Coordinates,
    priority: string,
    vehicleType: string,
    trafficData?: TrafficData,
    weatherData?: WeatherData
  ): Promise<RouteOption> {
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
        const process = spawn('java', [
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
            logger.error(`GraphHopper process exited with code ${code}`);
            logger.error(`GraphHopper error: ${errorData}`);
            return reject(new Error(`GraphHopper process failed with code ${code}`));
          }
          
          try {
            // Parse the output
            const result = JSON.parse(outputData);
            
            // Extract route data
            const path = result.paths[0].points.coordinates.map(
              (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
            );
            
            const distance = result.paths[0].distance;
            const duration = result.paths[0].time / 1000; // Convert to seconds
            
            // Apply traffic and weather adjustments
            const { adjustedDuration, trafficDelay } = this.applyTrafficAdjustment(
              duration,
              distance,
              trafficData,
              weatherData
            );
            
            // Calculate fuel consumption
            const fuelConsumption = this.calculateFuelConsumption(
              distance,
              priority,
              vehicleType,
              trafficData,
              weatherData
            );
            
            // Calculate time saved and fuel efficiency
            const timeSaved = this.calculateTimeSaved(duration, adjustedDuration, priority);
            const fuelEfficiency = this.calculateFuelEfficiency(fuelConsumption, distance, priority);
            
            const route: RouteOption = {
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
          } catch (error) {
            logger.error('Failed to parse GraphHopper output:', error);
            reject(error);
          }
        });
      } catch (error) {
        logger.error('Failed to spawn GraphHopper process:', error);
        reject(error);
      }
    });
  }

  /**
   * Call GraphHopper API directly
   */
  private async callGraphHopperAPI(
    start: Coordinates,
    destination: Coordinates,
    priority: string,
    vehicleType: string
  ): Promise<RouteOption> {
    try {
      const apiKey = process.env.GRAPHHOPPER_API_KEY;
      if (!apiKey) {
        throw new Error('GraphHopper API key not found');
      }
      
      const response = await axios.get('https://graphhopper.com/api/1/route', {
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
      const path = result.paths[0].points.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );
      
      const distance = result.paths[0].distance;
      const duration = result.paths[0].time / 1000; // Convert to seconds
      
      // Simplified traffic delay
      const trafficDelay = distance * 0.0002;
      
      // Calculate fuel consumption
      const fuelConsumption = this.calculateFuelConsumption(distance, priority, vehicleType);
      
      // Calculate time saved and fuel efficiency
      const timeSaved = this.calculateTimeSaved(duration, duration + trafficDelay, priority);
      const fuelEfficiency = this.calculateFuelEfficiency(fuelConsumption, distance, priority);
      
      const route: RouteOption = {
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
    } catch (error) {
      logger.error('GraphHopper API call failed:', error);
      throw error;
    }
  }

  /**
   * Map priority to GraphHopper weighting
   */
  private mapPriorityToWeighting(priority: string): string {
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
  private applyTrafficAdjustment(
    baseDuration: number,
    distance: number,
    trafficData?: TrafficData,
    weatherData?: WeatherData
  ): { adjustedDuration: number; trafficDelay: number } {
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
      } else if (weatherData.condition === 'snow') {
        weatherMultiplier = 1.5;
      } else if (weatherData.condition === 'fog') {
        weatherMultiplier = 1.3;
      } else if (weatherData.windSpeed > 50) {
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
  private calculateFuelConsumption(
    distance: number,
    priority: string,
    vehicleType: string,
    trafficData?: TrafficData,
    weatherData?: WeatherData
  ): number {
    // Base consumption rates per 100km
    const baseConsumptionRates: { [key: string]: number } = {
      car: 7.5,
      bike: 0,
      foot: 0,
      motorcycle: 4.0,
      truck: 30.0,
      bus: 25.0
    };
    
    // Priority factors
    const priorityFactors: { [key: string]: number } = {
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
      } else if (weatherData.condition === 'snow') {
        fuelConsumption *= 1.2;
      } else if (weatherData.windSpeed > 50) {
        fuelConsumption *= 1.15;
      }
    }
    
    return fuelConsumption;
  }

  /**
   * Calculate time saved compared to standard route
   */
  private calculateTimeSaved(standardDuration: number, actualDuration: number, priority: string): number {
    if (priority === 'fastest') {
      // For fastest route, compare with a theoretical standard route
      const theoreticalStandardDuration = standardDuration * 1.2;
      return Math.max(0, (theoreticalStandardDuration - actualDuration) / 60); // Convert to minutes
    } else {
      // For other priorities, compare with fastest route
      return 0; // Simplified
    }
  }

  /**
   * Calculate fuel efficiency percentage
   */
  private calculateFuelEfficiency(fuelConsumption: number, distance: number, priority: string): number {
    if (priority === 'eco') {
      // For eco route, compare with a theoretical standard consumption
      const standardConsumption = (distance / 1000 / 100) * 7.5 * 1.1;
      return Math.min(100, Math.max(0, ((standardConsumption - fuelConsumption) / standardConsumption) * 100));
    } else {
      // For other priorities, use a simplified approach
      const efficiencyFactors: { [key: string]: number } = {
        fastest: 5,
        shortest: 8,
        scenic: 3
      };
      
      return efficiencyFactors[priority] || 5;
    }
  }
}