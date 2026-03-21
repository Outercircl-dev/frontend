import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';

export const SecurityStatusWidget: React.FC = () => {
  const { isSessionValid, lastActivity, sessionTimeoutMs } = useSessionSecurity();

  const getTimeUntilExpiry = () => {
    const timeRemaining = sessionTimeoutMs - (Date.now() - lastActivity);
    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getSecurityLevel = () => {
    const timeRemaining = sessionTimeoutMs - (Date.now() - lastActivity);
    const isHttps = window.location.protocol === 'https:';
    
    if (!isSessionValid || !isHttps) return 'low';
    if (timeRemaining < 30 * 60 * 1000) return 'medium'; // 30 minutes
    return 'high';
  };

  const securityLevel = getSecurityLevel();

  const getStatusColor = () => {
    switch (securityLevel) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (securityLevel) {
      case 'high': return <Shield className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = () => {
    switch (securityLevel) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className={getStatusColor()}>{getStatusIcon()}</span>
          Security Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Level:</span>
          <Badge variant={getBadgeVariant()} className="capitalize">
            {securityLevel}
          </Badge>
        </div>
        
        {isSessionValid && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Session:</span>
            <span className="text-sm font-medium">{getTimeUntilExpiry()}</span>
          </div>
        )}
        
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span>HTTPS</span>
            {window.location.protocol === 'https:' ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span>Session Valid</span>
            {isSessionValid ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span>Input Protection</span>
            <CheckCircle className="h-3 w-3 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};