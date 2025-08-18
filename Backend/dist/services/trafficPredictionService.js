"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficPredictionService = void 0;
const tf = __importStar(require("@tensorflow/tfjs"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
class TrafficPredictionService {
    constructor() {
        this.model = null;
        this.modelPath = process.env.GNN_MODEL_PATH || path.join(__dirname, '../../models/gnn_traffic_model');
        this.pythonScriptPath = path.join(__dirname, '../../scripts/run_gnn_inference.py');
        this.fallbackData = {};
        this.initializeService();
    }
    /**
     * Initialize the service and load models
     */
    async initializeService() {
        try {
            // Check if TensorFlow.js model exists
            if (fs.existsSync(`${this.modelPath}/model.json`)) {
                logger_1.logger.info('Loading TensorFlow.js GNN model...');
                this.model = await tf.loadLayersModel(`file://${this.modelPath}/model.json`);
                logger_1.logger.info('TensorFlow.js GNN model loaded successfully');
            }
            else {
                logger_1.logger.warn('TensorFlow.js model not found, will use Python subprocess for inference');
            }
            // Load fallback data
            this.loadFallbackData();
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize traffic prediction service:', error);
        }
    }
    /**
     * Load fallback data for predictions when model fails
     */
    loadFallbackData() {
        try {
            const fallbackPath = path.join(__dirname, '../../data/fallback_predictions.json');
            if (fs.existsSync(fallbackPath)) {
                this.fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
                logger_1.logger.info('Fallback prediction data loaded successfully');
            }
            else {
                // Create basic fallback data
                this.fallbackData = {
                    default: {
                        flowData: {
                            congestionLevel: 'medium',
                            speedFactor: 0.7,
                            density: 'moderate'
                        },
                        confidence: 0.6,
                        eta: 15
                    }
                };
                // Save fallback data for future use
                fs.writeFileSync(fallbackPath, JSON.stringify(this.fallbackData, null, 2));
                logger_1.logger.info('Created default fallback prediction data');
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to load fallback data:', error);
            // Set minimal fallback data
            this.fallbackData = {
                default: {
                    flowData: { congestionLevel: 'unknown', speedFactor: 0.5, density: 'unknown' },
                    confidence: 0.5,
                    eta: 20
                }
            };
        }
    }
    /**
     * Predict traffic using GNN model
     * @returns TrafficPrediction object with prediction results
     */
    async predictTraffic(latitude, longitude, liveTrafficData, weatherData, timeframe = 30) {
        const startTime = Date.now();
        try {
            // Prepare input data
            const inputData = this.prepareInputData(latitude, longitude, liveTrafficData, weatherData, timeframe);
            let prediction;
            // Use TensorFlow.js model if available
            if (this.model) {
                prediction = await this.predictWithTensorflow(inputData);
            }
            else {
                // Fall back to Python subprocess
                prediction = await this.predictWithPythonSubprocess(inputData);
            }
            // Calculate response time
            const responseTime = (Date.now() - startTime) / 1000;
            logger_1.logger.info(`Traffic prediction completed in ${responseTime} seconds`);
            // Ensure prediction is an object before spreading
            const predictionObj = typeof prediction === 'object' && prediction !== null ? prediction : { prediction };
            // Ensure all required properties are present
            const result = {
                flowData: predictionObj.flowData || {
                    congestionLevel: 'medium',
                    speedFactor: 0.7,
                    density: 'moderate'
                },
                confidence: predictionObj.confidence || 0.7,
                eta: predictionObj.eta || 15,
                responseTime
            };
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error in traffic prediction:', error);
            throw new errorHandler_1.ApiError(500, 'Failed to generate traffic prediction');
        }
    }
    /**
     * Prepare input data for the model
     */
    prepareInputData(latitude, longitude, liveTrafficData, weatherData, timeframe) {
        // Create a feature matrix using standard JavaScript objects
        try {
            // Create traffic data object
            const trafficData = {
                latitude,
                longitude,
                congestion: liveTrafficData.congestionLevel || 'medium',
                speed: liveTrafficData.averageSpeed || 40,
                density: liveTrafficData.density || 'moderate',
                timeframe
            };
            // Create weather data object
            const weatherInfo = {
                temperature: weatherData.temperature || 25,
                precipitation: weatherData.precipitation || 0,
                windSpeed: weatherData.windSpeed || 5,
                visibility: weatherData.visibility || 10,
                weatherCondition: weatherData.condition || 'clear'
            };
            // Combine data objects
            const combinedData = {
                ...trafficData,
                ...weatherInfo
            };
            // Process categorical features
            const processedData = this.processCategoricalFeatures(combinedData);
            // Return processed data for model input
            return [processedData];
        }
        catch (error) {
            logger_1.logger.error('Error preparing input data:', error);
            // Return basic formatted data if Polars processing fails
            return {
                location: { latitude, longitude },
                traffic: liveTrafficData,
                weather: weatherData,
                timeframe
            };
        }
    }
    /**
     * Process categorical features for model input
     */
    processCategoricalFeatures(data) {
        // This is a simplified version - in production, would use proper one-hot encoding
        try {
            // Map congestion levels to numeric values
            const congestionMap = {
                'low': 0,
                'medium': 1,
                'high': 2,
                'severe': 3
            };
            // Map weather conditions to numeric values
            const weatherMap = {
                'clear': 0,
                'cloudy': 1,
                'rain': 2,
                'snow': 3,
                'fog': 4,
                'storm': 5
            };
            // Apply mappings to create a new object with numeric values
            return {
                ...data,
                congestion_numeric: congestionMap[data.congestion] || 1,
                weather_numeric: weatherMap[data.weatherCondition] || 0
            };
        }
        catch (error) {
            logger_1.logger.error('Error processing categorical features:', error);
            return data; // Return original data if processing fails
        }
    }
    /**
     * Predict using TensorFlow.js model
     */
    async predictWithTensorflow(inputData) {
        try {
            // Convert input data to tensor
            const inputTensor = tf.tensor2d([[
                    inputData[0].latitude,
                    inputData[0].longitude,
                    inputData[0].congestion_numeric || 1,
                    inputData[0].speed,
                    inputData[0].temperature,
                    inputData[0].precipitation,
                    inputData[0].windSpeed,
                    inputData[0].visibility,
                    inputData[0].weather_numeric || 0,
                    inputData[0].timeframe
                ]]);
            // Run prediction
            const predictionTensor = this.model.predict(inputTensor);
            const predictionArray = await predictionTensor.array();
            // Clean up tensors
            inputTensor.dispose();
            predictionTensor.dispose();
            // Process prediction results
            // Safely access the prediction array and ensure it's the right type
            const predictionResult = Array.isArray(predictionArray) && predictionArray.length > 0
                ? predictionArray[0]
                : predictionArray;
            // Ensure we're passing a number array to processPredictionResults
            const typedResult = Array.isArray(predictionResult) ? predictionResult : [predictionResult];
            return this.processPredictionResults(typedResult);
        }
        catch (error) {
            logger_1.logger.error('Error in TensorFlow.js prediction:', error);
            throw error;
        }
    }
    /**
     * Predict using Python subprocess (for GNN models that can't be loaded in TensorFlow.js)
     */
    async predictWithPythonSubprocess(inputData) {
        return new Promise((resolve, reject) => {
            try {
                // Check if Python script exists
                if (!fs.existsSync(this.pythonScriptPath)) {
                    logger_1.logger.error('Python script not found:', this.pythonScriptPath);
                    return reject(new Error('Python inference script not found'));
                }
                // Create temporary input file
                const inputFile = path.join(__dirname, '../../temp/input_data.json');
                fs.mkdirSync(path.dirname(inputFile), { recursive: true });
                fs.writeFileSync(inputFile, JSON.stringify(inputData));
                // Spawn Python process
                const pythonProcess = (0, child_process_1.spawn)('python', [
                    this.pythonScriptPath,
                    '--input', inputFile,
                    '--model', this.modelPath
                ]);
                let outputData = '';
                let errorData = '';
                // Collect output
                pythonProcess.stdout.on('data', (data) => {
                    outputData += data.toString();
                });
                // Collect errors
                pythonProcess.stderr.on('data', (data) => {
                    errorData += data.toString();
                    logger_1.logger.warn('Python subprocess warning:', data.toString());
                });
                // Handle process completion
                pythonProcess.on('close', (code) => {
                    // Clean up temp file
                    if (fs.existsSync(inputFile)) {
                        fs.unlinkSync(inputFile);
                    }
                    if (code !== 0) {
                        logger_1.logger.error(`Python process exited with code ${code}:`, errorData);
                        return reject(new Error(`Python inference failed with code ${code}`));
                    }
                    try {
                        // Parse output
                        const predictionResults = JSON.parse(outputData);
                        resolve(predictionResults);
                    }
                    catch (parseError) {
                        logger_1.logger.error('Failed to parse Python output:', parseError);
                        reject(new Error('Failed to parse prediction results'));
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error in Python subprocess prediction:', error);
                reject(error);
            }
        });
    }
    /**
     * Process prediction results from model output
     * @param predictionArray - The prediction array from the model, which could be nested
     * @returns TrafficPrediction object with processed prediction results
     */
    processPredictionResults(predictionArray) {
        // This is a simplified version - actual implementation would depend on model output format
        try {
            // Flatten the array if it's nested
            let flatArray;
            if (Array.isArray(predictionArray)) {
                if (Array.isArray(predictionArray[0])) {
                    // It's a nested array, flatten it to get the first row
                    flatArray = predictionArray[0];
                }
                else {
                    // It's already a flat array
                    flatArray = predictionArray;
                }
            }
            else {
                // It's not an array at all, create a default array
                flatArray = [1, 0.7, 0.8, 15];
            }
            // Assuming flatArray has [congestionLevel, speedFactor, confidence, etaMinutes]
            const congestionLevel = flatArray[0] || 1;
            const speedFactor = flatArray[1] || 0.7;
            const confidence = flatArray[2] || 0.8;
            const etaMinutes = flatArray[3] || 15;
            // Map congestion level to text
            let congestionText = 'medium';
            if (congestionLevel < 0.5)
                congestionText = 'low';
            else if (congestionLevel < 1.5)
                congestionText = 'medium';
            else if (congestionLevel < 2.5)
                congestionText = 'high';
            else
                congestionText = 'severe';
            // Map density based on congestion and speed
            let density = 'moderate';
            if (congestionLevel < 1 && speedFactor > 0.8)
                density = 'light';
            else if (congestionLevel > 2 && speedFactor < 0.5)
                density = 'heavy';
            else
                density = 'moderate';
            return {
                flowData: {
                    congestionLevel: congestionText,
                    speedFactor,
                    density
                },
                confidence,
                eta: etaMinutes,
                responseTime: 0 // Will be updated with actual response time
            };
        }
        catch (error) {
            logger_1.logger.error('Error processing prediction results:', error);
            // Return default values if processing fails
            return {
                flowData: {
                    congestionLevel: 'medium',
                    speedFactor: 0.7,
                    density: 'moderate'
                },
                confidence: 0.7,
                eta: 15,
                responseTime: 0
            };
        }
    }
    /**
     * Get fallback prediction when model fails
     */
    async getFallbackPrediction(latitude, longitude) {
        // Try to find closest location in fallback data
        // This is a simplified version - in production would use proper geospatial search
        return this.fallbackData.default;
    }
    /**
     * Get historical traffic data
     */
    async getHistoricalTraffic(latitude, longitude, startDate, endDate) {
        try {
            // This would typically query a database or external API
            // For now, generate synthetic historical data
            const historicalData = [];
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            for (let i = 0; i < daysDiff; i++) {
                const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                // Generate data points for different times of day
                const dateTimes = [9, 12, 15, 18, 21]; // Hours of the day
                for (const hour of dateTimes) {
                    const dataPoint = {
                        timestamp: new Date(date.setHours(hour, 0, 0, 0)),
                        location: { latitude, longitude },
                        flowData: {
                            congestionLevel: this.getRandomCongestionLevel(hour),
                            speedFactor: this.getRandomSpeedFactor(hour),
                            density: this.getRandomDensity(hour)
                        }
                    };
                    historicalData.push(dataPoint);
                }
            }
            return historicalData;
        }
        catch (error) {
            logger_1.logger.error('Error getting historical traffic data:', error);
            throw new errorHandler_1.ApiError(500, 'Failed to retrieve historical traffic data');
        }
    }
    /**
     * Helper method to generate random congestion level based on time of day
     */
    getRandomCongestionLevel(hour) {
        const levels = ['low', 'medium', 'high', 'severe'];
        let weights;
        // Adjust weights based on typical traffic patterns
        if (hour >= 8 && hour <= 10) { // Morning rush hour
            weights = [0.1, 0.3, 0.4, 0.2];
        }
        else if (hour >= 16 && hour <= 19) { // Evening rush hour
            weights = [0.1, 0.2, 0.5, 0.2];
        }
        else if (hour >= 22 || hour <= 5) { // Night
            weights = [0.7, 0.2, 0.1, 0];
        }
        else { // Regular daytime
            weights = [0.3, 0.4, 0.2, 0.1];
        }
        return this.weightedRandom(levels, weights);
    }
    /**
     * Helper method to generate random speed factor based on time of day
     */
    getRandomSpeedFactor(hour) {
        let min, max;
        // Adjust range based on typical traffic patterns
        if (hour >= 8 && hour <= 10) { // Morning rush hour
            min = 0.4;
            max = 0.7;
        }
        else if (hour >= 16 && hour <= 19) { // Evening rush hour
            min = 0.3;
            max = 0.6;
        }
        else if (hour >= 22 || hour <= 5) { // Night
            min = 0.8;
            max = 1.0;
        }
        else { // Regular daytime
            min = 0.6;
            max = 0.9;
        }
        return min + Math.random() * (max - min);
    }
    /**
     * Helper method to generate random density based on time of day
     */
    getRandomDensity(hour) {
        const densities = ['light', 'moderate', 'heavy'];
        let weights;
        // Adjust weights based on typical traffic patterns
        if (hour >= 8 && hour <= 10) { // Morning rush hour
            weights = [0.1, 0.3, 0.6];
        }
        else if (hour >= 16 && hour <= 19) { // Evening rush hour
            weights = [0.1, 0.3, 0.6];
        }
        else if (hour >= 22 || hour <= 5) { // Night
            weights = [0.8, 0.2, 0];
        }
        else { // Regular daytime
            weights = [0.3, 0.5, 0.2];
        }
        return this.weightedRandom(densities, weights);
    }
    /**
     * Helper method for weighted random selection
     */
    weightedRandom(items, weights) {
        const cumulativeWeights = [];
        let sum = 0;
        for (const weight of weights) {
            sum += weight;
            cumulativeWeights.push(sum);
        }
        const random = Math.random() * sum;
        for (let i = 0; i < items.length; i++) {
            if (random < cumulativeWeights[i]) {
                return items[i];
            }
        }
        return items[items.length - 1];
    }
}
exports.TrafficPredictionService = TrafficPredictionService;
//# sourceMappingURL=trafficPredictionService.js.map