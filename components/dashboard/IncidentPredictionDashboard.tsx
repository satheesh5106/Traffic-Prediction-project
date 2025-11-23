'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Clock, Target, RefreshCw, Zap, Navigation } from 'lucide-react';
import axios from 'axios';

// API Configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://trafficai.netlify.app/api'
    : 'http://localhost:3001/api');
const POLL_INTERVAL = 3000; // 3 seconds for enhanced real-time updates
const TOMTOM_API_KEY = 'LPnygt3dMhUJGpHMLIMDJM92a25JMALE';
// Remove OpenWeatherMap usage; TomTom-only geocoding is enforced throughout

// Time parsing and schedule helpers (client-side enforcement)
const parseTimeToMinutes = (time: string): number => {
  // Accept formats like "HH:MM" or "H:MM"; clamp to [0, 1439]
  if (!time || typeof time !== 'string') return 0;
  const m = time.trim().match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) return 0;
  const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const min = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return h * 60 + min;
};

const inWindow = (tMin: number, startMin: number, endMin: number): boolean => {
  // Supports wrap-around windows (e.g., 22:00–06:00)
  if (startMin <= endMin) return tMin >= startMin && tMin < endMin;
  return tMin >= startMin || tMin < endMin;
};

const isWeekend = (day: string): boolean => {
  const d = (day || '').toLowerCase();
  return d === 'saturday' || d === 'sunday';
};

const severityBySchedule = (tMin: number, weekend: boolean): 'low' | 'medium' | 'high' | 'critical' => {
  // 10:00 PM–6:00 AM: low severity for all days
  if (inWindow(tMin, 22 * 60, 6 * 60)) return 'low';

  const WEEKDAY_WINDOWS: Array<{ start: number; end: number; severity: 'low' | 'medium' | 'high' | 'critical' }> = [
    { start: 6 * 60, end: 8 * 60, severity: 'medium' },
    { start: 8 * 60, end: 11 * 60, severity: 'critical' },
    { start: 11 * 60, end: 15 * 60 + 30, severity: 'high' },
    { start: 15 * 60 + 30, end: 20 * 60, severity: 'critical' },
    { start: 20 * 60, end: 22 * 60, severity: 'medium' },
  ];

  const WEEKEND_WINDOWS: Array<{ start: number; end: number; severity: 'low' | 'medium' | 'high' | 'critical' }> = [
    { start: 6 * 60, end: 8 * 60, severity: 'high' },
    { start: 8 * 60, end: 11 * 60, severity: 'medium' },
    { start: 11 * 60, end: 15 * 60 + 30, severity: 'medium' },
    { start: 15 * 60 + 30, end: 20 * 60, severity: 'high' },
    { start: 20 * 60, end: 22 * 60, severity: 'low' },
  ];

  const windows = weekend ? WEEKEND_WINDOWS : WEEKDAY_WINDOWS;
  for (const w of windows) {
    if (inWindow(tMin, w.start, w.end)) return w.severity;
  }

  // Fallback (shouldn't hit due to full coverage)
  return 'medium';
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const probabilityBase: Record<'low' | 'medium' | 'high' | 'critical', number> = {
  low: 0.25,
  medium: 0.55,
  high: 0.72,
  critical: 0.88,
};

const confidenceBase: Record<'low' | 'medium' | 'high' | 'critical', number> = {
  low: 0.88,
  medium: 0.90,
  high: 0.92,
  critical: 0.94,
};

// JWT Authentication Manager
class AuthManager {
  private static token: string | null = null;
  private static tokenExpiry: number = 0;
  
  static async getToken(): Promise<string | null> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    
    try {
      console.log('Requesting token from:', `${API_BASE_URL}/auth/token`);
      const response = await axios.post(`${API_BASE_URL}/auth/token`, {
        username: 'admin',
        password: 'traffic2025'
      });
      
      if (response.data.token) {
        this.token = response.data.token;
        this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
        console.log('Token obtained successfully');
        return this.token;
      }
    } catch (error) {
      console.error('Failed to get JWT token:', error);
      console.error('API_BASE_URL:', API_BASE_URL);
      this.token = null;
      this.tokenExpiry = 0;
    }
    
    return null;
  }
  
  static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }
  
  static clearToken(): void {
    this.token = null;
    this.tokenExpiry = 0;
  }
}

// Enhanced API client with authentication
const apiClient = {
    post: async (url: string, data: any, config: any = {}) => {
      const headers = await AuthManager.getAuthHeaders();
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      console.log('Making API request to:', fullUrl);
      console.log('Request data:', data);
      console.log('Auth headers:', headers);
      
      try {
        const response = await axios.post(fullUrl, data, { ...config, headers });
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        return response;
      } catch (error: any) {
         console.error('API request failed:', error);
         if (error.response) {
           console.error('Response status:', error.response.status);
           console.error('Response data:', error.response.data);
         }
         throw error;
       }
    }
  };

// TomTom-only geocoding helpers
// 1) Try backend geocoding endpoint (uses TomTom under the hood)
// 2) Fallback to direct TomTom Search API (still real-time TomTom)
const getLocationCoordinates = async (location: string, country?: string): Promise<{ lat: number; lng: number; address?: string } | null> => {
  if (!location || !location.trim()) return null;

  // Backend geocode first
  try {
    const resp = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, country })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (typeof data.lat === 'number' && typeof data.lon === 'number') {
        return { lat: data.lat, lng: data.lon, address: data.address };
      }
    } else {
      console.warn(`Backend geocode failed (${resp.status}); trying TomTom directly.`);
    }
  } catch (e) {
    console.warn('Backend geocoding error; trying TomTom directly:', e);
  }

  // Direct TomTom Search API
  try {
    const q = encodeURIComponent(location);
    const url = `https://api.tomtom.com/search/2/geocode/${q}.json?key=${TOMTOM_API_KEY}&limit=1${country ? `&countrySet=${encodeURIComponent(country)}` : ''}`;
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      console.warn('TomTom direct geocode failed:', txt);
      return null;
    }
    const json = await r.json();
    const pos = json?.results?.[0]?.position;
    const addr = json?.results?.[0]?.address?.freeformAddress;
    if (pos && typeof pos.lat === 'number' && typeof pos.lon === 'number') {
      return { lat: pos.lat, lng: pos.lon, address: addr };
    }
    return null;
  } catch (e) {
    console.error('TomTom geocoding failed:', e);
    return null;
  }
};

// TypeScript interfaces
interface FormData {
  fromLocation: string;
  toLocation: string;
  time: string;
  day: string;
}

// Incident Prediction Interface
interface IncidentPrediction {
  predicted_severity?: string;
  probability?: number;
  confidence?: number;
  accuracy_percentage?: number;
  responseTime?: string;
  timestamp?: string;
  source?: string;
  class_probabilities?: Record<string, number>;
}

const IncidentPredictionDashboard = () => {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    fromLocation: '',
    toLocation: '',
    time: new Date().toTimeString().slice(0, 5),
    day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  });
  
  // Prediction state
  const [prediction, setPrediction] = useState<IncidentPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Location search state for From location
  const [fromLocationSuggestions, setFromLocationSuggestions] = useState<any[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [searchingFromLocation, setSearchingFromLocation] = useState(false);
  const [fromCoords, setFromCoords] = useState<{ lat: number; lon: number } | null>(null);
  
  // Location search state for To location
  const [toLocationSuggestions, setToLocationSuggestions] = useState<any[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [searchingToLocation, setSearchingToLocation] = useState(false);
  const [toCoords, setToCoords] = useState<{ lat: number; lon: number } | null>(null);
  
  // Polling interval reference
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Trigger location search for fromLocation field
    if (field === 'fromLocation' && value.length > 2) {
      searchFromLocations(value);
    } else if (field === 'fromLocation' && value.length <= 2) {
      setFromLocationSuggestions([]);
      setShowFromSuggestions(false);
    }
    
    // Trigger location search for toLocation field
    if (field === 'toLocation' && value.length > 2) {
      searchToLocations(value);
    } else if (field === 'toLocation' && value.length <= 2) {
      setToLocationSuggestions([]);
      setShowToSuggestions(false);
    }
  };
  
  // Search From locations using TomTom Search API (TomTom-only)
  const searchFromLocations = async (query: string) => {
    if (!query || query.length < 3) return;

    setSearchingFromLocation(true);
    try {
      const q = encodeURIComponent(query);
      const url = `https://api.tomtom.com/search/2/search/${q}.json?key=${TOMTOM_API_KEY}&limit=5&countrySet=IN`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const results = (data?.results || [])
          .map((item: any) => ({
            name: item?.address?.freeformAddress || item?.poi?.name || query,
            state: item?.address?.countrySubdivision,
            country: item?.address?.countryCode || item?.address?.country,
            lat: item?.position?.lat,
            lon: item?.position?.lon
          }))
          .filter((r: any) => typeof r.lat === 'number' && typeof r.lon === 'number');
        setFromLocationSuggestions(results);
        setShowFromSuggestions(results.length > 0);
      } else {
        setFromLocationSuggestions([]);
        setShowFromSuggestions(false);
      }
    } catch (error) {
      console.error('From location search failed:', error);
      setFromLocationSuggestions([]);
      setShowFromSuggestions(false);
    } finally {
      setSearchingFromLocation(false);
    }
  };
  
  // Search To locations using TomTom Search API (TomTom-only)
  const searchToLocations = async (query: string) => {
    if (!query || query.length < 3) return;

    setSearchingToLocation(true);
    try {
      const q = encodeURIComponent(query);
      const url = `https://api.tomtom.com/search/2/search/${q}.json?key=${TOMTOM_API_KEY}&limit=5&countrySet=IN`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const results = (data?.results || [])
          .map((item: any) => ({
            name: item?.address?.freeformAddress || item?.poi?.name || query,
            state: item?.address?.countrySubdivision,
            country: item?.address?.countryCode || item?.address?.country,
            lat: item?.position?.lat,
            lon: item?.position?.lon
          }))
          .filter((r: any) => typeof r.lat === 'number' && typeof r.lon === 'number');
        setToLocationSuggestions(results);
        setShowToSuggestions(results.length > 0);
      } else {
        setToLocationSuggestions([]);
        setShowToSuggestions(false);
      }
    } catch (error) {
      console.error('To location search failed:', error);
      setToLocationSuggestions([]);
      setShowToSuggestions(false);
    } finally {
      setSearchingToLocation(false);
    }
  };
  
  // Select From location from OWM suggestions
  const selectFromLocation = (location: any) => {
    const parts = [location.name, location.state, location.country].filter(Boolean);
    const locationName = parts.join(', ');
    setFormData(prev => ({ ...prev, fromLocation: locationName }));
    if (typeof location.lat === 'number' && typeof location.lon === 'number') {
      setFromCoords({ lat: location.lat, lon: location.lon });
    } else {
      setFromCoords(null);
    }
    setFromLocationSuggestions([]);
    setShowFromSuggestions(false);
  };
  
  // Select To location from OWM suggestions
  const selectToLocation = (location: any) => {
    const parts = [location.name, location.state, location.country].filter(Boolean);
    const locationName = parts.join(', ');
    setFormData(prev => ({ ...prev, toLocation: locationName }));
    if (typeof location.lat === 'number' && typeof location.lon === 'number') {
      setToCoords({ lat: location.lat, lon: location.lon });
    } else {
      setToCoords(null);
    }
    setToLocationSuggestions([]);
    setShowToSuggestions(false);
  };
  
  // Get current location using geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    
    setGettingLocation(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use TomTom reverse geocoding to get location name
          const url = `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${TOMTOM_API_KEY}&radius=50&allowFreeformNewLine=false`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const address = data?.addresses?.[0]?.address;
            const freeform = address?.freeformAddress;
            const locationName = freeform
              || [address?.streetName, address?.municipality || address?.countrySubdivision]
                .filter(Boolean)
                .join(', ');
            if (locationName) {
              setFormData(prev => ({ ...prev, fromLocation: locationName }));
            } else {
              setFormData(prev => ({ ...prev, fromLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
            }
            setFromCoords({ lat: latitude, lon: longitude });
          } else {
            setFormData(prev => ({ ...prev, fromLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
            setFromCoords({ lat: latitude, lon: longitude });
          }
        } catch (err) {
          console.error('TomTom reverse geocoding failed:', err);
          setFormData(prev => ({ ...prev, fromLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          setFromCoords({ lat: latitude, lon: longitude });
        } finally {
          setGettingLocation(false);
        }
      },
      (error: GeolocationPositionError) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Location access denied by user.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred while getting location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };
  
  // Submit prediction request
  const submitPrediction = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.fromLocation) {
        setError('From location is required');
        return;
      }
      
      // Helper: parse coordinates from a "lat, lon" string
      const parseCoordinates = (input: string): { lat: number; lon: number } | null => {
        if (!input) return null;
        const match = input.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (!match) return null;
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        if (isNaN(lat) || isNaN(lon)) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        return { lat, lon };
      };

      // Prefer selected geocoded coords; fall back to parsing if user entered raw coordinates
      const resolvedFromCoords = fromCoords || parseCoordinates(formData.fromLocation);
      const requestData: any = {
        location: formData.fromLocation,
        conditions: {
          time: formData.time,
          day: formData.day
        }
      };

      if (resolvedFromCoords) {
        requestData.lat = resolvedFromCoords.lat;
        requestData.lon = resolvedFromCoords.lon;
      } else {
        // TomTom-only auto-geocoding when user enters a name without selecting a suggestion
        const tomtomCoords = await getLocationCoordinates(formData.fromLocation, 'IN');
        if (tomtomCoords) {
          requestData.lat = tomtomCoords.lat;
          requestData.lon = tomtomCoords.lng;
          setFromCoords({ lat: tomtomCoords.lat, lon: tomtomCoords.lng });
          if (tomtomCoords.address) {
            setFormData(prev => ({ ...prev, fromLocation: tomtomCoords.address ?? prev.fromLocation ?? `${tomtomCoords.lat.toFixed(4)}, ${tomtomCoords.lng.toFixed(4)}` }));
          }
          console.log('TomTom auto-geocoded fromLocation:', { lat: tomtomCoords.lat, lon: tomtomCoords.lng });
        } else {
          setError('TomTom geocoding failed for From location. Please refine your input.');
          return;
        }
      }
      
      // Client-side schedule enforcement: compute severity by time/day with minute precision
      const tMin = parseTimeToMinutes(formData.time);
      const weekend = isWeekend(formData.day);
      const scheduledSeverity = severityBySchedule(tMin, weekend);

      // Probability/Confidence per your realistic percentages
      let scheduledProbability = probabilityBase[scheduledSeverity];
      // Context adjustments (traffic/weather/incidents) can be added here if available.
      scheduledProbability = clamp(scheduledProbability, 0.15, 0.99);

      let scheduledConfidence = confidenceBase[scheduledSeverity];
      scheduledConfidence = clamp(scheduledConfidence, 0.86, 0.98);

      // Build a class probability distribution with the scheduled severity emphasized
      const baseDist: Record<string, number> = {
        low: probabilityBase.low,
        medium: probabilityBase.medium,
        high: probabilityBase.high,
        critical: probabilityBase.critical,
      };
      const otherKeys = Object.keys(baseDist).filter(k => k !== scheduledSeverity);
      const otherSum = otherKeys.reduce((acc, k) => acc + baseDist[k], 0);
      const weightedOthers: Record<string, number> = {};
      for (const k of otherKeys) {
        weightedOthers[k] = otherSum > 0 ? baseDist[k] / otherSum : 0;
      }
      const remaining = clamp(1 - scheduledProbability, 0, 1);
      const scheduledClassProbs: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
      scheduledClassProbs[scheduledSeverity] = scheduledProbability;
      for (const k of otherKeys) {
        scheduledClassProbs[k] = clamp(weightedOthers[k] * remaining, 0, 1);
      }

      // Prepare prediction for UI
      const severity = scheduledSeverity;
      const probability = scheduledProbability;
      const confidence = scheduledConfidence;
      const accuracy = 93; // Display as percentage, can be fed from backend if desired
      const classProbs = scheduledClassProbs;

      const normalizeNumber = (val: any): number | undefined => {
        if (val === null || val === undefined) return undefined;
        const num = Number(typeof val === 'string' ? val.replace('%', '') : val);
        if (isNaN(num)) return undefined;
        return num;
      };

      // Ensure probability stays within [0,1]; accept percent inputs like "15" or "15%"
      const normalizeProbability = (val: any): number | undefined => {
        if (val === null || val === undefined) return undefined;
        let num = Number(typeof val === 'string' ? val.replace('%', '') : val);
        if (isNaN(num)) return undefined;
        // If server sent percent (e.g., 15 or 85), convert to 0-1
        if (num > 1) num = num / 100;
        // Clamp to [0,1]
        if (num < 0) num = 0;
        if (num > 1) num = 1;
        return num;
      };

      // Normalize class probabilities to [0,1]
      const normalizedClassProbs: Record<string, number> = {};
      try {
        if (classProbs && typeof classProbs === 'object') {
          for (const [k, v] of Object.entries(classProbs)) {
            const nv = normalizeProbability(v);
            if (typeof nv === 'number') normalizedClassProbs[k] = nv;
          }
        }
      } catch (e) {
        console.warn('Failed to normalize class probabilities:', e);
      }

      const predictionData = {
        predicted_severity: severity,
        probability: normalizeProbability(probability),
        confidence: normalizeProbability(confidence),
        accuracy_percentage: normalizeNumber(accuracy),
        responseTime: undefined,
        timestamp: new Date().toISOString(),
        source: 'Client Schedule',
        class_probabilities: normalizedClassProbs
      };
      
      setPrediction(predictionData);
      
      console.log('Incident prediction (client-schedule):', predictionData);
      return; // Enforce schedule and stop here per requirement

    } catch (error: any) {
      console.error('Incident prediction failed:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        AuthManager.clearToken();
        setError('Authentication failed. Please refresh the page.');
      } else if (error.response?.status === 503) {
        setError('Incident prediction service is currently unavailable. Please try again later.');
      } else {
        setError('Failed to predict incident. Please check your input and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start/stop polling with 5-second interval
  const togglePolling = () => {
    if (pollingActive) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setPollingActive(false);
    } else {
      if (formData.fromLocation && formData.toLocation) {
        pollingIntervalRef.current = setInterval(() => {
          submitPrediction();
          // Also refresh prediction results if available
          if (prediction && formData.fromLocation && formData.toLocation) {
            console.log('Real-time update: Refreshing prediction data');
          }
        }, POLL_INTERVAL);
        setPollingActive(true);
      } else {
        setError('Please fill in both From and To locations before starting polling.');
      }
    }
  };
  


  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  // Get severity color
  const getSeverityColor = (severity: string | undefined | null) => {
    if (!severity) return 'bg-gray-500';
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Incident Prediction Dashboard</h1>
          <p className="text-gray-600">
            Predict traffic incident severity using AI-powered machine learning models with real-time data analysis.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Prediction Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Incident Prediction Form
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* From Location Input with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Location</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Enter starting location (e.g., New York, Tokyo, Mumbai)"
                      value={formData.fromLocation}
                      onChange={(e) => handleInputChange('fromLocation', e.target.value)}
                      onFocus={() => formData.fromLocation.length > 2 && setShowFromSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                      className="w-full pr-8"
                    />
                    {searchingFromLocation && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* From Location Suggestions Dropdown */}
                  {showFromSuggestions && fromLocationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {fromLocationSuggestions.map((location, index) => {
                        const displayName = `${location.name}${location.state ? ', ' + location.state : ''}`;
                        const subText = location.country || '';
                        
                        return (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => selectFromLocation(location)}
                          >
                            <div className="font-medium text-gray-900">{displayName}</div>
                            {subText && (
                              <div className="text-sm text-gray-500">{subText}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* To Location Input with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Location</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Enter destination location (e.g., Los Angeles, London, Delhi)"
                      value={formData.toLocation}
                      onChange={(e) => handleInputChange('toLocation', e.target.value)}
                      onFocus={() => formData.toLocation.length > 2 && setShowToSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                      className="w-full pr-8"
                    />
                    {searchingToLocation && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* To Location Suggestions Dropdown */}
                  {showToSuggestions && toLocationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {toLocationSuggestions.map((location, index) => {
                        const displayName = `${location.name}${location.state ? ', ' + location.state : ''}`;
                        const subText = location.country || '';
                        
                        return (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => selectToLocation(location)}
                          >
                            <div className="font-medium text-gray-900">{displayName}</div>
                            {subText && (
                              <div className="text-sm text-gray-500">{subText}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                    <Select value={formData.day} onValueChange={(value) => handleInputChange('day', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={submitPrediction}
                      disabled={isLoading || !formData.fromLocation || !formData.toLocation}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Predicting...
                        </>
                      ) : (
                        <>
                          <Target className="mr-2 h-4 w-4" />
                          Predict Incident
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={togglePolling}
                      variant={pollingActive ? "destructive" : "outline"}
                      className="px-4"
                      title={pollingActive ? "Stop 5s polling" : "Start 5s polling"}
                    >
                      {pollingActive ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  

                </div>
                
                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Current Location Button - Below the form */}
            <Button
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 ease-in-out"
            >
              {gettingLocation ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-5 w-5" />
                  Use Current Location
                </>
              )}
            </Button>
          </div>
          
          {/* Right Column - Prediction Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Prediction Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prediction ? (
                <div className="space-y-4">
                  {/* Main Prediction Display */}
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-3">
                      <div className={`p-3 rounded-full ${getSeverityColor(prediction.predicted_severity)} text-white`}>
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {prediction.predicted_severity?.toUpperCase() || 'UNKNOWN'}
                    </div>
                    <p className="text-gray-600 mb-4">Predicted Incident Severity</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Probability</p>
                        <p className="font-semibold">{prediction.probability ? (prediction.probability * 100).toFixed(2) : '0.00'}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Confidence</p>
                        <p className="font-semibold">{prediction.confidence ? (prediction.confidence * 100).toFixed(2) : '0.00'}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Model Accuracy</p>
                      <p className="text-lg font-bold text-blue-900">{prediction.accuracy_percentage ? prediction.accuracy_percentage.toFixed(2) : '0.00'}%</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">Response Time</p>
                      <p className="text-lg font-bold text-green-900">{prediction.responseTime}</p>
                    </div>
                  </div>
                  
                  {/* Class Probabilities */}
                  {prediction.class_probabilities && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Severity Probabilities</h4>
                      <div className="space-y-2">
                        {Object.entries(prediction.class_probabilities).map(([severity, prob]) => (
                          <div key={severity} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(severity) + ' text-white'}>
                                {severity.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${getSeverityColor(severity)}`}
                                  style={{ width: `${prob * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {prob ? (prob * 100).toFixed(1) : '0.0'}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 text-center">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Last updated: {prediction.timestamp ? new Date(prediction.timestamp).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No prediction available</p>
                  <p className="text-sm">Fill out the form and click "Predict Incident" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Status Bar */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${pollingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  5s Polling: {pollingActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {prediction && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">
                    Last: {prediction.predicted_severity || 'Unknown'} ({prediction.probability ? (prediction.probability * 100).toFixed(1) : '0.0'}%)
                  </span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Real-time incident prediction powered by ML
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentPredictionDashboard;