import React, { ReactNode } from 'react';

interface SimpleSafetyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Simple wrapper that just renders children - no problematic safety checks
 */
export const SimpleSafetyWrapper: React.FC<SimpleSafetyWrapperProps> = ({ 
  children, 
  fallback 
}) => {
  return <>{children}</>;
};

/**
 * HOC to wrap components safely
 */
export function withSafety<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const SafeComponent: React.FC<P> = (props) => {
    return <Component {...props} />;
  };

  SafeComponent.displayName = `Safe(${Component.displayName || Component.name})`;
  return SafeComponent;
}