import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import { Spinner } from 'react-bootstrap';

const RouteMap = ({ routeOptions, selectedRoute, startLocation, destination }) => {
  const [mapRef, setMapRef] = useState(null);
  const [center, setCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // Default to center of India
  const [zoom, setZoom] = useState(5);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [apiKey, setApiKey] = useState(process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '');

  // Map container style
  const mapContainerStyle = {
    width: '100%',
    height: '500px'
  };

  // Update map center and zoom when route options change
  useEffect(() => {
    if (routeOptions && routeOptions.length > 0) {
      // Find the bounds of all routes
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add start and destination to bounds if available
      if (startLocation) bounds.extend(startLocation);
      if (destination) bounds.extend(destination);
      
      // Add all route points to bounds
      routeOptions.forEach(route => {
        if (route.polyline && route.polyline.length > 0) {
          route.polyline.forEach(point => {
            bounds.extend(point);
          });
        }
      });
      
      // Fit map to bounds
      if (mapRef) {
        mapRef.fitBounds(bounds);
      }
    } else if (startLocation && destination) {
      // If we have start and destination but no routes yet
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(startLocation);
      bounds.extend(destination);
      
      if (mapRef) {
        mapRef.fitBounds(bounds);
      }
    }
  }, [routeOptions, startLocation, destination, mapRef]);

  // Handle map load
  const handleMapLoad = (map) => {
    setMapRef(map);
  };

  // Handle polyline click
  const handlePolylineClick = (route) => {
    setSelectedSegment(route);
  };

  // Get polyline options based on route type and traffic level
  const getPolylineOptions = (route) => {
    // Default options
    const options = {
      strokeWeight: selectedRoute && selectedRoute.id === route.id ? 5 : 3,
      strokeOpacity: selectedRoute && selectedRoute.id === route.id ? 1 : 0.7,
      zIndex: selectedRoute && selectedRoute.id === route.id ? 10 : 1
    };
    
    // Set color based on route type or traffic level
    if (route.trafficColor) {
      options.strokeColor = route.trafficColor;
    } else {
      // Default colors by route type
      switch (route.type) {
        case 'fastest':
          options.strokeColor = '#0088FF'; // Blue
          break;
        case 'shortest':
          options.strokeColor = '#00C853'; // Green
          break;
        case 'eco':
          options.strokeColor = '#76FF03'; // Light green
          break;
        case 'scenic':
          options.strokeColor = '#AA00FF'; // Purple
          break;
        default:
          options.strokeColor = '#757575'; // Gray
      }
    }
    
    return options;
  };

  // If no API key is available
  if (!apiKey) {
    return (
      <div className="text-center py-5">
        <p>Google Maps API key is not configured.</p>
        <p className="text-muted">Please add REACT_APP_GOOGLE_MAPS_API_KEY to your environment variables.</p>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} loadingElement={<div className="text-center py-5"><Spinner animation="border" /></div>}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={handleMapLoad}
        options={{
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          zoomControl: true
        }}
      >
        {/* Start Marker */}
        {startLocation && (
          <Marker
            position={startLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new window.google.maps.Size(40, 40)
            }}
            title="Start Location"
          />
        )}
        
        {/* Destination Marker */}
        {destination && (
          <Marker
            position={destination}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(40, 40)
            }}
            title="Destination"
          />
        )}
        
        {/* Route Polylines */}
        {routeOptions && routeOptions.map((route) => (
          <Polyline
            key={route.id}
            path={route.polyline || []}
            options={getPolylineOptions(route)}
            onClick={() => handlePolylineClick(route)}
          />
        ))}
        
        {/* Info Window for selected segment */}
        {selectedSegment && (
          <InfoWindow
            position={selectedSegment.polyline ? selectedSegment.polyline[Math.floor(selectedSegment.polyline.length / 2)] : center}
            onCloseClick={() => setSelectedSegment(null)}
          >
            <div style={{ padding: '5px', maxWidth: '200px' }}>
              <h6>{selectedSegment.type.charAt(0).toUpperCase() + selectedSegment.type.slice(1)} Route</h6>
              <p className="mb-1"><strong>Distance:</strong> {selectedSegment.distanceText}</p>
              <p className="mb-1"><strong>Duration:</strong> {selectedSegment.durationText}</p>
              <p className="mb-0"><strong>Traffic:</strong> {selectedSegment.trafficLevel || 'Unknown'}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default RouteMap;