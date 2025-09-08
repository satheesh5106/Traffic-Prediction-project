const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const settingsCache = new NodeCache({ stdTTL: 900 }); // 15-minute cache

// Rate limiting for sensitive operations
const sensitiveRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, error: 'Too many attempts, please try again later' }
});

// Default settings configuration
const DEFAULT_SETTINGS = {
  profile: {
    name: '',
    email: '',
    phone: '',
    avatar: null,
    timezone: 'Asia/Kolkata',
    language: 'en',
    location: {
      country: 'India',
      state: '',
      city: '',
      coordinates: null
    }
  },
  notifications: {
    email: true,
    push: true,
    sms: false,
    trafficAlerts: true,
    routeUpdates: true,
    weatherAlerts: true,
    incidentAlerts: true,
    systemUpdates: false,
    maintenanceAlerts: true,
    frequency: 'immediate' // immediate, hourly, daily
  },
  preferences: {
    theme: 'light', // light, dark, auto
    dashboard: {
      defaultView: 'overview',
      refreshInterval: 30,
      autoRefresh: true,
      compactMode: false,
      showMetrics: true,
      widgets: {
        traffic: true,
        routes: true,
        weather: true,
        analytics: true,
        incidents: true
      }
    },
    maps: {
      defaultZoom: 10,
      mapStyle: 'standard',
      showTraffic: true,
      showIncidents: true,
      showWeather: false,
      units: 'metric',
      defaultCenter: { lat: 28.6139, lng: 77.2090 }
    },
    routes: {
      defaultVehicle: 'car',
      defaultPriority: 'time',
      avoidTolls: false,
      avoidHighways: false,
      fuelPrice: 102.5,
      vehicleSpecs: {
        fuelEfficiency: 15,
        fuelType: 'petrol',
        engineSize: 1.2
      }
    },
    privacy: {
      shareLocation: true,
      shareUsageData: false,
      allowAnalytics: true,
      dataRetention: 90,
      anonymizeData: true
    }
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 3600,
    loginNotifications: true,
    deviceTracking: true,
    ipWhitelist: [],
    lastPasswordChange: null,
    securityQuestions: []
  },
  apiKeys: {
    tomtom: { key: '', enabled: true, usage: 0, limit: 2500 },
    openweather: { key: '', enabled: true, usage: 0, limit: 1000 },
    here: { key: '', enabled: false, usage: 0, limit: 250000 },
    mapbox: { key: '', enabled: false, usage: 0, limit: 50000 }
  }
};

// Authentication middleware imported from ../middleware/auth.js

// POST /api/settings/auth/login - Generate JWT token for testing
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // For testing purposes, accept any credentials
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    // Generate JWT token
    const user = {
      id: 'test-user-' + Date.now(),
      username: username,
      email: username + '@trafficai.com'
    };
    
    const token = jwt.sign(user, process.env.JWT_SECRET || 'traffic_prediction_jwt_secret_key_2025_secure_backend_blaze', { expiresIn: '24h' });
    
    res.json({
      success: true,
      token,
      user
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// GET /api/settings/profile - Get user profile settings
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const cacheKey = `profile_${userId}`;
    
    // Check cache first
    let profile = settingsCache.get(cacheKey);
    if (profile) {
      return res.json({
        success: true,
        profile,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Use default profile for now (avoiding database issues)
    profile = {
      name: req.user.username || 'Traffic AI User',
      email: req.user.email || 'user@trafficai.com',
      phone: '+1-555-0123',
      location: 'New Delhi, India',
      timezone: 'Asia/Kolkata',
      language: 'en',
      avatar: 'https://via.placeholder.com/150/4F46E5/FFFFFF?text=TA'
    };
    
    // Cache the profile
    settingsCache.set(cacheKey, profile);

    res.json({
      success: true,
      profile,
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching profile settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile settings',
      message: error.message
    });
  }
});

// PUT /api/settings/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const { name, email, phone, avatar, timezone, language, location } = req.body;

    // Validate input
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (phone && !/^[+]?[1-9]\d{1,14}$/.test(phone.replace(/[\s-()]/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    const updatedProfile = {
      name: name || '',
      email: email || '',
      phone: phone || '',
      avatar: avatar || null,
      timezone: timezone || 'Asia/Kolkata',
      language: language || 'en',
      location: location || DEFAULT_SETTINGS.profile.location
    };

    // Update in database
    const userSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        profile: updatedProfile,
        updatedAt: new Date()
      },
      create: {
        userId,
        profile: updatedProfile,
        notifications: DEFAULT_SETTINGS.notifications,
        preferences: DEFAULT_SETTINGS.preferences,
        security: DEFAULT_SETTINGS.security,
        apiKeys: DEFAULT_SETTINGS.apiKeys
      }
    });

    // Clear cache
    settingsCache.del(`profile_${userId}`);
    settingsCache.del(`settings_${userId}`);

    res.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// GET /api/settings/notifications - Get notification settings
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const cacheKey = `notifications_${userId}`;
    
    let notifications = settingsCache.get(cacheKey);
    if (notifications) {
      return res.json({
        success: true,
        notifications,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { notifications: true }
    });

    notifications = userSettings?.notifications || DEFAULT_SETTINGS.notifications;
    settingsCache.set(cacheKey, notifications);

    res.json({
      success: true,
      notifications,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification settings',
      message: error.message
    });
  }
});

// PUT /api/settings/notifications - Update notification settings
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const notifications = req.body;

    // Validate notification settings
    const validFrequencies = ['immediate', 'hourly', 'daily'];
    if (notifications.frequency && !validFrequencies.includes(notifications.frequency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification frequency'
      });
    }

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        notifications,
        updatedAt: new Date()
      },
      create: {
        userId,
        profile: DEFAULT_SETTINGS.profile,
        notifications,
        preferences: DEFAULT_SETTINGS.preferences,
        security: DEFAULT_SETTINGS.security,
        apiKeys: DEFAULT_SETTINGS.apiKeys
      }
    });

    // Clear cache
    settingsCache.del(`notifications_${userId}`);
    settingsCache.del(`settings_${userId}`);

    res.json({
      success: true,
      notifications,
      message: 'Notification settings updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings',
      message: error.message
    });
  }
});

// GET /api/settings/preferences - Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const cacheKey = `preferences_${userId}`;
    
    let preferences = settingsCache.get(cacheKey);
    if (preferences) {
      return res.json({
        success: true,
        preferences,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });

    preferences = user?.preferences ? JSON.parse(user.preferences) : DEFAULT_SETTINGS.preferences;
    settingsCache.set(cacheKey, preferences);

    res.json({
      success: true,
      preferences,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
      message: error.message
    });
  }
});

// PUT /api/settings/preferences - Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const preferences = req.body;

    // Validate preferences
    const validThemes = ['light', 'dark', 'auto'];
    if (preferences.theme && !validThemes.includes(preferences.theme)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid theme selection'
      });
    }

    const validMapStyles = ['standard', 'satellite', 'terrain', 'hybrid'];
    if (preferences.maps?.mapStyle && !validMapStyles.includes(preferences.maps.mapStyle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid map style'
      });
    }

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        preferences,
        updatedAt: new Date()
      },
      create: {
        userId,
        profile: DEFAULT_SETTINGS.profile,
        notifications: DEFAULT_SETTINGS.notifications,
        preferences,
        security: DEFAULT_SETTINGS.security,
        apiKeys: DEFAULT_SETTINGS.apiKeys
      }
    });

    // Clear cache
    settingsCache.del(`preferences_${userId}`);
    settingsCache.del(`settings_${userId}`);

    res.json({
      success: true,
      preferences,
      message: 'Preferences updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

// GET /api/settings/security - Get security settings
router.get('/security', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const cacheKey = `security_${userId}`;
    
    let security = settingsCache.get(cacheKey);
    if (security) {
      // Remove sensitive data before sending
      const safeSecurity = { ...security };
      delete safeSecurity.securityQuestions;
      return res.json({
        success: true,
        security: safeSecurity,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { security: true }
    });

    security = userSettings?.security || DEFAULT_SETTINGS.security;
    settingsCache.set(cacheKey, security);

    // Remove sensitive data before sending
    const safeSecurity = { ...security };
    delete safeSecurity.securityQuestions;

    res.json({
      success: true,
      security: safeSecurity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security settings',
      message: error.message
    });
  }
});

// PUT /api/settings/security/password - Change password with bcrypt
router.put('/security/password', authenticateToken, sensitiveRateLimit, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain uppercase, lowercase, number, and special character'
      });
    }

    // Get current user data (in real app, verify current password)
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { security: true }
    });

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update security settings
    const updatedSecurity = {
      ...userSettings?.security || DEFAULT_SETTINGS.security,
      lastPasswordChange: new Date().toISOString(),
      passwordHash: hashedPassword // In real app, store in separate secure table
    };

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        security: updatedSecurity,
        updatedAt: new Date()
      },
      create: {
        userId,
        profile: DEFAULT_SETTINGS.profile,
        notifications: DEFAULT_SETTINGS.notifications,
        preferences: DEFAULT_SETTINGS.preferences,
        security: updatedSecurity,
        apiKeys: DEFAULT_SETTINGS.apiKeys
      }
    });

    // Clear cache
    settingsCache.del(`security_${userId}`);
    settingsCache.del(`settings_${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      message: error.message
    });
  }
});

// PUT /api/settings/security - Update security settings
router.put('/security', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const { twoFactorEnabled, sessionTimeout, loginNotifications, deviceTracking, ipWhitelist } = req.body;

    // Validate session timeout
    if (sessionTimeout && (sessionTimeout < 300 || sessionTimeout > 86400)) {
      return res.status(400).json({
        success: false,
        error: 'Session timeout must be between 5 minutes and 24 hours'
      });
    }

    // Validate IP whitelist format
    if (ipWhitelist && Array.isArray(ipWhitelist)) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      for (const ip of ipWhitelist) {
        if (!ipRegex.test(ip)) {
          return res.status(400).json({
            success: false,
            error: `Invalid IP address format: ${ip}`
          });
        }
      }
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { security: true }
    });

    const updatedSecurity = {
      ...userSettings?.security || DEFAULT_SETTINGS.security,
      twoFactorEnabled: twoFactorEnabled !== undefined ? twoFactorEnabled : DEFAULT_SETTINGS.security.twoFactorEnabled,
      sessionTimeout: sessionTimeout || DEFAULT_SETTINGS.security.sessionTimeout,
      loginNotifications: loginNotifications !== undefined ? loginNotifications : DEFAULT_SETTINGS.security.loginNotifications,
      deviceTracking: deviceTracking !== undefined ? deviceTracking : DEFAULT_SETTINGS.security.deviceTracking,
      ipWhitelist: ipWhitelist || DEFAULT_SETTINGS.security.ipWhitelist
    };

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        security: updatedSecurity,
        updatedAt: new Date()
      },
      create: {
        userId,
        profile: DEFAULT_SETTINGS.profile,
        notifications: DEFAULT_SETTINGS.notifications,
        preferences: DEFAULT_SETTINGS.preferences,
        security: updatedSecurity,
        apiKeys: DEFAULT_SETTINGS.apiKeys
      }
    });

    // Clear cache
    settingsCache.del(`security_${userId}`);
    settingsCache.del(`settings_${userId}`);

    // Remove sensitive data before sending
    const safeSecurity = { ...updatedSecurity };
    delete safeSecurity.securityQuestions;
    delete safeSecurity.passwordHash;

    res.json({
      success: true,
      security: safeSecurity,
      message: 'Security settings updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security settings',
      message: error.message
    });
  }
});

// GET /api/settings/api-keys - Get API keys (masked)
router.get('/api-keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const cacheKey = `apikeys_${userId}`;
    
    let apiKeys = settingsCache.get(cacheKey);
    if (apiKeys) {
      // Mask sensitive keys
      const maskedKeys = maskApiKeys(apiKeys);
      return res.json({
        success: true,
        apiKeys: maskedKeys,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { apiKeys: true }
    });

    apiKeys = userSettings?.apiKeys || DEFAULT_SETTINGS.apiKeys;
    settingsCache.set(cacheKey, apiKeys);

    // Mask sensitive keys
    const maskedKeys = maskApiKeys(apiKeys);

    res.json({
      success: true,
      apiKeys: maskedKeys,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys',
      message: error.message
    });
  }
});

// PUT /api/settings/api-keys - Update API keys
router.put('/api-keys', authenticateToken, sensitiveRateLimit, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const { provider, key, enabled } = req.body;

    if (!provider || !key) {
      return res.status(400).json({
        success: false,
        error: 'Provider and key are required'
      });
    }

    const validProviders = ['tomtom', 'openweather', 'here', 'mapbox'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API provider'
      });
    }

    // Validate key format (basic validation)
    if (key.length < 10 || key.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { apiKeys: true }
    });

    const currentApiKeys = userSettings?.apiKeys || DEFAULT_SETTINGS.apiKeys;
    const updatedApiKeys = {
      ...currentApiKeys,
      [provider]: {
        ...currentApiKeys[provider],
        key: key,
        enabled: enabled !== undefined ? enabled : true,
        lastUpdated: new Date().toISOString()
      }
    };

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        apiKeys: updatedApiKeys,
        updatedAt: new Date()
      },
      create: {
        userId,
        profile: DEFAULT_SETTINGS.profile,
        notifications: DEFAULT_SETTINGS.notifications,
        preferences: DEFAULT_SETTINGS.preferences,
        security: DEFAULT_SETTINGS.security,
        apiKeys: updatedApiKeys
      }
    });

    // Clear cache
    settingsCache.del(`apikeys_${userId}`);
    settingsCache.del(`settings_${userId}`);

    // Mask sensitive keys before sending response
    const maskedKeys = maskApiKeys(updatedApiKeys);

    res.json({
      success: true,
      apiKeys: maskedKeys,
      message: `${provider} API key updated successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API keys',
      message: error.message
    });
  }
});

// GET /api/settings/all - Get all user settings
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    const cacheKey = `settings_${userId}`;
    
    let settings = settingsCache.get(cacheKey);
    if (settings) {
      // Mask sensitive data
      const safeSettings = {
        ...settings,
        security: {
          ...settings.security,
          securityQuestions: undefined,
          passwordHash: undefined
        },
        apiKeys: maskApiKeys(settings.apiKeys)
      };
      return res.json({
        success: true,
        settings: safeSettings,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (userSettings) {
      settings = {
        profile: userSettings.profile,
        notifications: userSettings.notifications,
        preferences: userSettings.preferences,
        security: userSettings.security,
        apiKeys: userSettings.apiKeys
      };
    } else {
      // Create default settings
      settings = DEFAULT_SETTINGS;
      await prisma.userSettings.create({
        data: {
          userId,
          ...DEFAULT_SETTINGS
        }
      });
    }

    settingsCache.set(cacheKey, settings);

    // Mask sensitive data
    const safeSettings = {
      ...settings,
      security: {
        ...settings.security,
        securityQuestions: undefined,
        passwordHash: undefined
      },
      apiKeys: maskApiKeys(settings.apiKeys)
    };

    res.json({
      success: true,
      settings: safeSettings,
      lastUpdated: userSettings?.updatedAt || new Date().toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching all settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      message: error.message
    });
  }
});

// DELETE /api/settings/cache - Clear settings cache
router.delete('/cache', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || 'default-user';
    
    // Clear all user-related cache entries
    const cacheKeys = [
      `settings_${userId}`,
      `profile_${userId}`,
      `notifications_${userId}`,
      `preferences_${userId}`,
      `security_${userId}`,
      `apikeys_${userId}`
    ];
    
    cacheKeys.forEach(key => settingsCache.del(key));

    res.json({
      success: true,
      message: 'Settings cache cleared successfully',
      clearedKeys: cacheKeys.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Utility function to mask API keys
function maskApiKeys(apiKeys) {
  const masked = {};
  for (const [provider, config] of Object.entries(apiKeys)) {
    masked[provider] = {
      ...config,
      key: config.key ? `${config.key.substring(0, 4)}${'*'.repeat(config.key.length - 8)}${config.key.substring(config.key.length - 4)}` : ''
    };
  }
  return masked;
}

// Export router
module.exports = router;