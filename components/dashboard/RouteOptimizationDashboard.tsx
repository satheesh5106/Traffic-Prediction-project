'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// TypeScript interfaces
interface Coordinate {
  lat: number;
  lng: number;
}

interface Route {
  id: string;
  name: string;
  type: string;
  distance: number;
  time: number;
  traffic: string;
  fuelConsumption: number;
  coordinates: Coordinate[];
}

interface RouteRequest {
  start: string;
  destination: string;
  priority: string;
  vehicleType: string;
  avoidTolls: boolean;
  avoidHighways: boolean;
  departureTime: Date;
  alternatives: boolean;
  requestedAlgorithm: string;
}

interface MapRef {
  getMap(): any;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
}
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, Download, Clock, Route, Fuel, Leaf, Map as MapIcon, Navigation, Zap, Car, Truck, Bike, Bus, AlertTriangle, Activity, TrendingUp, MapPin, Info, Calendar, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import dynamic from 'next/dynamic';
import axios from 'axios';

// Import Enhanced 3D Map Component with Leaflet
const Enhanced3DMap = dynamic(
  () => import('@/components/maps/Enhanced3DMap'),
  { ssr: false }
);

// Import Leaflet Map Component
const LeafletMap = dynamic(
  () => import('@/components/maps/LeafletMap'),
  { ssr: false }
);

// API constants
const API_BASE_URL = '/api';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Note: MapLibre components replaced with Leaflet

// Dynamically import chart components
const LineChart = dynamic(() => import('@/components/charts/LineChart'), { ssr: false });
const BarChart = dynamic(() => import('@/components/charts/BarChart'), { ssr: false });

// Note: Turf.js and Polars.js imports removed temporarily due to type issues
// TODO: Re-add when proper type definitions are available

// Mock algorithm functions (replace with actual implementations when available)
const dijkstra = (graph: any, start: any, end: any) => ({ path: [], distance: 0 });
const aStar = (graph: any, start: any, end: any) => ({ path: [], distance: 0 });
class KDTree<T> { constructor(points: T[]) {} }
class PriorityQueue<T> { enqueue(item: T, priority: number) {} dequeue() { return null; } }

const RouteOptimizationDashboard = () => {
  // State variables for UI and data
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  
  // Route optimization metrics
  const [metrics, setMetrics] = useState({
    routesOptimized: '2,547',
    timeSaved: '1,230 hrs',
    fuelSaved: '4,560 L',
    activeRoutes: '78'
  });
  
  // Route planning inputs
  const [startLocation, setStartLocation] = useState<string>('');
  const [endLocation, setEndLocation] = useState<string>('');
  const [routePriority, setRoutePriority] = useState<string>('fastest');
  const [vehicleType, setVehicleType] = useState<string>('car');
  
  // Map state
  const [viewState, setViewState] = useState({
    longitude: 72.8777,
    latitude: 19.0760,
    zoom: 12
  });
  const [markers, setMarkers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showRouteDetail, setShowRouteDetail] = useState<boolean>(false);
  const [showTraffic, setShowTraffic] = useState<boolean>(true);
  
  // References
  const mapRef = useRef<any>(null);
  const dataCache = useRef<Record<string, any>>({});
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const kdTreeRef = useRef<KDTree<Coordinate> | null>(null);
  
  // Handle route selection with map fly-to
  const handleRouteSelect = useCallback((route: Route) => {
    setSelectedRoute(route);
    setShowRouteDetail(true);
    
    // Fly to the route on the map if map is available
    if (mapRef.current && route.coordinates) {
      const lngs = route.coordinates.map(coord => coord.lng);
      const lats = route.coordinates.map(coord => coord.lat);
      const bounds = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      ] as [[number, number], [number, number]];
      
      // Fly to the bounds with padding
      mapRef.current.fitBounds(bounds);
    }
  }, []);
  
  // Get icon based on vehicle type
  const getVehicleIcon = useCallback((type: string) => {
    switch (type) {
      case 'car': return <Car className="h-5 w-5" />;
      case 'truck': return <Truck className="h-5 w-5" />;
      case 'bike': return <Bike className="h-5 w-5" />;
      case 'bus': return <Bus className="h-5 w-5" />;
      default: return <Car className="h-5 w-5" />;
    }
  }, []);
  
  // Get color for route based on traffic conditions
  const getRouteColor = useCallback((traffic: string) => {
    switch (traffic.toLowerCase()) {
      case 'light': return '#22c55e'; // green
      case 'moderate': return '#f59e0b'; // amber
      case 'heavy': return '#ef4444'; // red
      default: return '#3b82f6'; // blue
    }
  }, []);
  
  // Format metric for display
  const formatMetric = useCallback((value: string | number, type: string) => {
    if (!value) return '0';
    
    switch (type) {
      case 'number':
        return parseInt(String(value)).toLocaleString();
      case 'time':
        return `${value} mins`;
      case 'distance':
        return `${value} km`;
      case 'fuel':
        return `${value} L`;
      default:
        return String(value);
    }
  }, []);
  
  // Get line width based on selected route
  const getRouteLineWidth = useCallback((routeId: string | number) => {
    return routeId === (selectedRoute?.id) ? 6 : 3;
  }, [selectedRoute]);
  
  // Export routes as GeoJSON
  const exportRoutes = useCallback(() => {
    if (!routes.length) return;
    
    // Convert routes to GeoJSON
        const geojson = {
          type: 'FeatureCollection' as const,
          features: routes.map(route => ({
            type: 'Feature' as const,
            properties: {
              id: route.id,
              name: route.name,
              type: route.type,
              distance: route.distance,
              time: route.time,
              traffic: route.traffic,
              fuelConsumption: route.fuelConsumption
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: route.coordinates.map(coord => [coord.lng, coord.lat]) // Convert to [lng, lat] for GeoJSON
            }
          }))
        };
    
    // Create and download file
    const dataStr = JSON.stringify(geojson, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportName = `routes_${new Date().toISOString().slice(0, 10)}.geojson`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  }, [routes]);
  
  // Mock data generation functions
  const generateMockRoutes = (): Route[] => {
    return [
      {
        id: '1',
        name: 'Fastest Route',
        type: 'fastest',
        distance: 12.5,
        time: 25,
        traffic: 'moderate',
        fuelConsumption: 1.2,
        coordinates: [
          { lat: 19.0760, lng: 72.8777 },
          { lat: 19.0830, lng: 72.8800 },
          { lat: 19.0900, lng: 72.8850 },
          { lat: 19.0950, lng: 72.8900 },
          { lat: 19.1000, lng: 72.9000 }
        ]
      },
      {
        id: '2',
        name: 'Shortest Route',
        type: 'shortest',
        distance: 10.8,
        time: 32,
        traffic: 'heavy',
        fuelConsumption: 1.5,
        coordinates: [
          { lat: 19.0760, lng: 72.8777 },
          { lat: 19.0800, lng: 72.8850 },
          { lat: 19.0850, lng: 72.8950 },
          { lat: 19.0950, lng: 72.9050 },
          { lat: 19.1000, lng: 72.9000 }
        ]
      },
      {
        id: '3',
        name: 'Eco-Friendly Route',
        type: 'eco',
        distance: 13.2,
        time: 28,
        traffic: 'light',
        fuelConsumption: 0.9,
        coordinates: [
          { lat: 19.0760, lng: 72.8777 },
          { lat: 19.0820, lng: 72.8830 },
          { lat: 19.0880, lng: 72.8900 },
          { lat: 19.0940, lng: 72.8970 },
          { lat: 19.1000, lng: 72.9000 }
        ]
      },
      {
        id: '4',
        name: 'Scenic Route',
        type: 'scenic',
        distance: 15.5,
        time: 35,
        traffic: 'light',
        fuelConsumption: 1.4,
        coordinates: [
          { lat: 19.0760, lng: 72.8777 },
          { lat: 19.0700, lng: 72.8850 },
          { lat: 19.0750, lng: 72.8950 },
          { lat: 19.0850, lng: 72.9000 },
          { lat: 19.1000, lng: 72.9000 }
        ]
      }
    ];
  };
  

  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set mock data
        setRoutes(generateMockRoutes());
        setMarkers([
          { id: 1, type: 'start', position: [19.0760, 72.8777], name: 'Mumbai Central' },
          { id: 2, type: 'end', position: [19.1000, 72.9000], name: 'Powai' }
        ]);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Refresh data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update metrics with slight variations
      setMetrics({
        ...metrics,
        routesOptimized: `${2500 + Math.floor(Math.random() * 100)}`,
        timeSaved: `${1200 + Math.floor(Math.random() * 50)} hrs`,
        fuelSaved: `${4500 + Math.floor(Math.random() * 100)} L`,
        activeRoutes: `${70 + Math.floor(Math.random() * 20)}`
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setStartLocation('Mumbai Central');
      setEndLocation('Powai');
      setMarkers([
        { id: 1, type: 'start', position: [19.0760, 72.8777], name: 'Mumbai Central' },
        { id: 2, type: 'end', position: [19.1000, 72.9000], name: 'Powai' }
      ]);
      setRoutes(generateMockRoutes());
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Navigation className="h-6 w-6" /> Route Optimization
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-500 text-sm">Plan and optimize your routes for efficiency</p>
              {lastPolled && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Last updated: {new Date(lastPolled).toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={refreshData}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh route data and metrics</TooltipContent>
              </Tooltip>
            
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={exportRoutes}>
                    <Download className="h-4 w-4 mr-2" /> Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export routes as GeoJSON</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Route Planning Form */}
      <section className="container mx-auto px-4 py-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <MapIcon className="h-5 w-5" />
            Plan Your Route
          </h2>
          <form onSubmit={handleRouteSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="start-location" className="flex items-center gap-1">
                    <Navigation className="h-4 w-4" />
                    Start Location
                  </Label>
                  <div className="relative">
                    <Input 
                      id="start-location" 
                      placeholder="Enter start location" 
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      list="start-locations"
                      required
                    />
                    <datalist id="start-locations">
                      <option value="Mumbai Central" />
                      <option value="Bandra" />
                      <option value="Andheri" />
                      <option value="Borivali" />
                      <option value="Thane" />
                    </datalist>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="end-location" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Destination
                  </Label>
                  <div className="relative">
                    <Input 
                      id="end-location" 
                      placeholder="Enter destination" 
                      value={endLocation}
                      onChange={(e) => setEndLocation(e.target.value)}
                      list="end-locations"
                      required
                    />
                    <datalist id="end-locations">
                      <option value="Powai" />
                      <option value="Dadar" />
                      <option value="Chembur" />
                      <option value="Navi Mumbai" />
                      <option value="Worli" />
                    </datalist>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    Route Priority
                  </Label>
                  <RadioGroup 
                    value={routePriority} 
                    onValueChange={setRoutePriority}
                    className="flex flex-wrap gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fastest" id="fastest" />
                      <Label htmlFor="fastest" className="cursor-pointer flex items-center gap-1">
                        <Zap className="h-4 w-4 text-blue-500" />
                        Fastest
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="shortest" id="shortest" />
                      <Label htmlFor="shortest" className="cursor-pointer flex items-center gap-1">
                        <Route className="h-4 w-4 text-green-500" />
                        Shortest
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="eco" id="eco" />
                      <Label htmlFor="eco" className="cursor-pointer flex items-center gap-1">
                        <Leaf className="h-4 w-4 text-green-600" />
                        Eco-Friendly
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scenic" id="scenic" />
                      <Label htmlFor="scenic" className="cursor-pointer flex items-center gap-1">
                        <MapIcon className="h-4 w-4 text-amber-500" />
                        Scenic
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div>
                  <Label htmlFor="vehicle-type" className="flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    Vehicle Type
                  </Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger id="vehicle-type">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          Car
                        </div>
                      </SelectItem>
                      <SelectItem value="bike">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4" />
                          Bike
                        </div>
                      </SelectItem>
                      <SelectItem value="truck">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Truck
                        </div>
                      </SelectItem>
                      <SelectItem value="bus">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4" />
                          Bus
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Find Routes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Key Metrics Section */}
      <section className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Route className="h-6 w-6 text-blue-600" />
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500">Routes Optimized</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-xl font-bold">{metrics.routesOptimized}</p>
                    <Badge variant="outline" className="ml-1">
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      {Math.floor(Math.random() * 10) + 5}%
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-gray-500">Total optimized routes</p>
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${parseInt(metrics.routesOptimized.replace(/,/g, '')) / 3000 * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500">Time Saved</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-xl font-bold">{metrics.timeSaved}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Compared to standard routes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                <p className="text-xs text-gray-500">Cumulative time savings</p>
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${parseInt(metrics.timeSaved) / 1500 * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <Fuel className="h-6 w-6 text-amber-600" />
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500">Fuel Saved</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-xl font-bold">{metrics.fuelSaved}</p>
                    <Badge variant="outline" className="ml-1 bg-green-50">
                      <Leaf className="h-3 w-3 mr-1 text-green-500" />
                      Eco
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-gray-500">Estimated fuel savings</p>
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full" 
                    style={{ width: `${parseInt(metrics.fuelSaved) / 5000 * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Navigation className="h-6 w-6 text-purple-600" />
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500">Active Routes</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-xl font-bold">{metrics.activeRoutes}</p>
                    <span className="relative flex h-3 w-3 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500">Currently active routes</p>
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ width: `${parseInt(metrics.activeRoutes) / 100 * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Performance Metrics Section */}
      <section className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-lg flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5" />
                Optimization Accuracy
              </h3>
              {isLoading ? (
                <Skeleton className="h-[150px] w-full" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">Current</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `92%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-lg flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5" />
                Response Time
              </h3>
              {isLoading ? (
                <Skeleton className="h-[150px] w-full" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">Average</span>
                      <span className="text-sm font-medium">245 ms</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full" 
                        style={{ width: `${Math.min((245 / 500) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>0ms</span>
                      <span>250ms</span>
                      <span>500ms</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Map and Routes Section */}
      <section className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 h-[500px] bg-gray-100 rounded-lg overflow-hidden">
            {typeof window !== 'undefined' && (
              <Enhanced3DMap
                viewState={viewState}
                onViewStateChange={(newViewState: any) => setViewState(newViewState)}
                markers={markers}
                routes={routes.map(route => ({
                  ...route,
                  coordinates: route.coordinates.map(coord => [coord.lng, coord.lat])
                }))}
                selectedRoute={selectedRoute}
                showTraffic={showTraffic}
                getRouteColor={getRouteColor}
                getRouteLineWidth={getRouteLineWidth}
                className="w-full h-full"
              />
            )}
          </div>
          
          {/* Route Options */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg flex items-center gap-2">
              <Route className="h-5 w-5" />
              Available Routes
            </h3>
            <p className="text-gray-500 text-sm">
              Select a route to view details and get directions
            </p>
            
            <div className="space-y-3">
              {routes.length === 0 ? (
                <div className="p-8 text-center border rounded-lg">
                  <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No routes available</p>
                  <p className="text-sm text-gray-400">Enter start and end locations to generate routes</p>
                </div>
              ) : (
                routes.map(route => (
                  <div 
                    key={route.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${route.id === (selectedRoute?.id || routes[0]?.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    onClick={() => handleRouteSelect(route)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full" style={{ backgroundColor: `${getRouteColor(route.traffic)}25` }}>
                        {getVehicleIcon(route.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{route.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>{route.distance} km</span>
                          <span>•</span>
                          <span>{route.time} mins</span>
                          <span>•</span>
                          <span>{route.traffic} traffic</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-gray-500">Fuel: </span>
                        <span className="font-medium">{route.fuelConsumption} L</span>
                      </div>
                      <Button size="sm" variant="outline">
                        Select
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Route Detail Modal */}
      <Dialog open={showRouteDetail} onOpenChange={setShowRouteDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRoute && getVehicleIcon(selectedRoute.type)}
              {selectedRoute?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRoute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Distance</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Route className="h-4 w-4 text-gray-500" />
                    {selectedRoute.distance} km
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Estimated Time</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    {selectedRoute.time} mins
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Traffic Conditions</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Activity className="h-4 w-4 text-gray-500" />
                    <Badge variant={selectedRoute.traffic.toLowerCase() === 'light' ? 'outline' : 
                                  selectedRoute.traffic.toLowerCase() === 'moderate' ? 'secondary' : 'destructive'}>
                      {selectedRoute.traffic}
                    </Badge>
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Fuel Consumption</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Fuel className="h-4 w-4 text-gray-500" />
                    {selectedRoute.fuelConsumption} L
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Route Details</p>
                <ul className="mt-2 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Start: Mumbai Central</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <span>Via Bandra</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <span>Via Andheri</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>End: Powai</span>
                  </li>
                </ul>
              </div>
              
              <div className="h-[200px] bg-gray-100 rounded-lg overflow-hidden">
                {typeof window !== 'undefined' && selectedRoute && selectedRoute.coordinates && selectedRoute.coordinates.length > 0 && (
                  <LeafletMap
                    center={[
                      selectedRoute.coordinates[Math.floor(selectedRoute.coordinates.length / 2)].lat,
                      selectedRoute.coordinates[Math.floor(selectedRoute.coordinates.length / 2)].lng
                    ]}
                    zoom={13}
                    height="200px"
                    markers={[
                      {
                        id: 'start',
                        position: [selectedRoute.coordinates[0].lat, selectedRoute.coordinates[0].lng],
                        popup: 'Start Location'
                      },
                      {
                        id: 'end',
                        position: [selectedRoute.coordinates[selectedRoute.coordinates.length - 1].lat, selectedRoute.coordinates[selectedRoute.coordinates.length - 1].lng],
                        popup: 'End Location'
                      }
                    ]}
                    polylines={[
                      {
                        id: 'route',
                        positions: selectedRoute.coordinates
                          .filter(coord => coord && typeof coord.lat === 'number' && typeof coord.lng === 'number')
                          .map(coord => [coord.lat, coord.lng] as [number, number]),
                        color: getRouteColor(selectedRoute.traffic),
                        weight: 6
                      }
                    ]}
                  />
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRouteDetail(false)}>Close</Button>
            <Button>
              <Navigation className="h-4 w-4 mr-2" />
              Start Navigation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizationDashboard;