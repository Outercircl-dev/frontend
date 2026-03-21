import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Starting dashboard cache refresh...')

    // Refresh the materialized view
    const { error: refreshError } = await supabase.rpc('refresh_dashboard_events')

    if (refreshError) {
      console.error('❌ Failed to refresh dashboard cache:', refreshError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: refreshError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get statistics about the refresh
    const { data: stats, error: statsError } = await supabase
      .from('dashboard_events_optimized')
      .select('id', { count: 'exact' })

    const eventCount = stats?.length || 0

    console.log(`✅ Dashboard cache refreshed successfully - ${eventCount} events`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dashboard cache refreshed successfully',
        eventCount,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Dashboard cache refresh failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) || 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})