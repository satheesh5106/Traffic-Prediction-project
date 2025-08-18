export declare class TrafficAPIService {
    private mapMyIndiaApiKey;
    private cacheTimeout;
    private trafficCache;
    private incidentsCache;
    constructor();
    /**
     * Get live traffic data for a location
     */
    getLiveTraffic(latitude: number, longitude: number, radius?: number): Promise<any>;
    /**
     * Get traffic incidents for a location
     */
    getTrafficIncidents(latitude: number, longitude: number, radius?: number): Promise<any>;
    /**
     * Process MapMyIndia traffic flow response
     */
    private processMapMyIndiaResponse;
    /**
     * Process MapMyIndia traffic incidents response
     */
    private processMapMyIndiaIncidentsResponse;
    /**
     * Generate simulated traffic data
     */
    private generateSimulatedTrafficData;
    /**
     * Generate simulated road segments with traffic data
     */
    private generateSimulatedRoadSegments;
    /**
     * Generate simulated traffic incidents
     */
    private generateSimulatedIncidents;
    /**
     * Map numeric congestion value to text level
     */
    private mapCongestionLevel;
    /**
     * Map congestion to traffic density
     */
    private mapTrafficDensity;
    /**
     * Get description for incident type
     */
    private getIncidentDescription;
}
