const { Handler } = require('@netlify/functions');
const NodeCache = require('node-cache');
require('dotenv').config();

const { 
  asyncHandler, 
  createSuccessResponse, 
  handleValidationError,
  log 
} = require('./utils/errorHandler');

const {
  generateTrafficPredictions,
  INDIAN_LOCATIONS
} = require('./utils/mockData');

// Initialize cache
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60
});

// Generate mock traffic incidents for a city
function generateTrafficIncidents(city, count = 20) {
  const location = INDIAN_LOCATIONS[city] || INDIAN_LOCATIONS.delhi;
  const incidents = [];
  
  const incidentTypes = ['accident', 'construction', 'congestion', 'road_closure', 'weather'];
  const severityLevels = ['low', 'medium', 'high', 'critical'];
  
  for (let i = 0; i < count; i++) {
    const lat = location.center[0] + (Math.random() - 0.5) * 0.2;
    const lng = location.center[1] + (Math.random() - 0.5) * 0.2;
    
    const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
    
    incidents.push({
      id: `incident-${city}-${i}`,
      type,
      severity,
      level: severity, // alias for compatibility
      location: `${location.name} Area ${i + 1}`,
      coordinates: [lat, lng],
      description: getIncidentDescription(type, severity),
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      estimatedClearTime: new Date(Date.now() + Math.random() * 7200000).toISOString(),
      details: getIncidentDetails(type, severity),
      confidence: Math.floor(Math.random() * 20) + 80 + '%',
      eta: Math.floor(Math.random() * 60) + 15 + ' min'
    });
  }
  
  return incidents;
}

function getIncidentDescription(type, severity) {
  const descriptions = {
    accident: {
      low: 'Minor fender bender, one lane affected',
      medium: 'Multi-vehicle accident, two lanes blocked',
      high: 'Serious accident, major delays expected',
      critical: 'Major accident, road closure in effect'
    },
    construction: {
      low: 'Lane maintenance, minimal delays',
      medium: 'Road work in progress, expect delays',
      high: 'Major construction, significant delays',
      critical: 'Complete road reconstruction, find alternate route'
    },
    congestion: {
      low: 'Light traffic, moving slowly',
      medium: 'Moderate congestion, delays expected',
      high: 'Heavy traffic, significant delays',
      critical: 'Severe congestion, consider alternate routes'
    },
    road_closure: {
      low: 'Partial lane closure',
      medium: 'Multiple lanes closed',
      high: 'Road partially closed',
      critical: 'Complete road closure'
    },
    weather: {
      low: 'Light rain affecting visibility',
      medium: 'Heavy rain, reduced speeds',
      high: 'Severe weather conditions',
      critical: 'Dangerous weather, avoid travel'
    }
  };
  
  return descriptions[type]?.[severity] || 'Traffic incident reported';
}

function getIncidentDetails(type, severity) {
  const details = {
    accident: 'Emergency services on scene. Please drive carefully and follow traffic control.',
    construction: 'Scheduled maintenance work. Follow posted signs and reduced speed limits.',
    congestion: 'High traffic volume. Consider using alternate routes or delaying travel.',
    road_closure: 'Road temporarily closed. Use designated detour routes.',
    weather: 'Weather-related hazard. Exercise extreme caution and reduce speed.'
  };
  
  return details[type] || 'Please exercise caution in this area.';
}

const handler = asyncHandler(async (event, context) => {
  const requestId = context.requestId;
  
  log('info', 'Traffic live data request received', { 
    method: event.httpMethod,
    path: event.path,
    requestId
  });
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return handleValidationError(['Only GET method allowed'], requestId);
  }
  
  // Extract city from path: /traffic/live/{city}
  const pathParts = event.path.split('/');
  const city = pathParts[pathParts.length - 1] || 'mumbai';
  
  // Validate city
  if (!INDIAN_LOCATIONS[city]) {
    return handleValidationError([
      `Invalid city: ${city}. Supported cities: ${Object.keys(INDIAN_LOCATIONS).join(', ')}`
    ], requestId);
  }
  
  // Check cache
  const cacheKey = `traffic-live-${city}`;
  let cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    log('info', 'Serving cached traffic data', { city, requestId });
    return createSuccessResponse(cachedData, 200, { requestId });
  }
  
  try {
    // Generate traffic incidents
    const incidents = generateTrafficIncidents(city, 25);
    
    const responseData = {
      city,
      timestamp: new Date().toISOString(),
      incidents,
      summary: {
        total: incidents.length,
        critical: incidents.filter(i => i.severity === 'critical').length,
        high: incidents.filter(i => i.severity === 'high').length,
        medium: incidents.filter(i => i.severity === 'medium').length,
        low: incidents.filter(i => i.severity === 'low').length
      },
      location: INDIAN_LOCATIONS[city]
    };
    
    // Cache the data
    cache.set(cacheKey, responseData);
    
    log('info', 'Traffic live data generated successfully', { 
      city, 
      incidentCount: incidents.length,
      requestId 
    });
    
    return createSuccessResponse(responseData, 200, { requestId });
    
  } catch (error) {
    log('error', 'Error generating traffic data', { 
      error: error.message, 
      city, 
      requestId 
    });
    
    return createSuccessResponse({
      error: 'Failed to fetch traffic data',
      message: 'Using fallback data',
      city,
      incidents: [],
      timestamp: new Date().toISOString()
    }, 500, { requestId });
  }
});

exports.handler = handler;