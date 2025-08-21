/**
 * Error handling utilities for Netlify Functions
 */

const logger = require('./logger');

/**
 * Custom API error class
 */
class ApiError extends Error {
  /**
   * Create a new API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Additional error details
   */
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle API errors
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleError = (err, req, res) => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = {};
  
  // Handle ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } 
  // Handle Firebase Auth errors
  else if (err.code && err.code.startsWith('auth/')) {
    statusCode = 400;
    message = getFirebaseAuthErrorMessage(err.code);
    details = { code: err.code };
  }
  // Handle validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = { errors: err.errors || [err.message] };
  }
  // Handle other known errors
  else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }
  
  // Log the error
  logger.error(message, {
    path: req.path,
    method: req.method,
    statusCode,
    details,
    stack: err.stack
  });
  
  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      details
    }
  });
};

/**
 * Get a user-friendly message for Firebase Auth error codes
 * @param {string} errorCode - Firebase Auth error code
 * @returns {string} User-friendly error message
 */
const getFirebaseAuthErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/email-already-exists': 'The email address is already in use.',
    'auth/invalid-email': 'The email address is invalid.',
    'auth/user-not-found': 'No user found with this email address.',
    'auth/wrong-password': 'The password is invalid.',
    'auth/weak-password': 'The password must be at least 6 characters.',
    'auth/email-already-in-use': 'The email address is already in use.',
    'auth/operation-not-allowed': 'This operation is not allowed.',
    'auth/invalid-credential': 'The credential is invalid.',
    'auth/invalid-verification-code': 'The verification code is invalid.',
    'auth/invalid-verification-id': 'The verification ID is invalid.',
    'auth/requires-recent-login': 'This operation requires recent authentication. Please log in again.',
    'auth/user-disabled': 'This user account has been disabled.',
    'auth/user-token-expired': 'The user\'s credential has expired. Please log in again.',
    'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later.'
  };
  
  return errorMessages[errorCode] || 'An authentication error occurred.';
};

/**
 * Async error handler middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => handleError(err, req, res));
  };
};

/**
 * Create a 404 Not Found error
 * @param {string} resource - Resource that was not found
 * @returns {ApiError} Not Found error
 */
const notFound = (resource = 'Resource') => {
  return new ApiError(`${resource} not found`, 404);
};

/**
 * Create a 400 Bad Request error
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {ApiError} Bad Request error
 */
const badRequest = (message = 'Bad Request', details = {}) => {
  return new ApiError(message, 400, details);
};

/**
 * Create a 401 Unauthorized error
 * @param {string} message - Error message
 * @returns {ApiError} Unauthorized error
 */
const unauthorized = (message = 'Unauthorized') => {
  return new ApiError(message, 401);
};

/**
 * Create a 403 Forbidden error
 * @param {string} message - Error message
 * @returns {ApiError} Forbidden error
 */
const forbidden = (message = 'Forbidden') => {
  return new ApiError(message, 403);
};

/**
 * Create a 429 Too Many Requests error
 * @param {string} message - Error message
 * @returns {ApiError} Too Many Requests error
 */
const tooManyRequests = (message = 'Too many requests, please try again later') => {
  return new ApiError(message, 429);
};

module.exports = {
  ApiError,
  handleError,
  asyncHandler,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  tooManyRequests
};