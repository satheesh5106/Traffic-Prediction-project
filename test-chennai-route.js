const axios = require('axios');

// TomTom API configuration
const TOMTOM_API_KEY = 'UpQ977QmbzyJFExFzww4aJ8jJVvmjwrU';
const TOMTOM_INCIDENTS_BASE = 'https://api.tomtom.com/traffic/services/5';

// Chennai coordinates for Egmore to Koyambedu route
// Egmore: approximately 13.0827, 80.2707
// Koyambedu: approximately 13.0732, 80.1963
// Creating a bounding box that covers both locations
const chennaiBounds = '80.19,13.07,80.28,13.09'; // minLon,minLat,maxLon,maxLat

async function testChennaiRoute() {
  try {
    console.log('=== Testing TomTom API for Chennai Route (Egmore to Koyambedu) ===');
    console.log('API Key:', TOMTOM_API_KEY);
    console.log('Chennai bounds:', chennaiBounds);
    console.log('Route: Egmore → Koyambedu');
    
    const url = `${TOMTOM_INCIDENTS_BASE}/incidentDetails`;
    console.log('Request URL:', url);
    
    const params = {
      key: TOMTOM_API_KEY,
      bbox: chennaiBounds,
      fields: '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}}',
      language: 'en-US',
      categoryFilter: '0,1,2,3,4,5,6,7,8,9,10,11,14'
    };
    
    console.log('\nRequest params:');
    console.log('- bbox:', params.bbox);
    console.log('- categoryFilter:', params.categoryFilter);
    console.log('- fields:', params.fields);
    
    console.log('\nMaking API request...');
    const response = await axios.get(url, {
      params,
      timeout: 15000
    });
    
    console.log('\n=== API Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.data) {
      console.log('\n=== Response Data Structure ===');
      console.log('Response keys:', Object.keys(response.data));
      
      if (response.data.incidents) {
        console.log(`\n✅ Found ${response.data.incidents.length} incidents`);
        
        if (response.data.incidents.length > 0) {
          console.log('\n=== Sample Incident Details ===');
          const firstIncident = response.data.incidents[0];
          console.log('First incident:', JSON.stringify(firstIncident, null, 2));
        }
      } else {
        console.log('\n❌ No incidents array found in response');
        console.log('Full response:', JSON.stringify(response.data, null, 2));
      }
    } else {
      console.log('\n❌ No response data received');
    }
    
  } catch (error) {
    console.error('\n=== ERROR TESTING TOMTOM API ===');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response status text:', error.response.statusText);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Request details:');
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    console.error('\nFull error object:', error);
  }
}

// Also test with a wider Chennai area
async function testWiderChennaiArea() {
  try {
    console.log('\n\n=== Testing Wider Chennai Area ===');
    const widerBounds = '80.1,13.0,80.3,13.15'; // Wider area around Chennai
    console.log('Wider Chennai bounds:', widerBounds);
    
    const url = `${TOMTOM_INCIDENTS_BASE}/incidentDetails`;
    const params = {
      key: TOMTOM_API_KEY,
      bbox: widerBounds,
      fields: '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory}}}}',
      language: 'en-US',
      categoryFilter: '0,1,2,3,4,5,6,7,8,9,10,11,14'
    };
    
    const response = await axios.get(url, { params, timeout: 15000 });
    
    console.log('Wider area response status:', response.status);
    if (response.data && response.data.incidents) {
      console.log(`Found ${response.data.incidents.length} incidents in wider Chennai area`);
    } else {
      console.log('No incidents found in wider Chennai area');
    }
    
  } catch (error) {
    console.error('Error testing wider Chennai area:', error.message);
  }
}

async function runAllTests() {
  await testChennaiRoute();
  await testWiderChennaiArea();
}

runAllTests();