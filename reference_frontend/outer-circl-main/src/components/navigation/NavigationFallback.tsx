import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApplicationController } from '@/core/ApplicationController';

interface NavigationFallbackProps {
  error?: string;
  onRetry?: () => void;
}

/**
 * Fallback component for navigation errors with safe options
 */
export const NavigationFallback: React.FC<NavigationFallbackProps> = ({ 
  error = "Navigation error occurred",
  onRetry
}) => {
  const handleSafeNavigate = (path: string) => {
    ApplicationController.recoverNavigation(path);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <Alert>
          <AlertDescription className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#E60023] mb-2">outercircl</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => handleSafeNavigate('/dashboard')}
                  className="w-full bg-[#E60023] hover:bg-[#C50E1F]"
                >
                  Go to Dashboard
                </Button>
                
                <Button 
                  onClick={() => handleSafeNavigate('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  Sign In
                </Button>
                
                {onRetry && (
                  <Button 
                    onClick={onRetry}
                    variant="outline"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default NavigationFallback;