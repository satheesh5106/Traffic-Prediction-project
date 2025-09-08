// Debug script to test dashboard API calls
const fetch = require('node-fetch');

async function testDashboardAPI() {
  try {
    console.log('Testing TomTom API v5 structure...');
    
    // Test TomTom API v5
    const tomtomUrl = 'https://api.tomtom.com/traffic/services/5/incidentDetails?key=qdWLPZiDyThFboTlpIkly3dALLUTXIug&bbox=77.0025,28.6041,77.2025,28.8041&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14&timeValidityFilter=present';
    
    console.log('\n1. Testing TomTom API v5:');
    const tomtomResponse = await fetch(tomtomUrl);
    const tomtomData = await tomtomResponse.json();
    console.log('TomTom Response Status:', tomtomResponse.status);
    console.log('TomTom Incidents Count:', tomtomData.incidents ? tomtomData.incidents.length : 0);
    
    if (tomtomData.incidents && tomtomData.incidents.length > 0) {
      console.log('\nFirst incident full structure:');
      console.log(JSON.stringify(tomtomData.incidents[0], null, 2));
      
      console.log('\nSecond incident full structure:');
      if (tomtomData.incidents[1]) {
        console.log(JSON.stringify(tomtomData.incidents[1], null, 2));
      }
      
      console.log('\nIncident properties analysis:');
      tomtomData.incidents.slice(0, 5).forEach((incident, index) => {
        console.log(`Incident ${index + 1}:`, {
          hasProperties: !!incident.properties,
          hasIconCategory: !!incident.iconCategory,
          hasGeometry: !!incident.geometry,
          hasCoordinates: !!incident.coordinates,
          hasEvents: !!incident.events,
          propertiesKeys: incident.properties ? Object.keys(incident.properties) : [],
          topLevelKeys: Object.keys(incident)
        });
      });
    }
    
  } catch (error) {
    console.error('Error testing APIs:', error.message);
  }
}

testDashboardAPI();