import pLimit from 'p-limit';
import { logger } from '../app';
import { weatherConfig } from '../config/weather';
import { CacheAdapter, createCacheAdapter } from '../utils/cacheAdapter';
import { IMDAdapter } from './adapters/imdAdapter';
import { OWMAdapter } from './adapters/owmAdapter';
import {
  IMDStation,
  IMDWeatherData,
  IMDAlert,
  TrafficImpact
} from '../schemas/weatherSchemas';
import {
  ValidationError,
  NotFoundError,
  ThirdPartyError,
  InternalServerError
} from '../errors/weatherErrors';

// Service configuration
interface WeatherServiceConfig {
  concurrencyLimit: number;
  cacheConfig: {
    stationsTtl: number; // 1 hour
    weatherTtl: number;  // 15 minutes
    alertsTtl: number;   // 5 minutes
  };
  fallbackEnabled: boolean;
  batchSize: number;
}

// Service metrics for observability
interface ServiceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  latency: {
    avg: number;
    p95: number;
    p99: number;
  };
  providers: {
    imd: {
      requests: number;
      failures: number;
      avgLatency: number;
    };
    owm: {
      requests: number;
      failures: number;
      avgLatency: number;
    };
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

/**
 * Weather Service
 * Orchestrates weather data retrieval with caching, fallback logic, and batching
 */
export class WeatherService {
  private config: WeatherServiceConfig;
  private cache: CacheAdapter;
  private imdAdapter: IMDAdapter;
  private owmAdapter: OWMAdapter;
  private concurrencyLimit: ReturnType<typeof pLimit>;
  private metrics: ServiceMetrics;
  private latencyBuffer: number[] = [];

  constructor() {
    this.config = {
      concurrencyLimit: 8, // p-limit concurrency
      cacheConfig: {
        stationsTtl: 60 * 60 * 1000, // 1 hour
        weatherTtl: 15 * 60 * 1000,  // 15 minutes
        alertsTtl: 5 * 60 * 1000     // 5 minutes
      },
      fallbackEnabled: true,
      batchSize: 10
    };

    // Initialize components
    this.cache = createCacheAdapter();
    this.imdAdapter = new IMDAdapter();
    this.owmAdapter = new OWMAdapter();
    this.concurrencyLimit = pLimit(this.config.concurrencyLimit);
    
    // Initialize metrics
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, cached: 0 },
      latency: { avg: 0, p95: 0, p99: 0 },
      providers: {
        imd: { requests: 0, failures: 0, avgLatency: 0 },
        owm: { requests: 0, failures: 0, avgLatency: 0 }
      },
      cache: { hits: 0, misses: 0, hitRate: 0 }
    };

    // Start metrics calculation interval
    setInterval(() => this.calculateMetrics(), 60000); // Every minute
  }

  /**
   * Get all available weather stations with caching
   */
  async getStations(requestId?: string): Promise<IMDStation[]> {
    const startTime = Date.now();
    const cacheKey = 'weather:stations:all';

    try {
      this.metrics.requests.total++;

      // Check cache first
      const cached = await this.cache.get<IMDStation[]>(cacheKey);
      if (cached) {
        this.metrics.requests.cached++;
        this.metrics.cache.hits++;
        
        logger.info('Stations retrieved from cache', {
          requestId,
          latency: Date.now() - startTime,
          source: 'cache',
          count: cached.length
        });
        
        return cached;
      }

      this.metrics.cache.misses++;

      // Fetch from IMD adapter
      const stations = await this.imdAdapter.listStations();
      
      // Cache the results
      await this.cache.set(cacheKey, stations, this.config.cacheConfig.stationsTtl);
      
      this.metrics.requests.successful++;
      this.recordLatency(Date.now() - startTime);
      
      logger.info('Stations retrieved from IMD', {
        requestId,
        latency: Date.now() - startTime,
        source: 'IMD',
        count: stations.length
      });
      
      return stations;
    } catch (error) {
      this.metrics.requests.failed++;
      
      logger.error('Failed to retrieve stations', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Get weather data for a specific station with fallback logic
   */
  async getStationWeather(stationId: number, requestId?: string): Promise<IMDWeatherData> {
    const startTime = Date.now();
    const cacheKey = `weather:station:${stationId}`;

    try {
      this.metrics.requests.total++;

      // Check cache first
      const cached = await this.cache.get<IMDWeatherData>(cacheKey);
      if (cached) {
        this.metrics.requests.cached++;
        this.metrics.cache.hits++;
        
        logger.info('Station weather retrieved from cache', {
          requestId,
          stationId,
          latency: Date.now() - startTime,
          source: 'cache'
        });
        
        return cached;
      }

      this.metrics.cache.misses++;

      // Try IMD adapter first
      try {
        const imdStartTime = Date.now();
        const weatherData = await this.imdAdapter.getStationWeather(stationId);
        
        this.metrics.providers.imd.requests++;
        this.metrics.providers.imd.avgLatency = this.updateAvgLatency(
          this.metrics.providers.imd.avgLatency,
          this.metrics.providers.imd.requests,
          Date.now() - imdStartTime
        );
        
        // Cache the results
        await this.cache.set(cacheKey, weatherData, this.config.cacheConfig.weatherTtl);
        
        this.metrics.requests.successful++;
        this.recordLatency(Date.now() - startTime);
        
        logger.info('Station weather retrieved from IMD', {
          requestId,
          stationId,
          latency: Date.now() - startTime,
          source: 'IMD'
        });
        
        return weatherData;
      } catch (imdError) {
        this.metrics.providers.imd.failures++;
        
        logger.warn('IMD adapter failed, attempting fallback', {
          requestId,
          stationId,
          error: imdError instanceof Error ? imdError.message : 'Unknown error'
        });

        // Fallback to OpenWeatherMap if enabled
        if (this.config.fallbackEnabled) {
          return await this.fallbackToOWM(stationId, requestId, startTime, cacheKey);
        }
        
        throw imdError;
      }
    } catch (error) {
      this.metrics.requests.failed++;
      
      logger.error('Failed to retrieve station weather', {
        requestId,
        stationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Get weather data for multiple stations with batching
   */
  async getBatchStationWeather(
    stationIds: number[],
    requestId?: string
  ): Promise<Map<number, IMDWeatherData | Error>> {
    const startTime = Date.now();
    const results = new Map<number, IMDWeatherData | Error>();

    logger.info('Starting batch weather retrieval', {
      requestId,
      stationCount: stationIds.length,
      batchSize: this.config.batchSize
    });

    // Process stations in batches with concurrency control
    const batches = this.chunkArray(stationIds, this.config.batchSize);
    
    for (const batch of batches) {
      const batchPromises = batch.map(stationId =>
        this.concurrencyLimit(async () => {
          try {
            const weatherData = await this.getStationWeather(stationId, requestId);
            return { stationId, data: weatherData };
          } catch (error) {
            return { stationId, error: error as Error };
          }
        })
      );

      const batchResults = await Promise.all(batchPromises);
      
      // Collect results
      for (const result of batchResults) {
        if ('error' in result) {
          results.set(result.stationId, result.error as Error);
        } else {
          results.set(result.stationId, result.data);
        }
      }
    }

    logger.info('Batch weather retrieval completed', {
      requestId,
      totalStations: stationIds.length,
      successful: Array.from(results.values()).filter(r => !(r instanceof Error)).length,
      failed: Array.from(results.values()).filter(r => r instanceof Error).length,
      latency: Date.now() - startTime
    });

    return results;
  }

  /**
   * Get weather alerts (mock implementation)
   */
  async getAlerts(requestId?: string): Promise<IMDAlert[]> {
    const startTime = Date.now();
    const cacheKey = 'weather:alerts:all';

    try {
      this.metrics.requests.total++;

      // Check cache first
      const cached = await this.cache.get<IMDAlert[]>(cacheKey);
      if (cached) {
        this.metrics.requests.cached++;
        this.metrics.cache.hits++;
        return cached;
      }

      this.metrics.cache.misses++;

      // Mock alerts data - in real implementation, this would fetch from IMD
      const alerts: IMDAlert[] = [];
      
      // Cache the results
      await this.cache.set(cacheKey, alerts, this.config.cacheConfig.alertsTtl);
      
      this.metrics.requests.successful++;
      this.recordLatency(Date.now() - startTime);
      
      logger.info('Alerts retrieved', {
        requestId,
        latency: Date.now() - startTime,
        count: alerts.length
      });
      
      return alerts;
    } catch (error) {
      this.metrics.requests.failed++;
      throw error;
    }
  }

  /**
   * Calculate traffic impact based on weather data
   */
  async getTrafficImpact(stationId: number, requestId?: string): Promise<TrafficImpact> {
    const startTime = Date.now();
    
    try {
      // Get weather data for the station
      const weatherData = await this.getStationWeather(stationId, requestId);
      
      // Calculate traffic impact based on weather conditions
      const impact: TrafficImpact = {
        stationId,
        location: `Station ${stationId}`, // In real implementation, get from station data
        rainImpact: {
          severity: 'none',
          description: 'No precipitation expected',
          expectedDelay: 0
        },
        temperatureImpact: {
          severity: this.calculateTemperatureImpact(weatherData.temperature.max.value),
          description: this.getTemperatureDescription(weatherData.temperature.max.value),
          vehiclePerformanceImpact: weatherData.temperature.max.value > 40 || weatherData.temperature.min.value < 5
        },
        humidityImpact: {
          severity: this.calculateHumidityImpact(weatherData.humidity.morning),
          description: this.getHumidityDescription(weatherData.humidity.morning),
          visibilityReduction: weatherData.humidity.morning > 85
        },
        overallRisk: 'low', // Calculate based on all factors
        recommendations: this.generateRecommendations(weatherData),
        lastUpdated: new Date().toISOString()
      };
      
      // Calculate overall risk
      impact.overallRisk = this.calculateOverallRisk(impact);
      
      logger.info('Traffic impact calculated', {
        requestId,
        stationId,
        overallRisk: impact.overallRisk,
        latency: Date.now() - startTime
      });
      
      return impact;
    } catch (error) {
      logger.error('Failed to calculate traffic impact', {
        requestId,
        stationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Refresh cache for specific stations or all data
   */
  async refreshCache(options: { force?: boolean; stationIds?: number[] } = {}, requestId?: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (options.force) {
        // Clear all weather-related cache
        await this.cache.clear();
        logger.info('Cache cleared forcefully', { requestId });
      }
      
      if (options.stationIds && options.stationIds.length > 0) {
        // Refresh specific stations
        const refreshPromises = options.stationIds.map(stationId =>
          this.concurrencyLimit(async () => {
            const cacheKey = `weather:station:${stationId}`;
            await this.cache.delete(cacheKey);
            // Pre-warm cache
            await this.getStationWeather(stationId, requestId);
          })
        );
        
        await Promise.all(refreshPromises);
        
        logger.info('Station cache refreshed', {
          requestId,
          stationIds: options.stationIds,
          latency: Date.now() - startTime
        });
      } else {
        // Refresh all stations
        await this.cache.delete('weather:stations:all');
        await this.getStations(requestId); // Pre-warm cache
        
        logger.info('All cache refreshed', {
          requestId,
          latency: Date.now() - startTime
        });
      }
    } catch (error) {
      logger.error('Failed to refresh cache', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    services: {
      imdApi: 'up' | 'down';
      openWeatherMap: 'up' | 'down';
      cache: 'up' | 'down';
    };
    metrics: ServiceMetrics;
  }> {
    const health: {
      status: 'ok' | 'degraded' | 'down';
      services: {
        imdApi: 'up' | 'down';
        openWeatherMap: 'up' | 'down';
        cache: 'up' | 'down';
      };
      metrics: ServiceMetrics;
    } = {
      status: 'ok',
      services: {
        imdApi: 'up',
        openWeatherMap: 'up',
        cache: 'up'
      },
      metrics: this.metrics
    };

    // Check IMD adapter health
    try {
      await this.imdAdapter.listStations();
    } catch {
      health.services.imdApi = 'down';
      health.status = 'degraded';
    }

    // Check OWM adapter health
    try {
      await this.owmAdapter.getWeatherByCoords(28.6139, 77.2090); // Delhi coordinates
    } catch {
      health.services.openWeatherMap = 'down';
      if (health.services.imdApi === 'down') {
        health.status = 'down';
      }
    }

    // Check cache health
    try {
      await this.cache.set('health:check', 'ok', 1000);
      await this.cache.get('health:check');
      await this.cache.delete('health:check');
    } catch {
      health.services.cache = 'down';
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Get service metrics
   */
  getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  // Private helper methods

  private async fallbackToOWM(
    stationId: number,
    requestId: string | undefined,
    startTime: number,
    cacheKey: string
  ): Promise<IMDWeatherData> {
    try {
      // For fallback, we need to get station coordinates
      // This is a simplified approach - in real implementation,
      // you'd maintain a mapping of station IDs to coordinates
      const owmStartTime = Date.now();
      
      // Mock coordinates for demonstration (Delhi)
      const weatherData = await this.owmAdapter.getWeatherByCoords(28.6139, 77.2090);
      
      this.metrics.providers.owm.requests++;
      this.metrics.providers.owm.avgLatency = this.updateAvgLatency(
        this.metrics.providers.owm.avgLatency,
        this.metrics.providers.owm.requests,
        Date.now() - owmStartTime
      );
      
      // Cache the fallback results with shorter TTL
      await this.cache.set(cacheKey, weatherData, this.config.cacheConfig.weatherTtl / 2);
      
      this.metrics.requests.successful++;
      this.recordLatency(Date.now() - startTime);
      
      logger.info('Station weather retrieved from OWM fallback', {
        requestId,
        stationId,
        latency: Date.now() - startTime,
        source: 'OWM_FALLBACK'
      });
      
      return weatherData;
    } catch (owmError) {
      this.metrics.providers.owm.failures++;
      
      logger.error('OWM fallback also failed', {
        requestId,
        stationId,
        error: owmError instanceof Error ? owmError.message : 'Unknown error'
      });
      
      throw new ThirdPartyError(
        'WEATHER_SERVICE',
        'Both IMD and OpenWeatherMap services are unavailable',
        503,
        owmError instanceof Error ? owmError : new Error('Unknown OWM error'),
        { stationId },
        requestId
      );
    }
  }

  private recordLatency(latency: number): void {
    this.latencyBuffer.push(latency);
    
    // Keep only last 1000 measurements
    if (this.latencyBuffer.length > 1000) {
      this.latencyBuffer = this.latencyBuffer.slice(-1000);
    }
  }

  private calculateMetrics(): void {
    if (this.latencyBuffer.length === 0) return;
    
    const sorted = [...this.latencyBuffer].sort((a, b) => a - b);
    
    this.metrics.latency.avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
    this.metrics.latency.p95 = sorted[Math.floor(sorted.length * 0.95)];
    this.metrics.latency.p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    this.metrics.cache.hitRate = this.metrics.cache.hits / 
      (this.metrics.cache.hits + this.metrics.cache.misses) * 100;
  }

  private updateAvgLatency(currentAvg: number, count: number, newLatency: number): number {
    return ((currentAvg * (count - 1)) + newLatency) / count;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private calculateTemperatureImpact(temp: number): 'none' | 'low' | 'medium' | 'high' {
    if (temp > 45 || temp < 0) return 'high';
    if (temp > 40 || temp < 5) return 'medium';
    if (temp > 35 || temp < 10) return 'low';
    return 'none';
  }

  private getTemperatureDescription(temp: number): string {
    if (temp > 45) return 'Extreme heat may affect vehicle performance and road conditions';
    if (temp > 40) return 'High temperatures may impact vehicle cooling systems';
    if (temp > 35) return 'Warm conditions, ensure adequate vehicle ventilation';
    if (temp < 0) return 'Freezing conditions may cause icy roads';
    if (temp < 5) return 'Cold conditions may affect tire pressure and battery performance';
    if (temp < 10) return 'Cool conditions, minimal impact expected';
    return 'Optimal temperature conditions for travel';
  }

  private calculateHumidityImpact(humidity: number): 'none' | 'low' | 'medium' | 'high' {
    if (humidity > 90) return 'high';
    if (humidity > 80) return 'medium';
    if (humidity > 70) return 'low';
    return 'none';
  }

  private getHumidityDescription(humidity: number): string {
    if (humidity > 90) return 'Very high humidity may cause fog and reduced visibility';
    if (humidity > 80) return 'High humidity may lead to condensation on windshields';
    if (humidity > 70) return 'Moderate humidity, some visibility reduction possible';
    return 'Comfortable humidity levels';
  }

  private generateRecommendations(weatherData: IMDWeatherData): string[] {
    const recommendations: string[] = [];
    
    if (weatherData.temperature.max.value > 40) {
      recommendations.push('Check vehicle cooling system before travel');
      recommendations.push('Carry extra water and avoid peak sun hours');
    }
    
    if (weatherData.temperature.min.value < 5) {
      recommendations.push('Check tire pressure and battery condition');
      recommendations.push('Allow extra time for vehicle warm-up');
    }
    
    if (weatherData.humidity.morning > 85) {
      recommendations.push('Use defogger and maintain safe following distance');
      recommendations.push('Reduce speed in low visibility conditions');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Weather conditions are favorable for travel');
    }
    
    return recommendations;
  }

  private calculateOverallRisk(impact: TrafficImpact): 'low' | 'medium' | 'high' | 'extreme' {
    const risks = [
      impact.rainImpact.severity,
      impact.temperatureImpact.severity,
      impact.humidityImpact.severity
    ];
    
    if (risks.includes('high')) return 'high';
    if (risks.filter(r => r === 'medium').length >= 2) return 'high';
    if (risks.includes('medium')) return 'medium';
    if (risks.includes('low')) return 'low';
    return 'low';
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
export default weatherService;