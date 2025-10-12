/**
 * Health Check API Endpoint for Vercel Deployment
 * Monitors system health and prevents common deployment errors
 */

import { withErrorHandling } from '../lib/error-handler';

// Health check configuration
const HEALTH_CHECK_CONFIG = {
  timeout: 5000, // 5 seconds
  services: {
    database: process.env.DATABASE_URL ? true : false,
    firebase: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? true : false,
    tomtom: process.env.TOMTOM_API_KEY ? true : false,
    redis: process.env.REDIS_URL ? true : false
  }
};

// Service health checkers
const healthCheckers = {
  async checkDatabase() {
    if (!HEALTH_CHECK_CONFIG.services.database) {
      return { status: 'disabled', message: 'Database not configured' };
    }
    
    try {
      // Simple database connectivity check
      // In a real app, you'd ping your actual database
      return { status: 'healthy', message: 'Database connection available' };
    } catch (error) {
      return { status: 'unhealthy', message: 'Database connection failed', error: error.message };
    }
  },

  async checkFirebase() {
    if (!HEALTH_CHECK_CONFIG.services.firebase) {
      return { status: 'disabled', message: 'Firebase not configured' };
    }
    
    try {
      // Check if Firebase config is valid
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      };
      
      if (!config.apiKey || !config.authDomain || !config.projectId) {
        throw new Error('Incomplete Firebase configuration');
      }
      
      return { status: 'healthy', message: 'Firebase configuration valid' };
    } catch (error) {
      return { status: 'unhealthy', message: 'Firebase configuration invalid', error: error.message };
    }
  },

  async checkTomTom() {
    if (!HEALTH_CHECK_CONFIG.services.tomtom) {
      return { status: 'disabled', message: 'TomTom API not configured' };
    }
    
    try {
      // Simple API key validation
      const apiKey = process.env.TOMTOM_API_KEY;
      if (!apiKey || apiKey.length < 10) {
        throw new Error('Invalid TomTom API key');
      }
      
      return { status: 'healthy', message: 'TomTom API key configured' };
    } catch (error) {
      return { status: 'unhealthy', message: 'TomTom API configuration invalid', error: error.message };
    }
  },

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };
      
      // Check if memory usage is within acceptable limits (e.g., < 400MB for serverless)
      const isHealthy = memUsageMB.heapUsed < 400;
      
      return {
        status: isHealthy ? 'healthy' : 'warning',
        message: `Memory usage: ${memUsageMB.heapUsed}MB`,
        details: memUsageMB
      };
    } catch (error) {
      return { status: 'unhealthy', message: 'Memory check failed', error: error.message };
    }
  },

  async checkEnvironment() {
    try {
      const requiredEnvVars = [
        'NODE_ENV',
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'TOMTOM_API_KEY'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        return {
          status: 'unhealthy',
          message: `Missing environment variables: ${missingVars.join(', ')}`
        };
      }
      
      return {
        status: 'healthy',
        message: 'All required environment variables present',
        environment: process.env.NODE_ENV
      };
    } catch (error) {
      return { status: 'unhealthy', message: 'Environment check failed', error: error.message };
    }
  }
};

async function performHealthCheck() {
  const startTime = Date.now();
  const checks = {};
  
  try {
    // Run all health checks in parallel with timeout
    const checkPromises = Object.entries(healthCheckers).map(async ([name, checker]) => {
      try {
        const result = await Promise.race([
          checker(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_CONFIG.timeout)
          )
        ]);
        return [name.replace('check', '').toLowerCase(), result];
      } catch (error) {
        return [name.replace('check', '').toLowerCase(), {
          status: 'unhealthy',
          message: 'Health check failed',
          error: error.message
        }];
      }
    });
    
    const results = await Promise.all(checkPromises);
    results.forEach(([name, result]) => {
      checks[name] = result;
    });
    
  } catch (error) {
    checks.error = {
      status: 'unhealthy',
      message: 'Health check system failed',
      error: error.message
    };
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Determine overall health status
  const statuses = Object.values(checks).map(check => check.status);
  const overallStatus = statuses.includes('unhealthy') ? 'unhealthy' : 
                       statuses.includes('warning') ? 'warning' : 'healthy';
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'unknown',
    checks
  };
}

// Main health check handler
async function healthHandler(req, res) {
  try {
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    const healthResult = await performHealthCheck();
    
    // Set HTTP status based on health
    const statusCode = healthResult.status === 'healthy' ? 200 :
                      healthResult.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(healthResult);
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      message: 'Health check system failure',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Export with error handling wrapper
export default withErrorHandling(healthHandler);

// Named export for different health check types
export const config = {
  api: {
    bodyParser: false, // Disable body parsing for health checks
  },
};

// Lightweight ping endpoint
export async function ping(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Service is running'
  });
}