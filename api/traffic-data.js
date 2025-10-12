/**
 * Traffic Data API with Comprehensive Error Handling
 * Implements all Vercel error prevention measures
 */

import { withErrorHandling } from '../lib/error-handler';
import { withPayloadValidation } from '../lib/payload-validator';
import { withCache, ResponseCacheManager } from '../lib/cache-manager';

// Mock traffic data for demonstration
const generateTrafficData = (location, timeRange = '24h') => {
  const baseData = {
    location,
    timeRange,
    timestamp: new Date().toISOString(),
    data: []
  };

  // Generate sample traffic data
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1;
  for (let i = 0; i < hours; i++) {
    const hour = new Date(Date.now() - (hours - i) * 60 * 60 * 1000);
    baseData.data.push({
      timestamp: hour.toISOString(),
      volume: Math.floor(Math.random() * 1000) + 100,
      speed: Math.floor(Math.random() * 40) + 30,
      congestionLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      incidents: Math.random() > 0.9 ? Math.floor(Math.random() * 3) + 1 : 0
    });
  }

  return baseData;
};

async function trafficDataHandler(req, res) {
  try {
    // Validate request method
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'INVALID_REQUEST_METHOD',
        message: 'Only GET requests are supported',
        allowedMethods: ['GET']
      });
    }

    // Extract and validate query parameters
    const { location, timeRange = '24h', format = 'json' } = req.query;

    // Validate required parameters
    if (!location) {
      return res.status(400).json({
        error: 'MALFORMED_REQUEST_HEADER',
        message: 'Location parameter is required',
        example: '/api/traffic-data?location=downtown&timeRange=24h'
      });
    }

    // Validate time range
    const validTimeRanges = ['1h', '24h', '7d'];
    if (!validTimeRanges.includes(timeRange)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST_PARAMETER',
        message: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`,
        provided: timeRange
      });
    }

    // Generate traffic data
    const trafficData = generateTrafficData(location, timeRange);

    // Validate response payload size
    const jsonString = JSON.stringify(trafficData);
    const sizeInBytes = new TextEncoder().encode(jsonString).length;
    
    // Check if response is too large (4.5MB limit)
    if (sizeInBytes > 4.5 * 1024 * 1024) {
      return res.status(500).json({
        error: 'FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE',
        message: 'Response data exceeds size limits',
        size: `${Math.round(sizeInBytes / 1024 / 1024 * 100) / 100}MB`,
        suggestion: 'Use pagination or reduce time range'
      });
    }

    // Set appropriate cache headers
    ResponseCacheManager.setDynamicCache(res, 300, 60); // 5 min cache, 1 min stale-while-revalidate
    
    // Set ETag for conditional requests
    const etag = ResponseCacheManager.setETag(res, trafficData);
    
    // Check if client has cached version
    if (ResponseCacheManager.isNotModified(req, etag)) {
      return res.status(304).end();
    }

    // Add response metadata
    res.setHeader('X-Response-Size', sizeInBytes);
    res.setHeader('X-Data-Points', trafficData.data.length);
    res.setHeader('X-Cache-TTL', '300');

    // Return successful response
    return res.status(200).json({
      success: true,
      ...trafficData,
      metadata: {
        responseSize: sizeInBytes,
        dataPoints: trafficData.data.length,
        generatedAt: new Date().toISOString(),
        cacheInfo: {
          ttl: 300,
          etag
        }
      }
    });

  } catch (error) {
    console.error('Traffic data API error:', error);
    
    // Handle specific error types
    if (error.name === 'SyntaxError') {
      return res.status(400).json({
        error: 'MALFORMED_REQUEST_HEADER',
        message: 'Invalid request format'
      });
    }

    if (error.code === 'TIMEOUT') {
      return res.status(504).json({
        error: 'FUNCTION_INVOCATION_TIMEOUT',
        message: 'Request processing timeout'
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'FUNCTION_INVOCATION_FAILED',
      message: 'Internal server error occurred',
      timestamp: new Date().toISOString()
    });
  }
}

// Apply middleware layers
const cachedHandler = withCache({
  ttl: 300, // 5 minutes
  keyGenerator: (req) => `traffic-data:${req.query.location}:${req.query.timeRange}`,
  shouldCache: (req) => req.method === 'GET'
})(trafficDataHandler);

const validatedHandler = withPayloadValidation(cachedHandler);
const finalHandler = withErrorHandling(validatedHandler);

export default finalHandler;

// API configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Prevent large request bodies
    },
    responseLimit: '4mb', // Prevent large responses
  },
  maxDuration: 15, // 15 second timeout
};