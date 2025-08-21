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
const routeController = __importStar(require("../controllers/routeController"));
const router = express_1.default.Router();
/**
 * @route   POST /api/routes/optimize
 * @desc    Optimize a route between two points
 * @access  Private
 */
router.post('/optimize', routeController.optimizeRoute);
/**
 * @route   POST /api/routes/options
 * @desc    Get route options (fastest, shortest, eco, scenic)
 * @access  Private
 */
router.post('/options', routeController.getRouteOptions);
/**
 * @route   GET /api/routes/stats
 * @desc    Get route statistics
 * @access  Private
 */
router.get('/stats', routeController.getRouteStats);
/**
 * @route   GET /api/routes/active
 * @desc    Get active routes for user
 * @access  Private
 */
router.get('/active', routeController.getActiveRoutes);
exports.default = router;
//# sourceMappingURL=routeRoutes.js.map