"use strict";
/**
 * Route API Routes
 *
 * Defines API endpoints for route optimization and traffic data.
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
const routeController = __importStar(require("../controllers/routeController"));
const router = express_1.default.Router();
/**
 * @route   POST /api/routes/optimize
 * @desc    Optimize a route between two points
 * @access  Private
 */
router.post('/optimize', routeController.optimizeRoute);
/**
 * @route   POST /api/routes/batch
 * @desc    Batch optimize multiple routes
 * @access  Private
 */
router.post('/batch', routeController.batchOptimizeRoutes);
/**
 * @route   GET /api/routes/:id
 * @desc    Get route details by ID
 * @access  Private
 */
router.get('/:id', routeController.getRouteDetails);
/**
 * @route   GET /api/routes/:id/traffic
 * @desc    Get traffic data for a route
 * @access  Private
 */
router.get('/:id/traffic', routeController.getRouteTraffic);
/**
 * @route   GET /api/routes/metrics
 * @desc    Get optimization metrics
 * @access  Private
 */
router.get('/metrics', routeController.getOptimizationMetrics);
/**
 * @route   GET /api/routes/popular
 * @desc    Get popular routes
 * @access  Private
 */
router.get('/popular', routeController.getPopularRoutes);
/**
 * @route   GET /api/routes/incidents
 * @desc    Get traffic incidents
 * @access  Private
 */
router.get('/incidents', routeController.getTrafficIncidents);
exports.default = router;
