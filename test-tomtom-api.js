const fetch = require('node-fetch');

async function testTomTomAPI() {
const TOMTOM_API_KEY = 'LPnygt3dMhUJGpHMLIMDJM92a25JMALE';
  const TOMTOM_BASE_URL = 'https://api.tomtom.com/traffic/services/4';
  
  // Test Delhi coordinates
  const lat = 28.6139;
  const lng = 77.2090;
  
  // Try different TomTom API endpoints
  const endpoints = [
    // Incident Details API v4
    `${TOMTOM_BASE_URL}/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${lng-0.1},${lat-0.1},${lng+0.1},${lat+0.1}&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14&timeValidityFilter=present`,
    // Flow Segment Data API
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${TOMTOM_API_KEY}`,
    // Incident Details with different format
    `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${lng-0.1},${lat-0.1},${lng+0.1},${lat+0.1}&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14&timeValidityFilter=present`
  ];
  
  for (let i = 0; i < endpoints.length; i++) {
    const tomtomUrl = endpoints[i];
    console.log(`\nTesting endpoint ${i + 1}:`, tomtomUrl);
    
    try {
      const response = await fetch(tomtomUrl);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));
        
        if (data.incidents) {
          console.log(`Found ${data.incidents.length} incidents`);
          data.incidents.forEach((incident, index) => {
            console.log(`Incident ${index + 1}:`, {
              id: incident.properties?.id,
              iconCategory: incident.properties?.iconCategory,
              magnitudeOfDelay: incident.properties?.magnitudeOfDelay,
              coordinates: incident.geometry?.coordinates,
              events: incident.properties?.events?.length || 0
            });
          });
          break; // Found working endpoint
        } else {
          console.log('No incidents found in response');
        }
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
      }
    } catch (error) {
      console.error('Request failed:', error.message);
    }
  }
}

testTomTomAPI();