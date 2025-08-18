"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const errorHandler_1 = require("../middleware/errorHandler");
const trafficController_1 = require("../controllers/trafficController");
const routeController_1 = require("../controllers/routeController");
const router = (0, express_1.Router)();
// Traffic prediction routes
router.post('/traffic-prediction', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(trafficController_1.getTrafficPrediction));
router.get('/traffic-stats', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(trafficController_1.getTrafficStats));
router.get('/traffic-history/:locationId', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(trafficController_1.getHistoricalTraffic));
router.get('/traffic-alerts', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(trafficController_1.getTrafficAlerts));
// Route optimization routes
router.post('/optimize-route', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(routeController_1.optimizeRoute));
router.post('/route-options', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(routeController_1.getRouteOptions));
router.get('/route-stats', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(routeController_1.getRouteStats));
router.get('/active-routes', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(routeController_1.getActiveRoutes));
exports.default = router;
//# sourceMappingURL=apiRoutes.js.map