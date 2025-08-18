# TrafficAI API Documentation

This document provides information about the TrafficAI API endpoints, request/response formats, and usage examples.

## Base URL

```
http://localhost:5000
```

## Authentication

All API endpoints (except authentication endpoints) require a valid Firebase authentication token. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_FIREBASE_TOKEN
```

## Error Handling

Errors are returned in the following format:

```json
{
  "success": false,
  "error": {
    "message": "Error message description"
  }
}
```

## Rate Limiting

The API is rate-limited to 100 requests per 15-minute window per IP address.

---

## Authentication Endpoints

### Register User

```
POST /api/auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Login User

```
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "firebase-auth-token",
    "user": {
      "uid": "firebase-user-id",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### Get User Profile

```
GET /api/auth/profile
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2023-06-15T10:30:00.000Z"
  }
}
```

### Update User Profile

```
PUT /api/auth/profile
```

**Request Body:**

```json
{
  "name": "John Smith",
  "preferences": {
    "defaultVehicle": "car",
    "defaultRoutePriority": "fastest"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "name": "John Smith",
    "preferences": {
      "defaultVehicle": "car",
      "defaultRoutePriority": "fastest"
    },
    "updatedAt": "2023-06-16T14:20:00.000Z"
  }
}
```

---

## Traffic Prediction Endpoints

### Get Traffic Prediction

```
POST /api/traffic-prediction
```

**Request Body:**

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "radius": 2000,
  "timeframe": 30
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "prediction": {
      "congestionLevel": "high",
      "speedFactor": 0.6,
      "density": "heavy"
    },
    "confidence": 0.85,
    "eta": 25,
    "liveTraffic": {
      "congestionLevel": "medium",
      "averageSpeed": 35,
      "density": "moderate"
    },
    "weather": {
      "temperature": 28,
      "condition": "clear",
      "precipitation": 0
    },
    "lastUpdated": "2023-06-16T15:30:00.000Z"
  }
}
```

### Get Traffic Statistics

```
GET /api/traffic-stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userStats": {
      "activePredictions": 3,
      "totalPredictions": 25,
      "accuracyRate": 0.92,
      "averageResponseTime": 0.8
    },
    "globalStats": {
      "activePredictions": 156,
      "totalPredictions": 5432,
      "accuracyRate": 0.89,
      "averageResponseTime": 0.95
    },
    "lastUpdated": "2023-06-16T15:35:00.000Z"
  }
}
```

### Get Historical Traffic Data

```
GET /api/traffic-history?latitude=12.9716&longitude=77.5946&startDate=2023-06-10T00:00:00Z&endDate=2023-06-16T23:59:59Z
```

**Response:**

```json
{
  "success": true,
  "data": {
    "historicalData": [
      {
        "timestamp": "2023-06-10T08:00:00.000Z",
        "congestionLevel": "high",
        "averageSpeed": 25,
        "density": "heavy"
      },
      {
        "timestamp": "2023-06-10T12:00:00.000Z",
        "congestionLevel": "medium",
        "averageSpeed": 40,
        "density": "moderate"
      }
      // More data points...
    ],
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946
    },
    "period": {
      "start": "2023-06-10T00:00:00.000Z",
      "end": "2023-06-16T23:59:59.000Z"
    }
  }
}
```

### Get Traffic Alerts

```
GET /api/traffic-alerts
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "location": {
          "latitude": 12.9716,
          "longitude": 77.5946
        },
        "trafficIncidents": [
          {
            "type": "ACCIDENT",
            "description": "Traffic accident reported. Expect delays.",
            "location": {
              "latitude": 12.9720,
              "longitude": 77.5950
            },
            "severity": "moderate",
            "startTime": "2023-06-16T14:30:00.000Z",
            "endTime": "2023-06-16T16:30:00.000Z"
          }
        ],
        "weatherAlerts": [
          {
            "type": "HEAVY_RAIN",
            "description": "Heavy rainfall expected. Drive with caution.",
            "severity": "moderate",
            "startTime": "2023-06-16T16:00:00.000Z",
            "endTime": "2023-06-16T18:00:00.000Z"
          }
        ],
        "timestamp": "2023-06-16T15:40:00.000Z"
      }
    ],
    "count": 1,
    "lastUpdated": "2023-06-16T15:40:00.000Z"
  }
}
```

---

## Route Optimization Endpoints

### Optimize Route

```
POST /api/optimize-route
```

**Request Body:**

```json
{
  "start": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "destination": {
    "latitude": 13.0827,
    "longitude": 77.5877
  },
  "priority": "fastest",
  "vehicleType": "car"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "route": {
      "path": [
        {"latitude": 12.9716, "longitude": 77.5946},
        {"latitude": 12.9876, "longitude": 77.5912},
        // More coordinates...
        {"latitude": 13.0827, "longitude": 77.5877}
      ],
      "distance": 15.2,
      "duration": 35,
      "timeSaved": 8,
      "fuelEfficiency": 12,
      "instructions": [
        {
          "text": "Head north on MG Road",
          "distance": 1.2,
          "duration": 3
        },
        // More instructions...
      ]
    },
    "traffic": {
      "congestionLevel": "medium",
      "averageSpeed": 40
    },
    "weather": {
      "condition": "clear",
      "precipitation": 0
    },
    "lastUpdated": "2023-06-16T15:45:00.000Z"
  }
}
```

### Get Route Options

```
POST /api/route-options
```

**Request Body:**

```json
{
  "start": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "destination": {
    "latitude": 13.0827,
    "longitude": 77.5877
  },
  "vehicleType": "car"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "options": [
      {
        "type": "fastest",
        "distance": 15.2,
        "duration": 35,
        "fuelConsumption": 1.2,
        "path": [
          // Coordinates...
        ]
      },
      {
        "type": "shortest",
        "distance": 14.5,
        "duration": 40,
        "fuelConsumption": 1.3,
        "path": [
          // Coordinates...
        ]
      },
      {
        "type": "eco",
        "distance": 16.0,
        "duration": 38,
        "fuelConsumption": 1.0,
        "path": [
          // Coordinates...
        ]
      },
      {
        "type": "scenic",
        "distance": 17.5,
        "duration": 45,
        "fuelConsumption": 1.4,
        "path": [
          // Coordinates...
        ]
      }
    ],
    "traffic": {
      "congestionLevel": "medium",
      "averageSpeed": 40
    },
    "weather": {
      "condition": "clear",
      "precipitation": 0
    },
    "lastUpdated": "2023-06-16T15:50:00.000Z"
  }
}
```

### Get Route Statistics

```
GET /api/route-stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userStats": {
      "routesOptimized": 15,
      "timeSaved": 120,
      "fuelEfficiency": 15,
      "activeRoutes": 2
    },
    "globalStats": {
      "routesOptimized": 3245,
      "timeSaved": 25600,
      "fuelEfficiency": 12,
      "activeRoutes": 156
    },
    "lastUpdated": "2023-06-16T15:55:00.000Z"
  }
}
```

### Get Active Routes

```
GET /api/active-routes
```

**Response:**

```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "start": {
          "latitude": 12.9716,
          "longitude": 77.5946
        },
        "destination": {
          "latitude": 13.0827,
          "longitude": 77.5877
        },
        "priority": "fastest",
        "vehicleType": "car",
        "distance": 15.2,
        "duration": 35,
        "createdAt": "2023-06-16T14:00:00.000Z",
        "expiresAt": "2023-06-17T14:00:00.000Z"
      },
      // More active routes...
    ],
    "count": 2,
    "lastUpdated": "2023-06-16T16:00:00.000Z"
  }
}
```

---

## Health Check

### Get Server Status

```
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2023-06-16T16:05:00.000Z"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - Not authorized to access the resource |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

---

## Testing the API

You can use tools like Postman or curl to test the API endpoints. Here's an example using curl:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword"}'

# Get traffic prediction with auth token
curl -X POST http://localhost:5000/api/traffic-prediction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"latitude":12.9716,"longitude":77.5946,"radius":2000,"timeframe":30}'
```

## Conclusion

This documentation covers the main endpoints of the TrafficAI API. For additional support or questions, please contact the development team.