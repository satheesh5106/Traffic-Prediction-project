#!/usr/bin/env node

/**
 * TrafficAI Deployment Testing Script
 * Comprehensive testing for all Netlify functions and API endpoints
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const config = {
  // Change this to your deployed Netlify URL or use localhost for local testing
  baseUrl: process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions',
  timeout: 30000,
  retries: 3,
  // Test Firebase token (replace with actual token for authenticated tests)
  testToken: process.env.TEST_FIREBASE_TOKEN || 'test-token-for-local-testing'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TrafficAI-Test-Client/1.0',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test runner function
async function runTest(name, testFn) {
  results.total++;
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    
    results.passed++;
    results.details.push({ name, status: 'PASSED', duration });
    console.log(`✅ PASSED (${duration}ms)`);
  } catch (error) {
    results.failed++;
    results.details.push({ name, status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${error.message}`);
  }
}

// Individual test functions
async function testAuthMiddleware() {
  const response = await makeRequest(`${config.baseUrl}/auth-middleware`);
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
  
  if (!response.data || !response.data.message) {
    throw new Error('Invalid response format');
  }
}

async function testAuthMiddlewareHealth() {
  const response = await makeRequest(`${config.baseUrl}/auth-middleware?action=health`);
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
  
  if (!response.data || response.data.status !== 'healthy') {
    throw new Error('Health check failed');
  }
}

async function testTrafficPredictionLive() {
  const url = `${config.baseUrl}/traffic-prediction?action=live&lat=28.6139&lng=77.2090`;
  const response = await makeRequest(url, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testTrafficPredictionPredicted() {
  const url = `${config.baseUrl}/traffic-prediction?action=predicted&lat=28.6139&lng=77.2090&hours=2`;
  const response = await makeRequest(url, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testRouteOptimization() {
  const response = await makeRequest(`${config.baseUrl}/route-optimization`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.testToken}` },
    body: {
      action: 'optimize',
      start: [77.2090, 28.6139],
      end: [77.2310, 28.6289],
      vehicle: 'car',
      priority: 'fastest'
    }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testRouteOptimizationCities() {
  const response = await makeRequest(`${config.baseUrl}/route-optimization?action=cities`, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testAnalyticsMetrics() {
  const response = await makeRequest(`${config.baseUrl}/analytics?action=metrics&timeframe=24h`, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testDashboardData() {
  const response = await makeRequest(`${config.baseUrl}/dashboard-data?action=overview`, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testVisDataGeoJSON() {
  const url = `${config.baseUrl}/vis-data?action=geojson&type=traffic&bounds=77.1,28.5,77.3,28.7`;
  const response = await makeRequest(url, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testUserProfile() {
  const response = await makeRequest(`${config.baseUrl}/user-profile?action=profile`, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testUserProfileSection() {
  const response = await makeRequest(`${config.baseUrl}/user_profile_section?action=profile`, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

async function testSettings() {
  const response = await makeRequest(`${config.baseUrl}/settings?action=user`, {
    headers: { 'Authorization': `Bearer ${config.testToken}` }
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
}

// CORS test
async function testCORS() {
  const response = await makeRequest(`${config.baseUrl}/auth-middleware`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://example.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  });
  
  if (response.statusCode !== 200 && response.statusCode !== 204) {
    throw new Error(`CORS preflight failed with status ${response.statusCode}`);
  }
  
  const corsHeaders = response.headers['access-control-allow-origin'];
  if (!corsHeaders) {
    throw new Error('Missing CORS headers');
  }
}

// Performance test
async function testPerformance() {
  const startTime = Date.now();
  const promises = [];
  
  // Test 5 concurrent requests
  for (let i = 0; i < 5; i++) {
    promises.push(makeRequest(`${config.baseUrl}/auth-middleware?action=health`));
  }
  
  const responses = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  // All requests should succeed
  for (const response of responses) {
    if (response.statusCode !== 200) {
      throw new Error(`Concurrent request failed with status ${response.statusCode}`);
    }
  }
  
  // Should complete within reasonable time (10 seconds for 5 requests)
  if (duration > 10000) {
    throw new Error(`Performance test took too long: ${duration}ms`);
  }
  
  console.log(`   📊 5 concurrent requests completed in ${duration}ms`);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting TrafficAI Deployment Tests');
  console.log(`📍 Testing against: ${config.baseUrl}`);
  console.log('=' .repeat(60));

  // Basic function tests
  await runTest('Auth Middleware - Basic', testAuthMiddleware);
  await runTest('Auth Middleware - Health Check', testAuthMiddlewareHealth);
  await runTest('Traffic Prediction - Live Data', testTrafficPredictionLive);
  await runTest('Traffic Prediction - Predicted Data', testTrafficPredictionPredicted);
  await runTest('Route Optimization - Optimize Route', testRouteOptimization);
  await runTest('Route Optimization - Supported Cities', testRouteOptimizationCities);
  await runTest('Analytics - Metrics', testAnalyticsMetrics);
  await runTest('Dashboard Data - Overview', testDashboardData);
  await runTest('Visualization Data - GeoJSON', testVisDataGeoJSON);
  await runTest('User Profile - Get Profile', testUserProfile);
  await runTest('User Profile Section - Get Profile', testUserProfileSection);
  await runTest('Settings - User Settings', testSettings);
  
  // Infrastructure tests
  await runTest('CORS Configuration', testCORS);
  await runTest('Performance - Concurrent Requests', testPerformance);

  // Print results
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total:  ${results.total}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
  }
  
  if (results.passed > 0) {
    console.log('\n✅ PASSED TESTS:');
    results.details
      .filter(test => test.status === 'PASSED')
      .forEach(test => {
        console.log(`   • ${test.name} (${test.duration}ms)`);
      });
  }
  
  console.log('\n🏁 Testing completed!');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
TrafficAI Deployment Testing Script

Usage:
  node test-deployment.js [options]

Options:
  --help, -h          Show this help message
  --url <url>         Set base URL for testing (default: localhost:8888)
  --token <token>     Set Firebase test token

Environment Variables:
  NETLIFY_FUNCTIONS_URL    Base URL for Netlify functions
  TEST_FIREBASE_TOKEN      Firebase token for authenticated tests

Examples:
  # Test local development server
  node test-deployment.js
  
  # Test production deployment
  NETLIFY_FUNCTIONS_URL=https://your-site.netlify.app/.netlify/functions node test-deployment.js
  
  # Test with custom token
  TEST_FIREBASE_TOKEN=your-token node test-deployment.js
`);
  process.exit(0);
}

// Parse command line arguments
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  config.baseUrl = process.argv[urlIndex + 1];
}

const tokenIndex = process.argv.indexOf('--token');
if (tokenIndex !== -1 && process.argv[tokenIndex + 1]) {
  config.testToken = process.argv[tokenIndex + 1];
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test runner crashed:', error.message);
  process.exit(1);
});