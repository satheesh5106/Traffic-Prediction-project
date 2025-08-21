import React from 'react';
import { Card, Nav, Form, Row, Col } from 'react-bootstrap';

const TrafficTabs = ({ activeTab, onTabChange, timeParams, onTimeParamChange }) => {
  const handleTabSelect = (tab) => {
    onTabChange(tab);
  };

  const handleTimeParamChange = (e) => {
    const { name, value } = e.target;
    onTimeParamChange(name, parseInt(value, 10));
  };

  return (
    <Card>
      <Card.Header className="bg-white">
        <Nav variant="tabs" activeKey={activeTab} onSelect={handleTabSelect}>
          <Nav.Item>
            <Nav.Link eventKey="live" className="px-4">
              Live Traffic
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="predicted" className="px-4">
              Predicted Traffic
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="historical" className="px-4">
              Historical Traffic
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={12}>
            {activeTab === 'live' && (
              <div className="d-flex align-items-center">
                <span className="text-success me-2">●</span>
                <span>Live traffic data - updates automatically every 30 seconds</span>
              </div>
            )}
            
            {activeTab === 'predicted' && (
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-primary me-2">●</span>
                  <span>Predicted traffic data</span>
                </div>
                <Form.Group as={Row} className="align-items-center mb-0">
                  <Form.Label column sm="auto" className="me-2">
                    Hours ahead:
                  </Form.Label>
                  <Col sm="auto">
                    <Form.Select 
                      name="hoursAhead" 
                      value={timeParams.hoursAhead} 
                      onChange={handleTimeParamChange}
                      size="sm"
                      style={{ width: '80px' }}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="6">6</option>
                      <option value="12">12</option>
                      <option value="24">24</option>
                    </Form.Select>
                  </Col>
                </Form.Group>
              </div>
            )}
            
            {activeTab === 'historical' && (
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-secondary me-2">●</span>
                  <span>Historical traffic data</span>
                </div>
                <Form.Group as={Row} className="align-items-center mb-0">
                  <Form.Label column sm="auto" className="me-2">
                    Days back:
                  </Form.Label>
                  <Col sm="auto">
                    <Form.Select 
                      name="daysBack" 
                      value={timeParams.daysBack} 
                      onChange={handleTimeParamChange}
                      size="sm"
                      style={{ width: '80px' }}
                    >
                      <option value="1">1</option>
                      <option value="3">3</option>
                      <option value="7">7</option>
                      <option value="14">14</option>
                      <option value="30">30</option>
                    </Form.Select>
                  </Col>
                </Form.Group>
              </div>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default TrafficTabs;