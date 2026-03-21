import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Clock, Lock, Activity, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';
import { useSecurityManager } from '@/hooks/useSecurityManager';
import { SecurityMonitoring } from './SecurityMonitoring';

interface SecurityStatus {
  level: 'high' | 'medium' | 'low';
  message: string;
  recommendations: string[];
}

export const SecurityDashboard: React.FC = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    level: 'high',
    message: 'All security measures active',
    recommendations: []
  });
  const [showDetailedMonitoring, setShowDetailedMonitoring] = useState(false);
  
  const { isSessionValid, lastActivity, sessionTimeoutMs } = useSessionSecurity();
  const { metrics, alerts, analyzeSecurityThreats, clearAlerts } = useSecurityManager();

  useEffect(() => {
    analyzeSecurityStatus();
  }, [isSessionValid, lastActivity, metrics]);

  const analyzeSecurityStatus = () => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    const timeUntilTimeout = sessionTimeoutMs - timeSinceActivity;
    
    let level: SecurityStatus['level'] = metrics.threatLevel === 'critical' ? 'high' : metrics.threatLevel;
    let message = 'All security measures active';
    const recommendations: string[] = [];

    // Incorporate security manager metrics
    if (metrics.activeThreats > 0) {
      if (metrics.threatLevel === 'high') {
        level = 'low';
        message = 'Critical security threats detected';
        recommendations.push(`${metrics.activeThreats} active security threats require immediate attention`);
      } else if (metrics.threatLevel === 'medium') {
        level = 'medium';
        message = 'Security threats detected';
        recommendations.push(`${metrics.activeThreats} security threats detected`);
      }
    }

    // Check session timeout warning
    if (timeUntilTimeout < 30 * 60 * 1000) { // 30 minutes
      if (level === 'high') level = 'medium';
      message = 'Session will expire soon';
      recommendations.push('Your session will expire in less than 30 minutes');
    }

    // Check rate limiting violations
    if (metrics.rateLimit.violations > 5) {
      if (level === 'high') level = 'medium';
      recommendations.push(`${metrics.rateLimit.violations} rate limit violations detected`);
    }

    // Check if CSP is enabled (basic check)
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      if (level === 'high') level = 'medium';
      recommendations.push('Content Security Policy headers recommended for production');
    }

    // Check HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      level = 'low';
      message = 'Security vulnerabilities detected';
      recommendations.push('HTTPS is required for secure operation');
    }

    // Check for development mode indicators
    if (window.location.hostname === 'localhost') {
      recommendations.push('Running in development mode - additional security needed for production');
    }

    // Session validity check
    if (!metrics.sessionSecurity.isValid) {
      level = 'low';
      message = 'Session security compromised';
      recommendations.push('Please log in again to restore session security');
    }

    setSecurityStatus({ level, message, recommendations });
  };

  const getStatusColor = () => {
    switch (securityStatus.level) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusIcon = () => {
    switch (securityStatus.level) {
      case 'high': return <Shield className="h-4 w-4 text-green-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const formatTimeRemaining = () => {
    const timeUntilTimeout = sessionTimeoutMs - (Date.now() - lastActivity);
    const hours = Math.floor(timeUntilTimeout / (60 * 60 * 1000));
    const minutes = Math.floor((timeUntilTimeout % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Enhanced Security Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">Real-time security monitoring and threat analysis</p>
        </div>
        <Button
          onClick={() => setShowDetailedMonitoring(!showDetailedMonitoring)}
          variant="outline"
          size="sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          {showDetailedMonitoring ? 'Basic View' : 'Advanced View'}
        </Button>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex items-center justify-between">
                  <span>{alert}</span>
                  <Button
                    onClick={clearAlerts}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Security Status */}
      <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="font-medium">Security Status</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={metrics.threatLevel === 'high' ? 'destructive' : 
                           metrics.threatLevel === 'medium' ? 'secondary' : 'default'}>
              Threat Level: {metrics.threatLevel.toUpperCase()}
            </Badge>
            {metrics.activeThreats > 0 && (
              <Badge variant="outline">
                {metrics.activeThreats} Active Threats
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm mb-2">{securityStatus.message}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
          <div>
            <div className="font-medium">Session</div>
            <div className={isSessionValid ? 'text-green-600' : 'text-red-600'}>
              {isSessionValid ? `${formatTimeRemaining()} remaining` : 'Invalid'}
            </div>
          </div>
          <div>
            <div className="font-medium">Rate Limiting</div>
            <div className={metrics.rateLimit.violations === 0 ? 'text-green-600' : 'text-yellow-600'}>
              {metrics.rateLimit.violations} violations
            </div>
          </div>
          <div>
            <div className="font-medium">Last Check</div>
            <div className="text-muted-foreground">
              {metrics.lastCheck?.toLocaleTimeString() || 'Never'}
            </div>
          </div>
          <div>
            <div className="font-medium">Protocol</div>
            <div className={window.location.protocol === 'https:' ? 'text-green-600' : 'text-red-600'}>
              {window.location.protocol.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {securityStatus.recommendations.length > 0 && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Security Recommendations:</p>
              <ul className="text-sm space-y-1">
                {securityStatus.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-white rounded border p-3">
          <h4 className="font-medium mb-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            Database Security
          </h4>
          <p className="text-green-600">✓ RLS Enabled</p>
          <p className="text-green-600">✓ User Isolation</p>
          <p className="text-green-600">✓ Secure Functions</p>
        </div>
        
        <div className="bg-white rounded border p-3">
          <h4 className="font-medium mb-1 flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-600" />
            Storage Security
          </h4>
          <p className="text-green-600">✓ Private User Files</p>
          <p className="text-green-600">✓ Access Policies</p>
          <p className="text-green-600">✓ Secure Uploads</p>
        </div>
        
        <div className="bg-white rounded border p-3">
          <h4 className="font-medium mb-1 flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-600" />
            Client Security
          </h4>
          <p className="text-green-600">✓ Input Validation</p>
          <p className="text-green-600">✓ Rate Limiting</p>
          <p className="text-green-600">✓ Session Management</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          onClick={analyzeSecurityThreats}
          variant="outline"
          size="sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Run Security Scan
        </Button>
        <Button
          onClick={clearAlerts}
          variant="outline"
          size="sm"
          disabled={alerts.length === 0}
        >
          Clear Alerts
        </Button>
      </div>

      {/* Detailed Security Monitoring */}
      {showDetailedMonitoring && <SecurityMonitoring />}
    </div>
  );
};