'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Phone,
  Navigation,
  Calendar,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Eye,
  Car,
  Truck,
  Bike,
  User,
  Gauge,
  Send,
  RefreshCw,
  TrendingUp,
  Activity,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PredictionData {
  policeAttendance: string;
  driverAge: string;
  vehicleType: string;
  vehicleAge: string;
  engineCC: string;
  dayOfWeek: string;
  weather: string;
  lightConditions: string;
  roadSurface: string;
  gender: string;
  speedLimit: string;
  latitude: string;
  longitude: string;
}

interface PredictionResult {
  severity: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

const IncidentPredictionDashboard: React.FC = () => {
  const [formData, setFormData] = useState<PredictionData>({
    policeAttendance: '1',
    driverAge: '34',
    vehicleType: '9',
    vehicleAge: '10',
    engineCC: '1500',
    dayOfWeek: '1',
    weather: '1',
    lightConditions: '1',
    roadSurface: '1',
    gender: '1',
    speedLimit: '30',
    latitude: '55.0',
    longitude: '-121.0'
  });

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [recentPredictions, setRecentPredictions] = useState<PredictionResult[]>([]);
  const [stats, setStats] = useState({
    totalPredictions: 0,
    highRiskIncidents: 0,
    averageAccuracy: 95.7,
    responseTime: 245
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  // Vehicle type options
  const vehicleTypes = [
    { value: '1', label: 'Pedal cycle' },
    { value: '2', label: 'Motorcycle 50cc and under' },
    { value: '3', label: 'Motorcycle 125cc and under' },
    { value: '4', label: 'Motorcycle over 125cc and up to 500cc' },
    { value: '5', label: 'Motorcycle over 500cc' },
    { value: '8', label: 'Taxi/Private hire car' },
    { value: '9', label: 'Car' },
    { value: '10', label: 'Minibus (8 - 16 passenger seats)' },
    { value: '11', label: 'Bus or coach (17 or more pass seats)' },
    { value: '18', label: 'Tram' },
    { value: '20', label: 'Truck (Goods)' },
    { value: '23', label: 'Electric motorcycle' }
  ];

  // Weather conditions
  const weatherConditions = [
    { value: '1', label: 'Fine no high winds', icon: Sun },
    { value: '2', label: 'Raining no high winds', icon: CloudRain },
    { value: '3', label: 'Snowing no high winds', icon: CloudSnow },
    { value: '4', label: 'Fine + high winds', icon: Wind },
    { value: '5', label: 'Raining + high winds', icon: CloudRain },
    { value: '6', label: 'Snowing + high winds', icon: CloudSnow },
    { value: '7', label: 'Fog or mist', icon: Cloud }
  ];

  // Light conditions
  const lightConditions = [
    { value: '1', label: 'Daylight' },
    { value: '4', label: 'Darkness - lights lit' },
    { value: '5', label: 'Darkness - lights unlit' },
    { value: '6', label: 'Darkness - no lighting' }
  ];

  // Road surface conditions
  const roadSurfaceConditions = [
    { value: '1', label: 'Dry' },
    { value: '2', label: 'Wet or damp' },
    { value: '3', label: 'Snow' },
    { value: '4', label: 'Frost or Ice' },
    { value: '5', label: 'Flood' },
    { value: '7', label: 'Mud' }
  ];

  // Days of week
  const daysOfWeek = [
    { value: '1', label: 'Sunday' },
    { value: '2', label: 'Monday' },
    { value: '3', label: 'Tuesday' },
    { value: '4', label: 'Wednesday' },
    { value: '5', label: 'Thursday' },
    { value: '6', label: 'Friday' },
    { value: '7', label: 'Saturday' }
  ];

  // Get current location and weather data
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          setFormData(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lon.toString()
          }));

          // Get weather data
          try {
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&APPID=dc0d323b4933f0c038f261425b17038e`
            );
            const weatherData = await response.json();
            
            // Update weather conditions based on API response
            let weatherValue = '1';
            let roadSurfaceValue = '1';
            
            if (weatherData.weather[0].main === 'Mist') {
              weatherValue = '7';
            } else if (weatherData.weather[0].main === 'Clear') {
              weatherValue = '1';
              roadSurfaceValue = '1';
            } else if (weatherData.weather[0].main === 'Rain') {
              weatherValue = '2';
              roadSurfaceValue = '2';
            } else if (weatherData.weather[0].main === 'Snow') {
              weatherValue = '3';
              roadSurfaceValue = '3';
            } else if (weatherData.weather[0].main === 'Clouds') {
              weatherValue = '4';
              roadSurfaceValue = '7';
            }

            // Update light conditions based on time
            const currentHour = new Date().getHours();
            const lightValue = (currentHour >= 19 || currentHour <= 6) ? '4' : '1';
            
            // Update day of week
            const dayValue = (new Date().getDay() + 1).toString();

            setFormData(prev => ({
              ...prev,
              weather: weatherValue,
              roadSurface: roadSurfaceValue,
              lightConditions: lightValue,
              dayOfWeek: dayValue
            }));
          } catch (error) {
            console.error('Error fetching weather data:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Load recent predictions from API
   const loadRecentPredictions = async () => {
     try {
       const response = await axios.get(`${API_BASE_URL}/api/incidents/history?limit=5`);
       setRecentPredictions(response.data);
     } catch (error) {
       console.error('Error loading recent predictions:', error);
       // Set mock data as fallback
       setRecentPredictions([]);
     }
   };

  // Load stats from API
   const loadStats = async () => {
     setStatsLoading(true);
     try {
       const response = await axios.get(`${API_BASE_URL}/api/incidents/stats`);
       setStats(response.data);
     } catch (error) {
       console.error('Error loading stats:', error);
       // Keep existing mock stats as fallback
     } finally {
       setStatsLoading(false);
     }
   };

  // Predict incident severity
  const predictIncident = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/incidents/predict`, formData);
      const result: PredictionResult = {
        severity: response.data.severity,
        confidence: response.data.confidence,
        riskLevel: response.data.risk_level,
        timestamp: new Date().toISOString()
      };

      setPrediction(result);
      
      // Reload recent predictions and stats
      await loadRecentPredictions();
      await loadStats();

      // Send SMS for severe incidents
      if (result.severity >= 2) {
        try {
          await axios.post(`${API_BASE_URL}/api/incidents/sms`, {
             phoneNumber: '+1234567890', // Default or from user settings
             severity: result.severity,
             confidence: result.confidence,
             location: {
               latitude: parseFloat(formData.latitude),
               longitude: parseFloat(formData.longitude)
             }
           });
          console.log('SMS alert sent for severe incident');
        } catch (smsError) {
          console.error('Error sending SMS:', smsError);
        }
      }
    } catch (error) {
      console.error('Error predicting incident:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'text-green-600 bg-green-50 border-green-200';
      case 2: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 3: return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case 1: return 'SLIGHT';
      case 2: return 'SERIOUS';
      case 3: return 'FATAL';
      default: return 'UNKNOWN';
    }
  };

  useEffect(() => {
    // Load recent predictions and stats on component mount
    loadRecentPredictions();
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              Incident Prediction
            </h1>
            <p className="text-gray-600 mt-1">AI-powered road accident severity prediction and classification</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isGettingLocation ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              Get Location
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Predictions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPredictions}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Risk Incidents</p>
                  <p className="text-2xl font-bold text-red-600">{stats.highRiskIncidents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Model Accuracy</p>
                  <p className="text-2xl font-bold text-green-600">{stats.averageAccuracy}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.responseTime}ms</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prediction Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Incident Prediction Form
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="conditions">Conditions</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="policeAttendance">Police Officer Attendance</Label>
                        <Select value={formData.policeAttendance} onValueChange={(value) => setFormData(prev => ({ ...prev, policeAttendance: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Yes</SelectItem>
                            <SelectItem value="0">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="driverAge">Driver Age</Label>
                        <Input
                          id="driverAge"
                          type="number"
                          value={formData.driverAge}
                          onChange={(e) => setFormData(prev => ({ ...prev, driverAge: e.target.value }))}
                          placeholder="Enter driver age"
                        />
                      </div>

                      <div>
                        <Label htmlFor="vehicleType">Vehicle Type</Label>
                        <Select value={formData.vehicleType} onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicleTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="vehicleAge">Vehicle Age (years)</Label>
                        <Input
                          id="vehicleAge"
                          type="number"
                          value={formData.vehicleAge}
                          onChange={(e) => setFormData(prev => ({ ...prev, vehicleAge: e.target.value }))}
                          placeholder="Enter vehicle age"
                        />
                      </div>

                      <div>
                        <Label htmlFor="engineCC">Engine Capacity (CC)</Label>
                        <Input
                          id="engineCC"
                          type="number"
                          value={formData.engineCC}
                          onChange={(e) => setFormData(prev => ({ ...prev, engineCC: e.target.value }))}
                          placeholder="Enter engine capacity"
                        />
                      </div>

                      <div>
                        <Label htmlFor="gender">Driver Gender</Label>
                        <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Male</SelectItem>
                            <SelectItem value="2">Female</SelectItem>
                            <SelectItem value="3">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="conditions" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dayOfWeek">Day of Week</Label>
                        <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {daysOfWeek.map((day) => (
                              <SelectItem key={day.value} value={day.value}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="weather">Weather Conditions</Label>
                        <Select value={formData.weather} onValueChange={(value) => setFormData(prev => ({ ...prev, weather: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {weatherConditions.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>
                                {condition.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="lightConditions">Light Conditions</Label>
                        <Select value={formData.lightConditions} onValueChange={(value) => setFormData(prev => ({ ...prev, lightConditions: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {lightConditions.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>
                                {condition.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="roadSurface">Road Surface</Label>
                        <Select value={formData.roadSurface} onValueChange={(value) => setFormData(prev => ({ ...prev, roadSurface: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roadSurfaceConditions.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>
                                {condition.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="speedLimit">Speed Limit (mph)</Label>
                        <Input
                          id="speedLimit"
                          type="number"
                          value={formData.speedLimit}
                          onChange={(e) => setFormData(prev => ({ ...prev, speedLimit: e.target.value }))}
                          placeholder="Enter speed limit"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="location" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                          placeholder="Enter latitude"
                        />
                      </div>

                      <div>
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          value={formData.longitude}
                          onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                          placeholder="Enter longitude"
                        />
                      </div>
                    </div>

                    <Alert>
                      <MapPin className="h-4 w-4" />
                      <AlertDescription>
                        Click "Get Location" to automatically fill coordinates and update weather conditions based on your current location.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={predictIncident}
                    disabled={isLoading}
                    className="flex-1 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                    {isLoading ? 'Predicting...' : 'Predict Incident'}
                  </Button>
                  
                  {prediction && prediction.severity >= 2 && (
                    <Button variant="outline" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Send SMS Alert
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Current Prediction */}
            {prediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Prediction Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold border-2 ${getSeverityColor(prediction.severity)}`}>
                        {getSeverityLabel(prediction.severity)}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Severity Level: {prediction.severity}/3
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Confidence:</span>
                        <span className="text-sm font-medium">{(prediction.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Risk Level:</span>
                        <Badge variant={prediction.riskLevel === 'HIGH' ? 'destructive' : prediction.riskLevel === 'MEDIUM' ? 'default' : 'secondary'}>
                          {prediction.riskLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Timestamp:</span>
                        <span className="text-sm font-medium">
                          {new Date(prediction.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    {prediction.severity >= 2 && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          High risk incident detected! Emergency services should be notified.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Severity Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Severity Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <p className="font-medium text-green-700">1 = SLIGHT</p>
                      <p className="text-xs text-gray-600">Minor injuries, no fatalities</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div>
                      <p className="font-medium text-yellow-700">2 = SERIOUS</p>
                      <p className="text-xs text-gray-600">Severe injuries, hospitalization required</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div>
                      <p className="font-medium text-red-700">3 = FATAL</p>
                      <p className="text-xs text-gray-600">Life-threatening or fatal injuries</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Predictions */}
            {recentPredictions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Predictions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentPredictions.map((pred, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={pred.riskLevel === 'HIGH' ? 'destructive' : pred.riskLevel === 'MEDIUM' ? 'default' : 'secondary'}>
                            {getSeverityLabel(pred.severity)}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(pred.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {(pred.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentPredictionDashboard;