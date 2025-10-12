/**
 * Comprehensive Error Handler for Vercel Deployment
 * Handles all documented Vercel error codes and provides appropriate responses
 */

export interface VercelError {
  code: string;
  message: string;
  statusCode: number;
  category: 'Function' | 'Deployment' | 'DNS' | 'Cache' | 'Runtime' | 'Image' | 'Request' | 'Routing' | 'Sandbox' | 'Internal';
  retryable: boolean;
}

export const VERCEL_ERROR_CODES: Record<string, VercelError> = {
  // Function Errors
  BODY_NOT_A_STRING_FROM_FUNCTION: {
    code: 'BODY_NOT_A_STRING_FROM_FUNCTION',
    message: 'Function returned non-string body',
    statusCode: 502,
    category: 'Function',
    retryable: false
  },
  EDGE_FUNCTION_INVOCATION_FAILED: {
    code: 'EDGE_FUNCTION_INVOCATION_FAILED',
    message: 'Edge function execution failed',
    statusCode: 500,
    category: 'Function',
    retryable: true
  },
  EDGE_FUNCTION_INVOCATION_TIMEOUT: {
    code: 'EDGE_FUNCTION_INVOCATION_TIMEOUT',
    message: 'Edge function execution timed out',
    statusCode: 504,
    category: 'Function',
    retryable: true
  },
  FUNCTION_INVOCATION_FAILED: {
    code: 'FUNCTION_INVOCATION_FAILED',
    message: 'Serverless function execution failed',
    statusCode: 500,
    category: 'Function',
    retryable: true
  },
  FUNCTION_INVOCATION_TIMEOUT: {
    code: 'FUNCTION_INVOCATION_TIMEOUT',
    message: 'Function execution exceeded timeout limit',
    statusCode: 504,
    category: 'Function',
    retryable: true
  },
  FUNCTION_PAYLOAD_TOO_LARGE: {
    code: 'FUNCTION_PAYLOAD_TOO_LARGE',
    message: 'Request payload exceeds function limit',
    statusCode: 413,
    category: 'Function',
    retryable: false
  },
  FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE: {
    code: 'FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE',
    message: 'Function response payload too large',
    statusCode: 500,
    category: 'Function',
    retryable: false
  },
  FUNCTION_THROTTLED: {
    code: 'FUNCTION_THROTTLED',
    message: 'Function execution throttled due to rate limits',
    statusCode: 503,
    category: 'Function',
    retryable: true
  },
  NO_RESPONSE_FROM_FUNCTION: {
    code: 'NO_RESPONSE_FROM_FUNCTION',
    message: 'Function did not return a response',
    statusCode: 502,
    category: 'Function',
    retryable: true
  },
  MIDDLEWARE_INVOCATION_FAILED: {
    code: 'MIDDLEWARE_INVOCATION_FAILED',
    message: 'Middleware execution failed',
    statusCode: 500,
    category: 'Function',
    retryable: true
  },
  MIDDLEWARE_INVOCATION_TIMEOUT: {
    code: 'MIDDLEWARE_INVOCATION_TIMEOUT',
    message: 'Middleware execution timed out',
    statusCode: 504,
    category: 'Function',
    retryable: true
  },

  // Deployment Errors
  DEPLOYMENT_BLOCKED: {
    code: 'DEPLOYMENT_BLOCKED',
    message: 'Deployment is blocked',
    statusCode: 403,
    category: 'Deployment',
    retryable: false
  },
  DEPLOYMENT_DELETED: {
    code: 'DEPLOYMENT_DELETED',
    message: 'Deployment has been deleted',
    statusCode: 410,
    category: 'Deployment',
    retryable: false
  },
  DEPLOYMENT_DISABLED: {
    code: 'DEPLOYMENT_DISABLED',
    message: 'Deployment is disabled',
    statusCode: 402,
    category: 'Deployment',
    retryable: false
  },
  DEPLOYMENT_NOT_FOUND: {
    code: 'DEPLOYMENT_NOT_FOUND',
    message: 'Deployment not found',
    statusCode: 404,
    category: 'Deployment',
    retryable: false
  },
  DEPLOYMENT_NOT_READY_REDIRECTING: {
    code: 'DEPLOYMENT_NOT_READY_REDIRECTING',
    message: 'Deployment not ready, redirecting',
    statusCode: 303,
    category: 'Deployment',
    retryable: true
  },
  DEPLOYMENT_PAUSED: {
    code: 'DEPLOYMENT_PAUSED',
    message: 'Deployment is paused',
    statusCode: 503,
    category: 'Deployment',
    retryable: true
  },

  // DNS Errors
  DNS_HOSTNAME_EMPTY: {
    code: 'DNS_HOSTNAME_EMPTY',
    message: 'DNS hostname is empty',
    statusCode: 502,
    category: 'DNS',
    retryable: false
  },
  DNS_HOSTNAME_NOT_FOUND: {
    code: 'DNS_HOSTNAME_NOT_FOUND',
    message: 'DNS hostname not found',
    statusCode: 502,
    category: 'DNS',
    retryable: true
  },
  DNS_HOSTNAME_RESOLVE_FAILED: {
    code: 'DNS_HOSTNAME_RESOLVE_FAILED',
    message: 'DNS hostname resolution failed',
    statusCode: 502,
    category: 'DNS',
    retryable: true
  },
  DNS_HOSTNAME_RESOLVED_PRIVATE: {
    code: 'DNS_HOSTNAME_RESOLVED_PRIVATE',
    message: 'DNS hostname resolved to private IP',
    statusCode: 404,
    category: 'DNS',
    retryable: false
  },
  DNS_HOSTNAME_SERVER_ERROR: {
    code: 'DNS_HOSTNAME_SERVER_ERROR',
    message: 'DNS server error',
    statusCode: 502,
    category: 'DNS',
    retryable: true
  }
};

export class VercelErrorHandler {
  static handleError(error: any): { statusCode: number; message: string; code?: string; retryable?: boolean } {
    // Check if it's a known Vercel error
    if (error.code && VERCEL_ERROR_CODES[error.code]) {
      const vercelError = VERCEL_ERROR_CODES[error.code];
      return {
        statusCode: vercelError.statusCode,
        message: vercelError.message,
        code: vercelError.code,
        retryable: vercelError.retryable
      };
    }

    // Handle common HTTP errors
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      return {
        statusCode,
        message: this.getHttpErrorMessage(statusCode),
        retryable: this.isRetryableStatus(statusCode)
      };
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        statusCode: 502,
        message: 'Service temporarily unavailable',
        retryable: true
      };
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        statusCode: 504,
        message: 'Request timeout',
        retryable: true
      };
    }

    // Default error handling
    return {
      statusCode: 500,
      message: 'Internal server error',
      retryable: false
    };
  }

  static getHttpErrorMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      413: 'Payload Too Large',
      414: 'URI Too Long',
      416: 'Range Not Satisfiable',
      431: 'Request Header Fields Too Large',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
      508: 'Loop Detected'
    };
    return messages[statusCode] || 'Unknown Error';
  }

  static isRetryableStatus(statusCode: number): boolean {
    // Retryable status codes
    return [429, 500, 502, 503, 504].includes(statusCode);
  }

  static createErrorResponse(error: any) {
    const handled = this.handleError(error);
    
    return {
      error: {
        message: handled.message,
        code: handled.code,
        statusCode: handled.statusCode,
        retryable: handled.retryable,
        timestamp: new Date().toISOString()
      }
    };
  }

  static logError(error: any, context?: string) {
    const handled = this.handleError(error);
    
    console.error(`[${context || 'ERROR'}] ${handled.code || 'UNKNOWN_ERROR'}:`, {
      message: handled.message,
      statusCode: handled.statusCode,
      retryable: handled.retryable,
      originalError: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

// Middleware function for Express/Next.js
export function errorMiddleware(error: any, req: any, res: any, next: any) {
  VercelErrorHandler.logError(error, 'MIDDLEWARE');
  const errorResponse = VercelErrorHandler.createErrorResponse(error);
  
  res.status(errorResponse.error.statusCode).json(errorResponse);
}

// Utility function for API routes
export function withErrorHandling(handler: Function) {
  return async (req: any, res: any) => {
    try {
      return await handler(req, res);
    } catch (error) {
      VercelErrorHandler.logError(error, 'API_ROUTE');
      const errorResponse = VercelErrorHandler.createErrorResponse(error);
      
      return res.status(errorResponse.error.statusCode).json(errorResponse);
    }
  };
}

// React Error Boundary
export class VercelErrorBoundary extends Error {
  constructor(message: string, public code?: string, public statusCode?: number) {
    super(message);
    this.name = 'VercelErrorBoundary';
  }
}