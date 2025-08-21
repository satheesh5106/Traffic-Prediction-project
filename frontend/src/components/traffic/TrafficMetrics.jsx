import React from 'react';
import { Card, Row, Col, Spinner } from 'react-bootstrap';
import { 
  Clock, 
  BarChart, 
  Percent, 
  Lightning, 
  ExclamationTriangle 
} from 'react-bootstrap-icons';

const TrafficMetrics = ({ metrics }) => {
  if (!metrics) {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" variant="primary" size="sm" />
          <span className="ms-2">Loading metrics...</span>
        </Card.Body>
      </Card>
    );
  }

  const { lastUpdated, activePredictions, accuracy, responseTime, criticalAlerts } = metrics;

  // Format last updated time
  const formattedTime = new Date(lastUpdated).toLocaleTimeString();
  const formattedDate = new Date(lastUpdated).toLocaleDateString();

  return (
    <Card className="h-100 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Traffic Statistics</h5>
      </Card.Header>
      <Card.Body>
        <Row className="g-3">
          <Col xs={12}>
            <MetricItem 
              icon={<Clock className="text-info" />}
              label="Last Updated"
              value={`${formattedTime}`}
              subValue={formattedDate}
            />
          </Col>
          
          <Col xs={12}>
            <MetricItem 
              icon={<BarChart className="text-primary" />}
              label="Active Predictions"
              value={activePredictions}
            />
          </Col>
          
          <Col xs={12}>
            <MetricItem 
              icon={<Percent className="text-success" />}
              label="Prediction Accuracy"
              value={accuracy}
            />
          </Col>
          
          <Col xs={12}>
            <MetricItem 
              icon={<Lightning className="text-warning" />}
              label="Response Time"
              value={responseTime}
            />
          </Col>
          
          <Col xs={12}>
            <MetricItem 
              icon={<ExclamationTriangle className="text-danger" />}
              label="Critical Alerts"
              value={criticalAlerts}
              alertLevel={criticalAlerts > 0 ? 'danger' : 'success'}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// Helper component for individual metric items
const MetricItem = ({ icon, label, value, subValue, alertLevel }) => {
  return (
    <div className="d-flex align-items-center p-2 border-bottom">
      <div className="me-3 fs-4">
        {icon}
      </div>
      <div className="flex-grow-1">
        <div className="text-muted small">{label}</div>
        <div className={`fw-bold ${alertLevel ? `text-${alertLevel}` : ''}`}>
          {value}
          {subValue && <div className="text-muted small">{subValue}</div>}
        </div>
      </div>
    </div>
  );
};

export default TrafficMetrics;