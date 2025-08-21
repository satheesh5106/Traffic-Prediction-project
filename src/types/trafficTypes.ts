/**
 * Traffic Types
 * 
 * Type definitions for traffic prediction functionality.
 */

export enum TrafficSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TrafficData {
  id: string;
  location: GeoPoint;
  coordinates: GeoPoint;
  severity: TrafficSeverity;
  speed: number; // km/h
  timestamp: number;
  description?: string;
}

export interface TrafficIncident {
  id: string;
  type: 'ACCIDENT' | 'CONSTRUCTION' | 'LANE_CLOSED' | 'ROAD_CLOSED' | 'CONGESTION' | 'POLICE' | 'HAZARD';
  description: string;
  location: GeoPoint;
  severity: TrafficSeverity;
  startTime: number;
  endTime?: number;
  source: string;
}

export interface TrafficPrediction {
  id: string;
  location: GeoPoint;
  prediction: string;
  confidence: number;
  time: string;
  severity: TrafficSeverity;
  timestamp: number;
}

export interface TrafficInfo {
  severity: TrafficSeverity;
  speed: number;
  confidence: number;
}

export interface TrafficAlert {
  id: string;
  type: string;
  severity: TrafficSeverity;
  location: GeoPoint;
  message: string;
  timestamp: number;
  expiresAt: number;
}

export interface TrafficStatistics {
  lastUpdated: number;
  activePredictions: number;
  accuracy: number;
  responseTime: number;
  criticalAlerts: number;
  trafficVolume: {
    light: number;
    moderate: number;
    heavy: number;
    critical: number;
  };
}