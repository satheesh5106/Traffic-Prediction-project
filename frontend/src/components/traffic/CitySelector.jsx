import React from 'react';
import { Form, Spinner } from 'react-bootstrap';

const CitySelector = ({ cities, selectedCity, onCityChange, isLoading }) => {
  if (isLoading) {
    return (
      <div className="d-flex align-items-center">
        <Spinner animation="border" size="sm" className="me-2" />
        <span>Loading cities...</span>
      </div>
    );
  }

  if (!cities || cities.length === 0) {
    return <div className="text-muted">No cities available</div>;
  }

  return (
    <Form.Group className="mb-0">
      <Form.Select 
        value={selectedCity || ''} 
        onChange={(e) => onCityChange(e.target.value)}
        aria-label="Select city"
      >
        <option value="">Select a city</option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
};

export default CitySelector;