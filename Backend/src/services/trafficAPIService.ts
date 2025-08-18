import axios from 'axios';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

export class TrafficAPIService {
  private mapMyIndiaApiKey: string;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private trafficCache: Map<string, { data: any, timestamp: number }>;
  private incidentsCache: Map<string, { data: any, timestamp: number }>;

  constructor() {
    this.mapMyIndiaApiKey = process.env.MAPMYINDIA_API_KEY || '';
    this.trafficCache = new Map();
    this.incidentsCache = new Map();
    
    if (!this.mapMyIndiaApiKey) {
      logger.warn('MapMyIndia API key not set. Traffic data will be simulated.');
    }
  }

  /**
   * Get live traffic data for a location
   */
  async getLiveTraffic(latitude: number, longitude: number, radius: number = 2000) {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${radius}`;
    
    // Check cache first
    const cachedData = this.trafficCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTimeout) {
      return cachedData.data;
    }
    
    try {
      let trafficData;
      
      if (this.mapMyIndiaApiKey) {
        // Fetch from MapMyIndia Traffic API
        const response = await axios.get(
          `https://apis.mappls.com/advancedmaps/v1/${this.mapMyIndiaApiKey}/traffic_flow?lat=${latitude}&lng=${longitude}&radius=${radius}`,
          { timeout: 5000 }
        );
        
        trafficData = this.processMapMyIndiaResponse(response.data);
      } else {
        // Generate simulated traffic data
        trafficData = this.generateSimulatedTrafficData(latitude, longitude);
      }
      
      // Cache the data
      this.trafficCache.set(cacheKey, {
        data: trafficData,
        timestamp: Date.now()
      });
      
      return trafficData;
    } catch (error) {
      logger.error('Error fetching live traffic data:', error);
      
      // Return simulated data as fallback
      const fallbackData = this.generateSimulatedTrafficData(latitude, longitude);
      
      // Cache the fallback data with shorter timeout
      this.trafficCache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now() - (this.cacheTimeout / 2) // Set to expire sooner
      });
      
      return fallbackData;
    }
  }

  /**
   * Get traffic incidents for a location
   */
  async getTrafficIncidents(latitude: number, longitude: number, radius: number = 5000) {
    const cacheKey = `incidents_${latitude.toFixed(4)},${longitude.toFixed(4)},${radius}`;
    
    // Check cache first
    const cachedData = this.incidentsCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTimeout) {
      return cachedData.data;
    }
    
    try {
      let incidentsData = [];
      
      if (this.mapMyIndiaApiKey) {
        // Fetch from MapMyIndia Traffic Incidents API
        const response = await axios.get(
          `https://apis.mappls.com/advancedmaps/v1/${this.mapMyIndiaApiKey}/traffic_incidents?lat=${latitude}&lng=${longitude}&radius=${radius}`,
          { timeout: 5000 }
        );
        
        incidentsData = this.processMapMyIndiaIncidentsResponse(response.data);
      } else {
        // Generate simulated incidents data
        incidentsData = this.generateSimulatedIncidents(latitude, longitude);
      }
      
      // Cache the data
      this.incidentsCache.set(cacheKey, {
        data: incidentsData,
        timestamp: Date.now()
      });
      
      return incidentsData;
    } catch (error) {
      logger.error('Error fetching traffic incidents:', error);
      
      // Return simulated data as fallback
      const fallbackData = this.generateSimulatedIncidents(latitude, longitude);
      
      // Cache the fallback data
      this.incidentsCache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now()
      });
      
      return fallbackData;
    }
  }

  /**
   * Process MapMyIndia traffic flow response
   */
  private processMapMyIndiaResponse(responseData: any) {
    try {
      // This is a placeholder implementation as the actual API response format may vary
      // Adjust according to the actual MapMyIndia API response structure
      
      if (!responseData || !responseData.data) {
        throw new Error('Invalid response format');
      }
      
      const trafficData = responseData.data;
      
      return {
        congestionLevel: this.mapCongestionLevel(trafficData.congestion || 0),
        averageSpeed: trafficData.speed || 40,
        density: this.mapTrafficDensity(trafficData.density || 0),
        freeFlowSpeed: trafficData.freeFlowSpeed || 60,
        jamFactor: trafficData.jamFactor || 0,
        confidence: trafficData.confidence || 0.8,
        roadSegments: trafficData.segments || [],
        timestamp: new Date(),
        source: 'mapmyindia'
      };
    } catch (error) {
      logger.error('Error processing MapMyIndia response:', error);
      throw new Error('Failed to process traffic data');
    }
  }

  /**
   * Process MapMyIndia traffic incidents response
   */
  private processMapMyIndiaIncidentsResponse(responseData: any) {
    try {
      // This is a placeholder implementation as the actual API response format may vary
      // Adjust according to the actual MapMyIndia API response structure
      
      if (!responseData || !responseData.data || !Array.isArray(responseData.data)) {
        return [];
      }
      
      return responseData.data.map((incident: any) => ({
        type: incident.type || 'unknown',
        description: incident.description || 'Traffic incident',
        location: {
          latitude: incident.latitude || 0,
          longitude: incident.longitude || 0
        },
        severity: incident.severity || 'moderate',
        startTime: new Date(incident.startTime || Date.now()),
        endTime: incident.endTime ? new Date(incident.endTime) : null,
        source: 'mapmyindia'
      }));
    } catch (error) {
      logger.error('Error processing MapMyIndia incidents response:', error);
      return [];
    }
  }

  /**
   * Generate simulated traffic data
   */
  private generateSimulatedTrafficData(latitude: number, longitude: number) {
    // Get current hour to simulate time-based traffic patterns
    const hour = new Date().getHours();
    
    // Simulate rush hour patterns
    let congestionBase = 0.5; // Default medium congestion
    let speedFactor = 0.7; // Default speed factor
    
    // Morning rush hour (7-10 AM)
    if (hour >= 7 && hour <= 10) {
      congestionBase = 0.7 + Math.random() * 0.2;
      speedFactor = 0.5 - Math.random() * 0.2;
    }
    // Evening rush hour (4-7 PM)
    else if (hour >= 16 && hour <= 19) {
      congestionBase = 0.8 + Math.random() * 0.2;
      speedFactor = 0.4 - Math.random() * 0.2;
    }
    // Late night (11 PM - 5 AM)
    else if (hour >= 23 || hour <= 5) {
      congestionBase = 0.2 + Math.random() * 0.2;
      speedFactor = 0.9 - Math.random() * 0.1;
    }
    // Regular daytime
    else {
      congestionBase = 0.4 + Math.random() * 0.3;
      speedFactor = 0.7 - Math.random() * 0.2;
    }
    
    // Add some randomness
    const congestion = Math.min(1, Math.max(0, congestionBase + (Math.random() * 0.2 - 0.1)));
    
    // Calculate average speed (km/h) based on speed factor
    const averageSpeed = Math.round(60 * speedFactor);
    
    // Map congestion to text level
    const congestionLevel = this.mapCongestionLevel(congestion);
    
    // Map to traffic density
    const density = this.mapTrafficDensity(congestion);
    
    // Generate jam factor (0-10 scale)
    const jamFactor = Math.round(congestion * 10);
    
    return {
      congestionLevel,
      averageSpeed,
      density,
      freeFlowSpeed: 60,
      jamFactor,
      confidence: 0.7 + Math.random() * 0.2,
      roadSegments: this.generateSimulatedRoadSegments(latitude, longitude, congestion),
      timestamp: new Date(),
      source: 'simulated'
    };
  }

  /**
   * Generate simulated road segments with traffic data
   */
  private generateSimulatedRoadSegments(latitude: number, longitude: number, baseCongestion: number) {
    const segments = [];
    const numSegments = 3 + Math.floor(Math.random() * 5); // 3-7 segments
    
    for (let i = 0; i < numSegments; i++) {
      // Slightly vary the congestion for each segment
      const segmentCongestion = Math.min(1, Math.max(0, baseCongestion + (Math.random() * 0.4 - 0.2)));
      
      // Calculate speed based on congestion
      const speed = Math.round(60 * (1 - segmentCongestion * 0.8));
      
      // Generate segment coordinates (simplified)
      const startLat = latitude + (Math.random() * 0.01 - 0.005);
      const startLng = longitude + (Math.random() * 0.01 - 0.005);
      const endLat = startLat + (Math.random() * 0.01 - 0.005);
      const endLng = startLng + (Math.random() * 0.01 - 0.005);
      
      segments.push({
        id: `seg_${i}`,
        name: `Road Segment ${i + 1}`,
        congestion: segmentCongestion,
        speed,
        length: Math.round(100 + Math.random() * 900), // 100-1000 meters
        coordinates: [
          { latitude: startLat, longitude: startLng },
          { latitude: endLat, longitude: endLng }
        ]
      });
    }
    
    return segments;
  }

  /**
   * Generate simulated traffic incidents
   */
  private generateSimulatedIncidents(latitude: number, longitude: number) {
    const incidents = [];
    
    // Randomly decide if there are any incidents (30% chance)
    if (Math.random() < 0.3) {
      const numIncidents = 1 + Math.floor(Math.random() * 3); // 1-3 incidents
      
      const incidentTypes = [
        'ACCIDENT',
        'CONSTRUCTION',
        'LANE_CLOSED',
        'ROAD_CLOSED',
        'CONGESTION',
        'POLICE',
        'HAZARD'
      ];
      
      for (let i = 0; i < numIncidents; i++) {
        // Generate incident location near the requested coordinates
        const incidentLat = latitude + (Math.random() * 0.02 - 0.01);
        const incidentLng = longitude + (Math.random() * 0.02 - 0.01);
        
        // Select random incident type
        const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
        
        // Generate description based on type
        const description = this.getIncidentDescription(type);
        
        // Generate severity
        const severities = ['minor', 'moderate', 'severe'];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        
        // Generate start and end times
        const startTime = new Date(Date.now() - Math.floor(Math.random() * 3600000)); // Up to 1 hour ago
        const endTime = new Date(Date.now() + Math.floor(Math.random() * 7200000)); // Up to 2 hours from now
        
        incidents.push({
          type,
          description,
          location: {
            latitude: incidentLat,
            longitude: incidentLng
          },
          severity,
          startTime,
          endTime,
          source: 'simulated'
        });
      }
    }
    
    return incidents;
  }

  /**
   * Map numeric congestion value to text level
   */
  private mapCongestionLevel(congestion: number): string {
    if (congestion < 0.3) return 'low';
    if (congestion < 0.6) return 'medium';
    if (congestion < 0.8) return 'high';
    return 'severe';
  }

  /**
   * Map congestion to traffic density
   */
  private mapTrafficDensity(congestion: number): string {
    if (congestion < 0.3) return 'light';
    if (congestion < 0.7) return 'moderate';
    return 'heavy';
  }

  /**
   * Get description for incident type
   */
  private getIncidentDescription(type: string): string {
    switch (type) {
      case 'ACCIDENT':
        return 'Traffic accident reported. Expect delays.';
      case 'CONSTRUCTION':
        return 'Road construction in progress. Reduced lanes available.';
      case 'LANE_CLOSED':
        return 'One or more lanes closed due to incident.';
      case 'ROAD_CLOSED':
        return 'Road closed. Seek alternative route.';
      case 'CONGESTION':
        return 'Heavy traffic congestion reported.';
      case 'POLICE':
        return 'Police activity in the area.';
      case 'HAZARD':
        return 'Road hazard reported. Drive with caution.';
      default:
        return 'Traffic incident reported.';
    }
  }
}