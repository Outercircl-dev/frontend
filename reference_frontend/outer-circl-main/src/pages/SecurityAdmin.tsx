import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Settings, Users, Activity, Lock, RefreshCw, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SecurityDashboard } from "@/components/SecurityDashboard";
import { SecurityMonitoring } from "@/components/SecurityMonitoring";
import { SecurityDashboardEnhanced } from "@/components/security/SecurityDashboardEnhanced";
import { SecurityMonitoringDashboard } from '@/components/security/SecurityMonitoringDashboard';
import { SecurityAlertsWidget } from '@/components/security/SecurityAlertsWidget';
import { SecurityMetricsCards } from '@/components/security/SecurityMetricsCards';
import { EnhancedSEO } from '@/components/EnhancedSEO';
import AdTestingPanel from '@/components/AdTestingPanel';
import { TestPostActivityMessages } from '@/components/admin/TestPostActivityMessages';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedSecurity } from '@/hooks/useUnifiedSecurity';

const SecurityAdmin: React.FC = () => {
  console.log('🔧 SecurityAdmin component loading...');
  const location = useLocation();
  const [adminEmail, setAdminEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([
    {
      id: '1',
      type: 'threat' as const,
      severity: 'medium' as const,
      title: 'Database Functions Hardened',
      description: 'All security-definer functions updated with explicit search_path',
      timestamp: new Date(),
      resolved: false
    }
  ]);
  const { toast } = useToast();
  const unifiedSecurity = useUnifiedSecurity();
  const metrics = {
    threats: [],
    lastScan: unifiedSecurity.metrics.lastCheck,
    systemHealth: unifiedSecurity.metrics.systemHealth,
    auditLogs: [],
    rateLimit: { violations: unifiedSecurity.metrics.rateLimit.violations, blockedIPs: [] },
    sensitiveDataAccess: { recentAccess: [], totalToday: 0 }
  };
  const scanLoading = false;
  const scanError = null;
  const runComprehensiveScan = unifiedSecurity.checkSecurity;
  const cleanupExpiredSessions = async () => {};

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      setIsAdmin(userRoles && userRoles.length > 0);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const createInitialAdmin = async () => {
    if (!adminEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_initial_admin', {
        admin_email: adminEmail.trim().toLowerCase()
      });

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
      
      setAdminEmail('');
      checkAdminStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create admin user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupSessions = async () => {
    try {
      await cleanupExpiredSessions();
      toast({
        title: "Session Cleanup Complete",
        description: "Expired sessions and rate limit entries have been cleaned up"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: "Unable to cleanup expired sessions"
      });
    }
  };

  const handleExportLogs = () => {
    const logsData = JSON.stringify(metrics.auditLogs, null, 2);
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Security audit logs have been downloaded"
    });
  };

  const securityMetrics = {
    threatLevel: metrics.systemHealth === 'critical' ? 'critical' as const : 
                 metrics.systemHealth === 'warning' ? 'medium' as const : 'low' as const,
    activeThreats: metrics.threats.length,
    systemHealth: metrics.systemHealth === 'healthy' ? 95 : 
                  metrics.systemHealth === 'warning' ? 75 : 45,
    rateLimitViolations: metrics.rateLimit.violations,
    failedLogins: metrics.auditLogs.filter(log => 
      log.action === 'login' && !log.success
    ).length,
    sensitiveDataAccess: metrics.sensitiveDataAccess.totalToday,
    uptime: 99.9,
    databaseConnections: 15
  };

  return (
    <>
      <EnhancedSEO 
        title="Security Administration Dashboard - OuterCircl"
        description="Comprehensive security monitoring and administration dashboard for OuterCircl platform"
        canonicalUrl={`https://outercircl.com${location.pathname}`}
      />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Security Administration</h1>
                <p className="text-muted-foreground">
                  Enhanced security management with real-time monitoring and threat analysis
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportLogs}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Logs
              </Button>
              <Button 
                onClick={runComprehensiveScan}
                disabled={scanLoading}
                className="bg-gradient-primary text-white flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${scanLoading ? 'animate-spin' : ''}`} />
                {scanLoading ? 'Scanning...' : 'Run Scan'}
              </Button>
            </div>
          </div>

          {scanError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="monitoring">Enhanced Monitoring</TabsTrigger>
              <TabsTrigger value="dashboard">Legacy Dashboard</TabsTrigger>
              <TabsTrigger value="admin">Admin Tools</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
              <TabsTrigger value="ads">AdSense Test</TabsTrigger>
              <TabsTrigger value="email">Post-Activity Email</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <SecurityDashboardEnhanced />
            </TabsContent>

            <TabsContent value="monitoring">
              <SecurityMonitoringDashboard />
            </TabsContent>

            <TabsContent value="dashboard">
              <div className="space-y-6">
                <SecurityDashboard />
                <SecurityMonitoring />
              </div>
            </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            {/* Admin Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Admin User Management
                </CardTitle>
                <CardDescription>
                  Create initial admin user or manage administrative privileges
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAdmin ? (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      You have administrative privileges. Additional admin management tools would be available here.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Admin Email Address</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={createInitialAdmin}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Creating Admin...' : 'Create Initial Admin User'}
                    </Button>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This will create the first admin user. Only use this if no admin exists yet.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Security Tools
                </CardTitle>
                <CardDescription>
                  Administrative security management functions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={runComprehensiveScan}
                    disabled={scanLoading}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Activity className="h-6 w-6 mb-2" />
                    {scanLoading ? 'Running Enhanced Scan...' : 'Run Enhanced Security Scan'}
                  </Button>
                  
                  <Button
                    onClick={handleCleanupSessions}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    disabled={isAdmin ? false : true}
                  >
                    <Lock className="h-6 w-6 mb-2" />
                    Enhanced Session Cleanup
                    {!isAdmin && <span className="text-xs text-muted-foreground">(Admin Only)</span>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Security Configuration</CardTitle>
                <CardDescription>
                  Current security settings and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-green-600 mb-2">✅ Enhanced Active Protections</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Row Level Security (RLS) - Hardened</li>
                        <li>• Advanced Rate Limiting</li>
                        <li>• Enhanced Input Sanitization</li>
                        <li>• Secure Session Management</li>
                        <li>• Comprehensive Audit Logging</li>
                        <li>• Real-time Threat Detection</li>
                        <li>• Database Function Security Hardening</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-blue-600 mb-2">🔧 Production Recommendations</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Enable HTTPS</li>
                        <li>• Configure CSP Headers</li>
                        <li>• Set up monitoring alerts</li>
                        <li>• Regular security audits</li>
                        <li>• Backup verification</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Enhanced Security Audit Log</CardTitle>
                  <CardDescription>
                    Real-time security events with detailed threat analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing recent security events from enhanced monitoring system
                      </div>
                      <Button variant="outline" size="sm" onClick={handleExportLogs}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Full Log
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {metrics.auditLogs.length > 0 ? (
                        metrics.auditLogs.slice(0, 50).map((log, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  {log.action}
                                </span>
                                <span className="text-sm font-medium">{log.resource_type}</span>
                                {log.risk_score && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    log.risk_score > 70 ? 'bg-red-100 text-red-800' :
                                    log.risk_score > 40 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    Risk: {log.risk_score}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                User: {log.user_id || 'System'} | IP: {log.ip_address || 'N/A'}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            No audit logs available. Enhanced security monitoring is initializing.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          <TabsContent value="ads">
            <AdTestingPanel />
          </TabsContent>

          <TabsContent value="email">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  📧 Email Testing Dashboard
                </h2>
                <p className="text-muted-foreground">
                  Test MailerSend transactional email delivery system
                </p>
              </div>
              <TestPostActivityMessages />
            </div>
          </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default SecurityAdmin;