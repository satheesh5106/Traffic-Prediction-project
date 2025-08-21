"use strict";
/**
 * Logger Utility
 *
 * Provides structured logging with severity levels and timestamps.
 * Used for tracking performance metrics and debugging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.logger = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    /**
     * Create a new logger
     * @param options Logger configuration options
     */
    constructor(options = {}) {
        var _a, _b, _c;
        this.level = (_a = options.level) !== null && _a !== void 0 ? _a : LogLevel.INFO;
        this.includeTimestamp = (_b = options.includeTimestamp) !== null && _b !== void 0 ? _b : true;
        this.prefix = (_c = options.prefix) !== null && _c !== void 0 ? _c : '';
    }
    /**
     * Set the log level
     * @param level New log level
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * Log a debug message
     * @param message Message to log
     * @param args Additional arguments to log
     */
    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }
    /**
     * Log an info message
     * @param message Message to log
     * @param args Additional arguments to log
     */
    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }
    /**
     * Log a warning message
     * @param message Message to log
     * @param args Additional arguments to log
     */
    warn(message, ...args) {
        this.log(LogLevel.WARN, message, ...args);
    }
    /**
     * Log an error message
     * @param message Message to log
     * @param args Additional arguments to log
     */
    error(message, ...args) {
        this.log(LogLevel.ERROR, message, ...args);
    }
    /**
     * Log a message with the specified level
     * @param level Log level
     * @param message Message to log
     * @param args Additional arguments to log
     */
    log(level, message, ...args) {
        // Skip if level is below current level
        if (level < this.level) {
            return;
        }
        // Build log entry
        const entry = {};
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
    child(prefix) {
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
    async time(name, fn) {
        const start = Date.now();
        try {
            const result = await fn();
            const duration = Date.now() - start;
            this.info(`${name} completed in ${duration}ms`);
            return result;
        }
        catch (error) {
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
    timeSync(name, fn) {
        const start = Date.now();
        try {
            const result = fn();
            const duration = Date.now() - start;
            this.info(`${name} completed in ${duration}ms`);
            return result;
        }
        catch (error) {
            const duration = Date.now() - start;
            this.error(`${name} failed after ${duration}ms`, error);
            throw error;
        }
    }
}
// Export singleton instance
exports.logger = new Logger({
    level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    includeTimestamp: true,
    prefix: 'TrafficAI'
});
