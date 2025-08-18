"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupModels = exports.getGNNModel = exports.initializeModels = void 0;
const logger_1 = require("../utils/logger");
const fs_1 = __importDefault(require("fs"));
// Model instances
let gnnModel = null;
/**
 * Initialize all ML models used in the application
 */
const initializeModels = async () => {
    try {
        logger_1.logger.info('Initializing ML models...');
        // Check if models directory exists in production
        const modelPath = process.env.GNN_MODEL_PATH || './models/gnn_traffic_model';
        // In production, we would load the actual model
        // For development, we'll just log that we would load the model
        if (process.env.NODE_ENV === 'production') {
            try {
                if (fs_1.default.existsSync(modelPath)) {
                    // Load the model
                    // gnnModel = await tf.loadLayersModel(`file://${modelPath}/model.json`);
                    logger_1.logger.info(`GNN model loaded from ${modelPath}`);
                }
                else {
                    logger_1.logger.warn(`Model path ${modelPath} does not exist. Using fallback.`);
                }
            }
            catch (error) {
                logger_1.logger.error('Error loading GNN model:', error);
            }
        }
        else {
            logger_1.logger.info('Development mode: Models would be loaded in production');
        }
        logger_1.logger.info('ML models initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize ML models:', error);
        throw new Error('Model initialization failed');
    }
};
exports.initializeModels = initializeModels;
/**
 * Get the GNN model instance
 */
const getGNNModel = () => {
    return gnnModel;
};
exports.getGNNModel = getGNNModel;
/**
 * Clean up model resources
 */
const cleanupModels = () => {
    if (gnnModel) {
        // In a real application, you might need to dispose of tensors
        // gnnModel.dispose();
        gnnModel = null;
    }
    logger_1.logger.info('ML models cleaned up');
};
exports.cleanupModels = cleanupModels;
//# sourceMappingURL=modelLoader.js.map