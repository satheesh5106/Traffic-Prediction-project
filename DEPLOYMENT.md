# TrafficAI Deployment Guide

Comprehensive guide for deploying the TrafficAI backend to Netlify with production-ready configuration.

## Prerequisites

- Node.js 18+ installed
- Netlify CLI installed (`npm install -g netlify-cli`)
- Firebase project setup
- HERE Maps API key
- OpenRouteService API key
- OneSignal account

## Environment Variables Setup

### Required Environment Variables

Create these environment variables in your Netlify dashboard or use the CLI:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Firebase Private Key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"

# HERE Maps API
HERE_API_KEY="your-here-maps-api-key"

# OpenRouteService
ORS_API_KEY="your-openrouteservice-api-key"

# OneSignal Push Notifications
ONESIGNAL_APP_ID="your-onesignal-app-id"
ONESIGNAL_REST_API_KEY="your-onesignal-rest-api-key"

# Open-Meteo Weather API
OPEN_METEO_API_URL="https://api.open-meteo.com/v1"

# Node Environment
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
```

### Setting Environment Variables via Netlify CLI

```bash
# Login to Netlify
netlify login

# Link your site
netlify link

# Set environment variables
netlify env:set FIREBASE_PROJECT_ID "your-firebase-project-id"
netlify env:set FIREBASE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\nYour Firebase Private Key\n-----END PRIVATE KEY-----\n"
netlify env:set FIREBASE_CLIENT_EMAIL "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
netlify env:set HERE_API_KEY "your-here-maps-api-key"
netlify env:set ORS_API_KEY "your-openrouteservice-api-key"
netlify env:set ONESIGNAL_APP_ID "your-onesignal-app-id"
netlify env:set ONESIGNAL_REST_API_KEY "your-onesignal-rest-api-key"
netlify env:set OPEN_METEO_API_URL "https://api.open-meteo.com/v1"
netlify env:set NODE_ENV "production"
netlify env:set NEXT_TELEMETRY_DISABLED "1"
```

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Test Functions Locally

```bash
# Start Netlify Dev server
netlify dev

# Test individual functions
curl http://localhost:8888/.netlify/functions/auth-middleware
curl http://localhost:8888/.netlify/functions/dashboard-data
```

### 4. Deploy to Netlify

```bash
# Deploy to production
netlify deploy --prod

# Or deploy for preview
netlify deploy
```

## API Endpoints Testing

Once deployed, test your API endpoints:

### Authentication Middleware
```bash
curl -X GET "https://your-site.netlify.app/.netlify/functions/auth-middleware" \
  -H "Content-Type: application/json"
```

### Traffic Prediction
```bash
# Live traffic data
curl -X GET "https://your-site.netlify.app/.netlify/functions/traffic-prediction?action=live&lat=28.6139&lng=77.2090" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Predicted traffic
curl -X GET "https://your-site.netlify.app/.netlify/functions/traffic-prediction?action=predicted&lat=28.6139&lng=77.2090&hours=2" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Route Optimization
```bash
# Get optimized routes
curl -X POST "https://your-site.netlify.app/.netlify/functions/route-optimization" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "action": "optimize",
    "start": [77.2090, 28.6139],
    "end": [77.2310, 28.6289],
    "vehicle": "car",
    "priority": "fastest"
  }'
```

### Dashboard Data
```bash
curl -X GET "https://your-site.netlify.app/.netlify/functions/dashboard-data?action=overview" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Analytics
```bash
curl -X GET "https://your-site.netlify.app/.netlify/functions/analytics?action=metrics&timeframe=24h" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Visualization Data
```bash
# Get GeoJSON data
curl -X GET "https://your-site.netlify.app/.netlify/functions/vis-data?action=geojson&type=traffic&bounds=77.1,28.5,77.3,28.7" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### User Profile
```bash
# Get user profile
curl -X GET "https://your-site.netlify.app/.netlify/functions/user-profile?action=profile" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Settings
```bash
# Get user settings
curl -X GET "https://your-site.netlify.app/.netlify/functions/settings?action=user" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## Performance Optimization

### Function Configuration

The `netlify.toml` file includes optimized settings:

- **Memory allocation**: 256MB-1024MB based on function complexity
- **Timeout settings**: 10-30 seconds based on expected response time
- **Node bundler**: esbuild for faster builds
- **CORS headers**: Properly configured for cross-origin requests

### Caching Strategy

- **Static assets**: 1 year cache with immutable flag
- **API responses**: No cache for dynamic data
- **Function responses**: Appropriate cache headers per endpoint

## Security Configuration

### Headers Applied

- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-XSS-Protection**: 1; mode=block
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restricted camera, microphone, geolocation

### CORS Configuration

- **Access-Control-Allow-Origin**: * (configure for specific domains in production)
- **Access-Control-Allow-Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Access-Control-Allow-Headers**: Content-Type, Authorization, X-Requested-With

## Monitoring and Debugging

### Netlify Function Logs

```bash
# View function logs
netlify functions:log

# View specific function logs
netlify functions:log --name=traffic-prediction
```

### Health Check Endpoints

Each function includes a health check:

```bash
curl "https://your-site.netlify.app/.netlify/functions/auth-middleware?action=health"
```

### Error Monitoring

Functions include comprehensive error logging:

- Request/response logging
- Performance metrics
- Error stack traces
- User activity audit logs

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check Netlify dashboard > Site settings > Environment variables
   - Ensure Firebase private key is properly escaped

2. **Function Timeout**
   - Check function logs for performance bottlenecks
   - Optimize API calls and database queries

3. **CORS Errors**
   - Verify CORS headers in netlify.toml
   - Check frontend origin configuration

4. **Firebase Authentication Errors**
   - Verify Firebase project configuration
   - Check service account permissions

### Performance Issues

1. **Slow API Responses**
   - Monitor HERE Maps API response times
   - Implement caching for frequently requested data
   - Use connection pooling for database connections

2. **Memory Limits**
   - Increase memory allocation in netlify.toml
   - Optimize data processing algorithms
   - Implement streaming for large datasets

## Production Checklist

- [ ] All environment variables configured
- [ ] Firebase service account properly set up
- [ ] API keys have appropriate rate limits
- [ ] CORS configured for production domains
- [ ] Error monitoring enabled
- [ ] Performance monitoring configured
- [ ] Security headers validated
- [ ] Function timeouts optimized
- [ ] Memory allocations appropriate
- [ ] API endpoints tested with curl
- [ ] Load testing completed
- [ ] Backup and recovery plan in place

## API Rate Limits

### HERE Maps API
- **Free tier**: 250,000 requests/month
- **Rate limit**: 5 requests/second

### OpenRouteService
- **Free tier**: 2,000 requests/day
- **Rate limit**: 40 requests/minute

### Open-Meteo
- **Free tier**: 10,000 requests/day
- **No rate limit**: For non-commercial use

### OneSignal
- **Free tier**: 10,000 subscribers
- **Rate limit**: 30 requests/minute

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review function logs for errors
   - Monitor API usage and rate limits
   - Check performance metrics

2. **Monthly**
   - Update dependencies
   - Review security configurations
   - Optimize function performance

3. **Quarterly**
   - Audit API key usage
   - Review and update documentation
   - Performance load testing

### Contact Information

For deployment issues or questions:
- Check Netlify documentation: https://docs.netlify.com/
- Firebase documentation: https://firebase.google.com/docs/
- HERE Maps documentation: https://developer.here.com/documentation
- OpenRouteService documentation: https://openrouteservice.org/dev/