/**
 * AppProviders - Provider Orchestrator
 * Phase 1: Core architectural fix
 * 
 * Correct provider hierarchy:
 * AppBootstrap → HelmetProvider → AuthProvider → AppContextProvider → BrowserRouter
 * 
 * CRITICAL: BrowserRouter only mounts AFTER AppBootstrap reaches READY state
 * This eliminates router context errors at their root cause
 */

import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppBootstrap } from './AppBootstrap';
import { AuthProvider } from './AuthProvider';
import { AppContextProvider } from './AppContextProvider';
import { Toaster as RadixToaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { ApplicationController } from '@/core/ApplicationController';

interface AppProvidersProps {
  children: ReactNode;
}

// Persistent debug logging
const persistLog = (message: string, data?: any) => {
  try {
    const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      source: 'AppProviders',
      message,
      data
    });
    if (logs.length > 50) logs.shift();
    localStorage.setItem('debug_logs', JSON.stringify(logs));
    console.log(message, data);
  } catch (e) {
    console.warn('Failed to persist log:', e);
  }
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AppBootstrap>
      {(initState) => {
        // Allow rendering with offline or hard_timeout errors
        const blockingError = initState.error && 
          initState.error.message !== 'offline' && 
          initState.error.message !== 'hard_timeout' &&
          initState.error.message !== 'slow_network';
        
        if (blockingError) {
          persistLog('❌ AppProviders: Blocking error - cannot render app', {
            error: initState.error?.message,
            state: initState.state
          });
          return (
            <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="text-center p-6 max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Start</h3>
                <p className="text-muted-foreground mb-6">
                  {initState.error?.message === 'timeout' 
                    ? 'Connection timeout - please check your internet connection'
                    : initState.error?.message || 'An initialization error occurred'}
                </p>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    ApplicationController.reset();
                    ApplicationController.requestReload('User requested reload from error state', 'temporary' as any);
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 font-medium transition-colors"
                >
                  Clear Cache & Reload
                </button>
              </div>
            </div>
          );
        }

        // State is READY - safe to render
        persistLog('✅ AppProviders: Rendering app', {
          hasSession: !!initState.session,
          error: initState.error?.message || 'none'
        });

        return (
          <HelmetProvider>
          <AuthProvider initialSession={initState.session}>
            <AppContextProvider>
              <BrowserRouter>
                  <div data-provider="app-providers">
                    {children}
                    <RadixToaster />
                    <SonnerToaster />
                  </div>
                </BrowserRouter>
              </AppContextProvider>
            </AuthProvider>
          </HelmetProvider>
        );
      }}
    </AppBootstrap>
  );
};
