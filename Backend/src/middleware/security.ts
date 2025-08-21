/**
 * Security Middleware
 * Implements encryption, audit logs, and vulnerability protection
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger } from '../utils/logger';

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

class SecurityManager {
  private config: SecurityConfig;
  private auditLogs: AuditLogEntry[] = [];
  private readonly MAX_AUDIT_LOGS = 10000;
  private suspiciousIPs: Set<string> = new Set();
  private failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  constructor() {
    this.config = {
      encryptionKey: process.env.ENCRYPTION_KEY || this.generateSecureKey(),
      jwtSecret: process.env.JWT_SECRET || this.generateSecureKey(),
      rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
      rateLimitMax: 100, // 100 requests per window
      auditLogEnabled: process.env.NODE_ENV === 'production'
    };

    if (!process.env.ENCRYPTION_KEY) {
      logger.warn('ENCRYPTION_KEY not set in environment variables. Using generated key.');
    }
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set in environment variables. Using generated key.');
    }
  }

  /**
   * Generate a secure random key
   */
  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(text: string): string {
    return crypto.createHash('sha256').update(text + this.config.encryptionKey).digest('hex');
  }

  /**
   * Verify hash
   */
  verifyHash(text: string, hash: string): boolean {
    return this.hash(text) === hash;
  }

  /**
   * Create rate limiter
   */
  createRateLimiter(windowMs?: number, max?: number) {
    return rateLimit({
      windowMs: windowMs || this.config.rateLimitWindowMs,
      max: max || this.config.rateLimitMax,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((windowMs || this.config.rateLimitWindowMs) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
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
    return helmet({
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
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Audit logging middleware
   */
  auditLogger = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.auditLogEnabled) {
      return next();
    }

    const secReq = req as SecurityRequest;
    secReq.startTime = Date.now();
    const ip = this.getClientIP(secReq);
    
    // Check for suspicious patterns
    const risk = this.assessRisk(secReq, ip);
    
    // Log request
    const auditEntry: AuditLogEntry = {
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
    res.end = ((...args: any[]) => {
      auditEntry.statusCode = res.statusCode;
      auditEntry.responseTime = Date.now() - (secReq.startTime || 0);
      auditEntry.action = 'request_completed';
      
      securityManager.addAuditLog(auditEntry);
      
      // Check for failed authentication attempts
      if (res.statusCode === 401 || res.statusCode === 403) {
        securityManager.handleFailedAttempt(ip);
      }
      
      return originalEnd(...args);
    }) as any;

    next();
  };

  /**
   * Assess request risk level
   */
  private assessRisk(req: Request, ip: string): 'low' | 'medium' | 'high' {
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
    
    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: any): any {
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
  private addAuditLog(entry: AuditLogEntry): void {
    this.auditLogs.push(entry);
    
    // Keep only recent logs
    if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
      this.auditLogs = this.auditLogs.slice(-this.MAX_AUDIT_LOGS);
    }
    
    // Log high-risk activities immediately
    if (entry.risk === 'high') {
      logger.warn('High-risk security event detected', entry);
    }
  }

  /**
   * Handle failed authentication attempts
   */
  private handleFailedAttempt(ip: string): void {
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
      logger.warn(`IP ${ip} added to suspicious list after ${attempts.count} failed attempts`);
    }
  }

  /**
   * Add IP to suspicious list
   */
  private addSuspiciousIP(ip: string): void {
    this.suspiciousIPs.add(ip);
    
    // Auto-remove after 24 hours
    setTimeout(() => {
      this.suspiciousIPs.delete(ip);
      logger.info(`IP ${ip} removed from suspicious list`);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Log suspicious activity
   */
  private logSuspiciousActivity(req: Request, reason: string, details?: any): void {
    const entry: AuditLogEntry = {
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
  getSecurityStats(): any {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const recentLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp).getTime() > last24h
    );
    
    const riskCounts = recentLogs.reduce((acc, log) => {
      acc[log.risk] = (acc[log.risk] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
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
  getAuditLogs(filters?: {
    risk?: 'low' | 'medium' | 'high';
    ip?: string;
    timeRange?: number; // hours
    limit?: number;
  }): AuditLogEntry[] {
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
  clearOldAuditLogs(olderThanHours: number = 168): void { // Default 7 days
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    const initialCount = this.auditLogs.length;
    
    this.auditLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp).getTime() > cutoff
    );
    
    const removedCount = initialCount - this.auditLogs.length;
    if (removedCount > 0) {
      logger.info(`Cleared ${removedCount} old audit log entries`);
    }
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();

// Export middleware functions
export const auditLogger = securityManager.auditLogger;
export const securityHeaders = securityManager.securityHeaders();
export const rateLimiter = securityManager.createRateLimiter();

// Export types
export { SecurityConfig, AuditLogEntry, SecurityRequest };