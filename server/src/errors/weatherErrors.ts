/**
 * Global error classes for the Weather API system
 * Provides structured error handling with HTTP status codes and consistent error responses
 */

// Base error class for all weather-related errors
abstract class WeatherError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;
  public readonly timestamp: string;
  public readonly requestId: string | undefined;
  public readonly context: Record<string, any> | undefined;

  constructor(
    message: string,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts error to JSON format for API responses
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        requestId: this.requestId,
        context: this.context
      }
    };
  }

  /**
   * Creates a sanitized version for production (removes sensitive context)
   */
  toSanitizedJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        requestId: this.requestId
      }
    };
  }
}

/**
 * Validation Error - 400 Bad Request
 * Used for invalid input data, malformed requests, or schema validation failures
 */
class ValidationError extends WeatherError {
  public readonly statusCode = 400;
  public readonly errorCode = 'VALIDATION_ERROR';

  constructor(
    message: string = 'Invalid input data',
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, context, requestId);
  }

  /**
   * Creates a ValidationError from Zod validation errors
   */
  static fromZodError(
    zodError: any,
    requestId?: string
  ): ValidationError {
    const issues = zodError.issues || [];
    const message = issues.length > 0 
      ? `Validation failed: ${issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`
      : 'Validation failed';
    
    return new ValidationError(message, { zodIssues: issues }, requestId);
  }
}

/**
 * Third Party Error - 502 Bad Gateway / 503 Service Unavailable
 * Used for external API failures, network issues, or service unavailability
 */
class ThirdPartyError extends WeatherError {
  public readonly statusCode: number;
  public readonly errorCode = 'THIRD_PARTY_ERROR';
  public readonly service: string;
  public readonly originalError: Error | undefined;

  constructor(
    service: string,
    message: string = 'External service error',
    statusCode: number = 502,
    originalError?: Error,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, context, requestId);
    this.service = service;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }

  /**
   * Creates a ThirdPartyError for IMD API failures
   */
  static imdApiError(
    message: string = 'IMD API service unavailable',
    originalError?: Error,
    requestId?: string
  ): ThirdPartyError {
    return new ThirdPartyError(
      'IMD_API',
      message,
      503,
      originalError,
      { service: 'Indian Meteorological Department API' },
      requestId
    );
  }

  /**
   * Creates a ThirdPartyError for OpenWeatherMap API failures
   */
  static openWeatherMapError(
    message: string = 'OpenWeatherMap API service unavailable',
    originalError?: Error,
    requestId?: string
  ): ThirdPartyError {
    return new ThirdPartyError(
      'OPENWEATHERMAP_API',
      message,
      503,
      originalError,
      { service: 'OpenWeatherMap API' },
      requestId
    );
  }

  /**
   * Creates a ThirdPartyError for network/timeout issues
   */
  static networkError(
    service: string,
    message: string = 'Network request failed',
    originalError?: Error,
    requestId?: string
  ): ThirdPartyError {
    return new ThirdPartyError(
      service,
      message,
      502,
      originalError,
      { type: 'network_error' },
      requestId
    );
  }
}

/**
 * Not Found Error - 404 Not Found
 * Used when requested resources (stations, weather data) are not found
 */
class NotFoundError extends WeatherError {
  public readonly statusCode = 404;
  public readonly errorCode = 'NOT_FOUND';
  public readonly resource: string;
  public readonly resourceId: string | undefined;

  constructor(
    resource: string,
    resourceId?: string,
    message?: string,
    context?: Record<string, any>,
    requestId?: string
  ) {
    const defaultMessage = resourceId 
      ? `${resource} with ID '${resourceId}' not found`
      : `${resource} not found`;
    
    super(message || defaultMessage, context, requestId);
    this.resource = resource;
    this.resourceId = resourceId;
  }

  /**
   * Creates a NotFoundError for weather stations
   */
  static stationNotFound(
    stationId: string,
    requestId?: string
  ): NotFoundError {
    return new NotFoundError(
      'Weather Station',
      stationId,
      undefined,
      { type: 'weather_station' },
      requestId
    );
  }

  /**
   * Creates a NotFoundError for weather data
   */
  static weatherDataNotFound(
    stationId?: string,
    requestId?: string
  ): NotFoundError {
    return new NotFoundError(
      'Weather Data',
      stationId,
      stationId ? `Weather data for station '${stationId}' not found` : 'Weather data not found',
      { type: 'weather_data' },
      requestId
    );
  }
}

/**
 * Authentication/Authorization Error - 401 Unauthorized / 403 Forbidden
 * Used for authentication failures, invalid tokens, or insufficient permissions
 */
class AuthError extends WeatherError {
  public readonly statusCode: number;
  public readonly errorCode = 'AUTH_ERROR';
  public readonly authType: 'authentication' | 'authorization';

  constructor(
    authType: 'authentication' | 'authorization' = 'authentication',
    message?: string,
    context?: Record<string, any>,
    requestId?: string
  ) {
    const defaultMessage = authType === 'authentication' 
      ? 'Authentication required'
      : 'Insufficient permissions';
    
    super(message || defaultMessage, context, requestId);
    this.authType = authType;
    this.statusCode = authType === 'authentication' ? 401 : 403;
  }

  /**
   * Creates an AuthError for missing or invalid JWT tokens
   */
  static invalidToken(
    message: string = 'Invalid or expired token',
    requestId?: string
  ): AuthError {
    return new AuthError(
      'authentication',
      message,
      { type: 'invalid_token' },
      requestId
    );
  }

  /**
   * Creates an AuthError for missing authentication
   */
  static missingAuth(
    message: string = 'Authentication token required',
    requestId?: string
  ): AuthError {
    return new AuthError(
      'authentication',
      message,
      { type: 'missing_auth' },
      requestId
    );
  }

  /**
   * Creates an AuthError for insufficient permissions (admin-only endpoints)
   */
  static insufficientPermissions(
    requiredRole: string = 'admin',
    message?: string,
    requestId?: string
  ): AuthError {
    return new AuthError(
      'authorization',
      message || `Requires ${requiredRole} role`,
      { type: 'insufficient_permissions', requiredRole },
      requestId
    );
  }
}

/**
 * Rate Limit Error - 429 Too Many Requests
 * Used when API rate limits are exceeded
 */
class RateLimitError extends WeatherError {
  public readonly statusCode = 429;
  public readonly errorCode = 'RATE_LIMIT_EXCEEDED';
  public readonly retryAfter: number | undefined; // seconds

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, context, requestId);
    this.retryAfter = retryAfter;
  }

  override toJSON() {
    const json = super.toJSON();
    if (this.retryAfter) {
      (json.error as any).retryAfter = this.retryAfter;
    }
    return json;
  }
}

/**
 * Internal Server Error - 500 Internal Server Error
 * Used for unexpected server errors, database failures, etc.
 */
class InternalServerError extends WeatherError {
  public readonly statusCode = 500;
  public readonly errorCode = 'INTERNAL_SERVER_ERROR';
  public readonly originalError: Error | undefined;

  constructor(
    message: string = 'Internal server error',
    originalError?: Error,
    context?: Record<string, any>,
    requestId?: string
  ) {
    super(message, context, requestId);
    this.originalError = originalError;
  }
}

/**
 * Error handler utility functions
 */
class ErrorHandler {
  /**
   * Determines if an error is a known WeatherError
   */
  static isWeatherError(error: any): error is WeatherError {
    return error instanceof WeatherError;
  }

  /**
   * Converts any error to a WeatherError
   */
  static toWeatherError(error: any, requestId?: string): WeatherError {
    if (ErrorHandler.isWeatherError(error)) {
      return error;
    }

    // Handle specific error types
    if (error.name === 'ZodError') {
      return ValidationError.fromZodError(error, requestId);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return ThirdPartyError.networkError(
        'EXTERNAL_API',
        'Network connection failed',
        error,
        requestId
      );
    }

    if (error.code === 'ETIMEDOUT') {
      return ThirdPartyError.networkError(
        'EXTERNAL_API',
        'Request timeout',
        error,
        requestId
      );
    }

    // Default to internal server error
    return new InternalServerError(
      error.message || 'An unexpected error occurred',
      error,
      undefined,
      requestId
    );
  }

  /**
   * Logs error with appropriate level based on error type
   */
  static logError(error: WeatherError, logger: any) {
    const logData = {
      error: error.name,
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      requestId: error.requestId,
      context: error.context,
      stack: error.stack
    };

    if (error.statusCode >= 500) {
      logger.error(logData, 'Server error occurred');
    } else if (error.statusCode >= 400) {
      logger.warn(logData, 'Client error occurred');
    } else {
      logger.info(logData, 'Error occurred');
    }
  }
}

// Export all error types for easy importing
export {
  WeatherError,
  ValidationError,
  ThirdPartyError,
  NotFoundError,
  AuthError,
  RateLimitError,
  InternalServerError,
  ErrorHandler
};