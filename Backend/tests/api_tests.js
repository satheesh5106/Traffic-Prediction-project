/**
 * TrafficAI API Test Suite
 * 
 * This file contains sample tests for the TrafficAI API endpoints.
 * Run these tests using Jest or another testing framework.
 */

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
let authToken = '';

// Helper function for authenticated requests
const authenticatedRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    data: data ? data : undefined
  };
  
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Authentication Tests
describe('Authentication API', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test@123',
    name: 'Test User'
  };
  
  test('Register a new user', async () => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, testUser);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('uid');
    expect(response.data.data.email).toBe(testUser.email);
  });
  
  test('Login user', async () => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('token');
    expect(response.data.data).toHaveProperty('user');
    
    // Save token for subsequent tests
    authToken = response.data.data.token;
  });
  
  test('Get user profile', async () => {
    const response = await authenticatedRequest('get', '/api/auth/profile');
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('uid');
    expect(response.data.email).toBe(testUser.email);
    expect(response.data.name).toBe(testUser.name);
  });
  
  test('Update user profile', async () => {
    const updatedProfile = {
      name: 'Updated Test User',
      preferences: {
        defaultVehicle: 'car',
        defaultRoutePriority: 'fastest'
      }
    };
    
    const response = await authenticatedRequest('put', '/api/auth/profile', updatedProfile);
    
    expect(response.success).toBe(true);
    expect(response.data.name).toBe(updatedProfile.name);
    expect(response.data.preferences).toEqual(updatedProfile.preferences);
  });
});

// Traffic Prediction Tests
describe('Traffic Prediction API', () => {
  beforeAll(async () => {
    // Login to get token if not already authenticated
    if (!authToken) {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'Test@123'
      });
      authToken = response.data.data.token;
    }
  });
  
  test('Get traffic prediction', async () => {
    const predictionRequest = {
      latitude: 12.9716,
      longitude: 77.5946,
      radius: 2000,
      timeframe: 30
    };
    
    const response = await authenticatedRequest('post', '/api/traffic-prediction', predictionRequest);
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('prediction');
    expect(response.data).toHaveProperty('confidence');
    expect(response.data).toHaveProperty('eta');
    expect(response.data).toHaveProperty('liveTraffic');
    expect(response.data).toHaveProperty('weather');
  });
  
  test('Get traffic statistics', async () => {
    const response = await authenticatedRequest('get', '/api/traffic-stats');
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('userStats');
    expect(response.data).toHaveProperty('globalStats');
    expect(response.data.userStats).toHaveProperty('activePredictions');
    expect(response.data.userStats).toHaveProperty('totalPredictions');
    expect(response.data.userStats).toHaveProperty('accuracyRate');
  });
  
  test('Get historical traffic data', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 days ago
    
    const endDate = new Date();
    
    const queryParams = new URLSearchParams({
      latitude: 12.9716,
      longitude: 77.5946,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }).toString();
    
    const response = await authenticatedRequest('get', `/api/traffic-history?${queryParams}`);
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('historicalData');
    expect(Array.isArray(response.data.historicalData)).toBe(true);
    expect(response.data).toHaveProperty('location');
    expect(response.data).toHaveProperty('period');
  });
  
  test('Get traffic alerts', async () => {
    const response = await authenticatedRequest('get', '/api/traffic-alerts');
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('alerts');
    expect(Array.isArray(response.data.alerts)).toBe(true);
    expect(response.data).toHaveProperty('count');
    expect(response.data).toHaveProperty('lastUpdated');
  });
});

// Route Optimization Tests
describe('Route Optimization API', () => {
  beforeAll(async () => {
    // Login to get token if not already authenticated
    if (!authToken) {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'Test@123'
      });
      authToken = response.data.data.token;
    }
  });
  
  test('Optimize route', async () => {
    const routeRequest = {
      start: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      destination: {
        latitude: 13.0827,
        longitude: 77.5877
      },
      priority: 'fastest',
      vehicleType: 'car'
    };
    
    const response = await authenticatedRequest('post', '/api/optimize-route', routeRequest);
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('route');
    expect(response.data.route).toHaveProperty('path');
    expect(response.data.route).toHaveProperty('distance');
    expect(response.data.route).toHaveProperty('duration');
    expect(response.data.route).toHaveProperty('timeSaved');
    expect(response.data.route).toHaveProperty('fuelEfficiency');
    expect(response.data.route).toHaveProperty('instructions');
  });
  
  test('Get route options', async () => {
    const optionsRequest = {
      start: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      destination: {
        latitude: 13.0827,
        longitude: 77.5877
      },
      vehicleType: 'car'
    };
    
    const response = await authenticatedRequest('post', '/api/route-options', optionsRequest);
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('options');
    expect(Array.isArray(response.data.options)).toBe(true);
    expect(response.data.options.length).toBeGreaterThanOrEqual(1);
    
    // Check if all route types are present
    const routeTypes = response.data.options.map(option => option.type);
    expect(routeTypes).toContain('fastest');
    expect(routeTypes).toContain('shortest');
    expect(routeTypes).toContain('eco');
    expect(routeTypes).toContain('scenic');
  });
  
  test('Get route statistics', async () => {
    const response = await authenticatedRequest('get', '/api/route-stats');
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('userStats');
    expect(response.data).toHaveProperty('globalStats');
    expect(response.data.userStats).toHaveProperty('routesOptimized');
    expect(response.data.userStats).toHaveProperty('timeSaved');
    expect(response.data.userStats).toHaveProperty('fuelEfficiency');
    expect(response.data.userStats).toHaveProperty('activeRoutes');
  });
  
  test('Get active routes', async () => {
    const response = await authenticatedRequest('get', '/api/active-routes');
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('routes');
    expect(Array.isArray(response.data.routes)).toBe(true);
    expect(response.data).toHaveProperty('count');
    expect(response.data).toHaveProperty('lastUpdated');
    
    if (response.data.routes.length > 0) {
      const route = response.data.routes[0];
      expect(route).toHaveProperty('start');
      expect(route).toHaveProperty('destination');
      expect(route).toHaveProperty('priority');
      expect(route).toHaveProperty('vehicleType');
      expect(route).toHaveProperty('distance');
      expect(route).toHaveProperty('duration');
    }
  });
});

// Health Check Test
describe('Health Check API', () => {
  test('Get server status', async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
    expect(response.data.status).toBe('ok');
    expect(response.data).toHaveProperty('timestamp');
  });
});

// Error Handling Tests
describe('Error Handling', () => {
  test('Invalid route should return 404', async () => {
    try {
      await axios.get(`${API_BASE_URL}/invalid-route`);
      // If the request succeeds, fail the test
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
  
  test('Unauthorized access should return 401', async () => {
    try {
      await axios.get(`${API_BASE_URL}/api/auth/profile`);
      // If the request succeeds, fail the test
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('Invalid input should return 400', async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/traffic-prediction`, {
        // Missing required fields
      });
      // If the request succeeds, fail the test
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
});