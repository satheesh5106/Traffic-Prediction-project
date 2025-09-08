import { weatherConfig } from '../config/weather';
import { InternalServerError } from '../errors/weatherErrors';
import { logger } from '../app';

// Retry options interface
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 300) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Jitter factor to add randomness (0-1, default: 0.1) */
  jitter?: number;
  /** Function to determine if error should trigger retry */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** Callback called before each retry attempt */
  onRetry?: (error: any, attempt: number, delay: number) => void;
  /** Provider name for logging */
  provider?: string;
}

// Default retry options
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'provider'>> & { provider?: string } = {
  maxAttempts: weatherConfig.HTTP_RETRY_ATTEMPTS,
  initialDelay: 300, // 300ms base delay with jitter ±100ms
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: 0.33, // ±100ms jitter on 300ms base = 33%
  shouldRetry: (error: any, attempt: number) => {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
      return false;
    }
    
    // Don't retry on authentication errors
    if (error.errorCode === 'AUTH_ERROR') {
      return false;
    }
    
    // Don't retry on validation errors
    if (error.errorCode === 'VALIDATION_ERROR') {
      return false;
    }
    
    // Retry on network errors, timeouts, and server errors
    return true;
  },
  onRetry: (error: any, attempt: number, delay: number) => {
    logger.warn({
      attempt,
      delay,
      error: error.message || error,
      provider: 'unknown'
    }, `Retry attempt ${attempt} after ${delay}ms delay`);
  }
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: number
): number {
  // Exponential backoff: delay = initialDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  
  // Apply maximum delay cap
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter: ±jitter% of the delay (e.g., ±100ms on 300ms base)
  const jitterAmount = cappedDelay * jitter * (Math.random() * 2 - 1); // -jitter to +jitter
  const finalDelay = Math.max(0, cappedDelay + jitterAmount);
  
  return Math.round(finalDelay);
}

/**
 * Extract Retry-After header value and convert to milliseconds
 */
function getRetryAfterDelay(error: any): number | null {
  const retryAfter = error.response?.headers?.['retry-after'] || error.headers?.['retry-after'];
  
  if (!retryAfter) return null;
  
  // Retry-After can be in seconds (number) or HTTP date
  const parsed = parseInt(retryAfter, 10);
  if (!isNaN(parsed)) {
    return parsed * 1000; // Convert seconds to milliseconds
  }
  
  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  
  return null;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects with the last error
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await fn();
      
      // Success - log if this wasn't the first attempt
      if (attempt > 1) {
        logger.info({
          attempt,
          provider: opts.provider || 'unknown'
        }, `Operation succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!opts.shouldRetry(error, attempt)) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.debug({
          error: errorMessage,
          provider: opts.provider || 'unknown',
          attempt
        }, 'Not retrying due to error type');
        throw error;
      }
      
      // Don't retry if this was the last attempt
      if (attempt >= opts.maxAttempts) {
        logger.warn({
          maxAttempts: opts.maxAttempts,
          provider: opts.provider || 'unknown'
        }, 'Max retry attempts reached');
        break;
      }
      
      // Check for 429 Retry-After header
      let delay: number;
      const retryAfterDelay = getRetryAfterDelay(error);
      
      if ((error as any).statusCode === 429 && retryAfterDelay !== null) {
        // Use Retry-After header value, but cap it at maxDelay
        delay = Math.min(retryAfterDelay, opts.maxDelay);
        logger.info({
          retryAfterMs: retryAfterDelay,
          cappedDelayMs: delay,
          provider: opts.provider || 'unknown'
        }, 'Using Retry-After header for delay');
      } else {
        // Calculate delay with exponential backoff and jitter
        delay = calculateDelay(
          attempt,
          opts.initialDelay,
          opts.maxDelay,
          opts.backoffMultiplier,
          opts.jitter
        );
      }
      
      // Call retry callback with provider info
      const enhancedOnRetry = (error: any, attempt: number, delay: number) => {
        logger.warn({
          attempt,
          delay,
          error: error.message || error,
          provider: opts.provider || 'unknown'
        }, `Retry attempt ${attempt} after ${delay}ms delay`);
        
        if (opts.onRetry) {
          opts.onRetry(error, attempt, delay);
        }
      };
      
      enhancedOnRetry(error, attempt, delay);
      
      // Wait before next attempt
      await sleep(delay);
    }
  }
  
  // All attempts failed - throw the last error
  throw lastError;
}

/**
 * Retry a function with a simple linear backoff (for simpler use cases)
 * 
 * @param fn - The async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param delay - Fixed delay between attempts in ms (default: 1000)
 * @returns Promise that resolves with the function result or rejects with the last error
 */
export async function withSimpleRetries<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  return withRetries(fn, {
    maxAttempts,
    initialDelay: delay,
    maxDelay: delay,
    backoffMultiplier: 1, // No exponential backoff
    jitter: 0 // No jitter
  });
}

/**
 * Retry specifically for HTTP requests with appropriate defaults
 * 
 * @param fn - The async HTTP request function
 * @param options - Retry configuration options
 * @returns Promise that resolves with the request result
 */
export async function withHttpRetries<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetries(fn, {
    maxAttempts: weatherConfig.HTTP_RETRY_ATTEMPTS,
    initialDelay: 1000,
    maxDelay: 10000, // 10 seconds max for HTTP requests
    backoffMultiplier: 2,
    jitter: 0.1,
    shouldRetry: (error: any, attempt: number) => {
      // Retry on network errors and 5xx server errors
      if (error.statusCode >= 500 || !error.statusCode) {
        return true;
      }
      
      // Retry on rate limiting (429)
      if (error.statusCode === 429) {
        return true;
      }
      
      // Don't retry on client errors (4xx except 429)
      return false;
    },
    onRetry: (error: any, attempt: number, delay: number) => {
      console.log(
        `HTTP retry attempt ${attempt}/${weatherConfig.HTTP_RETRY_ATTEMPTS} after ${delay}ms. ` +
        `Status: ${error.statusCode || 'NETWORK_ERROR'}, Error: ${error.message}`
      );
    },
    ...options
  });
}

/**
 * Create a retryable version of an async function
 * 
 * @param fn - The async function to make retryable
 * @param options - Default retry options for this function
 * @returns A new function that will retry on failure
 */
export function makeRetryable<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
) {
  return async (...args: TArgs): Promise<TReturn> => {
    return withRetries(() => fn(...args), options);
  };
}

// Export utility functions
export {
  DEFAULT_RETRY_OPTIONS,
  calculateDelay,
  sleep
};

// Export default retry function
export default withRetries;