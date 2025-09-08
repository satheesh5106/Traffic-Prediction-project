import { z } from 'zod';
import { logger } from '../../app';
import { apiConfig } from '../../config/weather';
import { IMDStation, IMDWeatherData, IMDStationZ, IMDWeatherDataZ } from '../../schemas/weatherSchemas';
import { withRetries } from '../../utils/retry';
import { createCircuitBreaker } from '../../utils/circuitBreaker';
import { ThirdPartyError, ValidationError } from '../../errors/weatherErrors';
import { httpClient } from '../../utils/httpClient';

// IMD API response schemas for validation
const IMDStationResponseZ = z.object({
  code: z.number(),
  result: z.array(z.object({
    stationId: z.number(),
    station: z.string(),
    jurisdiction: z.string(),
    region: z.string()
  }))
});

const IMDWeatherResponseZ = z.object({
  code: z.number(),
  result: z.object({
    astronomical: z.object({
      sunrise: z.string(),
      sunset: z.string(),
      moonrise: z.string(),
      moonset: z.string()
    }),
    humidity: z.object({
      morning: z.number(),
      evening: z.number()
    }),
    temperature: z.object({
      max: z.object({
        value: z.number(),
        departure: z.number()
      }),
      min: z.object({
        value: z.number(),
        departure: z.number()
      })
    }),
    forecast: z.array(z.object({
      day: z.string(),
      date: z.string(),
      max: z.number(),
      min: z.number(),
      condition: z.string().optional().default('Clear')
    }))
  })
});

// Circuit breaker for IMD API
const imdCircuitBreaker = createCircuitBreaker('IMD_API', {
  failureThreshold: 0.4, // 40% failure rate
  windowSize: 20, // over 20 requests
  cooldownMs: 60000 // 60 seconds cooldown
});

/**
 * IMD Adapter Service
 * Handles communication with the India Meteorological Department API
 * Includes circuit breaker, retry logic, and response validation
 */
export class IMDAdapter {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = apiConfig.imdApiUrl;
    this.timeout = apiConfig.httpTimeoutMs;
  }

  /**
   * Retrieves all available weather stations from IMD API
   * @returns Promise<IMDStation[]> Array of weather stations
   * @throws ThirdPartyError when API call fails
   * @throws ValidationError when response validation fails
   */
  async listStations(): Promise<IMDStation[]> {
    const startTime = Date.now();
    
    try {
      const stations = await imdCircuitBreaker.execute(async () => {
        return await withRetries(
          async () => {
            logger.debug({ baseUrl: this.baseUrl }, 'Fetching IMD stations');
            
            const response = await httpClient.get(`${this.baseUrl}/station/all`, {
              timeout: this.timeout,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Weather-Service/1.0'
              }
            });

            // Validate raw API response
            const validatedResponse = IMDStationResponseZ.parse(response.data);
            
            if (validatedResponse.code !== 200) {
              throw new ThirdPartyError(
                `IMD API returned error code: ${validatedResponse.code}`,
                'IMD',
                validatedResponse.code
              );
            }

            // Transform and validate each station
            const stations: IMDStation[] = validatedResponse.result.map(station => {
              const transformedStation = {
                station: station.station,
                jurisdiction: station.jurisdiction,
                region: station.region,
                stationId: station.stationId
              };
              
              // Validate against our schema
              return IMDStationZ.parse(transformedStation);
            });

            logger.info({
              stationCount: stations.length,
              latencyMs: Date.now() - startTime
            }, 'Successfully fetched IMD stations');

            return stations;
          },
          {
            maxAttempts: 2,
            initialDelay: 300,
            provider: 'IMD',
            shouldRetry: (error: unknown) => {
              const err = error as any;
              // Don't retry client errors except 429
              if (err.response?.status >= 400 && err.response?.status < 500) {
                return err.response?.status === 429;
              }
              // Retry network errors and server errors
              return !err.response || err.response?.status >= 500;
            }
          }
        );
      });

      return stations;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
        provider: 'IMD'
      }, 'Failed to fetch IMD stations');

      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid response format from IMD stations API',
          error.errors
        );
      }

      if (error instanceof ThirdPartyError) {
        throw error;
      }

      throw new ThirdPartyError(
        'IMD',
        `Failed to fetch stations from IMD: ${error instanceof Error ? error.message : String(error)}`,
        (error as any).response?.status || 502
      );
    }
  }

  /**
   * Retrieves weather data for a specific station
   * @param stationId - The ID of the weather station
   * @returns Promise<IMDWeatherData> Weather data for the station
   * @throws ThirdPartyError when API call fails
   * @throws ValidationError when response validation fails
   */
  async getStationWeather(stationId: number): Promise<IMDWeatherData> {
    const startTime = Date.now();
    
    try {
      const weatherData = await imdCircuitBreaker.execute(async () => {
        return await withRetries(
          async () => {
            logger.debug({ stationId, baseUrl: this.baseUrl }, 'Fetching IMD weather data');
            
            const response = await httpClient.get(`${this.baseUrl}/weather/${stationId}`, {
              timeout: this.timeout,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Weather-Service/1.0'
              }
            });

            // Validate raw API response
            const validatedResponse = IMDWeatherResponseZ.parse(response.data);
            
            if (validatedResponse.code !== 200) {
              throw new ThirdPartyError(
                `IMD API returned error code: ${validatedResponse.code} for station ${stationId}`,
                'IMD',
                validatedResponse.code
              );
            }

            // Transform to our standard format
            const transformedWeather: IMDWeatherData = {
              temperature: {
                max: {
                  value: validatedResponse.result.temperature.max.value,
                  departure: validatedResponse.result.temperature.max.departure
                },
                min: {
                  value: validatedResponse.result.temperature.min.value,
                  departure: validatedResponse.result.temperature.min.departure
                }
              },
              humidity: {
                morning: validatedResponse.result.humidity.morning,
                evening: validatedResponse.result.humidity.evening
              },
              sunrise: validatedResponse.result.astronomical.sunrise,
              sunset: validatedResponse.result.astronomical.sunset,
              moonrise: validatedResponse.result.astronomical.moonrise,
              moonset: validatedResponse.result.astronomical.moonset,
              forecast: validatedResponse.result.forecast.map(f => ({
                day: f.day,
                date: f.date,
                minTemp: f.min,
                maxTemp: f.max,
                condition: f.condition || 'Clear'
              })),
              source: 'IMD',
              station_id: stationId
            };

            // Validate against our schema
            const validatedWeather = IMDWeatherDataZ.parse(transformedWeather);

            logger.info({
              stationId,
              latencyMs: Date.now() - startTime,
              maxTemp: validatedWeather.temperature.max.value,
              minTemp: validatedWeather.temperature.min.value
            }, 'Successfully fetched IMD weather data');

            return validatedWeather;
          },
          {
            maxAttempts: 2,
            initialDelay: 300,
            provider: 'IMD',
            shouldRetry: (error: unknown) => {
              const err = error as any;
              // Don't retry client errors except 429
              if (err.response?.status >= 400 && err.response?.status < 500) {
                return err.response?.status === 429;
              }
              // Retry network errors and server errors
              return !err.response || err.response?.status >= 500;
            }
          }
        );
      });

      return weatherData;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        stationId,
        latencyMs,
        provider: 'IMD'
      }, 'Failed to fetch IMD weather data');

      if (error instanceof z.ZodError) {
        throw new ValidationError(
          `Invalid response format from IMD weather API for station ${stationId}`,
          error.errors
        );
      }

      if (error instanceof ThirdPartyError) {
        throw error;
      }

      throw new ThirdPartyError(
        'IMD',
        `Failed to fetch weather data from IMD for station ${stationId}: ${error instanceof Error ? error.message : String(error)}`,
        (error as any).response?.status || 502
      );
    }
  }

  /**
   * Get circuit breaker statistics for monitoring
   * @returns Circuit breaker stats
   */
  getCircuitBreakerStats() {
    return imdCircuitBreaker.getStats();
  }

  /**
   * Reset circuit breaker (for testing/admin purposes)
   */
  resetCircuitBreaker() {
    imdCircuitBreaker.reset();
  }
}

// Export singleton instance
export const imdAdapter = new IMDAdapter();