/**
 * Logger utility for Netlify Functions
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Current log level
 */
const currentLogLevel = process.env.LOG_LEVEL || LOG_LEVELS.INFO;

/**
 * Log level priorities
 */
const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.ERROR]: 1,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.INFO]: 3,
  [LOG_LEVELS.DEBUG]: 4
};

/**
 * Check if a log level should be logged
 * @param {string} level - Log level to check
 * @returns {boolean} Whether the log level should be logged
 */
const shouldLog = (level) => {
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel];
};

/**
 * Format a log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @returns {string} Formatted log message
 */
const formatLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'local';
  
  return JSON.stringify({
    timestamp,
    level,
    function: functionName,
    message,
    ...data
  });
};

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {Object} data - Additional data to log
 */
const error = (message, data = {}) => {
  if (shouldLog(LOG_LEVELS.ERROR)) {
    console.error(formatLog(LOG_LEVELS.ERROR, message, data));
  }
};

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {Object} data - Additional data to log
 */
const warn = (message, data = {}) => {
  if (shouldLog(LOG_LEVELS.WARN)) {
    console.warn(formatLog(LOG_LEVELS.WARN, message, data));
  }
};

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {Object} data - Additional data to log
 */
const info = (message, data = {}) => {
  if (shouldLog(LOG_LEVELS.INFO)) {
    console.info(formatLog(LOG_LEVELS.INFO, message, data));
  }
};

/**
 * Log a debug message
 * @param {string} message - Debug message
 * @param {Object} data - Additional data to log
 */
const debug = (message, data = {}) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.debug(formatLog(LOG_LEVELS.DEBUG, message, data));
  }
};

/**
 * Log an API request
 * @param {Object} req - Express request object
 */
const logRequest = (req) => {
  if (shouldLog(LOG_LEVELS.INFO)) {
    info('API Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }
};

/**
 * Log an API response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} startTime - Request start time
 */
const logResponse = (req, res, startTime) => {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  if (shouldLog(LOG_LEVELS.INFO)) {
    info('API Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  }
};

/**
 * Create a request logger middleware
 * @returns {Function} Express middleware
 */
const requestLogger = () => {
  return (req, res, next) => {
    const startTime = Date.now();
    logRequest(req);
    
    // Log response when finished
    res.on('finish', () => {
      logResponse(req, res, startTime);
    });
    
    next();
  };
};

module.exports = {
  LOG_LEVELS,
  error,
  warn,
  info,
  debug,
  requestLogger
};