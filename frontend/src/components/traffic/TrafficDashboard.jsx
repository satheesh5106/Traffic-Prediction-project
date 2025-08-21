import React, { useState, useEffect } from 'react';
import { trafficApi } from '../../api/api-service';
import TrafficMap from './TrafficMap';
import TrafficMetrics from './TrafficMetrics';
import TrafficTabs from './TrafficTabs';
import TrafficList from './TrafficList';
import CitySelector from '../common/CitySelector';
import { Alert, Spinner, Container, Row, Col } from 'react-bootstrap';

const TrafficDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [activeTab, setActiveTab] = useState('live');
  const [trafficData, setTrafficData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [timeParams, setTimeParams] = useState({
    hoursAhead: 1,
    daysBack: 7
  });

  // Fetch cities on component mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true);
        const data = await trafficApi.getCities();
        setCities(data.cities || []);
        
        // Select first city by default if available
        if (data.cities && data.cities.length > 0) {
          setSelectedCity(data.cities[0]);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load cities. Please try again later.');
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  // Fetch traffic metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await trafficApi.getTrafficMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching traffic metrics:', err);
        // Don't set error state here to avoid blocking the whole dashboard
      }
    };

    fetchMetrics();
    
    // Refresh metrics every 5 minutes
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch traffic data when city or tab changes
  useEffect(() => {
    const fetchTrafficData = async () => {
      if (!selectedCity) return;
      
      try {
        setLoading(true);
        let data;
        
        switch (activeTab) {
          case 'live':
            data = await trafficApi.getLiveTraffic(selectedCity.id);
            break;
          case 'predicted':
            data = await trafficApi.getPredictedTraffic(selectedCity.id, timeParams.hoursAhead);
            break;
          case 'historical':
            data = await trafficApi.getHistoricalTraffic(selectedCity.id, timeParams.daysBack);
            break;
          default:
            data = await trafficApi.getLiveTraffic(selectedCity.id);
        }
        
        setTrafficData(data);
        setError(null);
      } catch (err) {
        setError(`Failed to load ${activeTab} traffic data. Please try again later.`);
        console.error(`Error fetching ${activeTab} traffic data:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrafficData();
    
    // Set up auto-refresh for live data only
    let intervalId;
    if (activeTab === 'live') {
      intervalId = setInterval(fetchTrafficData, 30 * 1000); // Refresh every 30 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedCity, activeTab, timeParams]);

  // Handle city change
  const handleCityChange = (city) => {
    setSelectedCity(city);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle time parameter changes
  const handleTimeParamChange = (param, value) => {
    setTimeParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  // Handle traffic incident report
  const handleIncidentReport = async (incidentData) => {
    try {
      await trafficApi.reportIncident({
        ...incidentData,
        location: {
          lat: incidentData.location.lat,
          lng: incidentData.location.lng
        }
      });
      
      // Refresh live traffic data after reporting incident
      if (activeTab === 'live') {
        const data = await trafficApi.getLiveTraffic(selectedCity.id);
        setTrafficData(data);
      }
      
      return { success: true, message: 'Incident reported successfully' };
    } catch (err) {
      console.error('Error reporting incident:', err);
      return { 
        success: false, 
        message: err.response?.data?.error || 'Failed to report incident. Please try again.'
      };
    }
  };

  if (loading && !trafficData) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Loading traffic data...</span>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col md={6}>
          <h1 className="h3 mb-3">Traffic Prediction Dashboard</h1>
        </Col>
        <Col md={6} className="d-flex justify-content-end align-items-center">
          <CitySelector 
            cities={cities} 
            selectedCity={selectedCity} 
            onCityChange={handleCityChange} 
          />
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col md={12} lg={3}>
          <TrafficMetrics metrics={metrics} />
        </Col>
        <Col md={12} lg={9}>
          <TrafficTabs 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
            timeParams={timeParams}
            onTimeParamChange={handleTimeParamChange}
          />
          
          <div className="mt-3">
            <TrafficMap 
              trafficData={trafficData} 
              activeTab={activeTab}
              onIncidentReport={handleIncidentReport}
              isLoading={loading}
            />
          </div>
        </Col>
      </Row>
      
      <Row>
        <Col md={12}>
          <TrafficList 
            trafficData={trafficData} 
            activeTab={activeTab} 
            isLoading={loading}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default TrafficDashboard;