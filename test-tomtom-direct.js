const axios = require('axios');

// TomTom API configuration
const TOMTOM_API_KEY = 'UpQ977QmbzyJFExFzww4aJ8jJVvmjwrU';
const TOMTOM_INCIDENTS_BASE = 'https://api.tomtom.com/traffic/services/5';

// Delhi coordinates
const delhiBounds = '76.8,28.4,77.4,29.0'; // minLon,minLat,maxLon,maxLat

async function testTomTomAPI() {
  try {
    console.log('Testing TomTom Traffic Incidents API...');
    console.log('API Key:', TOMTOM_API_KEY);
    console.log('Delhi bounds:', delhiBounds);
    
    const url = `${TOMTOM_INCIDENTS_BASE}/incidentDetails`;
    console.log('Request URL:', url);
    
    const params = {
      key: TOMTOM_API_KEY,
      bbox: delhiBounds,
      fields: '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}}',
      language: 'en-US',
      categoryFilter: '0,1,2,3,4,5,6,7,8,9,10,11,14'
    };
    
    console.log('Request params:', JSON.stringify(params, null, 2));
    
    const response = await axios.get(url, {
      params,
      timeout: 15000
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.incidents) {
      console.log(`Found ${response.data.incidents.length} incidents`);
    } else {
      console.log('No incidents found in response');
    }
    
  } catch (error) {
    console.error('Error testing TomTom API:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Full error:', error);
  }
}

testTomTomAPI();