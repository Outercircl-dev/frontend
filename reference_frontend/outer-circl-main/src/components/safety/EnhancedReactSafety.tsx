import React, { useState, useEffect } from 'react';

/**
 * Enhanced React safety checks with comprehensive logging and fallbacks
 * Specifically designed to handle React initialization race conditions
 */

// Global React availability check with detailed logging
export function checkReactAvailability(): { available: boolean; reason?: string } {
  try {
    // Check if React exists at all
    if (typeof React === 'undefined') {
      return { available: false, reason: 'React is undefined' };
    }
    
    if (React === null) {
      return { available: false, reason: 'React is null' };
    }
    
    // Check if hooks are available (they should be imported directly)
    if (typeof useState !== 'function') {
      return { available: false, reason: 'useState hook is not available' };
    }
    
    if (typeof useEffect !== 'function') {
      return { available: false, reason: 'useEffect hook is not available' };
    }
    
    if (typeof React.createElement !== 'function') {
      return { available: false, reason: 'React.createElement is not available' };
    }
    
    return { available: true };
  } catch (error) {
    return { available: false, reason: `React check failed: ${error.message}` };
  }
}

/**
 * Safe useState wrapper that only calls useState when React is available
 */
export function useSafeState<T>(initialValue: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] | null {
  const reactCheck = checkReactAvailability();
  
  if (!reactCheck.available) {
    console.warn(`useSafeState: React not available - ${reactCheck.reason}`);
    return null;
  }
  
  try {
    return useState(initialValue);
  } catch (error) {
    console.error(`useSafeState: useState failed:`, error);
    return null;
  }
}

/**
 * Safe useEffect wrapper that only calls useEffect when React is available
 */
export function useSafeEffect(
  effect: React.EffectCallback,
  deps?: React.DependencyList
): void {
  const reactCheck = checkReactAvailability();
  
  if (!reactCheck.available) {
    console.warn(`useSafeEffect: React not available - ${reactCheck.reason}`);
    return;
  }
  
  try {
    useEffect(effect, deps);
  } catch (error) {
    console.error(`useSafeEffect: useEffect failed:`, error);
  }
}

/**
 * Component wrapper that ensures React is available before rendering
 */
interface ReactSafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

export const ReactSafeWrapper: React.FC<ReactSafeWrapperProps> = ({
  children,
  fallback,
  componentName = 'Component'
}) => {
  const reactCheck = checkReactAvailability();
  
  if (!reactCheck.available) {
    console.error(`ReactSafeWrapper (${componentName}): ${reactCheck.reason}`);
    
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Return a simple DOM element that doesn't use React hooks
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading {componentName}...</p>
          <p className="text-xs text-gray-500 mt-2">React initializing...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

/**
 * Higher-order component to make any component React-safe
 */
export function withReactSafety<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const SafeComponent: React.FC<P> = (props) => {
    const reactCheck = checkReactAvailability();
    
    if (!reactCheck.available) {
      console.warn(`withReactSafety: Component ${Component.displayName || Component.name} not rendered - ${reactCheck.reason}`);
      
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return (
        <div className="p-4 text-center">
          <div className="text-sm text-muted-foreground">
            Component temporarily unavailable
          </div>
        </div>
      );
    }
    
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error(`withReactSafety: Component ${Component.displayName || Component.name} crashed:`, error);
      return (
        <div className="p-4 text-center">
          <div className="text-sm text-muted-foreground">
            Component error
          </div>
        </div>
      );
    }
  };
  
  SafeComponent.displayName = `ReactSafe(${Component.displayName || Component.name})`;
  return SafeComponent;
}