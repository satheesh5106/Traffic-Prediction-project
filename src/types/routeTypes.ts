/**
 * Route Types
 * 
 * Type definitions for route optimization functionality.
 */

import { TrafficInfo } from './trafficTypes';

export interface RouteRequest {
  start: any;
  destination?: any;
  end: any; // For compatibility with controller
  priority?: any;
  vehicleType?: any;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
  alternatives?: boolean;
  requestedAlgorithm?: any;
}

export interface RouteSegment {
  id: string;
  startNode: string;
  endNode: string;
  distance: number; // meters
  baseTime: number; // seconds without traffic
  currentTime: number; // seconds with current traffic
  trafficLevel: 'light' | 'moderate' | 'heavy';
  coordinates: Array<{ lat: number; lng: number }>;
  type: 'highway' | 'major_road' | 'street' | 'path';
  tollCost?: number;
  speedLimit?: number;
}

export interface RouteOption {
  id: string;
  name: string;
  time: string;
  distance: string;
  fuel: string;
  traffic: 'light' | 'moderate' | 'heavy';
  color: string;
  coordinates: Array<{ lat: number; lng: number }>;
  polyline: string;
  eta: string;
  arrivalTime: string;
  trafficDelays: number; // in seconds
  tollCost?: number;
  co2Emissions?: number;
  algorithm: 'dijkstra' | 'astar' | 'bellmanford';
  confidence: number; // prediction confidence 0-100%
  alternativeOf?: string; // ID of the main route if this is an alternative
  segments?: Array<{
    id: string;
    distance: string;
    time: string;
    traffic: 'light' | 'moderate' | 'heavy';
    startCoordinate: { lat: number; lng: number };
    endCoordinate: { lat: number; lng: number };
  }>;
}

export interface OptimizationMetrics {
  routesOptimized: number;
  timeSaved: string;
  fuelEfficiency: string;
  activeRoutes: number;
  averageResponseTime: string;
  optimizationAccuracy: string;
  lastPolledTime: string;
  co2Saved: string;
  trafficAvoidanceRate: string;
  serverLoad: number;
  cacheHitRate: number;
}

export interface RouteResult {
  id: string;
  options: RouteOption[];
  recommendedRoute: RouteOption;
  startPointTraffic?: TrafficInfo;
  endPointTraffic?: TrafficInfo;
  timestamp: number;
  executionTime?: number;
  segments?: RouteSegment[];
}

export interface VehicleType {
  id: string;
  name: string;
  fuelEfficiency: number; // km/L
  speedFactor: number; // relative speed
  description: string;
  icon: string;
}