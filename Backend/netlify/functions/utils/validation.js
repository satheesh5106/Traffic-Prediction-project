/**
 * Validation utilities for API requests
 */

/**
 * Validate traffic prediction request parameters
 * @param {Object} params - Request parameters
 * @returns {Object} Validation result with isValid and errors
 */
const validateTrafficParams = (params) => {
  const errors = [];
  
  // Validate cityId
  if (!params.cityId) {
    errors.push('City ID is required');
  }
  
  // Validate hoursAhead (if provided)
  if (params.hoursAhead !== undefined) {
    const hoursAhead = parseInt(params.hoursAhead, 10);
    if (isNaN(hoursAhead) || hoursAhead < 1 || hoursAhead > 24) {
      errors.push('Hours ahead must be a number between 1 and 24');
    }
  }
  
  // Validate daysBack (if provided)
  if (params.daysBack !== undefined) {
    const daysBack = parseInt(params.daysBack, 10);
    if (isNaN(daysBack) || daysBack < 1 || daysBack > 30) {
      errors.push('Days back must be a number between 1 and 30');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate traffic incident report parameters
 * @param {Object} report - Traffic incident report
 * @returns {Object} Validation result with isValid and errors
 */
const validateTrafficReport = (report) => {
  const errors = [];
  
  // Required fields
  if (!report.location || !Array.isArray(report.location) || report.location.length !== 2) {
    errors.push('Valid location coordinates are required');
  }
  
  if (!report.type || typeof report.type !== 'string') {
    errors.push('Incident type is required');
  }
  
  if (!report.description || typeof report.description !== 'string') {
    errors.push('Description is required');
  }
  
  // Optional fields with validation
  if (report.severity !== undefined) {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(report.severity)) {
      errors.push('Severity must be one of: low, medium, high, critical');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate route optimization request parameters
 * @param {Object} params - Request parameters
 * @returns {Object} Validation result with isValid and errors
 */
const validateRouteParams = (params) => {
  const errors = [];
  
  // Validate start location
  if (!params.start || !Array.isArray(params.start) || params.start.length !== 2) {
    errors.push('Valid start coordinates are required');
  } else {
    const [lat, lng] = params.start;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      errors.push('Start coordinates must be numbers');
    }
  }
  
  // Validate end location
  if (!params.end || !Array.isArray(params.end) || params.end.length !== 2) {
    errors.push('Valid end coordinates are required');
  } else {
    const [lat, lng] = params.end;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      errors.push('End coordinates must be numbers');
    }
  }
  
  // Validate priority (if provided)
  if (params.priority !== undefined) {
    const validPriorities = ['time', 'distance', 'eco', 'scenic'];
    if (!validPriorities.includes(params.priority)) {
      errors.push('Priority must be one of: time, distance, eco, scenic');
    }
  }
  
  // Validate vehicle type (if provided)
  if (params.vehicleType !== undefined) {
    const validVehicleTypes = ['car', 'motorcycle', 'truck', 'bicycle'];
    if (!validVehicleTypes.includes(params.vehicleType)) {
      errors.push('Vehicle type must be one of: car, motorcycle, truck, bicycle');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate user registration parameters
 * @param {Object} user - User registration data
 * @returns {Object} Validation result with isValid and errors
 */
const validateUserRegistration = (user) => {
  const errors = [];
  
  // Validate email
  if (!user.email || typeof user.email !== 'string') {
    errors.push('Valid email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Validate password
  if (!user.password || typeof user.password !== 'string') {
    errors.push('Password is required');
  } else if (user.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  // Validate name
  if (!user.name || typeof user.name !== 'string') {
    errors.push('Name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate user profile update parameters
 * @param {Object} profile - User profile data
 * @returns {Object} Validation result with isValid and errors
 */
const validateProfileUpdate = (profile) => {
  const errors = [];
  
  // Validate name (if provided)
  if (profile.name !== undefined && (typeof profile.name !== 'string' || profile.name.trim() === '')) {
    errors.push('Name cannot be empty');
  }
  
  // Validate phone (if provided)
  if (profile.phone !== undefined) {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (typeof profile.phone !== 'string' || !phoneRegex.test(profile.phone)) {
      errors.push('Invalid phone number format');
    }
  }
  
  // Validate preferences (if provided)
  if (profile.preferences !== undefined && typeof profile.preferences !== 'object') {
    errors.push('Preferences must be an object');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateTrafficParams,
  validateTrafficReport,
  validateRouteParams,
  validateUserRegistration,
  validateProfileUpdate
};