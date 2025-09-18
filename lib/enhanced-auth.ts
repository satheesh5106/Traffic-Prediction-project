import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';
import Cookies from 'js-cookie';

// Define interfaces
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

const TOKEN_COOKIE_NAME = '__session';
const REFRESH_TOKEN_COOKIE_NAME = '__refresh';

// Helper to generate a secure random string for PKCE
function generateRandomString(length: number) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return randomString;
}

// Helper to generate a code_challenge from a code_verifier
async function generateCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export const EnhancedAuthService = {
  async signInWithGoogle(): Promise<UserProfile | null> {
    if (!auth) {
      console.error('Firebase auth not initialized');
      throw new Error('Firebase authentication is not properly configured. Please check your Firebase setup.');
    }
    
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    try {
      // Check if we're in a secure context
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.protocol !== 'http:') {
        throw new Error('OAuth requires a secure context (HTTPS) or localhost.');
      }
      
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      const idToken = await user.getIdToken();
      const refreshToken = user.refreshToken;
      const accessToken = (result as any)._tokenResponse?.accessToken || idToken;

      this.setAuthCookies(idToken, refreshToken, accessToken);
      return this.mapFirebaseUserToUserProfile(user);
    } catch (error: any) {
      console.error('Google sign-in error details:', {
        code: error.code,
        message: error.message,
        customData: error.customData
      });
      
      // Handle specific Firebase Auth errors with user-friendly messages
      switch (error.code) {
        case 'auth/popup-blocked':
          throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
        case 'auth/popup-closed-by-user':
          throw new Error('Sign-in was cancelled. Please try again.');
        case 'auth/unauthorized-domain':
          throw new Error('This domain is not authorized for Google sign-in. Please contact support.');
        case 'auth/operation-not-allowed':
          throw new Error('Google sign-in is not enabled. Please contact support.');
        case 'auth/invalid-api-key':
          throw new Error('Invalid Firebase configuration. Please contact support.');
        case 'auth/app-deleted':
          throw new Error('Firebase app configuration error. Please contact support.');
        case 'auth/network-request-failed':
          throw new Error('Network error. Please check your internet connection and try again.');
        default:
          throw new Error(`Google sign-in failed: ${error.message || 'Unknown error occurred'}`);
      }
    }
  },

  async signInWithEmailAndPassword(email: string, password: string): Promise<UserProfile | null> {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const idToken = await user.getIdToken();
      const refreshToken = user.refreshToken;
      
      this.setAuthCookies(idToken, refreshToken, idToken);
      return this.mapFirebaseUserToUserProfile(user);
    } catch (error: any) {
      console.error('Email/password sign-in error:', error);
      throw error;
    }
  },

  async signUp(email: string, password: string): Promise<UserProfile | null> {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const idToken = await user.getIdToken();
      const refreshToken = user.refreshToken;
      
      this.setAuthCookies(idToken, refreshToken, idToken);
      return this.mapFirebaseUserToUserProfile(user);
    } catch (error: any) {
      console.error('Sign-up error:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    
    try {
      await signOut(auth);
      this.clearAuthCookies();
    } catch (error: any) {
      console.error('Sign-out error:', error);
      throw error;
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  async refreshAccessToken(): Promise<string | null> {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken(true);
        const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE_NAME) || '';
        const accessToken = (await currentUser.getIdTokenResult()).token;
        
        this.setAuthCookies(idToken, refreshToken, accessToken);
        return idToken;
      }
      return null;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      this.clearAuthCookies();
      throw error;
    }
  },

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    if (!auth) {
      console.warn('Firebase auth not initialized');
      return () => {};
    }
    
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile = this.mapFirebaseUserToUserProfile(firebaseUser);
        callback(userProfile);
      } else {
        callback(null);
      }
    });
  },

  getCurrentUser(): UserProfile | null {
    if (!auth) {
      return null;
    }
    
    const firebaseUser = auth.currentUser;
    return firebaseUser ? this.mapFirebaseUserToUserProfile(firebaseUser) : null;
  },

  getAuthTokens(): AuthTokens | null {
    const accessToken = Cookies.get(TOKEN_COOKIE_NAME);
    const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE_NAME);
    const idToken = Cookies.get(TOKEN_COOKIE_NAME);

    if (accessToken && refreshToken && idToken) {
      return { accessToken, refreshToken, idToken };
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!Cookies.get(TOKEN_COOKIE_NAME);
  },

  setAuthCookies(idToken: string, refreshToken: string, accessToken: string) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cookieOptions = {
      expires: 7,
      secure: !isDevelopment,
      sameSite: 'Lax' as const,
    };

    Cookies.set(TOKEN_COOKIE_NAME, idToken, cookieOptions);
    Cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, cookieOptions);
  },

  clearAuthCookies() {
    Cookies.remove(TOKEN_COOKIE_NAME);
    Cookies.remove(REFRESH_TOKEN_COOKIE_NAME);
  },

  mapFirebaseUserToUserProfile(firebaseUser: FirebaseUser): UserProfile {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
    };
  },
};

export default EnhancedAuthService;