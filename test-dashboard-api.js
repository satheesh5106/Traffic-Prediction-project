const axios = require('axios');

// Same configuration as in TrafficPredictionDashboard.tsx
const TOMTOM_API_KEY = 'qdWLPZiDyThFboTlpIkly3dALLUTXIug';

// Egmore and Koyambedu coordinates (approximate)
const egmoreCoords = { lat: 13.0827, lng: 80.2707 };
const koyambeduCoords = { lat: 13.0732, lng: 80.1963 };

async function testDashboardAPI() {
  try {
    console.log('=== Testing Dashboard API Call for Egmore → Koyambedu ===');
    console.log('From:', egmoreCoords);
    console.log('To:', koyambeduCoords);
    
    // Calculate bounding box exactly as the dashboard does
    const padding = 0.02; // Same padding as in dashboard
    const minLat = Math.min(egmoreCoords.lat, koyambeduCoords.lat) - padding;
    const maxLat = Math.max(egmoreCoords.lat, koyambeduCoords.lat) + padding;
    const minLng = Math.min(egmoreCoords.lng, koyambeduCoords.lng) - padding;
    const maxLng = Math.max(egmoreCoords.lng, koyambeduCoords.lng) + padding;
    
    console.log('\nBounding Box:');
    console.log(`minLat: ${minLat}, maxLat: ${maxLat}`);
    console.log(`minLng: ${minLng}, maxLng: ${maxLng}`);
    console.log(`bbox: ${minLng},${minLat},${maxLng},${maxLat}`);
    
    // Construct the exact URL as in the dashboard
    const incidentUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${minLng},${minLat},${maxLng},${maxLat}&fields=incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events,startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}&language=en-US&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14&timeValidityFilter=present&originalPosition=true`;
    
    console.log('\n=== API Request ===');
    console.log('URL:', incidentUrl);
    
    console.log('\nMaking request...');
    const response = await fetch(incidentUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n=== Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('OK:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('\n=== Response Data ===');
    console.log('Response structure:', Object.keys(data));
    
    if (data.incidents) {
      console.log(`✅ Found ${data.incidents.length} incidents`);
      
      if (data.incidents.length > 0) {
        console.log('\n=== First 3 Incidents ===');
        data.incidents.slice(0, 3).forEach((incident, index) => {
          console.log(`\nIncident ${index + 1}:`);
          console.log('- Type:', incident.type);
          console.log('- Properties:', incident.properties);
          console.log('- Geometry:', incident.geometry);
        });
      } else {
        console.log('\n❌ No incidents found in the response');
      }
    } else {
      console.log('\n❌ No incidents property in response');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
    // Test the transformTomTomData logic
    console.log('\n=== Testing Data Transformation ===');
    if (data.incidents && data.incidents.length > 0) {
      const sampleIncident = data.incidents[0];
      console.log('Sample incident for transformation:', JSON.stringify(sampleIncident, null, 2));
      
      // Simulate the transformation logic
      if (sampleIncident.properties && sampleIncident.geometry) {
        const coords = sampleIncident.geometry.coordinates;
        if (coords && coords.length > 0) {
          const firstCoord = Array.isArray(coords[0]) ? coords[0] : coords;
          console.log('Extracted coordinates:', firstCoord);
        }
      }
    }
    
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }
}

testDashboardAPI();