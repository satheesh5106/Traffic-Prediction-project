/**
 * Cache Manager for Traffic Prediction Project
 * Provides efficient caching mechanisms for API responses and data
 */

const NodeCache = require('node-cache');
const winston = require('winston');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/cache-manager.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Cache TTL configuration (in seconds)
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL) || 300; // 5 minutes
const TRAFFIC_TTL = parseInt(process.env.TRAFFIC_CACHE_TTL) || 120; // 2 minutes
const PREDICTION_TTL = parseInt(process.env.PREDICTION_CACHE_TTL) || 600; // 10 minutes
const HISTORICAL_TTL = parseInt(process.env.HISTORICAL_CACHE_TTL) || 3600; // 1 hour

// Create cache instances for different data types
const trafficCache = new NodeCache({ stdTTL: TRAFFIC_TTL, checkperiod: 60 });
const predictionCache = new NodeCache({ stdTTL: PREDICTION_TTL, checkperiod: 120 });
const incidentCache = new NodeCache({ stdTTL: TRAFFIC_TTL, checkperiod: 60 });
const historicalCache = new NodeCache({ stdTTL: HISTORICAL_TTL, checkperiod: 300 });
const generalCache = new NodeCache({ stdTTL: DEFAULT_TTL, checkperiod: 60 });

// Map-based caches for spatial data
const spatialTrafficCache = new Map();
const spatialIncidentCache = new Map();

/**
 * Class for spatial caching with KD-tree like functionality
 */
class SpatialCache {
  constructor(ttl = 120000) { // Default TTL: 2 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.ttl) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    logger.debug(`SpatialCache: Set ${key} with TTL ${ttl}ms`);
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      logger.debug(`SpatialCache: ${key} expired and removed`);
      return null;
    }
    
    logger.debug(`SpatialCache: Cache hit for ${key}`);
    return item.value;
  }

  /**
   * Find nearest cached point to given coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} maxDistance - Maximum distance in degrees
   * @returns {any} - Nearest cached value or null
   */
  getNearestPoint(lat, lon, maxDistance = 0.05) { // ~5km
    let nearestKey = null;
    let minDistance = maxDistance;
    
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        continue;
      }
      
      // Extract coordinates from key (format: "lat_lon")
      const [keyLat, keyLon] = key.split('_').map(parseFloat);
      
      // Calculate distance (simplified)
      const distance = Math.sqrt(
        Math.pow(lat - keyLat, 2) + Math.pow(lon - keyLon, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestKey = key;
      }
    }
    
    if (nearestKey) {
      logger.debug(`SpatialCache: Found nearest point at distance ${minDistance}`);
      return this.cache.get(nearestKey).value;
    }
    
    return null;
  }

  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
    logger.debug('SpatialCache: Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expiredItems++;
      } else {
        validItems++;
      }
    }
    
    return {
      size: this.cache.size,
      validItems,
      expiredItems
    };
  }
}

// Create spatial cache instances
const spatialCache = new SpatialCache(TRAFFIC_TTL * 1000);

/**
 * Get a cache key for coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Radius in kilometers
 * @returns {string} - Cache key
 */
function getCacheKey(lat, lon, radius = 5) {
  return `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}`;
}

/**
 * Get a cache key for a city
 * @param {string} city - City name
 * @param {string} type - Data type
 * @param {Object} params - Additional parameters
 * @returns {string} - Cache key
 */
function getCityCacheKey(city, type, params = {}) {
  const paramsStr = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return `${city.toLowerCase()}_${type}${paramsStr ? `_${paramsStr}` : ''}`;
}

/**
 * Cache traffic data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
function cacheTrafficData(key, data, ttl = TRAFFIC_TTL) {
  trafficCache.set(key, {
    data,
    timestamp: Date.now()
  }, ttl);
  logger.debug(`Cached traffic data with key: ${key}`);
}

/**
 * Get cached traffic data
 * @param {string} key - Cache key
 * @returns {any} - Cached data or null
 */
function getCachedTrafficData(key) {
  const cached = trafficCache.get(key);
  if (cached) {
    logger.debug(`Cache hit for traffic data with key: ${key}`);
    return cached;
  }
  logger.debug(`Cache miss for traffic data with key: ${key}`);
  return null;
}

/**
 * Cache prediction data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
function cachePredictionData(key, data, ttl = PREDICTION_TTL) {
  predictionCache.set(key, {
    data,
    timestamp: Date.now()
  }, ttl);
  logger.debug(`Cached prediction data with key: ${key}`);
}

/**
 * Get cached prediction data
 * @param {string} key - Cache key
 * @returns {any} - Cached data or null
 */
function getCachedPredictionData(key) {
  const cached = predictionCache.get(key);
  if (cached) {
    logger.debug(`Cache hit for prediction data with key: ${key}`);
    return cached;
  }
  logger.debug(`Cache miss for prediction data with key: ${key}`);
  return null;
}

/**
 * Cache incident data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
function cacheIncidentData(key, data, ttl = TRAFFIC_TTL) {
  incidentCache.set(key, {
    data,
    timestamp: Date.now()
  }, ttl);
  logger.debug(`Cached incident data with key: ${key}`);
}

/**
 * Get cached incident data
 * @param {string} key - Cache key
 * @returns {any} - Cached data or null
 */
function getCachedIncidentData(key) {
  const cached = incidentCache.get(key);
  if (cached) {
    logger.debug(`Cache hit for incident data with key: ${key}`);
    return cached;
  }
  logger.debug(`Cache miss for incident data with key: ${key}`);
  return null;
}

/**
 * Cache historical data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
function cacheHistoricalData(key, data, ttl = HISTORICAL_TTL) {
  historicalCache.set(key, {
    data,
    timestamp: Date.now()
  }, ttl);
  logger.debug(`Cached historical data with key: ${key}`);
}

/**
 * Get cached historical data
 * @param {string} key - Cache key
 * @returns {any} - Cached data or null
 */
function getCachedHistoricalData(key) {
  const cached = historicalCache.get(key);
  if (cached) {
    logger.debug(`Cache hit for historical data with key: ${key}`);
    return cached;
  }
  logger.debug(`Cache miss for historical data with key: ${key}`);
  return null;
}

/**
 * Cache general data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
function cacheGeneralData(key, data, ttl = DEFAULT_TTL) {
  generalCache.set(key, {
    data,
    timestamp: Date.now()
  }, ttl);
  logger.debug(`Cached general data with key: ${key}`);
}

/**
 * Get cached general data
 * @param {string} key - Cache key
 * @returns {any} - Cached data or null
 */
function getCachedGeneralData(key) {
  const cached = generalCache.get(key);
  if (cached) {
    logger.debug(`Cache hit for general data with key: ${key}`);
    return cached;
  }
  logger.debug(`Cache miss for general data with key: ${key}`);
  return null;
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  return {
    traffic: trafficCache.getStats(),
    prediction: predictionCache.getStats(),
    incident: incidentCache.getStats(),
    historical: historicalCache.getStats(),
    general: generalCache.getStats(),
    spatial: spatialCache.getStats()
  };
}

/**
 * Clear all caches
 */
function clearAllCaches() {
  trafficCache.flushAll();
  predictionCache.flushAll();
  incidentCache.flushAll();
  historicalCache.flushAll();
  generalCache.flushAll();
  spatialCache.clear();
  logger.info('All caches cleared');
}

module.exports = {
  // Cache keys
  getCacheKey,
  getCityCacheKey,
  
  // Traffic data caching
  cacheTrafficData,
  getCachedTrafficData,
  
  // Prediction data caching
  cachePredictionData,
  getCachedPredictionData,
  
  // Incident data caching
  cacheIncidentData,
  getCachedIncidentData,
  
  // Historical data caching
  cacheHistoricalData,
  getCachedHistoricalData,
  
  // General data caching
  cacheGeneralData,
  getCachedGeneralData,
  
  // Spatial caching
  spatialCache,
  
  // Cache management
  getCacheStats,
  clearAllCaches,
  
  // Cache instances
  trafficCache,
  predictionCache,
  incidentCache,
  historicalCache,
  generalCache
};