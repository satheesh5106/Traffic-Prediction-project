export declare class WeatherService {
    private openWeatherApiKey;
    private imdNowcastApiUrl;
    private cacheTimeout;
    private weatherCache;
    private alertsCache;
    constructor();
    /**
     * Get weather data for a location
     */
    getWeatherData(latitude: number, longitude: number): Promise<any>;
    /**
     * Get weather alerts for a location
     */
    getWeatherAlerts(latitude: number, longitude: number): Promise<any>;
    /**
     * Get IMD Nowcast warnings
     */
    getIMDNowcastWarnings(): Promise<any>;
    /**
     * Generate simulated weather data
     */
    private generateSimulatedWeatherData;
    /**
     * Generate a simulated weather alert
     */
    private generateSimulatedWeatherAlert;
    /**
     * Map alert type to severity level
     */
    private mapAlertSeverity;
    /**
     * Get weather description based on condition
     */
    private getWeatherDescription;
    /**
     * Helper method for weighted random selection
     */
    private weightedRandom;
}
