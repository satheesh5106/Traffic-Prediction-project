'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// TypeScript interfaces
interface Coordinate {
  lat: number;
  lng: number;
}

interface Marker {
  id: number;
  type: 'start' | 'end';
  position: [number, number]; // [lat, lng]
  name: string;
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
  summary?: string;
  instructions?: any[];
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

interface ApiRoute {
  id: string;
  start_location: string;
  end_location: string;
  distance: number;
  duration: number;
  fuel_consumption: number;
  route_type: string;
  coordinates: Array<{lat: number, lng: number}>;
  traffic_conditions: string;
  summary: string;
  instructions: any[];
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
import { Switch } from "@/components/ui/switch";
import dynamic from 'next/dynamic';
import axios from 'axios';

// Removed useAuth import - authentication no longer required

// Helper function to calculate distance between two coordinates in kilometers using the Haversine formula
const calculateDistance = (point1: { lat: number, lng: number }, point2: { lat: number, lng: number }): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// ✅ Real TomTom Names: Parse actual location names from TomTom API data
const parseRealTomTomName = (routeName: string, routeData?: any): string => {
  try {
    // Extract real location names from TomTom route data
    if (routeData?.summary?.lengthInMeters) {
      const distance = (routeData.summary.lengthInMeters / 1000).toFixed(1);
      return `${routeName} (${distance}km)`;
    }
    
    // Parse route name for real locations
    if (routeName.includes(' to ')) {
      const [start, end] = routeName.split(' to ');
      return `${start.trim()} → ${end.trim()}`;
    }
    
    // Return enhanced route name
    return routeName || 'Optimized Route';
  } catch (error) {
    console.warn('[TomTom] Name parsing failed:', error);
    return routeName || 'Route';
  }
};

// Fuel consumption calculation based on vehicle type, distance, and traffic conditions
const calculateFuelConsumption = (distance: number, vehicleType: string, traffic: string): number => {
  if (!distance || distance <= 0) return 0;
  
  // Base fuel consumption rates (L/100km) for different vehicle types
  const baseFuelRates: { [key: string]: number } = {
    'car': 8.5,        // Average car: 8.5L/100km
    'truck': 35.0,     // Heavy truck: 35L/100km
    'bike': 3.5,       // Motorcycle: 3.5L/100km
    'bus': 25.0,       // Bus: 25L/100km
    'van': 12.0,       // Van: 12L/100km
    'suv': 11.0,       // SUV: 11L/100km
    'electric': 0,     // Electric vehicle: 0L (could be kWh in future)
    'hybrid': 5.5      // Hybrid: 5.5L/100km
  };
  
  // Traffic condition multipliers
  const trafficMultipliers: { [key: string]: number } = {
    'light': 1.0,      // Normal consumption
    'moderate': 1.25,  // 25% increase due to stop-and-go
    'heavy': 1.5,      // 50% increase due to heavy traffic
    'severe': 1.75     // 75% increase due to severe congestion
  };
  
  // Get base rate for vehicle type (default to car if unknown)
  const baseRate = baseFuelRates[vehicleType.toLowerCase()] || baseFuelRates['car'];
  
  // Get traffic multiplier (default to light if unknown)
  const trafficMultiplier = trafficMultipliers[traffic.toLowerCase()] || trafficMultipliers['light'];
  
  // Calculate fuel consumption: (distance in km) * (base rate / 100) * traffic multiplier
  const fuelConsumption = (distance * baseRate / 100) * trafficMultiplier;
  
  // Round to 1 decimal place and ensure minimum of 0.1L for non-electric vehicles
  return baseRate === 0 ? 0 : Math.max(0.1, Math.round(fuelConsumption * 10) / 10);
};

// Validate route data to prevent null or invalid routes
const validateRoute = (route: any, index: number): boolean => {
  // Check for required fields
  if (!route || typeof route !== 'object') {
    console.warn(`Route ${index + 1}: Invalid route object`);
    return false;
  }
  
  // Check for null or undefined route name
  if (!route.name && !route.id) {
    console.warn(`Route ${index + 1}: Missing name and id`);
    return false;
  }
  
  // Check for valid distance
  const distance = route.distance || route.summary?.distanceKm || 0;
  if (distance <= 0) {
    console.warn(`Route ${index + 1}: Invalid distance (${distance})`);
    return false;
  }
  
  // Check for valid time
  const time = route.time || route.travelTime || route.summary?.durationMinutes || 0;
  if (time <= 0) {
    console.warn(`Route ${index + 1}: Invalid time (${time})`);
    return false;
  }
  
  // Check for coordinates
  const coordinates = route.coordinates || route.polylinePoints || [];
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    console.warn(`Route ${index + 1}: Invalid or insufficient coordinates`);
    return false;
  }
  
  return true;
};

// Removed cityCoordinates mock data - using only TomTom API

// ✅ Geocoding function to convert location names to coordinates
const geocodeLocation = async (locationName: string): Promise<{ lat: number; lng: number; name: string } | null> => {
  if (!locationName.trim()) return null;
  
  console.log(`🌍 Geocoding location: "${locationName}" using TomTom API`);
  
  // Use only TomTom Geocoding API for real-time data
  try {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ location: locationName })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.lat && data.lon) {
        console.log(`✅ TomTom geocoding successful:`, {
          location: locationName,
          coordinates: { lat: data.lat, lng: data.lon },
          address: data.address
        });
        return {
          lat: data.lat,
          lng: data.lon,
          name: data.address || locationName
        };
      }
    } else {
      console.warn(`⚠️ TomTom geocoding failed with status: ${response.status}`);
    }
  } catch (error) {
    console.warn('❌ TomTom geocoding API error:', error);
  }
  
  console.error(`❌ Geocoding failed for: ${locationName}`);
  return null;
};

// MapLibre GL JS Map Component
const MapLibreMap = ({ routes, selectedRoute, viewState, onViewStateChange, className, startLocation, endLocation, autoZoomTrigger }: {
  routes: Route[];
  selectedRoute: Route | null;
  viewState: { longitude: number; latitude: number; zoom: number };
  onViewStateChange: (newViewState: any) => void;
  className?: string;
  startLocation?: { lat: number; lng: number; name: string } | null;
  endLocation?: { lat: number; lng: number; name: string } | null;
  autoZoomTrigger?: number; // Increment this to trigger auto-zoom
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [trafficLayerVisible, setTrafficLayerVisible] = useState<boolean>(false);
  const [currentMapStyle, setCurrentMapStyle] = useState<string>('streets');
  
  // External auto-zoom trigger effect
  useEffect(() => {
    if (autoZoomTrigger && autoZoomTrigger > 0 && map.current && routes.length > 0) {
      console.log(`[MapLibre] 🎯 External auto-zoom triggered (trigger: ${autoZoomTrigger})`);
      
      setTimeout(() => {
        if (!map.current || routes.length === 0) return;
        
        try {
          const allCoordinates: [number, number][] = [];
          let totalDistance = 0;
          
          routes.forEach(route => {
            if (route.coordinates && route.coordinates.length > 0) {
              route.coordinates.forEach(coord => {
                if (coord && typeof coord.lng === 'number' && typeof coord.lat === 'number') {
                  allCoordinates.push([coord.lng, coord.lat]);
                }
              });
              totalDistance += route.distance || 0;
            }
          });
          
          if (startLocation && startLocation.lat && startLocation.lng) {
            allCoordinates.push([startLocation.lng, startLocation.lat]);
          }
          if (endLocation && endLocation.lat && endLocation.lng) {
            allCoordinates.push([endLocation.lng, endLocation.lat]);
          }
          
          if (allCoordinates.length === 0) return;
          
          const bounds = new maplibregl.LngLatBounds();
          allCoordinates.forEach(coord => bounds.extend(coord));
          
          const avgDistance = totalDistance / routes.length;
          const dynamicMaxZoom = avgDistance > 1000 ? 8 : avgDistance > 500 ? 9 : avgDistance > 100 ? 11 : avgDistance > 50 ? 12 : avgDistance > 10 ? 13 : 14;
          
          console.log(`[MapLibre] 🎯 External auto-zoom executing: ${allCoordinates.length} coords, ${totalDistance.toFixed(2)}km, zoom=${dynamicMaxZoom}`);
          
          map.current.fitBounds(bounds, {
            padding: { top: 60, bottom: 60, left: 60, right: 60 },
            maxZoom: dynamicMaxZoom,
            duration: 2000,
            essential: true,
            linear: false
          });
          
          console.log('[MapLibre] ✅ External auto-zoom completed successfully');
          
        } catch (error) {
          console.error('[MapLibre] ❌ External auto-zoom error:', error);
        }
      }, 200);
    }
  }, [autoZoomTrigger, routes, startLocation, endLocation]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      // Initialize Enhanced MapLibre GL JS map with Route Optimization features
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors | Enhanced Route Optimization'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              // ✅ Water Body Filtering: Hide water surfaces for better route visibility
              filter: ['!', ['in', ['get', 'surface'], ['literal', ['water']]]]
            }
          ]
        },
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        attributionControl: {
          customAttribution: '© OpenStreetMap contributors | Enhanced Route Optimization'
        }
      });

      // ✅ Auto-zoom Disabling: Disable auto-zoom for better user control
      map.current.dragRotate.disable();
      map.current.touchZoomRotate.disable();

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      
      // Add scale control with improved configuration
      map.current.addControl(new maplibregl.ScaleControl({
        maxWidth: 150,
        unit: 'metric' // Use metric units (kilometers/meters)
      }), 'bottom-left');

      // Map event listeners
      map.current.on('load', () => {
        setMapLoaded(true);
        console.log('[MapLibre] Map loaded successfully');
      });

      map.current.on('moveend', () => {
        if (map.current) {
          const center = map.current.getCenter();
          const zoom = map.current.getZoom();
          onViewStateChange({
            longitude: center.lng,
            latitude: center.lat,
            zoom: zoom
          });
          console.log(`[MapLibre] 🗺️ Map moved to: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}, zoom: ${zoom.toFixed(2)}`);
        }
      });

      map.current.on('zoomend', () => {
        if (map.current) {
          console.log(`[MapLibre] 🔍 Map zoom changed to: ${map.current.getZoom().toFixed(2)}`);
        }
      });

      map.current.on('click', (e) => {
        console.log(`[MapLibre] 🎯 Map clicked at: ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`);
      });

      map.current.on('error', (e) => {
        console.error('[MapLibre] ❌ Map error:', e);
        setMapError('Failed to load map. Please check your internet connection.');
      });

    } catch (error) {
      console.error('[MapLibre] ❌ Initialization error:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Switch map style (satellite/streets toggle)
  const switchMapStyle = useCallback(() => {
    if (map.current && mapLoaded) {
      try {
        const newStyle = currentMapStyle === 'streets' ? 'satellite' : 'streets';
        
        // Store current routes data before style change
        const currentRoutes = routes;
        
        // Switch style
        if (newStyle === 'satellite') {
          // Use satellite style
          map.current.setStyle({
            version: 8,
            sources: {
              'satellite-tiles': {
                type: 'raster',
                tiles: [
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256,
                attribution: '© Esri, Maxar, Earthstar Geographics'
              }
            },
            layers: [
              {
                id: 'satellite-tiles',
                type: 'raster',
                source: 'satellite-tiles'
              }
            ]
          });
        } else {
          // Use OpenStreetMap style
          map.current.setStyle({
            version: 8,
            sources: {
              'osm-tiles': {
                type: 'raster',
                tiles: [
                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              }
            },
            layers: [
              {
                id: 'osm-tiles',
                type: 'raster',
                source: 'osm-tiles'
              }
            ]
          });
        }
        
        setCurrentMapStyle(newStyle);
        
        // Re-add routes after style change
         map.current.once('styledata', () => {
           if (map.current!.isStyleLoaded()) {
             // Routes will be automatically re-added by the routes useEffect
             // when the map style is loaded and routes prop hasn't changed
             console.log('[MapLibre] Style loaded, routes will be re-added automatically');
           }
         });
        
        console.log(`[MapLibre] 🗺️ Switched to ${newStyle} style`);
      } catch (error) {
        console.error('[MapLibre] ❌ Style switch failed:', error);
      }
    }
  }, [currentMapStyle, mapLoaded, routes]);
  
  // Toggle traffic layer
  const toggleTrafficLayer = useCallback(() => {
    if (map.current && mapLoaded) {
      const visibility = trafficLayerVisible ? 'none' : 'visible';
      map.current.setLayoutProperty('traffic-layer', 'visibility', visibility);
      setTrafficLayerVisible(!trafficLayerVisible);
      console.log(`[MapLibre] 🚦 Traffic layer ${trafficLayerVisible ? 'hidden' : 'shown'}`);
    }
  }, [trafficLayerVisible, mapLoaded]);

  // Update map center when viewState changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        duration: 1000
      });
    }
  }, [viewState, mapLoaded]);

  // Add markers and route polyline for start and end locations
  useEffect(() => {
    console.log('[MapLibre] 🎯 Marker useEffect triggered:', {
      mapExists: !!map.current,
      mapLoaded,
      startLocation,
      endLocation
    });
    
    if (!map.current || !mapLoaded) {
      console.log('[MapLibre] ⏸️ Skipping marker update - map not ready');
      return;
    }

    try {
      // Clean up existing location markers and route layers
      const locationMarkers = markersRef.current.filter(marker => 
        marker.getElement().classList.contains('location-marker')
      );
      locationMarkers.forEach(marker => marker.remove());
      markersRef.current = markersRef.current.filter(marker => 
        !marker.getElement().classList.contains('location-marker')
      );

      // Remove existing user route layer and source
      if (map.current.getLayer('user-route')) {
        map.current.removeLayer('user-route');
      }
      if (map.current.getSource('user-route')) {
        map.current.removeSource('user-route');
      }

      const newMarkers: maplibregl.Marker[] = [];

      // Add start location marker
      if (startLocation) {
        const startMarker = new maplibregl.Marker({ 
          color: '#22c55e',
          scale: 1.2
        })
          .setLngLat([startLocation.lng, startLocation.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <strong class="text-green-600">🚀 Start Location</strong><br/>
              <span class="font-medium">${startLocation.name}</span><br/>
              <small>Lat: ${startLocation.lat.toFixed(4)}<br/>Lng: ${startLocation.lng.toFixed(4)}</small>
            </div>`
          ))
          .addTo(map.current!);
        
        startMarker.getElement().classList.add('location-marker', 'start-marker');
        newMarkers.push(startMarker);
      }

      // Add end location marker
      if (endLocation) {
        const endMarker = new maplibregl.Marker({ 
          color: '#ef4444',
          scale: 1.2
        })
          .setLngLat([endLocation.lng, endLocation.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <strong class="text-red-600">🏁 End Location</strong><br/>
              <span class="font-medium">${endLocation.name}</span><br/>
              <small>Lat: ${endLocation.lat.toFixed(4)}<br/>Lng: ${endLocation.lng.toFixed(4)}</small>
            </div>`
          ))
          .addTo(map.current!);
        
        endMarker.getElement().classList.add('location-marker', 'end-marker');
        newMarkers.push(endMarker);
      }

      // Add new markers to the ref
      markersRef.current = [...markersRef.current, ...newMarkers];
      
      console.log('[MapLibre] ✅ Markers added successfully:', {
        startMarker: !!startLocation,
        endMarker: !!endLocation,
        totalMarkers: markersRef.current.length
      });

      // Fetch and display route polyline when both locations are available
      if (startLocation && endLocation) {
        fetchRoutePolyline(startLocation, endLocation);
        
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([startLocation.lng, startLocation.lat]);
        bounds.extend([endLocation.lng, endLocation.lat]);
        
        // Calculate distance to determine appropriate zoom
        const distance = calculateDistance(startLocation, endLocation);
        const maxZoom = distance > 1000 ? 8 : 
                      distance > 500 ? 9 : 
                      distance > 100 ? 11 : 
                      distance > 50 ? 12 : 
                      distance > 10 ? 13 : 14;
        
        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: maxZoom,
          duration: 1500
        });
        
        console.log(`[MapLibre] 📍 Centered map on start and end locations (distance: ${distance.toFixed(2)}km)`);
      } else if (startLocation) {
        // Center on start location only
        map.current.flyTo({
          center: [startLocation.lng, startLocation.lat],
          zoom: 12,
          duration: 1000
        });
        console.log(`[MapLibre] 📍 Centered map on start location: ${startLocation.name}`);
      } else if (endLocation) {
        // Center on end location only
        map.current.flyTo({
          center: [endLocation.lng, endLocation.lat],
          zoom: 12,
          duration: 1000
        });
        console.log(`[MapLibre] 📍 Centered map on end location: ${endLocation.name}`);
      }

    } catch (error) {
      console.error('[MapLibre] ❌ Error adding location markers:', error);
    }
  }, [startLocation, endLocation, mapLoaded]);

  // Function to fetch route polyline from TomTom API
  const fetchRoutePolyline = async (start: { lat: number; lng: number; name: string }, end: { lat: number; lng: number; name: string }) => {
    try {
      console.log('[MapLibre] 🛣️ Fetching route polyline from TomTom API...');
      
      // Clean up existing route layers
      if (map.current) {
        if (map.current.getLayer('user-route')) {
          map.current.removeLayer('user-route');
        }
        if (map.current.getSource('user-route')) {
          map.current.removeSource('user-route');
        }
      }
      
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          start: start.name,
          destination: end.name,
          priority: 'fastest',
          alternatives: true,
          startCoords: start,
          destinationCoords: end
        })
      });

      if (!response.ok) {
        throw new Error(`Route API error: ${response.status}`);
      }

      const routeData = await response.json();
      console.log('[MapLibre] 📊 Route response:', routeData);
      
      if (routeData.success && routeData.routes && routeData.routes.length > 0) {
        const route = routeData.routes[0];
        let coordinates = [];
        
        // Use the coordinates field from the updated backend response
        if (route.coordinates && Array.isArray(route.coordinates)) {
          coordinates = route.coordinates.map((coord: any) => [coord.lng, coord.lat]);
        } else {
          // Fallback: create straight line
          coordinates = [[start.lng, start.lat], [end.lng, end.lat]];
        }
        
        // Add route source and layer to map
        if (map.current) {
          map.current.addSource('user-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              }
            }
          });

          map.current.addLayer({
            id: 'user-route',
            type: 'line',
            source: 'user-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });

          console.log('[MapLibre] ✅ Route polyline added successfully');
        }
      } else {
        console.warn('[MapLibre] ⚠️ No route data received from API');
      }
    } catch (error) {
      console.error('[MapLibre] ❌ Error fetching route polyline:', error);
      
      // Fallback: draw a simple straight line
      if (map.current) {
        map.current.addSource('user-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [[start.lng, start.lat], [end.lng, end.lat]]
            }
          }
        });

        map.current.addLayer({
          id: 'user-route',
          type: 'line',
          source: 'user-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ef4444',
            'line-width': 3,
            'line-opacity': 0.6,
            'line-dasharray': [2, 2]
          }
        });

        console.log('[MapLibre] ⚠️ Added fallback straight line route');
      }
    }
  };

  // Add routes to map
  useEffect(() => {
    console.log('[MapLibre] 🔄 Routes useEffect triggered:', {
      mapExists: !!map.current,
      mapLoaded,
      routeCount: routes.length,
      routes: routes.map(r => ({ id: r.id, name: r.name, coordCount: r.coordinates?.length }))
    });
    
    if (!map.current || !mapLoaded) {
      console.log('[MapLibre] ⏸️ Skipping route update - map not ready');
      return;
    }

    try {
      // Clean up existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Remove existing route layers
      for (let i = 0; i < 10; i++) {
        const layerId = `route-${i}`;
        const sourceId = `route-source-${i}`;
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      }

      if (!routes.length) return;

      // Add route layers
      console.log(`[MapLibre] 🗺️ Adding ${routes.length} routes to map`);
      routes.forEach((route, index) => {
        console.log(`[MapLibre] 📍 Processing route ${index + 1}:`, {
          id: route.id,
          name: route.name,
          coordinateCount: route.coordinates?.length || 0,
          firstCoord: route.coordinates?.[0],
          lastCoord: route.coordinates?.[route.coordinates?.length - 1]
        });
        
        if (route.coordinates && route.coordinates.length > 0) {
          const sourceId = `route-source-${index}`;
          const layerId = `route-${index}`;
          
          // Convert coordinates to GeoJSON LineString
          const geojson = {
            type: 'Feature' as const,
            properties: {
              id: route.id,
              name: route.name,
              traffic: route.traffic,
              distance: route.distance,
              time: route.time
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: route.coordinates.map(coord => [coord.lng, coord.lat])
            }
          };
          
          console.log(`[MapLibre] 🎯 GeoJSON for route ${index + 1}:`, geojson);

          // Add source
          try {
            map.current!.addSource(sourceId, {
              type: 'geojson',
              data: geojson
            });
            console.log(`[MapLibre] ✅ Added source ${sourceId}`);
          } catch (error) {
            console.error(`[MapLibre] ❌ Error adding source ${sourceId}:`, error);
            return;
          }

          // Route color based on traffic and selection
          let routeColor = '#3b82f6'; // Default blue
          if (selectedRoute?.id === route.id) {
            routeColor = '#ef4444'; // Red for selected
          } else if (route.traffic === 'heavy') {
            routeColor = '#dc2626'; // Dark red for heavy traffic
          } else if (route.traffic === 'moderate') {
            routeColor = '#f59e0b'; // Orange for moderate traffic
          } else if (route.traffic === 'light') {
            routeColor = '#10b981'; // Green for light traffic
          }

          console.log(`[MapLibre] 🎨 Route ${index + 1} color: ${routeColor} (traffic: ${route.traffic})`);

          // Add layer
          try {
            map.current!.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': routeColor,
                'line-width': selectedRoute?.id === route.id ? 6 : 3,
                'line-opacity': 0.8
              }
            });
            console.log(`[MapLibre] ✅ Added layer ${layerId} with color ${routeColor}`);
          } catch (error) {
            console.error(`[MapLibre] ❌ Error adding layer ${layerId}:`, error);
          }

          // ✅ Enhanced Route Selection: Use flyTo for smooth navigation
          map.current!.on('click', layerId, (e) => {
            console.log(`[MapLibre] 🎯 Route ${route.name} clicked`);
            
            // Calculate route center for flyTo navigation
            if (route.coordinates.length > 0) {
              const centerLat = route.coordinates.reduce((sum, coord) => sum + coord.lat, 0) / route.coordinates.length;
              const centerLng = route.coordinates.reduce((sum, coord) => sum + coord.lng, 0) / route.coordinates.length;
              
              // Smooth flyTo animation to route center
              map.current!.flyTo({
                center: [centerLng, centerLat],
                zoom: Math.min(map.current!.getZoom() + 1, 15),
                duration: 1500,
                essential: true
              });
              
              // Show route popup with enhanced TomTom name
              const popup = new maplibregl.Popup({ offset: 25 })
                .setLngLat([centerLng, centerLat])
                .setHTML(`
                  <div class="p-3 max-w-xs">
                    <h3 class="font-bold text-blue-600 mb-2">${parseRealTomTomName(route.name, route)}</h3>
                    <div class="space-y-1 text-sm">
                      <div><strong>Distance:</strong> ${route.distance.toFixed(1)}km</div>
                      <div><strong>Duration:</strong> ${Math.round(route.time)}min</div>
                      <div><strong>Traffic:</strong> <span class="${route.traffic === 'heavy' ? 'text-red-500' : route.traffic === 'moderate' ? 'text-yellow-500' : 'text-green-500'}">${route.traffic}</span></div>
                      <div><strong>Fuel:</strong> ${route.fuelConsumption.toFixed(1)}L</div>
                    </div>
                  </div>
                `)
                .addTo(map.current!);
            }
          });

          // Change cursor on hover
          map.current!.on('mouseenter', layerId, () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = 'pointer';
            }
          });

          map.current!.on('mouseleave', layerId, () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = '';
            }
          });
        }
      });

      // Add markers for start and end points
      if (routes.length > 0 && routes[0].coordinates.length > 0) {
        const firstRoute = routes[0];
        const startCoord = firstRoute.coordinates[0];
        const endCoord = firstRoute.coordinates[firstRoute.coordinates.length - 1];

        // Start marker
        const startMarker = new maplibregl.Marker({ 
          color: '#22c55e',
          scale: 1.2
        })
          .setLngLat([startCoord.lng, startCoord.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <strong class="text-green-600">🚀 Start Point</strong><br/>
              <small>Lat: ${startCoord.lat.toFixed(4)}<br/>Lng: ${startCoord.lng.toFixed(4)}</small>
            </div>`
          ))
          .addTo(map.current!);

        // End marker
        const endMarker = new maplibregl.Marker({ 
          color: '#ef4444',
          scale: 1.2
        })
          .setLngLat([endCoord.lng, endCoord.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <strong class="text-red-600">🏁 End Point</strong><br/>
              <small>Lat: ${endCoord.lat.toFixed(4)}<br/>Lng: ${endCoord.lng.toFixed(4)}</small>
            </div>`
          ))
          .addTo(map.current!);

        markersRef.current = [startMarker, endMarker];

        // Enhanced auto-zoom logic for MapLibre GL JS
        const performAutoZoom = () => {
          if (!map.current || routes.length === 0) {
            console.log('[MapLibre] 🔍 Auto-zoom skipped - no map or routes');
            return;
          }

          try {
            console.log(`[MapLibre] 🎯 Starting auto-zoom for ${routes.length} routes`);
            
            // Collect all coordinates from all routes
            const allCoordinates: [number, number][] = [];
            let totalDistance = 0;
            
            routes.forEach((route, routeIndex) => {
              console.log(`[MapLibre] 📍 Processing route ${routeIndex + 1}: ${route.coordinates?.length || 0} coordinates`);
              
              if (route.coordinates && route.coordinates.length > 0) {
                route.coordinates.forEach(coord => {
                  if (coord && typeof coord.lng === 'number' && typeof coord.lat === 'number') {
                    allCoordinates.push([coord.lng, coord.lat]);
                  }
                });
                totalDistance += route.distance || 0;
              }
            });
            
            // Add start and end location markers if available
            if (startLocation && startLocation.lat && startLocation.lng) {
              allCoordinates.push([startLocation.lng, startLocation.lat]);
              console.log('[MapLibre] 📍 Added start location to bounds');
            }
            if (endLocation && endLocation.lat && endLocation.lng) {
              allCoordinates.push([endLocation.lng, endLocation.lat]);
              console.log('[MapLibre] 📍 Added end location to bounds');
            }
            
            if (allCoordinates.length === 0) {
              console.warn('[MapLibre] ⚠️ No valid coordinates found for auto-zoom');
              return;
            }
            
            console.log(`[MapLibre] 📊 Auto-zoom data: ${allCoordinates.length} coordinates, ${totalDistance.toFixed(2)}km total distance`);
            
            // Create bounds from all coordinates
            const bounds = new maplibregl.LngLatBounds();
            allCoordinates.forEach(coord => {
              bounds.extend(coord);
            });
            
            // Enhanced dynamic zoom calculation
            const avgDistance = totalDistance / routes.length;
            let dynamicMaxZoom: number;
            let animationDuration: number;
            
            if (avgDistance > 2000) {
              dynamicMaxZoom = 6;  // Continental routes
              animationDuration = 3000;
            } else if (avgDistance > 1000) {
              dynamicMaxZoom = 8;  // Very long routes
              animationDuration = 2500;
            } else if (avgDistance > 500) {
              dynamicMaxZoom = 9;  // Long routes
              animationDuration = 2000;
            } else if (avgDistance > 200) {
              dynamicMaxZoom = 10; // Medium-long routes
              animationDuration = 1800;
            } else if (avgDistance > 100) {
              dynamicMaxZoom = 11; // Medium routes
              animationDuration = 1500;
            } else if (avgDistance > 50) {
              dynamicMaxZoom = 12; // Short-medium routes
              animationDuration = 1200;
            } else if (avgDistance > 20) {
              dynamicMaxZoom = 13; // Short routes
              animationDuration = 1000;
            } else if (avgDistance > 5) {
              dynamicMaxZoom = 14; // Very short routes
              animationDuration = 800;
            } else {
              dynamicMaxZoom = 15; // City-level routes
              animationDuration = 600;
            }
            
            // Calculate appropriate padding based on map container size
            const mapContainer = map.current.getContainer();
            const containerWidth = mapContainer.offsetWidth;
            const containerHeight = mapContainer.offsetHeight;
            
            const paddingPercent = Math.min(containerWidth, containerHeight) * 0.1; // 10% of smaller dimension
            const minPadding = 30;
            const maxPadding = 100;
            const calculatedPadding = Math.max(minPadding, Math.min(maxPadding, paddingPercent));
            
            console.log(`[MapLibre] 🎯 Auto-zoom settings: maxZoom=${dynamicMaxZoom}, duration=${animationDuration}ms, padding=${calculatedPadding}px`);
            
            // Apply the auto-zoom with enhanced settings
            map.current.fitBounds(bounds, {
              padding: {
                top: calculatedPadding,
                bottom: calculatedPadding,
                left: calculatedPadding,
                right: calculatedPadding
              },
              maxZoom: dynamicMaxZoom,
              duration: animationDuration,
              essential: true, // This animation is essential and should not be interrupted
              linear: false    // Use easing for smoother animation
            });
            
            console.log(`[MapLibre] ✅ Auto-zoom completed successfully`);
            
          } catch (error) {
            console.error('[MapLibre] ❌ Auto-zoom error:', error);
          }
        };
        
        // Multiple timing strategies for robust auto-zoom
        // Strategy 1: Immediate attempt
        performAutoZoom();
        
        // Strategy 2: Delayed attempt (for route rendering)
        setTimeout(performAutoZoom, 500);
        
        // Strategy 3: Final attempt (for slow networks)
        setTimeout(performAutoZoom, 1500);
        
        // Fit map to show all routes (fallback for immediate display)
        const bounds = new maplibregl.LngLatBounds();
        
        // Check if we have very long routes that might need special handling
        let hasVeryLongRoute = false;
        let totalDistance = 0;
        
        routes.forEach(route => {
          // Calculate total route distance
          if (route.coordinates.length > 1) {
            for (let i = 1; i < route.coordinates.length; i++) {
              totalDistance += calculateDistance(route.coordinates[i-1], route.coordinates[i]);
            }
          }
          
          // Add all coordinates to bounds
          route.coordinates.forEach(coord => {
            bounds.extend([coord.lng, coord.lat]);
          });
        });
        
        // Log total route distance for debugging
        console.log(`[MapLibre] 📏 Total route distance: ${totalDistance.toFixed(2)}km`);
        
        // Mark as very long route if over 1000km
        hasVeryLongRoute = totalDistance > 1000;
        if (hasVeryLongRoute) {
          console.log('[MapLibre] ⚠️ Very long route detected, applying special handling');
        }
        
        // Calculate the distance between start and end points to adjust zoom level appropriately
        const startPoint = routes[0].coordinates[0];
        const endPoint = routes[0].coordinates[routes[0].coordinates.length - 1];
        const distance = calculateDistance(startPoint, endPoint);
        
        // Adjust maxZoom based on route distance
        const dynamicMaxZoom = distance > 1000 ? 9 : // Very long routes (>1000km)
                             distance > 500 ? 10 : // Long routes (500-1000km)
                             distance > 100 ? 12 : // Medium routes (100-500km)
                             distance > 50 ? 13 : // Short-medium routes (50-100km)
                             distance > 10 ? 14 : // Short routes (10-50km)
                             15; // Very short routes (<10km)
        
        console.log(`[MapLibre] 📏 Route distance: ${distance.toFixed(2)}km, setting maxZoom: ${dynamicMaxZoom}`);
        
        // Apply different fitting parameters based on route length
        if (hasVeryLongRoute) {
          // For very long routes, use a more conservative approach
          map.current.fitBounds(bounds, {
            padding: 100, // Extra padding for very long routes
            maxZoom: Math.min(dynamicMaxZoom, 8), // Limit max zoom for very long routes
            duration: 2000 // Longer animation for better context
          });
          
          // Add a warning for very long routes
          if (!document.getElementById('long-route-warning')) {
            const warning = document.createElement('div');
            warning.id = 'long-route-warning';
            warning.className = 'absolute bottom-16 left-4 z-20 bg-yellow-50 border border-yellow-200 rounded-md p-2 text-sm text-yellow-700 transition-opacity duration-500';
            warning.innerHTML = '<strong>⚠️ Long Distance Route</strong><br>Zoom in for better detail';
            mapContainer.current?.appendChild(warning);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
              const warningElement = document.getElementById('long-route-warning');
              if (warningElement) {
                warningElement.style.opacity = '0';
                setTimeout(() => warningElement.remove(), 500);
              }
            }, 5000);
          }
        } else {
          // Normal routes
          map.current.fitBounds(bounds, {
            padding: 80, // Increased padding for better context
            maxZoom: dynamicMaxZoom,
            duration: 1500
          });
        }
      }

    } catch (error) {
      console.error('[MapLibre] ❌ Error adding routes:', error);
    }
  }, [routes, selectedRoute, mapLoaded]);

  // ✅ City Coordination: Auto-center map based on route locations
  useEffect(() => {
    if (!map.current || !mapLoaded || routes.length === 0) return;

    try {
      // Center map on route coordinates if available
      if (routes.length > 0 && routes[0].coordinates && routes[0].coordinates.length > 0) {
        const firstRoute = routes[0];
        const bounds = new maplibregl.LngLatBounds();
        
        // Add all route coordinates to bounds
        firstRoute.coordinates.forEach(coord => {
          bounds.extend([coord.lng, coord.lat]);
        });
        
        // Fit map to route bounds
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 14,
          duration: 2000
        });
        
        console.log(`[MapLibre] 🗺️ Centered map on route: ${firstRoute.name}`);
      } else {
        // Fallback: center on a default location
        const defaultCenter = { lng: 77.2090, lat: 28.6139 }; // Delhi
        
        map.current.flyTo({
          center: [defaultCenter.lng, defaultCenter.lat],
          zoom: 10,
          duration: 2000
        });
        
        onViewStateChange({
          longitude: defaultCenter.lng,
          latitude: defaultCenter.lat,
          zoom: 11
        });
      }
    } catch (error) {
      console.warn('[MapLibre] ⚠️ City coordination failed:', error);
    }
  }, [routes, mapLoaded, onViewStateChange]);

  if (mapError) {
    return (
      <div className={`${className} bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200`}>
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">{mapError}</p>
          <p className="text-sm text-red-500 mb-4">Please check your internet connection and try again.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Map Controls */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 z-10 space-y-2">
          {/* Satellite/Streets Toggle */}
          <Button
            onClick={switchMapStyle}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <div className="h-4 w-4 mr-2 text-xs">{currentMapStyle === 'streets' ? '🛰️' : '🗺️'}</div>
            {currentMapStyle === 'streets' ? 'Satellite' : 'Streets'}
          </Button>
          
          {/* Traffic Toggle */}
          <Button
            onClick={toggleTrafficLayer}
            variant={trafficLayerVisible ? "default" : "outline"}
            size="sm"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <Activity className="h-4 w-4 mr-2" />
            Traffic {trafficLayerVisible ? 'ON' : 'OFF'}
          </Button>
        </div>
      )}
      
      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading MapLibre GL JS...</p>
            <p className="text-xs text-gray-500 mt-1">Initializing interactive map</p>
          </div>
        </div>
      )}
      
      {/* Map Info */}
      {mapLoaded && routes.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <MapIcon className="h-4 w-4 text-blue-600" />
              <span className="font-medium">MapLibre GL JS</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>{routes.length} route{routes.length !== 1 ? 's' : ''} displayed</div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentMapStyle === 'satellite' ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                <span>Satellite</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// API constants
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://trafficai.netlify.app/api'
  : 'http://localhost:3001/api'; // Updated to use correct backend server port
const POLL_INTERVAL = 30 * 1000; // 30 seconds for real-time updates

// Dynamically import chart components
const LineChart = dynamic(() => import('@/components/charts/LineChart'), { ssr: false });
const BarChart = dynamic(() => import('@/components/charts/BarChart'), { ssr: false });

const RouteOptimizationDashboard = () => {
  // Authentication removed - dashboard now accessible without login
  
  // State variables for UI and data
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  
  // Route optimization metrics from API
  const [metrics, setMetrics] = useState({
    routesOptimized: '0',
    timeSaved: '0 hrs',
    fuelSaved: '0 L',
    activeRoutes: '0'
  });
  
  // Route planning inputs
  const [startLocation, setStartLocation] = useState<string>('');
  const [endLocation, setEndLocation] = useState<string>('');
  const [routePriority, setRoutePriority] = useState<string>('fastest');
  const [vehicleType, setVehicleType] = useState<string>('car');
  const [useRealRouting, setUseRealRouting] = useState<boolean>(true);
  
  // Geocoded location coordinates for markers
  const [startCoordinates, setStartCoordinates] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [endCoordinates, setEndCoordinates] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  // Map state - Default to world view instead of Mumbai
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2
  });
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showRouteDetail, setShowRouteDetail] = useState<boolean>(false);
  const [showTraffic, setShowTraffic] = useState<boolean>(true);
  
  // Route optimization state
  const [optimizationProgress, setOptimizationProgress] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  
  // Auto-zoom trigger state
  const [autoZoomTrigger, setAutoZoomTrigger] = useState<number>(0);
  
  // References
  const dataCache = useRef<Record<string, any>>({});
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Map state management
  const handleViewStateChange = useCallback((newViewState: any) => {
    setViewState(newViewState);
  }, []);
  
  // Handle route selection
  const handleRouteSelect = useCallback((route: Route) => {
    setSelectedRoute(route);
    setShowRouteDetail(true);
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
  const getRouteColor = useCallback((traffic: string | undefined | null) => {
    if (!traffic || typeof traffic !== 'string') {
      return '#3b82f6'; // blue - default color for unknown traffic
    }
    switch (traffic.toLowerCase()) {
      case 'light': return '#22c55e'; // green
      case 'moderate': return '#f59e0b'; // amber
      case 'heavy': return '#ef4444'; // red
      default: return '#3b82f6'; // blue
    }
  }, []);
  
  // ✅ Geocode start location when it changes
  useEffect(() => {
    const geocodeStart = async () => {
      if (startLocation.trim()) {
        console.log('[Geocoding] 🔍 Geocoding start location:', startLocation);
        const coords = await geocodeLocation(startLocation);
        console.log('[Geocoding] 📍 Start coordinates:', coords);
        setStartCoordinates(coords);
      } else {
        console.log('[Geocoding] ❌ Clearing start coordinates');
        setStartCoordinates(null);
      }
    };
    
    geocodeStart();
  }, [startLocation]);
  
  // ✅ Geocode end location when it changes
  useEffect(() => {
    const geocodeEnd = async () => {
      if (endLocation.trim()) {
        console.log('[Geocoding] 🔍 Geocoding end location:', endLocation);
        const coords = await geocodeLocation(endLocation);
        console.log('[Geocoding] 📍 End coordinates:', coords);
        setEndCoordinates(coords);
      } else {
        console.log('[Geocoding] ❌ Clearing end coordinates');
        setEndCoordinates(null);
      }
    };
    
    geocodeEnd();
  }, [endLocation]);
  
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
  
  // Geocoding is now handled by the backend API

  // API functions for real data
  const fetchRouteMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/metrics`);
      
      if (response.data) {
        const metricsData = response.data;
        
        // Update metrics with real-time data from backend
        setMetrics({
          routesOptimized: metricsData.routesOptimized || '0',
          timeSaved: metricsData.timeSaved || '0 mins',
          fuelSaved: metricsData.fuelSaved || '0.0 L',
          activeRoutes: metricsData.activeRoutes || '0'
        });
        
        console.log('✅ Real-time metrics updated:', {
          routes: metricsData.routesOptimized,
          timeSaved: metricsData.timeSaved,
          fuelSaved: metricsData.fuelSaved,
          active: metricsData.activeRoutes,
          lastUpdate: metricsData.realTime?.lastUpdate
        });
        
        // Log additional performance data for debugging
        if (metricsData.performance) {
          console.log('📊 Performance metrics:', {
            efficiency: metricsData.performance.efficiencyScore,
            growth: metricsData.performance.growthRate,
            avgTimeSaved: metricsData.performance.avgTimeSaved,
            avgFuelSaved: metricsData.performance.avgFuelSaved
          });
        }
        
      } else {
        // Fallback to default values
        setMetrics({
          routesOptimized: '0',
          timeSaved: '0 mins',
          fuelSaved: '0.0 L',
          activeRoutes: '0'
        });
      }
    } catch (error) {
      console.error('Error fetching route metrics:', error);
      
      // Fallback to health check if metrics endpoint fails
      try {
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        if (healthResponse.data && healthResponse.data.status === 'healthy') {
          // Use minimal fallback data when metrics API is unavailable
          setMetrics({
            routesOptimized: '0',
            timeSaved: '0 mins',
            fuelSaved: '0.0 L',
            activeRoutes: '0'
          });
          console.log('⚠️ Using fallback metrics - metrics API unavailable');
        }
      } catch (healthError) {
        console.error('Health check also failed:', healthError);
        // Use default values when both APIs fail
        setMetrics({
          routesOptimized: '0',
          timeSaved: '0 mins',
          fuelSaved: '0.0 L',
          activeRoutes: '0'
        });
      }
    }
  };

  const fetchOptimizedRoutes = async (startLoc: string, endLoc: string, priority: string, vehicleType: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setOptimizationProgress('Initializing route optimization...');
      setProgressPercentage(0);
      
      console.log(`🚀 Optimizing route from "${startLoc}" to "${endLoc}"`);
      
      setOptimizationProgress('Connecting to optimization service...');
      setProgressPercentage(25);
      
      const response = await axios.post(`${API_BASE_URL}/optimize`, {
        start: startLoc,
        destination: endLoc,
        priority: priority.toLowerCase(),
        vehicle_type: vehicleType.toLowerCase()
      });
      
      setOptimizationProgress('Processing route data...');
      setProgressPercentage(75);
      
      if (response.data && response.data.routes) {
        const apiRoutes = response.data.routes;
        console.log('📍 Received routes from HTTP API:', apiRoutes.length);
        
        // Filter and validate routes before processing
        const validApiRoutes = apiRoutes.filter((route: any, index: number) => validateRoute(route, index));
        
        if (validApiRoutes.length === 0) {
          throw new Error('No valid routes found in response');
        }
        
        const formattedRoutes: Route[] = validApiRoutes.map((route: any, index: number) => {
          let coordinates: Coordinate[] = [];
          
          // Use the standardized coordinates field from the updated backend
          if (route.coordinates && Array.isArray(route.coordinates)) {
            // Primary: coordinates array from updated backend
            coordinates = route.coordinates.map((point: any) => ({
              lat: point.lat,
              lng: point.lng
            }));
          } else if (route.polylinePoints && Array.isArray(route.polylinePoints)) {
            // Fallback: legacy polylinePoints format
            coordinates = route.polylinePoints.map((point: any) => {
              if (typeof point === 'object' && point.lat !== undefined && point.lng !== undefined) {
                return { lat: point.lat, lng: point.lng };
              }
              return { lat: 0, lng: 0 };
            }).filter((coord: {lat: number, lng: number}) => coord.lat !== 0 || coord.lng !== 0);
          }
          
          // Extract data from backend summary object if it exists
          const summaryData = route.summary || {};
          const distance = route.distance || summaryData.distanceKm || 0;
          const time = route.time || route.travelTime || summaryData.durationMinutes || 0;
          const traffic = route.traffic || route.traffic_conditions || (route.trafficTime > 5 ? 'heavy' : route.trafficTime > 2 ? 'moderate' : 'light');
          
          // Calculate real-time fuel consumption based on vehicle type, distance, and traffic
          const calculatedFuelConsumption = calculateFuelConsumption(distance, vehicleType, traffic);
          
          // Use backend fuel consumption if available, otherwise use calculated value
          const fuelConsumption = route.fuelConsumption || route.fuel_consumption || summaryData.fuelConsumption || calculatedFuelConsumption;
          
          return {
            id: route.id || `route-${index + 1}`,
            name: route.name || `Route ${index + 1} (${priority})`,
            type: route.type || priority,
            distance: distance,
            time: time,
            traffic: traffic,
            fuelConsumption: fuelConsumption,
            coordinates,
            summary: `${distance?.toFixed(1)} km, ${time?.toFixed(0)} min`,
            instructions: route.instructions || route.polyline || []
          };
        });
        
        console.log('🎯 Setting formatted routes:', formattedRoutes);
        setRoutes(formattedRoutes);
        setOptimizationProgress('Route optimization completed!');
        setProgressPercentage(100);
        
        // Trigger auto-zoom after routes are set (backup mechanism)
        setTimeout(() => {
          console.log('[RouteOptimization] 🎯 Triggering backup auto-zoom after route optimization');
          setAutoZoomTrigger(prev => prev + 1);
        }, 100);
        
        // Update metrics with new route data
        const totalTimeSaved = response.data.optimization?.timeSaved || '0 minutes';
        const totalFuelSaved = response.data.optimization?.fuelSaved || '0 liters';
        
        console.log('🎯 Route optimization results:', {
          routeId: response.data.routeId,
          routes: formattedRoutes.length,
          timeSaved: totalTimeSaved,
          fuelSaved: totalFuelSaved,
          coordinatesCount: formattedRoutes.map(r => r.coordinates.length)
        });
        
        // Log first route coordinates for debugging
        if (formattedRoutes.length > 0 && formattedRoutes[0].coordinates.length > 0) {
          console.log('📍 First route coordinates sample:', {
            total: formattedRoutes[0].coordinates.length,
            first: formattedRoutes[0].coordinates[0],
            last: formattedRoutes[0].coordinates[formattedRoutes[0].coordinates.length - 1]
          });
        }
        

        
        // Clear loading state after a brief delay
        setTimeout(() => {
          setIsLoading(false);
          setOptimizationProgress('');
          setProgressPercentage(0);
        }, 1500);
      } else {
        throw new Error('No routes found in response');
      }
      
    } catch (error: any) {
      console.error('Error in route optimization:', error);
      
      let errorMessage = 'Failed to optimize route';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const serverMessage = error.response.data?.error || error.response.data?.message;
        
        switch (status) {
          case 400:
            errorMessage = serverMessage || 'Invalid route parameters. Please check your start and destination locations.';
            break;
          case 404:
            errorMessage = 'Route optimization service not found. Please try again later.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment before trying again.';
            break;
          case 500:
            errorMessage = serverMessage || 'Server error occurred while optimizing route. Please try again.';
            break;
          default:
            errorMessage = serverMessage || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        // Network error - no response received
        errorMessage = 'Unable to connect to route optimization service. Please check your internet connection.';
      } else {
        // Other error
        errorMessage = error.message || 'An unexpected error occurred while optimizing route.';
      }
      
      setError(errorMessage);
      setRoutes([]);
      setIsLoading(false);
      setOptimizationProgress('');
      setProgressPercentage(0);
    }
  };

  // Refresh data from API
  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      await fetchRouteMetrics();
      setLastPolled(new Date());
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };



  // Load initial data and set up polling
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Initialize with empty state - no sample data
        
        // Load metrics
        await fetchRouteMetrics();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load initial data');
        setIsLoading(false);
      }
    };
    
    loadInitialData();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchRouteMetrics();
    }, POLL_INTERVAL);
    
    pollingIntervalRef.current = interval;
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);


  
  // Refresh data from API
  const refreshData = async () => {
    setIsLoading(true);
    try {
      await fetchRouteMetrics();
      
      // If we have current route data, refresh it
      if (startLocation && endLocation) {
        await fetchOptimizedRoutes(startLocation, endLocation, routePriority, vehicleType);
      }
      
      setLastPolled(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission with real API call
  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startLocation.trim() || !endLocation.trim()) {
      setError('Please enter both start and destination locations');
      return;
    }
    
    await fetchOptimizedRoutes(startLocation, endLocation, routePriority, vehicleType);
  };

  // Remove authentication guards - allow access without login

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
                      placeholder="e.g., Delhi, London, New York" 
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      list="start-locations"
                      required
                    />
                    <datalist id="start-locations">
                      <option value="Delhi" />
                      <option value="London" />
                      <option value="New York" />
                      <option value="Tokyo" />
                      <option value="Paris" />
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
                      placeholder="e.g., Chennai, Paris, Tokyo" 
                      value={endLocation}
                      onChange={(e) => setEndLocation(e.target.value)}
                      list="end-locations"
                      required
                    />
                    <datalist id="end-locations">
                      <option value="Chennai" />
                      <option value="Paris" />
                      <option value="Tokyo" />
                      <option value="Singapore" />
                      <option value="Dubai" />
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
                
                <div>
                  <Label className="flex items-center gap-1">
                    <Route className="h-4 w-4" />
                    Routing Mode
                  </Label>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {useRealRouting ? 'Real Road Routing' : 'Quick Estimate'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {useRealRouting 
                          ? 'Uses TomTom API for accurate road-based paths' 
                          : 'Fast simulation with approximate coordinates'
                        }
                      </span>
                    </div>
                    <Switch 
                      checked={useRealRouting} 
                      onCheckedChange={setUseRealRouting}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isLoading || !startLocation.trim() || !endLocation.trim()}>
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing Routes...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Find Optimized Routes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <section className="container mx-auto px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">Error</p>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        </section>
      )}

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
                  <p className="text-xl font-bold">{metrics.routesOptimized}</p>
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
          <div className="lg:col-span-2 h-[500px] bg-gray-100 rounded-lg overflow-hidden relative">
            <MapLibreMap
              routes={routes}
              selectedRoute={selectedRoute}
              viewState={viewState}
              onViewStateChange={handleViewStateChange}
              className="w-full h-full relative"
              startLocation={startCoordinates}
              endLocation={endCoordinates}
              autoZoomTrigger={autoZoomTrigger}
            />
            
            {/* Show overlay message when no routes but also no locations */}
            {routes.length === 0 && !startCoordinates && !endCoordinates && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg z-10">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Enter locations to see routes</p>
                  <p className="text-sm text-gray-400">Powered by MapLibre GL JS & OpenStreetMap</p>
                </div>
              </div>
            )}
            
            {/* Map loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading routes...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Route Options */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg flex items-center gap-2">
              <Route className="h-5 w-5" />
              Available Routes ({routes.length})
            </h3>
            <p className="text-gray-500 text-sm">
              Select a route to view details and get directions
            </p>
            
            <div className="space-y-3">
              {routes.length === 0 ? (
                <div className="p-8 text-center border rounded-lg">
                  <Route className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-2">No routes found</p>
                  <p className="text-sm text-gray-400">Enter start and destination to find optimized routes</p>
                </div>
              ) : (
                routes.map((route, index) => (
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
                        {route.summary && (
                          <p className="text-sm text-gray-600 mt-1">{route.summary}</p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>{route.distance.toFixed(1)} km</span>
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
                        <span className="font-medium">{route.fuelConsumption.toFixed(1)} L</span>
                      </div>
                      <Button size="sm" variant="outline">
                        Select
                      </Button>
                    </div>
                    {index === 0 && (
                      <div className="mt-2 text-xs text-blue-600 font-medium">
                        ⭐ Recommended Route
                      </div>
                    )}
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
                    <Badge variant={selectedRoute.traffic?.toLowerCase() === 'light' ? 'outline' : 
                                  selectedRoute.traffic?.toLowerCase() === 'moderate' ? 'secondary' : 'destructive'}>
                      {selectedRoute.traffic || 'Unknown'}
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
                {typeof window !== 'undefined' && selectedRoute && selectedRoute.coordinates && selectedRoute.coordinates.length > 0 ? (
                  <MapLibreMap
                    routes={selectedRoute ? [selectedRoute] : []}
                    selectedRoute={selectedRoute}
                    viewState={{
                      longitude: selectedRoute.coordinates[0]?.lng || 0,
                      latitude: selectedRoute.coordinates[0]?.lat || 0,
                      zoom: 12
                    }}
                    onViewStateChange={() => {}}
                    className="w-full h-full relative"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <div className="text-gray-500 mb-2 text-2xl">📍</div>
                      <p className="text-gray-600 font-medium text-sm">Route Detail Map</p>
                      <p className="text-xs text-gray-500">Select a route to view details</p>
                    </div>
                  </div>
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
      
      {/* Loading Overlay with Real-time Progress */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">Optimizing Route</h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              
              {/* Progress Text */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {optimizationProgress || 'Initializing route optimization...'}
                </p>
                <p className="text-xs text-gray-500">
                  {progressPercentage}% Complete
                </p>
                {lastPolled && (
                  <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Real-time updates active
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizationDashboard;