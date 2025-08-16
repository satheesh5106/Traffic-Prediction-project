// Simple test script to verify authentication functionality

// Import Firebase
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } = require('firebase/auth');

// Firebase configuration - using dummy values for testing
const firebaseConfig = {
  apiKey: 'dummy-key-for-build',
  authDomain: 'dummy-domain.firebaseapp.com',
  projectId: 'dummy-project',
  storageBucket: 'dummy-bucket.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:dummy'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Test user credentials
const testEmail = 'test@example.com';
const testPassword = 'password123';

// Test functions
async function testSignUp() {
  try {
    console.log(`Testing sign up with ${testEmail}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('Sign up successful:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Sign up error:', error.code, error.message);
    // If user already exists, that's okay for our test
    if (error.code === 'auth/email-already-in-use') {
      console.log('User already exists, proceeding with sign in test');
      return null;
    }
    throw error;
  }
}

async function testSignIn() {
  try {
    console.log(`Testing sign in with ${testEmail}...`);
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('Sign in successful:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Sign in error:', error.code, error.message);
    throw error;
  }
}

async function testSignOut() {
  try {
    console.log('Testing sign out...');
    await signOut(auth);
    console.log('Sign out successful');
  } catch (error) {
    console.error('Sign out error:', error.code, error.message);
    throw error;
  }
}

// Run tests
async function runTests() {
  try {
    // Try to create a test user (or use existing)
    await testSignUp();
    
    // Test sign in
    const user = await testSignIn();
    
    // Test sign out
    if (user) {
      await testSignOut();
    }
    
    console.log('All authentication tests completed successfully!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

runTests();