const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getAuth } = require('firebase-admin/auth');
const rateLimit = require('express-rate-limit');
const { initializeFirebase } = require('./utils/firebase-init');
const { validateUserRegistration, validateProfileUpdate } = require('./utils/validation');
const logger = require('./utils/logger');
const { isDev, apiConfig } = require('./utils/config');
const { authenticateUser, authorizeRoles } = require('./middleware/auth-middleware');
const { asyncHandler, notFound, badRequest, unauthorized, forbidden, getFirebaseAuthErrorMessage } = require('./utils/error-handler');
const db = require('./utils/database');

// Initialize Firebase Admin SDK
const firebaseApp = initializeFirebase();

// Initialize Firebase Auth
const auth = getAuth(firebaseApp);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting configuration
const rateLimits = {
  login: { max: 5, windowMs: 60 * 1000 }, // 5 attempts per minute
  register: { max: 3, windowMs: 60 * 1000 }, // 3 attempts per minute
  passwordReset: { max: 3, windowMs: 60 * 1000 } // 3 attempts per minute
};

// In-memory store for rate limiting (in production, use Redis)
const requestCounts = {};

// Rate limiting middleware
const rateLimit = (type) => {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `${ip}:${type}`;
    const now = Date.now();
    
    // Initialize or clean up old requests
    if (!requestCounts[key] || requestCounts[key].resetTime < now) {
      requestCounts[key] = {
        count: 0,
        resetTime: now + rateLimits[type].windowMs
      };
    }
    
    // Increment count
    requestCounts[key].count++;
    
    // Check if over limit
    if (requestCounts[key].count > rateLimits[type].max) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    }
    
    next();
  };
};

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Add user to request
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Routes

// User registration
app.post('/api/auth/register', rateLimit('register'), asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;
  
  // Validate request body
  const validationResult = validateUserRegistration(req.body);
  if (validationResult.error) {
    throw badRequest(validationResult.error.message, { details: validationResult.error.details });
  }
  
  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false
    });
    
    // Create user profile in Firestore
    const userProfile = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: 'standard', // Default role
      createdAt: new Date().toISOString(),
      preferences: {
        defaultCity: 'mumbai',
        defaultVehicle: 'car',
        defaultRouteType: 'fastest',
        notifications: true
      }
    };
    
    await db.createDocument('users', userRecord.uid, userProfile);
    logger.info(`User registered successfully: ${userRecord.uid}`);
    
    // Send verification email
    // In production, implement email verification
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`, { error });
    throw badRequest(getFirebaseAuthErrorMessage(error) || 'Failed to register user');
  }
}));

// User login (client-side Firebase Auth handles this, but we provide an endpoint for custom logic)
app.post('/api/auth/login', rateLimit('login'), asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    throw badRequest('ID token is required');
  }
  
  try {
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Get user profile from Firestore
    const userProfile = await db.getDocumentById('users', decodedToken.uid);
    
    if (!userProfile) {
      // Create user profile if it doesn't exist (for users created outside this API)
      const userProfile = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split('@')[0],
        role: 'standard',
        createdAt: new Date().toISOString(),
        preferences: {
          defaultCity: 'mumbai',
          defaultVehicle: 'car',
          defaultRouteType: 'fastest',
          notifications: true
        }
      };
      
      await db.createDocument('users', decodedToken.uid, userProfile);
      logger.info(`Created new user profile for: ${decodedToken.uid}`);
      
      return res.json({
        message: 'Login successful',
        user: userProfile
      });
    }
    
    // Log login activity
    await db.createDocument('userActivity', null, {
      userId: decodedToken.uid,
      activity: 'login',
      timestamp: new Date().toISOString(),
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    logger.info(`User logged in: ${decodedToken.uid}`);
    res.json({
      message: 'Login successful',
      user: userProfile
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`, { error });
    throw unauthorized('Invalid credentials');
  }
}));

// Password reset request
app.post('/api/auth/password-reset', rateLimit('passwordReset'), asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw badRequest('Email is required');
  }
  
  // In production, send password reset email
  // For development, just return success
  logger.info(`Password reset requested for: ${email}`);
  
  res.json({
    message: 'Password reset email sent',
    email
  });
}));

// Get user profile (protected route)
app.get('/api/auth/profile', authenticateUser, asyncHandler(async (req, res) => {
  const userProfile = await db.getDocumentById('users', req.user.uid);
  
  if (!userProfile) {
    throw notFound('User profile');
  }
  
  logger.info(`Profile fetched for user: ${req.user.uid}`);
  res.json({
    profile: userProfile
  });
}));

// Update user profile (protected route)
app.put('/api/auth/profile', authenticateUser, asyncHandler(async (req, res) => {
  // Validate request body
  const validationResult = validateProfileUpdate(req.body);
  if (validationResult.error) {
    throw badRequest(validationResult.error.message, { details: validationResult.error.details });
  }
  
  const { displayName, preferences } = req.body;
  
  // Fields to update
  const updates = {};
  
  if (displayName) {
    updates.displayName = displayName;
    
    // Update in Firebase Auth
    await auth.updateUser(req.user.uid, { displayName });
  }
  
  if (preferences) {
    // Get current preferences
    const userData = await db.getDocumentById('users', req.user.uid);
    
    if (!userData) {
      throw notFound('User profile');
    }
    
    const currentPreferences = userData.preferences || {};
    
    // Update preferences
    updates.preferences = {
      ...currentPreferences,
      ...preferences
    };
  }
  
  // Update in Firestore
  await db.updateDocument('users', req.user.uid, updates);
  
  // Get updated profile
  const updatedProfile = await db.getDocumentById('users', req.user.uid);
  
  logger.info(`Profile updated for user: ${req.user.uid}`);
  res.json({
    message: 'Profile updated successfully',
    profile: updatedProfile
  });
}));

// Logout (client-side Firebase Auth handles this, but we provide an endpoint for custom logic)
app.post('/api/auth/logout', authenticateUser, asyncHandler(async (req, res) => {
  // Log logout activity
  await db.createDocument('userActivity', null, {
    userId: req.user.uid,
    activity: 'logout',
    timestamp: new Date().toISOString(),
    ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  });
  
  logger.info(`User logged out: ${req.user.uid}`);
  res.json({
    message: 'Logout successful'
  });
}));

// Get user roles and permissions (for admin purposes)
app.get('/api/auth/roles', authenticateUser, asyncHandler(async (req, res) => {
  // Check if user is admin
  const userData = await db.getDocumentById('users', req.user.uid);
  
  if (!userData || userData.role !== 'admin') {
    throw forbidden('Admin access required');
  }
  
  // Get all roles
  const rolesData = await db.getDocumentById('config', 'roles');
  
  if (!rolesData) {
    throw notFound('Roles configuration');
  }
  
  logger.info(`Roles fetched by admin: ${req.user.uid}`);
  res.json({
    roles: rolesData
  });
}));

// Handle 404
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

// Export the serverless function
module.exports.handler = serverless(app);

// Export the authentication middleware for use in other functions
module.exports.authenticateUser = authenticateUser;