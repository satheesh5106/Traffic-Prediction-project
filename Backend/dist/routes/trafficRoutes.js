"use strict";
/**
 * Traffic API Routes
 *
 * Defines API endpoints for traffic prediction and data.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const trafficController = __importStar(require("../controllers/trafficController"));
const router = express_1.default.Router();
// City coordinates mapping
const CITY_COORDINATES = {
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
router.get('/live/:city', (req, res, next) => {
    const city = req.params.city.toLowerCase();
    const coordinates = CITY_COORDINATES[city];
    if (!coordinates) {
        return res.status(400).json({ error: `City '${req.params.city}' not supported` });
    }
    // Add coordinates to request params and call the existing controller
    req.params.lat = coordinates.lat.toString();
    req.params.lng = coordinates.lng.toString();
    req.params.radius = '5000'; // Default 5km radius for cities
    trafficController.getTrafficPrediction(req, res);
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
router.get('/historical/:city', (req, res, next) => {
    const city = req.params.city.toLowerCase();
    const coordinates = CITY_COORDINATES[city];
    if (!coordinates) {
        return res.status(400).json({ error: `City '${req.params.city}' not supported` });
    }
    // Add coordinates to request params and call the existing controller
    req.params.lat = coordinates.lat.toString();
    req.params.lng = coordinates.lng.toString();
    req.params.timeframe = '24h'; // Default timeframe
    trafficController.getHistoricalTraffic(req, res);
});
/**
 * @route   GET /api/traffic/predicted/:city
 * @desc    Get predicted traffic data for city
 * @access  Private
 */
router.get('/predicted/:city', (req, res, next) => {
    const city = req.params.city.toLowerCase();
    const coordinates = CITY_COORDINATES[city];
    if (!coordinates) {
        return res.status(400).json({ error: `City '${req.params.city}' not supported` });
    }
    // Add coordinates to request params and call the existing controller
    req.params.lat = coordinates.lat.toString();
    req.params.lng = coordinates.lng.toString();
    req.params.radius = '5000'; // Default 5km radius for cities
    trafficController.getTrafficPrediction(req, res);
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
exports.default = router;
//# sourceMappingURL=trafficRoutes.js.map