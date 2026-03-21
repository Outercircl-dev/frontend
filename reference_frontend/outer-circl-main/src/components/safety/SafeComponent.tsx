import React, { ReactNode, ComponentType } from 'react';
import { SimpleSafetyWrapper } from './SimpleSafetyWrapper';

interface SafeComponentProps {
  children: ReactNode;
  name?: string;
  fallback?: ReactNode;
}

/**
 * A generic safe component wrapper that can be used to wrap any component
 * with React safety checks and error boundaries
 */
export const SafeComponent: React.FC<SafeComponentProps> = ({ 
  children, 
  name = 'Component',
  fallback 
}) => {
  return (
    <SimpleSafetyWrapper
      fallback={fallback || (
        <div className="p-4 text-center">
          <div className="text-sm text-muted-foreground">
            {name} temporarily unavailable
          </div>
        </div>
      )}
    >
      {children}
    </SimpleSafetyWrapper>
  );
};

/**
 * Higher-order component to make any component safe from React initialization issues
 */
export function makeSafe<P extends object>(
  Component: ComponentType<P>, 
  componentName?: string
): ComponentType<P> {
  const SafeWrappedComponent: React.FC<P> = (props) => (
    <SafeComponent 
      name={componentName || Component.displayName || Component.name}
    >
      <Component {...props} />
    </SafeComponent>
  );

  SafeWrappedComponent.displayName = `Safe(${Component.displayName || Component.name})`;
  
  return SafeWrappedComponent;
}