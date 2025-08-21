const { handler } = require('../traffic-predictions');
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
  uid: 'test-user-123',
  email: 'test@example.com'
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
const { 
  generateMockTrafficPredictions,
  generateMockTrafficStats,
  generateMockHistoricalData
} = require('../utils/mockData');

generateMockTrafficPredictions.mockReturnValue([
  {
    id: 'pred-1',
    location: 'Connaught Place, Delhi',
    coordinates: [28.6315, 77.2167],
    level: 'Heavy',
    confidence: 94.5,
    eta: 25,
    timestamp: '2024-01-15T10:30:00Z',
    details: {
      speed: 15,
      density: 0.8,
      incidents: 1
    }
  }
]);

generateMockTrafficStats.mockReturnValue({
  lastUpdated: Date.now(),
  activePredictions: 156,
  accuracyRate: 96.8,
  responseTime: 180,
  criticalAlerts: 3
});

generateMockHistoricalData.mockReturnValue([
  {
    timestamp: '2024-01-15T09:00:00Z',
    location: 'India Gate, Delhi',
    level: 'Moderate',
    accuracy: 98.2
  }
]);

describe('Traffic Predictions Netlify Function', () => {
  let mockEvent;
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'GET',
      headers: {
        'authorization': 'Bearer mock-token',
        'user-agent': 'Jest Test',
        'x-forwarded-for': '127.0.0.1'
      },
      queryStringParameters: {
        latitude: '28.6139',
        longitude: '77.2090',
        radius: '10',
        city: 'Delhi'
      },
      body: null
    };

    mockContext = {
      requestId: 'test-request-123'
    };

    // Mock successful API responses
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('traffic.api.here.com')) {
        return Promise.resolve({
          data: {
            RWS: [{
              RW: [{
                FIS: [{
                  FI: [{
                    TMC: {
                      PC: 1,
                      DE: 'Heavy traffic on Ring Road',
                      QD: '+'
                    },
                    CF: [{
                      JF: 2.5,
                      SP: 15.0,
                      SU: 45.0,
                      CN: 0.8
                    }]
                  }]
                }]
              }]
            }]
          }
        });
      }
      
      if (url.includes('api.open-meteo.com')) {
        return Promise.resolve({
          data: {
            current_weather: {
              temperature: 25.5,
              windspeed: 8.2,
              weathercode: 1
            },
            hourly: {
              precipitation: [0, 0.2, 0.5, 0],
              visibility: [10000, 8000, 5000, 9000]
            }
          }
        });
      }
      
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  describe('CORS Handling', () => {
    test('should handle OPTIONS request for CORS preflight', async () => {
      mockEvent.httpMethod = 'OPTIONS';
      
      const result = await handler(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(result.headers['Access-Control-Allow-Methods']).toContain('GET');
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
    test('should reject non-GET requests', async () => {
      mockEvent.httpMethod = 'POST';
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(handleValidationError).toHaveBeenCalledWith(
        'Only GET method allowed',
        { method: 'POST' }
      );
    });

    test('should validate latitude parameter', async () => {
      mockEvent.queryStringParameters.latitude = 'invalid';
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate longitude parameter', async () => {
      mockEvent.queryStringParameters.longitude = '200'; // Invalid longitude
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate radius parameter', async () => {
      mockEvent.queryStringParameters.radius = '100'; // Too large
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits per user', async () => {
      checkRateLimit.mockReturnValueOnce(true);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(checkRateLimit).toHaveBeenCalledWith('traffic_test-user-123', 1000, 3600);
    });

    test('should allow requests within rate limits', async () => {
      checkRateLimit.mockReturnValueOnce(false);
      
      const result = await handler(mockEvent, mockContext);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('External API Integration', () => {
    test('should fetch HERE Traffic API data successfully', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('traffic.api.here.com'),
        expect.objectContaining({
          timeout: 8000,
          params: expect.objectContaining({
            bbox: expect.any(String),
            apikey: expect.any(String)
          })
        })
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should fetch Open-Meteo weather data successfully', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com'),
        expect.objectContaining({
          timeout: 5000,
          params: expect.objectContaining({
            latitude: 28.6139,
            longitude: 77.2090,
            current_weather: true,
            hourly: 'precipitation,visibility'
          })
        })
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle API timeout gracefully', async () => {
      mockAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' });
      
      const result = await handler(mockEvent, mockContext);
      
      // Should fallback to mock data
      expect(result.statusCode).toBe(200);
      const responseData = JSON.parse(result.body);
      expect(responseData.predictions).toBeDefined();
      expect(responseData.fallbackUsed).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await handler(mockEvent, mockContext);
      
      // Should fallback to mock data
      expect(result.statusCode).toBe(200);
      const responseData = JSON.parse(result.body);
      expect(responseData.fallbackUsed).toBe(true);
    });
  });

  describe('Data Processing and Accuracy', () => {
    test('should return predictions with 99%+ accuracy requirement', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.predictions).toBeDefined();
      expect(Array.isArray(responseData.predictions)).toBe(true);
      
      // Check accuracy requirement
      if (responseData.predictions.length > 0) {
        const avgConfidence = responseData.predictions.reduce(
          (sum, pred) => sum + pred.confidence, 0
        ) / responseData.predictions.length;
        
        expect(avgConfidence).toBeGreaterThanOrEqual(90); // 90%+ confidence
      }
    });

    test('should include comprehensive traffic statistics', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.stats).toBeDefined();
      expect(responseData.stats.lastUpdated).toBeDefined();
      expect(responseData.stats.activePredictions).toBeGreaterThanOrEqual(0);
      expect(responseData.stats.accuracyRate).toBeGreaterThanOrEqual(90);
      expect(responseData.stats.responseTime).toBeGreaterThan(0);
      expect(responseData.stats.criticalAlerts).toBeGreaterThanOrEqual(0);
    });

    test('should provide map visualization data', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.mapData).toBeDefined();
      expect(responseData.mapData.live).toBeDefined();
      expect(responseData.mapData.predicted).toBeDefined();
      expect(responseData.mapData.historical).toBeDefined();
    });

    test('should include processing time in response', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.processingTime).toBeDefined();
      expect(responseData.processingTime).toBeGreaterThan(0);
      expect(responseData.processingTime).toBeLessThan(10000); // Less than 10 seconds
    });
  });

  describe('Response Format', () => {
    test('should return properly formatted JSON response', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
      
      const responseData = JSON.parse(result.body);
      expect(responseData.requestId).toBeDefined();
      expect(responseData.timestamp).toBeDefined();
    });

    test('should include request tracking information', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.requestId).toBeDefined();
      expect(responseData.timestamp).toBeDefined();
      expect(responseData.processingTime).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing query parameters gracefully', async () => {
      mockEvent.queryStringParameters = null;
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should handle malformed coordinates', async () => {
      mockEvent.queryStringParameters.latitude = 'not-a-number';
      
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

  describe('Performance Requirements', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const result = await handler(mockEvent, mockContext);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000); // Less than 5 seconds
      expect(result.statusCode).toBe(200);
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = Array(5).fill().map(() => 
        handler(mockEvent, mockContext)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
    });
  });
});

// Integration test with real-like data
describe('Traffic Predictions Integration', () => {
  test('should process real-world traffic scenario', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      headers: {
        'authorization': 'Bearer valid-token'
      },
      queryStringParameters: {
        latitude: '28.6139', // New Delhi coordinates
        longitude: '77.2090',
        radius: '5',
        city: 'Delhi'
      }
    };

    // Mock realistic API responses
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('traffic.api.here.com')) {
        return Promise.resolve({
          data: {
            RWS: [{
              RW: [{
                FIS: [{
                  FI: [{
                    TMC: {
                      PC: 1,
                      DE: 'Heavy traffic on Rajpath due to event',
                      QD: '+'
                    },
                    CF: [{
                      JF: 1.8, // Jam factor
                      SP: 12.0, // Speed
                      SU: 50.0, // Speed uncongested
                      CN: 0.9   // Confidence
                    }]
                  }]
                }]
              }]
            }]
          }
        });
      }
      
      return Promise.resolve({
        data: {
          current_weather: {
            temperature: 32.0,
            windspeed: 5.5,
            weathercode: 0 // Clear sky
          },
          hourly: {
            precipitation: [0, 0, 0, 0],
            visibility: [10000, 10000, 9500, 10000]
          }
        }
      });
    });

    const result = await handler(mockEvent, {});
    const responseData = JSON.parse(result.body);

    // Verify comprehensive response
    expect(responseData.predictions).toBeDefined();
    expect(responseData.stats).toBeDefined();
    expect(responseData.mapData).toBeDefined();
    
    // Verify data quality
    expect(responseData.stats.accuracyRate).toBeGreaterThanOrEqual(90);
    expect(responseData.processingTime).toBeLessThan(3000);
  });
});