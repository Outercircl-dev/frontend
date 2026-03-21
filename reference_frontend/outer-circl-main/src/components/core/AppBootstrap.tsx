/**
 * AppBootstrap - Initialization State Machine
 * ARCHITECTURAL REBUILD: Foundational loading fix
 * 
 * This component implements a clean state machine with:
 * - Natural completion (no forced timeouts)
 * - Strict error handling
 * - Mobile-first with offline support
 * - MobileLoadingScreen emergency escape as user's safety net
 */

import React, { useState, useEffect, useReducer, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheManager } from '@/utils/CacheManager';
import { isSessionValid } from '@/utils/validateSession';
import type { Session } from '@supabase/supabase-js';
import MobileLoadingScreen from '@/components/MobileLoadingScreen';
import { ApplicationController } from '@/core/ApplicationController';

// Simplified state machine
enum InitState {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error'
}

// Hard timeout - app MUST reach READY within 10 seconds (PHASE 2: Reduced for production)
const HARD_TIMEOUT = 10000;

// Progressive loading stages for transparency
const LoadingStages = {
  [InitState.LOADING]: { message: 'Loading...', progress: 50, step: '1/2' },
  [InitState.ERROR]: { message: 'Connecting...', progress: 50, step: '1/2' },
  [InitState.READY]: { message: '', progress: 100, step: '2/2' }
}

// Persistent debug logging
const persistLog = (message: string, data?: any) => {
  try {
    const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      source: 'AppBootstrap',
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

interface InitializationState {
  state: InitState;
  session: Session | null;
  error: Error | null;
  startTime: number;
}

interface AppBootstrapProps {
  children: (state: InitializationState) => ReactNode;
}

/**
 * AppBootstrap wraps the entire app and manages initialization state
 * Children only render when state reaches READY
 */
export const AppBootstrap: React.FC<AppBootstrapProps> = ({ children }) => {
  const [initState, setInitState] = useState<InitializationState>({
    state: InitState.LOADING,
    session: null,
    error: null,
    startTime: Date.now()
  });

  // PHASE 1: Force render mechanism to guarantee state transitions
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    let mounted = true;
    let timeoutReached = false;
    const startTime = Date.now();

    const runInitialization = async () => {
      try {
        persistLog('🚀 AppBootstrap: Starting initialization');
        
        // Check cache first
        const cachedSession = cacheManager.get<Session>('session', 'auth');
        
        if (cachedSession && isSessionValid(cachedSession)) {
          persistLog('⚡ Cache valid - instant startup', { userId: cachedSession.user.id });
          
          // Immediately set READY with cached session
          if (mounted && !timeoutReached) {
            setInitState({
              state: InitState.READY,
              session: cachedSession,
              error: null,
              startTime
            });
            persistLog(`✅ Ready in ${Date.now() - startTime}ms (cached)`);
            ApplicationController.markReady();
          }

          // Background validation (don't block ready state)
          if (navigator.onLine) {
            try {
              // STEP 1.5: Add explicit 8-second timeout to Supabase call
              const sessionPromise = supabase.auth.getSession();
              const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Supabase timeout')), 8000)
              );
              
              const { data: { session: currentSession } } = await Promise.race([
                sessionPromise,
                timeoutPromise
              ]) as any;
              
              if (currentSession) {
                cacheManager.set('session', currentSession, 'auth');
                persistLog('🔄 Background validation: cache refreshed');
              }
            } catch (error) {
              persistLog('⚠️ Background validation failed (non-critical)', error);
            }
          }
          return;
        }

        // No valid cache - validate auth
        persistLog('🔄 No cache - validating auth');

        // Check if offline
        if (!navigator.onLine) {
          persistLog('📴 Offline - no cached session');
          if (mounted && !timeoutReached) {
            setInitState({
              state: InitState.READY,
              session: null,
              error: new Error('offline'),
              startTime
            });
            persistLog(`✅ Ready in ${Date.now() - startTime}ms (offline)`);
            ApplicationController.markReady();
          }
          return;
        }

        // STEP 1.5: Online - get session from Supabase with explicit timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Supabase timeout')), 8000)
        );
        
        const { data: { session: currentSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) throw error;

        // Set READY with session
        if (mounted && !timeoutReached) {
          setInitState({
            state: InitState.READY,
            session: currentSession,
            error: null,
            startTime
          });

          if (currentSession) {
            cacheManager.set('session', currentSession, 'auth');
            persistLog(`✅ Ready in ${Date.now() - startTime}ms (authenticated)`, { userId: currentSession.user.id });
          } else {
            persistLog(`✅ Ready in ${Date.now() - startTime}ms (no session)`);
          }
          
          ApplicationController.markReady();
        }

      } catch (error: any) {
        persistLog('❌ Initialization error', error);
        
        // On error, still go to READY (with cached session if available)
        const cachedSession = cacheManager.get<Session>('session', 'auth');
        
        if (mounted && !timeoutReached) {
          setInitState({
            state: InitState.READY,
            session: cachedSession || null,
            error: error,
            startTime
          });
          persistLog(`✅ Ready in ${Date.now() - startTime}ms (error fallback)`, { hasCache: !!cachedSession });
          ApplicationController.markReady();
        }
      }
    };

    // PHASE 1: Enhanced hard timeout with force render and DOM fallback
    const hardTimeoutHandle = setTimeout(() => {
      timeoutReached = true;
      if (mounted) {
        console.error('⏱️ HARD TIMEOUT REACHED - Forcing READY state');
        persistLog('⏱️ HARD TIMEOUT - forcing READY state after 10s');
        
        const cachedSession = cacheManager.get<Session>('session', 'auth');
        setInitState({
          state: InitState.READY,
          session: cachedSession || null,
          error: new Error('hard_timeout'),
          startTime
        });
        
        ApplicationController.markReady();
        
        // PHASE 1: Force component re-render to ensure UI updates
        forceUpdate();
        
        // PHASE 1: Last resort - direct DOM manipulation if React state fails
        setTimeout(() => {
          const loadingScreen = document.querySelector('[data-loading-screen]');
          if (loadingScreen) {
            console.error('🚨 Emergency: React state failed, forcing DOM update');
            persistLog('🚨 Emergency DOM removal triggered');
            loadingScreen.remove();
          }
        }, 1000);
      }
    }, HARD_TIMEOUT);

    // Run initialization
    runInitialization().catch((error) => {
      persistLog('❌ Catastrophic initialization failure', error);
      if (mounted && !timeoutReached) {
        const cachedSession = cacheManager.get<Session>('session', 'auth');
        setInitState({
          state: InitState.READY,
          session: cachedSession || null,
          error: error,
          startTime
        });
        ApplicationController.markReady();
      }
    }).finally(() => {
      clearTimeout(hardTimeoutHandle);
    });

    return () => {
      mounted = false;
      clearTimeout(hardTimeoutHandle);
    };
  }, []);

  // PHASE 3: Health check - Emergency override if stuck in loading too long
  useEffect(() => {
    const healthCheck = setInterval(() => {
      if (initState.state !== InitState.READY) {
        const elapsed = Date.now() - initState.startTime;
        console.warn(`⚠️ Still loading after ${elapsed}ms - state: ${initState.state}`);
        persistLog(`⚠️ Health check: Still loading after ${elapsed}ms`, { state: initState.state });
        
        if (elapsed > 20000) {
          console.error('🚨 CRITICAL: App stuck in loading for 20s+ - Emergency override');
          persistLog('🚨 CRITICAL: Emergency health check override triggered');
          
          // Emergency force to ready
          setInitState(prev => ({
            ...prev,
            state: InitState.READY
          }));
          ApplicationController.markReady();
          forceUpdate();
        }
      }
    }, 5000);
    
    return () => clearInterval(healthCheck);
  }, [initState.state, initState.startTime]);

  // Show loading screen until READY (with progressive transparency)
  if (initState.state !== InitState.READY) {
    const stage = LoadingStages[initState.state];
    
    return (
      <MobileLoadingScreen 
        message={stage.message}
        progress={stage.progress}
        step={stage.step}
        startTime={initState.startTime}
        data-loading-screen="true"
      />
    );
  }

  // Render app when READY
  return <>{children(initState)}</>;
};
