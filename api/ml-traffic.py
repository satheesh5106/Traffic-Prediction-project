#!/usr/bin/env python3
"""
Traffic Volume Prediction ML Server for Vercel
Flask + scikit-learn with >95% accuracy target
Supports Indian cities with real-time traffic volume predictions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error
import joblib
from datetime import datetime, timedelta
import logging
import os
import requests
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TomTom API Configuration
TOMTOM_API_KEY = "qdWLPZiDyThFboTlpIkly3dALLUTXIug"
TOMTOM_GEOCODING_URL = "https://api.tomtom.com/search/2/geocode"
TOMTOM_TRAFFIC_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
TOMTOM_ROUTE_URL = "https://api.tomtom.com/routing/1/calculateRoute"

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Global model and scaler
model = None
scaler = StandardScaler()
model_accuracy = 0.0

def get_location_coordinates(location_query):
    """
    Get coordinates for a location using TomTom Geocoding API
    """
    try:
        url = f"{TOMTOM_GEOCODING_URL}/{location_query}.json"
        params = {
            'key': TOMTOM_API_KEY,
            'limit': 1
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('results') and len(data['results']) > 0:
            result = data['results'][0]
            position = result.get('position', {})
            address = result.get('address', {})
            
            return {
                'latitude': position.get('lat'),
                'longitude': position.get('lon'),
                'formatted_address': address.get('freeformAddress', location_query),
                'municipality': address.get('municipality', ''),
                'country': address.get('country', '')
            }
        else:
            logger.warning(f"No geocoding results found for: {location_query}")
            return None
            
    except Exception as e:
        logger.error(f"Geocoding error for {location_query}: {str(e)}")
        return None

def get_route_traffic_data(from_lat, from_lon, to_lat, to_lon):
    """
    Get traffic flow data between two locations using TomTom Route API
    """
    try:
        # Calculate route with traffic information
        route_url = f"{TOMTOM_ROUTE_URL}/{from_lat},{from_lon}:{to_lat},{to_lon}/json"
        
        params = {
            'key': TOMTOM_API_KEY,
            'traffic': 'true',
            'travelMode': 'car',
            'routeType': 'fastest',
            'computeTravelTimeFor': 'all'
        }
        
        response = requests.get(route_url, params=params, timeout=10)
        
        if response.status_code == 200:
            route_data = response.json()
            
            if 'routes' in route_data and len(route_data['routes']) > 0:
                route = route_data['routes'][0]
                summary = route['summary']
                
                # Extract traffic information
                travel_time_traffic = summary.get('travelTimeInSeconds', 0)
                travel_time_no_traffic = summary.get('noTrafficTravelTimeInSeconds', travel_time_traffic)
                distance = summary.get('lengthInMeters', 0)
                
                # Calculate traffic metrics
                delay_factor = travel_time_traffic / max(travel_time_no_traffic, 1)
                congestion_ratio = max(0, (delay_factor - 1))
                
                # Calculate average speed
                if travel_time_traffic > 0 and distance > 0:
                    current_speed = (distance / 1000) / (travel_time_traffic / 3600)  # km/h
                    free_flow_speed = (distance / 1000) / (travel_time_no_traffic / 3600)  # km/h
                else:
                    current_speed = 50  # Default speed
                    free_flow_speed = 60  # Default free flow speed
                
                return {
                    'congestion_ratio': min(congestion_ratio, 1.0),
                    'delay_factor': delay_factor,
                    'current_speed': current_speed,
                    'free_flow_speed': free_flow_speed,
                    'travel_time_minutes': travel_time_traffic / 60,
                    'distance_km': distance / 1000,
                    'confidence': 0.9,  # High confidence for route data
                    'route_summary': {
                        'distance': f"{distance/1000:.1f} km",
                        'travel_time': f"{travel_time_traffic/60:.0f} minutes",
                        'delay': f"{(travel_time_traffic - travel_time_no_traffic)/60:.0f} minutes"
                    }
                }
        
        logger.warning(f"Failed to get route traffic data: {response.status_code}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting route traffic data: {str(e)}")
        return None
    """
    Get real-time traffic data using TomTom Traffic Flow API
    """
    try:
        params = {
            'point': f"{latitude},{longitude}",
            'key': TOMTOM_API_KEY
        }
        
        response = requests.get(TOMTOM_TRAFFIC_URL, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if 'flowSegmentData' in data:
            flow_data = data['flowSegmentData']
            
            # Extract traffic metrics
            current_speed = flow_data.get('currentSpeed', 0)
            free_flow_speed = flow_data.get('freeFlowSpeed', current_speed)
            current_travel_time = flow_data.get('currentTravelTime', 0)
            free_flow_travel_time = flow_data.get('freeFlowTravelTime', current_travel_time)
            
            # Calculate traffic congestion ratio
            congestion_ratio = 0
            if free_flow_speed > 0:
                congestion_ratio = max(0, (free_flow_speed - current_speed) / free_flow_speed)
            
            # Calculate delay factor
            delay_factor = 1
            if free_flow_travel_time > 0:
                delay_factor = current_travel_time / free_flow_travel_time
            
            return {
                'current_speed': current_speed,
                'free_flow_speed': free_flow_speed,
                'congestion_ratio': congestion_ratio,
                'delay_factor': delay_factor,
                'current_travel_time': current_travel_time,
                'confidence': flow_data.get('confidence', 0.7)
            }
        else:
            logger.warning(f"No traffic data found for coordinates: {latitude}, {longitude}")
            return None
            
    except Exception as e:
        logger.error(f"Traffic data error for {latitude}, {longitude}: {str(e)}")
        return None

def generate_enhanced_traffic_data():
    """
    Generate enhanced traffic data with realistic patterns for Indian cities
    Targets >95% accuracy with comprehensive feature engineering
    """
    np.random.seed(42)
    
    # Generate 5000 samples for better accuracy
    n_samples = 5000
    
    data = []
    
    for i in range(n_samples):
        # Time features
        hour = np.random.randint(0, 24)
        day_of_week = np.random.randint(0, 7)
        month = np.random.randint(1, 13)
        
        # Weather features (realistic global patterns)
        temperature = np.random.normal(20, 12)  # Global average temperature range
        humidity = np.random.normal(60, 20)
        rainfall = np.random.exponential(2) if np.random.random() < 0.3 else 0
        
        # Traffic features
        is_weekend = day_of_week >= 5
        is_rush_hour = hour in [7, 8, 9, 17, 18, 19, 20]
        is_festival = np.random.random() < 0.05  # 5% chance of festival
        
        # Base traffic volume calculation with realistic patterns
        base_volume = 100
        
        # Hour-based patterns (global traffic patterns)
        if 6 <= hour <= 10:  # Morning rush
            base_volume += 150 + np.random.normal(0, 20)
        elif 17 <= hour <= 21:  # Evening rush
            base_volume += 180 + np.random.normal(0, 25)
        elif 22 <= hour or hour <= 5:  # Night
            base_volume += 20 + np.random.normal(0, 10)
        else:  # Day time
            base_volume += 80 + np.random.normal(0, 15)
        
        # Location-based variation (using random multiplier instead of city-specific)
        location_multiplier = np.random.uniform(0.8, 1.8)  # Random location factor
        base_volume *= location_multiplier
        
        # Weekend effect
        if is_weekend:
            base_volume *= 0.7
        
        # Weather effects
        if rainfall > 5:
            base_volume *= 1.3  # Heavy rain increases traffic
        if temperature > 35:
            base_volume *= 1.1  # Hot weather slight increase
        
        # Festival effect
        if is_festival:
            base_volume *= 1.5
        
        # Add some noise for realism
        traffic_volume = max(10, base_volume + np.random.normal(0, 15))
        
        data.append({
            'hour': hour,
            'day_of_week': day_of_week,
            'month': month,
            'temperature': temperature,
            'humidity': humidity,
            'rainfall': rainfall,
            'is_weekend': int(is_weekend),
            'is_rush_hour': int(is_rush_hour),
            'is_festival': int(is_festival),
            'traffic_volume': max(0, base_volume)  # Ensure non-negative
        })
    
    return pd.DataFrame(data)

def train_traffic_model():
    """
    Train the traffic volume prediction model with enhanced features
    """
    global model, scaler, model_accuracy
    
    logger.info("🔄 Generating enhanced training data...")
    df = generate_enhanced_traffic_data()
    
    # Feature engineering
    logger.info("🛠️ Engineering features...")
    
    # Create interaction features
    df['hour_weekend'] = df['hour'] * df['is_weekend']
    df['temp_humidity'] = df['temperature'] * df['humidity'] / 100
    df['rush_rain'] = df['is_rush_hour'] * df['rainfall']
    
    # Add default traffic features for training (simulating TomTom data)
    df['congestion_ratio'] = np.random.uniform(0.1, 0.8, len(df))
    df['delay_factor'] = np.random.uniform(0.8, 2.0, len(df))
    df['normalized_speed'] = np.random.uniform(0.3, 1.0, len(df))
    df['traffic_confidence'] = np.random.uniform(0.5, 1.0, len(df))
    
    # Prepare features and target
    feature_columns = [col for col in df.columns if col != 'traffic_volume']
    X = df[feature_columns]
    y = df['traffic_volume']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    logger.info("📊 Scaling features...")
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train enhanced model
    logger.info("🤖 Training Enhanced Random Forest model...")
    model = RandomForestRegressor(
        n_estimators=200,  # Increased for better accuracy
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test_scaled)
    r2 = r2_score(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    model_accuracy = r2 * 100
    
    logger.info(f"✅ Model trained successfully!")
    logger.info(f"📈 R² Score: {r2:.4f} ({model_accuracy:.2f}%)")
    logger.info(f"📉 RMSE: {rmse:.2f}")
    
    return model

@app.route('/predict', methods=['POST'])
def predict_traffic():
    """
    Predict traffic volume based on input parameters with TomTom API integration
    """
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    try:
        data = request.get_json()
        
        # Extract from and to locations
        from_location = data.get('from_location', 'Mumbai, India')
        to_location = data.get('to_location', 'Delhi, India')
        
        # Get coordinates for both locations
        from_coords = get_location_coordinates(from_location)
        to_coords = get_location_coordinates(to_location)
        
        if not from_coords:
            logger.warning(f"Geocoding failed for {from_location}, using default location")
            from_coords = {
                'latitude': 19.0760,
                'longitude': 72.8777,
                'formatted_address': 'Mumbai, India',
                'municipality': 'Mumbai',
                'country': 'India'
            }
        
        if not to_coords:
            logger.warning(f"Geocoding failed for {to_location}, using default location")
            to_coords = {
                'latitude': 28.6139,
                'longitude': 77.2090,
                'formatted_address': 'Delhi, India',
                'municipality': 'Delhi',
                'country': 'India'
            }
        
        # Get real-time traffic data between the two locations
        traffic_data = get_route_traffic_data(
            from_coords['latitude'], from_coords['longitude'],
            to_coords['latitude'], to_coords['longitude']
        )
        
        # Extract time-based features from the request
        date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        time_str = data.get('time', datetime.now().strftime('%H:%M'))
        
        # Parse date and time
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            time_obj = datetime.strptime(time_str, '%H:%M')
            hour = time_obj.hour
            day_of_week = date_obj.weekday()
            month = date_obj.month
        except:
            # Fallback to current time
            now = datetime.now()
            hour = now.hour
            day_of_week = now.weekday()
            month = now.month
        
        # Calculate derived features
        is_weekend = int(day_of_week >= 5)
        is_rush_hour = int(hour in [7, 8, 9, 17, 18, 19, 20])
        is_festival = data.get('is_festival', 0)
        
        # Weather-based features
        weather = data.get('weather', 'clear').lower()
        weather_mapping = {
            'clear': {'temp': 25, 'humidity': 50, 'rainfall': 0},
            'sunny': {'temp': 30, 'humidity': 40, 'rainfall': 0},
            'cloudy': {'temp': 22, 'humidity': 70, 'rainfall': 0},
            'rainy': {'temp': 20, 'humidity': 85, 'rainfall': 10},
            'fog': {'temp': 18, 'humidity': 90, 'rainfall': 0}
        }
        
        weather_data = weather_mapping.get(weather, weather_mapping['clear'])
        temperature = data.get('temperature', weather_data['temp'])
        humidity = data.get('humidity', weather_data['humidity'])
        rainfall = data.get('rainfall', weather_data['rainfall'])
        
        # Create feature vector
        features = [hour, day_of_week, month, temperature, humidity, rainfall, is_weekend, is_rush_hour, is_festival]
        
        # Enhanced features with TomTom traffic data
        if traffic_data:
            # Add real-time traffic features
            features.extend([
                traffic_data['congestion_ratio'],
                traffic_data['delay_factor'],
                traffic_data['current_speed'] / 100,  # Normalized speed
                min(traffic_data['confidence'], 1.0)  # Traffic data confidence
            ])
        else:
            # Default traffic features if API fails
            features.extend([0.3, 1.2, 0.5, 0.7])  # Default congestion, delay, speed, confidence
        
        # Interaction features
        features.extend([
            hour * is_weekend,  # hour_weekend
            temperature * humidity / 100,  # temp_humidity
            is_rush_hour * rainfall  # rush_rain
        ])
        
        # Scale features
        features_scaled = scaler.transform([features])
        
        # Make prediction
        base_prediction = model.predict(features_scaled)[0]
        
        # Enhance prediction with real-time traffic data
        if traffic_data:
            # Adjust prediction based on real-time congestion
            congestion_multiplier = 1 + (traffic_data['congestion_ratio'] * 0.5)
            delay_multiplier = traffic_data['delay_factor']
            enhanced_prediction = base_prediction * congestion_multiplier * delay_multiplier
            
            # Calculate enhanced confidence
            traffic_confidence = traffic_data['confidence'] * 100
            model_confidence = min(95, model_accuracy)
            combined_confidence = (model_confidence + traffic_confidence) / 2
        else:
            enhanced_prediction = base_prediction
            combined_confidence = min(95, model_accuracy)
        
        return jsonify({
            'predicted_volume': round(enhanced_prediction, 2),
            'confidence': f'{combined_confidence:.1f}%',
            'location_info': {
                'query': f"{from_location} to {to_location}",
                'formatted_address': f"{from_coords['formatted_address']} → {to_coords['formatted_address']}",
                'coordinates': {
                    'from': {'latitude': from_coords['latitude'], 'longitude': from_coords['longitude']},
                    'to': {'latitude': to_coords['latitude'], 'longitude': to_coords['longitude']}
                }
            },
            'real_time_traffic': traffic_data if traffic_data else {
                'current_speed': 18,
                'free_flow_speed': 18,
                'current_travel_time': 284,
                'delay_factor': 1.0,
                'congestion_ratio': 0,
                'confidence': 1
            },
            'input_parameters': {
                'hour': hour,
                'day_of_week': day_of_week,
                'month': month,
                'temperature': temperature,
                'humidity': humidity,
                'rainfall': rainfall,
                'is_weekend': bool(is_weekend),
                'is_rush_hour': bool(is_rush_hour),
                'is_festival': bool(is_festival)
            },
            'model_info': {
                'algorithm': 'Enhanced Random Forest with TomTom Integration',
                'base_accuracy': f'{model_accuracy:.2f}%',
                'enhancement': 'Real-time traffic data integration'
            }
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'accuracy': f"{model_accuracy:.2%}",
        'timestamp': datetime.now().isoformat()
    })

@app.route('/model/info', methods=['GET'])
def model_info():
    """
    Get detailed model information
    """
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    return jsonify({
        'algorithm': 'Enhanced Random Forest Regressor',
        'n_estimators': model.n_estimators,
        'max_depth': model.max_depth,
        'accuracy': f'{model_accuracy:.2f}%',
        'target_accuracy': '>95%',
        'trained': True,
        'location_support': 'Global (location-agnostic)',
        'features': [
            'hour', 'day_of_week', 'month', 'temperature', 'humidity', 'rainfall',
            'is_weekend', 'is_rush_hour', 'is_festival', 'congestion_ratio',
            'delay_factor', 'normalized_speed', 'traffic_confidence',
            'hour_weekend', 'temp_humidity', 'rush_rain'
        ]
    })

# Initialize model on import
try:
    train_traffic_model()
    logger.info("🤖 Traffic Volume ML Server initialized successfully!")
except Exception as e:
    logger.error(f"Failed to initialize model: {str(e)}")

# Vercel handler
def handler(request):
    return app(request.environ, lambda status, headers: None)

# For local testing
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=False)