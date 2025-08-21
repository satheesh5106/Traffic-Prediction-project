// Error handling utilities for TrafficAI Netlify Functions

// Standard error types
const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  API_LIMIT: 'API_RATE_LIMIT',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  INTERNAL: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TIMEOUT: 'REQUEST_TIMEOUT'
};

// Error response builder
function createErrorResponse(type, message, statusCode = 500, details = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: false,
      error: {
        type,
        message,
        timestamp: new Date().toISOString(),
        requestId: details.requestId || generateRequestId(),
        ...details
      }
    })
  };
}

// Generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validation error handler
function handleValidationError(errors, requestId) {
  return createErrorResponse(
    ERROR_TYPES.VALIDATION,
    'Request validation failed',
    400,
    { errors, requestId }
  );
}

// API rate limit error handler
function handleRateLimitError(limit, resetTime, requestId) {
  return createErrorResponse(
    ERROR_TYPES.API_LIMIT,
    'API rate limit exceeded',
    429,
    { 
      limit, 
      resetTime: new Date(resetTime).toISOString(),
      requestId,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    }
  );
}

// External API error handler
function handleExternalAPIError(service, error, requestId) {
  const statusCode = error.response?.status || 503;
  const message = error.response?.data?.message || error.message || 'External service unavailable';
  
  return createErrorResponse(
    ERROR_TYPES.EXTERNAL_API,
    `${service} service error: ${message}`,
    statusCode,
    { 
      service, 
      originalError: error.response?.data,
      requestId
    }
  );
}

// Timeout error handler
function handleTimeoutError(timeout, requestId) {
  return createErrorResponse(
    ERROR_TYPES.TIMEOUT,
    `Request timeout after ${timeout}ms`,
    408,
    { timeout, requestId }
  );
}

// Generic error handler
function handleGenericError(error, requestId) {
  console.error('Unhandled error:', error);
  
  return createErrorResponse(
    ERROR_TYPES.INTERNAL,
    'An unexpected error occurred',
    500,
    { 
      requestId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  );
}

// Success response builder
function createSuccessResponse(data, statusCode = 200, metadata = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': metadata.cacheable ? 'public, max-age=300' : 'no-cache'
    },
    body: JSON.stringify({
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        requestId: metadata.requestId || generateRequestId(),
        ...metadata
      }
    })
  };
}

// CORS preflight handler
function handleCORS() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
}

// Request validator
function validateRequest(event, requiredFields = [], allowedMethods = ['GET', 'POST']) {
  const errors = [];
  
  // Check HTTP method
  if (!allowedMethods.includes(event.httpMethod)) {
    errors.push(`Method ${event.httpMethod} not allowed. Allowed: ${allowedMethods.join(', ')}`);
  }
  
  // Parse and validate body for POST requests
  let body = {};
  if (event.httpMethod === 'POST' && event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      errors.push('Invalid JSON in request body');
      return { isValid: false, errors, body: {} };
    }
  }
  
  // Check required fields
  requiredFields.forEach(field => {
    const value = body[field] || event.queryStringParameters?.[field];
    if (!value) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    body
  };
}

// Rate limiter (simple in-memory implementation)
const rateLimitStore = new Map();

function checkRateLimit(identifier, limit = 100, windowMs = 3600000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  const current = rateLimitStore.get(identifier) || {
    count: 0,
    resetTime: now + windowMs
  };
  
  if (current.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count++;
  rateLimitStore.set(identifier, current);
  
  return {
    allowed: true,
    limit,
    remaining: limit - current.count,
    resetTime: current.resetTime
  };
}

// Async error wrapper
function asyncHandler(fn) {
  return async (event, context = {}) => {
    const requestId = generateRequestId();
    
    try {
      // Add request ID to context
      context.requestId = requestId;
      
      // Handle CORS preflight
      if (event.httpMethod === 'OPTIONS') {
        return handleCORS();
      }
      
      // Execute function
      return await fn(event, context);
      
    } catch (error) {
      console.error(`Request ${requestId} failed:`, error);
      return handleGenericError(error, requestId);
    }
  };
}

// Logger utility
function log(level, message, data = {}) {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  
  if (levels[level] <= levels[logLevel]) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    }));
  }
}

module.exports = {
  ERROR_TYPES,
  createErrorResponse,
  createSuccessResponse,
  handleValidationError,
  handleRateLimitError,
  handleExternalAPIError,
  handleTimeoutError,
  handleGenericError,
  handleCORS,
  validateRequest,
  checkRateLimit,
  asyncHandler,
  generateRequestId,
  log
};