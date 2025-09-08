import { z } from 'zod';

export interface RouteMetrics {
  routesOptimized: number;
  timeSaved: number; // in minutes
  fuelSaved: number; // in liters
  activeRoutes: number;
}

export interface RouteCalculation {
  originalDistance: number; // in km
  optimizedDistance: number; // in km
  originalTime: number; // in minutes
  optimizedTime: number; // in minutes
  fuelEfficiency: number; // km per liter
}

interface MetricsCache {
  data: RouteMetrics;
  timestamp: Date;
  expiresAt: Date;
}

interface RouteSession {
  id: string;
  startTime: Date;
  isActive: boolean;
  calculations?: RouteCalculation;
}

export class MetricsService {
  private cache: MetricsCache | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds
  private activeSessions = new Map<string, RouteSession>();
  private totalMetrics: RouteMetrics = {
    routesOptimized: 0,
    timeSaved: 0,
    fuelSaved: 0,
    activeRoutes: 0
  };

  /**
   * Start a new route optimization session
   */
  public startSession(sessionData: any): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: RouteSession = {
      id: sessionId,
      startTime: new Date(),
      isActive: true
    };
    
    this.activeSessions.set(sessionId, session);
    this.updateActiveRoutes();
    this.invalidateCache();
    
    return sessionId;
  }

  /**
   * Complete a route optimization session
   */
  public completeSession(
    sessionId: string,
    actualDistance: number,
    actualDuration: number,
    fuelUsed?: number
  ): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }
    
    // Mark session as completed
    session.isActive = false;
    
    // Update total metrics
    this.totalMetrics.routesOptimized += 1;
    
    // Calculate time and fuel savings (simplified calculation)
    const timeSaved = Math.max(0, (actualDuration * 0.1)); // Assume 10% time saving
    const fuelSaved = fuelUsed ? Math.max(0, fuelUsed * 0.15) : actualDistance * 0.08; // Estimate fuel savings
    
    this.totalMetrics.timeSaved += timeSaved;
    this.totalMetrics.fuelSaved += fuelSaved;
    
    this.updateActiveRoutes();
    this.invalidateCache();
    
    return true;
  }

  /**
   * Cancel a route optimization session
   */
  public cancelSession(sessionId: string, reason?: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }
    
    session.isActive = false;
    this.updateActiveRoutes();
    this.invalidateCache();
    
    return true;
  }

  /**
   * Get current metrics with caching
   */
  public async getMetrics(): Promise<RouteMetrics> {
    // Check cache first
    if (this.cache && this.cache.expiresAt > new Date()) {
      return this.cache.data;
    }

    // Calculate fresh metrics
    const metrics = this.calculateCurrentMetrics();
    
    // Update cache
    this.cache = {
      data: metrics,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_TTL_MS)
    };
    
    return metrics;
  }

  /**
   * Get metrics with safe defaults for error scenarios
   */
  public async getMetricsSafe(): Promise<RouteMetrics> {
    try {
      return await this.getMetrics();
    } catch (error) {
      console.error('Error getting metrics, returning safe defaults:', error);
      return {
        routesOptimized: 0,
        timeSaved: 0,
        fuelSaved: 0,
        activeRoutes: 0
      };
    }
  }

  /**
   * Get active sessions
   */
  public async getActiveSessions(): Promise<RouteSession[]> {
    return Array.from(this.activeSessions.values()).filter(session => session.isActive);
  }

  /**
   * Get specific session
   */
  public async getSession(sessionId: string): Promise<RouteSession | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get health status
   */
  public async getHealthStatus(): Promise<{ status: string; activeSessionsCount: number }> {
    const activeCount = Array.from(this.activeSessions.values()).filter(s => s.isActive).length;
    
    return {
      status: 'healthy',
      activeSessionsCount: activeCount
    };
  }

  /**
   * Get detailed statistics
   */
  public async getDetailedStats(): Promise<any> {
    const metrics = await this.getMetrics();
    const activeSessions = await this.getActiveSessions();
    
    return {
      ...metrics,
      activeSessions: activeSessions.length,
      totalSessions: this.activeSessions.size,
      cacheStatus: this.cache ? 'active' : 'empty'
    };
  }

  /**
   * Reset all metrics (for testing or admin purposes)
   */
  public resetMetrics(): void {
    this.totalMetrics = {
      routesOptimized: 0,
      timeSaved: 0,
      fuelSaved: 0,
      activeRoutes: 0
    };
    this.activeSessions.clear();
    this.invalidateCache();
  }

  /**
   * Calculate current metrics
   */
  private calculateCurrentMetrics(): RouteMetrics {
    return {
      ...this.totalMetrics,
      activeRoutes: Array.from(this.activeSessions.values()).filter(s => s.isActive).length
    };
  }

  /**
   * Update active routes count
   */
  private updateActiveRoutes(): void {
    this.totalMetrics.activeRoutes = Array.from(this.activeSessions.values())
      .filter(session => session.isActive).length;
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Create a route calculation object with estimated values
   */
  public static createRouteCalculation(
    originalDistance: number,
    optimizedDistance: number,
    averageSpeed: number = 50,
    fuelEfficiency: number = 12
  ): RouteCalculation {
    return {
      originalDistance,
      optimizedDistance,
      originalTime: (originalDistance / averageSpeed) * 60, // Convert to minutes
      optimizedTime: (optimizedDistance / averageSpeed) * 60, // Convert to minutes
      fuelEfficiency
    };
  }
}

export default MetricsService;