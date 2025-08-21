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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const trafficController = __importStar(require("../controllers/trafficController"));
const router = express_1.default.Router();
/**
 * @route   POST /api/traffic/predict
 * @desc    Get traffic prediction for a location
 * @access  Private
 */
router.post('/predict', trafficController.getPrediction);
/**
 * @route   GET /api/traffic/live/:lat/:lng/:radius?
 * @desc    Get live traffic data for a location
 * @access  Private
 */
router.get('/live/:lat/:lng/:radius?', trafficController.getLiveTraffic);
/**
 * @route   GET /api/traffic/historical/:lat/:lng/:timeframe?
 * @desc    Get historical traffic data for a location
 * @access  Private
 */
router.get('/historical/:lat/:lng/:timeframe?', trafficController.getHistoricalTraffic);
/**
 * @route   GET /api/traffic/incidents
 * @desc    Get traffic incidents
 * @access  Private
 */
router.get('/incidents', trafficController.getTrafficIncidents);
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
