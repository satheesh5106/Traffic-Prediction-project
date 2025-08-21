const { initializeApp, cert, getApps } = require('firebase-admin/app');

/**
 * Initialize Firebase Admin SDK
 * @returns {Object} Firebase app instance
 */
const initializeFirebase = () => {
  try {
    // Check if app is already initialized
    const apps = getApps();
    if (apps.length > 0) {
      return apps[0];
    }
    
    // Initialize with service account if running in production
    if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // Initialize with default config for development
      return initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'traffic-ai-dev'
      });
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

module.exports = {
  initializeFirebase
};