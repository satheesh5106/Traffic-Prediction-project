'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  AuthError
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return () => {};
    }
    
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setUser(user);
        setLoading(false);
      }, 
      (error) => {
        console.error('Auth state change error:', error.message);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<User | null> => {
    try {
      setLoading(true);
      clearError();
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err: unknown) {
      const authError = err as AuthError;
      console.error('Sign in error:', authError.message);
      setError(authError.message || 'Failed to sign in');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<User | null> => {
    try {
      setLoading(true);
      clearError();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err: unknown) {
      const authError = err as AuthError;
      console.error('Sign up error:', authError.message);
      setError(authError.message || 'Failed to create account');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      setLoading(true);
      clearError();
      if (!googleProvider) {
        throw new Error('Google provider not available');
      }
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err: unknown) {
      const authError = err as AuthError;
      console.error('Google sign in error:', authError.message);
      setError(authError.message || 'Failed to sign in with Google');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      clearError();
      await signOut(auth);
    } catch (err: unknown) {
      const authError = err as AuthError;
      console.error('Logout error:', authError.message);
      setError(authError.message || 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signUp,
      signInWithGoogle,
      logout,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};