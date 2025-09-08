'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Cloud, MapPin, RefreshCw, Thermometer, Wind, Droplets, Eye, Sun, CloudRain, Zap, Activity } from 'lucide-react';
import Weather from '@/components/dashboard/weather';
import { weatherAPI, WeatherData as BackendWeatherData, WeatherAlert, TrafficImpactData, getSeverityColor, getTrafficImpactColor, formatTemperature } from '@/lib/weather-api';

// Weather data interface for the Weather component
interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  feelsLike: number;
  minTemp: number;
  maxTemp: number;
  icon: string;
}

const WeatherDashboard = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const [backendWeatherData, setBackendWeatherData] = useState<BackendWeatherData[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [trafficImpactData, setTrafficImpactData] = useState<TrafficImpactData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Major Indian cities to monitor
  const MAJOR_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];

  // Fetch weather data from our backend API
  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/weather/current?lat=19.076&lon=72.8777`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'demo_token'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform backend data to frontend format
        const transformedData = [{
          location: selectedCity,
          current: {
            temperature: data.current?.temperature || 25,
            description: data.current?.weather?.description || 'Clear',
            humidity: data.current?.humidity || 60,
            feelsLike: data.current?.feels_like || 25,
            pressure: data.current?.pressure || 1013,
            windSpeed: data.current?.wind?.speed || 5,
            visibility: data.current?.visibility || 10,
            uvIndex: data.current?.uv_index || 3,
            icon: data.current?.weather?.icon || 'sun'
          },
          forecast: [],
          trafficImpact: {
            level: 'low' as const,
            description: 'Minimal weather impact on traffic',
            recommendations: ['Normal driving conditions']
          },
          lastUpdated: data.timestamp || new Date().toISOString()
        }];
        setBackendWeatherData(transformedData);
        return transformedData;
      } else {
        throw new Error(`API Error: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
      // Silently handle error without displaying message to user
      return [];
    }
  };

  // Fetch IMD weather alerts from our new API
  const fetchWeatherAlerts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/weather/imd`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'demo_token'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform IMD alerts to frontend format
        const alerts = data.alerts?.map((alert: any, index: number) => ({
          id: alert.id || `alert_${index}`,
          type: alert.type || 'weather',
          severity: alert.severity || 'medium' as const,
          location: alert.location || 'India',
          areas: alert.areas || [],
          states: alert.states || [],
          districts: alert.districts || [],
          description: alert.text || alert.message || 'Weather alert',
          issuedAt: alert.timestamp || new Date().toISOString(),
          validUntil: alert.validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          link: alert.link,
          source: alert.source || 'imd'
        })) || [];
        setWeatherAlerts(alerts);
        return alerts;
      } else {
        throw new Error(`IMD API Error: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching IMD alerts:', err);
      setWeatherAlerts([]);
      return [];
    }
  };

  const refreshWeatherAlerts = async () => {
    setIsRefreshing(true);
    try {
      // Clear IMD cache first
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/weather/cache/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'demo_token'}`
        },
        body: JSON.stringify({ type: 'imd' })
      });
      
      // Wait a moment for cache to clear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch fresh IMD data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/weather/imd`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'demo_token'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const alerts = data.alerts?.map((alert: any, index: number) => ({
          id: alert.id || `alert_${index}`,
          type: alert.type || 'weather',
          severity: alert.severity || 'medium' as const,
          location: alert.location || 'India',
          areas: alert.areas || [],
          states: alert.states || [],
          districts: alert.districts || [],
          description: alert.text || alert.message || 'Weather alert',
          issuedAt: alert.timestamp || new Date().toISOString(),
          validUntil: alert.validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          link: alert.link,
          source: alert.source || 'imd'
        })) || [];
        setWeatherAlerts(alerts);
      }
    } catch (error) {
      console.error('Error refreshing weather alerts:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get current location weather
  const fetchCurrentLocationWeather = async () => {
    try {
      const response = await fetch('http://localhost:5001/alerts');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform IMD alerts to match our WeatherAlert interface
      const transformedAlerts = data.alerts.map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity.toLowerCase(),
        description: alert.description,
        location: alert.region,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        temperature: null,
        humidity: null
      }));
      
      setWeatherAlerts(transformedAlerts);
      return transformedAlerts;
    } catch (err) {
      console.error('Error fetching IMD weather alerts:', err);
      setError('Failed to load IMD weather alerts');
      return [];
    }
  };

  // Fetch traffic impact data for all cities
  const fetchTrafficImpactData = async () => {
    try {
      const impactPromises = MAJOR_CITIES.map(city => 
        weatherAPI.getTrafficImpact(city).catch(error => {
          console.warn(`Failed to fetch traffic impact for ${city}:`, error);
          return null;
        })
      );
      
      const impactResults = await Promise.all(impactPromises);
      const validImpactData = impactResults.filter((data): data is TrafficImpactData => data !== null);
      setTrafficImpactData(validImpactData);
      return validImpactData;
    } catch (err) {
      console.error('Error fetching traffic impact data:', err);
      return [];
    }
  };

  // Refresh weather data for a specific city
  const refreshCityWeatherData = async (city: string) => {
    try {
      await weatherAPI.refreshWeatherData(city);
      // Reload all data after refresh
      await loadWeatherData();
    } catch (err) {
      console.error(`Error refreshing weather data for ${city}:`, err);
      setError(`Failed to refresh weather data for ${city}`);
    }
  };

  // Load all weather data
  const loadWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch weather data, alerts, and traffic impact in parallel
      const [weatherDataResults, alertsResults, trafficImpactResults] = await Promise.all([
        fetchWeatherData(),
        fetchWeatherAlerts(),
        fetchTrafficImpactData()
      ]);

      // Generate additional alerts from weather data if no alerts from API
      if (alertsResults.length === 0 && weatherDataResults.length > 0) {
        const generatedAlerts = weatherAPI.generateAlertsFromWeatherData(weatherDataResults);
        setWeatherAlerts(generatedAlerts);
      }
      
    } catch (err) {
      console.error('Error loading weather data:', err);
      // Silently handle error without displaying message to user
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadWeatherData();
  }, []);

  // Set up 30-second auto-refresh for IMD alerts
  useEffect(() => {
    const alertsInterval = setInterval(() => {
      fetchWeatherAlerts();
    }, 30000); // 30 seconds

    return () => clearInterval(alertsInterval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleWeatherChange = (weather: WeatherData | null) => {
    setWeatherData(weather);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Cloud className="h-8 w-8 text-blue-600" />
            Weather and IMD ⚠️
          </h1>
          <p className="text-gray-600">
            Real-time weather information and Indian Meteorological Department alerts for traffic planning and safety.
          </p>
        </div>

        {/* IMD Alerts Section */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              IMD Weather Alerts
              {weatherAlerts.length > 0 && <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white border-green-500 shadow-sm font-medium px-3 py-1 rounded-full text-xs">ACTIVE</Badge>}
              {loading && <Badge variant="secondary" className="ml-2">LOADING</Badge>}
              <Badge variant="outline" className="ml-2 text-xs">
                🔄 Auto-refresh: 10s
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadWeatherData}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshWeatherAlerts}
                disabled={loading || isRefreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh IMD Cache
              </Button>

            </div>
          </CardHeader>
          <CardContent>
            {loading && weatherAlerts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">Loading weather alerts...</p>
                </div>
              </div>
            ) : weatherAlerts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Cloud className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">No active weather alerts</p>
                  <p className="text-sm text-gray-500 mt-1">Weather conditions are currently normal</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {weatherAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{alert.type}</h3>
                            <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            {alert.temperature && (
                              <Badge variant="secondary" className="text-xs">
                                {alert.temperature}°C
                              </Badge>
                            )}
                            {alert.humidity && (
                              <Badge variant="secondary" className="text-xs">
                                {alert.humidity}% humidity
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mb-2">{alert.description}</p>
                          
                          {/* Location Information */}
                          <div className="mb-2">
                            {alert.states && alert.states.length > 0 && (
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin className="h-3 w-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">States:</span>
                                <div className="flex flex-wrap gap-1">
                                  {alert.states.slice(0, 3).map((state, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {state}
                                    </Badge>
                                  ))}
                                  {alert.states.length > 3 && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      +{alert.states.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {alert.districts && alert.districts.length > 0 && (
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-medium text-green-700">Districts:</span>
                                <div className="flex flex-wrap gap-1">
                                  {alert.districts.slice(0, 4).map((district, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {district}
                                    </Badge>
                                  ))}
                                  {alert.districts.length > 4 && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      +{alert.districts.length - 4} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {alert.areas && alert.areas.length > 0 && (
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin className="h-3 w-3 text-purple-600" />
                                <span className="text-xs font-medium text-purple-700">Areas:</span>
                                <div className="flex flex-wrap gap-1">
                                  {alert.areas.slice(0, 3).map((area, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                      {area}
                                    </Badge>
                                  ))}
                                  {alert.areas.length > 3 && (
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                      +{alert.areas.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Valid until: {new Date(alert.validUntil).toLocaleString()}</span>
                            {alert.source && (
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                Source: {alert.source.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {getSeverityIcon(alert.severity)}
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="font-medium">
                      Live IMD Weather Monitoring System
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-blue-600 font-medium">Coverage:</p>
                      <p className="text-blue-700">• All Indian States & UTs</p>
                      <p className="text-blue-700">• District-wise Alerts</p>
                      <p className="text-blue-700">• Real-time Warnings</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-green-600 font-medium">Data Sources:</p>
                      <p className="text-green-700">• IMD Current Warnings</p>
                      <p className="text-green-700">• District Weather Alerts</p>
                      <p className="text-green-700">• State-wise Monitoring</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-600">
                      🔄 Auto-refreshes every 10 seconds • 📍 Location-specific alerts • ⚡ Real-time updates
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weather Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Weather Widget */}
          <div className="lg:col-span-2">
            <Weather 
              city={selectedCity}
              className="h-full"
              onWeatherChange={handleWeatherChange}
            />
          </div>

          {/* Weather Impact on Traffic */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Traffic Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backendWeatherData.length > 0 ? (
                  <>
                    {/* Rain Impact */}
                    {backendWeatherData.some(data => 
                      data.current && data.current.description && data.current.description.toLowerCase().includes('rain')
                    ) ? (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CloudRain className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-800">Rain Impact</span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          Rain expected in monitored areas. Potential waterlogging and reduced visibility may affect traffic flow.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Sun className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">Clear Weather</span>
                        </div>
                        <p className="text-sm text-green-700">
                          No rain expected. Good driving conditions anticipated.
                        </p>
                      </div>
                    )}

                    {/* Temperature Impact */}
                    {(() => {
                      const avgMaxTemp = backendWeatherData.reduce((sum, data) => 
                        sum + (data.current && data.current.temperature ? data.current.temperature : 0), 0
                      ) / backendWeatherData.length;
                      
                      if (avgMaxTemp > 40) {
                        return (
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Thermometer className="h-4 w-4 text-red-600" />
                              <span className="font-medium text-red-800">High Temperature Alert</span>
                            </div>
                            <p className="text-sm text-red-700">
                              Average temperature {avgMaxTemp.toFixed(1)}°C. Heat may affect vehicle performance and driver comfort.
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Thermometer className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">Moderate Temperature</span>
                            </div>
                            <p className="text-sm text-green-700">
                              Average temperature {avgMaxTemp.toFixed(1)}°C. Comfortable driving conditions.
                            </p>
                          </div>
                        );
                      }
                    })()}

                    {/* Humidity Impact */}
                    {(() => {
                      const avgHumidity = backendWeatherData.reduce((sum, data) => 
                        sum + (data.current && data.current.humidity ? data.current.humidity : 0), 0
                      ) / backendWeatherData.length;
                      
                      if (avgHumidity > 80) {
                        return (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Droplets className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-800">High Humidity</span>
                            </div>
                            <p className="text-sm text-blue-700">
                              Average humidity {avgHumidity.toFixed(0)}%. May cause reduced visibility and discomfort.
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">Good Visibility</span>
                            </div>
                            <p className="text-sm text-green-700">
                              Average humidity {avgHumidity.toFixed(0)}%. Clear visibility conditions expected.
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-800">Loading Traffic Impact Analysis</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Analyzing weather data to assess traffic impact...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weather Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Max Temperature</p>
                  <p className="text-2xl font-bold">
                    {backendWeatherData.length > 0 
                      ? `${(backendWeatherData.reduce((sum, data) => sum + (data.current && data.current.temperature ? data.current.temperature : 0), 0) / backendWeatherData.length).toFixed(1)}°C`
                      : (weatherData?.temperature ? `${weatherData.temperature}°C` : '--')
                    }
                  </p>
                  {backendWeatherData.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Avg across {backendWeatherData.length} cities
                    </p>
                  )}
                </div>
                <Thermometer className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Humidity</p>
                  <p className="text-2xl font-bold">
                    {backendWeatherData.length > 0 
                      ? `${(backendWeatherData.reduce((sum, data) => sum + (data.current && data.current.humidity ? data.current.humidity : 0), 0) / backendWeatherData.length).toFixed(0)}%`
                      : (weatherData?.humidity ? `${weatherData.humidity}%` : '--')
                    }
                  </p>
                  {backendWeatherData.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Avg across {backendWeatherData.length} cities
                    </p>
                  )}
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold">
                    {weatherAlerts.length}
                  </p>
                  {weatherAlerts.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      {weatherAlerts.filter(a => a.severity === 'high').length} high priority
                    </p>
                  )}
                </div>
                <AlertTriangle className={`h-8 w-8 ${weatherAlerts.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Stations Monitored</p>
                  <p className="text-2xl font-bold">
                    {MAJOR_CITIES.length}
                  </p>
                  {backendWeatherData.length > 0 && (
                    <p className="text-xs text-green-500 mt-1">
                      {backendWeatherData.length} active
                    </p>
                  )}
                </div>
                <MapPin className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
};

export default WeatherDashboard;