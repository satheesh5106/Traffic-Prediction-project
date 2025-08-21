/**
 * Map Utilities for Traffic Prediction and Route Optimization
 * 
 * This module provides utility functions for handling map-related operations
 * such as calculating distances, converting coordinates, generating polylines,
 * and determining traffic levels based on geographical data.
 */

const logger = require('./logger');
const { trafficConfig } = require('./config');

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {Object} point1 - First coordinate {lat, lng}
 * @param {Object} point2 - Second coordinate {lat, lng}
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate the estimated time of arrival based on distance and traffic level
 * @param {number} distance - Distance in kilometers
 * @param {string} trafficLevel - Traffic level (low, moderate, heavy, severe)
 * @param {number} baseSpeed - Base speed in km/h (default: 60)
 * @returns {number} ETA in minutes
 */
const calculateETA = (distance, trafficLevel, baseSpeed = 60) => {
  // Traffic level factors
  const trafficFactors = {
    low: 1.0,
    moderate: 0.8,
    heavy: 0.6,
    severe: 0.4
  };
  
  const factor = trafficFactors[trafficLevel] || trafficFactors.moderate;
  const speed = baseSpeed * factor;
  const timeHours = distance / speed;
  
  return Math.round(timeHours * 60); // Convert to minutes
};

/**
 * Determine traffic level based on various factors
 * @param {number} vehicleCount - Number of vehicles in the area
 * @param {number} incidentCount - Number of incidents in the area
 * @param {string} timeOfDay - Time of day (morning, afternoon, evening, night)
 * @param {boolean} isWeekend - Whether it's a weekend
 * @returns {string} Traffic level (low, moderate, heavy, severe)
 */
const determineTrafficLevel = (vehicleCount, incidentCount, timeOfDay, isWeekend) => {
  // Base score calculation
  let score = 0;
  
  // Vehicle count factor
  if (vehicleCount < 50) score += 0;
  else if (vehicleCount < 100) score += 1;
  else if (vehicleCount < 200) score += 2;
  else score += 3;
  
  // Incident count factor
  score += Math.min(incidentCount, 3);
  
  // Time of day factor
  const timeFactors = {
    morning: isWeekend ? 1 : 2,
    afternoon: 1,
    evening: isWeekend ? 1 : 2,
    night: 0
  };
  
  score += timeFactors[timeOfDay] || 1;
  
  // Determine level based on score
  if (score <= 2) return 'low';
  if (score <= 4) return 'moderate';
  if (score <= 6) return 'heavy';
  return 'severe';
};

/**
 * Generate a simplified polyline for a route
 * @param {Array} coordinates - Array of coordinate objects [{lat, lng}]
 * @returns {Array} Simplified array of coordinates
 */
const simplifyPolyline = (coordinates) => {
  if (!coordinates || coordinates.length <= 2) {
    return coordinates;
  }
  
  // Simple Douglas-Peucker algorithm implementation
  const tolerance = 0.0001; // Adjust based on desired simplification level
  
  const simplifySegment = (points, start, end) => {
    if (end - start <= 1) {
      return [points[start], points[end]];
    }
    
    let maxDistance = 0;
    let maxIndex = 0;
    
    const startPoint = points[start];
    const endPoint = points[end];
    
    for (let i = start + 1; i < end; i++) {
      const distance = perpendicularDistance(points[i], startPoint, endPoint);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    if (maxDistance > tolerance) {
      const leftSegment = simplifySegment(points, start, maxIndex);
      const rightSegment = simplifySegment(points, maxIndex, end);
      
      // Combine segments (avoiding duplicating the middle point)
      return [...leftSegment.slice(0, -1), ...rightSegment];
    } else {
      return [points[start], points[end]];
    }
  };
  
  return simplifySegment(coordinates, 0, coordinates.length - 1);
};

/**
 * Calculate perpendicular distance from a point to a line
 * @param {Object} point - Point coordinate {lat, lng}
 * @param {Object} lineStart - Line start coordinate {lat, lng}
 * @param {Object} lineEnd - Line end coordinate {lat, lng}
 * @returns {number} Perpendicular distance
 */
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const area = Math.abs(
    (lineStart.lat * (lineEnd.lng - point.lng) +
     lineEnd.lat * (point.lng - lineStart.lng) +
     point.lat * (lineStart.lng - lineEnd.lng)) / 2
  );
  
  const bottom = Math.sqrt(
    Math.pow(lineStart.lat - lineEnd.lat, 2) +
    Math.pow(lineStart.lng - lineEnd.lng, 2)
  );
  
  return (area * 2) / bottom;
};

/**
 * Calculate fuel consumption based on distance, vehicle type and traffic
 * @param {number} distance - Distance in kilometers
 * @param {string} vehicleType - Type of vehicle (car, bus, truck, motorcycle)
 * @param {string} trafficLevel - Traffic level (low, moderate, heavy, severe)
 * @returns {number} Fuel consumption in liters
 */
const calculateFuelConsumption = (distance, vehicleType, trafficLevel) => {
  // Base consumption rates per 100km
  const baseConsumption = {
    car: 7.5,
    bus: 30,
    truck: 35,
    motorcycle: 4
  };
  
  // Traffic factors (increased consumption in traffic)
  const trafficFactors = {
    low: 1.0,
    moderate: 1.2,
    heavy: 1.4,
    severe: 1.6
  };
  
  const base = baseConsumption[vehicleType] || baseConsumption.car;
  const factor = trafficFactors[trafficLevel] || trafficFactors.moderate;
  
  return (distance * base * factor) / 100;
};

/**
 * Generate a color code for traffic level visualization
 * @param {string} trafficLevel - Traffic level (low, moderate, heavy, severe)
 * @returns {string} Hex color code
 */
const getTrafficLevelColor = (trafficLevel) => {
  const colors = {
    low: '#4CAF50',      // Green
    moderate: '#FFC107', // Amber
    heavy: '#FF9800',    // Orange
    severe: '#F44336'    // Red
  };
  
  return colors[trafficLevel] || colors.moderate;
};

/**
 * Calculate the bounding box for a set of coordinates
 * @param {Array} coordinates - Array of coordinate objects [{lat, lng}]
 * @returns {Object} Bounding box {north, south, east, west}
 */
const calculateBoundingBox = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }
  
  let north = coordinates[0].lat;
  let south = coordinates[0].lat;
  let east = coordinates[0].lng;
  let west = coordinates[0].lng;
  
  coordinates.forEach(coord => {
    north = Math.max(north, coord.lat);
    south = Math.min(south, coord.lat);
    east = Math.max(east, coord.lng);
    west = Math.min(west, coord.lng);
  });
  
  return { north, south, east, west };
};

/**
 * Check if a coordinate is within a bounding box
 * @param {Object} coord - Coordinate {lat, lng}
 * @param {Object} boundingBox - Bounding box {north, south, east, west}
 * @returns {boolean} True if coordinate is within the bounding box
 */
const isCoordinateInBoundingBox = (coord, boundingBox) => {
  return (
    coord.lat <= boundingBox.north &&
    coord.lat >= boundingBox.south &&
    coord.lng <= boundingBox.east &&
    coord.lng >= boundingBox.west
  );
};

/**
 * Format coordinates for frontend display
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Formatted coordinates
 */
const formatCoordinates = (lat, lng) => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);
  
  const latDeg = Math.floor(latAbs);
  const latMin = Math.floor((latAbs - latDeg) * 60);
  const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(2);
  
  const lngDeg = Math.floor(lngAbs);
  const lngMin = Math.floor((lngAbs - lngDeg) * 60);
  const lngSec = ((lngAbs - lngDeg - lngMin / 60) * 3600).toFixed(2);
  
  return `${latDeg}°${latMin}'${latSec}"${latDir}, ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
};

module.exports = {
  calculateDistance,
  calculateETA,
  determineTrafficLevel,
  simplifyPolyline,
  calculateFuelConsumption,
  getTrafficLevelColor,
  calculateBoundingBox,
  isCoordinateInBoundingBox,
  formatCoordinates
};