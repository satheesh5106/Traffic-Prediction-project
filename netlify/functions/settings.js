/**
 * Enhanced Settings API - Netlify Function
 * Comprehensive user preferences, system configuration, and application settings with Firebase integration
 * Features: Firebase Auth, ORS integration, secure settings management, audit logging
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

// OpenRouteService Configuration
const ORS_CONFIG = {
  apiKey: process.env.ORS_API_KEY,
  baseUrl: 'https://api.openrouteservice.org/v2',
  profiles: ['driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking']
};

// Enhanced Default Settings Configuration
const DEFAULT_SETTINGS = {
  user: {
    profile: {
      name: '',
      email: '',
      phone: '',
      preferredLanguage: 'en',
      timezone: 'Asia/Kolkata',
      avatar: null,
      location: {
        country: 'India',
        state: '',
        city: '',
        coordinates: null
      }
    },
    preferences: {
      theme: 'light', // light, dark, auto
      notifications: {
        email: true,
        push: true,
        sms: false,
        trafficAlerts: true,
        routeUpdates: true,
        systemUpdates: false,
        weatherAlerts: true,
        fuelPriceAlerts: false,
        maintenanceReminders: true
      },
      dashboard: {
        defaultView: 'overview', // overview, traffic, routes, analytics
        refreshInterval: 30, // seconds
        showMetrics: true,
        compactMode: false,
        autoRefresh: true,
        widgets: {
          trafficPrediction: true,
          routeOptimization: true,
          analytics: true,
          weather: true,
          fuelPrices: false
        }
      },
      maps: {
        defaultZoom: 10,
        mapStyle: 'standard', // standard, satellite, terrain, hybrid
        showTraffic: true,
        showIncidents: true,
        showFuelStations: true,
        showWeather: false,
        showPOI: true,
        units: 'metric', // metric, imperial
        defaultCenter: {
          lat: 28.6139,
          lng: 77.2090 // Delhi coordinates
        }
      },
      routes: {
        defaultVehicle: 'car',
        defaultPriority: 'time', // time, distance, fuel, experience, eco
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: true,
        maxDetourTime: 30, // minutes
        fuelPrice: 102.5, // rupees per liter
        vehicleSpecs: {
          car: {
            fuelEfficiency: 15, // km/l
            fuelType: 'petrol',
            engineSize: 1.2,
            emissionClass: 'BS6'
          },
          motorcycle: {
            fuelEfficiency: 45,
            fuelType: 'petrol',
            engineSize: 0.15,
            emissionClass: 'BS6'
          },
          truck: {
            fuelEfficiency: 6,
            fuelType: 'diesel',
            engineSize: 5.0,
            emissionClass: 'BS6'
          }
        },
        orsProfile: 'driving-car',
        optimizationPreferences: {
          fastest: { weight: 1.0, avoid_features: [] },
          shortest: { weight: 0.5, avoid_features: [] },
          eco: { weight: 0.8, avoid_features: ['highways'] },
          scenic: { weight: 0.6, avoid_features: ['highways', 'tollways'] }
        }
      },
      privacy: {
        shareLocation: true,
        shareUsageData: false,
        allowAnalytics: true,
        dataRetention: 90, // days
        anonymizeData: true,
        shareRouteHistory: false,
        allowLocationTracking: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        voiceNavigation: false,
        screenReader: false,
        colorBlindFriendly: false
      }
    }
  },
  system: {
    api: {
      rateLimit: 1000, // requests per hour
      timeout: 30000, // milliseconds
      retryAttempts: 3,
      cacheEnabled: true,
      cacheDuration: 300, // seconds
      hereApiLimit: 250000, // monthly limit
      orsApiLimit: 2000 // daily limit
    },
    traffic: {
      predictionInterval: 5, // minutes
      accuracyThreshold: 0.99, // 99%+ accuracy target
      maxPredictionRange: 24, // hours
      updateFrequency: 60, // seconds
      dataRetention: 30, // days
      gnnModelVersion: '2.1.0',
      libcityVersion: '1.0.0'
    },
    routes: {
      maxRouteOptions: 4,
      optimizationTimeout: 5000, // milliseconds
      maxWaypoints: 10,
      routeCaching: true,
      cacheExpiry: 1800, // seconds
      orsIntegration: true,
      hereIntegration: true
    },
    analytics: {
      dataCollection: true,
      reportGeneration: true,
      performanceMonitoring: true,
      errorTracking: true,
      metricsRetention: 365, // days
      chartjsVersion: '4.0.0'
    },
    security: {
      sessionTimeout: 3600, // seconds
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireTwoFactor: false,
      encryptionEnabled: true,
      auditLogging: true,
      httpsOnly: true,
      corsEnabled: true
    },
    notifications: {
      oneSignalEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      maxNotificationsPerHour: 10
    }
  },
  application: {
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'production',
    features: {
      trafficPrediction: true,
      routeOptimization: true,
      realTimeUpdates: true,
      offlineMode: false,
      voiceNavigation: false,
      multiLanguage: true,
      gnnIntegration: true,
      libcityIntegration: true,
      weatherIntegration: true,
      fuelPriceIntegration: true
    },
    integrations: {
      googleMaps: false,
      leaflet: true,
      openStreetMap: true,
      hereAPI: true,
      openRouteService: true,
      weatherAPI: true,
      fuelPriceAPI: true,
      oneSignal: true,
      firebase: true
    },
    maintenance: {
      scheduledDowntime: null,
      maintenanceMode: false,
      backupFrequency: 'daily',
      logLevel: 'info', // debug, info, warn, error
      healthCheckInterval: 300 // seconds
    }
  }
};

// Enhanced Settings Manager with Firebase Integration
class EnhancedSettingsManager {
  constructor() {
    this.db = admin.firestore();
    this.auth = admin.auth();
    this.userSettings = new Map();
    this.systemSettings = { ...DEFAULT_SETTINGS.system };
    this.applicationSettings = { ...DEFAULT_SETTINGS.application };
    this.settingsHistory = new Map();
    this.initializeCollections();
  }

  initializeCollections() {
    this.collections = {
      userSettings: 'user_settings',
      systemSettings: 'system_settings',
      settingsHistory: 'settings_history',
      auditLogs: 'audit_logs'
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

  // Enhanced User Settings Management
  async getUserSettings(userId) {
    try {
      console.log(`[${new Date().toISOString()}] Fetching settings for user: ${userId}`);
      
      // Try to get from Firestore first
      const settingsDoc = await this.db.collection(this.collections.userSettings).doc(userId).get();
      
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        this.userSettings.set(userId, settings);
        return settings;
      }
      
      // Create default settings if not found
      const defaultSettings = {
        ...DEFAULT_SETTINGS.user,
        userId,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '2.0.0'
      };
      
      await this.saveUserSettings(userId, defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching user settings:`, error);
      throw new Error('Failed to fetch user settings');
    }
  }

  async saveUserSettings(userId, settings) {
    try {
      settings.lastUpdated = new Date().toISOString();
      
      await this.db.collection(this.collections.userSettings).doc(userId).set(settings, { merge: true });
      this.userSettings.set(userId, settings);
      
      console.log(`[${new Date().toISOString()}] Saved settings for user: ${userId}`);
      return settings;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error saving user settings:`, error);
      throw new Error('Failed to save user settings');
    }
  }

  async updateUserSettings(userId, updates) {
    try {
      // Get current settings
      const currentSettings = await this.getUserSettings(userId);
      
      // Validate updates
      const validationResult = this.validateUserSettings(updates);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      // Sanitize updates
      const sanitizedUpdates = this.sanitizeSettingsObject(updates);
      
      // Create backup for history
      const backup = JSON.parse(JSON.stringify(currentSettings));
      
      // Merge updates with current settings
      const updatedSettings = this.mergeSettings(currentSettings, sanitizedUpdates);
      updatedSettings.lastUpdated = new Date().toISOString();
      
      // Save updated settings
      await this.saveUserSettings(userId, updatedSettings);
      
      // Record change in history
      await this.recordSettingsChange(userId, 'user', sanitizedUpdates, backup);
      
      // Log audit trail
      await this.logAuditEvent(userId, 'settings_update', {
        changes: sanitizedUpdates,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'Settings updated successfully',
        data: updatedSettings
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating user settings:`, error);
      throw error;
    }
  }

  sanitizeSettingsObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeSettingsObject(value);
      } else {
        sanitized[key] = this.sanitizeInput(value);
      }
    }
    
    return sanitized;
  }

  // Enhanced Validation
  validateUserSettings(updates) {
    const errors = [];
    
    try {
      if (updates.profile) {
        const profileErrors = this.validateProfileSettings(updates.profile);
        errors.push(...profileErrors);
      }
      
      if (updates.preferences) {
        if (updates.preferences.notifications) {
          const notificationErrors = this.validateNotificationSettings(updates.preferences.notifications);
          errors.push(...notificationErrors);
        }
        
        if (updates.preferences.dashboard) {
          const dashboardErrors = this.validateDashboardSettings(updates.preferences.dashboard);
          errors.push(...dashboardErrors);
        }
        
        if (updates.preferences.maps) {
          const mapErrors = this.validateMapSettings(updates.preferences.maps);
          errors.push(...mapErrors);
        }
        
        if (updates.preferences.routes) {
          const routeErrors = this.validateRouteSettings(updates.preferences.routes);
          errors.push(...routeErrors);
        }
        
        if (updates.preferences.privacy) {
          const privacyErrors = this.validatePrivacySettings(updates.preferences.privacy);
          errors.push(...privacyErrors);
        }
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

  validateProfileSettings(profile) {
    const errors = [];
    
    if (profile.email && !this.isValidEmail(profile.email)) {
      errors.push('Invalid email format');
    }
    
    if (profile.phone && !this.isValidPhone(profile.phone)) {
      errors.push('Invalid phone number format');
    }
    
    if (profile.preferredLanguage && !this.isValidLanguage(profile.preferredLanguage)) {
      errors.push('Invalid language code');
    }
    
    if (profile.timezone && !this.isValidTimezone(profile.timezone)) {
      errors.push('Invalid timezone');
    }
    
    return errors;
  }

  validateNotificationSettings(notifications) {
    const errors = [];
    const validTypes = ['email', 'push', 'sms', 'trafficAlerts', 'routeUpdates', 'systemUpdates', 'weatherAlerts', 'fuelPriceAlerts', 'maintenanceReminders'];
    
    for (const [key, value] of Object.entries(notifications)) {
      if (!validTypes.includes(key)) {
        errors.push(`Invalid notification type: ${key}`);
      }
      if (typeof value !== 'boolean') {
        errors.push(`Notification setting ${key} must be boolean`);
      }
    }
    
    return errors;
  }

  validateDashboardSettings(dashboard) {
    const errors = [];
    const validViews = ['overview', 'traffic', 'routes', 'analytics'];
    
    if (dashboard.defaultView && !validViews.includes(dashboard.defaultView)) {
      errors.push('Invalid default view');
    }
    
    if (dashboard.refreshInterval && (dashboard.refreshInterval < 10 || dashboard.refreshInterval > 300)) {
      errors.push('Refresh interval must be between 10 and 300 seconds');
    }
    
    return errors;
  }

  validateMapSettings(maps) {
    const errors = [];
    const validStyles = ['standard', 'satellite', 'terrain', 'hybrid'];
    const validUnits = ['metric', 'imperial'];
    
    if (maps.mapStyle && !validStyles.includes(maps.mapStyle)) {
      errors.push('Invalid map style');
    }
    
    if (maps.units && !validUnits.includes(maps.units)) {
      errors.push('Invalid units');
    }
    
    if (maps.defaultZoom && (maps.defaultZoom < 1 || maps.defaultZoom > 20)) {
      errors.push('Default zoom must be between 1 and 20');
    }
    
    return errors;
  }

  validateRouteSettings(routes) {
    const errors = [];
    const validVehicles = ['car', 'motorcycle', 'truck', 'bus'];
    const validPriorities = ['time', 'distance', 'fuel', 'experience', 'eco'];
    const validOrsProfiles = ORS_CONFIG.profiles;
    
    if (routes.defaultVehicle && !validVehicles.includes(routes.defaultVehicle)) {
      errors.push('Invalid default vehicle');
    }
    
    if (routes.defaultPriority && !validPriorities.includes(routes.defaultPriority)) {
      errors.push('Invalid default priority');
    }
    
    if (routes.orsProfile && !validOrsProfiles.includes(routes.orsProfile)) {
      errors.push('Invalid ORS profile');
    }
    
    if (routes.maxDetourTime && (routes.maxDetourTime < 0 || routes.maxDetourTime > 120)) {
      errors.push('Max detour time must be between 0 and 120 minutes');
    }
    
    if (routes.fuelPrice && (routes.fuelPrice < 50 || routes.fuelPrice > 200)) {
      errors.push('Fuel price must be between 50 and 200 rupees per liter');
    }
    
    return errors;
  }

  validatePrivacySettings(privacy) {
    const errors = [];
    
    if (privacy.dataRetention && (privacy.dataRetention < 30 || privacy.dataRetention > 365)) {
      errors.push('Data retention must be between 30 and 365 days');
    }
    
    return errors;
  }

  // ORS Integration for Route Preferences
  async validateOrsProfile(profile) {
    try {
      if (!ORS_CONFIG.apiKey) {
        console.warn('ORS API key not configured');
        return false;
      }
      
      const response = await this.makeOrsRequest('/directions/' + profile, 'GET');
      return response.success;
    } catch (error) {
      console.error('ORS profile validation error:', error);
      return false;
    }
  }

  async makeOrsRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openrouteservice.org',
        port: 443,
        path: `/v2${endpoint}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ORS_CONFIG.apiKey
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
            resolve({ success: res.statusCode === 200, data: result });
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

  // System Settings Management
  async getSystemSettings(adminKey) {
    try {
      if (!this.validateAdminAccess(adminKey)) {
        throw new Error('Unauthorized access to system settings');
      }
      
      const settingsDoc = await this.db.collection(this.collections.systemSettings).doc('global').get();
      
      if (settingsDoc.exists) {
        return settingsDoc.data();
      }
      
      // Return default system settings
      return DEFAULT_SETTINGS.system;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  }

  async updateSystemSettings(adminKey, updates) {
    try {
      if (!this.validateAdminAccess(adminKey)) {
        throw new Error('Unauthorized access to system settings');
      }
      
      const validationResult = this.validateSystemSettings(updates);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      const sanitizedUpdates = this.sanitizeSettingsObject(updates);
      sanitizedUpdates.lastUpdated = new Date().toISOString();
      
      await this.db.collection(this.collections.systemSettings).doc('global').set(sanitizedUpdates, { merge: true });
      
      this.systemSettings = { ...this.systemSettings, ...sanitizedUpdates };
      
      // Log system settings change
      await this.logAuditEvent('system', 'system_settings_update', {
        changes: sanitizedUpdates,
        adminKey: adminKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'System settings updated successfully',
        data: this.systemSettings
      };
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  validateSystemSettings(updates) {
    const errors = [];
    
    if (updates.api) {
      if (updates.api.rateLimit && (updates.api.rateLimit < 100 || updates.api.rateLimit > 10000)) {
        errors.push('API rate limit must be between 100 and 10000');
      }
      if (updates.api.timeout && (updates.api.timeout < 5000 || updates.api.timeout > 60000)) {
        errors.push('API timeout must be between 5000 and 60000 milliseconds');
      }
    }
    
    if (updates.traffic) {
      if (updates.traffic.accuracyThreshold && (updates.traffic.accuracyThreshold < 0.5 || updates.traffic.accuracyThreshold > 1.0)) {
        errors.push('Accuracy threshold must be between 0.5 and 1.0');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Application Settings
  getApplicationSettings() {
    return {
      ...this.applicationSettings,
      requestTime: new Date().toISOString()
    };
  }

  async updateApplicationSettings(adminKey, updates) {
    try {
      if (!this.validateAdminAccess(adminKey)) {
        throw new Error('Unauthorized access to application settings');
      }
      
      const validationResult = this.validateApplicationSettings(updates);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      this.applicationSettings = { ...this.applicationSettings, ...updates };
      this.applicationSettings.lastUpdated = new Date().toISOString();
      
      return {
        success: true,
        message: 'Application settings updated successfully',
        data: this.applicationSettings
      };
    } catch (error) {
      console.error('Error updating application settings:', error);
      throw error;
    }
  }

  validateApplicationSettings(updates) {
    const errors = [];
    const validEnvironments = ['development', 'staging', 'production'];
    
    if (updates.environment && !validEnvironments.includes(updates.environment)) {
      errors.push('Invalid environment');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Settings History and Audit
  async recordSettingsChange(userId, category, changes, backup) {
    try {
      const historyEntry = {
        userId,
        category,
        changes,
        backup,
        timestamp: new Date().toISOString(),
        id: this.generateId()
      };
      
      await this.db.collection(this.collections.settingsHistory).add(historyEntry);
      
      console.log(`[${new Date().toISOString()}] Recorded settings change for user: ${userId}`);
    } catch (error) {
      console.error('Error recording settings change:', error);
    }
  }

  async getSettingsHistory(userId, limit = 10) {
    try {
      const historySnapshot = await this.db.collection(this.collections.settingsHistory)
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching settings history:', error);
      return [];
    }
  }

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

  // Settings Import/Export
  async exportSettings(userId, includeSystem = false, adminKey = null) {
    try {
      const userSettings = await this.getUserSettings(userId);
      const exportData = {
        user: userSettings,
        exportedAt: new Date().toISOString(),
        version: '2.0.0'
      };
      
      if (includeSystem && this.validateAdminAccess(adminKey)) {
        exportData.system = await this.getSystemSettings(adminKey);
        exportData.application = this.getApplicationSettings();
      }
      
      return exportData;
    } catch (error) {
      console.error('Error exporting settings:', error);
      throw new Error('Failed to export settings');
    }
  }

  async importSettings(userId, importData, adminKey = null) {
    try {
      const results = {
        user: { success: false, message: '' },
        system: { success: false, message: '' },
        application: { success: false, message: '' }
      };
      
      // Import user settings
      if (importData.user) {
        try {
          await this.updateUserSettings(userId, importData.user);
          results.user = { success: true, message: 'User settings imported successfully' };
        } catch (error) {
          results.user = { success: false, message: error.message };
        }
      }
      
      // Import system settings (admin only)
      if (importData.system && this.validateAdminAccess(adminKey)) {
        try {
          await this.updateSystemSettings(adminKey, importData.system);
          results.system = { success: true, message: 'System settings imported successfully' };
        } catch (error) {
          results.system = { success: false, message: error.message };
        }
      }
      
      // Import application settings (admin only)
      if (importData.application && this.validateAdminAccess(adminKey)) {
        try {
          await this.updateApplicationSettings(adminKey, importData.application);
          results.application = { success: true, message: 'Application settings imported successfully' };
        } catch (error) {
          results.application = { success: false, message: error.message };
        }
      }
      
      return {
        success: Object.values(results).some(r => r.success),
        results
      };
    } catch (error) {
      console.error('Error importing settings:', error);
      throw new Error('Failed to import settings');
    }
  }

  async resetSettings(userId, scope = 'user', adminKey = null) {
    try {
      if (scope === 'system' && !this.validateAdminAccess(adminKey)) {
        throw new Error('Unauthorized access to reset system settings');
      }
      
      if (scope === 'user') {
        const defaultSettings = {
          ...DEFAULT_SETTINGS.user,
          userId,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          version: '2.0.0'
        };
        
        await this.saveUserSettings(userId, defaultSettings);
        
        return {
          success: true,
          message: 'User settings reset to defaults',
          data: defaultSettings
        };
      }
      
      if (scope === 'system') {
        this.systemSettings = { ...DEFAULT_SETTINGS.system };
        await this.db.collection(this.collections.systemSettings).doc('global').set(this.systemSettings);
        
        return {
          success: true,
          message: 'System settings reset to defaults',
          data: this.systemSettings
        };
      }
      
      throw new Error('Invalid scope parameter');
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }

  // Utility Methods
  mergeSettings(target, source) {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.mergeSettings(result[key] || {}, value);
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
    const settingsManager = new EnhancedSettingsManager();
    const { queryStringParameters, httpMethod, headers: requestHeaders } = event;
    const authToken = requestHeaders?.authorization?.replace('Bearer ', '');
    const adminKey = queryStringParameters?.adminKey || null;

    console.log(`[${new Date().toISOString()}] Settings API request: ${httpMethod} ${queryStringParameters?.action || 'default'}`);

    // Authenticate user for non-admin requests
    let userId = null;
    if (!adminKey) {
      const decodedToken = await settingsManager.authenticateUser(authToken);
      userId = decodedToken.uid;
    } else {
      userId = queryStringParameters?.userId || 'admin';
    }

    if (httpMethod === 'GET') {
      const action = queryStringParameters?.action || 'user';

      switch (action) {
        case 'user':
          return await handleGetUserSettings(settingsManager, userId, headers);
        
        case 'system':
          return await handleGetSystemSettings(settingsManager, adminKey, headers);
        
        case 'application':
          return await handleGetApplicationSettings(settingsManager, headers);
        
        case 'export':
          return await handleExportSettings(settingsManager, userId, queryStringParameters, headers);
        
        case 'history':
          return await handleGetSettingsHistory(settingsManager, userId, queryStringParameters, headers);
        
        case 'health':
          return await handleHealthCheck(settingsManager, headers);
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Invalid action parameter',
              availableActions: ['user', 'system', 'application', 'export', 'history', 'health']
            })
          };
      }
    }

    if (httpMethod === 'POST' || httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || queryStringParameters?.action || 'update';

      switch (action) {
        case 'update':
          return await handleUpdateSettings(settingsManager, userId, body, queryStringParameters, headers);
        
        case 'import':
          return await handleImportSettings(settingsManager, userId, body, adminKey, headers);
        
        case 'reset':
          return await handleResetSettings(settingsManager, userId, queryStringParameters, adminKey, headers);
        
        case 'validate-ors':
          return await handleValidateOrsProfile(settingsManager, body, headers);
        
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
    console.error(`[${new Date().toISOString()}] Settings Error:`, error);
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
async function handleGetUserSettings(settingsManager, userId, headers) {
  try {
    const userSettings = await settingsManager.getUserSettings(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: userSettings,
        metadata: {
          requestTime: new Date().toISOString(),
          version: '2.0.0',
          source: 'TrafficAI Enhanced Settings Manager'
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

async function handleGetSystemSettings(settingsManager, adminKey, headers) {
  try {
    const systemSettings = await settingsManager.getSystemSettings(adminKey);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: systemSettings,
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

async function handleGetApplicationSettings(settingsManager, headers) {
  try {
    const applicationSettings = settingsManager.getApplicationSettings();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: applicationSettings,
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

async function handleUpdateSettings(settingsManager, userId, body, params, headers) {
  const scope = params?.scope || 'user';
  const adminKey = params?.adminKey;
  
  try {
    let result;
    
    switch (scope) {
      case 'user':
        result = await settingsManager.updateUserSettings(userId, body.updates || body);
        break;
      
      case 'system':
        result = await settingsManager.updateSystemSettings(adminKey, body.updates || body);
        break;
      
      case 'application':
        result = await settingsManager.updateApplicationSettings(adminKey, body.updates || body);
        break;
      
      default:
        throw new Error('Invalid scope parameter');
    }
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        data: result.data,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString(),
          scope
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

async function handleExportSettings(settingsManager, userId, params, headers) {
  try {
    const includeSystem = params?.includeSystem === 'true';
    const adminKey = params?.adminKey;
    
    const exportData = await settingsManager.exportSettings(userId, includeSystem, adminKey);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Disposition': `attachment; filename="settings-${userId}-${new Date().toISOString().split('T')[0]}.json"`
      },
      body: JSON.stringify({
        success: true,
        data: exportData,
        metadata: {
          requestTime: new Date().toISOString(),
          includeSystem
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

async function handleImportSettings(settingsManager, userId, body, adminKey, headers) {
  try {
    const result = await settingsManager.importSettings(userId, body.importData || body, adminKey);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        data: result.results,
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

async function handleResetSettings(settingsManager, userId, params, adminKey, headers) {
  try {
    const scope = params?.scope || 'user';
    const result = await settingsManager.resetSettings(userId, scope, adminKey);
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: result.success,
        data: result.data,
        message: result.message,
        metadata: {
          requestTime: new Date().toISOString(),
          scope
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

async function handleGetSettingsHistory(settingsManager, userId, params, headers) {
  try {
    const limit = parseInt(params?.limit) || 10;
    const history = await settingsManager.getSettingsHistory(userId, limit);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          history,
          totalEntries: history.length
        },
        metadata: {
          requestTime: new Date().toISOString(),
          limit
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

async function handleValidateOrsProfile(settingsManager, body, headers) {
  try {
    const profile = body.profile || 'driving-car';
    const isValid = await settingsManager.validateOrsProfile(profile);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          profile,
          isValid,
          availableProfiles: ORS_CONFIG.profiles
        },
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

async function handleHealthCheck(settingsManager, headers) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      services: {
        firebase: true,
        ors: !!process.env.ORS_API_KEY,
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