#!/usr/bin/env python3
"""
Traffic Volume Prediction ML Server
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
from dotenv import load_dotenv, find_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables (strictly from Backend/.env)
# Attempt to load Backend/.env explicitly first, then fail hard if key missing
backend_env_path = os.path.join(os.path.dirname(__file__), 'Backend', '.env')
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path)
else:
    # Also try a relative path from project root if the script is run elsewhere
    project_root_backend_env = os.path.join(os.getcwd(), 'Backend', '.env')
    if os.path.exists(project_root_backend_env):
        load_dotenv(project_root_backend_env)
    else:
        # Try default .env discovery as a last attempt
        env_path = find_dotenv()
        if env_path:
            load_dotenv(env_path)

# TomTom API Configuration (MUST come from Backend/.env)
TOMTOM_API_KEY = os.getenv('TOMTOM_API_KEY')
TOMTOM_GEOCODING_URL = "https://api.tomtom.com/search/2/geocode"
TOMTOM_TRAFFIC_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
TOMTOM_ROUTE_URL = "https://api.tomtom.com/routing/1/calculateRoute"

if not TOMTOM_API_KEY:
    logger.error("TOMTOM_API_KEY not found in Backend/.env. Aborting startup.")
    raise RuntimeError("Missing TOMTOM_API_KEY in Backend/.env")

app = Flask(__name__)
# Enable CORS for cross-origin requests from local dev ports
DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]
CORS(app, origins=DEV_ORIGINS, supports_credentials=True)

# Global model and scaler
model = None
scaler = StandardScaler()
model_accuracy = 0.0

def get_location_coordinates(location_query):
    """
    Get coordinates for a location using TomTom Geocoding API
    Prefer query param style and constrain to India for reliability.
    Fallback to structured geocode if free-form returns no results.
    """
    try:
        # Primary: free-form geocode with query params
        url = f"{TOMTOM_GEOCODING_URL}.json"
        params = {
            'key': TOMTOM_API_KEY,
            'query': location_query,
            'limit': 1,
            'countrySet': 'IN',
            'language': 'en-US'
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get('results'):
            result = data['results'][0]
            position = result.get('position', {})
            address = result.get('address', {})

            if position.get('lat') is not None and position.get('lon') is not None:
                return {
                    'lat': position.get('lat'),
                    'lon': position.get('lon'),
                    'formatted_address': address.get('freeformAddress', location_query),
                    'municipality': address.get('municipality', ''),
                    'country': address.get('country', '')
                }

        # Fallback: structured geocode with municipality + country
        logger.warning(f"No free-form geocode for: {location_query}, trying structuredGeocode")

        try:
            structured_url = "https://api.tomtom.com/search/2/structuredGeocode.json"
            municipality = location_query.split(',')[0].strip()
            structured_params = {
                'key': TOMTOM_API_KEY,
                'municipality': municipality,
                'countryCode': 'IN',
                'limit': 1,
                'language': 'en-US'
            }

            s_resp = requests.get(structured_url, params=structured_params, timeout=10)
            s_resp.raise_for_status()
            s_data = s_resp.json()

            if s_data.get('results'):
                s_result = s_data['results'][0]
                s_pos = s_result.get('position', {})
                s_addr = s_result.get('address', {})
                if s_pos.get('lat') is not None and s_pos.get('lon') is not None:
                    return {
                        'lat': s_pos.get('lat'),
                        'lon': s_pos.get('lon'),
                        'formatted_address': s_addr.get('freeformAddress', municipality),
                        'municipality': s_addr.get('municipality', municipality),
                        'country': s_addr.get('country', 'India')
                    }
        except Exception as se:
            logger.error(f"Structured geocode error for {location_query}: {str(se)}")

        # Final fallback: static coordinates for major Indian cities
        fallback_map = {
            'mumbai': {'lat': 19.0760, 'lon': 72.8777, 'formatted_address': 'Mumbai, India', 'municipality': 'Mumbai', 'country': 'India'},
            'thane': {'lat': 19.2183, 'lon': 72.9781, 'formatted_address': 'Thane, India', 'municipality': 'Thane', 'country': 'India'},
            'navi mumbai': {'lat': 19.0330, 'lon': 73.0297, 'formatted_address': 'Navi Mumbai, India', 'municipality': 'Navi Mumbai', 'country': 'India'},
            'delhi': {'lat': 28.6139, 'lon': 77.2090, 'formatted_address': 'Delhi, India', 'municipality': 'Delhi', 'country': 'India'},
            'bangalore': {'lat': 12.9716, 'lon': 77.5946, 'formatted_address': 'Bangalore, India', 'municipality': 'Bengaluru', 'country': 'India'},
            'chennai': {'lat': 13.0827, 'lon': 80.2707, 'formatted_address': 'Chennai, India', 'municipality': 'Chennai', 'country': 'India'},
            'hyderabad': {'lat': 17.3850, 'lon': 78.4867, 'formatted_address': 'Hyderabad, India', 'municipality': 'Hyderabad', 'country': 'India'},
            'kolkata': {'lat': 22.5726, 'lon': 88.3639, 'formatted_address': 'Kolkata, India', 'municipality': 'Kolkata', 'country': 'India'},
            'pune': {'lat': 18.5204, 'lon': 73.8567, 'formatted_address': 'Pune, India', 'municipality': 'Pune', 'country': 'India'},
            'ahmedabad': {'lat': 23.0225, 'lon': 72.5714, 'formatted_address': 'Ahmedabad, India', 'municipality': 'Ahmedabad', 'country': 'India'}
        }

        key = location_query.lower().strip()
        if key in fallback_map:
            logger.warning(f"Using static fallback coordinates for: {location_query}")
            return fallback_map[key]

        logger.error(f"Geocoding failed for: {location_query}")
        return None
    except Exception as e:
        logger.error(f"Geocoding error for {location_query}: {str(e)}")
        # Attempt static fallback even on errors
        fallback_map = {
            'mumbai': {'lat': 19.0760, 'lon': 72.8777, 'formatted_address': 'Mumbai, India', 'municipality': 'Mumbai', 'country': 'India'},
            'thane': {'lat': 19.2183, 'lon': 72.9781, 'formatted_address': 'Thane, India', 'municipality': 'Thane', 'country': 'India'},
            'navi mumbai': {'lat': 19.0330, 'lon': 73.0297, 'formatted_address': 'Navi Mumbai, India', 'municipality': 'Navi Mumbai', 'country': 'India'},
            'delhi': {'lat': 28.6139, 'lon': 77.2090, 'formatted_address': 'Delhi, India', 'municipality': 'Delhi', 'country': 'India'},
            'bangalore': {'lat': 12.9716, 'lon': 77.5946, 'formatted_address': 'Bangalore, India', 'municipality': 'Bengaluru', 'country': 'India'},
            'chennai': {'lat': 13.0827, 'lon': 80.2707, 'formatted_address': 'Chennai, India', 'municipality': 'Chennai', 'country': 'India'},
            'hyderabad': {'lat': 17.3850, 'lon': 78.4867, 'formatted_address': 'Hyderabad, India', 'municipality': 'Hyderabad', 'country': 'India'},
            'kolkata': {'lat': 22.5726, 'lon': 88.3639, 'formatted_address': 'Kolkata, India', 'municipality': 'Kolkata', 'country': 'India'},
            'pune': {'lat': 18.5204, 'lon': 73.8567, 'formatted_address': 'Pune, India', 'municipality': 'Pune', 'country': 'India'},
            'ahmedabad': {'lat': 23.0225, 'lon': 72.5714, 'formatted_address': 'Ahmedabad, India', 'municipality': 'Ahmedabad', 'country': 'India'}
        }

        key = location_query.lower().strip()
        if key in fallback_map:
            logger.warning(f"Using static fallback coordinates after error for: {location_query}")
            return fallback_map[key]

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

        # Fallback: use Traffic Flow API at origin point
        try:
            flow_params = {
                'key': TOMTOM_API_KEY,
                'point': f"{from_lat},{from_lon}",
            }
            flow_resp = requests.get(TOMTOM_TRAFFIC_URL, params=flow_params, timeout=10)
            flow_resp.raise_for_status()
            flow_data = flow_resp.json()
            flow = flow_data.get('flowSegmentData', {})
            if flow:
                current_speed = flow.get('currentSpeed', 50)
                free_flow_speed = flow.get('freeFlowSpeed', max(current_speed, 60))
                # Derive delay factor from speed ratio
                speed_ratio = max(0.1, current_speed / max(free_flow_speed, 1))
                delay_factor = 1.0 / speed_ratio
                congestion_ratio = max(0.0, min(1.0, (delay_factor - 1.0)))

                return {
                    'congestion_ratio': congestion_ratio,
                    'delay_factor': delay_factor,
                    'current_speed': current_speed,
                    'free_flow_speed': free_flow_speed,
                    'travel_time_minutes': None,
                    'distance_km': None,
                    'confidence': flow.get('confidence', 0.7),
                    'route_summary': {
                        'distance': None,
                        'travel_time': None,
                        'delay': None
                    }
                }
        except Exception as fe:
            logger.error(f"Traffic flow fallback failed: {str(fe)}")

        logger.warning(f"Failed to get route traffic data: {response.status_code}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting route traffic data: {str(e)}")
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
    cities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'kolkata', 'pune', 'ahmedabad']
    
    for i in range(n_samples):
        # Time features
        hour = np.random.randint(0, 24)
        day_of_week = np.random.randint(0, 7)
        month = np.random.randint(1, 13)
        
        # City features
        city = np.random.choice(cities)
        city_factor = {
            'mumbai': 1.3, 'delhi': 1.25, 'bangalore': 1.1, 'chennai': 1.0,
            'hyderabad': 0.9, 'kolkata': 0.95, 'pune': 0.85, 'ahmedabad': 0.8
        }[city]
        
        # Weather conditions
        weather_condition = np.random.choice(['clear', 'rain', 'fog', 'cloudy'], p=[0.5, 0.2, 0.1, 0.2])
        weather_factor = {'clear': 1.0, 'rain': 1.4, 'fog': 1.6, 'cloudy': 1.1}[weather_condition]
        
        # Base traffic volume calculation
        base_volume = 30
        
        # Peak hours effect (more sophisticated)
        if hour in [7, 8, 18, 19]:  # Peak hours
            base_volume += 45
        elif hour in [9, 10, 17, 20]:  # Semi-peak
            base_volume += 30
        elif hour in [11, 12, 13, 14, 15, 16]:  # Day hours
            base_volume += 20
        elif hour in [21, 22, 6]:  # Evening/early morning
            base_volume += 10
        else:  # Night hours
            base_volume += 5
        
        # Weekend effect
        if day_of_week in [5, 6]:  # Saturday, Sunday
            if hour in [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]:  # Weekend shopping/leisure hours
                base_volume *= 0.9
            else:
                base_volume *= 0.6
        
        # Monthly variations (monsoon, festivals)
        if month in [6, 7, 8, 9]:  # Monsoon months
            base_volume *= 1.2
        elif month in [10, 11]:  # Festival season
            base_volume *= 1.15
        
        # Apply city and weather factors
        volume = base_volume * city_factor * weather_factor
        
        # Add realistic noise
        volume += np.random.normal(0, 8)
        
        # Clamp between realistic bounds
        volume = max(5, min(100, volume))
        
        # Additional features for better prediction
        is_weekend = 1 if day_of_week in [5, 6] else 0
        is_peak_hour = 1 if hour in [7, 8, 18, 19] else 0
        is_monsoon = 1 if month in [6, 7, 8, 9] else 0
        
        data.append({
            'hour': hour,
            'day_of_week': day_of_week,
            'month': month,
            'city_factor': city_factor,
            'weather_factor': weather_factor,
            'is_weekend': is_weekend,
            'is_peak_hour': is_peak_hour,
            'is_monsoon': is_monsoon,
            'volume': volume
        })
    
    return pd.DataFrame(data)

def train_traffic_model():
    """
    Train the Random Forest model with enhanced features for >95% accuracy
    """
    global model, scaler, model_accuracy
    
    logger.info("Training enhanced traffic volume prediction model...")
    
    # Generate training data
    df = generate_enhanced_traffic_data()
    
    # Features and target
    feature_columns = ['hour', 'day_of_week', 'month', 'city_factor', 'weather_factor', 
                      'is_weekend', 'is_peak_hour', 'is_monsoon']
    X = df[feature_columns]
    y = df['volume']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train enhanced Random Forest model
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    train_predictions = model.predict(X_train_scaled)
    test_predictions = model.predict(X_test_scaled)
    
    train_r2 = r2_score(y_train, train_predictions)
    test_r2 = r2_score(y_test, test_predictions)
    train_rmse = np.sqrt(mean_squared_error(y_train, train_predictions))
    test_rmse = np.sqrt(mean_squared_error(y_test, test_predictions))
    
    model_accuracy = test_r2 * 100  # Convert to percentage
    
    logger.info(f"Model trained successfully!")
    logger.info(f"Training R² Score: {train_r2:.4f} ({train_r2*100:.2f}%)")
    logger.info(f"Testing R² Score: {test_r2:.4f} ({test_r2*100:.2f}%)")
    logger.info(f"Training RMSE: {train_rmse:.2f}")
    logger.info(f"Testing RMSE: {test_rmse:.2f}")
    
    # Save model for persistence
    try:
        joblib.dump(model, 'traffic_volume_model.pkl')
        joblib.dump(scaler, 'traffic_volume_scaler.pkl')
        logger.info("Model saved successfully!")
    except Exception as e:
        logger.warning(f"Failed to save model: {str(e)}")
    
    return model

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict traffic volume with location-based parameters and TomTom API integration
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract location parameters
        from_location = data.get('from_location', '')
        to_location = data.get('to_location', '')
        
        # Extract time parameters
        date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        time_str = data.get('time', datetime.now().strftime('%H:%M'))
        
        # Extract other parameters
        weather = data.get('weather', 'clear').lower()
        traffic_level = data.get('traffic_level', 'medium').lower()
        duration = data.get('duration', '1 hour')  # New duration parameter
        
        # Parse date and time
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            time_obj = datetime.strptime(time_str, '%H:%M')
            
            hour = time_obj.hour
            day_of_week = date_obj.weekday()
            month = date_obj.month
        except ValueError as e:
            return jsonify({'error': f'Invalid date/time format: {str(e)}'}), 400
        
        # Get coordinates for locations (allow direct lat/lon overrides)
        from_coords = None
        to_coords = None

        from_lat = data.get('from_lat')
        from_lon = data.get('from_lon')
        to_lat = data.get('to_lat')
        to_lon = data.get('to_lon')

        if isinstance(from_lat, (int, float)) and isinstance(from_lon, (int, float)):
            from_coords = {
                'lat': float(from_lat),
                'lon': float(from_lon),
                'formatted_address': from_location or 'From'
            }
        if isinstance(to_lat, (int, float)) and isinstance(to_lon, (int, float)):
            to_coords = {
                'lat': float(to_lat),
                'lon': float(to_lon),
                'formatted_address': to_location or 'To'
            }

        # If no direct coordinates, geocode by name
        if not from_coords and from_location:
            from_coords = get_location_coordinates(from_location)
        if not to_coords and to_location:
            to_coords = get_location_coordinates(to_location)
        
        # Return error if geocoding fails for required locations
        if not from_coords:
            return jsonify({
                'error': 'Failed to geocode from_location',
                'message': f'Could not find coordinates for: {from_location}'
            }), 400
        if not to_coords:
            return jsonify({
                'error': 'Failed to geocode to_location', 
                'message': f'Could not find coordinates for: {to_location}'
            }), 400
        
        # Get real-time traffic data
        traffic_data = get_route_traffic_data(
            from_coords['lat'], from_coords['lon'],
            to_coords['lat'], to_coords['lon']
        )
        
        # Fallback if TomTom fails: derive congestion heuristics from time-of-day
        if not traffic_data:
            logger.warning("Using heuristic traffic fallback due to TomTom failure")
            peak_hours = {7,8,9,10,17,18,19,20}
            if hour in peak_hours:
                traffic_data = {
                    'congestion_ratio': 0.5,
                    'delay_factor': 1.4,
                    'current_speed': 20.0,
                    'free_flow_speed': 60.0,
                    'confidence': 0.4,
                    'route_summary': {
                        'distance': None,
                        'travel_time': None,
                        'delay': None
                    }
                }
            elif 11 <= hour <= 16:
                traffic_data = {
                    'congestion_ratio': 0.25,
                    'delay_factor': 1.2,
                    'current_speed': 35.0,
                    'free_flow_speed': 60.0,
                    'confidence': 0.35,
                    'route_summary': {
                        'distance': None,
                        'travel_time': None,
                        'delay': None
                    }
                }
            else:
                traffic_data = {
                    'congestion_ratio': 0.08,
                    'delay_factor': 1.08,
                    'current_speed': 55.0,
                    'free_flow_speed': 65.0,
                    'confidence': 0.3,
                    'route_summary': {
                        'distance': None,
                        'travel_time': None,
                        'delay': None
                    }
                }
        
        # Use real-time traffic data for prediction instead of hardcoded factors
        congestion_ratio = traffic_data.get('congestion_ratio', 0.0)
        delay_factor = traffic_data.get('delay_factor', 1.0)
        current_speed = traffic_data.get('current_speed', 50.0)
        
        # Calculate dynamic city factor based on real traffic conditions
        # Higher congestion = higher city factor
        dynamic_city_factor = 1.0 + (congestion_ratio * 0.5)  # Scale congestion to factor
        
        # Calculate dynamic weather factor based on speed reduction
        # If current speed is significantly lower than free flow, weather might be a factor
        free_flow_speed = traffic_data.get('free_flow_speed', 60.0)
        speed_reduction = max(0, (free_flow_speed - current_speed) / free_flow_speed)
        
        # Weather factor mapping with real-time adjustment
        base_weather_factors = {'clear': 1.0, 'rain': 1.4, 'fog': 1.6, 'cloudy': 1.1}
        base_weather_factor = base_weather_factors.get(weather, 1.0)
        
        # Adjust weather factor based on actual speed reduction
        if speed_reduction > 0.3:  # Significant speed reduction
            weather_factor = base_weather_factor * (1 + speed_reduction)
        else:
            weather_factor = base_weather_factor
        
        # Calculate additional features
        is_weekend = 1 if day_of_week in [5, 6] else 0
        is_peak_hour = 1 if hour in [7, 8, 18, 19] else 0
        is_monsoon = 1 if month in [6, 7, 8, 9] else 0
        
        # Add real-time traffic features to the model
        is_congested = 1 if congestion_ratio > 0.2 else 0
        is_heavily_delayed = 1 if delay_factor > 1.5 else 0
        
        # Prepare features for prediction with real-time traffic data
        features = np.array([[
            hour, day_of_week, month, dynamic_city_factor, weather_factor,
            is_weekend, is_peak_hour, is_monsoon
        ]])
        
        features_scaled = scaler.transform(features)
        
        # Make base prediction
        base_predicted_volume = model.predict(features_scaled)[0]
        
        # Apply real-time traffic adjustments to the prediction
        # Higher congestion and delays should increase predicted volume
        traffic_adjustment = 1.0 + (congestion_ratio * 0.3) + ((delay_factor - 1.0) * 0.2)
        
        # Apply speed-based adjustment
        if current_speed < 20:  # Very slow traffic
            speed_adjustment = 1.4
        elif current_speed < 40:  # Slow traffic
            speed_adjustment = 1.2
        elif current_speed > 80:  # Fast traffic
            speed_adjustment = 0.8
        else:  # Normal traffic
            speed_adjustment = 1.0
        
        # Final prediction with real-time adjustments
        predicted_volume = base_predicted_volume * traffic_adjustment * speed_adjustment
        
        # Clamp prediction between realistic bounds
        predicted_volume = max(5, min(100, predicted_volume))
        
        # Calculate confidence based on real-time data quality and model performance
        base_confidence = min(0.98, model_accuracy / 100)
        
        # Adjust confidence based on traffic data quality
        traffic_confidence = traffic_data.get('confidence', 0.5)
        
        # Higher confidence when we have good real-time data
        confidence = (base_confidence * 0.7) + (traffic_confidence * 0.3)
        
        response = {
            'predicted_volume': round(predicted_volume, 2),
            'confidence': round(confidence, 4),
            'input_parameters': {
                'from_location': from_location,
                'to_location': to_location,
                'date': date_str,
                'time': time_str,
                'weather': weather,
                'traffic_level': traffic_level,
                'duration': duration
            },
            'location_info': {
                'from_coordinates': {
                    'lat': from_coords['lat'],
                    'lon': from_coords['lon'],
                    'formatted_address': from_coords['formatted_address']
                },
                'to_coordinates': {
                    'lat': to_coords['lat'],
                    'lon': to_coords['lon'],
                    'formatted_address': to_coords['formatted_address']
                }
            },
            'real_time_traffic': traffic_data,
            'prediction_factors': {
                'base_prediction': round(base_predicted_volume, 2),
                'dynamic_city_factor': round(dynamic_city_factor, 3),
                'weather_factor': round(weather_factor, 3),
                'traffic_adjustment': round(traffic_adjustment, 3),
                'speed_adjustment': round(speed_adjustment, 3),
                'congestion_ratio': round(congestion_ratio, 3),
                'delay_factor': round(delay_factor, 3),
                'current_speed_kmh': round(current_speed, 1)
            },
            'model_info': {
                'algorithm': 'Enhanced Random Forest with Real-time Traffic Integration',
                'n_estimators': model.n_estimators if model else 100,
                'target_accuracy': '>95%',
                'accuracy': f'{model_accuracy:.2f}%',
                'trained': True,
                'uses_real_time_data': True,
                'max_depth': getattr(model, 'max_depth', None) if model else None
            },
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Traffic prediction: {predicted_volume:.2f} (confidence: {confidence:.4f}) for route {from_location} -> {to_location}")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Traffic prediction error: {str(e)}")
        return jsonify({
            'error': 'Traffic prediction failed',
            'message': str(e)
        }), 500

@app.route('/predict_traffic', methods=['POST'])
def predict_traffic_volume():
    """
    Predict traffic volume with >95% accuracy target (legacy endpoint)
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract features with defaults
        hour = data.get('hour', datetime.now().hour)
        day_of_week = data.get('day_of_week', datetime.now().weekday())
        month = data.get('month', datetime.now().month)
        city = data.get('city', 'mumbai').lower()
        weather = data.get('weather', 'clear').lower()
        current_volume = data.get('current_volume', 50)
        
        # Validate inputs
        if not (0 <= hour <= 23):
            return jsonify({'error': 'Hour must be between 0-23'}), 400
        
        if not (0 <= day_of_week <= 6):
            return jsonify({'error': 'Day of week must be between 0-6'}), 400
        
        if not (1 <= month <= 12):
            return jsonify({'error': 'Month must be between 1-12'}), 400
        
        # City factor mapping
        city_factors = {
            'mumbai': 1.3, 'delhi': 1.25, 'bangalore': 1.1, 'chennai': 1.0,
            'hyderabad': 0.9, 'kolkata': 0.95, 'pune': 0.85, 'ahmedabad': 0.8
        }
        city_factor = city_factors.get(city, 1.0)
        
        # Weather factor mapping
        weather_factors = {'clear': 1.0, 'rain': 1.4, 'fog': 1.6, 'cloudy': 1.1}
        weather_factor = weather_factors.get(weather, 1.0)
        
        # Calculate additional features
        is_weekend = 1 if day_of_week in [5, 6] else 0
        is_peak_hour = 1 if hour in [7, 8, 18, 19] else 0
        is_monsoon = 1 if month in [6, 7, 8, 9] else 0
        
        # Prepare features for prediction
        features = np.array([[
            hour, day_of_week, month, city_factor, weather_factor,
            is_weekend, is_peak_hour, is_monsoon
        ]])
        
        features_scaled = scaler.transform(features)
        
        # Make prediction
        base_prediction = model.predict(features_scaled)[0]
        
        # Adjust prediction based on current volume (adaptive learning)
        if current_volume > 0:
            adjustment_factor = 0.15 * (current_volume - 50) / 50
            predicted_volume = base_prediction * (1 + adjustment_factor)
        else:
            predicted_volume = base_prediction
        
        # Clamp prediction between realistic bounds
        predicted_volume = max(5, min(100, predicted_volume))
        
        # Calculate confidence based on model performance
        confidence = min(0.98, model_accuracy / 100)
        
        response = {
            'predicted_volume': round(predicted_volume, 2),
            'confidence': round(confidence, 4),
            'accuracy_percentage': round(model_accuracy, 2),
            'input_features': {
                'hour': hour,
                'day_of_week': day_of_week,
                'month': month,
                'city': city,
                'weather': weather,
                'current_volume': current_volume
            },
            'timestamp': datetime.now().isoformat(),
            'model_info': {
                'algorithm': 'Enhanced Random Forest',
                'n_estimators': model.n_estimators,
                'target_accuracy': '>95%',
                'actual_accuracy': f'{model_accuracy:.2f}%'
            }
        }
        
        logger.info(f"Traffic prediction: {predicted_volume:.2f} (confidence: {confidence:.4f})")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Traffic prediction error: {str(e)}")
        return jsonify({
            'error': 'Traffic prediction failed',
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'service': 'Traffic Volume Prediction ML Server',
        'model_loaded': model is not None,
        'model_accuracy': f'{model_accuracy:.2f}%',
        'target_accuracy': '>95%',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0'
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
        'supported_cities': ['mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'kolkata', 'pune', 'ahmedabad']
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Train model on startup
    try:
        train_traffic_model()
        logger.info("🤖 Traffic Volume ML Server initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize model: {str(e)}")
        exit(1)
    
    # Start Flask server
    port = int(os.environ.get('PORT', 5002))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"🚀 Traffic Volume Prediction ML Server starting on port {port}")
    logger.info(f"📊 Environment: {'development' if debug else 'production'}")
    logger.info(f"🧠 Model: Enhanced Random Forest with {model.n_estimators if model else 'N/A'} estimators")
    logger.info(f"🎯 Target Accuracy: >95% (Current: {model_accuracy:.2f}%)")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )