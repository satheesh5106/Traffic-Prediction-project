/**
 * Map Data Validation Utilities
 * 
 * This module provides validation functions for map-related data
 * such as coordinates, routes, and traffic information.
 */

const { trafficConfig, routeConfig } = require('./config');

/**
 * Validate coordinate object
 * @param {Object} coord - Coordinate object to validate {lat, lng}
 * @returns {boolean} True if valid, false otherwise
 */
const isValidCoordinate = (coord) => {
  if (!coord || typeof coord !== 'object') return false;
  
  const { lat, lng } = coord;
  
  // Check if lat and lng are numbers and within valid ranges
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    lat >= -90 && lat <= 90 && 
    lng >= -180 && lng <= 180
  );
};

/**
 * Validate an array of coordinates
 * @param {Array} coordinates - Array of coordinate objects [{lat, lng}]
 * @returns {boolean} True if all coordinates are valid, false otherwise
 */
const areValidCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return false;
  }
  
  return coordinates.every(isValidCoordinate);
};

/**
 * Validate route parameters
 * @param {Object} params - Route parameters
 * @returns {Array} Array of error messages, empty if valid
 */
const validateRouteParams = (params) => {
  const errors = [];
  
  // Check if params is an object
  if (!params || typeof params !== 'object') {
    return ['Invalid route parameters'];
  }
  
  const { origin, destination, vehicleType, priority } = params;
  
  // Validate origin and destination
  if (!isValidCoordinate(origin)) {
    errors.push('Invalid origin coordinates');
  }
  
  if (!isValidCoordinate(destination)) {
    errors.push('Invalid destination coordinates');
  }
  
  // Validate vehicle type
  if (vehicleType && !routeConfig.vehicleTypes.includes(vehicleType)) {
    errors.push(`Invalid vehicle type. Must be one of: ${routeConfig.vehicleTypes.join(', ')}`);
  }
  
  // Validate priority
  if (priority && !routeConfig.routeTypes.includes(priority)) {
    errors.push(`Invalid priority. Must be one of: ${routeConfig.routeTypes.join(', ')}`);
  }
  
  return errors;
};

/**
 * Validate traffic incident report
 * @param {Object} incident - Traffic incident report
 * @returns {Array} Array of error messages, empty if valid
 */
const validateTrafficIncident = (incident) => {
  const errors = [];
  
  // Check if incident is an object
  if (!incident || typeof incident !== 'object') {
    return ['Invalid incident report'];
  }
  
  const { location, type, description, severity } = incident;
  
  // Validate location
  if (!isValidCoordinate(location)) {
    errors.push('Invalid incident location');
  }
  
  // Validate incident type
  if (!type || !trafficConfig.incidentTypes.includes(type)) {
    errors.push(`Invalid incident type. Must be one of: ${trafficConfig.incidentTypes.join(', ')}`);
  }
  
  // Validate description
  if (!description || typeof description !== 'string' || description.trim().length < 5) {
    errors.push('Description must be at least 5 characters long');
  }
  
  // Validate severity
  if (severity && !['low', 'moderate', 'high', 'severe'].includes(severity)) {
    errors.push('Invalid severity level. Must be one of: low, moderate, high, severe');
  }
  
  return errors;
};

/**
 * Validate city ID
 * @param {string} cityId - City ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidCityId = (cityId) => {
  if (!cityId || typeof cityId !== 'string') {
    return false;
  }
  
  // Check if city ID is in the list of supported cities
  return trafficConfig.supportedCities.some(city => city.id === cityId);
};

/**
 * Validate bounding box
 * @param {Object} bbox - Bounding box {north, south, east, west}
 * @returns {boolean} True if valid, false otherwise
 */
const isValidBoundingBox = (bbox) => {
  if (!bbox || typeof bbox !== 'object') {
    return false;
  }
  
  const { north, south, east, west } = bbox;
  
  // Check if all values are numbers and within valid ranges
  return (
    typeof north === 'number' && 
    typeof south === 'number' && 
    typeof east === 'number' && 
    typeof west === 'number' && 
    north >= -90 && north <= 90 && 
    south >= -90 && south <= 90 && 
    east >= -180 && east <= 180 && 
    west >= -180 && west <= 180 && 
    north > south && east > west
  );
};

/**
 * Validate time parameters for traffic data
 * @param {Object} params - Time parameters
 * @returns {Array} Array of error messages, empty if valid
 */
const validateTimeParams = (params) => {
  const errors = [];
  
  // Check if params is an object
  if (!params || typeof params !== 'object') {
    return ['Invalid time parameters'];
  }
  
  const { hoursAhead, daysBack, startTime, endTime } = params;
  
  // Validate hoursAhead
  if (hoursAhead !== undefined) {
    if (typeof hoursAhead !== 'number' || hoursAhead < 1 || hoursAhead > 24) {
      errors.push('Hours ahead must be a number between 1 and 24');
    }
  }
  
  // Validate daysBack
  if (daysBack !== undefined) {
    if (typeof daysBack !== 'number' || daysBack < 1 || daysBack > 30) {
      errors.push('Days back must be a number between 1 and 30');
    }
  }
  
  // Validate startTime and endTime if provided
  if (startTime !== undefined && endTime !== undefined) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.push('Invalid date format for startTime or endTime');
      } else if (start >= end) {
        errors.push('startTime must be before endTime');
      }
    } catch (error) {
      errors.push('Invalid date format for startTime or endTime');
    }
  } else if ((startTime && !endTime) || (!startTime && endTime)) {
    errors.push('Both startTime and endTime must be provided together');
  }
  
  return errors;
};

module.exports = {
  isValidCoordinate,
  areValidCoordinates,
  validateRouteParams,
  validateTrafficIncident,
  isValidCityId,
  isValidBoundingBox,
  validateTimeParams
};