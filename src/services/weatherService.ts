/**
 * Weather Service
 * 
 * Service for fetching real-time weather data from OpenWeatherMap API.
 * Used for incident prediction and automatic form population.
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// Interface for weather data
interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  cloudCover: number;
  weatherCondition: string;
  weatherCode: number;
  description: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
}

// Interface for weather mapping to incident factors
interface WeatherFactors {
  weatherCondition: number; // 1-7 scale for incident prediction
  lightCondition: number;   // 1-6 scale for incident prediction
  roadCondition: number;    // 1-7 scale for incident prediction
  riskMultiplier: number;   // Overall risk multiplier
}

export class WeatherService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openweathermap.org/data/2.5';
  private isEnabled: boolean;
  private cache: Map<string, { data: WeatherData; expiry: number }> = new Map();
  private cacheTimeout: number = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      logger.warn('Weather Service not configured - missing OpenWeatherMap API key');
    } else {
      logger.info('Weather Service initialized successfully');
    }
  }

  /**
   * Get current weather data for given coordinates
   */
  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      // Check cache first
      const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && cached.expiry > Date.now()) {
        logger.debug('Returning cached weather data', { cacheKey });
        return cached.data;
      }

      if (!this.isEnabled) {
        logger.warn('Weather Service disabled - returning mock data');
        return this.getMockWeatherData(latitude, longitude);
      }

      // Validate coordinates
      if (!this.isValidCoordinates(latitude, longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      // Fetch weather data from OpenWeatherMap
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 5000
      });

      const weatherData = this.parseWeatherResponse(response.data, latitude, longitude);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        expiry: Date.now() + this.cacheTimeout
      });

      logger.info('Weather data fetched successfully', {
        location: `${latitude}, ${longitude}`,
        condition: weatherData.weatherCondition,
        temperature: weatherData.temperature
      });

      return weatherData;

    } catch (error) {
      logger.error('Failed to fetch weather data:', error);
      
      // Return mock data as fallback
      return this.getMockWeatherData(latitude, longitude);
    }
  }

  /**
   * Get weather factors for incident prediction
   */
  async getWeatherFactors(latitude: number, longitude: number): Promise<WeatherFactors> {
    try {
      const weatherData = await this.getCurrentWeather(latitude, longitude);
      return this.mapWeatherToFactors(weatherData);
    } catch (error) {
      logger.error('Failed to get weather factors:', error);
      
      // Return default factors as fallback
      return {
        weatherCondition: 1, // Fine no high winds
        lightCondition: 1,   // Daylight
        roadCondition: 1,    // Dry
        riskMultiplier: 1.0
      };
    }
  }

  /**
   * Parse OpenWeatherMap API response
   */
  private parseWeatherResponse(data: any, latitude: number, longitude: number): WeatherData {
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind?.speed || 0,
      windDirection: data.wind?.deg || 0,
      visibility: data.visibility || 10000,
      cloudCover: data.clouds?.all || 0,
      weatherCondition: data.weather[0]?.main || 'Clear',
      weatherCode: data.weather[0]?.id || 800,
      description: data.weather[0]?.description || 'clear sky',
      timestamp: new Date().toISOString(),
      location: {
        latitude,
        longitude,
        city: data.name,
        country: data.sys?.country
      }
    };
  }

  /**
   * Map weather data to incident prediction factors
   */
  private mapWeatherToFactors(weather: WeatherData): WeatherFactors {
    let weatherCondition = 1; // Default: Fine no high winds
    let lightCondition = 1;   // Default: Daylight
    let roadCondition = 1;    // Default: Dry
    let riskMultiplier = 1.0;

    // Map weather condition
    const weatherCode = weather.weatherCode;
    const windSpeed = weather.windSpeed;
    const isHighWind = windSpeed > 10; // m/s (about 22 mph)

    if (weatherCode >= 200 && weatherCode < 300) {
      // Thunderstorm
      weatherCondition = isHighWind ? 5 : 2; // Raining with/without high winds
      roadCondition = 2; // Wet
      riskMultiplier = 1.5;
    } else if (weatherCode >= 300 && weatherCode < 600) {
      // Drizzle/Rain
      weatherCondition = isHighWind ? 5 : 2; // Raining with/without high winds
      roadCondition = 2; // Wet
      riskMultiplier = 1.3;
    } else if (weatherCode >= 600 && weatherCode < 700) {
      // Snow
      weatherCondition = isHighWind ? 6 : 3; // Snowing with/without high winds
      roadCondition = 3; // Snow
      riskMultiplier = 1.8;
    } else if (weatherCode >= 700 && weatherCode < 800) {
      // Atmosphere (fog, mist, etc.)
      weatherCondition = 7; // Fog or mist
      riskMultiplier = 1.4;
      
      if (weather.visibility < 1000) {
        lightCondition = 5; // Poor visibility
        riskMultiplier = 1.6;
      }
    } else if (weatherCode === 800) {
      // Clear
      weatherCondition = isHighWind ? 4 : 1; // Fine with/without high winds
    } else if (weatherCode > 800) {
      // Clouds
      weatherCondition = isHighWind ? 4 : 1; // Fine with/without high winds
    }

    // Determine light conditions based on time
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 19) {
      lightCondition = 1; // Daylight
    } else if (currentHour >= 19 && currentHour < 22) {
      lightCondition = 4; // Darkness - lights lit
    } else {
      lightCondition = 5; // Darkness - lights unlit
      riskMultiplier *= 1.2;
    }

    // Adjust road conditions based on temperature
    if (weather.temperature <= 0 && roadCondition === 1) {
      roadCondition = 4; // Frost or ice
      riskMultiplier *= 1.3;
    }

    return {
      weatherCondition,
      lightCondition,
      roadCondition,
      riskMultiplier
    };
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  }

  /**
   * Get mock weather data for testing/fallback
   */
  private getMockWeatherData(latitude: number, longitude: number): WeatherData {
    const conditions = ['Clear', 'Clouds', 'Rain', 'Snow', 'Fog'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: 15 + Math.random() * 20, // 15-35°C
      humidity: 40 + Math.random() * 40,    // 40-80%
      pressure: 1000 + Math.random() * 50,  // 1000-1050 hPa
      windSpeed: Math.random() * 15,        // 0-15 m/s
      windDirection: Math.random() * 360,   // 0-360°
      visibility: 8000 + Math.random() * 2000, // 8-10km
      cloudCover: Math.random() * 100,      // 0-100%
      weatherCondition: randomCondition,
      weatherCode: randomCondition === 'Clear' ? 800 : 801,
      description: randomCondition.toLowerCase(),
      timestamp: new Date().toISOString(),
      location: {
        latitude,
        longitude,
        city: 'Mock City',
        country: 'MC'
      }
    };
  }

  /**
   * Get weather forecast for next few hours
   */
  async getWeatherForecast(latitude: number, longitude: number, hours: number = 6): Promise<WeatherData[]> {
    try {
      if (!this.isEnabled) {
        logger.warn('Weather Service disabled - returning mock forecast');
        return Array.from({ length: hours }, (_, i) => {
          const mockData = this.getMockWeatherData(latitude, longitude);
          const futureTime = new Date(Date.now() + i * 60 * 60 * 1000);
          mockData.timestamp = futureTime.toISOString();
          return mockData;
        });
      }

      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric',
          cnt: Math.min(hours, 40) // API limit
        },
        timeout: 5000
      });

      return response.data.list.slice(0, hours).map((item: any) => 
        this.parseWeatherResponse({
          ...item,
          name: response.data.city.name,
          sys: { country: response.data.city.country }
        }, latitude, longitude)
      );

    } catch (error) {
      logger.error('Failed to fetch weather forecast:', error);
      return [];
    }
  }

  /**
   * Clear weather cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Weather cache cleared');
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!this.apiKey,
      provider: 'OpenWeatherMap',
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
export const weatherService = new WeatherService();