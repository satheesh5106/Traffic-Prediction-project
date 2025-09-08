const axios = require('axios');
require('dotenv').config();

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_SEARCH_BASE = 'https://api.tomtom.com/search/2/geocode';
const TOMTOM_ROUTING_BASE = 'https://api.tomtom.com/routing/1/calculateRoute';

async function testTomTomSearch() {
  console.log('=== Testing TomTom Search API ===');
  console.log('API Key:', TOMTOM_API_KEY ? `${TOMTOM_API_KEY.substring(0, 10)}...` : 'NOT SET');
  
  try {
    const url = `${TOMTOM_SEARCH_BASE}/Delhi.json?key=${TOMTOM_API_KEY}&limit=1`;
    console.log('Search URL:', url);
    
    const response = await axios.get(url);
    console.log('✅ Search API Success');
    console.log('Results:', response.data.results?.length || 0);
    if (response.data.results?.[0]) {
      const result = response.data.results[0];
      console.log('Coordinates:', result.position);
      console.log('Address:', result.address.freeformAddress);
    }
  } catch (error) {
    console.error('❌ Search API Error:', error.response?.status, error.response?.data || error.message);
  }
}

async function testTomTomRouting() {
  console.log('\n=== Testing TomTom Routing API ===');
  
  try {
    // First get coordinates for Delhi and Mumbai
    const delhiUrl = `${TOMTOM_SEARCH_BASE}/Delhi.json?key=${TOMTOM_API_KEY}&limit=1`;
    const mumbaiUrl = `${TOMTOM_SEARCH_BASE}/Mumbai.json?key=${TOMTOM_API_KEY}&limit=1`;
    
    const [delhiResponse, mumbaiResponse] = await Promise.all([
      axios.get(delhiUrl),
      axios.get(mumbaiUrl)
    ]);
    
    const delhiCoords = delhiResponse.data.results[0].position;
    const mumbaiCoords = mumbaiResponse.data.results[0].position;
    
    console.log('Delhi coords:', delhiCoords);
    console.log('Mumbai coords:', mumbaiCoords);
    
    // Test different routing URL formats
    const routingUrls = [
      // Original format from our code
      `${TOMTOM_ROUTING_BASE}/${delhiCoords.lat},${delhiCoords.lon}:${mumbaiCoords.lat},${mumbaiCoords.lon}/json?key=${TOMTOM_API_KEY}&routeType=fastest&vehicleType=car&alternativeType=betterRoute&maxAlternatives=2&traffic=true&travelMode=car`,
      
      // Simplified format
      `${TOMTOM_ROUTING_BASE}/${delhiCoords.lat},${delhiCoords.lon}:${mumbaiCoords.lat},${mumbaiCoords.lon}/json?key=${TOMTOM_API_KEY}`,
      
      // Without some parameters
      `${TOMTOM_ROUTING_BASE}/${delhiCoords.lat},${delhiCoords.lon}:${mumbaiCoords.lat},${mumbaiCoords.lon}/json?key=${TOMTOM_API_KEY}&routeType=fastest&vehicleType=car`
    ];
    
    for (let i = 0; i < routingUrls.length; i++) {
      console.log(`\nTesting routing URL ${i + 1}:`);
      console.log(routingUrls[i]);
      
      try {
        const response = await axios.get(routingUrls[i]);
        console.log('✅ Routing API Success');
        console.log('Routes found:', response.data.routes?.length || 0);
        if (response.data.routes?.[0]) {
          const route = response.data.routes[0];
          console.log('Distance:', route.summary.lengthInMeters, 'meters');
          console.log('Time:', route.summary.travelTimeInSeconds, 'seconds');
        }
        break; // If successful, no need to test other URLs
      } catch (error) {
        console.error(`❌ Routing URL ${i + 1} Error:`, error.response?.status, error.response?.data || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Routing Test Setup Error:', error.message);
  }
}

async function runDebugTests() {
  console.log('🔍 Debugging TomTom API Integration...');
  await testTomTomSearch();
  await testTomTomRouting();
  console.log('\n🏁 Debug tests completed!');
}

runDebugTests().catch(console.error);