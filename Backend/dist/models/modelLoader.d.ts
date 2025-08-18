import * as tf from '@tensorflow/tfjs';
/**
 * Initialize all ML models used in the application
 */
export declare const initializeModels: () => Promise<void>;
/**
 * Get the GNN model instance
 */
export declare const getGNNModel: () => tf.LayersModel | null;
/**
 * Clean up model resources
 */
export declare const cleanupModels: () => void;
