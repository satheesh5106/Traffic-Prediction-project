'use client';

import { EnhancedAuthProvider } from '@/contexts/EnhancedAuthContext';

export default function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return <EnhancedAuthProvider>{children}</EnhancedAuthProvider>;
}