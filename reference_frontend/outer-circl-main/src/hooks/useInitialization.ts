/**
 * useInitialization - Debugging Hook
 * Phase 1: Core architectural fix
 * 
 * Provides access to initialization state for debugging
 * Not needed for normal app operation
 */

import { useState, useEffect } from 'react';

interface InitializationInfo {
  isReady: boolean;
  loadTime: number | null;
}

export const useInitialization = (): InitializationInfo => {
  const [info, setInfo] = useState<InitializationInfo>({
    isReady: true, // Always ready (AppBootstrap guarantees this)
    loadTime: null
  });

  useEffect(() => {
    // Track load time for debugging
    const startTime = performance.timing?.navigationStart;
    const loadTime = startTime ? Date.now() - startTime : null;
    
    setInfo({
      isReady: true,
      loadTime
    });
  }, []);

  return info;
};
