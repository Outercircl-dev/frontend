import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Lock, Activity } from "lucide-react";

interface SecurityAlert {
  id: string;
  type: 'threat' | 'violation' | 'access' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

interface SecurityAlertsWidgetProps {
  alerts: SecurityAlert[];
  onResolve?: (id: string) => void;
}

export const SecurityAlertsWidget: React.FC<SecurityAlertsWidgetProps> = ({ 
  alerts, 
  onResolve 
}) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'threat': return AlertTriangle;
      case 'violation': return Lock;
      case 'access': return Shield;
      case 'system': return Activity;
      default: return AlertTriangle;
    }
  };

  const getAlertVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const unresolvedAlerts = alerts.filter(alert => !alert.resolved);

  if (unresolvedAlerts.length === 0) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>All Clear</AlertTitle>
        <AlertDescription>
          No active security alerts at this time.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Security Alerts</h3>
        <Badge variant="outline">
          {unresolvedAlerts.length} active
        </Badge>
      </div>
      
      <div className="space-y-3">
        {unresolvedAlerts.slice(0, 5).map((alert) => {
          const Icon = getAlertIcon(alert.type);
          
          return (
            <Alert 
              key={alert.id} 
              variant={getAlertVariant(alert.severity)}
              className="relative"
            >
              <Icon className="h-4 w-4" />
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTitle className="text-sm">{alert.title}</AlertTitle>
                    <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <AlertDescription className="text-xs">
                    {alert.description}
                  </AlertDescription>
                  <div className="text-xs text-muted-foreground mt-1">
                    {alert.timestamp.toLocaleString()}
                  </div>
                </div>
                
                {onResolve && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-2"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </Alert>
          );
        })}
        
        {unresolvedAlerts.length > 5 && (
          <div className="text-center">
            <Badge variant="outline">
              +{unresolvedAlerts.length - 5} more alerts
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};