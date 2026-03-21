import React from 'react';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecurityAlertProps {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  onDismiss?: () => void;
}

export const SecurityAlert: React.FC<SecurityAlertProps> = ({
  type,
  title,
  description,
  onDismiss
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <Alert className={`${getStyles()} mb-4`}>
      <div className="flex items-start">
        <div className="mr-2 mt-0.5">{getIcon()}</div>
        <div className="flex-1">
          <h4 className="font-medium mb-1">{title}</h4>
          <AlertDescription className="text-sm">
            {description}
          </AlertDescription>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </Alert>
  );
};