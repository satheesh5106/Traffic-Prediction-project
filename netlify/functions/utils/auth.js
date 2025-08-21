// Firebase Authentication utilities for Netlify Functions
const admin = require('firebase-admin');
const { handleGenericError, createErrorResponse, ERROR_TYPES } = require('./errorHandler');

// Initialize Firebase Admin SDK
let firebaseApp;

function initializeFirebase() {
  if (!firebaseApp && !admin.apps.length) {
    try {
      // Initialize with service account credentials from environment
      if (process.env.FIREBASE_PRIVATE_KEY) {
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } else {
        // Fallback to application default credentials
        firebaseApp = admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
      console.log('Firebase Admin initialized for Netlify Functions');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }
  return firebaseApp || admin.app();
}

// Verify Firebase ID token
async function verifyToken(token) {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
    console.log('Development mode: bypassing Firebase auth');
    return {
      success: true,
      user: {
        uid: 'dev-user-123',
        email: 'dev@trafficai.com',
        name: 'Development User'
      }
    };
  }

  try {
    const app = initializeFirebase();
    const decodedToken = await admin.auth(app).verifyIdToken(token);
    return {
      success: true,
      user: decodedToken
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Authentication middleware for Netlify Functions
function requireAuth(handler) {
  return async (event, context) => {
    try {
      // Handle CORS preflight
      if (event.httpMethod === 'OPTIONS') {
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
          },
          body: ''
        };
      }

      // Extract token from Authorization header
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader) {
        return createErrorResponse(
          ERROR_TYPES.UNAUTHORIZED,
          'Missing Authorization header',
          401,
          { requestId: context.requestId }
        );
      }

      if (!authHeader.startsWith('Bearer ')) {
        return createErrorResponse(
          ERROR_TYPES.UNAUTHORIZED,
          'Invalid Authorization header format. Expected: Bearer <token>',
          401,
          { requestId: context.requestId }
        );
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        return createErrorResponse(
          ERROR_TYPES.UNAUTHORIZED,
          'Missing authentication token',
          401,
          { requestId: context.requestId }
        );
      }

      // Verify the token
      const verification = await verifyToken(token);
      
      if (!verification.success) {
        return createErrorResponse(
          ERROR_TYPES.UNAUTHORIZED,
          `Token verification failed: ${verification.error}`,
          401,
          { requestId: context.requestId }
        );
      }

      // Add user to context for use in handler
      context.user = verification.user;
      context.userId = verification.user.uid;
      
      // Call the original handler with authenticated context
      return await handler(event, context);
      
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return handleGenericError(error, context.requestId);
    }
  };
}

// Check if user has admin role
function requireAdmin(handler) {
  return requireAuth(async (event, context) => {
    try {
      const user = context.user;
      
      // Check for admin claim or role
      if (!user.admin && !user.customClaims?.admin) {
        return createErrorResponse(
          ERROR_TYPES.UNAUTHORIZED,
          'Admin access required',
          403,
          { requestId: context.requestId }
        );
      }
      
      return await handler(event, context);
      
    } catch (error) {
      console.error('Admin middleware error:', error);
      return handleGenericError(error, context.requestId);
    }
  });
}

// Get Firestore instance
function getFirestore() {
  const app = initializeFirebase();
  return admin.firestore(app);
}

// Get Auth instance
function getAuth() {
  const app = initializeFirebase();
  return admin.auth(app);
}

// Validate user permissions for specific resources
function validateUserAccess(userId, resourceOwnerId, allowSelf = true) {
  if (allowSelf && userId === resourceOwnerId) {
    return true;
  }
  return false;
}

// Rate limiting by user ID
const userRateLimits = new Map();

function checkUserRateLimit(userId, limit = 100, windowMs = 3600000) {
  const now = Date.now();
  const userLimit = userRateLimits.get(userId) || {
    count: 0,
    resetTime: now + windowMs
  };
  
  if (userLimit.resetTime < now) {
    userLimit.count = 0;
    userLimit.resetTime = now + windowMs;
  }
  
  if (userLimit.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime: userLimit.resetTime
    };
  }
  
  userLimit.count++;
  userRateLimits.set(userId, userLimit);
  
  return {
    allowed: true,
    limit,
    remaining: limit - userLimit.count,
    resetTime: userLimit.resetTime
  };
}

module.exports = {
  initializeFirebase,
  verifyToken,
  requireAuth,
  requireAdmin,
  getFirestore,
  getAuth,
  validateUserAccess,
  checkUserRateLimit
};