'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ReactNode } from 'react';

interface ClientAuthProviderProps {
  children: ReactNode;
}

export default function ClientAuthProvider({ children }: ClientAuthProviderProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}