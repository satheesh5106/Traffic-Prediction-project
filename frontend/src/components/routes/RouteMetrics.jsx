import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { GeoAlt, Clock, Speedometer, Truck } from 'react-bootstrap-icons';

const RouteMetrics = ({ metrics }) => {
  // Default metrics if none provided
  const defaultMetrics = {
    routesOptimized: 0,
    timeSaved: '0 hrs',
    fuelEfficiency: '0%',
    activeRoutes: 0
  };

  // Use provided metrics or defaults
  const {
    routesOptimized,
    timeSaved,
    fuelEfficiency,
    activeRoutes
  } = metrics || defaultMetrics;

  // Metric cards data
  const metricCards = [
    {
      title: 'Routes Optimized',
      value: routesOptimized,
      icon: GeoAlt,
      color: 'primary',
      suffix: ''
    },
    {
      title: 'Time Saved',
      value: timeSaved,
      icon: Clock,
      color: 'success',
      suffix: ''
    },
    {
      title: 'Fuel Efficiency',
      value: fuelEfficiency,
      icon: Speedometer,
      color: 'info',
      suffix: ''
    },
    {
      title: 'Active Routes',
      value: activeRoutes,
      icon: Truck,
      color: 'warning',
      suffix: ''
    }
  ];

  return (
    <Row className="g-3">
      {metricCards.map((metric, index) => {
        const IconComponent = metric.icon;
        
        return (
          <Col key={index} md={6} xl={3}>
            <Card className={`border-${metric.color} mb-0 h-100`}>
              <Card.Body className="d-flex align-items-center">
                <div className={`bg-${metric.color} bg-opacity-10 p-3 rounded-3 me-3`}>
                  <IconComponent size={24} className={`text-${metric.color}`} />
                </div>
                <div>
                  <h6 className="text-muted mb-1">{metric.title}</h6>
                  <h4 className="mb-0">
                    {metric.value}{metric.suffix}
                  </h4>
                </div>
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default RouteMetrics;