/**
 * Traffic API Routes
 * 
 * Defines API endpoints for traffic prediction and data.
 */

import express, { Request, Response, NextFunction } from 'express';
import * as trafficController from '../controllers/trafficController';

// Extend Request interface to include additional params
interface ExtendedRequest extends Request {
  params: {
    [key: string]: string;
  };
}

const router = express.Router();

// City coordinates mapping
const CITY_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  surat: { lat: 21.1702, lng: 72.8311 }
};

/**
 * @route   POST /api/traffic/predict
 * @desc    Get traffic prediction for a location
 * @access  Private
 */
router.post('/predict', trafficController.getTrafficPrediction);

/**
 * @route   GET /api/traffic/live/:lat/:lng/:radius?
 * @desc    Get live traffic data for coordinates
 * @access  Private
 */
router.get('/live/:lat/:lng/:radius?', trafficController.getTrafficPrediction);

/**
 * @route   GET /api/traffic/live/:city
 * @desc    Get live traffic data for city
 * @access  Private
 */
router.get('/live/:city', (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const city = req.params.city!.toLowerCase();
  const coordinates = CITY_COORDINATES[city];
  
  if (!coordinates) {
    return res.status(400).json({ error: `City '${req.params.city}' not supported` });
  }
  
  // Add coordinates to request params and call the existing controller
  req.params.lat = coordinates.lat.toString();
  req.params.lng = coordinates.lng.toString();
  req.params.radius = '5000'; // Default 5km radius for cities
  
  trafficController.getTrafficPrediction(req as any, res);
});

/**
 * @route   GET /api/traffic/historical/:lat/:lng/:timeframe?
 * @desc    Get historical traffic data
 * @access  Private
 */
router.get('/historical/:lat/:lng/:timeframe?', trafficController.getHistoricalTraffic);

/**
 * @route   GET /api/traffic/historical/:city
 * @desc    Get historical traffic data for city
 * @access  Private
 */
router.get('/historical/:city', (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const city = req.params.city!.toLowerCase();
  const coordinates = CITY_COORDINATES[city];
  
  if (!coordinates) {
    return res.status(400).json({ error: `City '${req.params.city}' not supported` });
  }
  
  // Add coordinates to request params and call the existing controller
  req.params.lat = coordinates.lat.toString();
  req.params.lng = coordinates.lng.toString();
  req.params.timeframe = '24h'; // Default timeframe
  
  trafficController.getHistoricalTraffic(req as any, res);
});

/**
 * @route   GET /api/traffic/predicted/:city
 * @desc    Get predicted traffic data for city
 * @access  Private
 */
router.get('/predicted/:city', (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const city = req.params.city!.toLowerCase();
  const coordinates = CITY_COORDINATES[city];
  
  if (!coordinates) {
    return res.status(400).json({ error: `City '${req.params.city}' not supported` });
  }
  
  // Add coordinates to request params and call the existing controller
  req.params.lat = coordinates.lat.toString();
  req.params.lng = coordinates.lng.toString();
  req.params.radius = '5000'; // Default 5km radius for cities
  
  trafficController.getTrafficPrediction(req as any, res);
});

/**
 * @route   GET /api/traffic/incidents
 * @desc    Get traffic incidents
 * @access  Private
 */
router.get('/incidents', trafficController.getTrafficAlerts);

/**
 * @route   GET /api/traffic/stats
 * @desc    Get traffic statistics
 * @access  Private
 */
router.get('/stats', trafficController.getTrafficStats);

/**
 * @route   GET /api/traffic/alerts
 * @desc    Get traffic alerts
 * @access  Private
 */
router.get('/alerts', trafficController.getTrafficAlerts);

export default router;