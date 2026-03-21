import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request
    const { action, data } = await req.json()

    console.log('Security monitor action:', action)

    switch (action) {
      case 'analyze_threats':
        return await analyzeSecurityThreats(supabaseClient)
      
      case 'log_security_event':
        return await logSecurityEvent(supabaseClient, data)
      
      case 'check_system_health':
        return await checkSystemHealth(supabaseClient)
      
      case 'cleanup_expired_sessions':
        return await cleanupExpiredSessions(supabaseClient)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('Security monitor error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function analyzeSecurityThreats(supabase: any) {
  try {
    // Get threat analysis from database function
    const { data: threats, error } = await supabase.rpc('analyze_security_threats')
    
    if (error) {
      throw error
    }

    // Additional threat analysis
    const systemThreats = await checkSystemThreats(supabase)
    
    const allThreats = [...(threats || []), ...systemThreats]
    
    // Log the analysis
    await supabase.rpc('log_security_event', {
      p_action: 'threat_analysis',
      p_resource_type: 'system',
      p_success: true,
      p_error_message: `Found ${allThreats.length} potential threats`
    })

    return new Response(
      JSON.stringify({ 
        threats: allThreats,
        analysis_time: new Date().toISOString(),
        threat_count: allThreats.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Threat analysis error:', error)
    return new Response(
      JSON.stringify({ error: 'Threat analysis failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function checkSystemThreats(supabase: any) {
  const threats = []

  try {
    // Check for unusual user creation patterns
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    if (recentUsers && recentUsers.length > 20) {
      threats.push({
        threat_type: 'unusual_user_creation',
        severity: 'medium',
        count: recentUsers.length,
        details: { accounts_created_24h: recentUsers.length }
      })
    }

    // Check for failed authentication attempts
    const { data: failedLogins } = await supabase
      .from('security_audit_log')
      .select('*')
      .eq('action', 'login')
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    if (failedLogins && failedLogins.length > 10) {
      threats.push({
        threat_type: 'brute_force_attempt',
        severity: 'high',
        count: failedLogins.length,
        details: { failed_logins_1h: failedLogins.length }
      })
    }

    // Check rate limiting violations
    const { data: rateLimitViolations } = await supabase
      .from('rate_limits')
      .select('*')
      .gte('window_start', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    const violationCount = rateLimitViolations?.reduce((sum: number, record: any) => sum + record.request_count, 0) || 0
    if (violationCount > 100) {
      threats.push({
        threat_type: 'rate_limit_abuse',
        severity: 'high',
        count: violationCount,
        details: { violations_1h: violationCount }
      })
    }

  } catch (error) {
    console.error('System threat check error:', error)
  }

  return threats
}

async function logSecurityEvent(supabase: any, eventData: any) {
  try {
    const { action, resource_type, resource_id, success, error_message, user_id } = eventData

    await supabase.rpc('log_security_event', {
      p_action: action,
      p_resource_type: resource_type,
      p_resource_id: resource_id,
      p_success: success,
      p_error_message: error_message
    })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Security event logging error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to log security event' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function checkSystemHealth(supabase: any) {
  try {
    const healthChecks = {
      database_connection: false,
      rls_enabled: false,
      rate_limiting_active: false,
      audit_logging_active: false
    }

    // Test database connection
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1)
      healthChecks.database_connection = !error
    } catch (error) {
      console.error('Database health check failed:', error)
    }

    // Check if RLS is enabled on critical tables
    try {
      const { data } = await supabase.rpc('check_rate_limit', {
        p_user_id: null,
        p_endpoint: 'health_check',
        p_max_requests: 1000
      })
      healthChecks.rate_limiting_active = data !== null
    } catch (error) {
      console.error('Rate limiting health check failed:', error)
    }

    // Check audit logging
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('id')
        .limit(1)
      healthChecks.audit_logging_active = !error
    } catch (error) {
      console.error('Audit logging health check failed:', error)
    }

    return new Response(
      JSON.stringify({ 
        health_checks: healthChecks,
        timestamp: new Date().toISOString(),
        overall_health: Object.values(healthChecks).every(check => check)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('System health check error:', error)
    return new Response(
      JSON.stringify({ error: 'System health check failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function cleanupExpiredSessions(supabase: any) {
  try {
    // Clean up old rate limit entries
    const { error: rateLimitError } = await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Clean up old audit logs (keep last 30 days)
    const { error: auditError } = await supabase
      .from('security_audit_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const cleanupResults = {
      rate_limits_cleaned: !rateLimitError,
      audit_logs_cleaned: !auditError,
      timestamp: new Date().toISOString()
    }

    // Log the cleanup operation
    await supabase.rpc('log_security_event', {
      p_action: 'security_cleanup',
      p_resource_type: 'system',
      p_success: !rateLimitError && !auditError,
      p_error_message: rateLimitError || auditError ? 'Partial cleanup failure' : null
    })

    return new Response(
      JSON.stringify(cleanupResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Session cleanup error:', error)
    return new Response(
      JSON.stringify({ error: 'Session cleanup failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}
