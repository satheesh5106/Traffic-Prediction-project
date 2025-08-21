# TrafficAI Backend - Netlify Functions

A production-ready backend for traffic prediction and route optimization using Netlify Functions, designed for 99%+ accuracy and sub-1s response times.

## 🚀 Features

### Traffic Predictions (`/traffic-predictions`)
- **Real-time Traffic Analysis**: HERE Traffic API integration
- **Weather Impact**: Open-Meteo API for hazard detection
- **ML Models**: GNN4Traffic (ST-GAT) and LibCity (ST-MetaNet) inference
- **Statistics**: Last Updated, Active Predictions, Accuracy, Response Time, Critical Alerts
- **Data Formats**: Live, Predicted, and Historical tabs with interactive polylines
- **Smart Caching**: 5-minute TTL with configurable cache policies

### Route Optimization (`/optimize-route`)
- **Multi-Profile Routing**: Fastest, Shortest, Eco-Friendly, Scenic routes
- **Traffic Fusion**: Real-time traffic integration for accurate ETAs
- **Vehicle Support**: Car, HGV, Cycling, Walking with fuel calculations
- **Statistics**: Routes Optimized, Time Saved, Fuel Efficiency, Active Routes
- **Interactive Maps**: GeoJSON polylines for MapLibre GL JS

### Push Notifications (`/send-alerts`)
- **OneSignal Integration**: Unlimited push notifications
- **Multi-Channel**: Push, SMS (Twilio), Email (SendGrid)
- **Smart Alerts**: Critical traffic conditions with confidence scoring
- **Customizable**: Alert levels and notification preferences

## 📁 Project Structure

```
netlify/functions/
├── traffic-predictions.js    # Main traffic prediction endpoint
├── optimize-route.js         # Route optimization endpoint
├── send-alerts.js           # Push notification handler
├── utils/
│   ├── errorHandler.js      # Comprehensive error handling
│   └── mockData.js          # Mock data generators for testing
├── package.json             # Dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd netlify/functions
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required API Keys:**
- HERE Traffic API: [developer.here.com](https://developer.here.com/sign-up)
- OpenRouteService: [openrouteservice.org](https://openrouteservice.org/dev/#/signup)
- OneSignal: [onesignal.com](https://onesignal.com/sign-up)
- Twilio (optional): [twilio.com](https://twilio.com)
- SendGrid (optional): [sendgrid.com](https://sendgrid.com)

### 3. Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## 🔌 API Endpoints

### Traffic Predictions

**GET** `/.netlify/functions/traffic-predictions`

**Query Parameters:**
- `lat` (required): Latitude coordinate
- `lng` (required): Longitude coordinate
- `city` (optional): City name (default: "Delhi")
- `count` (optional): Number of predictions (default: 10)
- `historical` (optional): Include historical data (default: false)
- `format` (optional): Response format ("json" | "geojson")

**Response:**
```json
{
  "stats": {
    "lastUpdated": 1703123456789,
    "activePredictions": 25,
    "accuracyRate": 99.2,
    "responseTime": 245,
    "criticalAlerts": 3
  },
  "predictions": [
    {
      "id": "pred_123",
      "location": "Main Street, Delhi",
      "level": "Heavy",
      "confidence": 94.5,
      "eta": 15,
      "coordinates": [28.6139, 77.2090],
      "incidents": ["Road work ahead"]
    }
  ],
  "mapData": {
    "live": { /* GeoJSON FeatureCollection */ },
    "predicted": { /* GeoJSON FeatureCollection */ },
    "historical": { /* GeoJSON FeatureCollection */ }
  }
}
```

### Route Optimization

**POST** `/.netlify/functions/optimize-route`

**Request Body:**
```json
{
  "start": "28.6139,77.2090",
  "destination": "28.5355,77.3910",
  "priority": "Fastest",
  "vehicle": "driving-car",
  "preferences": {
    "avoidTolls": false,
    "avoidHighways": false
  }
}
```

**Response:**
```json
{
  "stats": {
    "routesOptimized": 156,
    "timeSaved": "12 mins",
    "fuelEfficiency": "18%",
    "activeRoutes": 8
  },
  "options": [
    {
      "type": "Fastest",
      "traffic": "Moderate",
      "time": 25,
      "distance": 15.2,
      "fuel": 1.8,
      "description": "Via NH-8, fastest route"
    }
  ],
  "mapPath": { /* GeoJSON FeatureCollection */ }
}
```

### Send Alerts

**POST** `/.netlify/functions/send-alerts`

**Request Body:**
```json
{
  "predictions": [/* traffic predictions array */],
  "channels": ["push", "sms", "email"],
  "userId": "user_123",
  "preferences": {
    "minConfidence": 90,
    "alertLevels": ["Heavy", "Congested"]
  }
}
```

## 🧪 Testing

### Local Development

```bash
# Start Netlify Dev server
netlify dev

# Test endpoints
curl "http://localhost:8888/.netlify/functions/traffic-predictions?lat=28.6139&lng=77.2090&city=Delhi&count=5"

curl -X POST "http://localhost:8888/.netlify/functions/optimize-route" \
  -H "Content-Type: application/json" \
  -d '{"start":"28.6139,77.2090","destination":"28.5355,77.3910","priority":"Fastest","vehicle":"driving-car"}'
```

### Performance Testing

```bash
# Install Apache Bench
brew install httpie

# Load test traffic predictions
ab -n 100 -c 10 "https://your-site.netlify.app/.netlify/functions/traffic-predictions?lat=28.6139&lng=77.2090"

# Test route optimization
echo '{"start":"28.6139,77.2090","destination":"28.5355,77.3910"}' | \
  http POST https://your-site.netlify.app/.netlify/functions/optimize-route
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|----------|
| `HERE_API_KEY` | HERE Traffic API key | Yes | - |
| `OPENROUTESERVICE_API_KEY` | ORS API key | Yes | - |
| `ONESIGNAL_APP_ID` | OneSignal app ID | Yes | - |
| `ONESIGNAL_API_KEY` | OneSignal REST API key | Yes | - |
| `CACHE_TTL_TRAFFIC` | Traffic cache TTL (seconds) | No | 300 |
| `CACHE_TTL_ROUTES` | Route cache TTL (seconds) | No | 600 |
| `RATE_LIMIT_REQUESTS` | Requests per hour | No | 100 |
| `MOCK_MODE` | Enable mock responses | No | false |

### Performance Tuning

- **Caching**: Adjust TTL values based on data freshness requirements
- **Rate Limiting**: Configure per-IP limits to prevent abuse
- **Timeouts**: Set appropriate timeouts for external API calls
- **Batch Processing**: Use Promise.all for parallel API calls

## 🚨 Error Handling

### Error Response Format

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": ["Missing required field: lat"],
  "requestId": "req_123456",
  "timestamp": 1703123456789
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request parameters
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `EXTERNAL_API_ERROR`: Third-party API failure
- `TIMEOUT_ERROR`: Request timeout
- `INTERNAL_ERROR`: Server error

## 📊 Monitoring

### Metrics Tracked

- Response times (target: <1s)
- Accuracy rates (target: >99%)
- Cache hit rates
- Error rates by endpoint
- API quota usage

### Logging

```javascript
// Log levels: error, warn, info, debug
log('info', 'Traffic prediction completed', {
  requestId,
  responseTime: 245,
  accuracy: 99.2
});
```

## 🔐 Security

- **CORS**: Configured for frontend domains
- **Rate Limiting**: Per-IP request limits
- **Input Validation**: Comprehensive parameter validation
- **API Key Protection**: Environment variable storage
- **Error Sanitization**: No sensitive data in error responses

## 🌍 India-Specific Features

- **Geographic Bounds**: Optimized for Indian coordinates
- **Traffic Patterns**: Indian traffic behavior modeling
- **Weather Integration**: Monsoon and extreme weather handling
- **Fuel Calculations**: Indian fuel efficiency standards
- **Route Preferences**: Local routing preferences

## 📈 Scalability

- **Serverless Architecture**: Auto-scaling Netlify Functions
- **Caching Strategy**: Multi-layer caching (memory + CDN)
- **Database-Free**: Stateless design for horizontal scaling
- **API Quotas**: Efficient API usage with fallbacks
- **CDN Integration**: Global edge distribution

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for TrafficAI - Conquering traffic, one prediction at a time!**