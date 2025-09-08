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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Global model and scaler
model = None
scaler = StandardScaler()
model_accuracy = 0.0

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

@app.route('/predict_traffic', methods=['POST'])
def predict_traffic_volume():
    """
    Predict traffic volume with >95% accuracy target
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