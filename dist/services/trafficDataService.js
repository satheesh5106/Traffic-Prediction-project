"use strict";
/**
 * Traffic Data Service
 *
 * Handles real-time traffic data collection, processing, and prediction.
 * Provides traffic information for route optimization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trafficDataService = exports.TrafficDataService = exports.TrafficSeverity = void 0;
const logger_1 = require("../utils/logger");
const cache_1 = require("../utils/cache");
const geo_1 = require("../utils/geo");
// Traffic severity levels
var TrafficSeverity;
(function (TrafficSeverity) {
    TrafficSeverity["NONE"] = "none";
    TrafficSeverity["LOW"] = "low";
    TrafficSeverity["MODERATE"] = "moderate";
    TrafficSeverity["HIGH"] = "high";
    TrafficSeverity["SEVERE"] = "severe";
})(TrafficSeverity || (exports.TrafficSeverity = TrafficSeverity = {}));
class TrafficDataService {
    /**
     * Create a new traffic data service
     * @param config Service configuration
     */
    constructor(config = {
        updateInterval: 60000,
        predictionHorizon: 30,
        cacheTTL: 300000,
        confidenceThreshold: 0.7
    }) {
        this.trafficData = new Map();
        this.trafficIncidents = new Map();
        this.trafficPredictions = new Map();
        this.updateTimer = null;
        this.subscribers = new Set();
        this.updateInterval = config.updateInterval;
        this.predictionHorizon = config.predictionHorizon;
        this.confidenceThreshold = config.confidenceThreshold;
        this.cache = new cache_1.Cache({
            maxSize: 10000,
            defaultTTL: config.cacheTTL
        });
        logger_1.logger.info('TrafficDataService initialized', config);
    }
    /**
     * Start real-time traffic updates
     */
    startUpdates() {
        if (this.updateTimer) {
            return;
        }
        logger_1.logger.info('Starting traffic data updates');
        // Initial update
        this.updateTrafficData();
        // Schedule regular updates
        this.updateTimer = setInterval(() => {
            this.updateTrafficData();
        }, this.updateInterval);
    }
    /**
     * Stop real-time traffic updates
     */
    stopUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            logger_1.logger.info('Stopped traffic data updates');
        }
    }
    /**
     * Update traffic data from various sources
     */
    async updateTrafficData() {
        try {
            logger_1.logger.debug('Updating traffic data');
            // In a real implementation, this would fetch data from external APIs
            // For now, we'll generate some mock data
            const mockData = this.generateMockTrafficData();
            // Process and store the data
            for (const data of mockData) {
                const key = this.getLocationKey(data.location);
                this.trafficData.set(key, data);
            }
            // Generate predictions based on current data
            this.generateTrafficPredictions();
            // Notify subscribers
            this.notifySubscribers();
            logger_1.logger.debug(`Traffic data updated: ${this.trafficData.size} data points, ${this.trafficPredictions.size} predictions`);
        }
        catch (error) {
            logger_1.logger.error('Error updating traffic data', error);
        }
    }
    /**
     * Generate mock traffic data for testing
     * @returns Array of traffic data
     */
    generateMockTrafficData() {
        // Mumbai area coordinates
        const mumbaiCenter = { lat: 19.076, lng: 72.8777 };
        const data = [];
        // Generate data points around Mumbai
        for (let i = 0; i < 50; i++) {
            // Random offset from center (-0.1 to 0.1 degrees)
            const latOffset = (Math.random() - 0.5) * 0.2;
            const lngOffset = (Math.random() - 0.5) * 0.2;
            const location = {
                lat: mumbaiCenter.lat + latOffset,
                lng: mumbaiCenter.lng + lngOffset
            };
            // Random severity weighted towards lower values
            const severityRand = Math.random();
            let severity;
            if (severityRand < 0.4) {
                severity = TrafficSeverity.LOW;
            }
            else if (severityRand < 0.7) {
                severity = TrafficSeverity.MODERATE;
            }
            else if (severityRand < 0.9) {
                severity = TrafficSeverity.HIGH;
            }
            else {
                severity = TrafficSeverity.SEVERE;
            }
            // Speed based on severity
            let speed;
            switch (severity) {
                case TrafficSeverity.LOW:
                    speed = 40 + Math.random() * 20; // 40-60 km/h
                    break;
                case TrafficSeverity.MODERATE:
                    speed = 20 + Math.random() * 20; // 20-40 km/h
                    break;
                case TrafficSeverity.HIGH:
                    speed = 10 + Math.random() * 10; // 10-20 km/h
                    break;
                case TrafficSeverity.SEVERE:
                    speed = Math.random() * 10; // 0-10 km/h
                    break;
                default:
                    speed = 60 + Math.random() * 20; // 60-80 km/h
            }
            // Random confidence between 0.7 and 1.0
            const confidence = 0.7 + Math.random() * 0.3;
            data.push({
                location,
                severity,
                speed,
                timestamp: Date.now(),
                confidence,
                source: 'simulation'
            });
        }
        return data;
    }
    /**
     * Generate traffic predictions based on current data
     */
    generateTrafficPredictions() {
        // Clear previous predictions
        this.trafficPredictions.clear();
        // In a real implementation, this would use a machine learning model
        // For now, we'll generate simple predictions based on current data
        for (const [key, data] of this.trafficData.entries()) {
            // Only predict for high-confidence data
            if (data.confidence < this.confidenceThreshold) {
                continue;
            }
            // Simple prediction: traffic gets slightly worse over time
            let predictedSeverity = data.severity;
            let predictedSpeed = data.speed;
            // 20% chance of severity increasing
            if (Math.random() < 0.2) {
                switch (data.severity) {
                    case TrafficSeverity.NONE:
                        predictedSeverity = TrafficSeverity.LOW;
                        predictedSpeed = 50 + Math.random() * 10;
                        break;
                    case TrafficSeverity.LOW:
                        predictedSeverity = TrafficSeverity.MODERATE;
                        predictedSpeed = 30 + Math.random() * 10;
                        break;
                    case TrafficSeverity.MODERATE:
                        predictedSeverity = TrafficSeverity.HIGH;
                        predictedSpeed = 15 + Math.random() * 5;
                        break;
                    case TrafficSeverity.HIGH:
                        predictedSeverity = TrafficSeverity.SEVERE;
                        predictedSpeed = 5 + Math.random() * 5;
                        break;
                    case TrafficSeverity.SEVERE:
                        // Already at max severity
                        predictedSpeed = Math.max(0, data.speed - 2);
                        break;
                }
            }
            else if (Math.random() < 0.1) {
                // 10% chance of severity decreasing
                switch (data.severity) {
                    case TrafficSeverity.SEVERE:
                        predictedSeverity = TrafficSeverity.HIGH;
                        predictedSpeed = 15 + Math.random() * 5;
                        break;
                    case TrafficSeverity.HIGH:
                        predictedSeverity = TrafficSeverity.MODERATE;
                        predictedSpeed = 30 + Math.random() * 10;
                        break;
                    case TrafficSeverity.MODERATE:
                        predictedSeverity = TrafficSeverity.LOW;
                        predictedSpeed = 50 + Math.random() * 10;
                        break;
                    case TrafficSeverity.LOW:
                        predictedSeverity = TrafficSeverity.NONE;
                        predictedSpeed = 70 + Math.random() * 10;
                        break;
                    case TrafficSeverity.NONE:
                        // Already at min severity
                        predictedSpeed = Math.min(80, data.speed + 5);
                        break;
                }
            }
            // Prediction timestamp (30 minutes in the future)
            const timestamp = Date.now() + this.predictionHorizon * 60 * 1000;
            // Slightly lower confidence for predictions
            const confidence = Math.max(0.5, data.confidence - 0.2);
            // Factors affecting prediction
            const factors = ['historical data', 'current conditions'];
            // Add time of day as a factor
            const hour = new Date().getHours();
            if (hour >= 7 && hour <= 10) {
                factors.push('morning rush hour');
            }
            else if (hour >= 16 && hour <= 19) {
                factors.push('evening rush hour');
            }
            else if (hour >= 22 || hour <= 5) {
                factors.push('night time');
            }
            // Add weather as a factor (mock)
            if (Math.random() < 0.3) {
                factors.push('rain forecast');
            }
            this.trafficPredictions.set(key, {
                location: data.location,
                predictedSeverity,
                predictedSpeed,
                timestamp,
                confidence,
                factors
            });
        }
    }
    /**
     * Get traffic data for a specific location
     * @param location Location to get traffic data for
     * @param radius Search radius in meters
     * @returns Traffic data or null if not found
     */
    getTrafficDataAtLocation(location, radius = 500) {
        // Check cache first
        const cacheKey = `traffic:${location.lat.toFixed(5)}:${location.lng.toFixed(5)}:${radius}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Find closest traffic data point within radius
        let closestData = null;
        let minDistance = Infinity;
        for (const data of this.trafficData.values()) {
            if ((0, geo_1.isWithinDistance)(location, data.location, radius)) {
                const distance = Math.sqrt(Math.pow(location.lat - data.location.lat, 2) +
                    Math.pow(location.lng - data.location.lng, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestData = data;
                }
            }
        }
        // Cache result
        if (closestData) {
            this.cache.set(cacheKey, closestData);
        }
        return closestData;
    }
    /**
     * Get traffic prediction for a specific location
     * @param location Location to get prediction for
     * @param radius Search radius in meters
     * @returns Traffic prediction or null if not found
     */
    getTrafficPredictionAtLocation(location, radius = 500) {
        // Check cache first
        const cacheKey = `prediction:${location.lat.toFixed(5)}:${location.lng.toFixed(5)}:${radius}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Find closest prediction within radius
        let closestPrediction = null;
        let minDistance = Infinity;
        for (const prediction of this.trafficPredictions.values()) {
            if ((0, geo_1.isWithinDistance)(location, prediction.location, radius)) {
                const distance = Math.sqrt(Math.pow(location.lat - prediction.location.lat, 2) +
                    Math.pow(location.lng - prediction.location.lng, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPrediction = prediction;
                }
            }
        }
        // Cache result
        if (closestPrediction) {
            this.cache.set(cacheKey, closestPrediction);
        }
        return closestPrediction;
    }
    /**
     * Get all traffic incidents
     * @returns Array of traffic incidents
     */
    getAllTrafficIncidents() {
        return Array.from(this.trafficIncidents.values());
    }
    /**
     * Add a traffic incident
     * @param incident Traffic incident to add
     */
    addTrafficIncident(incident) {
        this.trafficIncidents.set(incident.id, incident);
        logger_1.logger.info(`Added traffic incident: ${incident.id}`, incident);
        // Clear cache entries that might be affected
        this.cache.clear();
        // Update predictions
        this.generateTrafficPredictions();
        // Notify subscribers
        this.notifySubscribers();
    }
    /**
     * Remove a traffic incident
     * @param id Incident ID to remove
     * @returns True if incident was removed
     */
    removeTrafficIncident(id) {
        const removed = this.trafficIncidents.delete(id);
        if (removed) {
            logger_1.logger.info(`Removed traffic incident: ${id}`);
            // Clear cache entries that might be affected
            this.cache.clear();
            // Update predictions
            this.generateTrafficPredictions();
            // Notify subscribers
            this.notifySubscribers();
        }
        return removed;
    }
    /**
     * Subscribe to traffic data updates
     * @param callback Callback function to call when traffic data is updated
     * @returns Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        // Call immediately with current data
        callback(Array.from(this.trafficData.values()));
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }
    /**
     * Notify all subscribers of traffic data updates
     */
    notifySubscribers() {
        const data = Array.from(this.trafficData.values());
        for (const subscriber of this.subscribers) {
            try {
                subscriber(data);
            }
            catch (error) {
                logger_1.logger.error('Error in traffic data subscriber', error);
            }
        }
    }
    /**
     * Get a unique key for a location
     * @param location Location
     * @returns Location key
     */
    getLocationKey(location) {
        return `${location.lat.toFixed(5)}:${location.lng.toFixed(5)}`;
    }
    /**
     * Get traffic data statistics
     * @returns Traffic data statistics
     */
    getStatistics() {
        return {
            dataPoints: this.trafficData.size,
            predictions: this.trafficPredictions.size,
            incidents: this.trafficIncidents.size,
            cacheHitRate: this.cache.getHitRate(),
            lastUpdated: Date.now()
        };
    }
    /**
     * Get historical traffic data for a location
     * @param location Location to get historical data for
     * @param hours Number of hours of historical data to retrieve
     * @returns Array of historical traffic data points
     */
    getHistoricalTrafficData(location, hours = 24) {
        // In a real implementation, this would fetch historical data from a database
        // For now, we'll generate some mock historical data
        const now = Date.now();
        const result = [];
        // Generate data points at 15-minute intervals
        for (let i = 0; i < hours * 4; i++) {
            const timestamp = now - (i * 15 * 60 * 1000);
            // Random severity weighted towards moderate values
            const severityRand = Math.random();
            let severity;
            if (severityRand < 0.2) {
                severity = TrafficSeverity.LOW;
            }
            else if (severityRand < 0.6) {
                severity = TrafficSeverity.MODERATE;
            }
            else if (severityRand < 0.9) {
                severity = TrafficSeverity.HIGH;
            }
            else {
                severity = TrafficSeverity.SEVERE;
            }
            // Speed based on severity
            let speed;
            switch (severity) {
                case TrafficSeverity.LOW:
                    speed = 40 + Math.random() * 20; // 40-60 km/h
                    break;
                case TrafficSeverity.MODERATE:
                    speed = 20 + Math.random() * 20; // 20-40 km/h
                    break;
                case TrafficSeverity.HIGH:
                    speed = 10 + Math.random() * 10; // 10-20 km/h
                    break;
                case TrafficSeverity.SEVERE:
                    speed = Math.random() * 10; // 0-10 km/h
                    break;
                default:
                    speed = 50; // Default
            }
            result.push({
                timestamp,
                severity,
                speed: Math.round(speed),
                confidence: 0.7 + Math.random() * 0.3 // 0.7-1.0
            });
        }
        return result;
    }
    /**
     * Get active predictions count
     * @returns Number of active predictions
     */
    getActivePredictionsCount() {
        return this.trafficPredictions.size;
    }
    /**
     * Get accuracy metrics for predictions
     * @returns Accuracy metrics
     */
    getAccuracyMetrics() {
        // In a real implementation, this would compare predictions to actual outcomes
        // For now, we'll return a mock value
        return {
            accuracy: 0.85 + (Math.random() * 0.1) // 85-95% accuracy
        };
    }
    /**
     * Get response time metrics
     * @returns Response time metrics
     */
    getResponseTimeMetrics() {
        // In a real implementation, this would measure actual response times
        // For now, we'll return a mock value
        return {
            averageResponseTime: 100 + Math.random() * 400 // 100-500ms
        };
    }
    /**
     * Get critical alerts count
     * @returns Number of critical alerts
     */
    getCriticalAlertsCount() {
        // Count incidents with SEVERE severity
        let count = 0;
        for (const incident of this.trafficIncidents.values()) {
            if (incident.severity === TrafficSeverity.SEVERE) {
                count++;
            }
        }
        return count;
    }
    /**
     * Get traffic alerts
     * @returns Array of traffic alerts
     */
    getTrafficAlerts() {
        // In a real implementation, this would return actual alerts from a database
        // For now, we'll convert severe incidents to alerts
        const alerts = [];
        for (const incident of this.trafficIncidents.values()) {
            if (incident.severity === TrafficSeverity.HIGH || incident.severity === TrafficSeverity.SEVERE) {
                alerts.push({
                    id: incident.id,
                    type: incident.type,
                    location: incident.location,
                    severity: incident.severity,
                    timestamp: Date.now(),
                    message: incident.description,
                    expiresAt: incident.endTime || (Date.now() + 3600000) // 1 hour from now if no end time
                });
            }
        }
        return alerts;
    }
}
exports.TrafficDataService = TrafficDataService;
// Export singleton instance
exports.trafficDataService = new TrafficDataService();
