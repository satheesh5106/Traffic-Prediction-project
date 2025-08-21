"use strict";
/**
 * TrafficAI Backend Server
 *
 * Express server for TrafficAI route optimization and traffic prediction.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = require("body-parser");
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
// Import routes
const routeRoutes_1 = __importDefault(require("./routes/routeRoutes"));
const trafficRoutes_1 = __importDefault(require("./routes/trafficRoutes"));
// Import services
const trafficDataService_1 = require("./services/trafficDataService");
const logger_1 = require("./utils/logger");
// Create Express app
const app = (0, express_1.default)();
// Set environment variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
// Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use((0, compression_1.default)()); // Compress responses
app.use((0, cors_1.default)()); // Enable CORS
app.use((0, body_parser_1.json)({ limit: '10mb' })); // Parse JSON bodies
app.use((0, body_parser_1.urlencoded)({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
// Logging middleware
if (NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Set logger level based on environment
logger_1.logger.setLevel(NODE_ENV === 'production' ? logger_1.LogLevel.INFO : logger_1.LogLevel.DEBUG);
// API routes
app.use('/api/routes', routeRoutes_1.default);
app.use('/api/traffic', trafficRoutes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        uptime: process.uptime()
    });
});
// Serve static files in production
if (NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../build')));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../build/index.html'));
    });
}
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.logger.error('Server error', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            ...(NODE_ENV === 'development' ? { stack: err.stack } : {})
        }
    });
});
// Start server
const server = app.listen(PORT, () => {
    logger_1.logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    // Start traffic data service
    trafficDataService_1.trafficDataService.startUpdates();
    logger_1.logger.info('Traffic data service started');
});
// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
        // Stop traffic data service
        trafficDataService_1.trafficDataService.stopUpdates();
        logger_1.logger.info('Traffic data service stopped');
        process.exit(0);
    });
});
exports.default = app;
