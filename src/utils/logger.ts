/**
 * Logger Utility
 * 
 * Provides structured logging with severity levels and timestamps.
 * Used for tracking performance metrics and debugging.
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogOptions {
  level?: LogLevel;
  includeTimestamp?: boolean;
  prefix?: string;
}

class Logger {
  private level: LogLevel;
  private includeTimestamp: boolean;
  private prefix: string;
  
  /**
   * Create a new logger
   * @param options Logger configuration options
   */
  constructor(options: LogOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.prefix = options.prefix ?? '';
  }
  
  /**
   * Set the log level
   * @param level New log level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  /**
   * Log a debug message
   * @param message Message to log
   * @param args Additional arguments to log
   */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }
  
  /**
   * Log an info message
   * @param message Message to log
   * @param args Additional arguments to log
   */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param args Additional arguments to log
   */
  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }
  
  /**
   * Log an error message
   * @param message Message to log
   * @param args Additional arguments to log
   */
  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }
  
  /**
   * Log a message with the specified level
   * @param level Log level
   * @param message Message to log
   * @param args Additional arguments to log
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Skip if level is below current level
    if (level < this.level) {
      return;
    }
    
    // Build log entry
    const entry: any = {};
    
    // Add timestamp
    if (this.includeTimestamp) {
      entry.timestamp = new Date().toISOString();
    }
    
    // Add level
    entry.level = LogLevel[level];
    
    // Add prefix if set
    const prefix = this.prefix ? `${this.prefix}: ` : '';
    
    // Add message
    entry.message = `${prefix}${message}`;
    
    // Add additional args if any
    if (args.length > 0) {
      entry.data = args;
    }
    
    // Output log entry
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(entry);
        break;
      case LogLevel.INFO:
        console.info(entry);
        break;
      case LogLevel.WARN:
        console.warn(entry);
        break;
      case LogLevel.ERROR:
        console.error(entry);
        break;
    }
  }
  
  /**
   * Create a child logger with a prefix
   * @param prefix Prefix for the child logger
   * @returns New logger instance with the specified prefix
   */
  public child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      includeTimestamp: this.includeTimestamp,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix
    });
  }
  
  /**
   * Time a function execution and log the duration
   * @param name Name of the operation
   * @param fn Function to time
   * @returns Result of the function
   */
  public async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${name} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${name} failed after ${duration}ms`, error);
      throw error;
    }
  }
  
  /**
   * Time a synchronous function execution and log the duration
   * @param name Name of the operation
   * @param fn Function to time
   * @returns Result of the function
   */
  public timeSync<T>(name: string, fn: () => T): T {
    const start = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - start;
      this.info(`${name} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${name} failed after ${duration}ms`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  includeTimestamp: true,
  prefix: 'TrafficAI'
});

// Export LogLevel enum
export { LogLevel };