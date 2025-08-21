/**
 * Traffic Controller
 * 
 * Handles API endpoints for traffic prediction and data.
 */

import { Request, Response } from 'express';
import { trafficDataService, TrafficSeverity, TrafficData, TrafficPrediction } from '../services/trafficDataService';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { GeoPoint } from '../utils/geo';

/**
 * Get traffic prediction for a location
 * @param req Request
 * @param res Response
 */
export async function getPrediction(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, radius } = req.body;
    
    if (!lat || !lng) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }
    
    const location: GeoPoint = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const searchRadius = radius ? parseFloat(radius) : 500; // Default 500m radius
    
    // Check cache first
    const cacheKey = `prediction:${lat}:${lng}:${searchRadius}`;
    const cachedPrediction = cache.get<TrafficPrediction>(cacheKey);
    
    if (cachedPrediction) {
      logger.info(`Returning cached prediction for ${lat},${lng}`);
      res.json(cachedPrediction);
      return;
    }
    
    // Get prediction from service
    const prediction = trafficDataService.getTrafficPredictionAtLocation(location, searchRadius);
    
    if (!prediction) {
      res.status(404).json({ error: 'No traffic prediction available for this location' });
      return;
    }
    
    // Cache the result
    cache.set(cacheKey, prediction, 5 * 60 * 1000); // 5 minutes
    
    logger.info(`Traffic prediction retrieved for ${lat},${lng}`);
    res.json(prediction);
  } catch (error) {
    logger.error('Error getting traffic prediction', error);
    res.status(500).json({ error: 'Failed to get traffic prediction' });
  }
}

/**
 * Get live traffic data for a location
 * @param req Request
 * @param res Response
 */
export async function getLiveTraffic(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, radius } = req.params;
    
    if (!lat || !lng) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }
    
    const location: GeoPoint = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const searchRadius = radius ? parseFloat(radius) : 500; // Default 500m radius
    
    // Check cache first
    const cacheKey = `liveTraffic:${lat}:${lng}:${searchRadius}`;
    const cachedTraffic = cache.get<TrafficData>(cacheKey);
    
    if (cachedTraffic) {
      logger.info(`Returning cached live traffic for ${lat},${lng}`);
      res.json(cachedTraffic);
      return;
    }
    
    // Get traffic data from service
    const trafficData = trafficDataService.getTrafficDataAtLocation(location, searchRadius);
    
    if (!trafficData) {
      res.status(404).json({ error: 'No traffic data available for this location' });
      return;
    }
    
    // Cache the result
    cache.set(cacheKey, trafficData, 60 * 1000); // 1 minute
    
    logger.info(`Live traffic data retrieved for ${lat},${lng}`);
    res.json(trafficData);
  } catch (error) {
    logger.error('Error getting live traffic data', error);
    res.status(500).json({ error: 'Failed to get live traffic data' });
  }
}

/**
 * Get historical traffic data for a location
 * @param req Request
 * @param res Response
 */
export async function getHistoricalTraffic(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, timeframe } = req.params;
    
    if (!lat || !lng) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }
    
    const location: GeoPoint = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const historyTimeframe = timeframe ? parseInt(timeframe) : 24; // Default 24 hours
    
    // Check cache first
    const cacheKey = `historicalTraffic:${lat}:${lng}:${historyTimeframe}`;
    const cachedHistory = cache.get<any>(cacheKey);
    
    if (cachedHistory) {
      logger.info(`Returning cached historical traffic for ${lat},${lng}`);
      res.json(cachedHistory);
      return;
    }
    
    // Get historical data from service
    const historicalData = trafficDataService.getHistoricalTrafficData(location, historyTimeframe);
    
    if (!historicalData || historicalData.length === 0) {
      res.status(404).json({ error: 'No historical traffic data available for this location' });
      return;
    }
    
    // Cache the result
    cache.set(cacheKey, historicalData, 30 * 60 * 1000); // 30 minutes
    
    logger.info(`Historical traffic data retrieved for ${lat},${lng}`);
    res.json({
      location,
      timeframe: historyTimeframe,
      data: historicalData,
      count: historicalData.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting historical traffic data', error);
    res.status(500).json({ error: 'Failed to get historical traffic data' });
  }
}

/**
 * Get traffic incidents
 * @param req Request
 * @param res Response
 */
export async function getTrafficIncidents(req: Request, res: Response): Promise<void> {
  try {
    const incidents = trafficDataService.getAllTrafficIncidents();
    
    logger.info(`Retrieved ${incidents.length} traffic incidents`);
    res.json(incidents);
  } catch (error) {
    logger.error('Error getting traffic incidents', error);
    res.status(500).json({ error: 'Failed to get traffic incidents' });
  }
}

/**
 * Get traffic statistics
 * @param req Request
 * @param res Response
 */
export async function getTrafficStats(req: Request, res: Response): Promise<void> {
  try {
    // Get current time
    const now = Date.now();
    
    // Get active predictions count
    const activePredictions = trafficDataService.getActivePredictionsCount();
    
    // Get accuracy metrics
    const accuracyMetrics = trafficDataService.getAccuracyMetrics();
    
    // Get response time metrics
    const responseTimeMetrics = trafficDataService.getResponseTimeMetrics();
    
    // Get critical alerts count
    const criticalAlerts = trafficDataService.getCriticalAlertsCount();
    
    const stats = {
      lastUpdated: now,
      activePredictions,
      accuracy: accuracyMetrics.accuracy,
      responseTime: responseTimeMetrics.averageResponseTime,
      criticalAlerts
    };
    
    logger.info('Traffic statistics retrieved');
    res.json(stats);
  } catch (error) {
    logger.error('Error getting traffic statistics', error);
    res.status(500).json({ error: 'Failed to get traffic statistics' });
  }
}

/**
 * Get traffic alerts
 * @param req Request
 * @param res Response
 */
export async function getTrafficAlerts(req: Request, res: Response): Promise<void> {
  try {
    const alerts = trafficDataService.getTrafficAlerts();
    
    logger.info(`Retrieved ${alerts.length} traffic alerts`);
    res.json({
      alerts,
      count: alerts.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting traffic alerts', error);
    res.status(500).json({ error: 'Failed to get traffic alerts' });
  }
}