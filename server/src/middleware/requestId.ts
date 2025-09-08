import { Request, Response, NextFunction } from 'express';

/**
 * Request ID middleware for tracing
 * Generates or uses existing request ID from headers
 */
export const requestIdMiddleware = (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  req.requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
};