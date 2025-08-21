/**
 * Security Middleware
 * Implements encryption, audit logs, and vulnerability protection
 */
import { Request, Response, NextFunction } from 'express';
interface SecurityConfig {
    encryptionKey: string;
    jwtSecret: string;
    rateLimitWindowMs: number;
    rateLimitMax: number;
    auditLogEnabled: boolean;
}
interface AuditLogEntry {
    timestamp: string;
    userId?: string;
    ip: string;
    userAgent: string;
    method: string;
    url: string;
    statusCode?: number;
    responseTime?: number;
    risk: 'low' | 'medium' | 'high';
    action: string;
    details?: any;
}
interface SecurityRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
    startTime?: number;
}
declare class SecurityManager {
    private config;
    private auditLogs;
    private readonly MAX_AUDIT_LOGS;
    private suspiciousIPs;
    private failedAttempts;
    constructor();
    /**
     * Generate a secure random key
     */
    private generateSecureKey;
    /**
     * Encrypt sensitive data
     */
    encrypt(text: string): string;
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedText: string): string;
    /**
     * Hash sensitive data (one-way)
     */
    hash(text: string): string;
    /**
     * Verify hash
     */
    verifyHash(text: string, hash: string): boolean;
    /**
     * Create rate limiter
     */
    createRateLimiter(windowMs?: number, max?: number): import("express-rate-limit").RateLimitRequestHandler;
    /**
     * Security headers middleware
     */
    securityHeaders(): (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    /**
     * Get client IP address
     */
    private getClientIP;
    /**
     * Audit logging middleware
     */
    auditLogger: (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Assess request risk level
     */
    private assessRisk;
    /**
     * Sanitize headers for logging
     */
    private sanitizeHeaders;
    /**
     * Add audit log entry
     */
    private addAuditLog;
    /**
     * Handle failed authentication attempts
     */
    private handleFailedAttempt;
    /**
     * Add IP to suspicious list
     */
    private addSuspiciousIP;
    /**
     * Log suspicious activity
     */
    private logSuspiciousActivity;
    /**
     * Get security statistics
     */
    getSecurityStats(): any;
    /**
     * Get audit logs with filtering
     */
    getAuditLogs(filters?: {
        risk?: 'low' | 'medium' | 'high';
        ip?: string;
        timeRange?: number;
        limit?: number;
    }): AuditLogEntry[];
    /**
     * Clear old audit logs
     */
    clearOldAuditLogs(olderThanHours?: number): void;
}
export declare const securityManager: SecurityManager;
export declare const auditLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export { SecurityConfig, AuditLogEntry, SecurityRequest };
