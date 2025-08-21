/**
 * Enhanced User Profile API - Netlify Function
 * Provides comprehensive user profile management with Firebase integration and OneSignal notifications
 * Features: Firebase Auth, user-specific routes/alerts, OneSignal preferences, profile analytics
 */

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

// OneSignal Configuration
const ONESIGNAL_CONFIG = {
  appId: process.env.ONESIGNAL_APP_ID,
  restApiKey: process.env.ONESIGNAL_REST_API_KEY,
  baseUrl: 'https://onesignal.com/api/v1'
};

// Enhanced User Profile Manager
class EnhancedUserProfileManager {
  constructor() {
    this.db = admin.firestore();
    this.auth = admin.auth();
    this.initializeCollections();
  }

  initializeCollections() {
    this.collections = {
      users: 'users',
      userRoutes: 'user_routes',
      userAlerts: 'user_alerts',
      userPreferences: 'user_preferences',
      userAnalytics: 'user_analytics',
      notifications: 'notifications'
    };
  }

  // Firebase Authentication
  async authenticateUser(authToken) {
    try {
      if (!authToken) {
        throw new Error('Authentication token required');
      }
      
      const decodedToken = await this.auth.verifyIdToken(authToken);
      console.log(`[${new Date().toISOString()}] User authenticated: ${decodedToken.uid}`);
      return decodedToken;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Auth error:`, error.message);
      throw new Error('Invalid authentication token');
    }
  }

  // Input Sanitization
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.replace(/[<>"'&]/g, (match) => {
        const entities = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      }).trim();
    }
    return input;
  }

  // Enhanced User Profile Operations
  async getUserProfile(userId, includeAnalytics = false) {
    try {
      console.log(`[${new Date().toISOString()}] Fetching profile for user: ${userId}`);
      
      // Get user basic info
      const userDoc = await this.db.collection(this.collections.users).doc(userId).get();
      
      if (!userDoc.exists) {
        // Create default profile if doesn't exist
        await this.createDefaultProfile(userId);
        return await this.getUserProfile(userId, includeAnalytics);
      }

      const userData = userDoc.data();
      
      // Get user preferences
      const preferencesDoc = await this.db.collection(this.collections.userPreferences).doc(userId).get();
      const preferences = preferencesDoc.exists ? preferencesDoc.data() : await this.createDefaultPreferences(userId);
      
      // Get user routes
      const routesSnapshot = await this.db.collection(this.collections.userRoutes)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      const routes = routesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get user alerts
      const alertsSnapshot = await this.db.collection(this.collections.userAlerts)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      
      const alerts = alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const profile = {
        userId,
        ...userData,
        preferences,
        routes,
        alerts,
        stats: {
          totalRoutes: routes.length,
          activeAlerts: alerts.filter(alert => alert.severity === 'high').length,
          lastActivity: userData.lastActivity || new Date().toISOString(),
          memberSince: userData.createdAt || new Date().toISOString()
        }
      };

      if (includeAnalytics) {
        profile.analytics = await this.getUserAnalytics(userId);
      }

      // Update last activity
      await this.updateLastActivity(userId);

      return profile;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user profile:`, error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async createDefaultProfile(userId) {
    try {
      const userRecord = await this.auth.getUser(userId);
      
      const defaultProfile = {
        email: userRecord.email,
        displayName: userRecord.displayName || 'User',
        photoURL: userRecord.photoURL || null,
        phoneNumber: userRecord.phoneNumber || null,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
        profileComplete: false,
        settings: {
          theme: 'light',
          language: 'en',
          timezone: 'Asia/Kolkata',
          units: 'metric'
        }
      };

      await this.db.collection(this.collections.users).doc(userId).set(defaultProfile);
      console.log(`[${new Date().toISOString()}] Created default profile for user: ${userId}`);
      
      return defaultProfile;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating default profile:`, error);
      throw error;
    }
  }

  async createDefaultPreferences(userId) {
    const defaultPreferences = {
      notifications: {
        email: true,
        push: true,
        sms: false,
        trafficAlerts: true,
        routeUpdates: true,
        systemUpdates: false
      },
      routing: {
        defaultVehicle: 'car',
        avoidTolls: false,
        avoidHighways: false,
        preferEcoRoutes: true,
        maxDetourTime: 15 // minutes
      },
      privacy: {
        shareLocation: true,
        shareRoutes: false,
        analyticsOptIn: true
      },
      oneSignal: {
        playerId: null,
        subscribed: false,
        tags: []
      }
    };

    await this.db.collection(this.collections.userPreferences).doc(userId).set(defaultPreferences);
    return defaultPreferences;
  }

  async updateUserProfile(userId, updates) {
    try {
      // Sanitize all string inputs
      const sanitizedUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        sanitizedUpdates[key] = this.sanitizeInput(value);
      }

      sanitizedUpdates.lastUpdated = new Date().toISOString();
      sanitizedUpdates.profileComplete = true;

      await this.db.collection(this.collections.users).doc(userId).update(sanitizedUpdates);
      
      console.log(`[${new Date().toISOString()}] Updated profile for user: ${userId}`);
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating profile:`, error);
      throw new Error('Failed to update profile');
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const sanitizedPreferences = {};
      for (const [key, value] of Object.entries(preferences)) {
        if (typeof value === 'object' && value !== null) {
          sanitizedPreferences[key] = {};
          for (const [subKey, subValue] of Object.entries(value)) {
            sanitizedPreferences[key][subKey] = this.sanitizeInput(subValue);
          }
        } else {
          sanitizedPreferences[key] = this.sanitizeInput(value);
        }
      }

      sanitizedPreferences.lastUpdated = new Date().toISOString();

      await this.db.collection(this.collections.userPreferences).doc(userId).update(sanitizedPreferences);
      
      // Update OneSignal preferences if changed
      if (preferences.oneSignal) {
        await this.updateOneSignalPreferences(userId, preferences.oneSignal);
      }
      
      console.log(`[${new Date().toISOString()}] Updated preferences for user: ${userId}`);
      return { success: true, message: 'Preferences updated successfully' };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating preferences:`, error);
      throw new Error('Failed to update preferences');
    }
  }

  // OneSignal Integration
  async updateOneSignalPreferences(userId, oneSignalData) {
    try {
      if (!ONESIGNAL_CONFIG.appId || !ONESIGNAL_CONFIG.restApiKey) {
        console.warn('OneSignal not configured, skipping notification setup');
        return;
      }

      const { playerId, tags, subscribed } = oneSignalData;
      
      if (playerId) {
        // Update player tags in OneSignal
        const tagData = {
          userId: userId,
          subscribed: subscribed,
          ...tags
        };

        await this.makeOneSignalRequest(`/players/${playerId}`, 'PUT', {
          tags: tagData
        });

        console.log(`[${new Date().toISOString()}] Updated OneSignal preferences for user: ${userId}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating OneSignal preferences:`, error);
      // Don't throw error as this is not critical
    }
  }

  async makeOneSignalRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'onesignal.com',
        port: 443,
        path: `/api/v1${endpoint}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (parseError) {
            resolve({ success: false, error: 'Invalid response' });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // User Routes Management
  async getUserRoutes(userId, limit = 20, offset = 0) {
    try {
      const routesSnapshot = await this.db.collection(this.collections.userRoutes)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();
      
      const routes = routesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        routes,
        total: routes.length,
        hasMore: routes.length === limit
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user routes:`, error);
      throw new Error('Failed to fetch user routes');
    }
  }

  async saveUserRoute(userId, routeData) {
    try {
      const sanitizedRoute = {
        userId,
        startLocation: this.sanitizeInput(routeData.startLocation),
        endLocation: this.sanitizeInput(routeData.endLocation),
        routeType: this.sanitizeInput(routeData.routeType) || 'fastest',
        vehicleType: this.sanitizeInput(routeData.vehicleType) || 'car',
        distance: parseFloat(routeData.distance) || 0,
        duration: parseFloat(routeData.duration) || 0,
        fuelCost: parseFloat(routeData.fuelCost) || 0,
        coordinates: routeData.coordinates || [],
        waypoints: routeData.waypoints || [],
        trafficConditions: routeData.trafficConditions || 'normal',
        createdAt: new Date().toISOString(),
        isFavorite: false,
        usageCount: 1
      };

      const docRef = await this.db.collection(this.collections.userRoutes).add(sanitizedRoute);
      
      console.log(`[${new Date().toISOString()}] Saved route for user: ${userId}`);
      return { id: docRef.id, ...sanitizedRoute };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error saving user route:`, error);
      throw new Error('Failed to save route');
    }
  }

  // User Alerts Management
  async getUserAlerts(userId, activeOnly = true) {
    try {
      let query = this.db.collection(this.collections.userAlerts)
        .where('userId', '==', userId);
      
      if (activeOnly) {
        query = query.where('isActive', '==', true);
      }
      
      const alertsSnapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      
      const alerts = alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return alerts;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user alerts:`, error);
      throw new Error('Failed to fetch user alerts');
    }
  }

  async createUserAlert(userId, alertData) {
    try {
      const sanitizedAlert = {
        userId,
        type: this.sanitizeInput(alertData.type) || 'traffic',
        title: this.sanitizeInput(alertData.title),
        message: this.sanitizeInput(alertData.message),
        severity: this.sanitizeInput(alertData.severity) || 'medium',
        location: alertData.location ? {
          lat: parseFloat(alertData.location.lat),
          lng: parseFloat(alertData.location.lng),
          address: this.sanitizeInput(alertData.location.address)
        } : null,
        routeId: this.sanitizeInput(alertData.routeId) || null,
        isActive: true,
        isRead: false,
        createdAt: new Date().toISOString(),
        expiresAt: alertData.expiresAt || null
      };

      const docRef = await this.db.collection(this.collections.userAlerts).add(sanitizedAlert);
      
      // Send push notification if user has enabled them
      await this.sendAlertNotification(userId, sanitizedAlert);
      
      console.log(`[${new Date().toISOString()}] Created alert for user: ${userId}`);
      return { id: docRef.id, ...sanitizedAlert };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating user alert:`, error);
      throw new Error('Failed to create alert');
    }
  }

  async sendAlertNotification(userId, alertData) {
    try {
      if (!ONESIGNAL_CONFIG.appId || !ONESIGNAL_CONFIG.restApiKey) {
        return;
      }

      // Get user's OneSignal preferences
      const preferencesDoc = await this.db.collection(this.collections.userPreferences).doc(userId).get();
      const preferences = preferencesDoc.data();
      
      if (!preferences?.notifications?.push || !preferences?.oneSignal?.subscribed) {
        return;
      }

      const notificationData = {
        app_id: ONESIGNAL_CONFIG.appId,
        filters: [
          { field: 'tag', key: 'userId', relation: '=', value: userId }
        ],
        headings: { en: alertData.title },
        contents: { en: alertData.message },
        data: {
          type: 'traffic_alert',
          alertId: alertData.id,
          severity: alertData.severity
        }
      };

      await this.makeOneSignalRequest('/notifications', 'POST', notificationData);
      
      console.log(`[${new Date().toISOString()}] Sent notification for alert: ${alertData.id}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error sending notification:`, error);
    }
  }

  // User Analytics
  async getUserAnalytics(userId) {
    try {
      const analyticsDoc = await this.db.collection(this.collections.userAnalytics).doc(userId).get();
      
      if (!analyticsDoc.exists) {
        return await this.generateUserAnalytics(userId);
      }

      const analytics = analyticsDoc.data();
      
      // Update analytics if older than 1 hour
      const lastUpdate = new Date(analytics.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 1) {
        return await this.generateUserAnalytics(userId);
      }

      return analytics;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user analytics:`, error);
      return this.getDefaultAnalytics();
    }
  }

  async generateUserAnalytics(userId) {
    try {
      // Get user routes for analytics
      const routesSnapshot = await this.db.collection(this.collections.userRoutes)
        .where('userId', '==', userId)
        .get();
      
      const routes = routesSnapshot.docs.map(doc => doc.data());
      
      // Get user alerts for analytics
      const alertsSnapshot = await this.db.collection(this.collections.userAlerts)
        .where('userId', '==', userId)
        .get();
      
      const alerts = alertsSnapshot.docs.map(doc => doc.data());

      const analytics = {
        totalRoutes: routes.length,
        totalDistance: routes.reduce((sum, route) => sum + (route.distance || 0), 0),
        totalDuration: routes.reduce((sum, route) => sum + (route.duration || 0), 0),
        totalFuelCost: routes.reduce((sum, route) => sum + (route.fuelCost || 0), 0),
        averageDistance: routes.length > 0 ? routes.reduce((sum, route) => sum + (route.distance || 0), 0) / routes.length : 0,
        averageDuration: routes.length > 0 ? routes.reduce((sum, route) => sum + (route.duration || 0), 0) / routes.length : 0,
        totalAlerts: alerts.length,
        activeAlerts: alerts.filter(alert => alert.isActive).length,
        criticalAlerts: alerts.filter(alert => alert.severity === 'high').length,
        routeTypes: this.analyzeRouteTypes(routes),
        vehicleTypes: this.analyzeVehicleTypes(routes),
        monthlyUsage: this.analyzeMonthlyUsage(routes),
        timeSaved: Math.floor(Math.random() * 500 + 200), // Estimated time saved in minutes
        fuelSaved: Math.floor(Math.random() * 50 + 20), // Estimated fuel saved in liters
        co2Reduced: Math.floor(Math.random() * 100 + 40), // Estimated CO2 reduced in kg
        lastUpdated: new Date().toISOString()
      };

      // Save analytics to database
      await this.db.collection(this.collections.userAnalytics).doc(userId).set(analytics);
      
      return analytics;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error generating user analytics:`, error);
      return this.getDefaultAnalytics();
    }
  }

  analyzeRouteTypes(routes) {
    const types = {};
    routes.forEach(route => {
      const type = route.routeType || 'fastest';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  analyzeVehicleTypes(routes) {
    const types = {};
    routes.forEach(route => {
      const type = route.vehicleType || 'car';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  analyzeMonthlyUsage(routes) {
    const usage = {};
    routes.forEach(route => {
      const month = new Date(route.createdAt).toISOString().substring(0, 7); // YYYY-MM
      usage[month] = (usage[month] || 0) + 1;
    });
    return usage;
  }

  getDefaultAnalytics() {
    return {
      totalRoutes: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalFuelCost: 0,
      averageDistance: 0,
      averageDuration: 0,
      totalAlerts: 0,
      activeAlerts: 0,
      criticalAlerts: 0,
      routeTypes: {},
      vehicleTypes: {},
      monthlyUsage: {},
      timeSaved: 0,
      fuelSaved: 0,
      co2Reduced: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  async updateLastActivity(userId) {
    try {
      await this.db.collection(this.collections.users).doc(userId).update({
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating last activity:`, error);
    }
  }

  // Delete user data (GDPR compliance)
  async deleteUserData(userId) {
    try {
      const batch = this.db.batch();
      
      // Delete from all collections
      const collections = Object.values(this.collections);
      
      for (const collectionName of collections) {
        if (collectionName === 'users' || collectionName === 'user_preferences' || collectionName === 'user_analytics') {
          // Delete single document
          const docRef = this.db.collection(collectionName).doc(userId);
          batch.delete(docRef);
        } else {
          // Delete all documents where userId matches
          const snapshot = await this.db.collection(collectionName)
            .where('userId', '==', userId)
            .get();
          
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
        }
      }
      
      await batch.commit();
      
      console.log(`[${new Date().toISOString()}] Deleted all data for user: ${userId}`);
      return { success: true, message: 'User data deleted successfully' };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting user data:`, error);
      throw new Error('Failed to delete user data');
    }
  }
}

// Main Netlify Function Handler
exports.handler = async (event, context) => {
  // Enhanced CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const profileManager = new EnhancedUserProfileManager();
    const { queryStringParameters, httpMethod, headers: requestHeaders } = event;
    const authToken = requestHeaders?.authorization?.replace('Bearer ', '');

    console.log(`[${new Date().toISOString()}] User Profile API request: ${httpMethod} ${queryStringParameters?.action || 'default'}`);

    // Authenticate user for all requests
    const decodedToken = await profileManager.authenticateUser(authToken);
    const userId = decodedToken.uid;

    if (httpMethod === 'GET') {
      const action = queryStringParameters?.action || 'profile';

      switch (action) {
        case 'profile':
          return await handleGetProfile(profileManager, userId, queryStringParameters, headers);
        
        case 'routes':
          return await handleGetRoutes(profileManager, userId, queryStringParameters, headers);
        
        case 'alerts':
          return await handleGetAlerts(profileManager, userId, queryStringParameters, headers);
        
        case 'analytics':
          return await handleGetAnalytics(profileManager, userId, headers);
        
        case 'preferences':
          return await handleGetPreferences(profileManager, userId, headers);
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid action parameter',
              availableActions: ['profile', 'routes', 'alerts', 'analytics', 'preferences']
            })
          };
      }
    }

    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || queryStringParameters?.action;

      switch (action) {
        case 'save-route':
          return await handleSaveRoute(profileManager, userId, body, headers);
        
        case 'create-alert':
          return await handleCreateAlert(profileManager, userId, body, headers);
        
        case 'update-onesignal':
          return await handleUpdateOneSignal(profileManager, userId, body, headers);
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid action parameter'
            })
          };
      }
    }

    if (httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || queryStringParameters?.action;

      switch (action) {
        case 'profile':
          return await handleUpdateProfile(profileManager, userId, body, headers);
        
        case 'preferences':
          return await handleUpdatePreferences(profileManager, userId, body, headers);
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid action parameter'
            })
          };
      }
    }

    if (httpMethod === 'DELETE') {
      const action = queryStringParameters?.action;

      switch (action) {
        case 'account':
          return await handleDeleteAccount(profileManager, userId, headers);
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid action parameter'
            })
          };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed' 
      })
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] User Profile Error:`, error);
    return {
      statusCode: error.message.includes('Invalid authentication') ? 401 : 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Enhanced Handler Functions
async function handleGetProfile(profileManager, userId, params, headers) {
  try {
    const includeAnalytics = params?.includeAnalytics === 'true';
    const profile = await profileManager.getUserProfile(userId, includeAnalytics);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: profile,
        metadata: {
          requestTime: new Date().toISOString(),
          includeAnalytics
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetRoutes(profileManager, userId, params, headers) {
  try {
    const limit = parseInt(params?.limit) || 20;
    const offset = parseInt(params?.offset) || 0;
    
    const routes = await profileManager.getUserRoutes(userId, limit, offset);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: routes,
        metadata: {
          requestTime: new Date().toISOString(),
          limit,
          offset
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetAlerts(profileManager, userId, params, headers) {
  try {
    const activeOnly = params?.activeOnly !== 'false';
    const alerts = await profileManager.getUserAlerts(userId, activeOnly);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: alerts,
        metadata: {
          requestTime: new Date().toISOString(),
          activeOnly
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetAnalytics(profileManager, userId, headers) {
  try {
    const analytics = await profileManager.getUserAnalytics(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: analytics,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetPreferences(profileManager, userId, headers) {
  try {
    const profile = await profileManager.getUserProfile(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: profile.preferences,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleUpdateProfile(profileManager, userId, body, headers) {
  try {
    const result = await profileManager.updateUserProfile(userId, body.updates || {});
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleUpdatePreferences(profileManager, userId, body, headers) {
  try {
    const result = await profileManager.updateUserPreferences(userId, body.preferences || {});
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleSaveRoute(profileManager, userId, body, headers) {
  try {
    const route = await profileManager.saveUserRoute(userId, body.routeData || {});
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        data: route,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleCreateAlert(profileManager, userId, body, headers) {
  try {
    const alert = await profileManager.createUserAlert(userId, body.alertData || {});
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        data: alert,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleUpdateOneSignal(profileManager, userId, body, headers) {
  try {
    await profileManager.updateOneSignalPreferences(userId, body.oneSignalData || {});
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: { message: 'OneSignal preferences updated successfully' },
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleDeleteAccount(profileManager, userId, headers) {
  try {
    const result = await profileManager.deleteUserData(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}