
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3005';
const LOG_FILE = 'fix-issues.log';

// Logging functions
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function logError(message) {
  log(`❌ ERROR: ${message}`);
}

function logSuccess(message) {
  log(`✅ SUCCESS: ${message}`);
}

function logInfo(message) {
  log(`ℹ️  INFO: ${message}`);
}

// Clear log file
if (fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

log('🔧 TRAFFICAI ISSUE RESOLUTION SCRIPT');
log('======================================');

async function fixAuthenticationIssues() {
  log('\n🔐 FIXING AUTHENTICATION ISSUES');
  
  try {
    // Test login endpoint
    const loginResponse = await axios.post(`${BASE_URL}/api/settings/auth/login`, {
      username: 'testuser',
      password: 'testpass123'
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      logSuccess('Login endpoint working - JWT token generated');
      const token = loginResponse.data.token;
      
      // Test authenticated endpoints
      const headers = { Authorization: `Bearer ${token}` };
      
      // Test settings profile
      try {
        const profileResponse = await axios.get(`${BASE_URL}/api/settings/profile`, { headers });
        logSuccess('Settings profile endpoint working with JWT');
      } catch (error) {
        logError(`Settings profile failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
      
      // Test analytics with auth
      try {
        const analyticsResponse = await axios.get(`${BASE_URL}/api/analytics/overview`, { headers });
        logSuccess('Analytics endpoint working with JWT');
      } catch (error) {
        logError(`Analytics failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
      
    } else {
      logError('Login endpoint not returning valid token');
    }
    
  } catch (error) {
    logError(`Authentication test failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
  }
}

async function fixOptimizationEndpoint() {
  log('\n🛣️  FIXING OPTIMIZATION ENDPOINT');
  
  try {
    const optimizationData = {
      start: { lat: 28.6139, lon: 77.2090 },
      destination: { lat: 28.5355, lon: 77.3910 },
      vehicleType: 'car',
      priority: 'fastest'
    };
    
    const response = await axios.post(`${BASE_URL}/api/optimization/optimize`, optimizationData);
    
    if (response.status === 200) {
      logSuccess('Optimization endpoint working');
      logInfo(`Route distance: ${response.data.route?.distance || 'N/A'}`);
      logInfo(`Route duration: ${response.data.route?.duration || 'N/A'}`);
    } else {
      logError('Optimization endpoint returned non-200 status');
    }
    
  } catch (error) {
    logError(`Optimization failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    
    // Try alternative endpoint
    try {
      const altResponse = await axios.post(`${BASE_URL}/api/optimize`, optimizationData);
      if (altResponse.status === 200) {
        logSuccess('Alternative optimization endpoint working');
      }
    } catch (altError) {
      logError(`Alternative optimization also failed: ${altError.response?.status}`);
    }
  }
}

async function testAllEndpoints() {
  log('\n🔍 TESTING ALL CRITICAL ENDPOINTS');
  
  const endpoints = [
    { method: 'GET', url: '/api/health', name: 'Health Check' },
    { method: 'GET', url: '/api/dashboard/overview', name: 'Dashboard Overview' },
    { method: 'GET', url: '/api/weather/current?lat=28.6139&lng=77.2090', name: 'Weather Current' },
    { method: 'GET', url: '/api/traffic/live?lat=28.6139&lng=77.2090', name: 'Traffic Live' },
    { method: 'GET', url: '/api/incident/current?lat=28.6139&lng=77.2090', name: 'Incident Current' },
    { method: 'GET', url: '/api/analytics/overview', name: 'Analytics Overview' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios[endpoint.method.toLowerCase()](`${BASE_URL}${endpoint.url}`);
      if (response.status === 200) {
        logSuccess(`${endpoint.name}: Working`);
      } else {
        logError(`${endpoint.name}: Status ${response.status}`);
      }
    } catch (error) {
      logError(`${endpoint.name}: ${error.response?.status || 'Connection Error'} - ${error.response?.data?.error || error.message}`);
    }
  }
}

async function checkCORSHeaders() {
  log('\n🌐 CHECKING CORS HEADERS');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    const headers = response.headers;
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials'
    ];
    
    let corsCount = 0;
    corsHeaders.forEach(header => {
      if (headers[header]) {
        logSuccess(`CORS Header present: ${header}`);
        corsCount++;
      } else {
        logError(`CORS Header missing: ${header}`);
      }
    });
    
    logInfo(`CORS Headers: ${corsCount}/${corsHeaders.length} present`);
    
  } catch (error) {
    logError(`CORS check failed: ${error.message}`);
  }
}

async function main() {
  try {
    await fixAuthenticationIssues();
    await fixOptimizationEndpoint();
    await testAllEndpoints();
    await checkCORSHeaders();
    
    log('\n🎊 ISSUE RESOLUTION COMPLETE!');
    log('Check fix-issues.log for detailed results');
    
  } catch (error) {
    logError(`Main execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the fix script
main();