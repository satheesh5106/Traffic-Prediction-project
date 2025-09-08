import { z } from 'zod';
import { logger } from '../../app';
import { withRetries } from '../../utils/retry';
import { createCircuitBreaker } from '../../utils/circuitBreaker';
import { ThirdPartyError, ValidationError } from '../../errors/weatherErrors';
import { httpClient } from '../../utils/httpClient';
import { weatherConfig } from '../../config/weather';
import type { IMDWeatherData, IMDStation } from '../../schemas/weatherSchemas';

// OpenWeatherMap API response schemas
const OWMCurrentWeatherSchema = z.object({
  coord: z.object({
    lon: z.number(),
    lat: z.number()
  }),
  weather: z.array(z.object({
    id: z.number(),
    main: z.string(),
    description: z.string(),
    icon: z.string()
  })),
  base: z.string(),
  main: z.object({
    temp: z.number(),
    feels_like: z.number(),
    temp_min: z.number(),
    temp_max: z.number(),
    pressure: z.number(),
    humidity: z.number(),
    sea_level: z.number().optional(),
    grnd_level: z.number().optional()
  }),
  visibility: z.number().optional(),
  wind: z.object({
    speed: z.number(),
    deg: z.number().optional(),
    gust: z.number().optional()
  }).optional(),
  clouds: z.object({
    all: z.number()
  }).optional(),
  dt: z.number(),
  sys: z.object({
    type: z.number().optional(),
    id: z.number().optional(),
    country: z.string().optional(),
    sunrise: z.number(),
    sunset: z.number()
  }),
  timezone: z.number(),
  id: z.number(),
  name: z.string(),
  cod: z.number()
});

const OWMForecastSchema = z.object({
  cod: z.string(),
  message: z.number(),
  cnt: z.number(),
  list: z.array(z.object({
    dt: z.number(),
    main: z.object({
      temp: z.number(),
      feels_like: z.number(),
      temp_min: z.number(),
      temp_max: z.number(),
      pressure: z.number(),
      sea_level: z.number().optional(),
      grnd_level: z.number().optional(),
      humidity: z.number(),
      temp_kf: z.number().optional()
    }),
    weather: z.array(z.object({
      id: z.number(),
      main: z.string(),
      description: z.string(),
      icon: z.string()
    })),
    clouds: z.object({
      all: z.number()
    }),
    wind: z.object({
      speed: z.number(),
      deg: z.number(),
      gust: z.number().optional()
    }),
    visibility: z.number().optional(),
    pop: z.number(),
    rain: z.object({
      '3h': z.number()
    }).optional(),
    sys: z.object({
      pod: z.string()
    }),
    dt_txt: z.string()
  })),
  city: z.object({
    id: z.number(),
    name: z.string(),
    coord: z.object({
      lat: z.number(),
      lon: z.number()
    }),
    country: z.string(),
    population: z.number().optional(),
    timezone: z.number(),
    sunrise: z.number(),
    sunset: z.number()
  })
});

type OWMCurrentWeather = z.infer<typeof OWMCurrentWeatherSchema>;
type OWMForecast = z.infer<typeof OWMForecastSchema>;

// Circuit breaker for OWM API
const owmCircuitBreaker = createCircuitBreaker('OWM_API', {
  failureThreshold: 0.4, // 40% failure rate
  windowSize: 20, // over 20 requests
  cooldownMs: 60000 // 60 seconds cooldown
});

/**
 * OpenWeatherMap adapter for fallback weather data
 * Normalizes OWM responses to IMDWeatherData format
 */
export class OWMAdapter {
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = weatherConfig.OPENWEATHERMAP_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }
  }

  /**
   * Get weather data by coordinates (fallback method)
   * @param lat Latitude
   * @param lng Longitude
   * @returns Normalized IMDWeatherData
   */
  async getWeatherByCoords(lat: number, lng: number): Promise<IMDWeatherData> {
    const startTime = Date.now();
    
    try {
      logger.info('Fetching weather data from OpenWeatherMap', {
        provider: 'OWM',
        coordinates: { lat, lng }
      });

      // Fetch current weather and forecast in parallel
      const [currentWeather, forecast] = await Promise.all([
        this.fetchCurrentWeather(lat, lng),
        this.fetchForecast(lat, lng)
      ]);

      // Normalize to IMDWeatherData format
      const normalizedData = this.normalizeWeatherData(currentWeather, forecast);
      
      const latency = Date.now() - startTime;
      logger.info('Successfully fetched weather data from OpenWeatherMap', {
        provider: 'OWM',
        latency,
        coordinates: { lat, lng },
        stationId: normalizedData.station_id
      });

      return normalizedData;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('Failed to fetch weather data from OpenWeatherMap', {
        provider: 'OWM',
        error: error instanceof Error ? error.message : String(error),
        latency,
        coordinates: { lat, lng }
      });
      
      throw new ThirdPartyError(
        'OPENWEATHERMAP_API',
        `Failed to fetch weather data from OpenWeatherMap: ${error instanceof Error ? error.message : String(error)}`,
        (error as any).response?.status || 502
      );
    }
  }

  /**
   * Fetch current weather from OWM
   */
  private async fetchCurrentWeather(lat: number, lng: number): Promise<OWMCurrentWeather> {
    return owmCircuitBreaker.execute(async () => {
      return withRetries(
        async () => {
          const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=metric`;
          
          const response = await httpClient.get(url, {
            timeout: weatherConfig.HTTP_TIMEOUT_MS
          });

          if (response.status !== 200) {
            throw new Error(`OWM API returned ${response.status}: ${response.statusText}`);
          }

          const data = response.data;
          return OWMCurrentWeatherSchema.parse(data);
        },
        {
          maxAttempts: weatherConfig.HTTP_RETRY_ATTEMPTS,
          initialDelay: 300,
          provider: 'OWM',
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
  }

  /**
   * Fetch forecast from OWM
   */
  private async fetchForecast(lat: number, lng: number): Promise<OWMForecast> {
    return owmCircuitBreaker.execute(async () => {
      return withRetries(
        async () => {
          const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=metric&cnt=8`; // 3-hour forecast for 24 hours
          
          const response = await httpClient.get(url, {
            timeout: weatherConfig.HTTP_TIMEOUT_MS
          });

          if (response.status !== 200) {
            throw new Error(`OWM Forecast API returned ${response.status}: ${response.statusText}`);
          }

          const data = response.data;
          return OWMForecastSchema.parse(data);
        },
        {
          maxAttempts: weatherConfig.HTTP_RETRY_ATTEMPTS,
          initialDelay: 300,
          provider: 'OWM',
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
  }

  /**
   * Normalize OWM data to IMDWeatherData format
   */
  private normalizeWeatherData(current: OWMCurrentWeather, forecast: OWMForecast): IMDWeatherData {
    const now = new Date();
    
    // Convert OWM weather condition to IMD-like format
    const condition = this.mapWeatherCondition(current.weather[0].main, current.weather[0].description);
    
    // Generate forecast data from OWM 3-hour forecast matching IMD format
    const forecastData = forecast.list.slice(0, 5).map(item => ({
      day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
      date: new Date(item.dt * 1000).toISOString().split('T')[0],
      minTemp: Math.round(item.main.temp_min),
      maxTemp: Math.round(item.main.temp_max),
      condition: this.mapWeatherCondition(item.weather[0].main, item.weather[0].description)
    }));

    return {
      temperature: {
        max: {
          value: Math.round(current.main.temp_max),
          departure: 0 // Not available in OWM
        },
        min: {
          value: Math.round(current.main.temp_min),
          departure: 0 // Not available in OWM
        }
      },
      humidity: {
        morning: current.main.humidity,
        evening: current.main.humidity // OWM doesn't separate morning/evening
      },
      sunrise: new Date(current.sys.sunrise * 1000).toISOString(),
      sunset: new Date(current.sys.sunset * 1000).toISOString(),
      moonrise: new Date(current.sys.sunrise * 1000).toISOString(), // Fallback to sunrise
      moonset: new Date(current.sys.sunset * 1000).toISOString(), // Fallback to sunset
      forecast: forecastData,
      source: 'OWM',
      station_id: current.id
    };
  }

  /**
   * Map OWM weather conditions to IMD-like format
   */
  private mapWeatherCondition(main: string, description: string): string {
    const mainLower = main.toLowerCase();
    const descLower = description.toLowerCase();

    // Map common weather conditions
    if (mainLower === 'clear') return 'Clear';
    if (mainLower === 'clouds') {
      if (descLower.includes('few')) return 'Partly Cloudy';
      if (descLower.includes('scattered') || descLower.includes('broken')) return 'Cloudy';
      return 'Overcast';
    }
    if (mainLower === 'rain') {
      if (descLower.includes('light')) return 'Light Rain';
      if (descLower.includes('heavy')) return 'Heavy Rain';
      return 'Rain';
    }
    if (mainLower === 'drizzle') return 'Drizzle';
    if (mainLower === 'thunderstorm') return 'Thunderstorm';
    if (mainLower === 'snow') return 'Snow';
    if (mainLower === 'mist' || mainLower === 'fog') return 'Fog';
    if (mainLower === 'haze') return 'Haze';
    if (mainLower === 'dust' || mainLower === 'sand') return 'Dust';
    
    // Fallback to original description
    return description;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return owmCircuitBreaker.getStats();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker() {
    owmCircuitBreaker.reset();
  }
}

// Export singleton instance
export const owmAdapter = new OWMAdapter();