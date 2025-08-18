import { Request, Response } from 'express';
/**
 * Get traffic prediction for a location
 * @route POST /api/traffic-prediction
 * @access Private
 */
export declare const getTrafficPrediction: (req: Request, res: Response) => Promise<void>;
/**
 * Get traffic statistics
 * @route GET /api/traffic-stats
 * @access Private
 */
export declare const getTrafficStats: (req: Request, res: Response) => Promise<void>;
/**
 * Get historical traffic data
 * @route GET /api/traffic-history
 * @access Private
 */
export declare const getHistoricalTraffic: (req: Request, res: Response) => Promise<void>;
/**
 * Get traffic alerts
 * @route GET /api/traffic-alerts
 * @access Private
 */
export declare const getTrafficAlerts: (req: Request, res: Response) => Promise<void>;
