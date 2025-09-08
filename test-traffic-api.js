#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3003';
const FRONTEND_URL = 'http://localhost:3001';

// Test credentials
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'traffic2025'
};

// Test locations
const TEST_LOCATIONS = [
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Bangalore', lat: 12.9716, lon: 77.5946 }
];

class TrafficAPITester {
  constructor() {
    this.authToken = null;
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating with backend...');
      const response = await axios.post(`${BACKEND_URL}/api/auth/token`, TEST_CREDENTIALS);
      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testHealthEndpoint() {
    try {
      console.log('\n🏥 Testing health endpoint...');
      const response = await axios.get(`${BACKEND_URL}/api/health`);
      console.log('✅ Health check passed:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testTrafficIncidentsEndpoint(location) {
    try {
      console.log(`\n🚦 Testing traffic incidents for ${location.name}...`);
      const url = `${BACKEND_URL}/api/traffic/incidents/location?lat=${location.lat}&lon=${location.lon}&limit=10`;
      const headers = { Authorization: `Bearer ${this.authToken}` };
      
      const response = await axios.get(url, { headers });
      const data = response.data;
      
      console.log(`✅ Traffic incidents API working for ${location.name}`);
      console.log(`   - Total incidents: ${data.metrics?.totalIncidents || 0}`);
      console.log(`   - Severity breakdown:`, data.metrics?.severityBreakdown || {});
      console.log(`   - Data source: ${data.source}`);
      console.log(`   - Cached: ${data.cached}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Traffic incidents test failed for ${location.name}:`, error.response?.data || error.message);
      return null;
    }
  }

  async testFrontendConnectivity() {
    try {
      console.log('\n🌐 Testing frontend connectivity...');
      const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
      console.log('✅ Frontend is accessible');
      return true;
    } catch (error) {
      console.error('❌ Frontend connectivity failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Traffic API Integration Tests\n');
    console.log('=' .repeat(50));
    
    // Test backend health
    const healthOk = await this.testHealthEndpoint();
    if (!healthOk) return;
    
    // Test authentication
    const authOk = await this.authenticate();
    if (!authOk) return;
    
    // Test traffic incidents for each location
    const results = [];
    for (const location of TEST_LOCATIONS) {
      const result = await this.testTrafficIncidentsEndpoint(location);
      results.push({ location: location.name, success: !!result, data: result });
    }
    
    // Test frontend connectivity
    await this.testFrontendConnectivity();
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const successfulTests = results.filter(r => r.success).length;
    console.log(`✅ Successful API tests: ${successfulTests}/${results.length}`);
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const incidents = result.data?.metrics?.totalIncidents || 0;
      console.log(`${status} ${result.location}: ${incidents} incidents found`);
    });
    
    if (successfulTests === results.length) {
      console.log('\n🎉 All tests passed! Traffic incidents integration is working.');
      console.log(`\n🔗 Frontend URL: ${FRONTEND_URL}`);
      console.log(`🔗 Backend URL: ${BACKEND_URL}`);
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new TrafficAPITester();
  tester.runAllTests().catch(console.error);
}

module.exports = TrafficAPITester;