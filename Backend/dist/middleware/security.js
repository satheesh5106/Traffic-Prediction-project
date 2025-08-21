"use strict";
/**
 * Security Middleware
 * Implements encryption, audit logs, and vulnerability protection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.securityHeaders = exports.auditLogger = exports.securityManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = require("../utils/logger");
class SecurityManager {
    constructor() {
        this.auditLogs = [];
        this.MAX_AUDIT_LOGS = 10000;
        this.suspiciousIPs = new Set();
        this.failedAttempts = new Map();
        /**
         * Audit logging middleware
         */
        this.auditLogger = (req, res, next) => {
            if (!this.config.auditLogEnabled) {
                return next();
            }
            const secReq = req;
            secReq.startTime = Date.now();
            const ip = this.getClientIP(secReq);
            // Check for suspicious patterns
            const risk = this.assessRisk(secReq, ip);
            // Log request
            const auditEntry = {
                timestamp: new Date().toISOString(),
                userId: secReq.user?.id,
                ip,
                userAgent: secReq.headers['user-agent'] || 'unknown',
                method: secReq.method,
                url: secReq.url,
                risk,
                action: 'request_received',
                details: {
                    query: secReq.query,
                    params: secReq.params,
                    headers: this.sanitizeHeaders(secReq.headers)
                }
            };
            // Override res.end to capture response details
            const originalEnd = res.end.bind(res);
            res.end = ((...args) => {
                auditEntry.statusCode = res.statusCode;
                auditEntry.responseTime = Date.now() - (secReq.startTime || 0);
                auditEntry.action = 'request_completed';
                exports.securityManager.addAuditLog(auditEntry);
                // Check for failed authentication attempts
                if (res.statusCode === 401 || res.statusCode === 403) {
                    exports.securityManager.handleFailedAttempt(ip);
                }
                return originalEnd(...args);
            });
            next();
        };
        this.config = {
            encryptionKey: process.env.ENCRYPTION_KEY || this.generateSecureKey(),
            jwtSecret: process.env.JWT_SECRET || this.generateSecureKey(),
            rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
            rateLimitMax: 100, // 100 requests per window
            auditLogEnabled: process.env.NODE_ENV === 'production'
        };
        if (!process.env.ENCRYPTION_KEY) {
            logger_1.logger.warn('ENCRYPTION_KEY not set in environment variables. Using generated key.');
        }
        if (!process.env.JWT_SECRET) {
            logger_1.logger.warn('JWT_SECRET not set in environment variables. Using generated key.');
        }
    }
    /**
     * Generate a secure random key
     */
    generateSecureKey() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Encrypt sensitive data
     */
    encrypt(text) {
        try {
            const iv = crypto_1.default.randomBytes(16);
            const cipher = crypto_1.default.createCipher('aes-256-cbc', this.config.encryptionKey);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        }
        catch (error) {
            logger_1.logger.error('Encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto_1.default.createDecipher('aes-256-cbc', this.config.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            logger_1.logger.error('Decryption failed:', error);
            throw new Error('Decryption failed');
        }
    }
    /**
     * Hash sensitive data (one-way)
     */
    hash(text) {
        return crypto_1.default.createHash('sha256').update(text + this.config.encryptionKey).digest('hex');
    }
    /**
     * Verify hash
     */
    verifyHash(text, hash) {
        return this.hash(text) === hash;
    }
    /**
     * Create rate limiter
     */
    createRateLimiter(windowMs, max) {
        return (0, express_rate_limit_1.default)({
            windowMs: windowMs || this.config.rateLimitWindowMs,
            max: max || this.config.rateLimitMax,
            message: {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil((windowMs || this.config.rateLimitWindowMs) / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                const ip = this.getClientIP(req);
                this.logSuspiciousActivity(req, 'Rate limit exceeded', { ip });
                this.addSuspiciousIP(ip);
                res.status(429).json({
                    error: 'Too many requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: Math.ceil((windowMs || this.config.rateLimitWindowMs) / 1000)
                });
            }
        });
    }
    /**
     * Security headers middleware
     */
    securityHeaders() {
        return (0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'", 'https://api.openweathermap.org', 'wss:'],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }
    /**
     * Get client IP address
     */
    getClientIP(req) {
        return (req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            'unknown');
    }
    /**
     * Assess request risk level
     */
    assessRisk(req, ip) {
        let riskScore = 0;
        // Check suspicious IP
        if (this.suspiciousIPs.has(ip)) {
            riskScore += 3;
        }
        // Check failed attempts
        const attempts = this.failedAttempts.get(ip);
        if (attempts && attempts.count > 5) {
            riskScore += 2;
        }
        // Check for SQL injection patterns
        const url = req.url.toLowerCase();
        const sqlPatterns = ['union', 'select', 'drop', 'insert', 'delete', 'update', '--', ';'];
        if (sqlPatterns.some(pattern => url.includes(pattern))) {
            riskScore += 4;
        }
        // Check for XSS patterns
        const xssPatterns = ['<script', 'javascript:', 'onerror=', 'onload='];
        if (xssPatterns.some(pattern => url.includes(pattern))) {
            riskScore += 4;
        }
        // Check user agent
        const userAgent = req.headers['user-agent'] || '';
        if (!userAgent || userAgent.length < 10) {
            riskScore += 1;
        }
        if (riskScore >= 5)
            return 'high';
        if (riskScore >= 2)
            return 'medium';
        return 'low';
    }
    /**
     * Sanitize headers for logging
     */
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    /**
     * Add audit log entry
     */
    addAuditLog(entry) {
        this.auditLogs.push(entry);
        // Keep only recent logs
        if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
            this.auditLogs = this.auditLogs.slice(-this.MAX_AUDIT_LOGS);
        }
        // Log high-risk activities immediately
        if (entry.risk === 'high') {
            logger_1.logger.warn('High-risk security event detected', entry);
        }
    }
    /**
     * Handle failed authentication attempts
     */
    handleFailedAttempt(ip) {
        const now = Date.now();
        const attempts = this.failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
        // Reset count if last attempt was more than 1 hour ago
        if (now - attempts.lastAttempt > 60 * 60 * 1000) {
            attempts.count = 0;
        }
        attempts.count++;
        attempts.lastAttempt = now;
        this.failedAttempts.set(ip, attempts);
        // Add to suspicious IPs if too many failed attempts
        if (attempts.count >= 5) {
            this.addSuspiciousIP(ip);
            logger_1.logger.warn(`IP ${ip} added to suspicious list after ${attempts.count} failed attempts`);
        }
    }
    /**
     * Add IP to suspicious list
     */
    addSuspiciousIP(ip) {
        this.suspiciousIPs.add(ip);
        // Auto-remove after 24 hours
        setTimeout(() => {
            this.suspiciousIPs.delete(ip);
            logger_1.logger.info(`IP ${ip} removed from suspicious list`);
        }, 24 * 60 * 60 * 1000);
    }
    /**
     * Log suspicious activity
     */
    logSuspiciousActivity(req, reason, details) {
        const entry = {
            timestamp: new Date().toISOString(),
            ip: this.getClientIP(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            method: req.method,
            url: req.url,
            risk: 'high',
            action: 'suspicious_activity',
            details: { reason, ...details }
        };
        this.addAuditLog(entry);
    }
    /**
     * Get security statistics
     */
    getSecurityStats() {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        const recentLogs = this.auditLogs.filter(log => new Date(log.timestamp).getTime() > last24h);
        const riskCounts = recentLogs.reduce((acc, log) => {
            acc[log.risk] = (acc[log.risk] || 0) + 1;
            return acc;
        }, {});
        return {
            totalRequests: recentLogs.length,
            riskDistribution: riskCounts,
            suspiciousIPs: this.suspiciousIPs.size,
            failedAttempts: this.failedAttempts.size,
            highRiskEvents: riskCounts.high || 0,
            auditLogsCount: this.auditLogs.length,
            securityStatus: (riskCounts.high || 0) < 10 ? 'secure' : 'alert'
        };
    }
    /**
     * Get audit logs with filtering
     */
    getAuditLogs(filters) {
        let logs = [...this.auditLogs];
        if (filters) {
            if (filters.risk) {
                logs = logs.filter(log => log.risk === filters.risk);
            }
            if (filters.ip) {
                logs = logs.filter(log => log.ip === filters.ip);
            }
            if (filters.timeRange) {
                const cutoff = Date.now() - (filters.timeRange * 60 * 60 * 1000);
                logs = logs.filter(log => new Date(log.timestamp).getTime() > cutoff);
            }
            if (filters.limit) {
                logs = logs.slice(-filters.limit);
            }
        }
        return logs.reverse(); // Most recent first
    }
    /**
     * Clear old audit logs
     */
    clearOldAuditLogs(olderThanHours = 168) {
        const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
        const initialCount = this.auditLogs.length;
        this.auditLogs = this.auditLogs.filter(log => new Date(log.timestamp).getTime() > cutoff);
        const removedCount = initialCount - this.auditLogs.length;
        if (removedCount > 0) {
            logger_1.logger.info(`Cleared ${removedCount} old audit log entries`);
        }
    }
}
// Export singleton instance
exports.securityManager = new SecurityManager();
// Export middleware functions
exports.auditLogger = exports.securityManager.auditLogger;
exports.securityHeaders = exports.securityManager.securityHeaders();
exports.rateLimiter = exports.securityManager.createRateLimiter();
//# sourceMappingURL=security.js.map