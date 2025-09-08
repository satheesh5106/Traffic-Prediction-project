'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, RefreshCw, Search, Globe, Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Droplets, Eye, CloudOff } from 'lucide-react';
import { Input } from "@/components/ui/input";
import Image from 'next/image';

// Enhanced Weather interfaces combining both components
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

// Geocoding interfaces
interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface LocationSearchResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface ForecastDay {
  day: string;
  temperature: number;
  description: string;
  icon: string;
}

interface CurrentWeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  sys: {
    sunrise: number;
    sunset: number;
  };
}

interface WorldCityData {
  name: string;
  temp: string;
  description: string;
  icon: string;
}

interface WeatherWidgetProps {
  city?: string;
  className?: string;
  onWeatherChange?: (weather: WeatherData | null) => void;
}

interface WeatherToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

// Weather Toggle Button Component
// Universal Geocoding Service
const geocodingService = {
  // Local database for small villages and remote locations
  localDatabase: [
    { name: 'Daggubadu', lat: 15.816709, lon: 80.349991, country: 'IN', state: 'Andhra Pradesh' },
    // Add more locations as needed
  ],

  // Search local database
  searchLocalDatabase: (query: string): LocationSearchResult[] => {
    const normalizedQuery = query.toLowerCase().trim();
    return geocodingService.localDatabase
      .filter(location => 
        location.name.toLowerCase().includes(normalizedQuery) ||
        location.state?.toLowerCase().includes(normalizedQuery)
      )
      .map(location => ({
        name: location.name,
        displayName: `${location.name}, ${location.state}, ${location.country}`,
        lat: location.lat,
        lon: location.lon,
        country: location.country,
        state: location.state
      }));
  },

  // Check if input is coordinates
  parseCoordinates: (input: string): { lat: number; lon: number } | null => {
    const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
    const match = input.trim().match(coordPattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
    return null;
  },

  // Geocode location using OpenWeatherMap API
  geocodeLocation: async (query: string): Promise<LocationSearchResult[]> => {
    try {
      // First check local database
      const localResults = geocodingService.searchLocalDatabase(query);
      if (localResults.length > 0) {
        return localResults;
      }

      // Check if input is coordinates
      const coords = geocodingService.parseCoordinates(query);
      if (coords) {
        return [{
          name: 'Custom Location',
          displayName: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
          lat: coords.lat,
          lon: coords.lon,
          country: 'Unknown',
        }];
      }

      // Use OpenWeatherMap Geocoding API
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'b9189ea6045dd1fc3f6eb05259b188f1';
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const results: GeocodingResult[] = await response.json();
      
      return results.map(result => ({
        name: result.name,
        displayName: `${result.name}${result.state ? `, ${result.state}` : ''}, ${result.country}`,
        lat: result.lat,
        lon: result.lon,
        country: result.country,
        state: result.state
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  },

  // Get weather by coordinates
  getWeatherByCoordinates: async (lat: number, lon: number): Promise<any> => {
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'b9189ea6045dd1fc3f6eb05259b188f1';
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API failed: ${response.status}`);
    }
    
    return response.json();
  }
};

const WeatherToggleButton: React.FC<WeatherToggleProps> = ({ 
  isVisible, 
  onToggle, 
  className = "", 
  variant = 'default', 
  size = 'md' 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-8 px-2 text-xs';
      case 'lg': return 'h-12 px-6 text-base';
      default: return 'h-10 px-4 text-sm';
    }
  };

  return (
    <Button
      onClick={onToggle}
      variant={variant}
      className={`flex items-center gap-2 ${getSizeClasses()} ${className}`}
      title={isVisible ? 'Hide Weather Widget' : 'Show Weather Widget'}
    >
      {isVisible ? (
        <>
          <Cloud className="h-4 w-4" />
          <Badge variant="secondary" className="text-xs">ON</Badge>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <Badge variant="outline" className="text-xs">OFF</Badge>
        </>
      )}
    </Button>
  );
};

// Main Weather Widget Component
const WeatherWidget: React.FC<WeatherWidgetProps> = ({ city = 'Delhi', className = "", onWeatherChange }) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Fetch weather data with enhanced error handling and universal location support
  const fetchWeatherData = async (locationQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 10000);
      
      // First, geocode the location to get coordinates
      const locations = await geocodingService.geocodeLocation(locationQuery);
      
      if (locations.length === 0) {
        throw new Error(`Location "${locationQuery}" not found. Please try a different search term.`);
      }
      
      // Use the first (most relevant) location
      const location = locations[0];
      
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'b9189ea6045dd1fc3f6eb05259b188f1';
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;
      
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentWeatherUrl, { signal: abortControllerRef.current.signal }),
        fetch(forecastUrl, { signal: abortControllerRef.current.signal })
      ]);
      
      clearTimeout(timeoutId);
      
      if (!currentResponse.ok) {
        if (currentResponse.status === 404) {
          throw new Error(`Location "${location.displayName}" not found`);
        } else if (currentResponse.status === 401) {
          throw new Error('Invalid API key');
        } else if (currentResponse.status === 429) {
          throw new Error('API rate limit exceeded');
        } else {
          throw new Error(`Weather service error: ${currentResponse.status}`);
        }
      }
      
      if (!forecastResponse.ok) {
        throw new Error('Failed to fetch forecast data');
      }
      
      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();
      
      // Validate response data
      if (!currentData.main || !currentData.weather || !Array.isArray(currentData.weather)) {
        throw new Error('Invalid weather data received');
      }
      
      if (!forecastData.list || !Array.isArray(forecastData.list)) {
        throw new Error('Invalid forecast data received');
      }
      
      // Process forecast data (get next 5 days)
      const dailyForecasts: ForecastDay[] = [];
      const processedDates = new Set<string>();
      
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const dateStr = date.toDateString();
        
        if (!processedDates.has(dateStr) && dailyForecasts.length < 5) {
          processedDates.add(dateStr);
          dailyForecasts.push({
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            temperature: Math.round(item.main.temp),
            description: item.weather[0]?.description || 'Unknown',
            icon: item.weather[0]?.icon || '01d'
          });
        }
      });
      
      const processedWeatherData: WeatherData = {
        city: location.displayName,
        temperature: Math.round(currentData.main.temp),
        description: currentData.weather[0]?.description || 'Unknown',
        humidity: currentData.main.humidity,
        feelsLike: Math.round(currentData.main.feels_like),
        minTemp: Math.round(currentData.main.temp_min),
        maxTemp: Math.round(currentData.main.temp_max),
        icon: currentData.weather[0]?.icon || '01d',
        forecast: dailyForecasts
      };
      
      setWeatherData(processedWeatherData);
      onWeatherChange?.(processedWeatherData);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      
      console.error('Weather fetch error:', error);
      setError(error.message || 'Failed to fetch weather data');
      setWeatherData(null);
      onWeatherChange?.(null);
    } finally {
      setLoading(false);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Use coordinates directly for weather fetch
            const coordQuery = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
            fetchWeatherData(coordQuery);
          } catch (error) {
            console.error('Geolocation error:', error);
            fetchWeatherData(city);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          fetchWeatherData(city);
        }
      );
    } else {
      fetchWeatherData(city);
    }
  };

  // Initialize weather data
  useEffect(() => {
    // If city prop is provided, use it directly
    if (city && city !== 'Delhi') {
      fetchWeatherData(city);
    } else {
      // Only use geolocation if no specific city is provided
      getCurrentLocation();
    }
    
    // Auto-refresh every 10 minutes
    const interval = setInterval(() => {
      if (weatherData) {
        fetchWeatherData(weatherData.city);
      }
    }, 10 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [city]);

  // Loading state
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
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchWeatherData(city)} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main weather display
  if (!weatherData) {
    return null;
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getWeatherIcon(weatherData.icon, 20)}
            <span>Weather</span>
          </div>
          <Button
            onClick={() => fetchWeatherData(weatherData.city)}
            size="sm"
            variant="ghost"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Weather */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {getWeatherIcon(weatherData.icon, 32)}
              <span className="text-2xl font-bold">{weatherData.temperature}°C</span>
            </div>
            <p className="text-sm text-gray-600 capitalize">{weatherData.description}</p>
            <p className="text-sm text-gray-500">{weatherData.city}</p>
          </div>
          
          {/* Weather Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <span>Feels like {weatherData.feelsLike}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span>{weatherData.humidity}% humidity</span>
            </div>
            <div className="text-gray-600">
              Min: {weatherData.minTemp}°C
            </div>
            <div className="text-gray-600">
              Max: {weatherData.maxTemp}°C
            </div>
          </div>
          
          {/* 5-Day Forecast */}
          {weatherData.forecast.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">5-Day Forecast</h4>
              <div className="grid grid-cols-5 gap-1 text-xs">
                {weatherData.forecast.map((day, index) => (
                  <div key={index} className="text-center p-1">
                    <div className="font-medium">{day.day}</div>
                    <div className="my-1 flex justify-center">
                      {getWeatherIcon(day.icon, 16)}
                    </div>
                    <div>{day.temperature}°</div>
                    <div className="text-gray-500 truncate" title={day.description}>
                      {day.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Weather Component with multiple views and toggle functionality
const Weather: React.FC<WeatherWidgetProps> = ({ city = 'Mumbai', className = "", onWeatherChange }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeView, setActiveView] = useState<'widget' | 'search' | 'world'>('widget');
  const [searchCity, setSearchCity] = useState('');
  const [currentCity, setCurrentCity] = useState(city);
  const [worldCities, setWorldCities] = useState<WorldCityData[]>([]);
  const [worldCitiesLoading, setWorldCitiesLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<LocationSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Predefined world cities for real-time weather
  const worldCityList = [
    'London,UK',
    'Paris,FR', 
    'Tokyo,JP',
    'New York,US',
    'Sydney,AU',
    'Dubai,AE',
    'Mumbai,IN',
    'Singapore,SG'
  ];

  // Fetch real-time weather for world cities
  const fetchWorldCitiesWeather = async () => {
    setWorldCitiesLoading(true);
    try {
      const weatherPromises = worldCityList.map(async (cityQuery) => {
        try {
          const locations = await geocodingService.geocodeLocation(cityQuery);
          if (locations.length > 0) {
            const location = locations[0];
            const weatherData = await geocodingService.getWeatherByCoordinates(location.lat, location.lon);
            return {
              name: location.name,
              temp: `${Math.round(weatherData.main.temp)}°C`,
              description: weatherData.weather[0]?.description || 'Unknown',
              icon: weatherData.weather[0]?.icon || '01d'
            };
          }
          return null;
        } catch (error) {
          console.error(`Failed to fetch weather for ${cityQuery}:`, error);
          return null;
        }
      });

      const results = await Promise.all(weatherPromises);
      const validResults = results.filter(result => result !== null) as WorldCityData[];
      setWorldCities(validResults);
    } catch (error) {
      console.error('Failed to fetch world cities weather:', error);
    } finally {
      setWorldCitiesLoading(false);
    }
  };

  // Debounced search for suggestions
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSearchInput = (value: string) => {
    setSearchCity(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Hide suggestions if input is too short
    if (value.trim().length <= 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Debounce API calls
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const trimmedValue = value.trim();
        
        // Validate input format
        if (!trimmedValue || trimmedValue.length < 2) {
          return;
        }
        
        // Check for coordinate format first
        const coords = geocodingService.parseCoordinates(trimmedValue);
        if (coords) {
          const coordSuggestion: LocationSearchResult = {
            name: 'Coordinates',
            displayName: `${coords.lat}, ${coords.lon}`,
            lat: coords.lat,
            lon: coords.lon,
            country: 'Coordinates',
            state: undefined
          };
          setSearchSuggestions([coordSuggestion]);
          setShowSuggestions(true);
          return;
        }
        
        // Search local database first for faster results
        const localResults = geocodingService.searchLocalDatabase(trimmedValue);
        
        // Fetch from API for comprehensive results
        const apiResults = await geocodingService.geocodeLocation(trimmedValue);
        
        // Combine and deduplicate results
        const allResults = [...localResults, ...apiResults];
        const uniqueResults = allResults.filter((result, index, self) => 
          index === self.findIndex(r => r.lat === result.lat && r.lon === result.lon)
        );
        
        setSearchSuggestions(uniqueResults.slice(0, 8)); // Limit to 8 suggestions
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce
  };

  const handleSearch = async (locationQuery?: string) => {
    const query = locationQuery || searchCity.trim();
    
    if (!query) {
      return;
    }
    
    try {
      // Validate input format
      if (query.length < 2) {
        console.warn('Search query too short');
        return;
      }
      
      // Check if it's coordinates
      const coords = geocodingService.parseCoordinates(query);
      if (coords) {
        setCurrentCity(`${coords.lat},${coords.lon}`);
      } else {
        // Validate location exists before setting
        const locations = await geocodingService.geocodeLocation(query);
        if (locations.length === 0) {
          console.warn(`No locations found for: ${query}`);
          // Still allow the search to proceed - the weather component will handle the error
        }
        setCurrentCity(query);
      }
      
      setActiveView('widget');
      setSearchCity('');
      setShowSuggestions(false);
      setSearchSuggestions([]);
      
      // Clear timeout if exists
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Still proceed with search - let weather component handle the error
      setCurrentCity(query);
      setActiveView('widget');
      setSearchCity('');
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  };

  const handleSearchClick = () => {
    handleSearch();
  };

  const selectSuggestion = (suggestion: LocationSearchResult) => {
    setSearchCity(suggestion.displayName);
    setShowSuggestions(false);
    handleSearch(suggestion.displayName);
  };

  // Load world cities weather when switching to world view
  useEffect(() => {
    if (activeView === 'world' && worldCities.length === 0) {
      fetchWorldCitiesWeather();
    }
  }, [activeView]);

  if (!isVisible) {
    return (
      <div className={`flex justify-center ${className}`}>
        <WeatherToggleButton
          isVisible={isVisible}
          onToggle={() => setIsVisible(true)}
          variant="outline"
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toggle and View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveView('widget')}
            variant={activeView === 'widget' ? 'default' : 'outline'}
            size="sm"
          >
            <MapPin className="h-4 w-4 mr-1" />
            Current
          </Button>
          <Button
            onClick={() => setActiveView('search')}
            variant={activeView === 'search' ? 'default' : 'outline'}
            size="sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
          <Button
            onClick={() => setActiveView('world')}
            variant={activeView === 'world' ? 'default' : 'outline'}
            size="sm"
          >
            <Globe className="h-4 w-4 mr-1" />
            World
          </Button>
        </div>
        <WeatherToggleButton
          isVisible={isVisible}
          onToggle={() => setIsVisible(false)}
          variant="ghost"
          size="sm"
        />
      </div>

      {/* Main Content */}
      {activeView === 'widget' && (
        <WeatherWidget
          city={currentCity}
          className=""
          onWeatherChange={onWeatherChange}
        />
      )}

      {activeView === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Weather
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Enter city, address, or coordinates (lat,lon)..."
                    value={searchCity}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                  />
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {searchSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          <div className="font-medium text-sm">{suggestion.name}</div>
                          <div className="text-xs text-gray-500">{suggestion.displayName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={handleSearchClick}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Try: "New York", "Tokyo, Japan", "40.7128,-74.0060", or "Daggubadu"
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'world' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                World Weather
              </div>
              <Button
                onClick={fetchWorldCitiesWeather}
                disabled={worldCitiesLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ${worldCitiesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {worldCitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading real-time weather data...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {worldCities.map((cityData, index) => (
                  <div 
                    key={index} 
                    className="p-3 border rounded-lg text-center hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSearch(cityData.name)}
                  >
                    <div className="font-medium">{cityData.name}</div>
                    <div className="text-lg font-bold text-blue-600">{cityData.temp}</div>
                    <div className="text-sm text-gray-600 capitalize">{cityData.description}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Export both components
export default Weather;
export { WeatherWidget, WeatherToggleButton };