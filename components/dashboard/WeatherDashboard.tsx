'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  Wind, 
  Eye, 
  Thermometer, 
  Droplets, 
  Activity,
  AlertTriangle,
  MapPin,
  Clock,
  RefreshCw
} from 'lucide-react';

interface WeatherAlert {
  id: string;
  text: string;
  type: string;
  severity: string;
  areas: string[];
  states: string[];
  districts: string[];
  location: string;
  link: string;
  timestamp: string;
  source: string;
  validUntil: string;
}

interface WeatherData {
  success: boolean;
  alerts: WeatherAlert[];
  current_conditions: any[];
  forecast: any[];
  last_updated: string;
  source: string;
  website_url: string;
  data_sources: {
    india_weather_rest_api: boolean;
    weather_api_fallback: boolean;
    real_time_data: boolean;
  };
  coverage: {
    total_alerts: number;
    states_covered: number;
    districts_covered: number;
  };
}

const WeatherDashboard: React.FC = () => {
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchWeatherAlerts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/weather/imd`);
      
      if (response.ok) {
        const data: WeatherData = await response.json();
        if (data.success && data.alerts) {
          setWeatherAlerts(data.alerts);
          setLastUpdated(data.last_updated || new Date().toISOString());
          setError(null);
        } else {
          setError('No weather alerts available');
        }
      } else {
        setError('Failed to fetch weather alerts');
      }
    } catch (err) {
      console.error('Error fetching weather alerts:', err);
      setError('Error connecting to weather service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherAlerts();
  }, []);

  // Set up 30-second auto-refresh for weather alerts
  useEffect(() => {
    const alertsInterval = setInterval(() => {
      fetchWeatherAlerts();
    }, 30000); // 30 seconds

    return () => clearInterval(alertsInterval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'severe':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
      case 'minor':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'thunderstorm':
        return <AlertTriangle className="h-4 w-4" />;
      case 'heavy_rain':
      case 'rain':
        return <CloudRain className="h-4 w-4" />;
      case 'heat_wave':
      case 'heat':
        return <Sun className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* IMD Weather Alerts */}
        <Card className="bg-gradient-to-br from-orange-50 to-red-100 border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg text-orange-800">IMD Weather Alerts</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  {weatherAlerts.length} Active
                </Badge>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  Auto-refresh: 30s
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-orange-600" />
                <span className="ml-2 text-orange-700">Loading weather alerts...</span>
              </div>
            ) : error ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            ) : weatherAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No active weather alerts</p>
                <p className="text-sm text-gray-500">All clear for now</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                {weatherAlerts.map((alert, index) => (
                  <div key={alert.id || index} className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                    {/* Alert Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(alert.type)}
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity?.toUpperCase() || 'ALERT'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {alert.type?.replace('_', ' ').toUpperCase() || 'WEATHER'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Alert Text */}
                    <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                      {alert.text}
                    </p>

                    {/* Location Information */}
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600 font-medium">
                        {alert.location || 'Multiple Locations'}
                      </span>
                    </div>

                    {/* States */}
                    {alert.states && alert.states.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">States/UTs:</p>
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

                    {/* Districts */}
                    {alert.districts && alert.districts.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Districts:</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.districts.slice(0, 3).map((district, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                              {district}
                            </Badge>
                          ))}
                          {alert.districts.length > 3 && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                              +{alert.districts.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Areas */}
                    {alert.areas && alert.areas.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Areas:</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.areas.slice(0, 3).map((area, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {area.length > 20 ? `${area.substring(0, 20)}...` : area}
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

                    {/* Valid Until and Source */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                          Valid until: {alert.validUntil ? new Date(alert.validUntil).toLocaleString() : 'N/A'}
                        </span>
                        <span className="text-blue-600">
                          Source: {alert.source || 'IMD'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  🔄 Auto-refreshes every 30 seconds • 📍 Location-specific alerts • ⚡ Real-time updates
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeatherDashboard;