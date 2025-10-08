module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/*.(test|spec).js'
  ],
  
  // Coverage configuration
  collectCoverage: false,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Timeout configuration
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  bail: false,
  
  // Watch mode configuration
  watchman: true,
  
  // Global variables
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      FIREBASE_PROJECT_ID: 'test-project',
      HERE_API_KEY: 'test-here-key',
      OPENROUTESERVICE_API_KEY: 'test-ors-key',
      ONESIGNAL_APP_ID: 'test-onesignal-app',
      ONESIGNAL_REST_API_KEY: 'test-onesignal-key'
    }
  },
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  },
  
  // Reporter configuration
  reporters: ['default'],
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode
  notify: false,
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache'
};