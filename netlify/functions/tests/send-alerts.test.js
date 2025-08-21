const { handler } = require('../send-alerts');
const axios = require('axios');
const admin = require('firebase-admin');

// Mock dependencies
jest.mock('axios');
jest.mock('firebase-admin');
jest.mock('node-cache');
jest.mock('../utils/errorHandler');
jest.mock('../utils/auth');

const mockAxios = axios;
const mockAdmin = admin;

// Mock Firebase Admin
mockAdmin.auth = jest.fn(() => ({
  verifyIdToken: jest.fn()
}));

// Mock auth middleware
const { requireAuth } = require('../utils/auth');
requireAuth.mockImplementation(() => Promise.resolve({
  uid: 'admin-user-789',
  email: 'admin@trafficai.com',
  customClaims: { role: 'admin' }
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

describe('Send Alerts Netlify Function', () => {
  let mockEvent;
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set environment variables
    process.env.ONESIGNAL_APP_ID = 'test-app-id';
    process.env.ONESIGNAL_REST_API_KEY = 'test-api-key';
    
    mockEvent = {
      httpMethod: 'POST',
      headers: {
        'authorization': 'Bearer admin-token',
        'content-type': 'application/json',
        'user-agent': 'Jest Test',
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        type: 'TRAFFIC_CONGESTION',
        title: 'Heavy Traffic Alert',
        message: 'Severe congestion detected on Ring Road near ITO',
        data: {
          location: {
            latitude: 28.6315,
            longitude: 77.2167,
            address: 'Ring Road, ITO, New Delhi'
          },
          severity: 'HIGH',
          trafficLevel: 'Heavy',
          estimatedDelay: 25,
          alternativeRoutes: ['Mathura Road', 'Lodhi Road']
        },
        targeting: {
          segments: ['delhi_users'],
          location: {
            latitude: 28.6315,
            longitude: 77.2167,
            radius: 5000
          }
        },
        immediate: false
      })
    };

    mockContext = {
      requestId: 'test-alert-request-789'
    };

    // Mock successful OneSignal API response
    mockAxios.post.mockResolvedValue({
      data: {
        id: 'notification-id-123',
        recipients: 1250,
        external_id: null,
        errors: null
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

  describe('Authentication and Authorization', () => {
    test('should require valid admin authentication', async () => {
      requireAuth.mockRejectedValueOnce(new Error('Invalid token'));
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow('Invalid token');
      expect(requireAuth).toHaveBeenCalledWith(mockEvent, true); // Admin required
    });

    test('should reject non-admin users', async () => {
      requireAuth.mockResolvedValueOnce({
        uid: 'regular-user-123',
        email: 'user@example.com'
        // No admin claims
      });
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should proceed with valid admin authentication', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(requireAuth).toHaveBeenCalledWith(mockEvent, true);
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

    test('should validate required fields', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      delete invalidBody.type;
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate alert type', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      invalidBody.type = 'INVALID_TYPE';
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate title length', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      invalidBody.title = 'A'.repeat(101); // Too long
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should validate message length', async () => {
      const invalidBody = JSON.parse(mockEvent.body);
      invalidBody.message = 'A'.repeat(501); // Too long
      mockEvent.body = JSON.stringify(invalidBody);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits per admin user', async () => {
      checkRateLimit.mockReturnValueOnce(true);
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(checkRateLimit).toHaveBeenCalledWith('alerts_admin-user-789', 100, 3600);
    });

    test('should allow requests within rate limits', async () => {
      checkRateLimit.mockReturnValueOnce(false);
      
      const result = await handler(mockEvent, mockContext);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Alert Type Handling', () => {
    test('should handle TRAFFIC_CONGESTION alerts', async () => {
      const body = JSON.parse(mockEvent.body);
      body.type = 'TRAFFIC_CONGESTION';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          app_id: 'test-app-id',
          headings: expect.objectContaining({
            en: expect.stringContaining('Heavy Traffic Alert')
          }),
          contents: expect.objectContaining({
            en: expect.stringContaining('Severe congestion')
          }),
          priority: 8, // HIGH priority for traffic congestion
          android_sound: 'traffic_alert',
          ios_sound: 'traffic_alert.wav'
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle ROUTE_UPDATE alerts', async () => {
      const body = JSON.parse(mockEvent.body);
      body.type = 'ROUTE_UPDATE';
      body.title = 'Route Updated';
      body.message = 'Your route has been optimized due to traffic changes';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          priority: 6, // MEDIUM priority for route updates
          android_sound: 'route_update',
          ios_sound: 'route_update.wav'
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle WEATHER_IMPACT alerts', async () => {
      const body = JSON.parse(mockEvent.body);
      body.type = 'WEATHER_IMPACT';
      body.title = 'Weather Alert';
      body.message = 'Heavy rain affecting traffic conditions';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          priority: 7, // HIGH priority for weather impacts
          android_sound: 'weather_alert',
          ios_sound: 'weather_alert.wav'
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle ACCIDENT_ALERT alerts', async () => {
      const body = JSON.parse(mockEvent.body);
      body.type = 'ACCIDENT_ALERT';
      body.title = 'Accident Alert';
      body.message = 'Major accident reported on NH-1';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          priority: 10, // CRITICAL priority for accidents
          android_sound: 'emergency_alert',
          ios_sound: 'emergency_alert.wav'
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle FUEL_SAVINGS alerts', async () => {
      const body = JSON.parse(mockEvent.body);
      body.type = 'FUEL_SAVINGS';
      body.title = 'Fuel Savings Opportunity';
      body.message = 'Switch to eco-route and save ₹50 on fuel';
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          priority: 4, // LOW priority for fuel savings
          android_sound: 'savings_alert',
          ios_sound: 'savings_alert.wav'
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Targeting Options', () => {
    test('should handle user-specific targeting', async () => {
      const body = JSON.parse(mockEvent.body);
      body.targeting = {
        users: ['user-123', 'user-456']
      };
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          include_external_user_ids: ['user-123', 'user-456']
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle segment-based targeting', async () => {
      const body = JSON.parse(mockEvent.body);
      body.targeting = {
        segments: ['delhi_users', 'premium_users']
      };
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          included_segments: ['delhi_users', 'premium_users']
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle location-based targeting', async () => {
      const body = JSON.parse(mockEvent.body);
      body.targeting = {
        location: {
          latitude: 28.6315,
          longitude: 77.2167,
          radius: 5000
        }
      };
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              field: 'location',
              radius: 5000,
              lat: 28.6315,
              long: 77.2167
            })
          ])
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle filter-based targeting', async () => {
      const body = JSON.parse(mockEvent.body);
      body.targeting = {
        filters: [
          { field: 'tag', key: 'city', relation: '=', value: 'Delhi' },
          { operator: 'AND' },
          { field: 'tag', key: 'vehicle_type', relation: '=', value: 'car' }
        ]
      };
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          filters: body.targeting.filters
        }),
        expect.any(Object)
      );
      
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Notification Cooldown', () => {
    test('should respect cooldown periods for non-immediate alerts', async () => {
      // Mock that a similar notification was sent recently
      const NodeCache = require('node-cache');
      const mockCache = {
        get: jest.fn().mockReturnValue(Date.now() - 300000), // 5 minutes ago
        set: jest.fn()
      };
      NodeCache.mockImplementation(() => mockCache);
      
      const body = JSON.parse(mockEvent.body);
      body.immediate = false;
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.skipped).toBe(true);
      expect(responseData.reason).toContain('cooldown');
    });

    test('should bypass cooldown for immediate alerts', async () => {
      const body = JSON.parse(mockEvent.body);
      body.immediate = true;
      mockEvent.body = JSON.stringify(body);
      
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });
  });

  describe('OneSignal Integration', () => {
    test('should call OneSignal API with correct parameters', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          app_id: 'test-app-id',
          headings: expect.any(Object),
          contents: expect.any(Object),
          data: expect.any(Object),
          priority: expect.any(Number),
          android_sound: expect.any(String),
          ios_sound: expect.any(String)
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Basic test-api-key',
            'Content-Type': 'application/json'
          }),
          timeout: 10000
        })
      );
      
      expect(result.statusCode).toBe(200);
    });

    test('should handle OneSignal API errors gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            errors: ['Invalid app_id']
          }
        }
      });
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(log).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('OneSignal API error'),
        expect.any(Object)
      );
    });

    test('should handle OneSignal timeout gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce({ code: 'ECONNABORTED' });
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
      expect(log).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('OneSignal timeout'),
        expect.any(Object)
      );
    });
  });

  describe('Response Format', () => {
    test('should return properly formatted success response', async () => {
      const result = await handler(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
      
      const responseData = JSON.parse(result.body);
      expect(responseData.success).toBe(true);
      expect(responseData.notificationId).toBeDefined();
      expect(responseData.recipients).toBeGreaterThan(0);
      expect(responseData.requestId).toBeDefined();
      expect(responseData.timestamp).toBeDefined();
    });

    test('should include processing time in response', async () => {
      const result = await handler(mockEvent, mockContext);
      const responseData = JSON.parse(result.body);
      
      expect(responseData.processingTime).toBeDefined();
      expect(responseData.processingTime).toBeGreaterThan(0);
      expect(responseData.processingTime).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON in request body', async () => {
      mockEvent.body = 'invalid-json';
      
      await expect(handler(mockEvent, mockContext)).rejects.toThrow();
    });

    test('should handle missing OneSignal configuration', async () => {
      delete process.env.ONESIGNAL_APP_ID;
      
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
      expect(responseTime).toBeLessThan(3000); // Less than 3 seconds
      expect(result.statusCode).toBe(200);
    });

    test('should handle concurrent alert requests efficiently', async () => {
      const promises = Array(3).fill().map((_, index) => {
        const event = { ...mockEvent };
        const body = JSON.parse(event.body);
        body.title = `Alert ${index + 1}`;
        event.body = JSON.stringify(body);
        return handler(event, mockContext);
      });
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
    });
  });
});

// Integration test with real-world scenario
describe('Send Alerts Integration', () => {
  test('should handle critical traffic emergency alert', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      headers: {
        'authorization': 'Bearer admin-token',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        type: 'ACCIDENT_ALERT',
        title: 'EMERGENCY: Major Accident',
        message: 'Multi-vehicle accident on NH-1 near Gurgaon. Avoid area. Emergency services on site.',
        data: {
          location: {
            latitude: 28.4595,
            longitude: 77.0266,
            address: 'NH-1, Gurgaon, Haryana'
          },
          severity: 'CRITICAL',
          emergencyServices: true,
          estimatedClearanceTime: '2 hours',
          alternativeRoutes: ['Sohna Road', 'Golf Course Road']
        },
        targeting: {
          location: {
            latitude: 28.4595,
            longitude: 77.0266,
            radius: 10000 // 10km radius
          },
          filters: [
            { field: 'tag', key: 'route_includes', relation: '=', value: 'NH-1' }
          ]
        },
        immediate: true
      })
    };

    // Mock successful OneSignal response for emergency alert
    mockAxios.post.mockResolvedValue({
      data: {
        id: 'emergency-notification-456',
        recipients: 5420,
        external_id: null,
        errors: null
      }
    });

    const result = await handler(mockEvent, {});
    const responseData = JSON.parse(result.body);

    // Verify emergency alert handling
    expect(responseData.success).toBe(true);
    expect(responseData.notificationId).toBe('emergency-notification-456');
    expect(responseData.recipients).toBe(5420);
    
    // Verify OneSignal call with emergency parameters
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://onesignal.com/api/v1/notifications',
      expect.objectContaining({
        priority: 10, // CRITICAL priority
        android_sound: 'emergency_alert',
        ios_sound: 'emergency_alert.wav',
        filters: expect.arrayContaining([
          expect.objectContaining({
            field: 'location',
            radius: 10000
          })
        ])
      }),
      expect.any(Object)
    );
    
    // Verify performance for emergency alerts
    expect(responseData.processingTime).toBeLessThan(2000); // Less than 2 seconds for emergencies
  });
});