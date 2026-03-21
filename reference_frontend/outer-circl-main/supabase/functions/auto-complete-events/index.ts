import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Auto-completion process started at:', new Date().toISOString());

    // Call the database function to auto-complete past events
    const { data, error } = await supabase.rpc('auto_complete_past_events');

    if (error) {
      console.error('Error auto-completing events:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to auto-complete events',
          details: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const completedCount = data || 0;
    console.log(`Auto-completion completed: ${completedCount} events marked as completed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Auto-completion completed successfully`,
        completedEvents: completedCount,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in auto-complete-events:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error occurred',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);