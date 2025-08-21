/**
 * Enhanced Firebase Authentication Middleware - Netlify Function
 * Provides centralized authentication, authorization, and security validation
 * Features: Firebase Admin SDK, JWT verification, rate limiting, audit logging
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

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

// Security Configuration
const SECURITY_CONFIG = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // per window
    maxRequestsPerUser: 50 // per user per window
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 60 * 60 * 1000 // 1 hour
  },
  security: {
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://trafficai.netlify.app',
      'https://traffic-prediction-project.netlify.app'
    ],
    blockedIPs: [],
    suspiciousPatterns: [
      /(<script[^>]*>.*?<\/script>)/gi,
      /(javascript:|data:|vbscript:)/gi,
      /(union.*select|select.*from|insert.*into|delete.*from|drop.*table)/gi
    ]
  }
};

// User Roles and Permissions
const USER_ROLES = {
  admin: {
    permissions: ['read', 'write', 'delete', 'admin'],
    endpoints: ['*']
  },
  premium: {
    permissions: ['read', 'write'],
    endpoints: ['traffic-prediction', 'route-optimization', 'analytics', 'settings', 'user-profile', 'dashboard-data', 'vis-data']
  },
  standard: {
    permissions: ['read'],
    endpoints: ['traffic-prediction', 'route-optimization', 'settings', 'user-profile', 'dashboard-data']
  },
  guest: {
    permissions: ['read'],
    endpoints: ['traffic-prediction']
  }
};

// Enhanced Authentication Middleware Class
class EnhancedAuthMiddleware {
  constructor() {
    this.db = admin.firestore();
    this.auth = admin.auth();
    this.rateLimitStore = new Map();
    this.sessionStore = new Map();
    this.securityLog = [];
  }

  // Main Authentication Method
  async authenticateRequest(event, requiredPermissions = ['read'], endpoint = null) {
    try {
      const startTime = Date.now();
      const clientIP = this.getClientIP(event);
      const userAgent = event.headers?.['user-agent'] || 'Unknown';
      const authToken = this.extractAuthToken(event);
      
      console.log(`[${new Date().toISOString()}] Auth request from ${clientIP} for endpoint: ${endpoint}`);

      // Security Checks
      await this.performSecurityChecks(event, clientIP);
      
      // Rate Limiting
      await this.checkRateLimit(clientIP);
      
      // Token Validation
      const decodedToken = await this.validateToken(authToken);
      const userId = decodedToken.uid;
      
      // User Profile and Role Validation
      const userProfile = await this.getUserProfile(userId);
      await this.validateUserAccess(userProfile, requiredPermissions, endpoint);
      
      // Session Management
      const sessionData = await this.manageSession(userId, decodedToken);
      
      // Audit Logging
      await this.logAuthEvent({
        userId,
        clientIP,
        userAgent,
        endpoint,
        permissions: requiredPermissions,
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        user: {
          uid: userId,
          email: decodedToken.email,
          role: userProfile.role,
          permissions: userProfile.permissions,
          profile: userProfile
        },
        session: sessionData,
        metadata: {
          authTime: decodedToken.auth_time,
          issuedAt: decodedToken.iat,
          expiresAt: decodedToken.exp,
          clientIP,
          userAgent
        }
      };
    } catch (error) {
      await this.logAuthEvent({
        clientIP: this.getClientIP(event),
        endpoint,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Token Extraction and Validation
  extractAuthToken(event) {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization format. Use Bearer token');
    }
    
    const token = authHeader.substring(7);
    if (!token || token.length < 10) {
      throw new Error('Invalid token format');
    }
    
    return token;
  }

  async validateToken(token) {
    try {
      // Verify Firebase ID token
      const decodedToken = await this.auth.verifyIdToken(token, true);
      
      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (decodedToken.exp < now) {
        throw new Error('Token has expired');
      }
      
      // Check if token is too old (issued more than 24 hours ago)
      if (now - decodedToken.iat > 24 * 60 * 60) {
        throw new Error('Token is too old, please refresh');
      }
      
      return decodedToken;
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new Error('Token has expired, please refresh');
      } else if (error.code === 'auth/id-token-revoked') {
        throw new Error('Token has been revoked');
      } else if (error.code === 'auth/invalid-id-token') {
        throw new Error('Invalid token format');
      }
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  // User Profile Management
  async getUserProfile(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        // Create default user profile
        const defaultProfile = {
          role: 'standard',
          permissions: USER_ROLES.standard.permissions,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          isActive: true,
          preferences: {
            theme: 'light',
            notifications: true,
            dataSharing: false
          },
          usage: {
            apiCalls: 0,
            lastApiCall: null,
            quotaUsed: 0
          }
        };
        
        await this.db.collection('users').doc(userId).set(defaultProfile);
        return { ...defaultProfile, uid: userId };
      }
      
      const userData = userDoc.data();
      
      // Update last login
      await this.db.collection('users').doc(userId).update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { ...userData, uid: userId };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to retrieve user profile');
    }
  }

  // Access Control Validation
  async validateUserAccess(userProfile, requiredPermissions, endpoint) {
    try {
      // Check if user is active
      if (!userProfile.isActive) {
        throw new Error('User account is deactivated');
      }
      
      // Get user role configuration
      const roleConfig = USER_ROLES[userProfile.role] || USER_ROLES.guest;
      
      // Check endpoint access
      if (endpoint && !this.hasEndpointAccess(roleConfig.endpoints, endpoint)) {
        throw new Error(`Access denied to endpoint: ${endpoint}`);
      }
      
      // Check permissions
      for (const permission of requiredPermissions) {
        if (!roleConfig.permissions.includes(permission)) {
          throw new Error(`Insufficient permissions: ${permission} required`);
        }
      }
      
      // Check usage quotas
      await this.checkUsageQuotas(userProfile);
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  hasEndpointAccess(allowedEndpoints, requestedEndpoint) {
    if (allowedEndpoints.includes('*')) {
      return true;
    }
    
    return allowedEndpoints.some(endpoint => {
      if (endpoint === requestedEndpoint) {
        return true;
      }
      // Support wildcard matching
      if (endpoint.includes('*')) {
        const pattern = endpoint.replace('*', '.*');
        return new RegExp(pattern).test(requestedEndpoint);
      }
      return false;
    });
  }

  // Usage Quota Management
  async checkUsageQuotas(userProfile) {
    const roleConfig = USER_ROLES[userProfile.role] || USER_ROLES.guest;
    const quotaLimits = {
      guest: { daily: 50, monthly: 1000 },
      standard: { daily: 500, monthly: 10000 },
      premium: { daily: 2000, monthly: 50000 },
      admin: { daily: Infinity, monthly: Infinity }
    };
    
    const userQuota = quotaLimits[userProfile.role] || quotaLimits.guest;
    const usage = userProfile.usage || { apiCalls: 0, quotaUsed: 0 };
    
    // Check daily quota
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = await this.getDailyUsage(userProfile.uid, today);
    
    if (dailyUsage >= userQuota.daily) {
      throw new Error('Daily API quota exceeded');
    }
    
    // Check monthly quota
    const monthlyUsage = await this.getMonthlyUsage(userProfile.uid);
    if (monthlyUsage >= userQuota.monthly) {
      throw new Error('Monthly API quota exceeded');
    }
    
    return true;
  }

  async getDailyUsage(userId, date) {
    try {
      const usageDoc = await this.db
        .collection('usage')
        .doc(userId)
        .collection('daily')
        .doc(date)
        .get();
      
      return usageDoc.exists ? usageDoc.data().count || 0 : 0;
    } catch (error) {
      console.error('Error fetching daily usage:', error);
      return 0;
    }
  }

  async getMonthlyUsage(userId) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const usageQuery = await this.db
        .collection('usage')
        .doc(userId)
        .collection('daily')
        .where('date', '>=', startOfMonth.toISOString().split('T')[0])
        .get();
      
      let totalUsage = 0;
      usageQuery.forEach(doc => {
        totalUsage += doc.data().count || 0;
      });
      
      return totalUsage;
    } catch (error) {
      console.error('Error fetching monthly usage:', error);
      return 0;
    }
  }

  // Rate Limiting
  async checkRateLimit(clientIP, userId = null) {
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.rateLimit.windowMs;
    
    // Clean old entries
    for (const [key, requests] of this.rateLimitStore.entries()) {
      this.rateLimitStore.set(key, requests.filter(time => time > windowStart));
      if (this.rateLimitStore.get(key).length === 0) {
        this.rateLimitStore.delete(key);
      }
    }
    
    // Check IP-based rate limit
    const ipRequests = this.rateLimitStore.get(clientIP) || [];
    if (ipRequests.length >= SECURITY_CONFIG.rateLimit.maxRequests) {
      throw new Error('Rate limit exceeded for IP address');
    }
    
    // Check user-based rate limit
    if (userId) {
      const userRequests = this.rateLimitStore.get(`user:${userId}`) || [];
      if (userRequests.length >= SECURITY_CONFIG.rateLimit.maxRequestsPerUser) {
        throw new Error('Rate limit exceeded for user');
      }
      
      // Update user rate limit
      userRequests.push(now);
      this.rateLimitStore.set(`user:${userId}`, userRequests);
    }
    
    // Update IP rate limit
    ipRequests.push(now);
    this.rateLimitStore.set(clientIP, ipRequests);
  }

  // Security Checks
  async performSecurityChecks(event, clientIP) {
    // Check blocked IPs
    if (SECURITY_CONFIG.security.blockedIPs.includes(clientIP)) {
      throw new Error('Access denied from this IP address');
    }
    
    // Check origin
    const origin = event.headers?.origin || event.headers?.referer;
    if (origin && !this.isAllowedOrigin(origin)) {
      console.warn(`Suspicious origin detected: ${origin} from IP: ${clientIP}`);
    }
    
    // Check payload size
    const contentLength = parseInt(event.headers?.['content-length'] || '0');
    if (contentLength > SECURITY_CONFIG.security.maxPayloadSize) {
      throw new Error('Payload too large');
    }
    
    // Check for suspicious patterns in request
    const requestBody = event.body || '';
    const queryString = event.rawQuery || '';
    
    for (const pattern of SECURITY_CONFIG.security.suspiciousPatterns) {
      if (pattern.test(requestBody) || pattern.test(queryString)) {
        await this.logSecurityEvent({
          type: 'suspicious_pattern',
          clientIP,
          pattern: pattern.toString(),
          body: requestBody.substring(0, 200),
          query: queryString,
          timestamp: new Date().toISOString()
        });
        throw new Error('Suspicious request detected');
      }
    }
  }

  isAllowedOrigin(origin) {
    return SECURITY_CONFIG.security.allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return origin.startsWith(allowed);
    });
  }

  // Session Management
  async manageSession(userId, decodedToken) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    
    const sessionData = {
      sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + SECURITY_CONFIG.session.maxAge,
      tokenIssuedAt: decodedToken.iat * 1000,
      refreshNeeded: (now - decodedToken.iat * 1000) > SECURITY_CONFIG.session.refreshThreshold
    };
    
    // Store session
    this.sessionStore.set(sessionId, sessionData);
    
    // Clean expired sessions
    for (const [id, session] of this.sessionStore.entries()) {
      if (session.expiresAt < now) {
        this.sessionStore.delete(id);
      }
    }
    
    return sessionData;
  }

  // Utility Methods
  getClientIP(event) {
    return event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
           event.headers?.['x-real-ip'] ||
           event.headers?.['cf-connecting-ip'] ||
           event.requestContext?.identity?.sourceIp ||
           'unknown';
  }

  // Logging Methods
  async logAuthEvent(eventData) {
    try {
      const logEntry = {
        ...eventData,
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: eventData.timestamp || new Date().toISOString()
      };
      
      console.log(`[AUTH] ${JSON.stringify(logEntry)}`);
      
      // Store in Firestore for persistent logging
      await this.db.collection('auth_logs').add(logEntry);
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }

  async logSecurityEvent(eventData) {
    try {
      const logEntry = {
        ...eventData,
        id: crypto.randomBytes(8).toString('hex'),
        severity: 'high',
        timestamp: eventData.timestamp || new Date().toISOString()
      };
      
      console.warn(`[SECURITY] ${JSON.stringify(logEntry)}`);
      
      // Store security events separately
      await this.db.collection('security_logs').add(logEntry);
      
      // Add to in-memory security log for immediate analysis
      this.securityLog.push(logEntry);
      
      // Keep only last 100 security events in memory
      if (this.securityLog.length > 100) {
        this.securityLog.shift();
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Usage Tracking
  async trackApiUsage(userId, endpoint, responseTime) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const usageRef = this.db
        .collection('usage')
        .doc(userId)
        .collection('daily')
        .doc(today);
      
      await usageRef.set({
        date: today,
        count: admin.firestore.FieldValue.increment(1),
        endpoints: {
          [endpoint]: admin.firestore.FieldValue.increment(1)
        },
        totalResponseTime: admin.firestore.FieldValue.increment(responseTime),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Failed to track API usage:', error);
    }
  }

  // Input Sanitization
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return input
        .replace(/[<>"'&]/g, (match) => {
          const entities = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return entities[match];
        })
        .trim()
        .substring(0, 1000); // Limit length
    }
    return input;
  }

  // Health Check
  async healthCheck() {
    try {
      // Test Firebase connection
      await this.auth.listUsers(1);
      await this.db.collection('health').doc('test').set({ timestamp: new Date() });
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          firebase_auth: 'connected',
          firestore: 'connected',
          rate_limiter: 'active',
          session_manager: 'active'
        },
        stats: {
          active_sessions: this.sessionStore.size,
          rate_limit_entries: this.rateLimitStore.size,
          security_events: this.securityLog.length
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export middleware instance
const authMiddleware = new EnhancedAuthMiddleware();

// Main Netlify Function Handler for Auth Middleware
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { queryStringParameters } = event;
    const action = queryStringParameters?.action || 'authenticate';

    switch (action) {
      case 'authenticate':
        const authResult = await authMiddleware.authenticateRequest(event, ['read']);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: authResult,
            message: 'Authentication successful'
          })
        };

      case 'health':
        const healthStatus = await authMiddleware.healthCheck();
        return {
          statusCode: healthStatus.status === 'healthy' ? 200 : 503,
          headers,
          body: JSON.stringify({
            success: healthStatus.status === 'healthy',
            data: healthStatus
          })
        };

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
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      statusCode: error.message.includes('Authentication') ? 401 : 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Export the middleware class for use in other functions
exports.EnhancedAuthMiddleware = EnhancedAuthMiddleware;
exports.authMiddleware = authMiddleware;

// Helper function for other Netlify functions to use
exports.authenticate = async (event, requiredPermissions = ['read'], endpoint = null) => {
  return await authMiddleware.authenticateRequest(event, requiredPermissions, endpoint);
};

// Export security utilities
exports.sanitizeInput = (input) => authMiddleware.sanitizeInput(input);
exports.trackUsage = (userId, endpoint, responseTime) => authMiddleware.trackApiUsage(userId, endpoint, responseTime);