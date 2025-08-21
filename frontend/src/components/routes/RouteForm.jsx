import React from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';
import { GeoAlt, Speedometer2 } from 'react-bootstrap-icons';

const RouteForm = ({ formData, handleInputChange, handleOptimizeRoute, optimizing }) => {
  return (
    <Form onSubmit={handleOptimizeRoute}>
      <Form.Group className="mb-3">
        <Form.Label>Start Location</Form.Label>
        <InputGroup>
          <InputGroup.Text>
            <GeoAlt />
          </InputGroup.Text>
          <Form.Control
            type="text"
            name="startLocation"
            value={formData.startLocation}
            onChange={handleInputChange}
            placeholder="lat,lng (e.g., 12.9716,77.5946)"
            required
          />
        </InputGroup>
        <Form.Text className="text-muted">
          Enter coordinates in format: latitude,longitude
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Destination</Form.Label>
        <InputGroup>
          <InputGroup.Text>
            <GeoAlt />
          </InputGroup.Text>
          <Form.Control
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleInputChange}
            placeholder="lat,lng (e.g., 13.0827,80.2707)"
            required
          />
        </InputGroup>
        <Form.Text className="text-muted">
          Enter coordinates in format: latitude,longitude
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Priority</Form.Label>
        <Form.Select
          name="priority"
          value={formData.priority}
          onChange={handleInputChange}
          required
        >
          <option value="fastest">Fastest Route</option>
          <option value="shortest">Shortest Route</option>
          <option value="eco">Eco-Friendly Route</option>
          <option value="scenic">Scenic Route</option>
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label>Vehicle Type</Form.Label>
        <InputGroup>
          <InputGroup.Text>
            <Speedometer2 />
          </InputGroup.Text>
          <Form.Select
            name="vehicleType"
            value={formData.vehicleType}
            onChange={handleInputChange}
            required
          >
            <option value="car">Car</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="truck">Truck</option>
            <option value="bus">Bus</option>
          </Form.Select>
        </InputGroup>
      </Form.Group>

      <div className="d-grid">
        <Button 
          variant="primary" 
          type="submit" 
          disabled={optimizing}
        >
          {optimizing ? 'Optimizing...' : 'Optimize Route'}
          {optimizing && (
            <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
          )}
        </Button>
      </div>
    </Form>
  );
};

export default RouteForm;