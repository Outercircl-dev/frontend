import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { action } = await req.json();

    if (action === 'generate') {
      // Generate recurring events
      const { data, error } = await supabaseClient.rpc('create_recurring_events');
      
      if (error) {
        console.error('Error generating recurring events:', error);
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        eventsCreated: data || 0,
        message: `Created ${data || 0} recurring event instances`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (action === 'stop') {
      // Stop a recurring series
      const { eventId } = await req.json();
      
      if (!eventId) {
        throw new Error('Event ID is required');
      }

      // Mark the parent event as cancelled to stop future occurrences
      const { error } = await supabaseClient
        .from('events')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('is_recurring', true);

      if (error) {
        console.error('Error stopping recurring series:', error);
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Recurring series stopped successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Invalid action specified');

  } catch (error) {
    console.error('Error in manage-recurring-events:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});