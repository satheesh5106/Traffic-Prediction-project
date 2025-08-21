/**
 * Configuration settings for Netlify Functions
 */

// Environment detection
const isDev = process.env.NODE_ENV !== 'production';

// API configuration
const apiConfig = {
  // Base path for API endpoints
  basePath: '/api',
  
  // CORS settings
  cors: {
    origin: isDev ? '*' : process.env.ALLOWED_ORIGINS || 'https://traffic-ai.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  
  // Rate limiting settings
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Authentication rate limits
  authRateLimit: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 login attempts per windowMs
      standardHeaders: true,
      legacyHeaders: false
    },
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // limit each IP to 3 registration attempts per windowMs
      standardHeaders: true,
      legacyHeaders: false
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // limit each IP to 3 password reset attempts per windowMs
      standardHeaders: true,
      legacyHeaders: false
    }
  }
};

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'traffic-ai-dev',
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
  databaseURL: process.env.FIREBASE_DATABASE_URL
};

// Traffic prediction configuration
const trafficConfig = {
  // Default cities for development
  defaultCities: [
    { id: 'mumbai', name: 'Mumbai', center: [19.0760, 72.8777] },
    { id: 'delhi', name: 'Delhi', center: [28.7041, 77.1025] },
    { id: 'bangalore', name: 'Bangalore', center: [12.9716, 77.5946] },
    { id: 'hyderabad', name: 'Hyderabad', center: [17.3850, 78.4867] },
    { id: 'chennai', name: 'Chennai', center: [13.0827, 80.2707] }
  ],
  
  // Traffic levels and their weights
  trafficLevels: [
    { level: 'Low', weight: 0.3, color: '#22c55e' },
    { level: 'Moderate', weight: 0.4, color: '#f59e0b' },
    { level: 'Heavy', weight: 0.2, color: '#f97316' },
    { level: 'Severe', weight: 0.1, color: '#ef4444' }
  ],
  
  // Incident types
  incidentTypes: [
    'Accident', 'Construction', 'Event', 'Hazard', 'Road Closure', 'Weather'
  ]
};

// Route optimization configuration
const routeConfig = {
  // Route types
  routeTypes: [
    { id: 'fastest', name: 'Fastest', icon: 'clock', color: '#3b82f6' },
    { id: 'shortest', name: 'Shortest', icon: 'route', color: '#10b981' },
    { id: 'eco', name: 'Eco-Friendly', icon: 'leaf', color: '#22c55e' },
    { id: 'scenic', name: 'Scenic', icon: 'mountain', color: '#8b5cf6' }
  ],
  
  // Vehicle types
  vehicleTypes: [
    { id: 'car', name: 'Car', icon: 'car' },
    { id: 'motorcycle', name: 'Motorcycle', icon: 'motorcycle' },
    { id: 'truck', name: 'Truck', icon: 'truck' },
    { id: 'bicycle', name: 'Bicycle', icon: 'bicycle' }
  ]
};

module.exports = {
  isDev,
  apiConfig,
  firebaseConfig,
  trafficConfig,
  routeConfig
};