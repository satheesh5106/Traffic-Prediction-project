/**
 * API Client for TrafficAI Backend
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Base API URL - uses environment variable in production, localhost in development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Default request timeout
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get Firebase ID token if user is authenticated
    if (typeof window !== 'undefined') {
      try {
        const { auth } = await import('@/lib/firebase');
        const user = auth?.currentUser;
        
        if (user) {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Failed to get Firebase ID token:', error);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh Firebase token and retry
      if (typeof window !== 'undefined') {
        try {
          const { auth } = await import('@/lib/firebase');
          const user = auth?.currentUser;
          
          if (user) {
            // Force refresh the token
            const token = await user.getIdToken(true);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          } else {
            // No user, redirect to auth
            window.location.href = '/auth';
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          window.location.href = '/auth';
        }
      }
      
      return Promise.reject(error);
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

/**
 * Traffic Prediction API
 */
export const trafficApi = {
  /**
   * Get all supported cities
   * @returns {Promise<Array>} List of cities
   */
  getCities: async () => {
    const response = await apiClient.get('/traffic-prediction/api/cities');
    return response.data;
  },
  
  /**
   * Get live traffic data for a city
   * @param {string} cityId - City ID
   * @returns {Promise<Object>} Live traffic data
   */
  getLiveTraffic: async (cityId: string) => {
    const response = await apiClient.get(`/traffic-prediction/api/traffic/live/${cityId}`);
    return response.data;
  },
  
  /**
   * Get predicted traffic data for a city
   * @param {string} cityId - City ID
   * @param {number} hoursAhead - Hours ahead to predict
   * @returns {Promise<Object>} Predicted traffic data
   */
  getPredictedTraffic: async (cityId: string, hoursAhead: number = 1) => {
    const response = await apiClient.get(`/traffic-prediction/api/traffic/predicted/${cityId}`, {
      params: { hoursAhead }
    });
    return response.data;
  },
  
  /**
   * Get historical traffic data for a city
   * @param {string} cityId - City ID
   * @param {number} daysBack - Days back to retrieve
   * @returns {Promise<Object>} Historical traffic data
   */
  getHistoricalTraffic: async (cityId: string, daysBack: number = 7) => {
    const response = await apiClient.get(`/traffic-prediction/api/traffic/historical/${cityId}`, {
      params: { daysBack }
    });
    return response.data;
  },
  
  /**
   * Get traffic metrics
   * @returns {Promise<Object>} Traffic metrics
   */
  getTrafficMetrics: async () => {
    const response = await apiClient.get('/traffic-prediction/api/traffic/metrics');
    return response.data;
  },
  
  /**
   * Report a traffic incident
   * @param {Object} report - Traffic incident report
   * @returns {Promise<Object>} Created report
   */
  reportTrafficIncident: async (report: any) => {
    const response = await apiClient.post('/traffic-prediction/api/traffic/report', report);
    return response.data;
  }
};

/**
 * Route Optimization API
 */
export const routeApi = {
  /**
   * Optimize a route
   * @param {Object} params - Route parameters
   * @returns {Promise<Object>} Optimized routes
   */
  optimizeRoute: async (params: {
    start: [number, number],
    end: [number, number],
    priority?: string,
    vehicleType?: string
  }) => {
    const response = await apiClient.post('/route-optimization/api/routes/optimize', params);
    return response.data;
  },
  
  /**
   * Get route metrics
   * @returns {Promise<Object>} Route metrics
   */
  getRouteMetrics: async () => {
    const response = await apiClient.get('/route-optimization/api/routes/metrics');
    return response.data;
  },
  
  /**
   * Get active routes
   * @returns {Promise<Array>} Active routes
   */
  getActiveRoutes: async () => {
    const response = await apiClient.get('/route-optimization/api/routes/active');
    return response.data;
  },
  
  /**
   * Select a route
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} Selected route
   */
  selectRoute: async (routeId: string) => {
    const response = await apiClient.post('/route-optimization/api/routes/select', { routeId });
    return response.data;
  }
};

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  register: async (userData: {
    email: string,
    password: string,
    name: string
  }) => {
    const response = await apiClient.post('/auth/api/auth/register', userData);
    return response.data;
  },
  
  /**
   * Login a user
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Login result with token
   */
  login: async (credentials: {
    email: string,
    password: string
  }) => {
    const response = await apiClient.post('/auth/api/auth/login', credentials);
    
    // Store token in localStorage
    if (response.data.token && typeof window !== 'undefined') {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  },
  
  /**
   * Logout the current user
   * @returns {Promise<void>}
   */
  logout: async () => {
    // Call logout endpoint
    await apiClient.post('/auth/api/auth/logout');
    
    // Remove token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  },
  
  /**
   * Get the current user's profile
   * @returns {Promise<Object>} User profile
   */
  getProfile: async () => {
    const response = await apiClient.get('/auth/api/auth/profile');
    return response.data;
  },
  
  /**
   * Update the current user's profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  updateProfile: async (profileData: any) => {
    const response = await apiClient.put('/auth/api/auth/profile', profileData);
    return response.data;
  },
  
  /**
   * Request a password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset request result
   */
  requestPasswordReset: async (email: string) => {
    const response = await apiClient.post('/auth/api/auth/password-reset', { email });
    return response.data;
  },
  
  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('authToken');
  }
};

// Export the configured axios instance
export { apiClient };

export default {
  trafficApi,
  routeApi,
  authApi
};