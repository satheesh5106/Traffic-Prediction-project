'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, User, signInWithRedirect, getRedirectResult } from 'firebase/auth';

interface AuthContextType {
  user: any;
  loading: boolean;
  error: Error | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        setAuthError(error);
        setLoading(false);
      }
    );

    // Handle redirect result for Google Sign-In
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User signed in via redirect
          setUser(result.user);
        }
      })
      .catch((error) => {
        setAuthError(error);
      });
    
    return () => unsubscribe();
  }, []);
  
  // Use the auth error state
  const combinedError = authError;

  const clearError = () => {
    setAuthError(undefined);
  };

  const signIn = async (email: string, password: string) => {
    if (!isClient || !auth) {
      throw new Error('Authentication not available');
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      clearError();
    } catch (err) {
      setAuthError(err as Error);
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!isClient || !auth) {
      throw new Error('Authentication not available');
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      clearError();
    } catch (err) {
      setAuthError(err as Error);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    if (!isClient || !auth || !googleProvider) {
      throw new Error('Authentication not available');
    }
    try {
      await signInWithRedirect(auth, googleProvider);
      clearError();
    } catch (err) {
      setAuthError(err as Error);
      throw err;
    }
  };

  const logout = async () => {
    if (!isClient || !auth) {
      throw new Error('Authentication not available');
    }
    try {
      await signOut(auth);
      clearError();
    } catch (err) {
      setAuthError(err as Error);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: isClient ? user : null, 
      loading: isClient ? loading : true, 
      error: combinedError, 
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};