import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import {
  getTrafficPrediction,
  getTrafficStats,
  getHistoricalTraffic,
  getTrafficAlerts
} from '../controllers/trafficController';
import {
  optimizeRoute,
  getRouteOptions,
  getRouteStats,
  getActiveRoutes
} from '../controllers/routeController';

const router = Router();

// Traffic prediction routes
router.post('/traffic-prediction', protect, asyncHandler(getTrafficPrediction));
router.get('/traffic-stats', protect, asyncHandler(getTrafficStats));
router.get('/traffic-history/:locationId', protect, asyncHandler(getHistoricalTraffic));
router.get('/traffic-alerts', protect, asyncHandler(getTrafficAlerts));

// Route optimization routes
router.post('/optimize-route', protect, asyncHandler(optimizeRoute));
router.post('/route-options', protect, asyncHandler(getRouteOptions));
router.get('/route-stats', protect, asyncHandler(getRouteStats));
router.get('/active-routes', protect, asyncHandler(getActiveRoutes));

export default router;