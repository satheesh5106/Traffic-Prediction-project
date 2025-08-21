export interface TrafficPrediction {
    flowData: {
        congestionLevel: string;
        speedFactor: number;
        density: string;
    };
    confidence: number;
    eta: number;
}
export declare class TrafficPredictionService {
    private model;
    private modelPath;
    private pythonScriptPath;
    private fallbackData;
    constructor();
    /**
     * Initialize the service and load models
     */
    private initializeService;
    /**
     * Load fallback data for predictions when model fails
     */
    private loadFallbackData;
    /**
     * Predict traffic using GNN model
     * @returns TrafficPrediction object with prediction results
     */
    predictTraffic(latitude: number, longitude: number, liveTrafficData: any, weatherData: any, timeframe?: number): Promise<TrafficPrediction>;
    /**
     * Prepare input data for the model
     */
    private prepareInputData;
    /**
     * Process categorical features for model input
     */
    private processCategoricalFeatures;
    /**
     * Predict using TensorFlow.js model
     */
    private predictWithTensorflow;
    /**
     * Predict using Python subprocess (for GNN models that can't be loaded in TensorFlow.js)
     */
    private predictWithPythonSubprocess;
    /**
     * Process prediction results from model output
     * @param predictionArray - The prediction array from the model, which could be nested
     * @returns TrafficPrediction object with processed prediction results
     */
    private processPredictionResults;
    /**
     * Get fallback prediction when model fails
     */
    getFallbackPrediction(latitude: number, longitude: number): Promise<any>;
    /**
     * Get historical traffic data
     */
    getHistoricalTraffic(latitude: number, longitude: number, startDate: Date, endDate: Date): Promise<{
        timestamp: Date;
        location: {
            latitude: number;
            longitude: number;
        };
        flowData: {
            congestionLevel: string;
            speedFactor: number;
            density: string;
        };
    }[]>;
    /**
     * Helper method to generate random congestion level based on time of day
     */
    private getRandomCongestionLevel;
    /**
     * Helper method to generate random speed factor based on time of day
     */
    private getRandomSpeedFactor;
    /**
     * Helper method to generate random density based on time of day
     */
    private getRandomDensity;
    /**
     * Helper method for weighted random selection
     */
    private weightedRandom;
}
