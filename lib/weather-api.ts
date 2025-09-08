/**
 * Weather API Service for TrafficAI Backend Integration
 * Integrates with the weather backend API running on port 3002
 */

// Base API URL for weather backend
const WEATHER_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Weather data interfaces
export interface WeatherData {
  location: string;
  current: {
    temperature: number;
    description: string;
    humidity: number;
    feelsLike: number;
    pressure: number;
    windSpeed: number;
    visibility: number;
    uvIndex: number;
    icon: string;
  };
  forecast: Array<{
    date: string;
    day: string;
    temperature: {
      min: number;
      max: number;
    };
    description: string;
    humidity: number;
    windSpeed: number;
    icon: string;
  }>;
  trafficImpact: {
    level: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
  };
  lastUpdated: string;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
  areas?: string[];
  states?: string[];
  districts?: string[];
  description: string;
  validUntil: string;
  issuedAt?: string;
  link?: string;
  source?: string;
  temperature?: number;
  humidity?: number;
}

export interface WeatherHistoryRecord {
  id: string;
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  timestamp: string;
}

export interface TrafficImpactData {
  location: string;
  impact: {
    level: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
  };
  weatherConditions: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    description: string;
  };
  lastUpdated: string;
}

// Weather API Service Class
class WeatherAPIService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${WEATHER_API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Weather API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get current weather data for a location
   * @param location - City name (e.g., "Delhi", "Mumbai")
   * @returns Promise<WeatherData>
   */
  async getCurrentWeather(location: string): Promise<WeatherData> {
    return this.makeRequest<WeatherData>(`/weather?location=${encodeURIComponent(location)}`);
  }

  /**
   * Get weather alerts for a location
   * @param location - City name (e.g., "Delhi", "Mumbai")
   * @returns Promise<WeatherAlert[]>
   */
  async getWeatherAlerts(location: string): Promise<WeatherAlert[]> {
    const response = await this.makeRequest<{ alerts: WeatherAlert[] }>(
      `/weather/alerts?location=${encodeURIComponent(location)}`
    );
    return response.alerts;
  }

  /**
   * Get traffic impact analysis for a location
   * @param location - City name (e.g., "Delhi", "Mumbai")
   * @returns Promise<TrafficImpactData>
   */
  async getTrafficImpact(location: string): Promise<TrafficImpactData> {
    return this.makeRequest<TrafficImpactData>(`/weather/traffic-impact?location=${encodeURIComponent(location)}`);
  }

  /**
   * Get weather history for a location
   * @param location - City name (e.g., "Delhi", "Mumbai")
   * @param limit - Number of records to fetch (default: 10)
   * @returns Promise<WeatherHistoryRecord[]>
   */
  async getWeatherHistory(location: string, limit: number = 10): Promise<WeatherHistoryRecord[]> {
    const response = await this.makeRequest<{ history: WeatherHistoryRecord[] }>(
      `/weather/history?location=${encodeURIComponent(location)}&limit=${limit}`
    );
    return response.history;
  }

  /**
   * Refresh weather data for a location
   * @param location - City name (e.g., "Delhi", "Mumbai")
   * @returns Promise<{ success: boolean; message: string }>
   */
  async refreshWeatherData(location: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>('/refresh', {
      method: 'POST',
      body: JSON.stringify({ location }),
    });
  }

  /**
   * Check API health status
   * @returns Promise<{ status: string; timestamp: string }>
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest<{ status: string; timestamp: string }>('/health');
  }

  /**
   * Get weather data for multiple locations
   * @param locations - Array of city names
   * @returns Promise<WeatherData[]>
   */
  async getMultipleLocationsWeather(locations: string[]): Promise<WeatherData[]> {
    const promises = locations.map(location => 
      this.getCurrentWeather(location).catch(error => {
        console.warn(`Failed to fetch weather for ${location}:`, error);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    return results.filter((data): data is WeatherData => data !== null);
  }

  /**
   * Generate weather alerts based on current conditions
   * @param weatherData - Current weather data
   * @returns WeatherAlert[]
   */
  generateAlertsFromWeatherData(weatherData: WeatherData[]): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    let alertId = 1;

    weatherData.forEach((weather) => {
      const temp = weather.current.temperature;
      const humidity = weather.current.humidity;
      const windSpeed = weather.current.windSpeed;
      const description = weather.current.description.toLowerCase();

      // High temperature alert
      if (temp > 40) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: temp > 45 ? 'Extreme Heat' : 'High Temperature',
          severity: temp > 45 ? 'high' : 'medium',
          location: weather.location,
          description: `Temperature reaching ${temp}°C. ${temp > 45 ? 'Extreme heat conditions may affect traffic and road conditions.' : 'High temperatures may cause discomfort for commuters.'}`,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          temperature: temp
        });
      }

      // High humidity alert
      if (humidity > 85) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'High Humidity',
          severity: 'medium',
          location: weather.location,
          description: `High humidity levels (${humidity}%). May cause reduced visibility and discomfort.`,
          validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          humidity: humidity
        });
      }

      // Strong wind alert
      if (windSpeed > 25) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'Strong Winds',
          severity: windSpeed > 40 ? 'high' : 'medium',
          location: weather.location,
          description: `Strong winds at ${windSpeed} km/h. May affect vehicle stability and visibility.`,
          validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
        });
      }

      // Weather condition based alerts
      if (description.includes('rain') || description.includes('shower')) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'Rain Expected',
          severity: description.includes('heavy') ? 'high' : 'medium',
          location: weather.location,
          description: `${weather.current.description} conditions. May cause waterlogging and traffic delays.`,
          validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
        });
      }

      if (description.includes('thunder') || description.includes('storm')) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'Thunderstorm',
          severity: 'high',
          location: weather.location,
          description: `${weather.current.description} expected. Avoid outdoor activities and drive carefully.`,
          validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
        });
      }
    });

    return alerts.slice(0, 10); // Limit to 10 most recent alerts
  }
}

// Export singleton instance
export const weatherAPI = new WeatherAPIService();

// Utility functions
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getTrafficImpactColor = (level: string): string => {
  switch (level) {
    case 'high': return 'bg-red-50 border-red-200 text-red-700';
    case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    case 'low': return 'bg-green-50 border-green-200 text-green-700';
    default: return 'bg-gray-50 border-gray-200 text-gray-700';
  }
};

export const formatTemperature = (temp: number): string => {
  return `${Math.round(temp)}°C`;
};

export const formatWindSpeed = (speed: number): string => {
  return `${Math.round(speed)} km/h`;
};

export const formatHumidity = (humidity: number): string => {
  return `${Math.round(humidity)}%`;
};

export default weatherAPI;