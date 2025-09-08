import { logger } from '../app';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Percentage (0-100)
  windowSize: number; // Number of requests to track
  cooldownMs: number; // Time to wait before trying again
  name: string; // Circuit breaker identifier
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: boolean[] = []; // Sliding window of success/failure
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker ${this.config.name} is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
      }
      // Transition to HALF_OPEN
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit breaker ${this.config.name} transitioning to HALF_OPEN`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.recordResult(true);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      logger.info(`Circuit breaker ${this.config.name} closed after successful request`);
    }
  }

  private onFailure(): void {
    this.recordResult(false);
    this.lastFailureTime = Date.now();

    const failureRate = this.getFailureRate();
    
    if (failureRate >= this.config.failureThreshold && this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.cooldownMs;
      
      logger.warn(`Circuit breaker ${this.config.name} opened. Failure rate: ${failureRate.toFixed(1)}%. Next attempt: ${new Date(this.nextAttemptTime).toISOString()}`);
    }
  }

  private recordResult(success: boolean): void {
    this.failures.push(!success);
    
    // Maintain sliding window size
    if (this.failures.length > this.config.windowSize) {
      this.failures.shift();
    }
  }

  private getFailureRate(): number {
    if (this.failures.length === 0) return 0;
    
    const failureCount = this.failures.filter(failed => failed).length;
    return (failureCount / this.failures.length) * 100;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureRate: this.getFailureRate(),
      windowSize: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    logger.info(`Circuit breaker ${this.config.name} reset`);
  }
}

// Factory function for creating circuit breakers with default config
export function createCircuitBreaker(name: string, overrides: Partial<CircuitBreakerConfig> = {}): CircuitBreaker {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 40, // 40% failure rate
    windowSize: 20, // Track last 20 requests
    cooldownMs: 60000, // 60 seconds cooldown
    name
  };

  return new CircuitBreaker({ ...defaultConfig, ...overrides });
}