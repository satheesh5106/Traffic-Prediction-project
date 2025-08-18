import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  apiKey: process.env.FIREBASE_API_KEY
};

// Initialize Firebase Admin if not already initialized
let app: admin.app.App;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

try {
  if (!admin.apps.length) {
    // Initialize with service account if available
    if (process.env.FIREBASE_PRIVATE_KEY) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // Initialize with application default credentials or config
      app = admin.initializeApp(firebaseConfig);
    }
  } else {
    app = admin.app();
  }
  
  // Get Auth and Firestore instances
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

export { app, auth, db };