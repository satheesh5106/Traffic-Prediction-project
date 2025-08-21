const { Handler } = require('@netlify/functions');
const axios = require('axios');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { 
  handleGenericError, 
  createSuccessResponse, 
  handleExternalAPIError,
  handleValidationError,
  handleTimeoutError,
  asyncHandler,
  checkRateLimit,
  log 
} = require('./utils/errorHandler');
const { requireAuth } = require('./utils/auth');

// Initialize cache for notification tracking
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// OneSignal configuration
const ONESIGNAL_CONFIG = {
  appId: process.env.ONESIGNAL_APP_ID,
  restApiKey: process.env.ONESIGNAL_REST_API_KEY,
  baseUrl: 'https://onesignal.com/api/v1'
};

// Alert types and priorities
const ALERT_TYPES = {
  TRAFFIC_CONGESTION: {
    priority: 'high',
    icon: '🚦',
    sound: 'traffic_alert.wav'
  },
  ROUTE_UPDATE: {
    priority: 'medium',
    icon: '🗺️',
    sound: 'route_update.wav'
  },
  WEATHER_IMPACT: {
    priority: 'high',
    icon: '🌧️',
    sound: 'weather_alert.wav'
  },
  ACCIDENT_ALERT: {
    priority: 'critical',
    icon: '🚨',
    sound: 'emergency_alert.wav'
  },
  FUEL_SAVINGS: {
    priority: 'low',
    icon: '⛽',
    sound: 'notification.wav'
  }
};

// Alert severity levels
const ALERT_LEVELS = {
  CRITICAL: {
    priority: 10,
    sound: 'emergency',
    color: '#FF0000',
    icon: '🚨'
  },
  HIGH: {
    priority: 8,
    sound: 'alert',
    color: '#FF6600',
    icon: '⚠️'
  },
  MEDIUM: {
    priority: 5,
    sound: 'notification',
    color: '#FFCC00',
    icon: '📍'
  },
  LOW: {
    priority: 3,
    sound: 'default',
    color: '#00AA00',
    icon: 'ℹ️'
  }
};

// Determine alert level based on traffic conditions
function getAlertLevel(prediction) {
  if (prediction.level === 'Congested') {
    return 'CRITICAL';
  } else if (prediction.level === 'Heavy') {
    return 'HIGH';
  } else if (prediction.level === 'Moderate' && prediction.confidence > 90) {
    return 'MEDIUM';
  }
  return 'LOW';
}

// Create notification content
function createNotificationContent(prediction, alertLevel) {
  const level = ALERT_LEVELS[alertLevel];
  const eta = prediction.eta || 'Unknown';
  const confidence = prediction.confidence || 0;
  
  const messages = {
    CRITICAL: {
      title: `🚨 CRITICAL: Severe Traffic Alert`,
      message: `${prediction.location} is severely congested! Avoid this route. ETA: ${eta} mins (${confidence}% confidence)`,
      actionText: 'Find Alternative Route'
    },
    HIGH: {
      title: `⚠️ Heavy Traffic Alert`,
      message: `Heavy traffic detected on ${prediction.location}. Consider alternate routes. ETA: ${eta} mins`,
      actionText: 'View Traffic Map'
    },
    MEDIUM: {
      title: `📍 Traffic Update`,
      message: `Moderate traffic on ${prediction.location}. Plan accordingly. ETA: ${eta} mins`,
      actionText: 'Check Routes'
    },
    LOW: {
      title: `ℹ️ Traffic Info`,
      message: `Light traffic conditions on ${prediction.location}. Good time to travel!`,
      actionText: 'View Details'
    }
  };
  
  return {
    ...messages[alertLevel],
    level,
    prediction
  };
}

// Send notification via OneSignal
async function sendOneSignalNotification(notification) {
  try {
    if (!ONESIGNAL_CONFIG.appId || !ONESIGNAL_CONFIG.restApiKey) {
      throw new Error('OneSignal configuration missing');
    }

    const payload = {
      app_id: ONESIGNAL_CONFIG.appId,
      headings: { en: notification.title },
      contents: { en: notification.message },
      data: notification.data || {},
      priority: getPriorityLevel(notification.priority),
      android_sound: notification.sound,
      ios_sound: notification.sound,
      large_icon: notification.largeIcon,
      small_icon: notification.smallIcon,
      web_push_topic: notification.topic,
      ...getTargetingOptions(notification)
    };

    log('info', 'Sending OneSignal notification', {
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority,
      targetUsers: notification.targetUsers?.length || 'all'
    });

    const response = await axios.post(
      `${ONESIGNAL_CONFIG.baseUrl}/notifications`,
      payload,
      {
        headers: {
          'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    log('info', 'OneSignal notification sent successfully', {
      notificationId: notification.id,
      oneSignalId: response.data.id,
      recipients: response.data.recipients
    });

    return {
      success: true,
      oneSignalId: response.data.id,
      recipients: response.data.recipients,
      errors: response.data.errors || []
    };

  } catch (error) {
    log('error', 'OneSignal notification failed', {
      notificationId: notification.id,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    throw handleExternalAPIError(
      'Failed to send push notification',
      error,
      'OneSignal'
    );
  }
}

// Get priority level for OneSignal
function getPriorityLevel(priority) {
  const levels = {
    'critical': 10,
    'high': 8,
    'medium': 5,
    'low': 2
  };
  return levels[priority] || 5;
}

// Get targeting options based on notification
function getTargetingOptions(notification) {
  const options = {};

  if (notification.targetUsers && notification.targetUsers.length > 0) {
    // Target specific users
    options.include_external_user_ids = notification.targetUsers;
  } else if (notification.segments && notification.segments.length > 0) {
    // Target user segments
    options.included_segments = notification.segments;
  } else {
    // Target all subscribed users
    options.included_segments = ['Subscribed Users'];
  }

  // Add filters if specified
  if (notification.filters) {
    options.filters = notification.filters;
  }

  // Add location targeting for traffic alerts
  if (notification.location) {
    options.filters = options.filters || [];
    options.filters.push({
      field: 'location',
      radius: notification.location.radius || 10000, // 10km default
      lat: notification.location.latitude,
      long: notification.location.longitude
    });
  }

  return options;
}

// Create traffic congestion alert
function createTrafficAlert(trafficData, location) {
  const alertConfig = ALERT_TYPES.TRAFFIC_CONGESTION;
  const severity = getTrafficSeverity(trafficData.level);
  
  return {
    id: uuidv4(),
    type: 'TRAFFIC_CONGESTION',
    priority: severity === 'severe' ? 'critical' : alertConfig.priority,
    title: `${alertConfig.icon} Traffic Alert - ${severity.toUpperCase()}`,
    message: `Heavy traffic detected on ${location.name}. Expected delay: ${trafficData.delay} minutes. Consider alternate routes.`,
    sound: alertConfig.sound,
    data: {
      type: 'traffic_alert',
      location: location,
      trafficLevel: trafficData.level,
      delay: trafficData.delay,
      alternateRoutes: trafficData.alternateRoutes || [],
      timestamp: new Date().toISOString()
    },
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: 5000 // 5km radius
    },
    segments: ['Traffic Alerts']
  };
}

// Get traffic severity level
function getTrafficSeverity(level) {
  const severityMap = {
    'Free Flow': 'light',
    'Light': 'light',
    'Moderate': 'moderate',
    'Heavy': 'heavy',
    'Congested': 'severe',
    'Blocked': 'severe'
  };
  return severityMap[level] || 'moderate';
}

// Check if notification should be sent (avoid spam)
function shouldSendNotification(notification) {
  const cacheKey = `notification_${notification.type}_${notification.data?.location?.name || 'global'}`;
  const lastSent = cache.get(cacheKey);
  
  if (lastSent) {
    const timeDiff = Date.now() - lastSent;
    const cooldownPeriod = getCooldownPeriod(notification.type);
    
    if (timeDiff < cooldownPeriod) {
      log('info', 'Notification skipped due to cooldown', {
        type: notification.type,
        timeSinceLastSent: timeDiff,
        cooldownPeriod
      });
      return false;
    }
  }
  
  // Set cooldown
  cache.set(cacheKey, Date.now());
  return true;
}

// Get cooldown period for notification type
function getCooldownPeriod(type) {
  const cooldowns = {
    'TRAFFIC_CONGESTION': 300000, // 5 minutes
    'ROUTE_UPDATE': 600000,       // 10 minutes
    'WEATHER_IMPACT': 900000,     // 15 minutes
    'ACCIDENT_ALERT': 60000,      // 1 minute
    'FUEL_SAVINGS': 1800000       // 30 minutes
  };
  return cooldowns[type] || 300000;
}

// Send SMS alert (mock implementation)
async function sendSMSAlert(content, phoneNumbers = []) {
  // Mock SMS service - replace with actual SMS provider (Twilio, etc.)
  console.log(`📱 SMS Alert: ${content.title} - ${content.message}`);
  
  return {
    success: true,
    sent: phoneNumbers.length,
    provider: 'mock-sms'
  };
}

// Send email alert (mock implementation)
async function sendEmailAlert(content, emails = []) {
  // Mock email service - replace with actual email provider (SendGrid, etc.)
  console.log(`📧 Email Alert: ${content.title} - ${content.message}`);
  
  return {
    success: true,
    sent: emails.length,
    provider: 'mock-email'
  };
}

// Main handler for sending alerts
const handler = asyncHandler(async (event, context) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Validate request method
  if (event.httpMethod !== 'POST') {
    return handleValidationError('Only POST method allowed', { method: event.httpMethod });
  }

  log('info', 'Alert notification request started', {
    requestId,
    method: event.httpMethod,
    userAgent: event.headers['user-agent'],
    ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip']
  });

  // Authenticate user (admin required for sending alerts)
  const user = await requireAuth(event, { requireAdmin: true });
  log('info', 'Admin user authenticated for alert sending', {
    requestId,
    userId: user.uid,
    email: user.email
  });

  // Rate limiting per admin user
  const rateLimitKey = `alerts_${user.uid}`;
  const isRateLimited = checkRateLimit(rateLimitKey, 100, 3600); // 100 alerts per hour
  if (isRateLimited) {
    return handleValidationError('Rate limit exceeded for alert sending', {
      userId: user.uid,
      limit: '100 alerts per hour'
    });
  }

  // Parse and validate request body
  const body = JSON.parse(event.body || '{}');
  
  const {
    type,
    title,
    message,
    data = {},
    targetUsers = [],
    segments = [],
    location = null,
    priority = 'medium',
    immediate = false
  } = body;

  // Create notification object
  const notification = {
    id: uuidv4(),
    type,
    title,
    message,
    data: {
      ...data,
      sentBy: user.uid,
      sentAt: new Date().toISOString()
    },
    targetUsers,
    segments,
    location,
    priority,
    sound: ALERT_TYPES[type]?.sound || 'notification.wav'
  };

  // Validate notification data
  const validation = validateNotificationData(notification);
  if (!validation.isValid) {
    return handleValidationError(
      `Invalid notification data: ${validation.errors.join(', ')}`,
      { errors: validation.errors }
    );
  }

  // Check cooldown unless immediate flag is set
  if (!immediate && !shouldSendNotification(notification)) {
    return createSuccessResponse({
      requestId,
      message: 'Notification skipped due to cooldown period',
      notification: {
        id: notification.id,
        type: notification.type,
        skipped: true
      },
      processingTime: Date.now() - startTime
    });
  }

  try {
    // Send notification via OneSignal
    const result = await sendOneSignalNotification(notification);
    
    const processingTime = Date.now() - startTime;
    
    log('info', 'Alert notification sent successfully', {
      requestId,
      notificationId: notification.id,
      oneSignalId: result.oneSignalId,
      recipients: result.recipients,
      processingTime
    });

    return createSuccessResponse({
      requestId,
      notification: {
        id: notification.id,
        type: notification.type,
        oneSignalId: result.oneSignalId,
        recipients: result.recipients,
        sent: true
      },
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('error', 'Failed to send alert notification', {
      requestId,
      notificationId: notification.id,
      error: error.message
    });
    
    throw error;
  }
});

// Validate notification data
function validateNotificationData(data) {
  const errors = [];
  
  if (!data.type || !Object.keys(ALERT_TYPES).includes(data.type)) {
    errors.push('Invalid or missing notification type');
  }
  
  if (!data.title || data.title.length === 0) {
    errors.push('Notification title is required');
  }
  
  if (!data.message || data.message.length === 0) {
    errors.push('Notification message is required');
  }
  
  if (data.title && data.title.length > 100) {
    errors.push('Notification title too long (max 100 characters)');
  }
  
  if (data.message && data.message.length > 500) {
    errors.push('Notification message too long (max 500 characters)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

const legacyHandler = async (event, context) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
      };
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }
    
    const { 
      predictions = [], 
      alertTypes = ['push'], 
      segments = ['All'],
      phoneNumbers = [],
      emails = [],
      minSeverity = 'MEDIUM'
    } = requestBody;
    
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No predictions provided' })
      };
    }
    
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      alerts: [],
      errors: []
    };
    
    // Process each prediction
    for (const prediction of predictions) {
      results.processed++;
      
      const alertLevel = getAlertLevel(prediction);
      const content = createNotificationContent(prediction, alertLevel);
      
      // Check if alert meets minimum severity
      const severityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (severityOrder.indexOf(alertLevel) < severityOrder.indexOf(minSeverity)) {
        continue;
      }
      
      const alertResult = {
        predictionId: prediction.id,
        location: prediction.location,
        level: alertLevel,
        content: content.message,
        channels: []
      };
      
      // Send push notifications
      if (alertTypes.includes('push')) {
        const pushResult = await sendOneSignalNotification(content, segments);
        alertResult.channels.push({
          type: 'push',
          success: pushResult.success,
          recipients: pushResult.recipients || 0,
          notificationId: pushResult.notificationId,
          error: pushResult.error
        });
        
        if (pushResult.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Push notification failed: ${pushResult.error}`);
        }
      }
      
      // Send SMS alerts
      if (alertTypes.includes('sms') && phoneNumbers.length > 0) {
        const smsResult = await sendSMSAlert(content, phoneNumbers);
        alertResult.channels.push({
          type: 'sms',
          success: smsResult.success,
          sent: smsResult.sent,
          error: smsResult.error
        });
      }
      
      // Send email alerts
      if (alertTypes.includes('email') && emails.length > 0) {
        const emailResult = await sendEmailAlert(content, emails);
        alertResult.channels.push({
          type: 'email',
          success: emailResult.success,
          sent: emailResult.sent,
          error: emailResult.error
        });
      }
      
      results.alerts.push(alertResult);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        summary: {
          processed: results.processed,
          sent: results.sent,
          failed: results.failed,
          successRate: results.processed > 0 ? `${Math.round((results.sent / results.processed) * 100)}%` : '0%'
        },
        alerts: results.alerts,
        errors: results.errors,
        timestamp: new Date().toISOString(),
        config: {
          minSeverity,
          alertTypes,
          segments: segments.length
        }
      })
    };
    
  } catch (error) {
    console.error('Alert service error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

// Export handler and utility functions
module.exports = {
  handler,
  createTrafficAlert,
  sendOneSignalNotification,
  validateNotificationData,
  shouldSendNotification
};

exports.handler = handler;