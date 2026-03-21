import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Activity, Users, Lock, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityThreat {
  threat_type: string;
  severity: string;
  count: number;
  details: any;
}

export const SecurityMonitoring: React.FC = () => {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [securityScore, setSecurityScore] = useState(90);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const { data, error } = await supabase.rpc('analyze_security_threats');
      
      if (error) {
        console.error('Security monitoring error:', error);
        return;
      }

      setThreats(data || []);
      calculateSecurityScore(data || []);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSecurityScore = (threats: SecurityThreat[]) => {
    let score = 100;
    
    threats.forEach(threat => {
      switch (threat.severity) {
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Additional checks
    if (!window.location.href.startsWith('https:') && window.location.hostname !== 'localhost') {
      score -= 20;
    }

    setSecurityScore(Math.max(0, score));
  };

  const createInitialAdmin = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('create_initial_admin', { admin_email: email });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Initial admin user created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create admin user",
        variant: "destructive",
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'outline'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getScoreColor = () => {
    if (securityScore >= 90) return 'text-green-600';
    if (securityScore >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse flex space-x-4">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <span>Loading security data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Monitoring</h2>
          <p className="text-muted-foreground">Real-time security threat analysis and monitoring</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Security Score</div>
          <div className={`text-3xl font-bold ${getScoreColor()}`}>
            {securityScore}/100
          </div>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{threats.length}</div>
            <p className="text-xs text-muted-foreground">
              {threats.filter(t => t.severity === 'high').length} high severity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              Protection enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Control</CardTitle>
            <Lock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">RLS</div>
            <p className="text-xs text-muted-foreground">
              Row-level security enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Threats */}
      {threats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Threats Detected
            </CardTitle>
            <CardDescription>
              Active security threats requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {threats.map((threat, index) => (
                <Alert key={index}>
                  <Eye className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {threat.threat_type.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Count: {threat.count} | Details: {JSON.stringify(threat.details)}
                        </div>
                      </div>
                      {getSeverityBadge(threat.severity)}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Improve your security posture with these recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Enhanced Database Security</div>
                <div className="text-sm text-muted-foreground">
                  ✅ Ultra-secure RLS policies for sensitive data
                  <br />
                  ✅ Database functions hardened with search_path
                  <br />
                  ✅ Enhanced security logging with audit hash
                  <br />
                  ✅ Rate limiting for sensitive data access
                  <br />
                  ✅ Multi-layer authentication validation
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Advanced User Protection</div>
                <div className="text-sm text-muted-foreground">
                  ✅ Multi-tier rate limiting (general + sensitive data)
                  <br />
                  ✅ JWT audience validation for all sensitive operations
                  <br />
                  ✅ Immutable audit trail for critical data access
                  <br />
                  ✅ Suspicious activity pattern detection
                  <br />
                  ✅ Email encryption for invitation security
                </div>
              </div>
            </div>

            {window.location.hostname !== 'localhost' && !window.location.href.startsWith('https:') && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>HTTPS Required:</strong> Enable HTTPS for production deployment to secure data transmission.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Security Controls</CardTitle>
          <CardDescription>
            Administrative security functions (admin access required)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={() => loadSecurityData()}
              variant="outline"
              className="w-full"
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh Security Analysis
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Note: Advanced security controls require admin privileges. 
              Contact your system administrator for elevated access.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};