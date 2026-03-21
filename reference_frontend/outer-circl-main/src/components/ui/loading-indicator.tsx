
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  className = '',
  text
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

export const PageLoadingIndicator: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingIndicator size="lg" />
        <p className="mt-4 text-gray-600">{text}</p>
      </div>
    </div>
  );
};

export const ButtonLoadingIndicator: React.FC = () => {
  return <Loader2 className="h-4 w-4 animate-spin" />;
};

// Simplified loading component for better performance
export const TimeoutAwareLoadingIndicator: React.FC<{ 
  timeout?: number; 
  onTimeout: () => void;
  text?: string;
}> = ({ 
  timeout = 10000, 
  onTimeout, 
  text = 'Loading activities...' 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onTimeout, timeout);
    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  return (
    <div className="flex justify-center items-center py-8 px-4">
      <div className="text-center">
        <LoadingIndicator size="lg" />
        <p className="text-muted-foreground mt-4">{text}</p>
      </div>
    </div>
  );
};
