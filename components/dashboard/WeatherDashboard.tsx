'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  RefreshCw,
  Snowflake,
  CloudHail,
  Waves,
  Shield,
  Target
} from 'lucide-react';

// Interface for ML IMD Warnings API response
interface MLWarning {
  type: string;
  severity: string;
  description: string;
  confidence: number;
  probability: number;
  recommendations: string[];
  valid_until: string;
}

interface MLWeatherData {
  city: string;
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  rainfall: number;
  description: string;
  timestamp: string;
}

interface MLWeatherResponse {
  success: boolean;
  data: MLWeatherData;
  warnings: MLWarning[];
  source: string;
  timestamp: string;
  cache_status: string;
}

interface ActiveWarningsResponse {
  success: boolean;
  active_warnings: Record<string, MLWarning[]>;
  cities_with_warnings: number;
  total_cities_monitored: number;
  generated_at: string;
}

// Interface for weather conditions
interface WeatherCondition {
  city: string;
  condition: string;
  severity: string;
  details: string;
  temperature: number;
  rainfall: number;
  humidity: number;
  wind_speed: number;
  pressure: number;
  timestamp: string;
}

interface WeatherConditionsResponse {
  success: boolean;
  conditions: {
    sunny: WeatherCondition[];
    partly_cloudy: WeatherCondition[];
    cloudy: WeatherCondition[];
    rainy: WeatherCondition[];
    stormy: WeatherCondition[];
    foggy: WeatherCondition[];
    snowy: WeatherCondition[];
    windy: WeatherCondition[];
    timestamp: string;
    total_cities_checked: number;
    data_source: string;
  };
  summary: {
    sunny_count: number;
    partly_cloudy_count: number;
    cloudy_count: number;
    rainy_count: number;
    stormy_count: number;
    foggy_count: number;
    snowy_count: number;
    windy_count: number;
    total_cities_checked: number;
  };
  timestamp: string;
}

// Transformed interface for the dashboard
interface WeatherAlert {
  id: string;
  text: string;
  type: string;
  severity: string;
  city: string;
  location: string;
  timestamp: string;
  validUntil: string;
  confidence: number;
  probability: number;
  recommendations: string[];
  source: string;
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
    ml_imd_warnings_api: boolean;
    indian_weather_api: boolean;
    real_time_data: boolean;
  };
  coverage: {
    total_alerts: number;
    cities_covered: number;
    active_warnings: number;
  };
}

// Helper function to get severity color classes
const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const WeatherDashboard: React.FC = () => {
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [weatherConditions, setWeatherConditions] = useState<WeatherConditionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [totalCitiesMonitored, setTotalCitiesMonitored] = useState<number>(0);
  const [citiesWithWarnings, setCitiesWithWarnings] = useState<number>(0);

  // Show IMD mock data in this dashboard without affecting other modules
  const USE_IMD_MOCK = true;
  const IMD_CYCLONE_URL = 'https://mausam.imd.gov.in/responsive/cycloneinformation.php';

  // Exact IMD mock JSON provided by the user
  const IMD_MOCK_JSON = `[
   { 
     "region": "Andaman & Nicobar Islands", 
     "status": "RED", 
     "severity": "Take Action", 
     "phenomena": "Heavy to Very Heavy Rainfall, Thunderstorm with Lightning, Gusty Winds 40-50 kmph", 
     "day1": { "alert": "Red", "description": "Heavy Rainfall, Thunderstorm" }, 
     "day2": { "alert": "Red", "description": "Very Heavy Rainfall expected, Strong Winds" }, 
     "day3": { "alert": "Red", "description": "Heavy Rainfall, Thunderstorm continues" }, 
     "precautions": [ 
       "Stay indoors; avoid low-lying, flood-prone areas.", 
       "Secure outdoor structures; do not venture during squalls.", 
       "Keep emergency supplies ready; charge devices in advance." 
     ] 
   }, 
   { 
     "region": "Tamil Nadu, Puducherry & Karaikal", 
     "status": "RED", 
     "severity": "Take Action", 
     "phenomena": "Heavy to Very Heavy Rainfall (isolated), Thunderstorm, Gusty Winds 30-40 kmph", 
     "day1": { "alert": "Red", "description": "Very Heavy Rainfall at isolated places" }, 
     "day2": { "alert": "Orange", "description": "Heavy to Very Heavy Rainfall likely" }, 
     "day3": { "alert": "Yellow", "description": "Isolated Heavy Rainfall" }, 
     "precautions": [ 
       "Drain excess water from fields; support horticultural crops against wind damage.", 
       "Avoid waterlogged areas; follow traffic advisories.", 
       "Stay alert for localized flooding and mudslides in low-lying zones." 
     ] 
   }, 
   { 
     "region": "Kerala & Mahe", 
     "status": "RED", 
     "severity": "Take Action", 
     "phenomena": "Heavy to Very Heavy Rainfall (isolated), Thunderstorm, Expected rainfall 7-11 cm", 
     "day1": { "alert": "Red", "description": "Very Heavy Rainfall at isolated places, Lightning" }, 
     "day2": { "alert": "Red", "description": "Heavy Rainfall, Thunderstorm with Lightning" }, 
     "day3": { "alert": "Orange", "description": "Heavy Rainfall, Thunderstorm continues" }, 
     "precautions": [ 
       "Ensure drainage in fields and plantations; stake vegetables to prevent lodging.", 
       "Avoid swollen water bodies; stay indoors during thunderstorms.", 
       "Keep livestock sheltered; store feed safely to prevent spoilage." 
     ] 
   }, 
   { 
     "region": "Lakshadweep", 
     "status": "ORANGE", 
     "severity": "Be Prepared", 
     "phenomena": "Heavy Rainfall (23 Nov), Thunderstorm with Lightning", 
     "day1": { "alert": "Orange", "description": "Heavy Rainfall at isolated places" }, 
     "day2": { "alert": "Orange", "description": "Thunderstorm with Lightning" }, 
     "day3": { "alert": "Yellow", "description": "Scattered Thunderstorm" }, 
     "precautions": [ 
       "Avoid sea travel and outdoor activities during thunderstorms.", 
       "Secure loose structures; monitor daily weather updates.", 
       "Expect ferry disruptions; plan alternative transport routes." 
     ] 
   }, 
   { 
     "region": "Coastal Andhra Pradesh & Yanam", 
     "status": "YELLOW", 
     "severity": "Be Aware", 
     "phenomena": "Heavy Rainfall (isolated), Thunderstorm with Lightning (23-24 Nov)", 
     "day1": { "alert": "Yellow", "description": "Heavy Rainfall at isolated places, Lightning" }, 
     "day2": { "alert": "Yellow", "description": "Heavy Rainfall, Thunderstorm" }, 
     "day3": { "alert": "Green", "description": "No significant weather" }, 
     "precautions": [ 
       "Remain alert for minor urban flooding in low-lying areas.", 
       "Avoid standing under trees; stay away from electrical equipment during storms.", 
       "Monitor IMD alerts for any warning escalation." 
     ] 
   }, 
   { 
     "region": "Bay of Bengal & Andaman Sea (Marine)", 
     "status": "RED", 
     "severity": "Take Action - Marine", 
     "phenomena": "Squally weather, Wind 40-65 kmph gusting, Rough to Very Rough Seas, Developing Cyclonic System", 
     "day1": { "alert": "Red", "description": "Squally weather; Fishermen warned" }, 
     "day2": { "alert": "Red", "description": "Strong winds 40-55 kmph; Very Rough Seas" }, 
     "day3": { "alert": "Red", "description": "Continuing squally conditions" }, 
     "precautions": [ 
       "Fishermen MUST NOT venture into Bay of Bengal & Andaman Sea.", 
       "All vessels: operate only from protected harbors; avoid open waters.", 
       "Maintain continuous radio contact with coast guard; monitor marine forecasts hourly." 
     ] 
   } 
 ]`;

  // Map phenomena text to alert type
  const mapPhenomenaToType = (p: string): string => {
    const s = (p || '').toLowerCase();
    if (s.includes('cyclone') || s.includes('cyclonic') || s.includes('squally')) return 'cyclone';
    if (s.includes('thunderstorm')) return 'thunderstorm';
    if (s.includes('rain')) return 'heavy_rain';
    if (s.includes('wind')) return 'wind';
    if (s.includes('fog')) return 'fog';
    return 'weather alert';
  };

  // Transform IMD mock JSON into WeatherAlert[]
  const transformMockIMDToAlerts = (jsonText: string): WeatherAlert[] => {
    const arr = JSON.parse(jsonText);
    const now = new Date().toISOString();
    return arr.map((item: any, idx: number) => ({
      id: `imd_mock_${idx}`,
      text: item.phenomena,
      type: mapPhenomenaToType(item.phenomena),
      severity: item.status || item.severity || 'ALERT',
      city: item.region,
      location: item.region,
      timestamp: now,
      validUntil: '',
      confidence: 0,
      probability: 0,
      recommendations: Array.isArray(item.precautions) ? item.precautions : [],
      source: 'IMD Cyclone warnings'
    }));
  };

  // Indian cities to monitor for warnings
  const indianCities = [
    'mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 
    'kolkata', 'pune', 'ahmedabad', 'jaipur', 'lucknow',
    'kanpur', 'nagpur', 'indore', 'thane', 'bhopal',
    'visakhapatnam', 'pimpri', 'patna', 'vadodara', 'ghaziabad'
  ];

  // Transform ML API response to dashboard format
  const transformMLWarning = (warning: MLWarning, city: string, timestamp: string): WeatherAlert => {
    return {
      id: `ml_warning_${city}_${warning.type}_${Date.now()}`,
      text: `${warning.description} (Confidence: ${(warning.confidence * 100).toFixed(1)}%)`,
      type: warning.type,
      severity: warning.severity,
      city: city.charAt(0).toUpperCase() + city.slice(1),
      location: city.charAt(0).toUpperCase() + city.slice(1),
      timestamp: timestamp,
      validUntil: warning.valid_until,
      confidence: warning.confidence,
      probability: warning.probability,
      recommendations: warning.recommendations,
      source: 'ML IMD Warnings API'
    };
  };

  // Fetch weather conditions when no alerts are present
  const fetchWeatherConditions = async () => {
    try {
      const response = await fetch('http://localhost:5004/weather/conditions');
      if (response.ok) {
        const data: WeatherConditionsResponse = await response.json();
        setWeatherConditions(data);
      }
    } catch (err) {
      console.warn('Failed to fetch weather conditions:', err);
    }
  };

  const fetchWeatherAlerts = async () => {
    try {
      setLoading(true);
      const allAlerts: WeatherAlert[] = [];
      
      // First, try to get active warnings from the ML server
      try {
        const activeWarningsResponse = await fetch('http://localhost:5004/warnings/active');
        if (activeWarningsResponse.ok) {
          const activeData: ActiveWarningsResponse = await activeWarningsResponse.json();
          
          if (activeData.success && activeData.active_warnings) {
            // Process active warnings
            Object.entries(activeData.active_warnings).forEach(([city, warnings]) => {
              warnings.forEach(warning => {
                const transformedAlert = transformMLWarning(warning, city, activeData.generated_at);
                allAlerts.push(transformedAlert);
              });
            });
            
            setTotalCitiesMonitored(activeData.total_cities_monitored);
            setCitiesWithWarnings(activeData.cities_with_warnings);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch active warnings, trying individual cities:', err);
      }
      
      // If no active warnings, fetch from individual cities
      if (allAlerts.length === 0) {
        const cityPromises = indianCities.slice(0, 10).map(async (city) => {
          try {
            const response = await fetch(`http://localhost:5004/weather/current?city=${city}`);
            if (response.ok) {
              const data: MLWeatherResponse = await response.json();
              if (data.success && data.warnings && data.warnings.length > 0) {
                return data.warnings.map(warning => 
                  transformMLWarning(warning, city, data.timestamp)
                );
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch warnings for ${city}:`, err);
          }
          return [];
        });
        
        const cityResults = await Promise.all(cityPromises);
        cityResults.forEach(cityWarnings => {
          allAlerts.push(...cityWarnings);
        });
        
        setTotalCitiesMonitored(indianCities.length);
        setCitiesWithWarnings(allAlerts.length > 0 ? new Set(allAlerts.map(alert => alert.city)).size : 0);
      }
      
      setWeatherAlerts(allAlerts);
      
      // If no alerts, fetch weather conditions
      if (allAlerts.length === 0) {
        await fetchWeatherConditions();
      } else {
        setWeatherConditions(null);
      }
      
      setLastUpdated(new Date().toISOString());
      setError(null);
      
    } catch (err) {
      console.error('Error fetching weather alerts:', err);
      setError('Error connecting to ML IMD Warnings service');
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    if (USE_IMD_MOCK) {
      try {
        // 5-second buffer before re-displaying the same warnings
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const alerts = transformMockIMDToAlerts(IMD_MOCK_JSON);
        setWeatherAlerts(alerts);
        setTotalCitiesMonitored(alerts.length);
        setCitiesWithWarnings(alerts.length);
        setLastUpdated(new Date().toISOString());
        setWeatherConditions(null);
        setError(null);
        setLoading(false);
      } catch (e) {
        console.error('Failed to refresh IMD mock data:', e);
      } finally {
        setRefreshing(false);
      }
      return;
    }
    // For live data, also wait 5 seconds to keep UX consistent
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await fetchWeatherAlerts();
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (USE_IMD_MOCK) {
      try {
        const alerts = transformMockIMDToAlerts(IMD_MOCK_JSON);
        setWeatherAlerts(alerts);
        setTotalCitiesMonitored(alerts.length);
        setCitiesWithWarnings(alerts.length);
        setLastUpdated(new Date().toISOString());
        setWeatherConditions(null);
        setError(null);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Failed to load IMD mock data:', e);
      }
    }
    fetchWeatherAlerts();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'red':
      case 'take action':
      case 'take action - marine':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'orange':
      case 'be prepared':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'yellow':
      case 'be aware':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
      case 'lightning':
      case 'thunder':
      case 'squall':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'heavy_rain':
      case 'very heavy rain':
      case 'extremely heavy rain':
      case 'rainfall':
        return <CloudRain className="h-4 w-4 text-blue-600" />;
      case 'rain':
      case 'shower':
      case 'drizzle':
      case 'precipitation':
        return <CloudRain className="h-4 w-4 text-blue-400" />;
      case 'cyclone':
      case 'depression':
      case 'low pressure':
      case 'tropical storm':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'heat_wave':
      case 'heat wave':
      case 'hot weather':
      case 'heat':
      case 'maximum temperature':
        return <Sun className="h-4 w-4 text-orange-500" />;
      case 'cold_wave':
      case 'cold wave':
      case 'cold weather':
      case 'minimum temperature':
      case 'severe cold':
        return <Snowflake className="h-4 w-4 text-blue-300" />;
      case 'fog':
      case 'dense fog':
      case 'very dense fog':
      case 'mist':
        return <Cloud className="h-4 w-4 text-gray-400" />;
      case 'dust_storm':
      case 'dust storm':
      case 'dust':
      case 'sand storm':
        return <Wind className="h-4 w-4 text-yellow-600" />;
      case 'wind':
      case 'strong wind':
      case 'gusty wind':
      case 'gale':
      case 'high wind':
        return <Wind className="h-4 w-4 text-gray-600" />;
      case 'hail':
      case 'hailstorm':
        return <CloudHail className="h-4 w-4 text-blue-500" />;
      case 'flood':
      case 'inundation':
      case 'water logging':
        return <Waves className="h-4 w-4 text-blue-700" />;
      case 'drought':
      case 'dry weather':
      case 'deficient rainfall':
        return <Sun className="h-4 w-4 text-red-400" />;
      case 'general':
      case 'weather alert':
      default:
        return <Cloud className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRowShade = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'red':
      case 'take action':
      case 'take action - marine':
      case 'high':
      case 'severe':
        return 'bg-red-100 border-red-300';
      case 'orange':
      case 'be prepared':
      case 'medium':
      case 'moderate':
        return 'bg-orange-100 border-orange-300';
      case 'yellow':
      case 'be aware':
      case 'low':
      case 'minor':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-blue-100 border-blue-300';
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
                  <CardTitle className="text-lg text-orange-800">ML IMD Weather Warnings</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    {weatherAlerts.length} Active
                  </Badge>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {citiesWithWarnings}/{totalCitiesMonitored} Cities
                  </Badge>
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    variant="outline"
                    size="sm"
                    className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button asChild variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100">
                    <a href={IMD_CYCLONE_URL} target="_blank" rel="noopener noreferrer">IMD Cyclone warnings</a>
                  </Button>
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
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No active weather alerts</p>
                  <p className="text-sm text-gray-500">Showing real-time weather conditions instead</p>
                </div>
                
                {/* Weather Conditions Display */}
                {weatherConditions && (
                  <div className="space-y-4">
                    {/* Weather Conditions Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        Current Weather Conditions Summary
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-yellow-600 font-bold text-lg">{weatherConditions.summary.sunny_count}</div>
                          <div className="text-gray-600">Clear Weather</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-400 font-bold text-lg">{weatherConditions.summary.partly_cloudy_count}</div>
                          <div className="text-gray-600">Partly Cloudy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600 font-bold text-lg">{weatherConditions.summary.cloudy_count}</div>
                          <div className="text-gray-600">Cloudy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-600 font-bold text-lg">{weatherConditions.summary.rainy_count}</div>
                          <div className="text-gray-600">Rainy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-600 font-bold text-lg">{weatherConditions.summary.stormy_count}</div>
                          <div className="text-gray-600">Stormy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 font-bold text-lg">{weatherConditions.summary.foggy_count}</div>
                          <div className="text-gray-600">Foggy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-300 font-bold text-lg">{weatherConditions.summary.snowy_count}</div>
                          <div className="text-gray-600">Snowy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-600 font-bold text-lg">{weatherConditions.summary.windy_count}</div>
                          <div className="text-gray-600">Windy</div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Weather Conditions */}
                    {Object.entries(weatherConditions.conditions).map(([condition, cities]) => {
                      if (condition === 'timestamp' || condition === 'total_cities_checked' || condition === 'data_source') return null;
                      if (!Array.isArray(cities) || cities.length === 0) return null;
                      
                      const getConditionIcon = (condition: string) => {
                        switch (condition) {
                          case 'sunny': return <Sun className="h-4 w-4 text-yellow-600" />;
                          case 'partly_cloudy': return <Cloud className="h-4 w-4 text-blue-400" />;
                          case 'cloudy': return <Cloud className="h-4 w-4 text-gray-600" />;
                          case 'rainy': return <CloudRain className="h-4 w-4 text-blue-600" />;
                          case 'stormy': return <CloudHail className="h-4 w-4 text-purple-600" />;
                          case 'foggy': return <Eye className="h-4 w-4 text-gray-500" />;
                          case 'snowy': return <Snowflake className="h-4 w-4 text-blue-300" />;
                          case 'windy': return <Wind className="h-4 w-4 text-green-600" />;
                          default: return <Activity className="h-4 w-4 text-gray-500" />;
                        }
                      };

                      const getConditionLabel = (condition: string) => {
                        switch (condition) {
                          case 'sunny': return 'Clear Weather';
                          case 'partly_cloudy': return 'Partly Cloudy';
                          case 'cloudy': return 'Cloudy';
                          case 'rainy': return 'Rainy';
                          case 'stormy': return 'Stormy';
                          case 'foggy': return 'Foggy';
                          case 'snowy': return 'Snowy';
                          case 'windy': return 'Windy';
                          default: return condition.replace('_', ' ');
                        }
                      };
                      
                      return (
                        <div key={condition} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                          <div className="p-4 border-b border-gray-100">
                            <h4 className="font-semibold text-gray-800 capitalize flex items-center gap-2">
                              {getConditionIcon(condition)}
                              {getConditionLabel(condition)} ({cities.length})
                            </h4>
                          </div>
                          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                            {cities.map((city: WeatherCondition, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <div className="font-medium text-gray-800">{city.city}</div>
                                    <div className="text-sm text-gray-600">{city.details}</div>
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <div className="font-medium text-gray-800">{city.temperature}°C</div>
                                  <div className="text-gray-600">{city.severity}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Weather Summary Stats */}
                    {weatherConditions.summary && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-600" />
                          Weather Summary Statistics
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-yellow-600 font-bold text-lg">{weatherConditions.summary.sunny_count}</div>
                            <div className="text-gray-600">Clear Weather</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-400 font-bold text-lg">{weatherConditions.summary.partly_cloudy_count}</div>
                            <div className="text-gray-600">Partly Cloudy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 font-bold text-lg">{weatherConditions.summary.cloudy_count}</div>
                            <div className="text-gray-600">Cloudy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-600 font-bold text-lg">{weatherConditions.summary.rainy_count}</div>
                            <div className="text-gray-600">Rainy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-purple-600 font-bold text-lg">{weatherConditions.summary.stormy_count}</div>
                            <div className="text-gray-600">Stormy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500 font-bold text-lg">{weatherConditions.summary.foggy_count}</div>
                            <div className="text-gray-600">Foggy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-300 font-bold text-lg">{weatherConditions.summary.snowy_count}</div>
                            <div className="text-gray-600">Snowy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-600 font-bold text-lg">{weatherConditions.summary.windy_count}</div>
                            <div className="text-gray-600">Windy</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                {weatherAlerts.map((alert, index) => (
                  <div key={alert.id || index} className={`rounded-lg p-4 shadow-sm border ${getRowShade(alert.severity)}`}>
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
                        {alert.location}
                      </span>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 ml-2">
                        {alert.city}
                      </Badge>
                    </div>

                    {/* Confidence and Probability removed per requirement */}

                    {/* Recommendations */}
                    {alert.recommendations && alert.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1 font-medium">Recommendations:</p>
                        <div className="space-y-1">
                          {alert.recommendations.slice(0, 3).map((recommendation, idx) => (
                            <div key={idx} className="text-xs text-gray-700 bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                              • {recommendation}
                            </div>
                          ))}
                          {alert.recommendations.length > 3 && (
                            <div className="text-xs text-gray-500 italic">
                              +{alert.recommendations.length - 3} more recommendations
                            </div>
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
                          Source: <a href={IMD_CYCLONE_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">IMD Cyclone warnings</a>
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
                  Real-Time IMD Official Weather Monitoring System
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-blue-600 font-medium">Live Data Sources:</p>
                  <p className="text-blue-700">• IMD Official Warnings Portal</p>
                  <p className="text-blue-700">• IMD Cyclone Monitoring</p>
                  <p className="text-blue-700">• IMD Rainfall Bulletins</p>
                  <p className="text-blue-700">• IMD RSS Feeds</p>
                </div>
                <div className="space-y-1">
                  <p className="text-green-600 font-medium">Coverage & Features:</p>
                  <p className="text-green-700">• All Indian States & UTs</p>
                  <p className="text-green-700">• Multi-Source Aggregation</p>
                  <p className="text-green-700">• Severity-Based Prioritization</p>
                  <p className="text-green-700">• Comprehensive Alert Types</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-600">
                  🔄 Real-time updates • 📍 Region-specific alerts • ⚡ Multi-source IMD integration • 🎯 No fallback data
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
