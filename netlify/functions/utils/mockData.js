// Mock data generators for TrafficAI development and testing

const { v4: uuidv4 } = require('uuid');

// Indian cities and major routes for realistic mock data
const INDIAN_LOCATIONS = {
  delhi: {
    name: 'Delhi',
    center: [28.6139, 77.2090],
    routes: [
      'Ring Road', 'Outer Ring Road', 'NH-1 (GT Road)', 'NH-8 (Delhi-Gurgaon)', 
      'Yamuna Expressway', 'DND Flyway', 'Noida Link Road', 'MG Road'
    ]
  },
  mumbai: {
    name: 'Mumbai',
    center: [19.0760, 72.8777],
    routes: [
      'Western Express Highway', 'Eastern Express Highway', 'SV Road', 
      'LBS Road', 'Bandra-Worli Sea Link', 'Mumbai-Pune Expressway', 'NH-3'
    ]
  },
  bangalore: {
    name: 'Bangalore',
    center: [12.9716, 77.5946],
    routes: [
      'Outer Ring Road', 'Hosur Road', 'Bannerghatta Road', 'Electronic City Flyover',
      'Hebbal Flyover', 'Silk Board Junction', 'NH-7', 'NICE Road'
    ]
  },
  chennai: {
    name: 'Chennai',
    center: [13.0827, 80.2707],
    routes: [
      'OMR (Old Mahabalipuram Road)', 'GST Road', 'Anna Salai', 'ECR (East Coast Road)',
      'Poonamallee High Road', 'NH-5', 'Inner Ring Road', 'Rajiv Gandhi Salai'
    ]
  },
  hyderabad: {
    name: 'Hyderabad',
    center: [17.3850, 78.4867],
    routes: [
      'Outer Ring Road', 'NH-65', 'Rajiv Rahadari', 'PVNR Expressway',
      'Nehru Outer Ring Road', 'Shamshabad Airport Road', 'Cyberabad IT Corridor'
    ]
  }
};

// Traffic levels with realistic Indian traffic patterns
const TRAFFIC_LEVELS = {
  light: { name: 'Light', severity: 1, color: '#22c55e', speedFactor: 0.9 },
  moderate: { name: 'Moderate', severity: 2, color: '#eab308', speedFactor: 0.7 },
  heavy: { name: 'Heavy', severity: 3, color: '#f97316', speedFactor: 0.5 },
  congested: { name: 'Congested', severity: 4, color: '#ef4444', speedFactor: 0.3 },
  blocked: { name: 'Blocked', severity: 5, color: '#991b1b', speedFactor: 0.1 }
};

// Vehicle types for route optimization
const VEHICLE_TYPES = {
  car: { name: 'Car', fuelEfficiency: 15, avgSpeed: 40 },
  bike: { name: 'Motorcycle', fuelEfficiency: 45, avgSpeed: 35 },
  truck: { name: 'Truck', fuelEfficiency: 8, avgSpeed: 30 },
  bus: { name: 'Bus', fuelEfficiency: 6, avgSpeed: 25 },
  auto: { name: 'Auto Rickshaw', fuelEfficiency: 25, avgSpeed: 20 }
};

// Generate realistic traffic predictions
function generateTrafficPredictions(count = 10, city = 'delhi') {
  const location = INDIAN_LOCATIONS[city] || INDIAN_LOCATIONS.delhi;
  const predictions = [];
  
  for (let i = 0; i < count; i++) {
    const route = location.routes[Math.floor(Math.random() * location.routes.length)];
    const trafficLevel = getRandomTrafficLevel();
    const confidence = generateHighConfidence(); // Ensure 99%+ accuracy
    
    // Generate coordinates near the city center
    const lat = location.center[0] + (Math.random() - 0.5) * 0.2;
    const lng = location.center[1] + (Math.random() - 0.5) * 0.2;
    
    predictions.push({
      id: uuidv4(),
      location: route,
      coordinates: [lat, lng],
      level: trafficLevel.name,
      severity: trafficLevel.severity,
      confidence: confidence,
      eta: calculateETA(trafficLevel.severity),
      timestamp: new Date().toISOString(),
      details: {
        avgSpeed: Math.round(50 * trafficLevel.speedFactor),
        vehicleCount: Math.round(Math.random() * 500 + 100),
        incidents: generateIncidents(trafficLevel.severity),
        weather: generateWeatherImpact(),
        color: trafficLevel.color
      }
    });
  }
  
  return predictions;
}

// Generate high confidence scores (99%+ accuracy simulation)
function generateHighConfidence() {
  // Weighted random to ensure most predictions are 90%+
  const weights = [0.05, 0.1, 0.15, 0.3, 0.4]; // 5%, 10%, 15%, 30%, 40%
  const ranges = [[85, 89], [90, 92], [93, 95], [96, 98], [99, 100]];
  
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      const [min, max] = ranges[i];
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }
  
  return 99; // Fallback to high confidence
}

// Get random traffic level with realistic distribution
function getRandomTrafficLevel() {
  const hour = new Date().getHours();
  const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  const isWeekend = [0, 6].includes(new Date().getDay());
  
  let weights;
  if (isRushHour && !isWeekend) {
    weights = [0.1, 0.2, 0.4, 0.25, 0.05]; // More heavy traffic during rush hours
  } else if (isWeekend) {
    weights = [0.4, 0.35, 0.2, 0.05, 0.0]; // Lighter traffic on weekends
  } else {
    weights = [0.3, 0.4, 0.25, 0.05, 0.0]; // Normal distribution
  }
  
  const levels = Object.values(TRAFFIC_LEVELS);
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return levels[i];
    }
  }
  
  return levels[0]; // Fallback to light traffic
}

// Calculate ETA based on traffic severity
function calculateETA(severity) {
  const baseTime = Math.random() * 20 + 5; // 5-25 minutes base
  const multiplier = [1, 1.2, 1.5, 2.0, 3.0][severity - 1] || 1;
  return Math.round(baseTime * multiplier);
}

// Generate incident data
function generateIncidents(severity) {
  const incidentTypes = [
    'Road construction', 'Vehicle breakdown', 'Accident', 'Heavy rainfall',
    'Festival crowd', 'VIP movement', 'Waterlogging', 'Protest/Rally'
  ];
  
  const incidentCount = severity > 3 ? Math.floor(Math.random() * 3) + 1 : 0;
  const incidents = [];
  
  for (let i = 0; i < incidentCount; i++) {
    incidents.push({
      type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
      severity: Math.min(severity + Math.floor(Math.random() * 2), 5),
      duration: Math.round(Math.random() * 120 + 30) // 30-150 minutes
    });
  }
  
  return incidents;
}

// Generate weather impact
function generateWeatherImpact() {
  const conditions = [
    { type: 'Clear', impact: 0, visibility: 'Good' },
    { type: 'Light Rain', impact: 1, visibility: 'Moderate' },
    { type: 'Heavy Rain', impact: 3, visibility: 'Poor' },
    { type: 'Fog', impact: 2, visibility: 'Very Poor' },
    { type: 'Dust Storm', impact: 4, visibility: 'Extremely Poor' }
  ];
  
  return conditions[Math.floor(Math.random() * conditions.length)];
}

// Generate route optimization options
function generateRouteOptions(start, destination, vehicle = 'car') {
  const vehicleData = VEHICLE_TYPES[vehicle] || VEHICLE_TYPES.car;
  const baseDistance = Math.random() * 20 + 5; // 5-25 km
  const baseTime = baseDistance / vehicleData.avgSpeed * 60; // minutes
  
  return [
    {
      type: 'Fastest',
      traffic: 'Moderate',
      time: Math.round(baseTime * 0.9),
      distance: Math.round(baseDistance * 1.1),
      fuel: calculateFuelConsumption(baseDistance * 1.1, vehicleData.fuelEfficiency),
      route: generateRouteGeometry(start, destination),
      highlights: ['Expressway route', 'Minimal traffic lights'],
      tolls: Math.round(Math.random() * 100 + 20)
    },
    {
      type: 'Shortest',
      traffic: 'Heavy',
      time: Math.round(baseTime * 1.2),
      distance: Math.round(baseDistance * 0.8),
      fuel: calculateFuelConsumption(baseDistance * 0.8, vehicleData.fuelEfficiency),
      route: generateRouteGeometry(start, destination),
      highlights: ['Direct route', 'City roads'],
      tolls: Math.round(Math.random() * 50)
    },
    {
      type: 'Eco-Friendly',
      traffic: 'Light',
      time: Math.round(baseTime * 1.4),
      distance: Math.round(baseDistance * 1.2),
      fuel: calculateFuelConsumption(baseDistance * 1.2, vehicleData.fuelEfficiency * 1.3),
      route: generateRouteGeometry(start, destination),
      highlights: ['Fuel efficient', 'Less congested roads'],
      tolls: Math.round(Math.random() * 30)
    },
    {
      type: 'Scenic',
      traffic: 'Light',
      time: Math.round(baseTime * 1.6),
      distance: Math.round(baseDistance * 1.5),
      fuel: calculateFuelConsumption(baseDistance * 1.5, vehicleData.fuelEfficiency),
      route: generateRouteGeometry(start, destination),
      highlights: ['Scenic views', 'Less traffic', 'Tourist spots'],
      tolls: Math.round(Math.random() * 40)
    }
  ];
}

// Calculate fuel consumption
function calculateFuelConsumption(distance, efficiency) {
  return Math.round((distance / efficiency) * 100) / 100; // Liters, rounded to 2 decimals
}

// Generate mock route geometry (simplified)
function generateRouteGeometry(start, destination) {
  const points = [];
  const steps = 10;
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = start[0] + (destination[0] - start[0]) * ratio + (Math.random() - 0.5) * 0.01;
    const lng = start[1] + (destination[1] - start[1]) * ratio + (Math.random() - 0.5) * 0.01;
    points.push([lng, lat]); // GeoJSON format [lng, lat]
  }
  
  return {
    type: 'LineString',
    coordinates: points
  };
}

// Generate traffic statistics
function generateTrafficStats(predictions = []) {
  const now = Date.now();
  const criticalCount = predictions.filter(p => p.severity >= 4).length;
  const avgAccuracy = predictions.length > 0 
    ? Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length)
    : 95;
  
  return {
    lastUpdated: new Date().toISOString(),
    activePredictions: predictions.length,
    accuracyRate: avgAccuracy,
    responseTime: Math.round(Math.random() * 300 + 100), // 100-400ms
    criticalAlerts: criticalCount,
    systemHealth: {
      status: 'operational',
      uptime: '99.9%',
      apiCalls: Math.round(Math.random() * 10000 + 5000),
      cacheHitRate: Math.round(Math.random() * 20 + 75) // 75-95%
    }
  };
}

// Generate route optimization statistics
function generateRouteStats() {
  return {
    routesOptimized: Math.round(Math.random() * 1000 + 500),
    timeSaved: Math.round(Math.random() * 60 + 15), // minutes
    fuelEfficiency: Math.round(Math.random() * 30 + 15), // percentage
    activeRoutes: Math.round(Math.random() * 50 + 10),
    totalDistance: Math.round(Math.random() * 10000 + 5000), // km
    co2Saved: Math.round(Math.random() * 500 + 100), // kg
    costSavings: Math.round(Math.random() * 5000 + 1000) // INR
  };
}

// Generate historical data for charts
function generateHistoricalData(days = 7) {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      predictions: Math.round(Math.random() * 500 + 200),
      accuracy: Math.round(Math.random() * 10 + 90),
      alerts: Math.round(Math.random() * 50 + 10),
      routes: Math.round(Math.random() * 200 + 100)
    });
  }
  
  return data;
}

module.exports = {
  INDIAN_LOCATIONS,
  TRAFFIC_LEVELS,
  VEHICLE_TYPES,
  generateTrafficPredictions,
  generateRouteOptions,
  generateTrafficStats,
  generateRouteStats,
  generateHistoricalData,
  generateHighConfidence,
  getRandomTrafficLevel
};