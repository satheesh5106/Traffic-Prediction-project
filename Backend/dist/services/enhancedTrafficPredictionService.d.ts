/**
 * Enhanced Traffic Prediction Service
 * Integrates advanced DSA algorithms for high-accuracy predictions
 */
interface TrafficPrediction {
    id: string;
    location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    timestamp: number;
    predictions: {
        current: TrafficLevel;
        next15min: TrafficLevel;
        next30min: TrafficLevel;
        next60min: TrafficLevel;
    };
    confidence: number;
    factors: PredictionFactor[];
    historicalPattern: HistoricalPattern;
    alerts?: TrafficAlert[];
}
interface TrafficLevel {
    level: 'low' | 'medium' | 'high' | 'severe';
    speed: number;
    congestion: number;
    volume: number;
    travelTimeIndex: number;
}
interface PredictionFactor {
    type: 'weather' | 'event' | 'construction' | 'accident' | 'time_of_day' | 'day_of_week';
    impact: number;
    confidence: number;
    description: string;
}
interface HistoricalPattern {
    averageSpeed: number;
    peakHours: Array<{
        hour: number;
        congestion: number;
    }>;
    weeklyPattern: Array<{
        day: number;
        avgCongestion: number;
    }>;
    seasonalTrend: number;
}
interface TrafficAlert {
    id: string;
    type: 'congestion' | 'incident' | 'weather' | 'construction';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    estimatedDuration: number;
    affectedArea: {
        center: [number, number];
        radius: number;
    };
}
interface PredictionStats {
    lastUpdated: number;
    activePredictions: number;
    accuracy: number;
    criticalAlerts: number;
    totalPredictions: number;
}
interface LiveTrafficData {
    location: [number, number];
    speed: number;
    volume: number;
    timestamp: number;
    source: 'sensor' | 'gps' | 'camera' | 'mobile';
}
interface HistoricalTrafficData {
    location: [number, number];
    timeframe: 'hour' | 'day' | 'week' | 'month';
    data: Array<{
        timestamp: number;
        avgSpeed: number;
        avgVolume: number;
        congestionLevel: number;
    }>;
}
export declare class EnhancedTrafficPredictionService {
    private spatialIndex;
    private predictionCache;
    private liveDataCache;
    private historicalDataCache;
    private stats;
    private activePredictions;
    private predictionModels;
    constructor();
    /**
     * Get traffic prediction for specific location
     */
    getTrafficPrediction(lat: number, lng: number, radius?: number): Promise<TrafficPrediction>;
    /**
     * Get live traffic data for area
     */
    getLiveTrafficData(lat: number, lng: number, radius?: number): Promise<LiveTrafficData[]>;
    /**
     * Get historical traffic data
     */
    getHistoricalTrafficData(lat: number, lng: number, timeframe?: 'hour' | 'day' | 'week' | 'month'): Promise<HistoricalTrafficData>;
    /**
     * Get traffic incidents in area
     */
    getTrafficIncidents(lat: number, lng: number, radius?: number): Promise<any[]>;
    /**
     * Get prediction statistics
     */
    getTrafficStats(): PredictionStats;
    /**
     * Get active traffic alerts
     */
    getTrafficAlerts(lat?: number, lng?: number, radius?: number): TrafficAlert[];
    private generatePrediction;
    private calculateCurrentTrafficLevel;
    private predictTrafficLevel;
    private calculatePredictionConfidence;
    private identifyPredictionFactors;
    private generateTrafficAlerts;
    private getHistoricalPattern;
    private generateHistoricalData;
    private categorizeCongestionLevel;
    private createTrafficLevelFromSpeed;
    private simulateCurrentSpeed;
    private simulateCurrentVolume;
    private getWeatherImpact;
    private reverseGeocode;
    private generatePredictionCacheKey;
    private isCacheValid;
    private updateStats;
    private initializePredictionModels;
    private startRealTimeUpdates;
    private updateActivePredictions;
}
export declare const enhancedTrafficPredictionService: EnhancedTrafficPredictionService;
export {};
