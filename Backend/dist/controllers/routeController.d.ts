import { Request, Response } from 'express';
/**
 * Optimize route between two points
 * @route POST /api/optimize-route
 * @access Private
 */
export declare const optimizeRoute: (req: Request, res: Response) => Promise<void>;
/**
 * Get route options (fastest, shortest, eco, scenic)
 * @route POST /api/route-options
 * @access Private
 */
export declare const getRouteOptions: (req: Request, res: Response) => Promise<void>;
/**
 * Get route statistics
 * @route GET /api/route-stats
 * @access Private
 */
export declare const getRouteStats: (req: Request, res: Response) => Promise<void>;
/**
 * Get active routes for user
 * @route GET /api/active-routes
 * @access Private
 */
export declare const getActiveRoutes: (req: Request, res: Response) => Promise<void>;
