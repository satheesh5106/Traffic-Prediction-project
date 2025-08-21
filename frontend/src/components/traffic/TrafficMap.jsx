import React, { useState, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, Button, Form, Spinner, Modal } from 'react-bootstrap';

// Map container style
const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px'
};

// Default center (India)
const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629
};

// Map options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

const TrafficMap = ({ trafficData, activeTab, onIncidentReport, isLoading }) => {
  const [mapRef, setMapRef] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentData, setIncidentData] = useState({
    location: null,
    type: 'congestion',
    description: '',
    severity: 'moderate'
  });
  const [reportStatus, setReportStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Click position for incident reporting
  const clickPositionRef = useRef(null);

  // Handle map load
  const handleMapLoad = (map) => {
    setMapRef(map);
  };

  // Center map on traffic data when it changes
  useEffect(() => {
    if (mapRef && trafficData) {
      // Center on city coordinates if available
      if (trafficData.cityName && trafficData.trafficData && trafficData.trafficData.length > 0) {
        // For historical data, structure is different
        if (activeTab === 'historical' && Array.isArray(trafficData.trafficData)) {
          // Use the first day's first segment
          const firstDay = trafficData.trafficData[0];
          if (firstDay && firstDay.data && firstDay.data.length > 0) {
            const firstSegment = firstDay.data[0];
            if (firstSegment && firstSegment.coordinates) {
              mapRef.setCenter(firstSegment.coordinates);
              mapRef.setZoom(12);
            }
          }
        } else if (Array.isArray(trafficData.trafficData)) {
          // For live and predicted data
          const firstSegment = trafficData.trafficData[0];
          if (firstSegment && firstSegment.coordinates) {
            mapRef.setCenter(firstSegment.coordinates);
            mapRef.setZoom(12);
          }
        }
      }
    }
  }, [mapRef, trafficData, activeTab]);

  // Handle map click for incident reporting
  const handleMapClick = (event) => {
    // Only allow incident reporting in live tab
    if (activeTab !== 'live') return;
    
    const clickPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    clickPositionRef.current = clickPosition;
    
    // Open incident modal
    setIncidentData({
      ...incidentData,
      location: clickPosition
    });
    setShowIncidentModal(true);
  };

  // Handle incident form input changes
  const handleIncidentInputChange = (e) => {
    const { name, value } = e.target;
    setIncidentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle incident form submission
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    
    if (!incidentData.location || !incidentData.type || !incidentData.description) {
      setReportStatus({
        success: false,
        message: 'Please fill all required fields'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await onIncidentReport(incidentData);
      setReportStatus(result);
      
      if (result.success) {
        // Close modal after 2 seconds on success
        setTimeout(() => {
          setShowIncidentModal(false);
          setReportStatus(null);
          setIncidentData({
            location: null,
            type: 'congestion',
            description: '',
            severity: 'moderate'
          });
        }, 2000);
      }
    } catch (error) {
      setReportStatus({
        success: false,
        message: 'An error occurred while reporting the incident'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render traffic data based on active tab
  const renderTrafficData = () => {
    if (!trafficData || isLoading) return null;
    
    switch (activeTab) {
      case 'live':
      case 'predicted':
        return renderTrafficSegments(trafficData.trafficData);
      case 'historical':
        // For historical data, render the first day's data by default
        if (Array.isArray(trafficData.trafficData) && trafficData.trafficData.length > 0) {
          const firstDay = trafficData.trafficData[0];
          return renderTrafficSegments(firstDay.data);
        }
        return null;
      default:
        return null;
    }
  };

  // Render traffic segments as polylines
  const renderTrafficSegments = (segments) => {
    if (!Array.isArray(segments)) return null;
    
    return segments.map((segment) => {
      // Create a simple polyline for each segment
      // In a real app, you would use actual polyline data from the API
      const path = [
        segment.coordinates,
        {
          lat: segment.coordinates.lat + (Math.random() - 0.5) * 0.01,
          lng: segment.coordinates.lng + (Math.random() - 0.5) * 0.01
        }
      ];
      
      return (
        <Polyline
          key={segment.id}
          path={path}
          options={{
            strokeColor: segment.color || '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 5,
            clickable: true
          }}
          onClick={() => setSelectedSegment(segment)}
        />
      );
    });
  };

  return (
    <Card>
      <Card.Body>
        <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={5}
            options={mapOptions}
            onLoad={handleMapLoad}
            onClick={handleMapClick}
          >
            {/* Render traffic data */}
            {renderTrafficData()}
            
            {/* Show info window for selected segment */}
            {selectedSegment && (
              <InfoWindow
                position={selectedSegment.coordinates}
                onCloseClick={() => setSelectedSegment(null)}
              >
                <div>
                  <h6>Traffic Information</h6>
                  <p><strong>Level:</strong> {selectedSegment.level}</p>
                  {selectedSegment.speed && (
                    <p><strong>Speed:</strong> {selectedSegment.speed} km/h</p>
                  )}
                  {selectedSegment.eta && (
                    <p><strong>ETA:</strong> {selectedSegment.eta}</p>
                  )}
                  {selectedSegment.confidence && (
                    <p><strong>Confidence:</strong> {selectedSegment.confidence}</p>
                  )}
                  {selectedSegment.timestamp && (
                    <p><strong>Updated:</strong> {new Date(selectedSegment.timestamp).toLocaleTimeString()}</p>
                  )}
                </div>
              </InfoWindow>
            )}
            
            {/* Show marker for incident location */}
            {showIncidentModal && incidentData.location && (
              <Marker
                position={incidentData.location}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }}
              />
            )}
          </GoogleMap>
        </LoadScript>
        
        {/* Incident Report Modal */}
        <Modal show={showIncidentModal} onHide={() => setShowIncidentModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Report Traffic Incident</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleIncidentSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Incident Type</Form.Label>
                <Form.Select
                  name="type"
                  value={incidentData.type}
                  onChange={handleIncidentInputChange}
                  required
                >
                  <option value="congestion">Congestion</option>
                  <option value="accident">Accident</option>
                  <option value="roadClosure">Road Closure</option>
                  <option value="construction">Construction</option>
                  <option value="event">Event</option>
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  name="description"
                  value={incidentData.description}
                  onChange={handleIncidentInputChange}
                  placeholder="Describe the incident..."
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Severity</Form.Label>
                <Form.Select
                  name="severity"
                  value={incidentData.severity}
                  onChange={handleIncidentInputChange}
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="severe">Severe</option>
                </Form.Select>
              </Form.Group>
              
              {reportStatus && (
                <div className={`alert alert-${reportStatus.success ? 'success' : 'danger'} mt-3`}>
                  {reportStatus.message}
                </div>
              )}
              
              <div className="d-flex justify-content-end mt-4">
                <Button
                  variant="secondary"
                  className="me-2"
                  onClick={() => setShowIncidentModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span className="ms-2">Submitting...</span>
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
      </Card.Body>
    </Card>
  );
};

export default TrafficMap;