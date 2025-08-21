/**
 * Helper utility functions for Netlify Functions
 */

/**
 * Generate random coordinates near a center point
 * @param {Array} center - Center coordinates [lat, lng]
 * @param {number} count - Number of coordinates to generate
 * @param {number} radius - Radius in degrees
 * @returns {Array} Array of coordinates
 */
const generateCoordinatesNear = (center, count = 5, radius = 0.025) => {
  const result = [center];
  
  for (let i = 1; i < count; i++) {
    // Generate coordinates with slight variation
    const lat = center[0] + (Math.random() * radius * 2 - radius);
    const lng = center[1] + (Math.random() * radius * 2 - radius);
    result.push([lat, lng]);
  }
  
  return result;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - First coordinate [lat, lng]
 * @param {Array} coord2 - Second coordinate [lat, lng]
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (coord1, coord2) => {
  const lat1 = coord1[0];
  const lon1 = coord1[1];
  const lat2 = coord2[0];
  const lon2 = coord2[1];
  
  // Haversine formula
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  
  return distance;
};

/**
 * Calculate total distance of a route
 * @param {Array} coordinates - Array of coordinates
 * @returns {number} Total distance in kilometers
 */
const calculateRouteDistance = (coordinates) => {
  let totalDistance = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += calculateDistance(coordinates[i-1], coordinates[i]);
  }
  
  return totalDistance;
};

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Generate a random traffic level
 * @returns {string} Traffic level (Low, Moderate, Heavy, Severe)
 */
const randomTrafficLevel = () => {
  const levels = ['Low', 'Moderate', 'Heavy', 'Severe'];
  const weights = [0.3, 0.4, 0.2, 0.1]; // Probability weights
  
  const random = Math.random();
  let sum = 0;
  
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random < sum) return levels[i];
  }
  
  return levels[0];
};

/**
 * Get color for traffic level
 * @param {string} level - Traffic level
 * @returns {string} Color hex code
 */
const getTrafficLevelColor = (level) => {
  switch (level) {
    case 'Low': return '#22c55e'; // Green
    case 'Moderate': return '#f59e0b'; // Yellow
    case 'Heavy': return '#f97316'; // Orange
    case 'Severe': return '#ef4444'; // Red
    default: return '#3b82f6'; // Blue
  }
};

/**
 * Generate a timestamp for a specific time
 * @param {number} hoursOffset - Hours offset from current time
 * @returns {string} ISO timestamp
 */
const generateTimestamp = (hoursOffset = 0) => {
  const date = new Date();
  date.setHours(date.getHours() + hoursOffset);
  return date.toISOString();
};

module.exports = {
  generateCoordinatesNear,
  calculateDistance,
  calculateRouteDistance,
  deg2rad,
  randomInt,
  formatNumber,
  randomTrafficLevel,
  getTrafficLevelColor,
  generateTimestamp
};