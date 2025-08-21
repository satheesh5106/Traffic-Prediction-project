import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { routeApi } from '../../api/api-service';
import RouteMap from './RouteMap';
import RouteMetrics from './RouteMetrics';
import RouteList from './RouteList';
import RouteForm from './RouteForm';

const RouteDashboard = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [routeOptions, setRouteOptions] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [formData, setFormData] = useState({
    startLocation: '',
    destination: '',
    priority: 'fastest',
    vehicleType: 'car'
  });
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationSuccess, setOptimizationSuccess] = useState(false);
  const [routeSelectionSuccess, setRouteSelectionSuccess] = useState(false);

  // Fetch route metrics on component mount and periodically
  useEffect(() => {
    fetchRouteMetrics();
    
    // Set up interval to refresh metrics every 30 seconds
    const metricsInterval = setInterval(fetchRouteMetrics, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(metricsInterval);
  }, []);

  // Fetch active routes on component mount
  useEffect(() => {
    fetchActiveRoutes();
  }, []);

  // Fetch route metrics
  const fetchRouteMetrics = async () => {
    try {
      const response = await routeApi.getRouteMetrics();
      setMetrics(response.data);
    } catch (err) {
      console.error('Error fetching route metrics:', err);
      // Don't set error state here to avoid disrupting the UI
    }
  };

  // Fetch active routes
  const fetchActiveRoutes = async () => {
    try {
      setLoading(true);
      const response = await routeApi.getActiveRoutes();
      setActiveRoutes(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching active routes:', err);
      setError('Failed to load active routes. Please try again.');
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission for route optimization
  const handleOptimizeRoute = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setOptimizing(true);
    setOptimizationSuccess(false);
    setRouteOptions([]);
    setSelectedRoute(null);
    
    try {
      // Parse coordinates from input strings
      const startCoords = parseCoordinates(formData.startLocation);
      const destCoords = parseCoordinates(formData.destination);
      
      if (!startCoords || !destCoords) {
        throw new Error('Invalid coordinates format. Please use format: lat,lng (e.g., 12.9716,77.5946)');
      }
      
      // Call API to optimize route
      const response = await routeApi.optimizeRoute({
        start: startCoords,
        destination: destCoords,
        priority: formData.priority,
        vehicleType: formData.vehicleType
      });
      
      setRouteOptions(response.data.routes);
      setOptimizationSuccess(true);
      setOptimizing(false);
    } catch (err) {
      console.error('Error optimizing route:', err);
      setError(err.response?.data?.message || err.message || 'Failed to optimize route. Please try again.');
      setOptimizing(false);
    }
  };

  // Parse coordinates from string input
  const parseCoordinates = (coordString) => {
    try {
      const [lat, lng] = coordString.split(',').map(coord => parseFloat(coord.trim()));
      if (isNaN(lat) || isNaN(lng)) return null;
      return { lat, lng };
    } catch (err) {
      return null;
    }
  };

  // Handle route selection
  const handleRouteSelect = async (route) => {
    setSelectedRoute(route);
    setRouteSelectionSuccess(false);
    setError(null);
    
    try {
      await routeApi.saveRoute({
        routeId: route.id,
        routeType: route.type
      });
      setRouteSelectionSuccess(true);
      // Refresh active routes after selection
      fetchActiveRoutes();
    } catch (err) {
      console.error('Error saving route selection:', err);
      setError('Failed to save route selection. Please try again.');
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-4">Route Optimization</h2>
          <RouteMetrics metrics={metrics} />
        </Col>
      </Row>
      
      <Row>
        <Col lg={4} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Route Parameters</h5>
            </Card.Header>
            <Card.Body>
              <RouteForm 
                formData={formData}
                handleInputChange={handleInputChange}
                handleOptimizeRoute={handleOptimizeRoute}
                optimizing={optimizing}
              />
              
              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}
              
              {optimizationSuccess && (
                <Alert variant="success" className="mt-3">
                  Route optimization successful! Select a route option below.
                </Alert>
              )}
              
              {routeSelectionSuccess && (
                <Alert variant="success" className="mt-3">
                  Route selected successfully! You can view it in active routes.
                </Alert>
              )}
            </Card.Body>
          </Card>
          
          {/* Active Routes List */}
          <Card className="mt-4">
            <Card.Header>
              <h5 className="mb-0">Active Routes</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-3">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading active routes...</p>
                </div>
              ) : activeRoutes.length > 0 ? (
                <RouteList routes={activeRoutes} isActiveRoutes={true} />
              ) : (
                <p className="text-muted">No active routes found.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Route Map</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <RouteMap 
                routeOptions={routeOptions} 
                selectedRoute={selectedRoute}
                startLocation={parseCoordinates(formData.startLocation)}
                destination={parseCoordinates(formData.destination)}
              />
            </Card.Body>
          </Card>
          
          {/* Route Options */}
          {routeOptions.length > 0 && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Route Options</h5>
              </Card.Header>
              <Card.Body>
                <RouteList 
                  routes={routeOptions} 
                  onRouteSelect={handleRouteSelect} 
                  selectedRoute={selectedRoute}
                  isActiveRoutes={false}
                />
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default RouteDashboard;