'use client';

import { AuthProvider } from '@/hooks/useAuth';

export default function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}