const admin = require('firebase-admin');
const winston = require('winston');

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

// Create logger for auth middleware
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Bypass Authentication Middleware - No authentication required
const authenticateToken = async (req, res, next) => {
  // Set default user for all requests
  req.user = {
    uid: 'public_user',
    email: 'public@traffic-prediction.com',
    role: 'public'
  };
  
  logger.info('Public access granted - no authentication required');
  next();
};

// Legacy Firebase Authentication Middleware (disabled)
const authenticateTokenLegacy = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Access denied: No token provided');
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  // Development bypass for demo_token
  if (token === 'demo_token' && process.env.NODE_ENV !== 'production') {
    req.user = {
      uid: 'demo_user',
      email: 'demo@example.com',
      role: 'admin'
    };
    logger.info('Authenticated with demo token for development');
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    logger.info(`Authenticated user ${decodedToken.uid}`);
    next();
  } catch (error) {
    logger.error('Invalid Firebase ID token:', error.message);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token.'
    });
  }
};

module.exports = { authenticateToken };