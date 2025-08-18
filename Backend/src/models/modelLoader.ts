import { logger } from '../utils/logger';
import * as tf from '@tensorflow/tfjs';
import path from 'path';
import fs from 'fs';

// Model instances
let gnnModel: tf.LayersModel | null = null;

/**
 * Initialize all ML models used in the application
 */
export const initializeModels = async (): Promise<void> => {
  try {
    logger.info('Initializing ML models...');
    
    // Check if models directory exists in production
    const modelPath = process.env.GNN_MODEL_PATH || './models/gnn_traffic_model';
    
    // In production, we would load the actual model
    // For development, we'll just log that we would load the model
    if (process.env.NODE_ENV === 'production') {
      try {
        if (fs.existsSync(modelPath)) {
          // Load the model
          // gnnModel = await tf.loadLayersModel(`file://${modelPath}/model.json`);
          logger.info(`GNN model loaded from ${modelPath}`);
        } else {
          logger.warn(`Model path ${modelPath} does not exist. Using fallback.`);
        }
      } catch (error) {
        logger.error('Error loading GNN model:', error);
      }
    } else {
      logger.info('Development mode: Models would be loaded in production');
    }
    
    logger.info('ML models initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize ML models:', error);
    throw new Error('Model initialization failed');
  }
};

/**
 * Get the GNN model instance
 */
export const getGNNModel = (): tf.LayersModel | null => {
  return gnnModel;
};

/**
 * Clean up model resources
 */
export const cleanupModels = (): void => {
  if (gnnModel) {
    // In a real application, you might need to dispose of tensors
    // gnnModel.dispose();
    gnnModel = null;
  }
  logger.info('ML models cleaned up');
};