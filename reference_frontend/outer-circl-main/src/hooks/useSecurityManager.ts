// DEPRECATED: This hook has been consolidated into useUnifiedSecurity
// Keeping minimal export for backward compatibility
import { useUnifiedSecurity } from './useUnifiedSecurity';

export const useSecurityManager = () => {
  const unifiedSecurity = useUnifiedSecurity();
  
  // Map to old interface for backward compatibility
  return {
    metrics: {
      threatLevel: unifiedSecurity.metrics.threatLevel,
      activeThreats: unifiedSecurity.alerts.length,
      lastCheck: unifiedSecurity.metrics.lastCheck,
      rateLimit: {
        violations: unifiedSecurity.metrics.rateLimit.violations,
        blockedEndpoints: []
      },
      sessionSecurity: {
        isValid: unifiedSecurity.metrics.systemHealth !== 'critical',
        lastValidation: unifiedSecurity.metrics.lastCheck
      }
    },
    loading: unifiedSecurity.loading,
    alerts: unifiedSecurity.alerts,
    checkRateLimit: unifiedSecurity.checkRateLimit,
    logSecurityEvent: unifiedSecurity.logSecurityEvent,
    validateSession: async () => unifiedSecurity.metrics.systemHealth !== 'critical',
    secureValidateInput: (input: string, type?: 'text' | 'email' | 'url') => 
      unifiedSecurity.validateInput(input, type),
    analyzeSecurityThreats: unifiedSecurity.checkSecurity,
    clearAlerts: unifiedSecurity.clearAlerts
  };
};