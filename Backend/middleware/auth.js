const jwt = require('jsonwebtoken');
const winston = require('winston');

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

// JWT Authentication Middleware (Development Mode)
const authenticateToken = (req, res, next) => {
  // In development mode, allow requests with demo tokens or bypass auth for testing
  if (process.env.NODE_ENV === 'development') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Allow demo tokens or create a default user
    if (!token || token === 'demo_token' || token.startsWith('eyJ') || token.length > 10) {
      req.user = {
        userId: 'demo-user',
        email: 'demo@trafficai.com',
        role: 'user'
      };
      logger.info('Development mode: Using demo user authentication');
      return next();
    }
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Access denied: No token provided');
    return res.status(401).json({ 
      success: false, 
      error: 'Access denied. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.info(`Authenticated user ${decoded.userId}`);
    next();
  } catch (error) {
    logger.error('Invalid token:', error.message);
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid token.' 
    });
  }
};

module.exports = { authenticateToken };