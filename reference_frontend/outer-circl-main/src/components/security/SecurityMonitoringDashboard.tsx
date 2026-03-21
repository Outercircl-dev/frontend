import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Activity, Eye, Lock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityMetrics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  activeThreats: number;
  lastCheck: string;
  rateLimit: {
    violations: number;
    endpoints: string[];
  };
  sensitiveDataAccess: {
    count: number;
    lastAccess: string;
  };
  failedLogins: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true);
      
      // Get security audit data
      const { data: auditData, error: auditError } = await supabase
        .from('security_audit_enhanced')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      // Get rate limit violations
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('rate_limits')
        .select('*')
        .gte('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (rateLimitError) throw rateLimitError;

      // Calculate metrics
      const failedLogins = auditData?.filter(log => {
        try {
          const metadata = typeof log.metadata === 'string' 
            ? JSON.parse(log.metadata) 
            : log.metadata;
          return log.action === 'login' && metadata?.success === false;
        } catch {
          return false;
        }
      }).length || 0;

      const sensitiveAccess = auditData?.filter(log => 
        log.resource_type === 'sensitive_data'
      ).length || 0;

      const lastSensitiveAccess = auditData?.find(log => 
        log.resource_type === 'sensitive_data'
      )?.timestamp;

      const rateViolations = rateLimitData?.length || 0;
      const violatedEndpoints = [...new Set(rateLimitData?.map(r => r.endpoint) || [])];

      // Determine threat level
      let threatLevel: SecurityMetrics['threatLevel'] = 'low';
      if (failedLogins > 10 || rateViolations > 20) threatLevel = 'medium';
      if (failedLogins > 25 || rateViolations > 50) threatLevel = 'high';
      if (failedLogins > 50 || rateViolations > 100) threatLevel = 'critical';

      const newMetrics: SecurityMetrics = {
        threatLevel,
        activeThreats: failedLogins + rateViolations,
        lastCheck: new Date().toISOString(),
        rateLimit: {
          violations: rateViolations,
          endpoints: violatedEndpoints
        },
        sensitiveDataAccess: {
          count: sensitiveAccess,
          lastAccess: lastSensitiveAccess || 'Never'
        },
        failedLogins,
        systemHealth: threatLevel === 'critical' ? 'critical' : 
                     threatLevel === 'high' ? 'warning' : 'healthy'
      };

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Failed to load security metrics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load security metrics"
      });
    } finally {
      setLoading(false);
    }
  };

  const runSecurityScan = async () => {
    try {
      setScanning(true);
      
      // Call security monitor edge function
      const { data, error } = await supabase.functions.invoke('security-monitor', {
        body: { action: 'analyze_threats' }
      });

      if (error) throw error;

      toast({
        title: "Security Scan Complete",
        description: `Found ${data?.threats?.length || 0} potential threats`
      });

      // Reload metrics after scan
      await loadSecurityMetrics();
    } catch (error) {
      console.error('Security scan failed:', error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Unable to complete security scan"
      });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    loadSecurityMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadSecurityMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-secondary';
      default: return 'text-primary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">Monitor system security and threats</p>
        </div>
        <Button 
          onClick={runSecurityScan} 
          disabled={scanning}
          className="bg-gradient-primary text-white"
        >
          <Shield className="w-4 h-4 mr-2" />
          {scanning ? 'Scanning...' : 'Run Security Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getThreatLevelColor(metrics?.threatLevel || 'low')}>
              {metrics?.threatLevel?.toUpperCase()}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics?.activeThreats} active threats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics?.systemHealth || 'healthy')}`}>
              {metrics?.systemHealth?.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last check: {new Date(metrics?.lastCheck || '').toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Violations</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.rateLimit.violations}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.rateLimit.endpoints.length} endpoints affected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.failedLogins}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Sensitive Data Access
          </CardTitle>
          <CardDescription>
            Monitor access to sensitive user data and payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{metrics?.sensitiveDataAccess.count}</div>
              <p className="text-sm text-muted-foreground">Total accesses today</p>
            </div>
            <div className="text-right">
              <p className="text-sm">Last Access:</p>
              <p className="text-xs text-muted-foreground">
                {metrics?.sensitiveDataAccess.lastAccess !== 'Never' 
                  ? new Date(metrics?.sensitiveDataAccess.lastAccess || '').toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {metrics?.rateLimit.endpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rate Limited Endpoints</CardTitle>
            <CardDescription>
              Endpoints experiencing high traffic or potential abuse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.rateLimit.endpoints.map((endpoint, index) => (
                <Badge key={index} variant="outline">
                  {endpoint}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};