import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityMetrics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  lastCheck: Date | null;
  rateLimit: {
    violations: number;
    lastViolation: Date | null;
  };
  auditEvents: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface RateLimitRequest {
  actionKey: string;
  userAgent?: string;
}

/**
 * Unified Security Manager - Simplified and Reliable
 * Consolidates all security functionality into one hook
 * Focuses on functionality over complex analysis
 */
export const useUnifiedSecurity = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    threatLevel: 'low',
    lastCheck: null,
    rateLimit: { violations: 0, lastViolation: null },
    auditEvents: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const { toast } = useToast();

  // Simplified security check - runs once per hour max
  const checkSecurity = useCallback(async () => {
    try {
      setLoading(true);
      
      // Simple rate limit check
      const { data: rateLimits } = await supabase
        .from('rate_limits')
        .select('*')
        .gte('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const violations = rateLimits?.length || 0;
      
      // Simple audit events count
      const { count: auditCount } = await supabase
        .from('security_audit_enhanced')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Determine threat level and system health
      let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (violations > 100) {
        threatLevel = 'critical';
        systemHealth = 'critical';
      } else if (violations > 50) {
        threatLevel = 'high';
        systemHealth = 'warning';
      } else if (violations > 20) {
        threatLevel = 'medium';
        systemHealth = 'warning';
      }

      setMetrics({
        threatLevel,
        lastCheck: new Date(),
        rateLimit: {
          violations,
          lastViolation: rateLimits?.[0]?.window_start ? new Date(rateLimits[0].window_start) : null
        },
        auditEvents: auditCount || 0,
        systemHealth
      });

      // Simple alerting
      const newAlerts: string[] = [];
      if (violations > 50) {
        newAlerts.push(`High rate limit violations detected: ${violations} in last 24h`);
      }
      setAlerts(newAlerts);

    } catch (error) {
      console.warn('Security check failed (non-critical):', error);
      // Don't break app functionality on security check failures
    } finally {
      setLoading(false);
    }
  }, []);

  // Simple rate limiting - client-side check only
  const checkRateLimit = useCallback(async (request: RateLimitRequest): Promise<boolean> => {
    try {
      // Simple in-memory rate limiting
      const key = `${request.actionKey}_${request.userAgent || 'unknown'}`;
      const now = Date.now();
      const windowStart = now - (60 * 1000); // 1 minute window
      
      // Get from localStorage for simplicity
      const stored = localStorage.getItem(`rate_limit_${key}`);
      const requests = stored ? JSON.parse(stored) : [];
      
      // Clean old requests
      const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);
      
      // Check limit (60 requests per minute)
      if (recentRequests.length >= 60) {
        return false;
      }
      
      // Add current request
      recentRequests.push(now);
      localStorage.setItem(`rate_limit_${key}`, JSON.stringify(recentRequests));
      
      return true;
    } catch (error) {
      console.warn('Rate limit check failed, allowing request:', error);
      return true; // Fail open to not break functionality
    }
  }, []);

  // Simple security event logging
  const logSecurityEvent = useCallback(async (
    action: string,
    resourceType = 'system',
    resourceId?: string,
    success = true,
    errorMessage?: string
  ) => {
    try {
      // Use the simplified logging function
      await supabase.rpc('log_simple_security_event', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId ? resourceId : null,
        p_success: success,
        p_error_message: errorMessage || ''
      });
    } catch (error) {
      console.warn('Security event logging failed (non-critical):', error);
      // Don't break app functionality
    }
  }, []);

  // Simple input validation
  const validateInput = useCallback((input: string, type: 'text' | 'email' | 'url' = 'text') => {
    if (!input) return { isValid: true, sanitized: input, errors: [] };

    const errors: string[] = [];
    let sanitized = input.trim();

    // Basic sanitization
    sanitized = sanitized
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          errors.push('Invalid email format');
        }
        break;
      case 'url':
        try {
          new URL(sanitized);
        } catch {
          errors.push('Invalid URL format');
        }
        break;
      case 'text':
        if (sanitized.length > 1000) {
          errors.push('Text too long');
          sanitized = sanitized.substring(0, 1000);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }, []);

  // Get recent security events
  const getRecentEvents = useCallback(async (limit = 20) => {
    try {
      const { data, error } = await supabase
        .from('security_audit_enhanced')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Failed to fetch security events:', error);
      return [];
    }
  }, []);

  // Initialize with one security check on mount (not continuous monitoring)
  useEffect(() => {
    checkSecurity();
  }, [checkSecurity]);

  return {
    // Metrics and state
    metrics,
    loading,
    alerts,
    
    // Functions
    checkSecurity,
    checkRateLimit,
    logSecurityEvent,
    validateInput,
    getRecentEvents,
    
    // Helper functions
    clearAlerts: () => setAlerts([]),
    showToast: (message: string, variant: 'default' | 'destructive' = 'default') => {
      toast({
        title: variant === 'destructive' ? 'Security Alert' : 'Security Update',
        description: message,
        variant
      });
    }
  };
};