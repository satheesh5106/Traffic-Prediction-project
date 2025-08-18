"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class WeatherService {
    constructor() {
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
        this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY || '';
        this.imdNowcastApiUrl = process.env.IMD_NOWCAST_API_URL || 'https://mausam.imd.gov.in/api/nowcastapi.php';
        this.weatherCache = new Map();
        this.alertsCache = new Map();
        if (!this.openWeatherApiKey) {
            logger_1.logger.warn('OpenWeatherMap API key not set. Weather data will be simulated.');
        }
    }
    /**
     * Get weather data for a location
     */
    async getWeatherData(latitude, longitude) {
        const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        // Check cache first
        const cachedData = this.weatherCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTimeout) {
            return cachedData.data;
        }
        try {
            let weatherData;
            if (this.openWeatherApiKey) {
                // Fetch from OpenWeatherMap API
                const response = await axios_1.default.get(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${this.openWeatherApiKey}`, { timeout: 5000 });
                weatherData = {
                    temperature: response.data.main.temp,
                    humidity: response.data.main.humidity,
                    pressure: response.data.main.pressure,
                    windSpeed: response.data.wind.speed,
                    windDirection: response.data.wind.deg,
                    condition: response.data.weather[0].main.toLowerCase(),
                    description: response.data.weather[0].description,
                    visibility: response.data.visibility / 1000, // Convert to km
                    precipitation: response.data.rain ? response.data.rain['1h'] || 0 : 0,
                    timestamp: new Date(response.data.dt * 1000),
                    source: 'openweathermap'
                };
            }
            else {
                // Generate simulated weather data
                weatherData = this.generateSimulatedWeatherData(latitude, longitude);
            }
            // Cache the data
            this.weatherCache.set(cacheKey, {
                data: weatherData,
                timestamp: Date.now()
            });
            return weatherData;
        }
        catch (error) {
            logger_1.logger.error('Error fetching weather data:', error);
            // Return simulated data as fallback
            const fallbackData = this.generateSimulatedWeatherData(latitude, longitude);
            // Cache the fallback data with shorter timeout
            this.weatherCache.set(cacheKey, {
                data: fallbackData,
                timestamp: Date.now() - (this.cacheTimeout / 2) // Set to expire sooner
            });
            return fallbackData;
        }
    }
    /**
     * Get weather alerts for a location
     */
    async getWeatherAlerts(latitude, longitude) {
        const cacheKey = `alerts_${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        // Check cache first
        const cachedData = this.alertsCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTimeout) {
            return cachedData.data;
        }
        try {
            let alertsData = [];
            if (this.openWeatherApiKey) {
                // Fetch from OpenWeatherMap OneCall API (includes alerts)
                const response = await axios_1.default.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,daily&units=metric&appid=${this.openWeatherApiKey}`, { timeout: 5000 });
                if (response.data.alerts && response.data.alerts.length > 0) {
                    alertsData = response.data.alerts.map((alert) => ({
                        event: alert.event,
                        description: alert.description,
                        start: new Date(alert.start * 1000),
                        end: new Date(alert.end * 1000),
                        severity: this.mapAlertSeverity(alert.event),
                        source: alert.sender_name || 'openweathermap'
                    }));
                }
            }
            else {
                // Return empty array for simulated data
                // Occasionally add a simulated alert for testing
                if (Math.random() < 0.1) { // 10% chance of an alert
                    alertsData = [this.generateSimulatedWeatherAlert()];
                }
            }
            // Cache the data
            this.alertsCache.set(cacheKey, {
                data: alertsData,
                timestamp: Date.now()
            });
            return alertsData;
        }
        catch (error) {
            logger_1.logger.error('Error fetching weather alerts:', error);
            return []; // Return empty array on error
        }
    }
    /**
     * Get IMD Nowcast warnings
     */
    async getIMDNowcastWarnings() {
        try {
            if (!this.imdNowcastApiUrl) {
                return [];
            }
            // Fetch from IMD Nowcast API
            const response = await axios_1.default.get(this.imdNowcastApiUrl, { timeout: 5000 });
            if (response.data && response.data.warnings) {
                return response.data.warnings.map((warning) => ({
                    region: warning.region,
                    description: warning.description,
                    severity: warning.severity || 'moderate',
                    timestamp: new Date(warning.timestamp || Date.now()),
                    source: 'IMD Nowcast'
                }));
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error('Error fetching IMD Nowcast warnings:', error);
            return [];
        }
    }
    /**
     * Generate simulated weather data
     */
    generateSimulatedWeatherData(latitude, longitude) {
        // Generate realistic weather based on latitude (rough approximation)
        const isNorthern = latitude > 0;
        const month = new Date().getMonth(); // 0-11
        // Temperature varies by latitude and season
        let baseTemp = 25; // Base temperature in Celsius
        // Adjust for latitude (cooler at higher latitudes)
        baseTemp -= Math.abs(latitude) * 0.4;
        // Adjust for season
        if ((isNorthern && (month < 2 || month > 9)) || (!isNorthern && (month > 2 && month < 9))) {
            // Winter in respective hemisphere
            baseTemp -= 10;
        }
        // Add some randomness
        const temperature = baseTemp + (Math.random() * 10 - 5);
        // Generate other weather parameters
        const conditions = ['clear', 'clouds', 'rain', 'thunderstorm', 'snow', 'mist'];
        const conditionWeights = [0.4, 0.3, 0.15, 0.05, 0.05, 0.05];
        const condition = this.weightedRandom(conditions, conditionWeights);
        // Precipitation based on condition
        let precipitation = 0;
        if (condition === 'rain')
            precipitation = Math.random() * 5;
        else if (condition === 'thunderstorm')
            precipitation = 5 + Math.random() * 15;
        else if (condition === 'snow')
            precipitation = Math.random() * 3;
        // Visibility based on condition
        let visibility = 10; // Default 10km
        if (condition === 'mist')
            visibility = 2 + Math.random() * 3;
        else if (condition === 'rain')
            visibility = 5 + Math.random() * 4;
        else if (condition === 'thunderstorm')
            visibility = 3 + Math.random() * 3;
        else if (condition === 'snow')
            visibility = 1 + Math.random() * 4;
        return {
            temperature,
            humidity: 40 + Math.random() * 40,
            pressure: 1000 + Math.random() * 30,
            windSpeed: Math.random() * 10,
            windDirection: Math.floor(Math.random() * 360),
            condition,
            description: this.getWeatherDescription(condition),
            visibility,
            precipitation,
            timestamp: new Date(),
            source: 'simulated'
        };
    }
    /**
     * Generate a simulated weather alert
     */
    generateSimulatedWeatherAlert() {
        const alertTypes = ['Heavy Rain', 'Thunderstorm', 'High Winds', 'Fog', 'Extreme Heat', 'Flash Flood'];
        const selectedAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const now = new Date();
        const endTime = new Date(now.getTime() + (3 + Math.random() * 6) * 60 * 60 * 1000); // 3-9 hours from now
        return {
            event: selectedAlert,
            description: `${selectedAlert} expected in the area. Take necessary precautions.`,
            start: now,
            end: endTime,
            severity: this.mapAlertSeverity(selectedAlert),
            source: 'simulated'
        };
    }
    /**
     * Map alert type to severity level
     */
    mapAlertSeverity(alertType) {
        const alertTypeLower = alertType.toLowerCase();
        if (alertTypeLower.includes('extreme') ||
            alertTypeLower.includes('severe') ||
            alertTypeLower.includes('warning') ||
            alertTypeLower.includes('flood') ||
            alertTypeLower.includes('hurricane') ||
            alertTypeLower.includes('tornado')) {
            return 'severe';
        }
        else if (alertTypeLower.includes('heavy') ||
            alertTypeLower.includes('thunderstorm') ||
            alertTypeLower.includes('storm') ||
            alertTypeLower.includes('high')) {
            return 'moderate';
        }
        else {
            return 'minor';
        }
    }
    /**
     * Get weather description based on condition
     */
    getWeatherDescription(condition) {
        switch (condition) {
            case 'clear':
                return 'Clear sky';
            case 'clouds':
                return 'Partly cloudy';
            case 'rain':
                return 'Light to moderate rain';
            case 'thunderstorm':
                return 'Thunderstorms with heavy rain';
            case 'snow':
                return 'Light snow';
            case 'mist':
                return 'Misty conditions with reduced visibility';
            default:
                return 'Unknown weather condition';
        }
    }
    /**
     * Helper method for weighted random selection
     */
    weightedRandom(items, weights) {
        const cumulativeWeights = [];
        let sum = 0;
        for (const weight of weights) {
            sum += weight;
            cumulativeWeights.push(sum);
        }
        const random = Math.random() * sum;
        for (let i = 0; i < items.length; i++) {
            if (random < cumulativeWeights[i]) {
                return items[i];
            }
        }
        return items[items.length - 1];
    }
}
exports.WeatherService = WeatherService;
//# sourceMappingURL=weatherService.js.map