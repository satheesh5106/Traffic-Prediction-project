import React, { useState } from 'react';
import { Card, Table, Badge, Button, Modal, Spinner, Form, InputGroup } from 'react-bootstrap';
import { Search, GeoAlt, ArrowRight } from 'react-bootstrap-icons';

const TrafficList = ({ trafficData, activeTab, isLoading }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'level',
    direction: 'desc'
  });

  // Handle view details click
  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted and filtered data
  const getSortedData = () => {
    if (!trafficData) return [];
    
    let dataToSort = [];
    
    // Extract data based on active tab
    if (activeTab === 'live' || activeTab === 'predicted') {
      dataToSort = trafficData.trafficData || [];
    } else if (activeTab === 'historical' && Array.isArray(trafficData.trafficData) && trafficData.trafficData.length > 0) {
      // For historical, use the first day's data
      dataToSort = trafficData.trafficData[0]?.data || [];
    }
    
    // Filter by search term
    const filteredData = dataToSort.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.level?.toLowerCase().includes(searchLower) ||
        item.id?.toLowerCase().includes(searchLower) ||
        (item.coordinates && (
          item.coordinates.lat.toString().includes(searchTerm) ||
          item.coordinates.lng.toString().includes(searchTerm)
        ))
      );
    });
    
    // Sort data
    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Get traffic level badge
  const getTrafficLevelBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'light':
        return <Badge bg="success">Light</Badge>;
      case 'moderate':
        return <Badge bg="warning" text="dark">Moderate</Badge>;
      case 'heavy':
        return <Badge bg="danger">Heavy</Badge>;
      case 'severe':
        return <Badge bg="dark">Severe</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  // Render table header with sort indicators
  const renderSortableHeader = (key, label) => {
    return (
      <th 
        className="cursor-pointer" 
        onClick={() => handleSort(key)}
        style={{ cursor: 'pointer' }}
      >
        {label}
        {sortConfig.key === key && (
          <span className="ms-1">
            {sortConfig.direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </th>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="mt-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading traffic data...</p>
        </Card.Body>
      </Card>
    );
  }

  // No data state
  if (!trafficData || !trafficData.trafficData || trafficData.trafficData.length === 0) {
    return (
      <Card className="mt-4">
        <Card.Body className="text-center py-5">
          <p>No traffic data available.</p>
        </Card.Body>
      </Card>
    );
  }

  const sortedData = getSortedData();

  return (
    <>
      <Card className="mt-4">
        <Card.Header className="bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              {activeTab === 'live' && 'Live Traffic Segments'}
              {activeTab === 'predicted' && 'Predicted Traffic Segments'}
              {activeTab === 'historical' && 'Historical Traffic Segments'}
            </h5>
            <InputGroup className="w-auto">
              <InputGroup.Text>
                <Search />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
                style={{ width: '200px' }}
              />
            </InputGroup>
          </div>
        </Card.Header>
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead>
              <tr>
                <th>ID</th>
                {renderSortableHeader('level', 'Traffic Level')}
                <th>Location</th>
                {activeTab !== 'historical' && renderSortableHeader('speed', 'Speed')}
                {renderSortableHeader('distance', 'Distance')}
                {activeTab !== 'historical' && renderSortableHeader('eta', 'ETA')}
                {activeTab !== 'live' && renderSortableHeader('confidence', 'Confidence')}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{getTrafficLevelBadge(item.level)}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <GeoAlt className="me-1" />
                      {item.coordinates ? (
                        <span>
                          {item.coordinates.lat.toFixed(4)}, {item.coordinates.lng.toFixed(4)}
                        </span>
                      ) : 'N/A'}
                    </div>
                  </td>
                  {activeTab !== 'historical' && (
                    <td>{item.speed ? `${item.speed} km/h` : 'N/A'}</td>
                  )}
                  <td>{item.distance ? `${item.distance} km` : 'N/A'}</td>
                  {activeTab !== 'historical' && (
                    <td>{item.eta || 'N/A'}</td>
                  )}
                  {activeTab !== 'live' && (
                    <td>{item.confidence || 'N/A'}</td>
                  )}
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleViewDetails(item)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <Card.Footer className="bg-white">
          <small className="text-muted">
            Showing {sortedData.length} of {trafficData.trafficData?.length || 0} traffic segments
          </small>
        </Card.Footer>
      </Card>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Traffic Segment Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <div className="mb-4">
                <h5>Basic Information</h5>
                <Table bordered>
                  <tbody>
                    <tr>
                      <th width="30%">Segment ID</th>
                      <td>{selectedItem.id}</td>
                    </tr>
                    <tr>
                      <th>Traffic Level</th>
                      <td>{getTrafficLevelBadge(selectedItem.level)}</td>
                    </tr>
                    <tr>
                      <th>Coordinates</th>
                      <td>
                        {selectedItem.coordinates ? (
                          <span>
                            {selectedItem.coordinates.lat.toFixed(6)}, {selectedItem.coordinates.lng.toFixed(6)}
                          </span>
                        ) : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <th>Last Updated</th>
                      <td>
                        {selectedItem.timestamp ? new Date(selectedItem.timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>

              <div className="mb-4">
                <h5>Traffic Metrics</h5>
                <Table bordered>
                  <tbody>
                    <tr>
                      <th width="30%">Speed</th>
                      <td>{selectedItem.speed ? `${selectedItem.speed} km/h` : 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Distance</th>
                      <td>{selectedItem.distance ? `${selectedItem.distance} km` : 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Estimated Travel Time</th>
                      <td>{selectedItem.eta || 'N/A'}</td>
                    </tr>
                    {activeTab !== 'live' && (
                      <tr>
                        <th>Prediction Confidence</th>
                        <td>{selectedItem.confidence || 'N/A'}</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Additional information for different tabs */}
              {activeTab === 'predicted' && (
                <div className="alert alert-info">
                  <h6>Prediction Information</h6>
                  <p className="mb-0">
                    This traffic prediction is based on historical patterns, current conditions, and machine learning models.
                    The confidence level indicates the reliability of this prediction.
                  </p>
                </div>
              )}

              {activeTab === 'historical' && (
                <div className="alert alert-secondary">
                  <h6>Historical Data</h6>
                  <p className="mb-0">
                    This data represents past traffic conditions and can be used to identify patterns and trends.
                    Compare with current predictions to understand traffic evolution.
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {activeTab === 'live' && (
            <Button variant="primary">
              Navigate <ArrowRight className="ms-1" />
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TrafficList;