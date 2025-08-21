const { getAuth } = require('firebase-admin/auth');

/**
 * Authentication middleware for Netlify Functions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    
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

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of roles allowed to access the resource
 */
const authorizeRoles = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
      }
      
      // Get user role from Firestore
      const { getFirestore } = require('firebase-admin/firestore');
      const db = getFirestore();
      
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'Forbidden: User profile not found' });
      }
      
      const userRole = userDoc.data().role || 'guest';
      
      // Check if user role is allowed
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          requiredRoles: allowedRoles,
          userRole
        });
      }
      
      // Add role to request
      req.userRole = userRole;
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.max - Maximum number of requests
 * @param {number} options.windowMs - Time window in milliseconds
 */
const rateLimit = (options = { max: 10, windowMs: 60 * 1000 }) => {
  // In-memory store for rate limiting (in production, use Redis)
  const requestCounts = {};
  
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userId = req.user ? req.user.uid : 'anonymous';
    const key = `${ip}:${userId}`;
    const now = Date.now();
    
    // Initialize or clean up old requests
    if (!requestCounts[key] || requestCounts[key].resetTime < now) {
      requestCounts[key] = {
        count: 0,
        resetTime: now + options.windowMs
      };
    }
    
    // Increment count
    requestCounts[key].count++;
    
    // Check if over limit
    if (requestCounts[key].count > options.max) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((requestCounts[key].resetTime - now) / 1000)
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  rateLimit
};