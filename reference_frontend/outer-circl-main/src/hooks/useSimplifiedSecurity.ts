// DEPRECATED HOOK - DO NOT USE
// This hook has been consolidated into useUnifiedSecurity
// Keeping export to prevent import errors during migration

import { useUnifiedSecurity } from './useUnifiedSecurity';

export const useAdvancedSecurityMonitoring = () => {
  console.warn('useAdvancedSecurityMonitoring is deprecated. Use useUnifiedSecurity instead.');
  
  const unified = useUnifiedSecurity();
  
  return {
    metrics: {
      threats: [],
      lastScan: unified.metrics.lastCheck,
      systemHealth: unified.metrics.systemHealth,
      auditLogs: [],
      rateLimit: { violations: unified.metrics.rateLimit.violations, blockedIPs: [] },
      sensitiveDataAccess: { recentAccess: [], totalToday: 0 }
    },
    loading: unified.loading,
    error: null,
    runComprehensiveScan: unified.checkSecurity,
    refresh: unified.checkSecurity
  };
};

export const useEnhancedSecurity = () => {
  console.warn('useEnhancedSecurity is deprecated. Use useUnifiedSecurity instead.');
  
  const unified = useUnifiedSecurity();
  
  return {
    securityMetrics: {
      threatLevel: unified.metrics.threatLevel,
      lastSecurityCheck: unified.metrics.lastCheck,
      securityFlags: {},
      riskScore: 0,
      accessTier: 'basic' as const,
      accountAge: 0
    },
    loading: unified.loading,
    getSensitiveProfileData: async () => null,
    updateSensitiveProfileData: async () => false,
    checkProfileAccessRateLimit: unified.checkRateLimit,
    sanitizeInput: (input: string) => Promise.resolve(unified.validateInput(input).sanitized),
    getSecurityAuditLogs: unified.getRecentEvents,
    loadSecurityMetrics: unified.checkSecurity,
    clearSecurityCache: () => {},
    getAccessTier: async () => 'basic' as const
  };
};
