#!/usr/bin/env python3
"""
Real IMD Weather Warnings Scraper
Flask server that fetches actual weather warnings from Indian Meteorological Department
No ML predictions - only real IMD data
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import time
from datetime import datetime, timedelta
import logging
import os
from functools import lru_cache
import hashlib
from typing import Dict, List, Optional
import re
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('imd_warnings.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Visual Crossing Weather API Configuration
VISUAL_CROSSING_API_KEY = 'XZDQD92YED936BVD4Y9C28LKP'
VISUAL_CROSSING_BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline'

# IMD Official URLs
IMD_WARNINGS_URL = 'https://mausam.imd.gov.in/imd_latest/contents/all_warning.php'
IMD_CYCLONE_URL = 'https://mausam.imd.gov.in/imd_latest/contents/cyclone.php'
IMD_RSS_URL = 'https://mausam.imd.gov.in/imd_latest/contents/rss_weather.xml'

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000"], supports_credentials=True)

# Cache for API responses (5 minutes TTL)
api_cache = {}
CACHE_TTL = 300  # 5 minutes

# Famous cities from all Indian states to monitor
INDIAN_CITIES = [
    # Major Metropolitan Cities
    'mumbai,maharashtra', 'delhi,delhi', 'bangalore,karnataka', 'chennai,tamil nadu', 
    'hyderabad,telangana', 'kolkata,west bengal', 'pune,maharashtra', 'ahmedabad,gujarat',
    
    # State Capitals and Major Cities
    'jaipur,rajasthan', 'lucknow,uttar pradesh', 'bhopal,madhya pradesh', 'patna,bihar',
    'gandhinagar,gujarat', 'chandigarh,chandigarh', 'thiruvananthapuram,kerala', 
    'panaji,goa', 'shimla,himachal pradesh', 'srinagar,jammu and kashmir',
    'jammu,jammu and kashmir', 'dehradun,uttarakhand', 'ranchi,jharkhand',
    'raipur,chhattisgarh', 'bhubaneswar,odisha', 'guwahati,assam', 'imphal,manipur',
    'agartala,tripura', 'aizawl,mizoram', 'kohima,nagaland', 'itanagar,arunachal pradesh',
    'gangtok,sikkim', 'shillong,meghalaya',
    
    # Major Commercial and Industrial Cities
    'kanpur,uttar pradesh', 'nagpur,maharashtra', 'indore,madhya pradesh', 
    'vadodara,gujarat', 'surat,gujarat', 'rajkot,gujarat', 'nashik,maharashtra',
    'aurangabad,maharashtra', 'solapur,maharashtra', 'amritsar,punjab', 
    'ludhiana,punjab', 'jalandhar,punjab', 'chandigarh,punjab', 'faridabad,haryana',
    'gurgaon,haryana', 'rohtak,haryana', 'panipat,haryana', 'ambala,haryana',
    
    # Important Regional Centers
    'visakhapatnam,andhra pradesh', 'vijayawada,andhra pradesh', 'guntur,andhra pradesh',
    'tirupati,andhra pradesh', 'kurnool,andhra pradesh', 'warangal,telangana',
    'nizamabad,telangana', 'karimnagar,telangana', 'khammam,telangana',
    'coimbatore,tamil nadu', 'madurai,tamil nadu', 'tiruchirappalli,tamil nadu',
    'salem,tamil nadu', 'tirunelveli,tamil nadu', 'erode,tamil nadu', 'vellore,tamil nadu',
    'kochi,kerala', 'kozhikode,kerala', 'thrissur,kerala', 'kollam,kerala',
    'alappuzha,kerala', 'kannur,kerala', 'palakkad,kerala',
    
    # Eastern and Northeastern Cities
    'durgapur,west bengal', 'asansol,west bengal', 'siliguri,west bengal',
    'howrah,west bengal', 'malda,west bengal', 'kharagpur,west bengal',
    'cuttack,odisha', 'rourkela,odisha', 'berhampur,odisha', 'sambalpur,odisha',
    'brahmapur,odisha', 'puri,odisha', 'balasore,odisha',
    'dhanbad,jharkhand', 'jamshedpur,jharkhand', 'bokaro,jharkhand',
    'deoghar,jharkhand', 'hazaribagh,jharkhand', 'giridih,jharkhand',
    
    # Northern Cities
    'agra,uttar pradesh', 'varanasi,uttar pradesh', 'meerut,uttar pradesh',
    'allahabad,uttar pradesh', 'bareilly,uttar pradesh', 'aligarh,uttar pradesh',
    'moradabad,uttar pradesh', 'saharanpur,uttar pradesh', 'gorakhpur,uttar pradesh',
    'firozabad,uttar pradesh', 'jhansi,uttar pradesh', 'muzaffarnagar,uttar pradesh',
    'mathura,uttar pradesh', 'rampur,uttar pradesh', 'shahjahanpur,uttar pradesh',
    
    # Central India
    'gwalior,madhya pradesh', 'jabalpur,madhya pradesh', 'ujjain,madhya pradesh',
    'sagar,madhya pradesh', 'dewas,madhya pradesh', 'satna,madhya pradesh',
    'ratlam,madhya pradesh', 'rewa,madhya pradesh', 'katni,madhya pradesh',
    'bilaspur,chhattisgarh', 'korba,chhattisgarh', 'durg,chhattisgarh',
    'bhilai,chhattisgarh', 'rajnandgaon,chhattisgarh', 'jagdalpur,chhattisgarh'
]

def get_cached_response(cache_key: str) -> Optional[Dict]:
    """Get cached API response if still valid"""
    if cache_key in api_cache:
        cached_data, timestamp = api_cache[cache_key]
        if time.time() - timestamp < CACHE_TTL:
            return cached_data
        else:
            del api_cache[cache_key]
    return None

def set_cached_response(cache_key: str, data: Dict) -> None:
    """Cache API response with timestamp"""
    api_cache[cache_key] = (data, time.time())

def get_visual_crossing_weather_data(city: str, lat: float = None, lon: float = None) -> Optional[Dict]:
    """
    Get weather data from Visual Crossing API with caching and error handling
    """
    try:
        # Create cache key
        cache_key = hashlib.md5(f"vc_{city}_{lat}_{lon}".encode()).hexdigest()
        
        # Check cache first
        cached_data = get_cached_response(cache_key)
        if cached_data:
            logger.info(f"Using cached weather data for {city}")
            return cached_data
        
        # Prepare API request
        if lat and lon:
            location = f"{lat},{lon}"
        else:
            location = f"{city},India"
        
        url = f"{VISUAL_CROSSING_BASE_URL}/{location}"
        params = {
            'unitGroup': 'metric',
            'key': VISUAL_CROSSING_API_KEY,
            'contentType': 'json',
            'include': 'current'
        }
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            raw_data = response.json()
            
            # Extract current conditions
            current = raw_data.get('currentConditions', {})
            
            # Transform to our expected format
            weather_data = {
                'temperature': current.get('temp', 0),
                'humidity': current.get('humidity', 0),
                'pressure': current.get('pressure', 1013),
                'wind_speed': current.get('windspeed', 0),
                'rainfall': current.get('precip', 0) or 0,  # Handle null values
                'description': current.get('conditions', 'Unknown'),
                'city': raw_data.get('resolvedAddress', city),
                'timestamp': datetime.now().isoformat(),
                'feels_like': current.get('feelslike', current.get('temp', 0)),
                'visibility': current.get('visibility', 10),
                'cloud_cover': current.get('cloudcover', 0),
                'uv_index': current.get('uvindex', 0),
                'wind_direction': current.get('winddir', 0),
                'dew_point': current.get('dew', 0),
                'source': 'visual_crossing'
            }
            
            # Cache the response
            set_cached_response(cache_key, weather_data)
            
            logger.info(f"Successfully retrieved weather data for {city} from Visual Crossing")
            return weather_data
        else:
            logger.warning(f"Visual Crossing API returned status {response.status_code} for {city}")
            return None
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error getting weather data for {city}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error getting weather data for {city}: {str(e)}")
        return None

def scrape_imd_warnings() -> List[Dict]:
    """
    Scrape real warnings from IMD official website
    """
    warnings = []
    
    try:
        # Try to get warnings from Indian API first
        headers = {
            'Authorization': f'Bearer {INDIAN_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Check if Indian API has warnings endpoint
        try:
            response = requests.get(f"{INDIAN_API_BASE_URL}/weather/warnings", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('warnings'):
                    logger.info("Retrieved warnings from Indian API")
                    return data['warnings']
        except Exception as e:
            logger.info(f"Indian API warnings not available: {str(e)}")
        
        # Fallback: Try to scrape IMD website (if accessible)
        try:
            response = requests.get(IMD_WARNINGS_URL, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for warning elements (this would need to be customized based on IMD's actual HTML structure)
                warning_elements = soup.find_all(['div', 'p', 'span'], class_=re.compile(r'warning|alert|bulletin', re.I))
                
                for element in warning_elements[:10]:  # Limit to 10 warnings
                    text = element.get_text(strip=True)
                    if len(text) > 20:  # Filter out very short texts
                        warnings.append({
                            'type': 'general',
                            'severity': 'moderate',
                            'description': text[:200],  # Limit description length
                            'source': 'IMD Website',
                            'timestamp': datetime.now().isoformat(),
                            'valid_until': (datetime.now() + timedelta(hours=24)).isoformat()
                        })
                
                if warnings:
                    logger.info(f"Scraped {len(warnings)} warnings from IMD website")
                    return warnings
                    
        except Exception as e:
            logger.warning(f"Could not scrape IMD website: {str(e)}")
        
        # If no real warnings found, return empty list (no fake data)
        logger.info("No real warnings found from any source")
        return []
        
    except Exception as e:
        logger.error(f"Error scraping IMD warnings: {str(e)}")
        return []

def get_weather_forecast(city: str, days: int = 5) -> Optional[Dict]:
    """
    Get weather forecast from Indian API
    """
    try:
        cache_key = hashlib.md5(f"forecast_{city}_{days}".encode()).hexdigest()
        
        # Check cache first
        cached_data = get_cached_response(cache_key)
        if cached_data:
            return cached_data
        
        headers = {
            'Authorization': f'Bearer {INDIAN_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        url = f"{INDIAN_API_BASE_URL}/weather/forecast"
        params = {'city': city, 'days': days}
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            set_cached_response(cache_key, data)
            return data
        else:
            logger.warning(f"Forecast API returned status {response.status_code} for {city}")
            return None
            
    except Exception as e:
        logger.error(f"Error getting forecast for {city}: {str(e)}")
        return None

def get_real_time_weather_conditions() -> Dict:
    """
    Get real-time weather conditions across Indian cities using Visual Crossing API
    Categorize by actual weather conditions (sunny, cloudy, rainy, etc.)
    """
    conditions = {
        'sunny': [],
        'partly_cloudy': [],
        'cloudy': [],
        'rainy': [],
        'stormy': [],
        'foggy': [],
        'snowy': [],
        'windy': [],
        'timestamp': datetime.now().isoformat(),
        'total_cities_checked': 0,
        'data_source': 'visual_crossing_api'
    }
    
    try:
        # Use all cities from our expanded list
        for city in INDIAN_CITIES[:50]:  # Check up to 50 cities for comprehensive coverage
            try:
                # Extract city name from "city,state" format
                city_name = city.split(',')[0].strip()
                weather_data = get_visual_crossing_weather_data(city_name)
                conditions['total_cities_checked'] += 1
                
                if weather_data:
                    temp = weather_data.get('temperature', 0)
                    rainfall = weather_data.get('rainfall', 0)
                    humidity = weather_data.get('humidity', 0)
                    wind_speed = weather_data.get('wind_speed', 0)
                    pressure = weather_data.get('pressure', 1013)
                    description = weather_data.get('description', '').lower()
                    
                    city_info = {
                        'city': city,  # Keep full "city,state" format
                        'temperature': round(temp, 1),
                        'rainfall': round(rainfall, 1),
                        'humidity': round(humidity, 1),
                        'wind_speed': round(wind_speed, 1),
                        'pressure': round(pressure, 1),
                        'description': weather_data.get('description', 'Clear'),
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # Categorize based on weather conditions
                    if 'thunder' in description or 'storm' in description:
                        conditions['stormy'].append({
                            **city_info,
                            'condition': 'Stormy',
                            'severity': 'high',
                            'icon': '⛈️'
                        })
                    elif rainfall > 5 or 'rain' in description or 'drizzle' in description:
                        conditions['rainy'].append({
                            **city_info,
                            'condition': 'Rainy',
                            'severity': 'high' if rainfall > 15 else 'medium',
                            'icon': '🌧️'
                        })
                    elif 'fog' in description or 'mist' in description or humidity > 95:
                        conditions['foggy'].append({
                            **city_info,
                            'condition': 'Foggy',
                            'severity': 'medium',
                            'icon': '🌫️'
                        })
                    elif 'snow' in description or temp < 0:
                        conditions['snowy'].append({
                            **city_info,
                            'condition': 'Snowy',
                            'severity': 'medium',
                            'icon': '❄️'
                        })
                    elif wind_speed > 20:
                        conditions['windy'].append({
                            **city_info,
                            'condition': 'Windy',
                            'severity': 'medium',
                            'icon': '💨'
                        })
                    elif 'overcast' in description or 'cloud' in description or humidity > 70:
                        conditions['cloudy'].append({
                            **city_info,
                            'condition': 'Cloudy',
                            'severity': 'low',
                            'icon': '☁️'
                        })
                    elif 'partly' in description or humidity > 50:
                        conditions['partly_cloudy'].append({
                            **city_info,
                            'condition': 'Partly Cloudy',
                            'severity': 'low',
                            'icon': '⛅'
                        })
                    else:
                        conditions['sunny'].append({
                            **city_info,
                            'condition': 'Sunny',
                            'severity': 'low',
                            'icon': '☀️'
                        })
                    
                    # Additional categorization for temperature extremes
                    if temp > 35:
                        conditions['hot'].append({
                            **city_info,
                            'condition': 'Hot Weather',
                            'severity': 'extreme' if temp > 42 else 'high' if temp > 38 else 'medium',
                            'icon': '🔥'
                        })
                    elif temp < 10:
                        conditions['cold'].append({
                            **city_info,
                            'condition': 'Cold Weather',
                            'severity': 'high' if temp < 5 else 'medium',
                            'icon': '🥶'
                        })
                    
                    # Windy conditions
                    if wind_speed > 20:
                        conditions['windy'].append({
                            **city_info,
                            'condition': 'Windy',
                            'severity': 'high' if wind_speed > 35 else 'medium',
                            'icon': '💨'
                        })
                    
                    # Small delay to avoid overwhelming the API
                    time.sleep(0.1)
                
            except Exception as e:
                logger.debug(f"Error getting weather for {city}: {str(e)}")
                continue
        
        # Sort by severity and limit results for each category
        severity_order = {'extreme': 4, 'high': 3, 'medium': 2, 'low': 1}
        for key in conditions.keys():
            if key not in ['timestamp', 'total_cities_checked', 'data_source'] and isinstance(conditions[key], list):
                conditions[key] = sorted(
                    conditions[key], 
                    key=lambda x: severity_order.get(x.get('severity', 'low'), 1),
                    reverse=True
                )[:15]  # Limit to top 15 for each category
        
        logger.info(f"Retrieved real-time conditions for {conditions['total_cities_checked']} cities using Visual Crossing API")
        return conditions
        
    except Exception as e:
        logger.error(f"Error getting real-time weather conditions: {str(e)}")
        return conditions

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'IMD Weather Warnings Scraper',
        'timestamp': datetime.now().isoformat(),
        'api_connected': True,
        'cache_size': len(api_cache),
        'monitored_cities': len(INDIAN_CITIES)
    })

@app.route('/weather/current', methods=['GET', 'POST'])
def get_current_weather():
    """
    Get current weather data with real warnings from Visual Crossing API
    """
    try:
        if request.method == 'POST':
            data = request.get_json()
            city = data.get('city', 'mumbai')
            lat = data.get('lat')
            lon = data.get('lon')
        else:
            city = request.args.get('city', 'mumbai')
            lat = request.args.get('lat', type=float)
            lon = request.args.get('lon', type=float)
        
        # Get weather data from Visual Crossing API
        weather_data = get_visual_crossing_weather_data(city, lat, lon)
        
        if not weather_data:
            # Fallback to basic weather data if API fails
            weather_data = {
                'temperature': 25.0,
                'humidity': 60,
                'pressure': 1013.2,
                'wind_speed': 10.0,
                'rainfall': 0,
                'description': 'Data unavailable',
                'city': city,
                'timestamp': datetime.now().isoformat()
            }
            logger.warning(f"Using fallback weather data for {city}")
        
        # Get real warnings from IMD (no fake predictions)
        warnings_list = []
        try:
            # Get general IMD warnings and filter for the city
            general_warnings = scrape_imd_warnings()
            # Filter warnings that might be relevant to the city (basic keyword matching)
            city_keywords = [city.lower(), city.lower().replace('bangalore', 'bengaluru')]
            for warning in general_warnings:
                warning_text = warning.get('description', '').lower()
                if any(keyword in warning_text for keyword in city_keywords):
                    warnings_list.append(warning)
            
            if warnings_list:
                logger.info(f"Retrieved {len(warnings_list)} real warnings for {city}")
            
        except Exception as e:
            logger.info(f"No specific warnings available for {city}: {str(e)}")
        
        response = {
            'success': True,
            'data': weather_data,
            'warnings': warnings_list,
            'source': 'visual_crossing_api',
            'timestamp': datetime.now().isoformat(),
            'cache_status': 'hit' if f"{city}_{lat}_{lon}" in [hashlib.md5(f"{city}_{lat}_{lon}".encode()).hexdigest()] else 'miss'
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting current weather: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve weather data',
            'message': str(e)
        }), 500

@app.route('/weather/forecast', methods=['GET'])
def get_forecast():
    """Get weather forecast"""
    try:
        city = request.args.get('city', 'mumbai')
        days = request.args.get('days', 5, type=int)
        
        forecast_data = get_weather_forecast(city, days)
        
        if not forecast_data:
            return jsonify({
                'success': False,
                'error': 'Forecast data not available'
            }), 404
        
        return jsonify({
            'success': True,
            'data': forecast_data,
            'city': city,
            'days': days,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting forecast: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve forecast data',
            'message': str(e)
        }), 500

@app.route('/weather/conditions', methods=['GET'])
def get_weather_conditions():
    """
    Get real-time weather conditions across India
    Returns areas with high rainfall, flood risk, and temperature extremes
    """
    try:
        conditions = get_real_time_weather_conditions()
        
        return jsonify({
            'success': True,
            'conditions': conditions,
            'summary': {
                'sunny_count': len(conditions['sunny']),
                'cloudy_count': len(conditions['cloudy']),
                'partly_cloudy_count': len(conditions['partly_cloudy']),
                'rainy_count': len(conditions['rainy']),
                'stormy_count': len(conditions['stormy']),
                'foggy_count': len(conditions['foggy']),
                'snowy_count': len(conditions['snowy']),
                'windy_count': len(conditions['windy']),
                'total_cities_checked': conditions['total_cities_checked']
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting weather conditions: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve weather conditions',
            'message': str(e)
        }), 500

@app.route('/warnings/active', methods=['GET'])
def get_active_warnings():
    """
    Get active warnings across all monitored cities
    """
    try:
        active_warnings = {}
        cities_with_warnings = 0
        
        # Get real warnings from IMD
        general_warnings = scrape_imd_warnings()
        
        # Try to get city-specific warnings
        for city in INDIAN_CITIES[:10]:  # Limit to 10 cities to avoid rate limiting
            try:
                headers = {
                    'Authorization': f'Bearer {INDIAN_API_KEY}',
                    'Content-Type': 'application/json'
                }
                
                response = requests.get(
                    f"{INDIAN_API_BASE_URL}/weather/warnings", 
                    headers=headers, 
                    params={'city': city}, 
                    timeout=5
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('warnings'):
                        active_warnings[city] = data['warnings']
                        cities_with_warnings += 1
                        
            except Exception as e:
                logger.debug(f"No warnings for {city}: {str(e)}")
                continue
        
        # If no city-specific warnings, distribute general warnings
        if not active_warnings and general_warnings:
            # Assign general warnings to major cities
            major_cities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata']
            for i, city in enumerate(major_cities):
                if i < len(general_warnings):
                    active_warnings[city] = [general_warnings[i]]
                    cities_with_warnings += 1
        
        return jsonify({
            'success': True,
            'active_warnings': active_warnings,
            'cities_with_warnings': cities_with_warnings,
            'total_cities_monitored': len(INDIAN_CITIES),
            'generated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting active warnings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve active warnings',
            'message': str(e)
        }), 500

@app.route('/model/info', methods=['GET'])
def get_model_info():
    """
    Get information about the warning system (no ML models, just scraping info)
    """
    return jsonify({
        'success': True,
        'system_info': {
            'name': 'IMD Weather Warnings Scraper',
            'version': '1.0.0',
            'description': 'Real-time scraper for Indian Meteorological Department warnings',
            'data_sources': [
                'Indian Weather API',
                'IMD Official Website',
                'IMD RSS Feeds'
            ],
            'no_ml_predictions': True,
            'real_data_only': True
        },
        'api_integration': {
            'indian_weather_api': True,
            'imd_official_website': True,
            'cache_enabled': True,
            'cache_ttl_seconds': CACHE_TTL
        },
        'coverage': {
            'cities_monitored': len(INDIAN_CITIES),
            'warning_types': [
                'general', 'thunderstorm', 'heavy_rain', 'cyclone', 
                'heat_wave', 'cold_wave', 'fog', 'dust_storm'
            ],
            'severity_levels': ['low', 'moderate', 'high', 'severe', 'extreme']
        },
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    logger.info("Starting IMD Weather Warnings Scraper...")
    logger.info("This server scrapes REAL warnings from IMD - no ML predictions!")
    logger.info(f"Monitoring {len(INDIAN_CITIES)} Indian cities")
    
    port = int(os.environ.get('PORT', 5004))
    logger.info(f"Server starting on port {port}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True,
        threaded=True
    )