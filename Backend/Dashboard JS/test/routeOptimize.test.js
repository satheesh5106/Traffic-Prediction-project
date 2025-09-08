const request = require('supertest');
const express = require('express');
const routeOptimizeRoutes = require('../routes/routeOptimize');
const db = require('../db');

// Mock the database module
jest.mock('../db');

// Mock node-fetch
jest.mock('node-fetch');
const fetch = require('node-fetch');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/routes', routeOptimizeRoutes);

// Mock data
const mockRoute = {
  id: 1,
  name: 'Test Route',
  distance: 15.5,
  time: 25,
  traffic: {
    level: 'moderate',
    speed: 45,
    congestion: 60,
    incidents: [],
    lastUpdated: '2025-01-02T16:15:00.000Z'
  },
  fuelConsumption: 1.24,
  coordinates: [[77.2090, 28.6139], [77.0266, 28.5355]],
  weather: {
    temperature: 25,
    condition: 'Clear',
    description: 'clear sky',
    humidity: 60,
    windSpeed: 5,
    visibility: 10,
    lastUpdated: '2025-01-02T16:15:00.000Z'
  }
};

const mockStats = {
  routesOptimized: 10,
  timeSaved: 120,
  fuelSaved: 5.5,
  activeRoutes: 3
};

const mockORSResponse = {
  routes: [{
    summary: {
      distance: 15500, // meters
      duration: 1500   // seconds
    },
    geometry: {
      coordinates: [[77.2090, 28.6139], [77.0266, 28.5355]]
    }
  }]
};

const mockWeatherResponse = {
  main: {
    temp: 25,
    humidity: 60
  },
  weather: [{
    main: 'Clear',
    description: 'clear sky'
  }],
  wind: {
    speed: 5
  },
  visibility: 10000
};

describe('Route Optimization API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env.OPENROUTESERVICE_API_KEY = 'test-ors-key';
    process.env.MAPMYINDIA_API_KEY = 'test-mmi-key';
    process.env.OPENWEATHERMAP_API_KEY = 'test-weather-key';
  });

  describe('GET /api/routes/optimize', () => {
    it('should fetch all routes successfully', async () => {
      // Mock database responses
      db.getAllRoutes.mockResolvedValue([mockRoute]);
      db.getRouteStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/routes/optimize')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        routes: [mockRoute],
        stats: mockStats,
        meta: {
          count: 1,
          responseTime: expect.any(Number),
          timestamp: expect.any(String)
        }
      });

      expect(db.getAllRoutes).toHaveBeenCalledTimes(1);
      expect(db.getRouteStats).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      db.getAllRoutes.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/routes/optimize')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch routes',
        message: 'Database connection failed',
        responseTime: expect.any(Number)
      });
    });

    it('should return response within acceptable time limit', async () => {
      db.getAllRoutes.mockResolvedValue([]);
      db.getRouteStats.mockResolvedValue(mockStats);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/routes/optimize')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500); // Should be under 500ms
      expect(response.body.meta.responseTime).toBeLessThan(500);
    });
  });

  // Define validRouteRequest at module level for reuse
  const validRouteRequest = {
    start: { lat: 28.6139, lng: 77.2090 },
    end: { lat: 28.5355, lng: 77.0266 },
    name: 'Test Route',
    userId: 'user123'
  };

  describe('POST /api/routes/optimize', () => {

    it('should create optimized route successfully', async () => {
      // Mock API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockORSResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        });

      // Mock database response
      db.insertRoute.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/routes/optimize')
        .send(validRouteRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        route: {
          id: 1,
          name: 'Test Route',
          distance: expect.any(Number),
          time: expect.any(Number),
          traffic: expect.objectContaining({
            level: expect.any(String),
            speed: expect.any(Number),
            congestion: expect.any(Number)
          }),
          fuelConsumption: expect.any(Number),
          coordinates: expect.any(Array),
          weather: expect.objectContaining({
            temperature: expect.any(Number),
            condition: expect.any(String)
          })
        },
        meta: {
          responseTime: expect.any(Number),
          timestamp: expect.any(String),
          apiCalls: expect.any(Object)
        }
      });

      expect(db.insertRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Route',
          distance: expect.any(Number),
          time: expect.any(Number)
        }),
        'user123'
      );
    });

    it('should validate required coordinates', async () => {
      const invalidRequest = {
        start: { lat: 28.6139 }, // missing lng
        end: { lat: 28.5355, lng: 77.0266 },
        name: 'Invalid Route'
      };

      const response = await request(app)
        .post('/api/routes/optimize')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid coordinates',
        message: 'Start and end coordinates (lat, lng) are required'
      });
    });

    it('should handle API failures gracefully', async () => {
      // Mock API failure
      fetch.mockRejectedValue(new Error('ORS API error: 429 Too Many Requests'));

      const response = await request(app)
        .post('/api/routes/optimize')
        .send(validRouteRequest)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to optimize route',
        message: expect.stringContaining('ORS API error'),
        responseTime: expect.any(Number)
      });
    });

    it('should return response within acceptable time limit', async () => {
      // Mock fast API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockORSResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        });

      db.insertRoute.mockResolvedValue(1);

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/routes/optimize')
        .send(validRouteRequest)
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500); // Should be under 500ms
      expect(response.body.meta.responseTime).toBeLessThan(500);
    });

    it('should generate default route name when not provided', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockORSResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        });

      db.insertRoute.mockResolvedValue(1);

      const requestWithoutName = {
        start: { lat: 28.6139, lng: 77.2090 },
        end: { lat: 28.5355, lng: 77.0266 },
        userId: 'user123'
      };

      const response = await request(app)
        .post('/api/routes/optimize')
        .send(requestWithoutName)
        .expect(200);

      expect(response.body.route.name).toMatch(/^Route \d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('GET /api/routes/optimize/stats', () => {
    it('should fetch route statistics successfully', async () => {
      db.getRouteStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/routes/optimize/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        stats: mockStats,
        meta: {
          responseTime: expect.any(Number),
          timestamp: expect.any(String)
        }
      });

      expect(db.getRouteStats).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      db.getRouteStats.mockRejectedValue(new Error('Stats query failed'));

      const response = await request(app)
        .get('/api/routes/optimize/stats')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch statistics',
        message: 'Stats query failed',
        responseTime: expect.any(Number)
      });
    });
  });

  describe('Data Freshness', () => {
    it('should ensure traffic data is recent', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockORSResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        });

      db.insertRoute.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/routes/optimize')
        .send(validRouteRequest)
        .expect(200);

      const trafficTimestamp = new Date(response.body.route.traffic.lastUpdated);
      const now = new Date();
      const timeDiff = (now - trafficTimestamp) / 1000; // seconds

      expect(timeDiff).toBeLessThan(30); // Should be less than 30 seconds old
    });

    it('should ensure weather data is recent', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockORSResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        });

      db.insertRoute.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/routes/optimize')
        .send(validRouteRequest)
        .expect(200);

      const weatherTimestamp = new Date(response.body.route.weather.lastUpdated);
      const now = new Date();
      const timeDiff = (now - weatherTimestamp) / 1000; // seconds

      expect(timeDiff).toBeLessThan(30); // Should be less than 30 seconds old
    });
  });
});