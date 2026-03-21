import { useState, useCallback, useRef } from 'react';

/**
 * A stable state hook that prevents unnecessary re-renders by only updating
 * when the value actually changes (using Object.is comparison)
 */
export function useStableState<T>(initialValue: T | (() => T)) {
  const [state, setState] = useState(initialValue);
  const prevValueRef = useRef(state);

  const setStableState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      
      // Only update if the value actually changed
      if (!Object.is(nextValue, prevValueRef.current)) {
        prevValueRef.current = nextValue;
        return nextValue;
      }
      
      return prev;
    });
  }, []);

  return [state, setStableState] as const;
}

/**
 * Hook to create a stable callback that won't change unless dependencies change
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  const depsRef = useRef(deps);

  // Check if dependencies changed
  const depsChanged = deps.some((dep, index) => !Object.is(dep, depsRef.current[index]));
  
  if (depsChanged) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback(callbackRef.current, deps);
}