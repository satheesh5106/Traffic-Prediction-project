#!/usr/bin/env python3
"""
Traffic Prediction ML Server
Flask + scikit-learn for traffic volume predictions
Supports Indian cities with real-time ML predictions
"""

from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global model and scaler
model = None
scaler = StandardScaler()

def generate_sample_traffic_data():
    """
    Generate sample traffic data for training
    Simulates METR-LA dataset patterns for Indian cities
    """
    np.random.seed(42)
    
    # Generate 1000 samples
    n_samples = 1000
    
    data = []
    for i in range(n_samples):
        # Random hour (0-23)
        hour = np.random.randint(0, 24)
        
        # Random day of week (0-6)
        day_of_week = np.random.randint(0, 7)
        
        # Base traffic volume with patterns
        base_volume = 30
        
        # Peak hours effect (7-9 AM, 6-8 PM)
        if hour in [7, 8, 18, 19]:
            base_volume += 40
        elif hour in [9, 10, 17, 20]:
            base_volume += 25
        elif hour in [11, 12, 13, 14, 15, 16]:
            base_volume += 15
        
        # Weekend effect
        if day_of_week in [5, 6]:  # Saturday, Sunday
            base_volume *= 0.7
        
        # Add random noise
        volume = base_volume + np.random.normal(0, 10)
        volume = max(10, min(100, volume))  # Clamp between 10-100
        
        data.append({
            'hour': hour,
            'day_of_week': day_of_week,
            'volume': volume
        })
    
    return pd.DataFrame(data)

def train_model():
    """
    Train the Random Forest model with sample data
    """
    global model, scaler
    
    logger.info("Training traffic prediction model...")
    
    # Generate or load training data
    df = generate_sample_traffic_data()
    
    # Features and target
    X = df[['hour', 'day_of_week']]
    y = df['volume']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    train_score = model.score(X_train_scaled, y_train)
    test_score = model.score(X_test_scaled, y_test)
    
    logger.info(f"Model trained successfully!")
    logger.info(f"Training R² Score: {train_score:.3f}")
    logger.info(f"Testing R² Score: {test_score:.3f}")
    
    return model

@app.route('/predict', methods=['POST'])
def predict_traffic():
    """
    Predict traffic volume based on hour, day_of_week, and current_volume
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract features
        hour = data.get('hour', datetime.now().hour)
        day_of_week = data.get('day_of_week', datetime.now().weekday())
        current_volume = data.get('current_volume', 50)
        
        # Validate inputs
        if not (0 <= hour <= 23):
            return jsonify({'error': 'Hour must be between 0-23'}), 400
        
        if not (0 <= day_of_week <= 6):
            return jsonify({'error': 'Day of week must be between 0-6'}), 400
        
        # Prepare features for prediction
        features = np.array([[hour, day_of_week]])
        features_scaled = scaler.transform(features)
        
        # Make prediction
        base_prediction = model.predict(features_scaled)[0]
        
        # Adjust prediction based on current volume (simple heuristic)
        adjustment_factor = 0.1 * current_volume / 50  # Normalize around 50
        predicted_volume = base_prediction + (base_prediction * adjustment_factor)
        
        # Clamp prediction between reasonable bounds
        predicted_volume = max(10, min(100, predicted_volume))
        
        # Calculate confidence based on model certainty
        # Use ensemble variance as confidence measure
        predictions = [tree.predict(features_scaled)[0] for tree in model.estimators_[:10]]
        variance = np.var(predictions)
        confidence = max(0.7, min(0.99, 1 - (variance / 100)))  # Convert to confidence
        
        response = {
            'predicted_volume': round(predicted_volume, 2),
            'confidence': round(confidence, 3),
            'input_features': {
                'hour': hour,
                'day_of_week': day_of_week,
                'current_volume': current_volume
            },
            'timestamp': datetime.now().isoformat(),
            'model_info': {
                'algorithm': 'Random Forest',
                'n_estimators': model.n_estimators,
                'features': ['hour', 'day_of_week']
            }
        }
        
        logger.info(f"Prediction made: {predicted_volume:.2f} (confidence: {confidence:.3f})")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'service': 'Traffic Prediction ML Server',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/model/info', methods=['GET'])
def model_info():
    """
    Get model information
    """
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    return jsonify({
        'algorithm': 'Random Forest Regressor',
        'n_estimators': model.n_estimators,
        'max_depth': model.max_depth,
        'features': ['hour', 'day_of_week'],
        'target': 'traffic_volume',
        'trained': True,
        'scaler': 'StandardScaler'
    })

@app.route('/model/retrain', methods=['POST'])
def retrain_model():
    """
    Retrain the model with new data
    """
    try:
        train_model()
        return jsonify({
            'status': 'success',
            'message': 'Model retrained successfully',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Retraining failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Train model on startup
    try:
        train_model()
        logger.info("🤖 ML Server initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize model: {str(e)}")
        exit(1)
    
    # Start Flask server
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"🚀 Traffic Prediction ML Server starting on port {port}")
    logger.info(f"📊 Environment: {'development' if debug else 'production'}")
    logger.info(f"🧠 Model: Random Forest with {model.n_estimators if model else 'N/A'} estimators")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )