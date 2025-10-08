from flask import Flask, jsonify
from flask_cors import CORS
import bl
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import waitress
import os


RATE_LIMIT_DAILY = os.getenv('RATE_LIMIT_DAILY')
RATE_LIMIT_HOURLY = os.getenv('RATE_LIMIT_HOURLY')

if RATE_LIMIT_DAILY is None:
    RATE_LIMIT_DAILY = 10000  # Increased for real-time alerts

if RATE_LIMIT_HOURLY is None:
    RATE_LIMIT_HOURLY = 1000  # Increased for real-time alerts


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["{} per day".format(
        RATE_LIMIT_DAILY), "{} per hour".format(RATE_LIMIT_HOURLY)]
)


@app.route('/station/<string:id>')
def get_station(id):
    if id == 'all':
        result = bl.get_all_stations()
    else:
        result = bl.get_station_by_id(int(id))

    return jsonify(result), result['code']


@app.route('/weather/<int:id>')
def get_station_weather(id):
    result = bl.get_station_weather(id)
    return jsonify(result), result['code']


@app.route('/alerts')
def get_weather_alerts():
    """Get IMD weather alerts and warnings"""
    result = bl.get_weather_alerts()
    return jsonify(result), result['code']


if __name__ == '__main__':
    # Use Flask development server for local testing
    # Switch to waitress for production
    
    # Development mode
    app.run(host='0.0.0.0', port=5003, debug=True)
    
    # Production mode (uncomment below, comment above)
    # waitress.serve(app, host='0.0.0.0', port=5002)
    # app.run(host='0.0.0.0', port=1875)
