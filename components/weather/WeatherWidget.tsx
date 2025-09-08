'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Droplets, Eye } from 'lucide-react';

interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  feelsLike: number;
  minTemp: number;
  maxTemp: number;
  icon: string;
  forecast: ForecastDay[];
}

interface ForecastDay {
  date: string;
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

interface WeatherWidgetProps {
  city?: string;
  className?: string;
  onWeatherChange?: (weather: WeatherData) => void;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ 
  city = 'Delhi', 
  className = '',
  onWeatherChange 
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lon: number} | null>(null);
  
  const API_KEY = 'b9189ea6045dd1fc3f6eb05259b188f1';
  const isMounted = useRef(true);

  // Get weather icon component
  const getWeatherIcon = (iconCode: string, size: number = 24) => {
    const iconProps = { size, className: 'text-blue-600' };
    
    switch (iconCode) {
      case '01d':
      case '01n':
        return <Sun {...iconProps} className="text-yellow-500" />;
      case '02d':
      case '02n':
      case '03d':
      case '03n':
      case '04d':
      case '04n':
        return <Cloud {...iconProps} />;
      case '09d':
      case '09n':
      case '10d':
      case '10n':
        return <CloudRain {...iconProps} className="text-blue-500" />;
      case '13d':
      case '13n':
        return <CloudSnow {...iconProps} className="text-gray-400" />;
      default:
        return <Sun {...iconProps} />;
    }
  };

  // Get user's current location
  const getCurrentLocation = (): Promise<{lat: number, lon: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          reject(error);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  // Fetch weather data from OpenWeatherMap API
  const fetchWeatherData = async (cityName?: string, coordinates?: {lat: number, lon: number}) => {
    try {
      setLoading(true);
      setError(null);

      // Validate inputs
      if (!cityName && !coordinates) {
        throw new Error('Either city name or coordinates must be provided');
      }
      
      if (cityName && (typeof cityName !== 'string' || cityName.trim().length === 0)) {
        throw new Error('Invalid city name provided');
      }
      
      if (!API_KEY || API_KEY.trim().length === 0) {
        throw new Error('Weather API key not configured');
      }

      let currentWeatherUrl: string;
      let forecastUrl: string;

      if (coordinates) {
        currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${API_KEY}&units=metric`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${API_KEY}&units=metric`;
      } else {
        const encodedCity = encodeURIComponent(cityName!.trim());
        currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${API_KEY}&units=metric`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${API_KEY}&units=metric`;
      }

      // Fetch current weather with timeout and enhanced error handling
      const currentResponse = await fetch(currentWeatherUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!currentResponse.ok) {
        if (currentResponse.status === 404) {
          throw new Error(cityName ? `City '${cityName}' not found` : 'Location not found');
        } else if (currentResponse.status === 401) {
          throw new Error('Invalid API key');
        } else if (currentResponse.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Weather service error (${currentResponse.status})`);
        }
      }
      
      const currentData = await currentResponse.json();
      
      // Validate current weather data structure
      if (!currentData || !currentData.main || !currentData.weather || !Array.isArray(currentData.weather) || currentData.weather.length === 0) {
        throw new Error('Invalid weather data received');
      }

      // Fetch 5-day forecast with enhanced error handling
      let dailyForecasts: ForecastDay[] = [];
      
      try {
        const forecastResponse = await fetch(forecastUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          
          // Validate forecast data structure
          if (forecastData && forecastData.list && Array.isArray(forecastData.list)) {
            // Process forecast data (get daily forecasts)
            const processedDates = new Set<string>();

            forecastData.list.forEach((item: any) => {
              try {
                if (item && item.dt && item.main && item.weather && Array.isArray(item.weather) && item.weather.length > 0) {
                  const date = new Date(item.dt * 1000).toDateString();
                  if (!processedDates.has(date) && dailyForecasts.length < 5) {
                    processedDates.add(date);
                    dailyForecasts.push({
                      date: new Date(item.dt * 1000).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      }),
                      temp: Math.round(item.main.temp || 0),
                      description: item.weather[0].description || 'Unknown',
                      icon: item.weather[0].icon || '01d',
                      humidity: item.main.humidity || 0,
                      windSpeed: (item.wind && item.wind.speed) || 0
                    });
                  }
                }
              } catch (itemError) {
                console.warn('Error processing forecast item:', itemError);
              }
            });
          } else {
            console.warn('Invalid forecast data structure received');
          }
        } else {
          console.warn('Forecast data unavailable, continuing with current weather only');
        }
      } catch (forecastError) {
        console.warn('Failed to fetch forecast data:', forecastError);
      }

      const weather: WeatherData = {
        city: currentData.name || 'Unknown',
        temperature: Math.round(currentData.main.temp || 0),
        description: currentData.weather[0].description || 'Unknown',
        humidity: currentData.main.humidity || 0,
        feelsLike: Math.round(currentData.main.feels_like || currentData.main.temp || 0),
        minTemp: Math.round(currentData.main.temp_min || currentData.main.temp || 0),
        maxTemp: Math.round(currentData.main.temp_max || currentData.main.temp || 0),
        icon: currentData.weather[0].icon || '01d',
        forecast: dailyForecasts
      };

      if (isMounted.current) {
        setWeatherData(weather);
        // Pass weather data to parent component with error handling
        try {
          if (onWeatherChange && typeof onWeatherChange === 'function') {
            onWeatherChange(weather);
          }
        } catch (callbackError) {
          console.warn('Error in weather change callback:', callbackError);
        }
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
      
      let errorMessage = 'Failed to fetch weather data';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError' || err.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = err.message;
        }
      }
      
      if (isMounted.current) {
        setError(errorMessage);
        setWeatherData(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Initialize weather data
  useEffect(() => {
    const initializeWeather = async () => {
      try {
        // Try to get current location first
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        await fetchWeatherData(undefined, location);
      } catch (error) {
        // Fallback to city name if geolocation fails
        console.warn('Using city fallback for weather data');
        await fetchWeatherData(city);
      }
    };

    initializeWeather();

    return () => {
      isMounted.current = false;
    };
  }, [city]);

  // Refresh weather data every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentLocation) {
        fetchWeatherData(undefined, currentLocation);
      } else {
        fetchWeatherData(city);
      }
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, [city, currentLocation]);

  if (loading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Cloud className="h-5 w-5" />
            Weather Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={() => fetchWeatherData(city)}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) {
    return null;
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getWeatherIcon(weatherData.icon, 20)}
          Weather - {weatherData.city}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weather */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{weatherData.temperature}°C</div>
            <div className="text-sm text-gray-600 capitalize">{weatherData.description}</div>
          </div>
          <div className="text-right">
            {getWeatherIcon(weatherData.icon, 48)}
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <span>Feels like {weatherData.feelsLike}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span>Humidity {weatherData.humidity}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Min:</span>
            <span>{weatherData.minTemp}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Max:</span>
            <span>{weatherData.maxTemp}°C</span>
          </div>
        </div>

        {/* 5-Day Forecast */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">5-Day Forecast</h4>
          <div className="space-y-2">
            {weatherData.forecast.map((day, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getWeatherIcon(day.icon, 16)}
                  <span className="w-16">{day.date}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{day.temp}°C</span>
                  <span className="text-gray-500 capitalize text-xs">{day.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;