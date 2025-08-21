'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Mountain, Building, Navigation, Maximize2, Minimize2, MapPin } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    position: [number, number];
    popup?: string;
    icon?: string;
  }>;
  polylines?: Array<{
    id: string;
    positions: [number, number][];
    color?: string;
    weight?: number;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  height?: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 13,
  markers = [],
  polylines = [],
  onMapClick,
  className = '',
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState('streets');
  const [showBuildings, setShowBuildings] = useState(true);
  const [showTerrain, setShowTerrain] = useState(false);

  // Map style configurations
  const mapStyles = {
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false
    });

    // Add tile layer
    L.tileLayer(mapStyles[mapStyle as keyof typeof mapStyles], {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add custom controls
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    // Add scale control
    L.control.scale({ position: 'bottomleft' }).addTo(map);

    // Handle map clicks
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map style
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    L.tileLayer(mapStyles[mapStyle as keyof typeof mapStyles], {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapInstanceRef.current);
  }, [mapStyle]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      // Validate marker position
      if (!markerData.position || !Array.isArray(markerData.position) || markerData.position.length < 2) {
        console.warn('Invalid marker position:', markerData);
        return;
      }
      
      const [lat, lng] = markerData.position;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid marker coordinates:', markerData);
        return;
      }
      
      const marker = L.marker([lat, lng]);
      
      if (markerData.popup) {
        marker.bindPopup(markerData.popup);
      }
      
      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
  }, [markers]);

  // Update polylines
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => {
      mapInstanceRef.current?.removeLayer(polyline);
    });
    polylinesRef.current = [];

    // Add new polylines
    polylines.forEach(polylineData => {
      // Validate positions data
      if (!polylineData.positions || !Array.isArray(polylineData.positions) || polylineData.positions.length === 0) {
        console.warn('Invalid polyline positions:', polylineData);
        return;
      }
      
      // Filter out invalid coordinates
      const validPositions = polylineData.positions.filter(pos => 
        Array.isArray(pos) && pos.length >= 2 && 
        typeof pos[0] === 'number' && typeof pos[1] === 'number' &&
        !isNaN(pos[0]) && !isNaN(pos[1])
      );
      
      if (validPositions.length === 0) {
        console.warn('No valid positions found for polyline:', polylineData);
        return;
      }
      
      const polyline = L.polyline(validPositions, {
        color: polylineData.color || '#3388ff',
        weight: polylineData.weight || 3
      });
      
      polyline.addTo(mapInstanceRef.current!);
      polylinesRef.current.push(polyline);
    });
  }, [polylines]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    }
  };

  const changeMapStyle = (style: string) => {
    setMapStyle(style);
  };

  return (
    <div className={`relative ${className}`} style={{ height: isFullscreen ? '100vh' : height }}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {/* Style Controls */}
        <Card className="p-2">
          <div className="flex gap-1">
            <Button
              variant={mapStyle === 'streets' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapStyle('streets')}
            >
              Streets
            </Button>
            <Button
              variant={mapStyle === 'satellite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapStyle('satellite')}
            >
              Satellite
            </Button>
            <Button
              variant={mapStyle === 'terrain' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapStyle('terrain')}
            >
              Terrain
            </Button>
            <Button
              variant={mapStyle === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMapStyle('dark')}
            >
              Dark
            </Button>
          </div>
        </Card>
        
        {/* View Controls */}
        <Card className="p-2">
          <div className="flex gap-1">
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
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ height: isFullscreen ? '100vh' : height }}
      />
    </div>
  );
};

export default LeafletMap;