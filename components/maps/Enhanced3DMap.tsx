'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Mountain, Building, Navigation, Maximize2, Minimize2, MapPin } from 'lucide-react';

// Dynamic import for Leaflet Map component
const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  { ssr: false }
);

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  padding?: any;
}

interface TrafficIncident {
  id: string;
  type: string;
  severity: string;
  location: string;
  coordinates: [number, number];
  description: string;
  timestamp: string;
  estimatedClearTime?: string;
  level?: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
  confidence?: string;
  eta?: string;
}

interface Enhanced3DMapProps {
  trafficData?: TrafficIncident[];
  selectedLocation?: TrafficIncident | null;
  onLocationSelect?: (location: TrafficIncident) => void;
  onLocationClose?: () => void;
  viewState: ViewState;
  onViewStateChange: (viewState: ViewState) => void;
  showTraffic?: boolean;
  showBuildings?: boolean;
  showTerrain?: boolean;
  mapStyle?: string;
  className?: string;
  // Route optimization props
  markers?: any[];
  routes?: any[];
  selectedRoute?: any;
  getRouteColor?: (traffic: string) => string;
  getRouteLineWidth?: (routeId: string) => number;
}

const Enhanced3DMap: React.FC<Enhanced3DMapProps> = ({
  trafficData = [],
  selectedLocation,
  onLocationSelect,
  onLocationClose,
  viewState,
  onViewStateChange,
  showTraffic = true,
  showBuildings = true,
  showTerrain = true,
  mapStyle,
  className = '',
  markers = [],
  routes = [],
  selectedRoute,
  getRouteColor,
  getRouteLineWidth
}) => {
  const mapRef = useRef<any>(null);
  const [is3DMode, setIs3DMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Enhanced 3D map style URL - Using free OpenStreetMap style
  const enhanced3DStyle = useMemo(() => {
    // Use free OpenStreetMap style that doesn't require API key
    return 'https://api.maptiler.com/maps/streets/style.json?key=demo'; // Updated for Leaflet compatibility
  }, []);

  // Building extrusion layer
  const buildingLayer = useMemo(() => ({
    id: 'building-extrusion',
    type: 'fill-extrusion' as const,
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    layout: {
      visibility: (showBuildings ? 'visible' : 'none') as 'visible' | 'none'
    },
    paint: {
      'fill-extrusion-color': '#2196f3',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 0.8
    }
  }), [showBuildings]);

  // Traffic flow layer
  const trafficFlowLayer = useMemo(() => ({
    id: 'traffic-flow',
    type: 'circle' as const,
    layout: {
      visibility: (showTraffic ? 'visible' : 'none') as 'visible' | 'none'
    },
    paint: {
      'circle-color': [
        'match',
        ['get', 'level'],
        'low', '#4ade80',
        'medium', '#fbbf24',
        'high', '#f97316',
        'critical', '#ef4444',
        '#6b7280'
      ] as any,
      'circle-radius': 8,
      'circle-opacity': 0.8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  }), [showTraffic]);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      
      // Enable 3D terrain and buildings (simplified for compatibility)
      try {
        if (showTerrain && map.getSource) {
          // Use free terrain tiles that don't require API key
          map.addSource('terrain-source', {
            type: 'raster-dem',
            tiles: ['https://cloud.maptiler.com/tiles/terrain-rgb/{z}/{x}/{y}.png'],
            tileSize: 256
          });
          
          if (map.setTerrain) {
            map.setTerrain({
              source: 'terrain-source',
              exaggeration: 1.2
            });
          }
        }

        // Add atmospheric effects if supported
        if (map.setFog) {
          map.setFog({
            'range': [0.8, 8],
            'color': '#ffffff',
            'horizon-blend': 0.1
          });
        }
      } catch (error) {
        console.warn('Advanced 3D features not supported:', error);
      }
    }
  }, [showTerrain]);

  // Toggle 3D mode
  const toggle3DMode = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      const newPitch = is3DMode ? 0 : 60;
      const newBearing = is3DMode ? 0 : -17.6;
      
      map.easeTo({
        pitch: newPitch,
        bearing: newBearing,
        duration: 1000
      });
      
      setIs3DMode(!is3DMode);
    }
  }, [is3DMode]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Get traffic level color
  const getTrafficLevelColor = useCallback((level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }, []);

  // Get traffic level icon
  const getTrafficLevelIcon = useCallback((level: string) => {
    switch (level) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }, []);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-40' : ''} ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Card className="p-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggle3DMode}
              className="flex items-center gap-1"
            >
              {is3DMode ? <Mountain className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
              {is3DMode ? '3D' : '2D'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-1"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
        
        {/* Layer Controls */}
        <Card className="p-2">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>Buildings</span>
              <Badge variant={showBuildings ? 'default' : 'secondary'}>
                {showBuildings ? 'ON' : 'OFF'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4" />
              <span>Terrain</span>
              <Badge variant={showTerrain ? 'default' : 'secondary'}>
                {showTerrain ? 'ON' : 'OFF'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Map Container */}
      <div className="w-full h-full">
        <LeafletMap
          center={[viewState.latitude, viewState.longitude]}
          zoom={viewState.zoom}
          markers={[
            ...trafficData.map(incident => ({
              id: incident.id,
              position: [incident.coordinates[1], incident.coordinates[0]] as [number, number],
              popup: `
                <div class="p-3 min-w-[200px]">
                  <h3 class="font-semibold text-sm mb-2">${incident.type}</h3>
                  <p class="text-xs text-gray-600 mb-2">${incident.location}</p>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="px-2 py-1 text-xs rounded ${incident.level === 'critical' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
                      ${incident.level}
                    </span>
                    <span class="text-xs text-gray-500">${incident.timestamp}</span>
                  </div>
                  <p class="text-xs">${incident.description}</p>
                  ${incident.estimatedClearTime ? `<p class="text-xs text-blue-600 mt-1">Est. Clear: ${incident.estimatedClearTime}</p>` : ''}
                </div>
              `
            })),
            ...markers.map(marker => ({
              id: marker.id,
              position: [marker.position[0], marker.position[1]] as [number, number],
              popup: `${marker.type === 'start' ? 'Start Point' : 'End Point'}`
            }))
          ]}
          polylines={routes.map((route, index) => ({
            id: `route-${index}`,
            positions: route.coordinates?.map((coord: any) => [coord.lat, coord.lng]) || [],
            color: getRouteColor?.(route.traffic) || '#3b82f6',
            weight: getRouteLineWidth?.(route.id) || 4
          }))}
          onMapClick={(lat, lng) => {
            onViewStateChange({
              ...viewState,
              latitude: lat,
              longitude: lng
            });
          }}
          className={className}
          height="100%"
        />
      </div>
    </div>
  );
};

export default Enhanced3DMap;