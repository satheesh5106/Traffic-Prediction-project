"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.ApiError = void 0;
const logger_1 = require("../utils/logger");
// Custom error class for API errors
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
// Global error handler middleware
const errorHandler = (err, req, res, _next) => {
    // Default error values
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    // If it's our ApiError, use its values
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        isOperational = err.isOperational;
    }
    else if (err.name === 'ValidationError') {
        // Handle Joi validation errors
        statusCode = 400;
        message = err.message;
        isOperational = true;
    }
    // Log error
    if (isOperational) {
        logger_1.logger.warn(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    }
    else {
        logger_1.logger.error(`${err.name}: ${err.message}`, { stack: err.stack });
    }
    // Send response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};
exports.errorHandler = errorHandler;
// Async handler to catch errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map