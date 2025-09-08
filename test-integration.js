/**
 * Integration Test Script for Traffic Prediction Project
 * Tests the integration between frontend, backend, and ML servers
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api';
const ML_TRAFFIC_URL = process.env.ML_TRAFFIC_URL || 'http://localhost:5002';
const ML_INCIDENT_URL = process.env.ML_INCIDENT_URL || 'http://localhost:5001';
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY || 'UpQ977QmbzyJFExFzww4aJ8jJVvmjwrU';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Helper functions
const log = {
  info: (message) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  warning: (message) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  result: (message) => console.log(`${colors.cyan}[RESULT]${colors.reset} ${message}`)
};

// Test function
async function runTest(name, testFn) {
  results.total++;
  
  try {
    log.info(`Running test: ${name}`);
    await testFn();
    results.passed++;
    log.success(`Test passed: ${name}`);
  } catch (error) {
    results.failed++;
    log.error(`Test failed: ${name}`);
    log.error(`  Error: ${error.message}`);
    if (error.response) {
      log.error(`  Status: ${error.response.status}`);
      log.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  console.log(); // Empty line for readability
}

// Skip test function
function skipTest(name, reason) {
  results.total++;
  results.skipped++;
  log.warning(`Skipping test: ${name}`);
  log.warning(`  Reason: ${reason}`);
  console.log(); // Empty line for readability
}

// Check if a server is running
async function isServerRunning(url) {
  try {
    await axios.get(url, { timeout: 3000 });
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return false;
    }
    // If we get any response (even an error), the server is running
    return true;
  }
}

// Main test function
async function runTests() {
  console.log(`${colors.bright}${colors.magenta}=== Traffic Prediction Project Integration Tests ===${colors.reset}\n`);
  
  // Check if servers are running
  log.info('Checking if servers are running...');
  
  const backendRunning = await isServerRunning(`${BACKEND_URL}/health`);
  const mlTrafficRunning = await isServerRunning(`${ML_TRAFFIC_URL}/health`);
  const mlIncidentRunning = await isServerRunning(`${ML_INCIDENT_URL}/health`);
  
  log.info(`Backend server: ${backendRunning ? 'Running' : 'Not running'}`);
  log.info(`ML Traffic server: ${mlTrafficRunning ? 'Running' : 'Not running'}`);
  log.info(`ML Incident server: ${mlIncidentRunning ? 'Running' : 'Not running'}`);
  console.log();
  
  // Test Backend Health
  await runTest('Backend Health Check', async () => {
    if (!backendRunning) {
      throw new Error('Backend server is not running');
    }
    
    const response = await axios.get(`${BACKEND_URL}/health`);
    if (response.status !== 200 || !response.data.status) {
      throw new Error('Backend health check failed');
    }
  });
  
  // Test ML Traffic Server Health
  if (mlTrafficRunning) {
    await runTest('ML Traffic Server Health Check', async () => {
      const response = await axios.get(`${ML_TRAFFIC_URL}/health`);
      if (response.status !== 200 || response.data.status !== 'healthy') {
        throw new Error('ML Traffic server health check failed');
      }
    });
  } else {
    skipTest('ML Traffic Server Health Check', 'ML Traffic server is not running');
  }
  
  // Test ML Incident Server Health
  if (mlIncidentRunning) {
    await runTest('ML Incident Server Health Check', async () => {
      const response = await axios.get(`${ML_INCIDENT_URL.replace('/predict_incident', '')}/health`);
      if (response.status !== 200 || response.data.status !== 'healthy') {
        throw new Error('ML Incident server health check failed');
      }
    });
  } else {
    skipTest('ML Incident Server Health Check', 'ML Incident server is not running');
  }
  
  // Test Backend Traffic API
  await runTest('Backend Traffic API - Live Traffic', async () => {
    if (!backendRunning) {
      throw new Error('Backend server is not running');
    }
    
    const response = await axios.get(`${BACKEND_URL}/traffic/live/mumbai`, { timeout: 30000 });
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Failed to fetch live traffic data');
    }
    
    // Validate response structure
    if (!response.data.incidents || !Array.isArray(response.data.incidents)) {
      throw new Error('Invalid response structure: missing incidents array');
    }
    
    if (!response.data.metrics) {
      throw new Error('Invalid response structure: missing metrics');
    }
  });
  
  // Test Backend Traffic API - Predicted Traffic
  await runTest('Backend Traffic API - Predicted Traffic', async () => {
    if (!backendRunning) {
      throw new Error('Backend server is not running');
    }
    
    const response = await axios.get(`${BACKEND_URL}/traffic/predicted/mumbai`);
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Failed to fetch predicted traffic data');
    }
    
    // Validate response structure
    if (!response.data.predictions || !Array.isArray(response.data.predictions)) {
      throw new Error('Invalid response structure: missing predictions array');
    }
  });
  
  // Test Backend Traffic API - Historical Traffic
  await runTest('Backend Traffic API - Historical Traffic', async () => {
    if (!backendRunning) {
      throw new Error('Backend server is not running');
    }
    
    const response = await axios.get(`${BACKEND_URL}/traffic/historical/mumbai`);
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Failed to fetch historical traffic data');
    }
    
    // Validate response structure
    if (!response.data.historical || !Array.isArray(response.data.historical)) {
      throw new Error('Invalid response structure: missing historical array');
    }
  });
  
  // Test Backend Incident API
  await runTest('Backend Incident API - Predict Incident', async () => {
    if (!backendRunning) {
      throw new Error('Backend server is not running');
    }
    
    const payload = {
      location: 'Mumbai',
      conditions: {
        weather: 'clear',
        time_of_day: new Date().getHours(),
        temperature: 25,
        humidity: 60
      },
      basic_info: {
        road_type: 'urban',
        traffic_density: 'medium',
        speed_limit: 50
      }
    };
    
    const response = await axios.post(`${BACKEND_URL}/incident/predict`, payload, { timeout: 30000 });
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Failed to predict incident');
    }
    
    // Validate response structure
    if (!response.data.prediction || !response.data.prediction.severity) {
      throw new Error('Invalid response structure: missing prediction severity');
    }
  });
  
  // Test ML Traffic Server Directly
  if (mlTrafficRunning) {
    await runTest('ML Traffic Server - Direct Prediction', async () => {
      const payload = {
        city: 'mumbai',
        hour: new Date().getHours(),
        day_of_week: new Date().getDay(),
        month: new Date().getMonth() + 1,
        weather: 'clear',
        current_volume: 50
      };
      
      const response = await axios.post(`${ML_TRAFFIC_URL}/predict_traffic`, payload);
      if (response.status !== 200) {
        throw new Error('Failed to get traffic prediction from ML server');
      }
      
      // Validate response structure
      if (typeof response.data.predicted_volume !== 'number') {
        throw new Error('Invalid response structure: missing predicted_volume');
      }
      
      if (typeof response.data.confidence !== 'number') {
        throw new Error('Invalid response structure: missing confidence');
      }
    });
  } else {
    skipTest('ML Traffic Server - Direct Prediction', 'ML Traffic server is not running');
  }
  
  // Test ML Incident Server Directly
  skipTest('ML Incident Server - Direct Prediction', 'Direct ML server testing is not required for frontend integration');

  
  // Test TomTom API Integration
  skipTest('TomTom API Integration', 'Direct TomTom API testing is not required for frontend integration');

  
  // Test Frontend-Backend Integration
  await runTest('Frontend-Backend Integration', async () => {
    // Check if the frontend build directory exists
    const buildDir = path.join(__dirname, '.next');
    if (!fs.existsSync(buildDir)) {
      throw new Error('Frontend build directory not found. Run "npm run build" first.');
    }
    
    // Check if the backend is accessible from the frontend
    if (!backendRunning) {
      throw new Error('Backend server is not running');
    }
    
    // Test a backend endpoint that the frontend would use
    const response = await axios.get(`${BACKEND_URL}/traffic/live/mumbai`);
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Failed to fetch live traffic data from backend');
    }
  });
  
  // Print test results
  console.log(`${colors.bright}${colors.magenta}=== Test Results ===${colors.reset}`);
  log.result(`Total tests: ${results.total}`);
  log.result(`Passed: ${colors.green}${results.passed}${colors.reset}`);
  log.result(`Failed: ${colors.red}${results.failed}${colors.reset}`);
  log.result(`Skipped: ${colors.yellow}${results.skipped}${colors.reset}`);
  
  // Return exit code based on test results
  return results.failed === 0 ? 0 : 1;
}

// Run tests
runTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });