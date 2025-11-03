import { NextApiRequest, NextApiResponse } from 'next';

interface IndianAPIWeatherData {
  location: string;
  current: {
    temperature: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    wind_direction: string;
    condition: string;
    uv_index: number;
  };
  forecast: Array<{
    date: string;
    max_temp: number;
    min_temp: number;
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
    moon_phase: string;
    hourly: Array<{
      time: string;
      temperature: number;
      feels_like: number;
      humidity: number;
      wind_speed: number;
      wind_direction: string;
      condition: string;
      chance_of_rain: number;
    }>;
  }>;
}

interface WeatherAlert {
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

const INDIAN_API_KEY = 'sk-live-rDgzdEJqla90TnmD3qG242N5LhKAMxVdoSQ72AAO';
const INDIAN_API_BASE_URL = 'https://weather.indianapi.in';

// Major Indian cities to fetch weather data for
const MAJOR_CITIES = [
  'Delhi,India',
  'Mumbai,India', 
  'Bangalore,India',
  'Chennai,India',
  'Kolkata,India',
  'Hyderabad,India',
  'Pune,India',
  'Ahmedabad,India',
  'Jaipur,India',
  'Lucknow,India'
];

function determineAlertSeverity(condition: string, temperature: number, uvIndex: number): 'low' | 'medium' | 'high' {
  const lowerCondition = condition.toLowerCase();
  
  // High severity conditions
  if (lowerCondition.includes('storm') || lowerCondition.includes('cyclone') || 
      lowerCondition.includes('severe') || temperature > 45 || temperature < 0 || uvIndex > 8) {
    return 'high';
  }
  
  // Medium severity conditions
  if (lowerCondition.includes('rain') || lowerCondition.includes('fog') || 
      lowerCondition.includes('haze') || temperature > 40 || temperature < 5 || uvIndex > 6) {
    return 'medium';
  }
  
  return 'low';
}

function determineAlertType(condition: string): string {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('rain') || lowerCondition.includes('shower')) return 'rain';
  if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) return 'thunderstorm';
  if (lowerCondition.includes('fog')) return 'fog';
  if (lowerCondition.includes('haze')) return 'dust_storm';
  if (lowerCondition.includes('wind')) return 'wind';
  if (lowerCondition.includes('hot') || lowerCondition.includes('heat')) return 'heat_wave';
  if (lowerCondition.includes('cold')) return 'cold_wave';
  if (lowerCondition.includes('cyclone')) return 'cyclone';
  
  return 'general';
}

async function fetchWeatherForCity(city: string): Promise<WeatherAlert[]> {
  try {
    const response = await fetch(`${INDIAN_API_BASE_URL}/global/weather?location=${encodeURIComponent(city)}`, {
      method: 'GET',
      headers: {
        'x-api-key': INDIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Indian API error: ${response.status} ${response.statusText}`);
    }

    const data: IndianAPIWeatherData = await response.json();
    const alerts: WeatherAlert[] = [];
    
    // Create alert from current weather conditions
    const severity = determineAlertSeverity(data.current.condition, data.current.temperature, data.current.uv_index);
    const alertType = determineAlertType(data.current.condition);
    
    const currentAlert: WeatherAlert = {
      id: `${data.location.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
      type: alertType,
      severity: severity,
      location: data.location,
      areas: [data.location],
      states: [data.location.split(',')[1]?.trim() || 'India'],
      districts: [data.location.split(',')[0]?.trim() || data.location],
      description: `Current weather in ${data.location}: ${data.current.condition}. Temperature: ${data.current.temperature}°C (feels like ${data.current.feels_like}°C). Humidity: ${data.current.humidity}%. Wind: ${data.current.wind_speed} km/h ${data.current.wind_direction}. UV Index: ${data.current.uv_index}.`,
      validUntil: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // Valid for 3 hours
      issuedAt: new Date().toISOString(),
      source: 'Indian API - Real-time Weather',
      temperature: data.current.temperature,
      humidity: data.current.humidity,
    };
    
    alerts.push(currentAlert);
    
    // Create alerts for significant forecast conditions
    if (data.forecast && data.forecast.length > 0) {
      const todayForecast = data.forecast[0];
      
      // Check for extreme temperatures in forecast
      if (todayForecast.max_temp > 40 || todayForecast.min_temp < 5) {
        const tempAlert: WeatherAlert = {
          id: `${data.location.replace(/\s+/g, '_').toLowerCase()}_temp_${Date.now()}`,
          type: todayForecast.max_temp > 40 ? 'heat_wave' : 'cold_wave',
          severity: todayForecast.max_temp > 45 || todayForecast.min_temp < 0 ? 'high' : 'medium',
          location: data.location,
          areas: [data.location],
          states: [data.location.split(',')[1]?.trim() || 'India'],
          districts: [data.location.split(',')[0]?.trim() || data.location],
          description: `Temperature forecast for ${data.location}: High ${todayForecast.max_temp}°C, Low ${todayForecast.min_temp}°C. ${todayForecast.max_temp > 40 ? 'Heat wave conditions expected.' : 'Cold wave conditions expected.'}`,
          validUntil: new Date(new Date(todayForecast.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          issuedAt: new Date().toISOString(),
          source: 'Indian API - Weather Forecast',
          temperature: todayForecast.max_temp,
        };
        
        alerts.push(tempAlert);
      }
      
      // Check hourly forecasts for rain alerts
      const rainHours = todayForecast.hourly?.filter(hour => hour.chance_of_rain > 50) || [];
      if (rainHours.length > 0) {
        const rainAlert: WeatherAlert = {
          id: `${data.location.replace(/\s+/g, '_').toLowerCase()}_rain_${Date.now()}`,
          type: 'rain',
          severity: rainHours.some(h => h.chance_of_rain > 80) ? 'high' : 'medium',
          location: data.location,
          areas: [data.location],
          states: [data.location.split(',')[1]?.trim() || 'India'],
          districts: [data.location.split(',')[0]?.trim() || data.location],
          description: `Rain expected in ${data.location} with ${Math.max(...rainHours.map(h => h.chance_of_rain))}% chance. Expected during: ${rainHours.map(h => h.time).join(', ')}.`,
          validUntil: new Date(new Date(todayForecast.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          issuedAt: new Date().toISOString(),
          source: 'Indian API - Rain Forecast',
        };
        
        alerts.push(rainAlert);
      }
    }
    
    return alerts;
  } catch (error) {
    console.error(`Error fetching weather for ${city}:`, error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fetching weather data from Indian API for major cities...');
    
    // Fetch weather data for all major cities in parallel
    const weatherPromises = MAJOR_CITIES.map(city => fetchWeatherForCity(city));
    const weatherResults = await Promise.allSettled(weatherPromises);
    
    // Collect all successful alerts
    const allAlerts: WeatherAlert[] = [];
    weatherResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allAlerts.push(...result.value);
      } else {
        console.error(`Failed to fetch weather for ${MAJOR_CITIES[index]}:`, result.reason);
      }
    });
    
    // Sort alerts by severity (high -> medium -> low) and then by timestamp
    allAlerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime();
    });
    
    console.log(`Successfully fetched ${allAlerts.length} weather alerts from Indian API`);
    
    // Return the alerts in the expected format
    res.status(200).json({
      alerts: allAlerts,
      timestamp: new Date().toISOString(),
      source: 'Indian API - Real-time Weather Data',
      total: allAlerts.length
    });
    
  } catch (error) {
    console.error('Error fetching weather data from Indian API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weather data from Indian API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}