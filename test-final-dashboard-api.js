const axios = require('axios');

// Test the final fixed TomTom API call for Chennai route (Egmore to Koyambedu)
const TOMTOM_API_KEY = 'LPnygt3dMhUJGpHMLIMDJM92a25JMALE';

// Chennai coordinates for Egmore to Koyambedu route
const fromLocation = { lat: 13.0732, lng: 80.2609 }; // Egmore
const toLocation = { lat: 13.0732, lng: 80.1986 }; // Koyambedu

// Calculate bounding box with padding
const padding = 0.01;
const minLat = Math.min(fromLocation.lat, toLocation.lat) - padding;
const maxLat = Math.max(fromLocation.lat, toLocation.lat) + padding;
const minLng = Math.min(fromLocation.lng, toLocation.lng) - padding;
const maxLng = Math.max(fromLocation.lng, toLocation.lng) + padding;

console.log('Testing final fixed TomTom API call for Chennai route...');
console.log(`Bounding box: ${minLng},${minLat},${maxLng},${maxLat}`);

// Final fixed URL with proper events field structure
const incidentUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${minLng},${minLat},${maxLng},${maxLat}&fields={incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}}&language=en-US&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14&timeValidityFilter=present&originalPosition=true`;

console.log('API URL:', incidentUrl);

async function testFinalAPI() {
  try {
    const response = await axios.get(incidentUrl);
    
    console.log('\n=== API Response Status ===');
    console.log('Status:', response.status, response.statusText);
    
    if (response.data && response.data.incidents) {
      console.log('\n=== Incidents Found ===');
      console.log('Total incidents:', response.data.incidents.length);
      
      if (response.data.incidents.length > 0) {
        console.log('\n=== Sample Incident ===');
        const sampleIncident = response.data.incidents[0];
        console.log('ID:', sampleIncident.properties?.id);
        console.log('Icon Category:', sampleIncident.properties?.iconCategory);
        console.log('Magnitude of Delay:', sampleIncident.properties?.magnitudeOfDelay);
        console.log('Start Time:', sampleIncident.properties?.startTime);
        console.log('End Time:', sampleIncident.properties?.endTime);
        console.log('From:', sampleIncident.properties?.from);
        console.log('To:', sampleIncident.properties?.to);
        console.log('Length:', sampleIncident.properties?.length);
        console.log('Delay:', sampleIncident.properties?.delay);
        console.log('Road Numbers:', sampleIncident.properties?.roadNumbers);
        console.log('Coordinates:', sampleIncident.geometry?.coordinates);
        
        if (sampleIncident.properties?.events && sampleIncident.properties.events.length > 0) {
          console.log('\n=== Events ===');
          sampleIncident.properties.events.forEach((event, index) => {
            console.log(`Event ${index + 1}:`);
            console.log('  Description:', event.description);
            console.log('  Code:', event.code);
            console.log('  Icon Category:', event.iconCategory);
          });
        }
        
        console.log('\n=== SUCCESS: API is now working correctly! ===');
      } else {
        console.log('\n=== No incidents found for this specific route ===');
        console.log('This could be normal if there are no current incidents in the area.');
      }
    } else {
      console.log('\n=== No Incidents Data ===');
      console.log('Response structure:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n=== API Error ===');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testFinalAPI();