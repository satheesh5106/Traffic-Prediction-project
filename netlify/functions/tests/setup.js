// Jest setup file for global configuration and mocks

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Create mock request object
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    headers: {
      'authorization': 'Bearer valid-token',
      'content-type': 'application/json',
      'origin': 'https://localhost:3000'
    },
    body: null,
    query: {},
    ...overrides
  }),

  // Create mock response object
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };
    return res;
  },

  // Create mock Firebase user
  createMockUser: (overrides = {}) => ({
    uid: 'test-user-123',
    email: 'test@example.com',
    email_verified: true,
    custom_claims: { admin: false },
    ...overrides
  }),

  // Create mock admin user
  createMockAdmin: (overrides = {}) => ({
    uid: 'admin-user-123',
    email: 'admin@example.com',
    email_verified: true,
    custom_claims: { admin: true },
    ...overrides
  }),

  // Wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random coordinates within India
  generateIndianCoordinates: () => ({
    latitude: 20 + Math.random() * 15, // 20-35°N
    longitude: 68 + Math.random() * 30  // 68-98°E
  }),

  // Generate mock traffic data
  generateMockTrafficData: () => ({
    flow: {
      speed: 45 + Math.random() * 40,
      freeFlow: 80,
      jamFactor: Math.random() * 10,
      confidence: 0.9 + Math.random() * 0.1
    },
    incidents: [],
    roadClosure: false
  }),

  // Generate mock route data
  generateMockRouteData: () => ({
    distance: 1000 + Math.random() * 50000,
    duration: 600 + Math.random() * 3600,
    geometry: {
      coordinates: [
        [77.2090, 28.6139], // Delhi
        [77.5946, 12.9716]  // Bangalore
      ]
    },
    confidence: 0.9 + Math.random() * 0.1
  })
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.HERE_API_KEY = 'test-here-key';
process.env.OPENROUTESERVICE_API_KEY = 'test-ors-key';
process.env.ONESIGNAL_APP_ID = 'test-onesignal-app';
process.env.ONESIGNAL_REST_API_KEY = 'test-onesignal-key';

// Global mocks for external dependencies
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue(global.testUtils.createMockUser())
  }),
  firestore: () => ({
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ test: 'data' })
    }),
    set: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({})
  })
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  }))
}));

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    has: jest.fn(),
    keys: jest.fn().mockReturnValue([]),
    flushAll: jest.fn()
  }));
});

// Mock crypto for UUID generation
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash')
  }))
}));

// Performance monitoring
const originalPerformanceNow = performance.now;
beforeEach(() => {
  // Reset performance timer
  performance.now = jest.fn(() => Date.now());
});

afterEach(() => {
  // Restore original performance.now
  performance.now = originalPerformanceNow;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Fail the test if there's an unhandled rejection
  throw reason;
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  throw error;
});

// Test database cleanup
beforeAll(async () => {
  // Setup test database if needed
});

afterAll(async () => {
  // Cleanup test database if needed
});

// Export test utilities for use in test files
module.exports = {
  testUtils: global.testUtils
};