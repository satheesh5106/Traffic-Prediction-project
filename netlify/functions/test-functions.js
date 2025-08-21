// Simple test to verify Netlify functions are working
const { handler: trafficHandler } = require('./traffic-predictions');
const { handler: routeHandler } = require('./optimize-route');
const { handler: alertsHandler } = require('./send-alerts');

async function testFunctions() {
  console.log('Testing Netlify Functions...');
  
  // Test traffic predictions
  console.log('\n1. Testing traffic-predictions...');
  try {
    const trafficEvent = {
      httpMethod: 'GET',
      queryStringParameters: { city: 'delhi', count: '5' },
      headers: {}
    };
    const trafficResult = await trafficHandler(trafficEvent);
    console.log('Traffic Predictions Status:', trafficResult.statusCode);
    if (trafficResult.statusCode !== 200) {
      console.log('Error:', trafficResult.body);
    } else {
      console.log('✅ Traffic predictions working');
    }
  } catch (error) {
    console.log('❌ Traffic predictions error:', error.message);
  }
  
  // Test route optimization
  console.log('\n2. Testing optimize-route...');
  try {
    const routeEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({
        start: '28.6139,77.2090',
        destination: '28.5355,77.3910',
        vehicle: 'car',
        priority: 'time'
      }),
      headers: { 'content-type': 'application/json' }
    };
    const routeResult = await routeHandler(routeEvent);
    console.log('Route Optimization Status:', routeResult.statusCode);
    if (routeResult.statusCode !== 200) {
      console.log('Error:', routeResult.body);
    } else {
      console.log('✅ Route optimization working');
    }
  } catch (error) {
    console.log('❌ Route optimization error:', error.message);
  }
  
  // Test alerts
  console.log('\n3. Testing send-alerts...');
  try {
    const alertsEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({ 
        predictions: [{
          id: 'test-1',
          level: 'Congested',
          location: 'Test Road',
          confidence: 85
        }]
      }),
      headers: { 'content-type': 'application/json' }
    };
    const alertsResult = await alertsHandler(alertsEvent);
    console.log('Send Alerts Status:', alertsResult.statusCode);
    if (alertsResult.statusCode !== 200) {
      console.log('Error:', alertsResult.body);
    } else {
      console.log('✅ Send alerts working');
    }
  } catch (error) {
    console.log('❌ Send alerts error:', error.message);
  }
  
  console.log('\nFunction testing complete!');
}

testFunctions().catch(console.error);