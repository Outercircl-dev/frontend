/**
 * AuthProvider - Simplified Authentication Context
 * Phase 1: Core architectural fix
 * 
 * Single responsibility: Manage authenticated session state
 * - Receives initial session from AppBootstrap
 * - Listens for auth state changes
 * - Caches session (write-through only)
 * - No initialization logic (handled by AppBootstrap)
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cacheManager } from '@/utils/CacheManager';

interface AuthContextType {
  user: User | null;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialSession: Session | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, initialSession }) => {
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [session, setSession] = useState<Session | null>(initialSession);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, updatedSession) => {
      console.log('🔄 Auth state changed:', event);
      
      setUser(updatedSession?.user || null);
      setSession(updatedSession);
      
      // Write-through caching
      if (updatedSession) {
        cacheManager.set('session', updatedSession, 'auth');
      } else {
        cacheManager.remove('session', 'auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  
  return context;
};
