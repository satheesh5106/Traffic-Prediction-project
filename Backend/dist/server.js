"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errorHandler_1 = require("./middleware/errorHandler");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const apiRoutes_1 = __importDefault(require("./routes/apiRoutes"));
const trafficRoutes_1 = __importDefault(require("./routes/trafficRoutes"));
const routeRoutes_1 = __importDefault(require("./routes/routeRoutes"));
const incidentRoutes_1 = __importDefault(require("./routes/incidentRoutes"));
const modelLoader_1 = require("./models/modelLoader");
const winston_1 = __importDefault(require("winston"));
const performanceMonitor_1 = require("./middleware/performanceMonitor");
const security_1 = require("./middleware/security");
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' })
    ]
});
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security middleware (must be first)
app.use(security_1.securityHeaders);
app.use(security_1.rateLimiter);
app.use(security_1.auditLogger);
// Performance monitoring
// Performance tracking middleware
app.use((req, res, next) => {
    performanceMonitor_1.performanceMonitor.trackPerformance(req, res, next);
});
// Standard middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-domain.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, morgan_1.default)('dev'));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api', apiRoutes_1.default);
app.use('/api/traffic', trafficRoutes_1.default);
app.use('/api/routes', routeRoutes_1.default);
app.use('/api/incidents', incidentRoutes_1.default);
// Health check endpoint with performance and security metrics
app.get('/health', (req, res) => {
    const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        performance: performanceMonitor_1.performanceMonitor.getHealthCheck(),
        security: security_1.securityManager.getSecurityStats()
    };
    res.status(200).json(healthData);
});
// Performance metrics endpoint
app.get('/api/metrics/performance', (req, res) => {
    res.json({
        stats: performanceMonitor_1.performanceMonitor.getStats(),
        trends: performanceMonitor_1.performanceMonitor.getTrends(parseInt(req.query.minutes || '5') || 5)
    });
});
// Security audit endpoint
app.get('/api/metrics/security', (req, res) => {
    const risk = req.query.risk;
    const validRisks = ['low', 'medium', 'high'];
    const filters = {
        risk: validRisks.includes(risk) ? risk : undefined,
        timeRange: parseInt(req.query.hours || '24') || 24,
        limit: parseInt(req.query.limit) || 100
    };
    res.json({
        stats: security_1.securityManager.getSecurityStats(),
        auditLogs: security_1.securityManager.getAuditLogs(filters)
    });
});
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Start server
const startServer = async () => {
    try {
        // Initialize ML models
        await (0, modelLoader_1.initializeModels)();
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    // Close server & exit process
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=server.js.map