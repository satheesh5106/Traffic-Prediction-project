/**
 * Enhanced User Profile Section API - Netlify Function
 * Comprehensive user profile management with Firebase integration
 * Features: Firebase Auth, profile management, route history, preferences, OneSignal integration
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
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
  apiKey: process.env.ONESIGNAL_API_KEY,
  baseUrl: 'https://onesignal.com/api/v1'
};

// Enhanced User Profile Manager with Firebase Integration
class EnhancedUserProfileManager {
  constructor() {
    this.db = admin.firestore();
    this.auth = admin.auth();
    this.storage = admin.storage();
    this.initializeCollections();
  }

  initializeCollections() {
    this.collections = {
      userProfiles: 'user_profiles',
      routeHistory: 'route_history',
      userPreferences: 'user_preferences',
      notifications: 'user_notifications',
      auditLogs: 'audit_logs',
      userSessions: 'user_sessions',
      userStats: 'user_stats',
      favoriteLocations: 'favorite_locations',
      vehicleProfiles: 'vehicle_profiles'
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

  sanitizeObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this.sanitizeObject(item) : this.sanitizeInput(item)
        );
      } else {
        sanitized[key] = this.sanitizeInput(value);
      }
    }
    
    return sanitized;
  }

  // Enhanced User Profile Management
  async getUserProfile(userId) {
    try {
      console.log(`[${new Date().toISOString()}] Fetching profile for user: ${userId}`);
      
      // Get user profile from Firestore
      const profileDoc = await this.db.collection(this.collections.userProfiles).doc(userId).get();
      
      if (profileDoc.exists) {
        const profile = profileDoc.data();
        
        // Get additional user data
        const [preferences, stats, vehicles, favorites] = await Promise.all([
          this.getUserPreferences(userId),
          this.getUserStats(userId),
          this.getUserVehicles(userId),
          this.getFavoriteLocations(userId)
        ]);
        
        return {
          ...profile,
          preferences,
          stats,
          vehicles,
          favoriteLocations: favorites,
          lastAccessed: new Date().toISOString()
        };
      }
      
      // Create default profile if not found
      const defaultProfile = await this.createDefaultProfile(userId);
      return defaultProfile;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user profile:`, error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async createDefaultProfile(userId) {
    try {
      // Get user info from Firebase Auth
      const userRecord = await this.auth.getUser(userId);
      
      const defaultProfile = {
        userId,
        personalInfo: {
          displayName: userRecord.displayName || '',
          email: userRecord.email || '',
          phoneNumber: userRecord.phoneNumber || '',
          photoURL: userRecord.photoURL || null,
          dateOfBirth: null,
          gender: null,
          occupation: null,
          location: {
            country: 'India',
            state: '',
            city: '',
            pincode: '',
            coordinates: {
              lat: 28.6139,
              lng: 77.2090 // Default to Delhi
            }
          }
        },
        accountInfo: {
          accountType: 'free', // free, premium, enterprise
          memberSince: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          loginCount: 1,
          emailVerified: userRecord.emailVerified || false,
          phoneVerified: false,
          twoFactorEnabled: false,
          accountStatus: 'active', // active, suspended, pending
          subscriptionStatus: 'none', // none, active, expired, cancelled
          subscriptionExpiry: null
        },
        preferences: {
          language: 'en',
          timezone: 'Asia/Kolkata',
          theme: 'light',
          units: 'metric',
          currency: 'INR',
          notifications: {
            email: true,
            push: true,
            sms: false,
            trafficAlerts: true,
            routeUpdates: true,
            promotions: false,
            newsletter: false
          },
          privacy: {
            profileVisibility: 'private', // public, friends, private
            shareLocation: true,
            shareRouteHistory: false,
            allowAnalytics: true,
            dataRetention: 90
          }
        },
        stats: {
          totalRoutes: 0,
          totalDistance: 0,
          totalTime: 0,
          fuelSaved: 0,
          co2Reduced: 0,
          averageRating: 0,
          routesThisMonth: 0,
          distanceThisMonth: 0,
          favoriteRoute: null,
          mostUsedVehicle: null
        },
        vehicles: [],
        favoriteLocations: [],
        routeHistory: [],
        achievements: [],
        socialConnections: {
          friends: [],
          groups: [],
          sharedRoutes: []
        },
        appUsage: {
          featuresUsed: [],
          sessionCount: 0,
          averageSessionDuration: 0,
          lastFeatureUsed: null,
          feedbackGiven: []
        },
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '2.0.0'
      };
      
      // Save default profile
      await this.saveUserProfile(userId, defaultProfile);
      
      // Initialize OneSignal player
      await this.initializeOneSignalPlayer(userId, userRecord.email);
      
      return defaultProfile;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating default profile:`, error);
      throw new Error('Failed to create default profile');
    }
  }

  async saveUserProfile(userId, profile) {
    try {
      profile.lastUpdated = new Date().toISOString();
      
      await this.db.collection(this.collections.userProfiles).doc(userId).set(profile, { merge: true });
      
      console.log(`[${new Date().toISOString()}] Saved profile for user: ${userId}`);
      return profile;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error saving user profile:`, error);
      throw new Error('Failed to save user profile');
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      // Get current profile
      const currentProfile = await this.getUserProfile(userId);
      
      // Validate updates
      const validationResult = this.validateProfileUpdates(updates);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      // Sanitize updates
      const sanitizedUpdates = this.sanitizeObject(updates);
      
      // Create backup for audit
      const backup = JSON.parse(JSON.stringify(currentProfile));
      
      // Merge updates with current profile
      const updatedProfile = this.mergeDeep(currentProfile, sanitizedUpdates);
      updatedProfile.lastUpdated = new Date().toISOString();
      
      // Save updated profile
      await this.saveUserProfile(userId, updatedProfile);
      
      // Log audit event
      await this.logAuditEvent(userId, 'profile_update', {
        changes: sanitizedUpdates,
        timestamp: new Date().toISOString()
      });
      
      // Update OneSignal player if email changed
      if (updates.personalInfo?.email) {
        await this.updateOneSignalPlayer(userId, updates.personalInfo.email);
      }
      
      return {
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating user profile:`, error);
      throw error;
    }
  }

  // Profile Validation
  validateProfileUpdates(updates) {
    const errors = [];
    
    try {
      if (updates.personalInfo) {
        const personalErrors = this.validatePersonalInfo(updates.personalInfo);
        errors.push(...personalErrors);
      }
      
      if (updates.preferences) {
        const preferenceErrors = this.validatePreferences(updates.preferences);
        errors.push(...preferenceErrors);
      }
      
      if (updates.vehicles) {
        const vehicleErrors = this.validateVehicles(updates.vehicles);
        errors.push(...vehicleErrors);
      }
      
      if (updates.favoriteLocations) {
        const locationErrors = this.validateFavoriteLocations(updates.favoriteLocations);
        errors.push(...locationErrors);
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error: ' + error.message]
      };
    }
  }

  validatePersonalInfo(personalInfo) {
    const errors = [];
    
    if (personalInfo.email && !this.isValidEmail(personalInfo.email)) {
      errors.push('Invalid email format');
    }
    
    if (personalInfo.phoneNumber && !this.isValidPhone(personalInfo.phoneNumber)) {
      errors.push('Invalid phone number format');
    }
    
    if (personalInfo.displayName && (personalInfo.displayName.length < 2 || personalInfo.displayName.length > 50)) {
      errors.push('Display name must be between 2 and 50 characters');
    }
    
    if (personalInfo.dateOfBirth && !this.isValidDate(personalInfo.dateOfBirth)) {
      errors.push('Invalid date of birth');
    }
    
    if (personalInfo.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(personalInfo.gender)) {
      errors.push('Invalid gender value');
    }
    
    return errors;
  }

  validatePreferences(preferences) {
    const errors = [];
    
    if (preferences.language && !this.isValidLanguage(preferences.language)) {
      errors.push('Invalid language code');
    }
    
    if (preferences.timezone && !this.isValidTimezone(preferences.timezone)) {
      errors.push('Invalid timezone');
    }
    
    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      errors.push('Invalid theme value');
    }
    
    if (preferences.units && !['metric', 'imperial'].includes(preferences.units)) {
      errors.push('Invalid units value');
    }
    
    if (preferences.currency && !this.isValidCurrency(preferences.currency)) {
      errors.push('Invalid currency code');
    }
    
    return errors;
  }

  validateVehicles(vehicles) {
    const errors = [];
    
    if (!Array.isArray(vehicles)) {
      errors.push('Vehicles must be an array');
      return errors;
    }
    
    vehicles.forEach((vehicle, index) => {
      if (!vehicle.type || !['car', 'motorcycle', 'truck', 'bus', 'bicycle'].includes(vehicle.type)) {
        errors.push(`Invalid vehicle type at index ${index}`);
      }
      
      if (!vehicle.name || vehicle.name.length < 2 || vehicle.name.length > 30) {
        errors.push(`Vehicle name at index ${index} must be between 2 and 30 characters`);
      }
      
      if (vehicle.fuelEfficiency && (vehicle.fuelEfficiency < 1 || vehicle.fuelEfficiency > 100)) {
        errors.push(`Invalid fuel efficiency at index ${index}`);
      }
    });
    
    return errors;
  }

  validateFavoriteLocations(locations) {
    const errors = [];
    
    if (!Array.isArray(locations)) {
      errors.push('Favorite locations must be an array');
      return errors;
    }
    
    locations.forEach((location, index) => {
      if (!location.name || location.name.length < 2 || location.name.length > 50) {
        errors.push(`Location name at index ${index} must be between 2 and 50 characters`);
      }
      
      if (!location.coordinates || !location.coordinates.lat || !location.coordinates.lng) {
        errors.push(`Invalid coordinates for location at index ${index}`);
      }
      
      if (Math.abs(location.coordinates.lat) > 90 || Math.abs(location.coordinates.lng) > 180) {
        errors.push(`Invalid coordinate values for location at index ${index}`);
      }
    });
    
    return errors;
  }

  // Route History Management
  async getUserRouteHistory(userId, limit = 20, offset = 0) {
    try {
      const routeHistorySnapshot = await this.db.collection(this.collections.routeHistory)
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset)
        .get();
      
      const routes = routeHistorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        routes,
        totalCount: routes.length,
        hasMore: routes.length === limit
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching route history:`, error);
      throw new Error('Failed to fetch route history');
    }
  }

  async addRouteToHistory(userId, routeData) {
    try {
      const sanitizedRoute = this.sanitizeObject(routeData);
      
      const routeEntry = {
        userId,
        ...sanitizedRoute,
        timestamp: new Date().toISOString(),
        id: this.generateId()
      };
      
      await this.db.collection(this.collections.routeHistory).add(routeEntry);
      
      // Update user stats
      await this.updateUserStats(userId, routeData);
      
      console.log(`[${new Date().toISOString()}] Added route to history for user: ${userId}`);
      return routeEntry;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error adding route to history:`, error);
      throw new Error('Failed to add route to history');
    }
  }

  async deleteRouteFromHistory(userId, routeId) {
    try {
      // Verify route belongs to user
      const routeDoc = await this.db.collection(this.collections.routeHistory).doc(routeId).get();
      
      if (!routeDoc.exists) {
        throw new Error('Route not found');
      }
      
      const routeData = routeDoc.data();
      if (routeData.userId !== userId) {
        throw new Error('Unauthorized to delete this route');
      }
      
      await this.db.collection(this.collections.routeHistory).doc(routeId).delete();
      
      console.log(`[${new Date().toISOString()}] Deleted route ${routeId} for user: ${userId}`);
      return { success: true, message: 'Route deleted successfully' };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting route:`, error);
      throw error;
    }
  }

  // User Statistics Management
  async getUserStats(userId) {
    try {
      const statsDoc = await this.db.collection(this.collections.userStats).doc(userId).get();
      
      if (statsDoc.exists) {
        return statsDoc.data();
      }
      
      // Return default stats
      return {
        totalRoutes: 0,
        totalDistance: 0,
        totalTime: 0,
        fuelSaved: 0,
        co2Reduced: 0,
        averageRating: 0,
        routesThisMonth: 0,
        distanceThisMonth: 0,
        favoriteRoute: null,
        mostUsedVehicle: null,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user stats:`, error);
      return {};
    }
  }

  async updateUserStats(userId, routeData) {
    try {
      const currentStats = await this.getUserStats(userId);
      
      const updatedStats = {
        ...currentStats,
        totalRoutes: (currentStats.totalRoutes || 0) + 1,
        totalDistance: (currentStats.totalDistance || 0) + (routeData.distance || 0),
        totalTime: (currentStats.totalTime || 0) + (routeData.duration || 0),
        fuelSaved: (currentStats.fuelSaved || 0) + (routeData.fuelSaved || 0),
        co2Reduced: (currentStats.co2Reduced || 0) + (routeData.co2Saved || 0),
        lastUpdated: new Date().toISOString()
      };
      
      // Update monthly stats
      const currentMonth = new Date().getMonth();
      const routeMonth = new Date(routeData.timestamp || new Date()).getMonth();
      
      if (currentMonth === routeMonth) {
        updatedStats.routesThisMonth = (currentStats.routesThisMonth || 0) + 1;
        updatedStats.distanceThisMonth = (currentStats.distanceThisMonth || 0) + (routeData.distance || 0);
      }
      
      await this.db.collection(this.collections.userStats).doc(userId).set(updatedStats, { merge: true });
      
      return updatedStats;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating user stats:`, error);
    }
  }

  // Vehicle Management
  async getUserVehicles(userId) {
    try {
      const vehiclesSnapshot = await this.db.collection(this.collections.vehicleProfiles)
        .where('userId', '==', userId)
        .get();
      
      return vehiclesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user vehicles:`, error);
      return [];
    }
  }

  async addUserVehicle(userId, vehicleData) {
    try {
      const sanitizedVehicle = this.sanitizeObject(vehicleData);
      
      const vehicle = {
        userId,
        ...sanitizedVehicle,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        id: this.generateId()
      };
      
      const docRef = await this.db.collection(this.collections.vehicleProfiles).add(vehicle);
      
      return {
        success: true,
        message: 'Vehicle added successfully',
        data: { id: docRef.id, ...vehicle }
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error adding vehicle:`, error);
      throw new Error('Failed to add vehicle');
    }
  }

  async updateUserVehicle(userId, vehicleId, updates) {
    try {
      // Verify vehicle belongs to user
      const vehicleDoc = await this.db.collection(this.collections.vehicleProfiles).doc(vehicleId).get();
      
      if (!vehicleDoc.exists) {
        throw new Error('Vehicle not found');
      }
      
      const vehicleData = vehicleDoc.data();
      if (vehicleData.userId !== userId) {
        throw new Error('Unauthorized to update this vehicle');
      }
      
      const sanitizedUpdates = this.sanitizeObject(updates);
      sanitizedUpdates.lastUpdated = new Date().toISOString();
      
      await this.db.collection(this.collections.vehicleProfiles).doc(vehicleId).update(sanitizedUpdates);
      
      return {
        success: true,
        message: 'Vehicle updated successfully'
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating vehicle:`, error);
      throw error;
    }
  }

  async deleteUserVehicle(userId, vehicleId) {
    try {
      // Verify vehicle belongs to user
      const vehicleDoc = await this.db.collection(this.collections.vehicleProfiles).doc(vehicleId).get();
      
      if (!vehicleDoc.exists) {
        throw new Error('Vehicle not found');
      }
      
      const vehicleData = vehicleDoc.data();
      if (vehicleData.userId !== userId) {
        throw new Error('Unauthorized to delete this vehicle');
      }
      
      await this.db.collection(this.collections.vehicleProfiles).doc(vehicleId).delete();
      
      return {
        success: true,
        message: 'Vehicle deleted successfully'
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting vehicle:`, error);
      throw error;
    }
  }

  // Favorite Locations Management
  async getFavoriteLocations(userId) {
    try {
      const locationsSnapshot = await this.db.collection(this.collections.favoriteLocations)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return locationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching favorite locations:`, error);
      return [];
    }
  }

  async addFavoriteLocation(userId, locationData) {
    try {
      const sanitizedLocation = this.sanitizeObject(locationData);
      
      const location = {
        userId,
        ...sanitizedLocation,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        useCount: 0,
        id: this.generateId()
      };
      
      const docRef = await this.db.collection(this.collections.favoriteLocations).add(location);
      
      return {
        success: true,
        message: 'Location added to favorites',
        data: { id: docRef.id, ...location }
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error adding favorite location:`, error);
      throw new Error('Failed to add favorite location');
    }
  }

  async deleteFavoriteLocation(userId, locationId) {
    try {
      // Verify location belongs to user
      const locationDoc = await this.db.collection(this.collections.favoriteLocations).doc(locationId).get();
      
      if (!locationDoc.exists) {
        throw new Error('Location not found');
      }
      
      const locationData = locationDoc.data();
      if (locationData.userId !== userId) {
        throw new Error('Unauthorized to delete this location');
      }
      
      await this.db.collection(this.collections.favoriteLocations).doc(locationId).delete();
      
      return {
        success: true,
        message: 'Location removed from favorites'
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting favorite location:`, error);
      throw error;
    }
  }

  // User Preferences Management
  async getUserPreferences(userId) {
    try {
      const preferencesDoc = await this.db.collection(this.collections.userPreferences).doc(userId).get();
      
      if (preferencesDoc.exists) {
        return preferencesDoc.data();
      }
      
      // Return default preferences
      return {
        language: 'en',
        timezone: 'Asia/Kolkata',
        theme: 'light',
        units: 'metric',
        currency: 'INR',
        notifications: {
          email: true,
          push: true,
          sms: false,
          trafficAlerts: true,
          routeUpdates: true,
          promotions: false,
          newsletter: false
        },
        privacy: {
          profileVisibility: 'private',
          shareLocation: true,
          shareRouteHistory: false,
          allowAnalytics: true,
          dataRetention: 90
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user preferences:`, error);
      return {};
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const sanitizedPreferences = this.sanitizeObject(preferences);
      sanitizedPreferences.lastUpdated = new Date().toISOString();
      
      await this.db.collection(this.collections.userPreferences).doc(userId).set(sanitizedPreferences, { merge: true });
      
      // Update OneSignal notification preferences
      if (preferences.notifications) {
        await this.updateOneSignalPreferences(userId, preferences.notifications);
      }
      
      return {
        success: true,
        message: 'Preferences updated successfully',
        data: sanitizedPreferences
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating preferences:`, error);
      throw new Error('Failed to update preferences');
    }
  }

  // OneSignal Integration
  async initializeOneSignalPlayer(userId, email) {
    try {
      if (!ONESIGNAL_CONFIG.appId || !ONESIGNAL_CONFIG.apiKey) {
        console.warn('OneSignal not configured');
        return;
      }
      
      const playerData = {
        app_id: ONESIGNAL_CONFIG.appId,
        identifier: email,
        external_user_id: userId,
        tags: {
          user_type: 'registered',
          signup_date: new Date().toISOString().split('T')[0]
        }
      };
      
      await this.makeOneSignalRequest('/players', 'POST', playerData);
      
      console.log(`[${new Date().toISOString()}] Initialized OneSignal player for user: ${userId}`);
    } catch (error) {
      console.error('OneSignal initialization error:', error);
    }
  }

  async updateOneSignalPlayer(userId, email) {
    try {
      if (!ONESIGNAL_CONFIG.appId || !ONESIGNAL_CONFIG.apiKey) {
        return;
      }
      
      const updateData = {
        app_id: ONESIGNAL_CONFIG.appId,
        identifier: email,
        external_user_id: userId
      };
      
      await this.makeOneSignalRequest(`/players/${userId}`, 'PUT', updateData);
    } catch (error) {
      console.error('OneSignal update error:', error);
    }
  }

  async updateOneSignalPreferences(userId, notificationPreferences) {
    try {
      if (!ONESIGNAL_CONFIG.appId || !ONESIGNAL_CONFIG.apiKey) {
        return;
      }
      
      const tags = {
        email_notifications: notificationPreferences.email,
        push_notifications: notificationPreferences.push,
        traffic_alerts: notificationPreferences.trafficAlerts,
        route_updates: notificationPreferences.routeUpdates
      };
      
      await this.makeOneSignalRequest(`/players/${userId}`, 'PUT', {
        app_id: ONESIGNAL_CONFIG.appId,
        tags
      });
    } catch (error) {
      console.error('OneSignal preferences update error:', error);
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
          'Authorization': `Basic ${ONESIGNAL_CONFIG.apiKey}`
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
            resolve({ success: res.statusCode < 300, data: result });
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

  // Audit and Logging
  async logAuditEvent(userId, action, details) {
    try {
      const auditEntry = {
        userId,
        action,
        details,
        timestamp: new Date().toISOString(),
        ip: 'unknown', // Would be populated from request
        userAgent: 'unknown' // Would be populated from request
      };
      
      await this.db.collection(this.collections.auditLogs).add(auditEntry);
      
      console.log(`[${new Date().toISOString()}] Audit log: ${action} for user: ${userId}`);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  // Profile Export/Import
  async exportUserProfile(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      const routeHistory = await this.getUserRouteHistory(userId, 100);
      
      const exportData = {
        profile,
        routeHistory: routeHistory.routes,
        exportedAt: new Date().toISOString(),
        version: '2.0.0'
      };
      
      return exportData;
    } catch (error) {
      console.error('Error exporting user profile:', error);
      throw new Error('Failed to export user profile');
    }
  }

  async deleteUserProfile(userId, adminKey = null) {
    try {
      // Verify admin access for complete deletion
      if (adminKey && !this.validateAdminAccess(adminKey)) {
        throw new Error('Unauthorized admin access');
      }
      
      // Delete all user data
      const collections = [
        this.collections.userProfiles,
        this.collections.routeHistory,
        this.collections.userPreferences,
        this.collections.userStats,
        this.collections.favoriteLocations,
        this.collections.vehicleProfiles
      ];
      
      const deletePromises = collections.map(async (collection) => {
        const snapshot = await this.db.collection(collection)
          .where('userId', '==', userId)
          .get();
        
        const batch = this.db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        return batch.commit();
      });
      
      await Promise.all(deletePromises);
      
      // Delete Firebase Auth user
      if (adminKey) {
        await this.auth.deleteUser(userId);
      }
      
      console.log(`[${new Date().toISOString()}] Deleted user profile: ${userId}`);
      
      return {
        success: true,
        message: 'User profile deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }

  // Utility Methods
  mergeDeep(target, source) {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.mergeDeep(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  validateAdminAccess(adminKey) {
    const validAdminKey = process.env.ADMIN_SECRET_KEY;
    return adminKey && validAdminKey && adminKey === validAdminKey;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date < new Date();
  }

  isValidLanguage(lang) {
    const validLanguages = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'];
    return validLanguages.includes(lang);
  }

  isValidTimezone(timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  isValidCurrency(currency) {
    const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
    return validCurrencies.includes(currency);
  }

  generateId() {
    return crypto.randomBytes(16).toString('hex');
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
    const adminKey = queryStringParameters?.adminKey || null;

    console.log(`[${new Date().toISOString()}] User Profile API request: ${httpMethod} ${queryStringParameters?.action || 'default'}`);

    // Authenticate user
    let userId = null;
    if (!adminKey) {
      const decodedToken = await profileManager.authenticateUser(authToken);
      userId = decodedToken.uid;
    } else {
      userId = queryStringParameters?.userId || 'admin';
    }

    if (httpMethod === 'GET') {
      const action = queryStringParameters?.action || 'profile';

      switch (action) {
        case 'profile':
          return await handleGetProfile(profileManager, userId, headers);
        
        case 'route-history':
          return await handleGetRouteHistory(profileManager, userId, queryStringParameters, headers);
        
        case 'stats':
          return await handleGetStats(profileManager, userId, headers);
        
        case 'vehicles':
          return await handleGetVehicles(profileManager, userId, headers);
        
        case 'favorites':
          return await handleGetFavorites(profileManager, userId, headers);
        
        case 'preferences':
          return await handleGetPreferences(profileManager, userId, headers);
        
        case 'export':
          return await handleExportProfile(profileManager, userId, headers);
        
        case 'health':
          return await handleHealthCheck(profileManager, headers);
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid action parameter',
              availableActions: ['profile', 'route-history', 'stats', 'vehicles', 'favorites', 'preferences', 'export', 'health']
            })
          };
      }
    }

    if (httpMethod === 'POST' || httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || queryStringParameters?.action || 'update';

      switch (action) {
        case 'update':
          return await handleUpdateProfile(profileManager, userId, body, headers);
        
        case 'add-route':
          return await handleAddRoute(profileManager, userId, body, headers);
        
        case 'add-vehicle':
          return await handleAddVehicle(profileManager, userId, body, headers);
        
        case 'update-vehicle':
          return await handleUpdateVehicle(profileManager, userId, body, queryStringParameters, headers);
        
        case 'add-favorite':
          return await handleAddFavorite(profileManager, userId, body, headers);
        
        case 'update-preferences':
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
      const action = queryStringParameters?.action || 'delete';
      const itemId = queryStringParameters?.id;

      switch (action) {
        case 'route':
          return await handleDeleteRoute(profileManager, userId, itemId, headers);
        
        case 'vehicle':
          return await handleDeleteVehicle(profileManager, userId, itemId, headers);
        
        case 'favorite':
          return await handleDeleteFavorite(profileManager, userId, itemId, headers);
        
        case 'profile':
          return await handleDeleteProfile(profileManager, userId, adminKey, headers);
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid delete action'
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
async function handleGetProfile(profileManager, userId, headers) {
  try {
    const profile = await profileManager.getUserProfile(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: profile,
        metadata: {
          requestTime: new Date().toISOString(),
          version: '2.0.0',
          source: 'TrafficAI Enhanced User Profile Manager'
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
    const result = await profileManager.updateUserProfile(userId, body.updates || body);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        data: result.data,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetRouteHistory(profileManager, userId, params, headers) {
  try {
    const limit = parseInt(params?.limit) || 20;
    const offset = parseInt(params?.offset) || 0;
    
    const routeHistory = await profileManager.getUserRouteHistory(userId, limit, offset);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: routeHistory,
        metadata: {
          requestTime: new Date().toISOString(),
          limit,
          offset
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleAddRoute(profileManager, userId, body, headers) {
  try {
    const result = await profileManager.addRouteToHistory(userId, body.routeData || body);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        message: 'Route added to history successfully',
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleDeleteRoute(profileManager, userId, routeId, headers) {
  try {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    const result = await profileManager.deleteRouteFromHistory(userId, routeId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: result.success,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetStats(profileManager, userId, headers) {
  try {
    const stats = await profileManager.getUserStats(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: stats,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetVehicles(profileManager, userId, headers) {
  try {
    const vehicles = await profileManager.getUserVehicles(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: vehicles,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleAddVehicle(profileManager, userId, body, headers) {
  try {
    const result = await profileManager.addUserVehicle(userId, body.vehicleData || body);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        data: result.data,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleUpdateVehicle(profileManager, userId, body, params, headers) {
  try {
    const vehicleId = params?.vehicleId || body.vehicleId;
    if (!vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    const result = await profileManager.updateUserVehicle(userId, vehicleId, body.updates || body);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleDeleteVehicle(profileManager, userId, vehicleId, headers) {
  try {
    if (!vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    const result = await profileManager.deleteUserVehicle(userId, vehicleId);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleGetFavorites(profileManager, userId, headers) {
  try {
    const favorites = await profileManager.getFavoriteLocations(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: favorites,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleAddFavorite(profileManager, userId, body, headers) {
  try {
    const result = await profileManager.addFavoriteLocation(userId, body.locationData || body);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        data: result.data,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleDeleteFavorite(profileManager, userId, locationId, headers) {
  try {
    if (!locationId) {
      throw new Error('Location ID is required');
    }
    
    const result = await profileManager.deleteFavoriteLocation(userId, locationId);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
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
    const preferences = await profileManager.getUserPreferences(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: preferences,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
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
    const result = await profileManager.updateUserPreferences(userId, body.preferences || body);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        data: result.data,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleExportProfile(profileManager, userId, headers) {
  try {
    const exportData = await profileManager.exportUserProfile(userId);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Disposition': `attachment; filename="profile-${userId}-${new Date().toISOString().split('T')[0]}.json"`
      },
      body: JSON.stringify({
        success: true,
        data: exportData,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleDeleteProfile(profileManager, userId, adminKey, headers) {
  try {
    const result = await profileManager.deleteUserProfile(userId, adminKey);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
}

async function handleHealthCheck(profileManager, headers) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      services: {
        firebase: true,
        oneSignal: !!ONESIGNAL_CONFIG.appId,
        authentication: true
      }
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: health
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