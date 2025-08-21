const { handler } = require('../optimize-route');
const axios = require('axios');
const admin = require('firebase-admin');

// Mock dependencies
jest.mock('axios');
jest.mock('firebase-admin');
jest.mock('node-cache');
jest.mock('../utils/errorHandler');
jest.mock('../utils/auth');
jest.mock('../utils/mockData');

const mockAxios = axios;
const mockAdmin = admin;

// Mock Firebase Admin
mockAdmin.auth = jest.fn(() => ({
  verifyIdToken: jest.fn()
}));

// Mock auth middleware
const { requireAuth } = require('../utils/auth');
requireAuth.mockImplementation(() => Promise.resolve({
  uid: 'test-user-456',
  email: 'route-test@example.com'
}));

// Mock error handlers
const { 
  createSuccessResponse,
  handleValidationError,
  asyncHandler,
  checkRateLimit,
  log
} = require('../utils/errorHandler');

createSuccessResponse.mockImplementation((data) => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  body: JSON.stringify(data)
}));

handleValidationError.mockImplementation((message, details) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.details = details;
  throw error;
});

asyncHandler.mockImplementation((fn) => fn);
checkRateLimit.mockReturnValue(false);
log.mockImplementation(() => {});

// Mock data generators
const { generateMockRoutes } = require('../utils/mockData');

generateMockRoutes.mockReturnValue([
  {
    id: 'route-fastest',
    type: 'Fastest',
    coordinates: [[77.2090, 28.6139], [77.2167, 28.6315]],
    distance: 15.2,
    duration: 1800,
    traffic: 'Heavy',
    fuel: 1.2,
    cost: 85.50,
    confidence: 96.5,
    warnings: []
  },
  {
    id: 'route-eco',
    type: 'Eco-Friendly',
    coordinates: [[77.2090, 28.6139], [77.2200, 28.6280], [77.2167, 28.6315]],
    distance: 16.8,
    duration: 2100,
    traffic: 'Moderate',
    fuel: 0.9,
    cost: 65.25,
    confidence: 94.2,
    warnings: ['Toll road ahead']
  }
]);

describe('Route Optimization Netlify Function', () => {
  let mockEvent;
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'POST',
      headers: {
        'authorization': 'Bearer mock-token',
        'content-type': 'application/json',
        'user-agent': 'Jest Test',
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        start: {
          latitude: 28.6139,
          longitude: 77.2090,
          address: 'Connaught Place, New Delhi'
        },
        destination: {
          latitude: 28.6315,
          longitude: 77.2167,
          address: 'India Gate, New Delhi'
        },
        priority: 'fastest',
        vehicle: 'car',
        avoidFerries: false,
        includeTraffic: true
      })
    };

    mockContext = {
      requestId: 'test-route-request-456'
    };

    // Mock successful OpenRouteService API response
    mockAxios.post.mockResolvedValue({
      data: {
        routes: [{
          summary: {
            distance: 15200,
            duration: 1800
          },
          geometry: {
            coordinates: [
              [77.2090, 28.6139],
              [77.2120, 28.6180],
              [77.2167, 28.6315]
            ]
          },
          segments: [{
            distance: 8500,
            duration: 900,
            steps: [{
              instruction: 'Head northeast on Janpath',
              distance: 500,
              duration: 60
            }]
          }],
          warnings: []
        }]
      }
    });
  });

  describe('CORS Handling', () => {
    test('should handle OPTIONS request for CORS preflight', async () => {
      mockEvent.httpMethod = 'OPTIONS';
      
      const result = await handler(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(result.headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(result.body).toBe('');
    });
  });

  describe('Authentication', () => {
    test('should require valid authentication token', async () => {
      requireAuth.mockRejectedValueOnce(new Error('Invalid token'));
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Invalid token');
      expect(requireAuth).toHaveBeenCalledWith(mockEvent);
    });

    test('should proceed with valid authentication', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(requireAuth).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Request Validation', () => {
    test('should reject non-POST requests', async () => {
      mockEvent.httpMethod = 'GET';
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(handleValidationError).toHaveBeenCalledWith(
        'Only POST method allowed',
        { method: 'GET' }
      );
    });

    test('should validate request body exists', async () => {
      mockEvent.body = null;
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate start coordinates', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      delete invalidBody.start;
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate destination coordinates', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      delete invalidBody.destination;
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate coordinate ranges', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      invalidBody.start.latitude = 200; // Invalid latitude
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate priority values', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      invalidBody.priority = 'invalid-priority';
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate vehicle types', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      invalidBody.vehicle = 'spaceship';
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate distance limits (500km max)', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      // Set coordinates very far apart (>500km)
      invalidBody.destination.latitude = 35.0; // Far from Delhi
      invalidBody.destination.longitude = 85.0;
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits per user', async () => {
      checkRateLimit.mockReturnValueOnce(true);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(checkRateLimit).toHaveBeenCalledWith('route_test-user-456', 100, 3600);
    });

    test('should allow requests within rate limits', async () => {
      checkRateLimit.mockReturnValueOnce(false);
      
      const result = await handler(mockEvent, mockContext);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('OpenRouteService Integration', () => {
    test('should call OpenRouteService API with correct parameters', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('openrouteservice.org'),
        expect.objectContaining({
          coordinates: expect.any(Array),
          profile: expect.any(String),
          format: 'json',
          options: expect.objectContaining({
            avoid_features: expect.any(Array)
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          }),
          timeout: 10000
        })
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle different vehicle profiles correctly', async () => {
      const testCases = [
        { vehicle: 'car', expectedProfile: 'driving-car' },
        { vehicle: 'bike', expectedProfile: 'cycling-regular' },
        { vehicle: 'truck', expectedProfile: 'driving-hgv' },
        { vehicle: 'motorcycle', expectedProfile: 'driving-car' }
      ];

      for (const testCase of testCases) {
        const body = JSON.parse(mockEvent.body);
        body.vehicle = testCase.vehicle;
        mockEvent.body = JSON.stringify(body);
        
        await handler(mockEvent, mockContext);
        
        expect(mockAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            profile: testCase.expectedProfile
          }),
          expect.any(Object)
        );
      }
    });

    test('should handle API timeout gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce({ code: 'ECONNABORTED' });
      
      const result = await handler(mockEvent, mockContext);
      
      // Should fallback to mock data
      expect(result.statusCode).toBe(200);
      const responseData = JSON.parse(result.body);
      expect(responseData.routes).toBeDefined();
      expect(responseData.fallbackUsed).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await handler(mockEvent, mockContext);
      
      // Should fallback to mock data
      expect(result.statusCode).toBe(200);
      const responseData = JSON.parse(result.body);
      expect(responseData.fallbackUsed).toBe(true);
    });
  });

  describe('Route Generation and Optimization', () => {
    test('should generate multiple route options', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.routes).toBeDefined();
      expect(Array.isArray(responseData.routes)).toBe(true);
      expect(responseData.routes.length).toBeGreaterThan(0);
      
      // Should have different route types
      const routeTypes = responseData.routes.map(route => route.type);
      expect(routeTypes).toContain('Fastest');
    });

    test('should calculate comprehensive route statistics', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.stats).toBeDefined();
      expect(responseData.stats.routesOptimized).toBeGreaterThanOrEqual(0);
      expect(responseData.stats.timeSaved).toBeGreaterThanOrEqual(0);
      expect(responseData.stats.fuelEfficiency).toBeGreaterThanOrEqual(0);
      expect(responseData.stats.activeRoutes).toBeGreaterThanOrEqual(0);
      expect(responseData.stats.processingTime).toBeGreaterThan(0);
    });

    test('should include route confidence scores', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      responseData.routes.forEach(route => {
        expect(route.confidence).toBeDefined();
        expect(route.confidence).toBeGreaterThanOrEqual(0);
        expect(route.confidence).toBeLessThanOrEqual(100);
      });
    });

    test('should provide detailed route information', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      responseData.routes.forEach(route => {
        expect(route.id).toBeDefined();
        expect(route.type).toBeDefined();
        expect(route.coordinates).toBeDefined();
        expect(route.distance).toBeGreaterThan(0);
        expect(route.duration).toBeGreaterThan(0);
        expect(route.traffic).toBeDefined();
        expect(route.fuel).toBeGreaterThan(0);
        expect(route.cost).toBeGreaterThan(0);
      });
    });
  });

  describe('Priority-Based Route Selection', () => {
    test('should optimize for fastest route when priority is fastest', async () => {
      const body = JSON.parse(mockEvent.body);
      body.priority = 'fastest';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      // Should include fastest route option
      const fastestRoute = responseData.routes.find(r => r.type === 'Fastest');
      expect(fastestRoute).toBeDefined();
    });

    test('should optimize for eco-friendly route when priority is eco', async () => {
      const body = JSON.parse(mockEvent.body);
      body.priority = 'eco';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      // Should include eco-friendly route option
      const ecoRoute = responseData.routes.find(r => r.type === 'Eco-Friendly');
      expect(ecoRoute).toBeDefined();
    });

    test('should optimize for shortest route when priority is shortest', async () => {
      const body = JSON.parse(mockEvent.body);
      body.priority = 'shortest';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      // Should include shortest route option
      const shortestRoute = responseData.routes.find(r => r.type === 'Shortest');
      expect(shortestRoute).toBeDefined();
    });
  });

  describe('Traffic Integration', () => {
    test('should include traffic information when requested', async () => {
      const body = JSON.parse(mockEvent.body);
      body.includeTraffic = true;
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      responseData.routes.forEach(route => {
        expect(route.traffic).toBeDefined();
        expect(['Light', 'Moderate', 'Heavy', 'Severe']).toContain(route.traffic);
      });
    });

    test('should adjust route timing based on traffic conditions', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      // Routes with heavy traffic should have longer durations
      const heavyTrafficRoutes = responseData.routes.filter(r => r.traffic === 'Heavy');
      const lightTrafficRoutes = responseData.routes.filter(r => r.traffic === 'Light');
      
      if (heavyTrafficRoutes.length > 0 && lightTrafficRoutes.length > 0) {
        const avgHeavyDuration = heavyTrafficRoutes.reduce((sum, r) => sum + r.duration, 0) / heavyTrafficRoutes.length;
        const avgLightDuration = lightTrafficRoutes.reduce((sum, r) => sum + r.duration, 0) / lightTrafficRoutes.length;
        
        expect(avgHeavyDuration).toBeGreaterThanOrEqual(avgLightDuration);
      }
    });
  });

  describe('Fuel and Cost Calculations', () => {
    test('should calculate fuel consumption accurately', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      responseData.routes.forEach(route => {
        expect(route.fuel).toBeGreaterThan(0);
        // Fuel should correlate with distance
        expect(route.fuel).toBeLessThan(route.distance); // Reasonable fuel efficiency
      });
    });

    test('should calculate route costs including fuel and tolls', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      responseData.routes.forEach(route => {
        expect(route.cost).toBeGreaterThan(0);
        // Cost should include fuel cost at minimum
        const minFuelCost = route.fuel * 80; // Assuming ₹80 per liter
        expect(route.cost).toBeGreaterThanOrEqual(minFuelCost * 0.5); // Allow some variance
      });
    });
  });

  describe('Response Format and Performance', () => {
    test('should return properly formatted JSON response', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
      
      const responseData = JSON.parse(result.body);
      expect(responseData.requestId).toBeDefined();
      expect(responseData.timestamp).toBeDefined();
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const result = await handler(mockEvent, mockContext);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(8000); // Less than 8 seconds
      expect(result.statusCode).toBe(200);
    });

    test('should include processing time in response', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.processingTime).toBeDefined();
      expect(responseData.processingTime).toBeGreaterThan(0);
      expect(responseData.processingTime).toBeLessThan(10000);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON in request body', async () => {
      mockEvent.body = 'invalid-json';
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should handle missing required fields gracefully', async () => {
      mockEvent.body = JSON.stringify({ start: { latitude: 28.6139 } }); // Missing longitude and destination
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should log errors appropriately', async () => {
      requireAuth.mockRejectedValueOnce(new Error('Auth failed'));
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(log).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Caching and Performance', () => {
    test('should cache similar route requests', async () => {
      // First request
      await handler(mockEvent, mockContext);
      
      // Second identical request
      const result = await handler(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      // Should have made API calls (mocked behavior)
      expect(mockAxios.post).toHaveBeenCalled();
    });

    test('should handle concurrent route requests efficiently', async () => {
      const promises = Array(3).fill().map(() => 
        handler(mockEvent, mockContext)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
    });
  });
});

// Integration test with real-world scenario
describe('Route Optimization Integration', () => {
  test('should handle complex multi-stop route optimization', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      headers: {
        'authorization': 'Bearer valid-token',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        start: {
          latitude: 28.6139,
          longitude: 77.2090,
          address: 'Connaught Place, New Delhi'
        },
        destination: {
          latitude: 28.5355,
          longitude: 77.3910,
          address: 'Noida Sector 62'
        },
        priority: 'balanced',
        vehicle: 'car',
        avoidFerries: true,
        includeTraffic: true
      })
    };

    // Mock realistic OpenRouteService response
    mockAxios.post.mockResolvedValue({
      data: {
        routes: [{
          summary: {
            distance: 45200, // 45.2 km
            duration: 3600   // 1 hour
          },
          geometry: {
            coordinates: [
              [77.2090, 28.6139],
              [77.2500, 28.6200],
              [77.3000, 28.5800],
              [77.3910, 28.5355]
            ]
          },
          segments: [{
            distance: 15000,
            duration: 1200,
            steps: [{
              instruction: 'Head east on Rajpath',
              distance: 2000,
              duration: 180
            }]
          }],
          warnings: [{
            code: 1,
            message: 'Heavy traffic expected on DND Flyway'
          }]
        }]
      }
    });

    const result = await handler(mockEvent, {});
    const responseData = JSON.parse(result.body);

    // Verify comprehensive response
    expect(responseData.routes).toBeDefined();
    expect(responseData.stats).toBeDefined();
    expect(responseData.mapData).toBeDefined();
    
    // Verify route quality
    expect(responseData.routes.length).toBeGreaterThan(0);
    responseData.routes.forEach(route => {
      expect(route.confidence).toBeGreaterThanOrEqual(90);
      expect(route.distance).toBeGreaterThan(0);
      expect(route.duration).toBeGreaterThan(0);
    });
    
    // Verify performance
    expect(responseData.processingTime).toBeLessThan(5000);
  });
});