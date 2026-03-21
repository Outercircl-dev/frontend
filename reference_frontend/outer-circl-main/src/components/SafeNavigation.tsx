import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SafeNavigationProps {
  children: (navigate: (path: string) => void) => React.ReactNode;
  fallback?: React.ReactNode;
}

export const SafeNavigation: React.FC<SafeNavigationProps> = ({ children, fallback }) => {
  try {
    const navigate = useNavigate();
    
    const safeNavigate = (path: string) => {
      try {
        navigate(path);
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to window location
        window.location.href = path;
      }
    };
    
    return <>{children(safeNavigate)}</>;
  } catch (error) {
    console.error('Router context error:', error);
    
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // If no fallback provided, render children with window navigation
    return <>{children((path: string) => { window.location.href = path; })}</>;
  }
};

interface SafeNavigateButtonProps {
  path: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SafeNavigateButton: React.FC<SafeNavigateButtonProps> = ({ 
  path, 
  children, 
  className,
  onClick 
}) => {
  return (
    <SafeNavigation>
      {(navigate) => (
        <button
          className={className}
          onClick={() => {
            onClick?.();
            navigate(path);
          }}
        >
          {children}
        </button>
      )}
    </SafeNavigation>
  );
};