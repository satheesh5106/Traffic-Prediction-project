import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { weatherConfig } from '../config/weather';
import { ThirdPartyError, InternalServerError } from '../errors/weatherErrors';

// Request context interface
interface RequestContext {
  requestId?: string;
  service?: string;
  startTime?: number;
}

// Extend Axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: RequestContext;
  }
}

// Create Axios instance with default configuration
const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    timeout: weatherConfig.HTTP_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `Weather-API-Server/${process.env.npm_package_version || '1.0.0'}`,
      'Accept': 'application/json'
    },
    // Disable automatic JSON parsing for better error handling
    transformResponse: [(data) => {
      try {
        return JSON.parse(data);
      } catch (error) {
        return data;
      }
    }]
  });

  // Request interceptor - add request ID and timing
  client.interceptors.request.use(
    (config) => {
      const context: RequestContext = {
        requestId: config.headers['X-Request-ID'] as string || 
          `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        service: extractServiceName(config.url || ''),
        startTime: Date.now()
      };

      // Add request ID to headers
      config.headers['X-Request-ID'] = context.requestId;
      
      // Store context in config for use in response interceptor
      config.metadata = context;

      // Log outgoing request
      console.log(`[${context.requestId}] → ${config.method?.toUpperCase()} ${config.url}`);
      
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle responses and errors
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const context = response.config.metadata as RequestContext;
      const duration = context?.startTime ? Date.now() - context.startTime : 0;
      
      console.log(
        `[${context?.requestId}] ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`
      );
      
      return response;
    },
    (error: AxiosError) => {
      const context = error.config?.metadata as RequestContext;
      const duration = context?.startTime ? Date.now() - context.startTime : 0;
      const service = context?.service || 'unknown';
      
      // Log error
      console.error(
        `[${context?.requestId}] ✗ ${error.response?.status || 'NETWORK_ERROR'} ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`,
        error.message
      );

      // Transform axios errors to weather errors
      const weatherError = transformAxiosError(error, service, context?.requestId);
      return Promise.reject(weatherError);
    }
  );

  return client;
};

// Extract service name from URL for better error context
const extractServiceName = (url: string): string => {
  if (url.includes('imd') || url.includes('mausam')) {
    return 'IMD_API';
  }
  if (url.includes('openweathermap')) {
    return 'OPENWEATHERMAP_API';
  }
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'LOCAL_API';
  }
  return 'EXTERNAL_API';
};

// Transform Axios errors to WeatherError instances
const transformAxiosError = (
  error: AxiosError,
  service: string,
  requestId?: string
): ThirdPartyError | InternalServerError => {
  const { response, request, message } = error;

  // Network/timeout errors
  if (!response && request) {
    return new ThirdPartyError(
      service,
      `Network error: ${message}`,
      502,
      error,
      {
        type: 'network_error',
        url: error.config?.url,
        timeout: error.code === 'ECONNABORTED'
      },
      requestId
    );
  }

  // HTTP error responses
  if (response) {
    const statusCode = response.status;
    const errorData = response.data;
    
    let errorMessage = `${service} API error: ${statusCode}`;
    if (errorData && typeof errorData === 'object' && 'message' in errorData && typeof errorData.message === 'string') {
      errorMessage += ` - ${errorData.message}`;
    } else if (typeof errorData === 'string') {
      errorMessage += ` - ${errorData}`;
    }

    return new ThirdPartyError(
      service,
      errorMessage,
      statusCode >= 500 ? 502 : statusCode, // Map 5xx to 502 Bad Gateway
      error,
      {
        originalStatus: statusCode,
        originalResponse: errorData,
        url: error.config?.url
      },
      requestId
    );
  }

  // Request setup errors
  return new InternalServerError(
    `HTTP client error: ${message}`,
    error,
    {
      type: 'http_client_error',
      url: error.config?.url
    },
    requestId
  );
};

// Create and export the default HTTP client instance
export const httpClient = createHttpClient();

// Export factory function for creating custom clients
export const createCustomHttpClient = (config?: AxiosRequestConfig): AxiosInstance => {
  const client = createHttpClient();
  
  if (config) {
    // Merge custom config with defaults
    Object.assign(client.defaults, config);
  }
  
  return client;
};

// Utility functions for common HTTP operations
export const httpUtils = {
  /**
   * GET request with automatic error handling
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await httpClient.get<T>(url, config);
    return response.data;
  },

  /**
   * POST request with automatic error handling
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await httpClient.post<T>(url, data, config);
    return response.data;
  },

  /**
   * PUT request with automatic error handling
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await httpClient.put<T>(url, data, config);
    return response.data;
  },

  /**
   * DELETE request with automatic error handling
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await httpClient.delete<T>(url, config);
    return response.data;
  },

  /**
   * Check if a URL is reachable
   */
  async isReachable(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      await httpClient.get(url, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Export types
export type { RequestContext };
export default httpClient;