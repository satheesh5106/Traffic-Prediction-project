'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { EnhancedAuthService, UserProfile } from '../lib/enhanced-auth';

interface EnhancedAuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<UserProfile | null>;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<UserProfile | null>;
  signUp: (email: string, password: string) => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

interface EnhancedAuthProviderProps {
  children: ReactNode;
}

export function EnhancedAuthProvider({ children }: EnhancedAuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = EnhancedAuthService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      const user = await EnhancedAuthService.signInWithGoogle();
      setUser(user);
      return user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmailAndPassword = async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      const user = await EnhancedAuthService.signInWithEmailAndPassword(email, password);
      setUser(user);
      return user;
    } catch (error) {
      console.error('Email/password sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      const user = await EnhancedAuthService.signUp(email, password);
      setUser(user);
      return user;
    } catch (error) {
      console.error('Sign-up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await EnhancedAuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await EnhancedAuthService.resetPassword(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      return await EnhancedAuthService.refreshAccessToken();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  };

  const value: EnhancedAuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmailAndPassword,
    signUp,
    signOut,
    resetPassword,
    refreshAccessToken,
    isAuthenticated: EnhancedAuthService.isAuthenticated(),
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

export function useEnhancedAuth(): EnhancedAuthContextType {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}

export default EnhancedAuthContext;