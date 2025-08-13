import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy-key-for-build',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy-domain.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dummy-bucket.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:dummy'
};

let app: FirebaseApp | undefined;
let auth: any = null;
let db: any = null;
let googleProvider: GoogleAuthProvider | null = null;

// Only initialize Firebase on the client side
if (typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (error) {
    console.warn('Firebase initialization error:', error);
  }
}

// Safe fallbacks for SSR
if (!auth) {
  auth = {
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
    signInWithPopup: () => Promise.reject(new Error('Firebase not configured')),
    signOut: () => Promise.resolve(),
    onAuthStateChanged: () => () => {},
    currentUser: null
  };
}

if (!db) {
  db = {};
}

if (!googleProvider) {
  googleProvider = {} as GoogleAuthProvider;
}

export { app, auth, db, googleProvider };