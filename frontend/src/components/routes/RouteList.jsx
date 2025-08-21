import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import { Clock, Speedometer, GeoAlt, Fuel } from 'react-bootstrap-icons';

const RouteList = ({ routes, onRouteSelect, selectedRoute, isActiveRoutes }) => {
  if (!routes || routes.length === 0) {
    return (
      <p className="text-center text-muted py-3">
        No routes available.
      </p>
    );
  }

  // Get badge variant based on traffic level
  const getTrafficBadgeVariant = (level) => {
    switch (level?.toLowerCase()) {
      case 'light': return 'success';
      case 'moderate': return 'warning';
      case 'heavy': return 'danger';
      case 'severe': return 'dark';
      default: return 'secondary';
    }
  };

  // Get route type display name
  const getRouteTypeDisplay = (type) => {
    switch (type) {
      case 'fastest': return 'Fastest Route';
      case 'shortest': return 'Shortest Route';
      case 'eco': return 'Eco-Friendly Route';
      case 'scenic': return 'Scenic Route';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Get route card border color based on type
  const getRouteBorderColor = (type) => {
    switch (type) {
      case 'fastest': return 'primary';
      case 'shortest': return 'success';
      case 'eco': return 'info';
      case 'scenic': return 'purple';
      default: return 'secondary';
    }
  };

  return (
    <div className="route-list">
      {routes.map((route) => {
        const isSelected = selectedRoute && selectedRoute.id === route.id;
        const borderColor = getRouteBorderColor(route.type);
        
        return (
          <Card 
            key={route.id} 
            className={`mb-3 ${isSelected ? `border-${borderColor} border-2` : ''}`}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h5 className="mb-0">{getRouteTypeDisplay(route.type)}</h5>
                <Badge 
                  bg={getTrafficBadgeVariant(route.trafficLevel)}
                  className="ms-2"
                >
                  {route.trafficLevel || 'Unknown'} Traffic
                </Badge>
              </div>
              
              <Row className="mt-3">
                <Col xs={6} md={3} className="mb-2">
                  <div className="d-flex align-items-center">
                    <GeoAlt className="me-2 text-primary" />
                    <div>
                      <small className="text-muted d-block">Distance</small>
                      <strong>{route.distanceText || `${route.distance} km`}</strong>
                    </div>
                  </div>
                </Col>
                
                <Col xs={6} md={3} className="mb-2">
                  <div className="d-flex align-items-center">
                    <Clock className="me-2 text-success" />
                    <div>
                      <small className="text-muted d-block">Time</small>
                      <strong>{route.durationText || `${route.duration} min`}</strong>
                    </div>
                  </div>
                </Col>
                
                <Col xs={6} md={3} className="mb-2">
                  <div className="d-flex align-items-center">
                    <Fuel className="me-2 text-warning" />
                    <div>
                      <small className="text-muted d-block">Fuel</small>
                      <strong>{route.fuelText || `${route.fuelConsumption} L`}</strong>
                    </div>
                  </div>
                </Col>
                
                <Col xs={6} md={3} className="mb-2">
                  <div className="d-flex align-items-center">
                    <Speedometer className="me-2 text-info" />
                    <div>
                      <small className="text-muted d-block">Avg. Speed</small>
                      <strong>{route.averageSpeed || 'N/A'} km/h</strong>
                    </div>
                  </div>
                </Col>
              </Row>
              
              {isActiveRoutes && route.estimatedArrival && (
                <div className="mt-2 mb-3">
                  <small className="text-muted">Estimated Arrival:</small>
                  <strong className="ms-2">{route.estimatedArrival}</strong>
                </div>
              )}
              
              {!isActiveRoutes && onRouteSelect && (
                <div className="d-flex justify-content-end mt-3">
                  <Button
                    variant={isSelected ? borderColor : 'outline-primary'}
                    size="sm"
                    onClick={() => onRouteSelect(route)}
                    disabled={isSelected}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
};

export default RouteList;