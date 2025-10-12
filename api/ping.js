/**
 * Simple Ping Endpoint for Basic Health Monitoring
 * Lightweight endpoint to check if the service is responsive
 */

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
    return;
  }
  
  try {
    const response = {
      status: 'ok',
      message: 'Service is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      region: process.env.VERCEL_REGION || 'unknown'
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Ping endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}