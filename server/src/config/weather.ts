import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment schema with validation and defaults
const WeatherConfigSchema = z.object({
  // API Configuration
  IMD_API_URL: z.string().url().default('http://localhost:5001'),
  OPENWEATHERMAP_API_KEY: z.string().min(1, 'OpenWeatherMap API key is required'),
  
  // Polling and Cache Configuration
  POLL_INTERVAL_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('600000'), // 10 minutes
  WEATHER_CACHE_TTL_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('300000'), // 5 minutes
  ALERT_CACHE_TTL_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('120000'), // 2 minutes
  
  // Server Configuration
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  
  // Twilio Configuration (for alerts)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Database Configuration
  REDIS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('100'),
  
  // HTTP Client Configuration
  HTTP_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('5000'),
  HTTP_RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).default('3'),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false')
});

// Validate environment variables
const parseResult = WeatherConfigSchema.safeParse({
  IMD_API_URL: process.env.IMD_API_URL,
  OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
  POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
  WEATHER_CACHE_TTL_MS: process.env.WEATHER_CACHE_TTL_MS,
  ALERT_CACHE_TTL_MS: process.env.ALERT_CACHE_TTL_MS,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  REDIS_URL: process.env.REDIS_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  HTTP_TIMEOUT_MS: process.env.HTTP_TIMEOUT_MS,
  HTTP_RETRY_ATTEMPTS: process.env.HTTP_RETRY_ATTEMPTS,
  LOG_LEVEL: process.env.LOG_LEVEL,
  LOG_PRETTY: process.env.LOG_PRETTY
});

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const weatherConfig = parseResult.data;

// Type for the configuration
export type WeatherConfig = z.infer<typeof WeatherConfigSchema>;

// Helper functions for configuration
export const isProduction = () => weatherConfig.NODE_ENV === 'production';
export const isDevelopment = () => weatherConfig.NODE_ENV === 'development';
export const isTest = () => weatherConfig.NODE_ENV === 'test';

// Twilio configuration validation
export const isTwilioConfigured = () => {
  return !!(weatherConfig.TWILIO_ACCOUNT_SID && 
           weatherConfig.TWILIO_AUTH_TOKEN && 
           weatherConfig.TWILIO_PHONE_NUMBER);
};

// Redis configuration validation
export const isRedisConfigured = () => {
  return !!weatherConfig.REDIS_URL;
};

// Database configuration validation
export const isDatabaseConfigured = () => {
  return !!weatherConfig.DATABASE_URL;
};

// Configuration summary for logging (with sensitive data redacted)
export const getConfigSummary = () => {
  return {
    environment: weatherConfig.NODE_ENV,
    port: weatherConfig.PORT,
    imdApiUrl: weatherConfig.IMD_API_URL,
    openWeatherMapConfigured: !!weatherConfig.OPENWEATHERMAP_API_KEY,
    pollIntervalMs: weatherConfig.POLL_INTERVAL_MS,
    weatherCacheTtlMs: weatherConfig.WEATHER_CACHE_TTL_MS,
    alertCacheTtlMs: weatherConfig.ALERT_CACHE_TTL_MS,
    twilioConfigured: isTwilioConfigured(),
    redisConfigured: isRedisConfigured(),
    databaseConfigured: isDatabaseConfigured(),
    rateLimitWindowMs: weatherConfig.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: weatherConfig.RATE_LIMIT_MAX_REQUESTS,
    httpTimeoutMs: weatherConfig.HTTP_TIMEOUT_MS,
    httpRetryAttempts: weatherConfig.HTTP_RETRY_ATTEMPTS,
    logLevel: weatherConfig.LOG_LEVEL,
    logPretty: weatherConfig.LOG_PRETTY
  };
};

// Validation for runtime configuration changes
export const validateConfig = (config: Partial<WeatherConfig>) => {
  return WeatherConfigSchema.partial().safeParse(config);
};

// Export individual config sections for easier access
export const apiConfig = {
  imdApiUrl: weatherConfig.IMD_API_URL,
  openWeatherMapApiKey: weatherConfig.OPENWEATHERMAP_API_KEY,
  httpTimeoutMs: weatherConfig.HTTP_TIMEOUT_MS,
  httpRetryAttempts: weatherConfig.HTTP_RETRY_ATTEMPTS
};

export const cacheConfig = {
  pollIntervalMs: weatherConfig.POLL_INTERVAL_MS,
  weatherCacheTtlMs: weatherConfig.WEATHER_CACHE_TTL_MS,
  alertCacheTtlMs: weatherConfig.ALERT_CACHE_TTL_MS,
  redisUrl: weatherConfig.REDIS_URL
};

export const securityConfig = {
  jwtSecret: weatherConfig.JWT_SECRET,
  encryptionKey: weatherConfig.ENCRYPTION_KEY
};

export const twilioConfig = {
  accountSid: weatherConfig.TWILIO_ACCOUNT_SID,
  authToken: weatherConfig.TWILIO_AUTH_TOKEN,
  phoneNumber: weatherConfig.TWILIO_PHONE_NUMBER
};

export const rateLimitConfig = {
  windowMs: weatherConfig.RATE_LIMIT_WINDOW_MS,
  maxRequests: weatherConfig.RATE_LIMIT_MAX_REQUESTS
};

export const logConfig = {
  level: weatherConfig.LOG_LEVEL,
  pretty: weatherConfig.LOG_PRETTY
};