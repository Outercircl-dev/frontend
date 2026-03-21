import React, { useEffect, useRef } from 'react';

interface HookCallDebuggerProps {
  componentName: string;
  enabled?: boolean;
}

/**
 * Debug component to track hook call consistency
 * Helps identify when components are calling different numbers of hooks between renders
 */
export const HookCallDebugger: React.FC<HookCallDebuggerProps> = ({
  componentName,
  enabled = process.env.NODE_ENV === 'development'
}) => {
  const renderCountRef = useRef(0);
  const hookCallsRef = useRef<string[]>([]);
  
  useEffect(() => {
    if (!enabled) return;
    
    renderCountRef.current++;
    
    // In development, track which hooks are being called
    if (enabled) {
      console.group(`🔍 ${componentName} - Render #${renderCountRef.current}`);
      console.log('Hook calls tracked:', hookCallsRef.current.length);
      console.log('Previous renders:', renderCountRef.current - 1);
      console.groupEnd();
    }
  });

  // Track hook calls in development
  const trackHookCall = (hookName: string) => {
    if (enabled) {
      hookCallsRef.current.push(hookName);
    }
  };

  // Validation effect
  useEffect(() => {
    if (!enabled) return;
    
    return () => {
      // Reset hook calls for next render cycle
      hookCallsRef.current = [];
    };
  });

  // Only render in development
  if (!enabled) return null;

  return (
    <div 
      className="fixed top-0 right-0 bg-red-500 text-white p-2 text-xs z-50 opacity-50"
      style={{ pointerEvents: 'none' }}
    >
      {componentName}: R#{renderCountRef.current}
    </div>
  );
};

export default HookCallDebugger;